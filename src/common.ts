import storageManager from './storage';
import { Options, GetOptionsArg, GetOptionsReturn, BacklogResource } from '../@types/index';

/** BacklogWatch用コンソールログ */
export const consoleLog = (text: string) => console.log('[BacklogWatch]', text);
export const spaceUrl = (() => {
  const hostname = window.location.hostname;
  const subdomain = window.location.hostname.split('.')[0];
  return { hostname, subdomain };
})();
/** サイト側でグローバルに登録されたBacklogデータを参照する */
export const backlogResource = (() => {
  const backlog = window?.Backlog || {};

  if (backlog?.resource) {
    return backlog.resource as BacklogResource
  }
  return null;
})();
export const spaceDomain = window.location.hostname;
export const backlogLocation = {
  isHome: window.location.href.includes('/dashboard'),
  isIssue: window.location.href.includes('/view'),
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
    const items = await storageManager.get('options') as Options | false;

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
