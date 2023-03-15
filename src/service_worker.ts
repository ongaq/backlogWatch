import type { CheckWatchIssues, PopupNotification, BacklogCompletedWhenCancel } from '../@types/service_worker';
import type { IssueComment, Issues } from '../@types/issues';
import { getIssueFetchAPI, getWatchListFetchAPI, getIssueCommentFetchAPI, deleteWatchFetchAPI } from './api';
import { getOptions, consoleLog } from './common';
import storageManager from './storage';

const getAllOptions = async () => await Promise.all([
  getOptions('space'),
  getOptions('close'),
  getOptions('watch'),
]);

const acceptNotification = async () => {
  const alarmName = 'backlogOptionsSetting';
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
        return;
      }
      chrome.alarms.create(alarmName, { periodInMinutes: 1 });
      chrome.alarms.onAlarm.addListener((alarm) => alarm && alarm.name === alarmName && acceptNotification());
    });
  }
};
/** n秒後に通知を閉じる */
const closeNotificationAfterSeconds = async (notificationId: string) => {
  const result = await storageManager.get('options');
  const msec = 1000;
  const alermName = 'autoClose';
  if (!result || !Object.keys(result).length) return;
  const { options: { options } } = result;

  if (options && options.close && Number(options.close) > 0) {
    const when = Date.now() + (msec * Number(options.close));
    chrome.alarms.create(alermName, { when });
  }
  chrome.alarms.onAlarm.addListener((alarm) => alarm && alarm.name === alermName && chrome.notifications.clear(notificationId));
};
/** 課題完了時にウォッチを解除する */
const backlogCompletedWhenCancel = async ({ hostname, subdomain, watch, status, issueId, watchingId }: BacklogCompletedWhenCancel) => {
  if (!Boolean(watch) || !issueId || !watchingId) {
    return;
  }
  if (status === '完了') {
    const result = await deleteWatchFetchAPI(watchingId, hostname);

    if (result) {
      await storageManager.remove(subdomain, issueId, 'watching');
    }
  }
};
/** 通知を作成する */
const createNotifications = async (options: chrome.notifications.NotificationOptions<true>, hostname: string, issueId: string, comments: false | IssueComment[]) => {
  const subdomain = hostname?.split('.')?.[0] || '';
  const noti = chrome.notifications;
  const comment = comments && comments.length ? comments[0] : undefined;
  let lastCommentId = typeof comment !== 'undefined' ? `#comment-${comment.id}` : '';

  noti.create(`backlog-${subdomain}-${issueId}`, options, (notificationId) => {
    const listener = () => {
      chrome.tabs.create({
        url: `https://${hostname}/view/${issueId}${lastCommentId}`,
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
};
const createMessage = (comments: false | IssueComment[], issue: Issues) => {
  if (comments && comments.length) {
    if (comments[0].content) {
      return comments[0].content;
    } else {
      const log = comments[0].changeLog;
      if (log && log.length) {
        return log.reduce((temp, data) => {
          if (data.field && data.newValue) {
            if (data.originalValue) {
              temp += `${data.field}: ${data.originalValue} → ${data.newValue}\n`;
            } else {
              temp += `${data.field}: ${data.newValue}\n`;
            }
          }
          return temp;
        }, '');
      }
    }
  }
  return issue.description;
};
const popupNotification = async ({ hostname, spaceId, watch }: PopupNotification) => {
  const watchingList = await getWatchListFetchAPI(hostname);
  if (!watchingList || !watchingList.length) return false;

  let watchDB = await storageManager.get('watching');
  if (!watchDB || !Object.keys(watchDB).length) {
    await storageManager.add(spaceId, {}, 'watching');
    watchDB = await storageManager.get('watching');
  }
  if (!watchDB) return false;

  for (const watching of watchingList) {
    const { issue, lastContentUpdated } = watching;
    const issueId = issue.issueKey;
    const updateTime = new Date(lastContentUpdated).getTime() / 1000;
    watchDB['watching'][spaceId] ??= {};
    const space = watchDB['watching'][spaceId];

    if (typeof space?.[issue.issueKey] === 'undefined') {
      space[issue.issueKey] = 0;
    }
    const updateTimeStoredInDB = space[issue.issueKey];

    if (updateTimeStoredInDB === 0) {
      const lastUpdate = { [issueId]: updateTime };
      await storageManager.add(spaceId, lastUpdate, 'watching');
    }
    // APIで取得した最終更新時間のほうが保存された時間より新しければ
    if (updateTime > updateTimeStoredInDB) {
      space[issue.issueKey] = updateTime;
      const note = `[${issueId}] @${issue.createdUser.name}`;
      const iconUrl = `https://${hostname}/favicon.ico`;
      const [issues, comments] = await Promise.all([
        getIssueFetchAPI(issueId, hostname),
        getIssueCommentFetchAPI(issueId, hostname),
      ]);
      const message = createMessage(comments, issue);

      await createNotifications({
        type: 'basic',
        iconUrl,
        title: issues ? issues.summary : issueId,
        message,
        contextMessage: note,
        requireInteraction: true
      }, hostname, issueId, comments);
    }
    const subdomain = hostname.split('.')[0];
    const status = issue.status.name;
    if (watchDB && updateTime !== updateTimeStoredInDB) {
      await storageManager.set(watchDB);
    }
    backlogCompletedWhenCancel({ hostname, subdomain, watch, status, issueId, watchingId: watching.id });
  }
};
const checkWatchIssues = async ({ space, close, watch }: CheckWatchIssues) => {
  if (!space || !close || !watch) {
    return consoleLog('オプション取得失敗');
  }
  for (const spaceId of Object.keys(space)) {
    const hostname = space[spaceId].name;
    popupNotification({ hostname, spaceId, watch });
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
      if (key === 'options') {
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
      if (thisVersion === '2.0.0') {
        chrome.tabs.create({ url: chrome.runtime.getURL(`options.html?v=${thisVersion}`) });
      }
      chrome.tabs.create({ url: chrome.runtime.getURL(`history.html?v=${thisVersion}`) });
    }
  }
});
