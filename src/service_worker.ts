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
    console.log('notificationId:', notificationId, '->', new Date());

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
    chrome.notifications.create(`backlog-${subdomain}-${issueId}`, options, (notificationId) => {
      const listener = () => {
        chrome.tabs.create({
          url: `https://${hostname}/view/${issueId}#comment-${res.id}`
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
    backlogCompletedWhenCancel(subdomain, res);
  };
  const popupNotification = async ({ hostname, issueId, issuesDBName }: PopupNotification) => {
    const result = await getIssueCommentFetchAPI(issueId, issuesDBName);
    if (!result) return;

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
      const iconUrl = `https://${hostname}/favicon.ico`;
      const issues = await getIssueFetchAPI(issueId);

      createNotifications({
        type: 'basic',
        iconUrl,
        title: issues ? issues.summary : issueId,
        message: res.content,
        contextMessage: note,
        requireInteraction: true
      }, hostname, issueId, res);
    }
    const subdomain = hostname?.split('.')?.[0] || '';
    await storageManager.set(useStorageValue);
    backlogCompletedWhenCancel(subdomain, res);
  };

  for (const spaceId of Object.keys(space)) {
    const results = await storageManager.throwItem(spaceId, 'issues');
    const issuesDBName = `${spaceId}_comments_count`;

    if (!results) continue;

    for (const result of results) {
      popupNotification({ hostname: space[spaceId].name, issueId: result.id, issuesDBName });
    }
  }
};
const intervalCheck = async () => {
  const [space,close,watch] = await getAllOptions();
  console.log(space,close,watch);
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
