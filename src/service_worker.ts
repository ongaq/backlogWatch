import type { CheckWatchIssues, PopupNotification, BacklogCompletedWhenCancel } from '../@types/service_worker';
import type { IssueComment } from '../@types/issues';
import { getIssueFetchAPI, getWatchListFetchAPI, getIssueCommentFetchAPI } from './api';
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
const backlogCompletedWhenCancel = async ({ subdomain, watch, status, issueId }: BacklogCompletedWhenCancel) => {
  if (!Boolean(watch) || !issueId) {
    return;
  }
  if (status === '完了') {
    await storageManager.remove(subdomain, issueId, 'watching');
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
const popupNotification = async ({ hostname, spaceId, watch }: PopupNotification) => {
  const watchingList = await getWatchListFetchAPI(hostname);
  if (!watchingList || !watchingList.length) return;

  const watchDB = await storageManager.get('watching');
  if (!watchDB) return false;

  for (const watching of watchingList) {
    const { issue, lastContentUpdated } = watching;
    const issueId = issue.issueKey;
    const updateTime = new Date(lastContentUpdated).getTime() / 1000;
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
      await createNotifications({
        type: 'basic',
        iconUrl,
        title: issues ? issues.summary : issueId,
        message: comments && comments.length ? comments[0].content : issue.description,
        contextMessage: note,
        requireInteraction: true
      }, hostname, issueId, comments);
    }
    const subdomain = hostname.split('.')[0];
    const status = issue.status.name;
    if (updateTime !== updateTimeStoredInDB) {
      await storageManager.set(watchDB);
    }
    backlogCompletedWhenCancel({ subdomain, watch, status, issueId });
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
