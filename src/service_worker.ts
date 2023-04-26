import type { IssueWatchingId } from '../@types/index';
import type { UpdateWatchDB, CheckWatchIssues, WatchNotification, BacklogCompletedWhenCancel } from '../@types/service_worker';
import type { DataBase } from '../@types/storage';
import type { IssueComment, Issues } from '../@types/issues';
import { getIssueFetchAPI, getWatchListFetchAPI, getIssueCommentFetchAPI, deleteWatchFetchAPI, getNotificationsFetchAPI } from './api';
import { getOptions, getBacklogUserId, consoleLog, isObject, isArray } from './common';
import storageManager from './storage';

const getAllOptions = async () => await Promise.all([
  getOptions('space'),
  getOptions('options'),
]);

/** n秒後に通知を閉じる */
const closeNotificationAfterSeconds = async (notificationId: string) => {
  const result = await storageManager.get('options');
  const msec = 1000;
  const alermName = 'autoClose';
  if (!result || !Object.keys(result).length) return;
  const { options: { options } } = result;

  if (options && options.close > 0) {
    const when = Date.now() + (msec * options.close);
    chrome.alarms.create(alermName, { when });
  }
  chrome.alarms.onAlarm.addListener((alarm) => alarm && alarm.name === alermName && chrome.notifications.clear(notificationId));
};
/** 課題完了時にウォッチを解除する */
const backlogCompletedWhenCancel = async ({ hostname, subdomain, watch, status, issueId, watchingId }: BacklogCompletedWhenCancel) => {
  if (!watch || !issueId || !watchingId) {
    return;
  }
  if (status === '完了') {
    const result = await deleteWatchFetchAPI(watchingId, hostname);

    if (result) {
      await storageManager.remove(subdomain, issueId, 'watching');
    }
  }
};
const getAllNotificationIds = (): Promise<string[]> => {
  return new Promise((resolve) => {
    chrome.notifications.getAll((notify) => {
      return resolve(Object.keys(notify));
    });
  });
};
/** 通知を作成する */
const createNotifications = async (options: chrome.notifications.NotificationOptions<true>, hostname: string, issueId: string, comments: false | IssueComment | IssueComment[]) => {
  const subdomain = hostname?.split('.')?.[0] || '';
  const comment = isArray(comments) ? comments[0] : isObject(comments) ? comments : undefined;
  const lastCommentId = typeof comment !== 'undefined' ? `#comment-${comment.id}` : '';
  const notifyIds = await getAllNotificationIds();
  const notifyId = `backlog-${subdomain}-${issueId}`;

  if (notifyIds.includes(notifyId)) {
    chrome.notifications.update(notifyId, options);
  } else {
    chrome.notifications.create(notifyId, options, (notificationId: string) => {
      const closeListener = async (closedNotificationId: string, byUser: boolean) => {
        if (closedNotificationId === notificationId && byUser) {
          chrome.notifications.onClicked.removeListener(clickListener);
          chrome.notifications.onClosed.removeListener(closeListener);
          chrome.notifications.clear(notificationId);
        }
      };
      const clickListener = (clickedNotificationId: string) => {
        if (clickedNotificationId === notificationId) {
          chrome.notifications.onClicked.removeListener(clickListener);
          chrome.notifications.onClosed.removeListener(closeListener);
          chrome.tabs.create({
            url: `https://${hostname}/view/${issueId}${lastCommentId}`,
          });
          chrome.notifications.clear(clickedNotificationId);
        }
      };
      chrome.notifications.onClicked.addListener(clickListener);
      chrome.notifications.onClosed.addListener(closeListener);
      // 機能オプション
      closeNotificationAfterSeconds(notificationId);
    });
  }
};
const createMessage = (comments: false | IssueComment | IssueComment[], issue: Issues) => {
  const getLog = (comment: IssueComment) => {
    const log = comment.changeLog;
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
    return issue.description;
  };

  if (comments) {
    if (isArray(comments)) {
      return comments?.[0]?.content ? comments[0].content : getLog(comments?.[0]);
    } else if (isObject(comments)) {
      return comments?.content ? comments.content : getLog(comments);
    }
  }
  return issue.description;
};
const getWatchDB = async (spaceId: string): Promise<false | DataBase> => {
  let watchDB = await storageManager.get('watching');
  if (!watchDB || !Object.keys(watchDB).length) {
    await storageManager.add(spaceId, {}, 'watching');
    watchDB = await storageManager.get('watching');
  }
  if (!watchDB) {
    return false;
  }
  watchDB['watching'][spaceId] ??= {};
  return watchDB;
};
const updateWatchDB = async (options: UpdateWatchDB) => {
  const { watchDB, spaceId, issueId, watching, lastContentUpdated } = options;
  const updateTime = new Date(lastContentUpdated).getTime() / 1000;
  const space = watchDB['watching'][spaceId];

  if (typeof space?.[issueId] === 'undefined') {
    space[issueId] = { updateTime: 0, watchId: 0 };
  }
  const updateTimeStoredInDB = space[issueId];

  if (updateTimeStoredInDB.updateTime === 0) {
    const issueWatchingId: IssueWatchingId = {
      [issueId]: { updateTime }
    };
    if (typeof watching !== 'undefined') {
      issueWatchingId[issueId]['watchId'] = watching.id;
    }
    await storageManager.add(spaceId, issueWatchingId, 'watching');
  }
  if (updateTime > updateTimeStoredInDB.updateTime) {
    space[issueId] = { updateTime };
    if (typeof watching !== 'undefined') {
      space[issueId]['watchId'] = watching.id;
    }
  }
  if (watchDB && updateTime !== updateTimeStoredInDB.updateTime) {
    await storageManager.set(watchDB);
  }
  return {
    isUpdate: updateTime > updateTimeStoredInDB.updateTime,
    isInitial: updateTimeStoredInDB.updateTime === 0,
  };
};
/** ウォッチの通知 */
const watchNotification = async ({ hostname, spaceId, options }: WatchNotification) => {
  const { watch } = options;
  const userId = await getBacklogUserId(hostname);
  if (!userId) return false;
  const watchingList = await getWatchListFetchAPI(hostname, userId);
  if (!watchingList || !watchingList.length) return false;

  const watchDB = await getWatchDB(spaceId);
  if (!watchDB) return false;

  for (const watching of watchingList) {
    const { issue, lastContentUpdated } = watching;
    const issueId = issue.issueKey;
    const updateOptions = { watchDB, spaceId, issueId, watching, lastContentUpdated };
    const { isUpdate, isInitial } = await updateWatchDB(updateOptions);
    const isSelfUpdate = userId === issue.updatedUser.id;

    /*
     * APIで取得した最終更新時間のほうが保存された時間より新しく、
     * 初回ウォッチ登録時ではなく、自分が更新した内容でなければ通知
     */
    if (isUpdate && !isInitial && !isSelfUpdate) {
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
    backlogCompletedWhenCancel({ hostname, subdomain, watch, status, issueId, watchingId: watching.id });
  }
};
/** お知らせの通知 */
const infoNotification = async ({ hostname, spaceId }: WatchNotification) => {
  const notifications = await getNotificationsFetchAPI(hostname);
  if (!notifications || !notifications.length) return false;

  const watchDB = await getWatchDB(spaceId);
  if (!watchDB) return false;

  for (const notification of notifications) {
    if (notification.resourceAlreadyRead || !notification.issue) {
      continue;
    }
    const { issue, comment, created: lastContentUpdated } = notification;
    const issueId = issue.issueKey;

    const note = `[${issueId}] @${issue.createdUser.name}`;
    const iconUrl = `https://${hostname}/favicon.ico`;
    const message = createMessage(comment, issue);
    const updateOptions = { watchDB, spaceId, issueId, lastContentUpdated };
    const { isUpdate } = await updateWatchDB(updateOptions);

    if (isUpdate) {
      await createNotifications({
        type: 'basic',
        iconUrl,
        title: issue ? issue.summary : issueId,
        message,
        contextMessage: note,
        requireInteraction: true
      }, hostname, issueId, comment);
    }
  }
};
const checkWatchIssues = async ({ space, options }: CheckWatchIssues) => {
  if (!space || !options) {
    return consoleLog('オプション取得失敗');
  }
  for (const spaceId of Object.keys(space)) {
    const hostname = space[spaceId].name;

    if (options.notifyWatch) {
      await watchNotification({ hostname, spaceId, options });
    }
    if (options.notifyInfo) {
      await infoNotification({ hostname, spaceId, options });
    }
  }
};
const intervalCheck = async () => {
  const [space,options] = await getAllOptions();
  await checkWatchIssues({ space, options });
};
const runChromeFunctions = async () => {
  const alarmName = 'backlog';
  // オプション保存時に発火
  chrome.storage.onChanged.addListener((changes) => {
    Object.keys(changes).forEach(async (key) => {
      if (key === 'options') {
        await intervalCheck();
      }
    });
  });
  await chrome.alarms.clearAll();
  // アラーム設定
  chrome.alarms.onAlarm.addListener((alarm) =>
    alarm && alarm.name === alarmName && intervalCheck());
  // 3分毎にイベントを発生させる
  chrome.alarms.get(alarmName, (val) =>
    typeof val === 'undefined' && chrome.alarms.create(alarmName, { periodInMinutes: 3 }));
};

chrome.notifications.getPermissionLevel(async(response) => {
  if (response === 'granted') {
    await intervalCheck();
    void runChromeFunctions();
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
      chrome.tabs.create({ url: `https://backlog.4kissa.me/history.html?v=${thisVersion}` });
    }
  }
});
