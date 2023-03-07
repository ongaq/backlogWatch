import type { IssueComment } from '../@types/issues';
import type { CheckWatchIssues, PopupNotification, IssueCommentsCount, SpaceComments } from '../@types/service_worker';
import { getIssueFetchAPI, getIssueCommentFetchAPI } from './api';
import { getOptions, consoleLog } from './common';
import storageManager from './storage';

console.log('running service_worker ...');

const getAllOptions = async () => await Promise.all([
  getOptions('space'),
  getOptions('close'),
  getOptions('watch'),
]);

const acceptNotification = async () => {
  const alarmName = 'backlogOptionsSetting';
  console.log(new Date(), 'check acceptNotification...');
  const [space,close,watch] = await getAllOptions();

  if (space && close && watch) {
    chrome.alarms.get(alarmName, (val) => val && chrome.alarms.clear(alarmName));
    chrome.notifications.getPermissionLevel((response) => {
      if (response === 'granted') {
        checkWatchIssues({ space, close, watch });
      } else if (response === 'denied') {
        throw new Error('notification request false.');
      }
    });
  } else {
    console.warn('It does not have to set the options.');
    chrome.alarms.get(alarmName, (val) => {
      if (typeof val !== 'undefined') {
        return console.log('not undefined');
      }
      chrome.alarms.create(alarmName, { periodInMinutes: 1 });
      chrome.alarms.onAlarm.addListener((alarm) => alarm && alarm.name === alarmName && acceptNotification());
    });
  }
};
const checkWatchIssues = async ({ space, close, watch }: CheckWatchIssues) => {
  if (!space || !close || !watch) {
    return consoleLog('オプション取得失敗');
  }
  /** n秒後に通知を閉じる */
  const closeNotificationAfterSeconds = (notificationId: string) => {
    const msec = 1000;
    const alermName = 'autoClose';

    if (typeof close !== 'undefined' && Number(close) > 0) {
      const when = Date.now() + (msec * Number(close));
      chrome.alarms.create(alermName, { when });
    }
    chrome.alarms.onAlarm.addListener((alarm) => alarm && alarm.name === alermName && chrome.notifications.clear(notificationId));
  };
  /** 課題完了時にウォッチを解除する */
  const backlogCompletedWhenCancel = async (subdomain: string, res: IssueComment) => {
    const changeLogs = res.changeLog || [];
    if (!Boolean(watch) || !changeLogs.length) {
      return;
    }
    for (const changeLog of changeLogs) {
      if (changeLog.field === 'status' && changeLog.newValue === '完了') {
        await storageManager.remove(subdomain, String(res.id), 'issues');
      }
    }
  };
  /** 通知を作成する */
  const createNotifications = (options: chrome.notifications.NotificationOptions<true>, hostname: string, issueId: string, res: IssueComment) => {
    const subdomain = hostname?.split('.')?.[0] || '';
    const noti = chrome.notifications;
    noti.create(`backlog-${subdomain}-${issueId}`, options, (notificationId) => {
      const listener = () => {
        chrome.tabs.create({
          url: `https://${hostname}/view/${issueId}#comment-${res.id}`
        });
        noti.onClicked.removeListener(listener);
        noti.clear(notificationId);
      };
      noti.onClicked.addListener(listener);
      noti.onClosed.addListener(() => {
        noti.onClicked.removeListener(listener);
        noti.clear(notificationId);
      });
      // 機能オプション
      closeNotificationAfterSeconds(notificationId);
    });
    backlogCompletedWhenCancel(subdomain, res);
  };
  const popupNotification = async ({ hostname, spaceId, issueId, commentCountDbName }: PopupNotification) => {
    const result = await getIssueCommentFetchAPI(issueId, commentCountDbName, hostname);
    if (!result || !result.length) return;

    console.log('popupNotification_result:', result);

    const [res] = result;
    const { id: commentLastId } = res;

    console.log('commentLastId_res:', res, commentLastId);

    const compareValue: IssueCommentsCount = {};
    let useStorageValue: SpaceComments = {};

    // storageからデータを取得
    const items = await storageManager.get(commentCountDbName) as SpaceComments | false;
    if (!items) return;
    const spaceComments = items[commentCountDbName][spaceId];

    // compareValueにデータを追加
    compareValue[issueId] = spaceComments?.[issueId] ?? 0;
    // useStorageValueにデータを追加
    if (spaceComments) {
      useStorageValue = items;
    }
    useStorageValue[commentCountDbName][spaceId] = { [issueId]: commentLastId };

    if (commentLastId > compareValue[issueId]) {
      const note = `[${issueId}] @${res.createdUser.name}`;
      const iconUrl = `https://${hostname}/favicon.ico`;
      const issues = await getIssueFetchAPI(issueId, hostname);

      createNotifications({
        type: 'basic',
        iconUrl,
        title: issues ? issues.summary : issueId,
        message: res.content,
        contextMessage: note,
        requireInteraction: true
      }, hostname, issueId, res);
    }
    await storageManager.set(useStorageValue);
    backlogCompletedWhenCancel(spaceId, res);
  };

  for (const spaceId of Object.keys(space)) {
    const results = await storageManager.throwItem(spaceId, 'issues');
    const commentCountDbName = `${spaceId}_comments_count`;

    if (!results) continue;

    console.log('results:', results);

    for (const result of results) {
      popupNotification({
        hostname: space[spaceId].name,
        spaceId,
        issueId: result.id,
        commentCountDbName,
      });
    }
  }
};
const intervalCheck = async () => {
  const [space,close,watch] = await getAllOptions();
  await checkWatchIssues({ space, close, watch });
};
const runChromeFunctions = () => {
  const alarmName = 'backlog';
  // オプション保存時に発火
  chrome.storage.onChanged.addListener((changes) => {
    Object.keys(changes).forEach(async (key) => {
      console.log('key:', key);
      if (key === 'options') {
        console.log('storage:', new Date());
        await intervalCheck();
      }
    });
  });
  // アラーム設定
  chrome.alarms.onAlarm.addListener((alarm) =>
    alarm && alarm.name === alarmName && intervalCheck());
  // 1分毎にイベントを発生させる
  chrome.alarms.get(alarmName, (val) =>
    typeof val === 'undefined' && chrome.alarms.create(alarmName, { periodInMinutes: 1 }));
};

chrome.notifications.getPermissionLevel(async(response) => {
  if (response === 'granted') {
    await intervalCheck();
    runChromeFunctions();
  } else if (response === 'denied') {
    throw new Error('notification request false.');
  }
});
// インストールとアップデート時に検知
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    }
  } else if (details.reason === 'update') {
    const thisVersion = chrome.runtime.getManifest().version;

    if (thisVersion !== details.previousVersion) {
      chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
    }
  }
});
