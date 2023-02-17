import { fetchAPI, fetchIssueCommentAPI } from './api';
import { getOptions, consoleLog, spaceName } from './common';
import storageManager from './storage';
import { SpaceName } from '../@types/index';
import { Issues, IssueComments } from '../@types/issues';
import { CheckWatchIssues, PopupNotification, IssueCommentsCount, SpaceComments } from '../@types/events';

const global = {};
const optionsKey = ['space', 'close', 'watch'];

const getAllOptions = async () => await Promise.all(optionsKey.map((key) => getOptions(key)));

const acceptNotification = () => {
  console.log('check acceptNotification...');
  array = [
    this.space(),
    this.autoCloseSecond(),
    this.autoReleaseWatch()
  ];

  return Promise.all(array).then((results) => {
    console.log('results:', results);
    chrome.alarms.get('backlogOptionsSetting', (val) => {
      if(typeof val !== 'undefined') chrome.alarms.clear('backlogOptionsSetting');
    });

    if(results[0] === null) {
      console.warn('please input space name and apiKey.');
    } else {
      chrome.notifications.getPermissionLevel((response) => {
        if(response === 'granted') {
          WATCH_NOTICE.checkWatchIssues(results);
        } else if(response === 'denied') {
          throw new Error('notification request false.');
        }
      });
    }
  }, (error) => {
    if(error === null) {
      console.warn('It does not have to set the options.');

      chrome.alarms.get('backlogOptionsSetting', (val) => {
        if(typeof val === 'undefined') {
          chrome.alarms.create('backlogOptionsSetting', { periodInMinutes: 1 });

          chrome.alarms.onAlarm.addListener((alarm) => {
            if(alarm && alarm.name === 'backlogOptionsSetting') {
              WATCH_NOTICE.acceptNotification();
            }
          });
        }
      });
    } else {
      throw new Error('promise failed.');
    }
  });
};
const checkWatchIssues = async ({ space, close, watch }: CheckWatchIssues) => {
  if (!space || !close || !watch) {
    return consoleLog('オプション取得失敗');
  }
  const autoCloseSecond = close;
  const autoReleaseWatch = Boolean(watch);
  const spaceIds = Object.keys(space);
  const popupNotification = async ({ issueId, spaceId, issuesDBName }: PopupNotification) => {
    const issueItem = { id: issueId };
    const requestReturnValue = async (result: IssueComments) => {
      const [res] = result;
      const { id: commentLastId } = res;
      const compareValue: IssueCommentsCount = {};
      let useStorageValue: SpaceComments = {};

      // storageからデータを取得
      const items = await storageManager.get(issuesDBName) as SpaceComments | false;
      if (!items) return;
      const spaceComments = items[issuesDBName];

      // compareValueにデータを追加
      compareValue[issueId] = spaceComments?.[issueId] ?? 0;
      // useStorageValueにデータを追加
      if (spaceComments) {
        useStorageValue = items;
      }
      useStorageValue[issuesDBName] = { [issueId]: commentLastId };

      if (commentLastId > compareValue[issueId]) {
        const note = `[${issueId}] @${res.createdUser.name}`;
        const iconUrl = `https://${spaceName}/favicon.ico`;

        const options = {
          type: 'basic',
          iconUrl,
          title: issueId,
          message: res.content,
          contextMessage: note,
          requireInteraction: true
        };
        const issues = await fetchAPI({ apiPath: `issues/${issueId}` }) as Issues | false;
        options.title = issues ? issues.summary : issueId;
        createNotifications(options, issueId);
      }
      await storageManager.set(useStorageValue);
      backlogCompletedWhenCancel();
    }

    const result = await fetchIssueCommentAPI(issueId, issuesDBName);

    if (result) {
      requestReturnValue(result);
    }


    // 通知を作成する
    function createNotifications(_options, issueId){
      chrome.notifications.create(`backlog-${space[spaceId].name}-${issueId}`, _options, (notificationId) => {
        var listener = () => {
          chrome.tabs.create({
            url: `https://${spaceName}/view/${issueId}#comment-${res.id}`
          });
          chrome.notifications.onClicked.removeListener(listener);
          chrome.notifications.clear(notificationId);
        };
        chrome.notifications.onClicked.addListener(listener);
        chrome.notifications.onClosed.addListener(() => {
          chrome.notifications.onClicked.removeListener(listener);
          chrome.notifications.clear(notificationId);
        });
        // 機能オプション
        closeNotificationAfterSeconds(notificationId);
      });
      backlogCompletedWhenCancel();
    }
    // 課題完了時にウォッチを解除する
    function backlogCompletedWhenCancel(){
      // console.log('res:', res);
      if(autoReleaseWatch && res.changeLog.length) {
        Object.keys(res.changeLog).forEach((key) => {
          var log = res.changeLog[key];
          // console.log('log:', log);

          if(log.field === 'status' && log.newValue === '完了') {
            WATCH_STORAGE.remove(issueItem, 'issues', key);
          }
        });
      }
    }
    // n秒後に通知を閉じる
    function closeNotificationAfterSeconds(_id){
      var msec = 1000;
      console.log('notificationId:', _id, '->', new Date());

      if(typeof autoCloseSecond !== 'undefined' && Number(autoCloseSecond) > 0) {
        chrome.alarms.create('autoClose', {
          when: Date.now() + (msec * Number(autoCloseSecond))
        });
      }
      chrome.alarms.onAlarm.addListener((alarm) => {
        if(alarm && alarm.name === 'autoClose') {
          chrome.notifications.clear(_id);
        }
      });
    }
  };

  for (const spaceId of spaceIds) {
    const results = await storageManager.throwItem('issues');
    const issuesDBName = `${spaceId}_comments_count`;

    if (!results) continue;

    for (const result of results) {
      popupNotification({ issueId: result.id, spaceId, issuesDBName });
    }
  }

  function ajaxRequest(_issueKey, key, _db){
    var key = _issueKey;
    var query = '';
    var path = '';
    var spaceName = space[key].name;

    if (spaceName.indexOf('backlog.jp') === -1 && spaceName.indexOf('backlog.com') === -1) {
      spaceName = `${spaceName}.backlog.jp`;
    }

    return new Promise((resolve, reject) => {
      WATCH_STORAGE.Storage.get(_db, (items) => {
        var comment = items[_db];
        if(comment) {
          query = typeof comment[key] === 'undefined' ? '&minId=0' : `&minId=${comment[key]}`;
        }
        path = `https://${spaceName}/api/v2/issues/${key}/comments?apiKey=${space[key].apiKey+query}`;

        $.ajax({
          url: path,
          type: 'GET',
          dataType: 'json',
        }).done((result) => {
          resolve(result);
        }).fail((result) => {
          console.log('ajax failed.....');
          reject(result);
        });
      });
    });
  }
};
const intervalCheck = async () => {
  const [space,close,watch] = await getAllOptions();

  checkWatchIssues({
    space: space as SpaceName,
    close: close as string,
    watch: watch as string
  });
};
const runChromeFunctions = () => {
  // オプション保存時に発火
  chrome.storage.onChanged.addListener((changes) => {
    Object.keys(changes).forEach((key) => {
      if(key === 'options') {
        console.log('storage:', new Date());
        WATCH_NOTICE.intervalCheck();
      }
    });
  });
  // アラーム設定
  chrome.alarms.onAlarm.addListener((alarm) => {
    if(alarm && alarm.name === 'backlog') {
      WATCH_NOTICE.intervalCheck();
    }
  });
  // 1分毎にイベントを発生させる
  chrome.alarms.get('backlog', (val) => {
    if(typeof val === 'undefined') {
      chrome.alarms.create('backlog', { periodInMinutes: 1 });
    }
  });
};

chrome.notifications.getPermissionLevel(async(response) => {
  if (response === 'granted') {
    await intervalCheck();
    runChromeFunctions();
  } else if (response === 'denied') {
    throw new Error('notification request false.');
  }
});
