import type { CheckWatchIssues, WatchNotification, BacklogCompletedWhenCancel } from '../@types/service_worker';
import type { IssueComment, Issues } from '../@types/issues';
import { getIssueFetchAPI, getWatchListFetchAPI, getIssueCommentFetchAPI, deleteWatchFetchAPI, getNotificationsFetchAPI } from './api';
import { getOptions, consoleLog, isObject, isArray } from './common';
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

  // 通知ウインドウが閉じられていない場合は同じ通知は作らない
  if (notifyIds.includes(notifyId)) return;

  const handleNotificationEvent = (eventNotificationId: string, targetNotificationId: string, listener: (id: string) => void) => {
    if (eventNotificationId === targetNotificationId) {
      chrome.notifications.onClicked.removeListener(listener);
      chrome.notifications.clear(targetNotificationId);
    }
  };
  chrome.notifications.create(`backlog-${subdomain}-${issueId}`, options, (notificationId: string) => {
    const listener = (clickedNotificationId: string) => {
      if (clickedNotificationId === notificationId) {
        chrome.tabs.create({
          url: `https://${hostname}/view/${issueId}${lastCommentId}`,
        });
        handleNotificationEvent(clickedNotificationId, notificationId, listener);
      }
    };
    const closeListener = (closedNotificationId: string) =>
      handleNotificationEvent(closedNotificationId, notificationId, listener);
    chrome.notifications.onClicked.addListener(listener);
    chrome.notifications.onClosed.addListener(closeListener);
    // 機能オプション
    closeNotificationAfterSeconds(notificationId);
  });
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
/** ウォッチの通知 */
const watchNotification = async ({ hostname, spaceId, options }: WatchNotification) => {
  const { watch } = options;
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

    if (typeof space?.[issueId] === 'undefined') {
      space[issueId] = { updateTime: 0, watchId: 0 };
    }
    const updateTimeStoredInDB = space[issueId];

    if (updateTimeStoredInDB.updateTime === 0) {
      const issueWatchingId = { [issueId]: { updateTime, watchId: watching.id } };
      await storageManager.add(spaceId, issueWatchingId, 'watching');
    }
    // APIで取得した最終更新時間のほうが保存された時間より新しければ
    if (updateTime > updateTimeStoredInDB.updateTime) {
      space[issueId] = { updateTime, watchId: watching.id };

      // 初回登録時は通知させない
      if (updateTimeStoredInDB.updateTime !== 0) {
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
    }
    const subdomain = hostname.split('.')[0];
    const status = issue.status.name;
    if (watchDB && updateTime !== updateTimeStoredInDB.updateTime) {
      await storageManager.set(watchDB);
    }
    backlogCompletedWhenCancel({ hostname, subdomain, watch, status, issueId, watchingId: watching.id });
  }
};
/** お知らせの通知 */
const infoNotification = async (hostname: string) => {
  const notifications = await getNotificationsFetchAPI(hostname);
  if (!notifications || !notifications.length) return false;

  for (const notification of notifications) {
    if (notification.resourceAlreadyRead || notification.alreadyRead || !notification.issue) {
      continue;
    }
    const { issue, comment } = notification;
    const issueId = issue.issueKey;

    const note = `[${issueId}] @${issue.createdUser.name}`;
    const iconUrl = `https://${hostname}/favicon.ico`;
    const message = createMessage(comment, issue);

    await createNotifications({
      type: 'basic',
      iconUrl,
      title: issue ? issue.summary : issueId,
      message,
      contextMessage: note,
      requireInteraction: true
    }, hostname, issueId, comment);
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
      await infoNotification(hostname);
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
      chrome.tabs.create({ url: chrome.runtime.getURL(`https://backlog.4kissa.me/history.html?v=${thisVersion}`) });
    }
  }
});
