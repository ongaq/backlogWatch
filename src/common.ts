import type { GetOptionsArg, GetOptionsReturn } from '../@types/index';
import type { WatchStyle, WatchState } from '../@types/issues';
import { addWatchFetchAPI, deleteWatchFetchAPI, getWatchListFetchAPI, getUserInfoFetchAPI } from './api';
import storageManager from './storage';

/** BacklogWatch用コンソールログ */
export const consoleLog = (log: any) => console.log('[BacklogWatch]', log);
export const spaceDomain = typeof window !== 'undefined' && window.location.hostname;
export const backlogLocation = {
  isHome: typeof window !== 'undefined' && window.location.href.includes('/dashboard'),
  isIssue: typeof window !== 'undefined' && window.location.href.includes('/view'),
};
export const returnMsec = (number: number) => {
  const millisecond = 1000;
  const sec = 60;

  return millisecond * sec * number;
};
export const locationObserver = (callback: Function) => {
  const target = document.querySelector('.ticket__mask');
  if (target === null) return;

  const timeout = 500;
  const observeConfig = {
    attributes: true,
    childList: true,
    characterData: true
  };
  let state = history.state;
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // loading表示が消えたら実行
      const target = <HTMLElement>mutation.target;

      if (target.style.display === 'none' && state.issueKey !== history.state.issueKey) {
        state = history.state;
        observer.disconnect();
        setTimeout(callback, timeout);
      }
    }
  });
  observer.observe(target, observeConfig);
};
export const watchControl = (element: HTMLElement, state: string) => {
  const timer = 10;

  if (state === 'add') {
    element.classList.remove('is-running');
    element.classList.add('is-watch');
  } else if (state === 'remove') {
    element.classList.remove('is-running', 'is-watch');
  }
  setTimeout(() => element.classList.add('is-running'), timer);
};
export const getOptions = <T extends GetOptionsArg>(target: T) => {
  return new Promise<GetOptionsReturn<T>>(async(resolve) => {
    const items = await storageManager.get('options');

    if (items && items.options) {
      const space = items.options.space;
      const options = items.options.options;

      if (target === 'close') {
        return resolve(options.close as unknown as GetOptionsReturn<T>);
      } else if (target === 'watch') {
        return resolve(options.watch as unknown as GetOptionsReturn<T>);
      } else if (target === 'space' && Object.keys(space).length) {
        return resolve(space as unknown as GetOptionsReturn<T>);
      }
    }
    return resolve(false as unknown as GetOptionsReturn<T>);
  });
};
export const spaceUrl = (argHostname?: string) => {
  const data = {
    subdomain: '',
    hostname: '',
  };
  if (argHostname) {
    data.subdomain = argHostname.split('.')[0];
    data.hostname = argHostname;
    return data;
  }
  if (typeof window === 'undefined') {
    return data;
  }
  data.hostname = window?.location?.hostname || '';
  data.subdomain = data.hostname?.split('.')?.[0] || '';
  return data;
};

const watchText = {
  watching: 'ウォッチ中',
  notWatch: 'ウォッチリストに入れる',
};
export const removeWatchStyle = ({ heartElement, textElement }: WatchStyle) => {
  watchControl(heartElement, 'remove');
  textElement.textContent = watchText.notWatch;
};
export const addWatchStyle = ({ heartElement, textElement }: WatchStyle) => {
  watchControl(heartElement, 'add');
  textElement.textContent = watchText.watching;
};
export const addWatch = async ({ heartElement, textElement, issueId, watchingId }: WatchStyle & WatchState) => {
  addWatchStyle({ heartElement, textElement });
  const { subdomain } = spaceUrl();
  const setValue = {
    [issueId]: 0,
  };

  if (watchingId && subdomain) {
    setValue[issueId] = watchingId;
  } else if (subdomain) {
    const watching = await addWatchFetchAPI(issueId);

    if (watching) {
      if (typeof watching?.errors !== 'undefined') {
        if (heartElement && textElement) {
          removeWatchStyle({ heartElement, textElement });
        }
        return;
      }
      setValue[issueId] = watching.id;
    }
  }
  if (setValue[issueId]) {
    void storageManager.add(subdomain, setValue, 'watching');
  }
};
export const removeWatch = async ({ heartElement, textElement, issueId }: WatchStyle & WatchState) => {
  removeWatchStyle({ heartElement, textElement });
  const { subdomain } = spaceUrl();

  const watching = await storageManager.get('watching');
  if (!watching || !subdomain) {
    addWatchStyle({ heartElement, textElement });
    return;
  }
  const watchingId = watching['watching'][subdomain][issueId];
  void deleteWatchFetchAPI(watchingId);
  void storageManager.remove(subdomain, issueId, 'watching');
};
/** Chrome.Storageにウォッチが保存されているか */
export const hasStorageWatchItem = async (issueId: string) => {
  const watching = await storageManager.get('watching');
  if (!watching) return;
  const { subdomain } = spaceUrl();
  const domainStorage = watching['watching']?.[subdomain] || {};

  return Object.keys(domainStorage).includes(issueId);
};
/** ウォッチ中の課題を保存する */
export const saveIssueWatching = async ({ heartElement, textElement, issueId }: WatchStyle & WatchState) => {
  const { hostname } = spaceUrl();
  const isWatching = document.querySelector('.title-group__edit-actions button[aria-label="ウォッチ中"]') !== null;

  // Backlogとしてはウォッチ中だがChrome.Storageにウォッチが保存されていない
  if (!(await hasStorageWatchItem(issueId)) && isWatching) {
    const watchingIssues = await getWatchListFetchAPI(hostname);
    if (!watchingIssues || !watchingIssues.length) return;

    for (const { issue } of watchingIssues) {
      if (issue.issueKey === issueId) {
        addWatch({ heartElement, textElement, issueId, watchingId: issue.id });
        break;
      }
    }
  }
};
export const getBacklogUserId = async (hostname: string) => {
  const { subdomain } = spaceUrl(hostname);
  const userData = await storageManager.get('user');

  if (userData && Object.keys(userData).length) {
    const userId = userData?.['user']?.[subdomain]?.user;
    return userId ? userId : false;
  } else {
    const result = await getUserInfoFetchAPI();
    console.log('result:', result);

    if (result) {
      const userId = { user: result.id };
      await storageManager.add(subdomain, userId, 'user');
      return result.id;
    }
    return false;
  }
};
