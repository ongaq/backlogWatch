import storageManager from './storage';
import { Options, GetOptions } from '../@types/index';

/** BacklogWatch用コンソールログ */
export const consoleLog = (text: string) => console.log('[BacklogWatch]', text);
export const spaceName = (() => {
  const name = window.location.hostname.split('.')[0];
  const overwriteSpaceName = (spaceName: string) => {
    if (spaceName.indexOf('backlog.jp') === -1 && spaceName.indexOf('backlog.com') === -1) {
      spaceName = `${spaceName}.backlog.jp`;
    }
    return spaceName;
  };
  return overwriteSpaceName(name);
})();
export const spaceDomain = window.location.hostname;
export const backlogLocation = {
  home: window.location.href.includes('/dashboard'),
  issue: window.location.href.includes('/view'),
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
export const getOptions: GetOptions = (target) => {
  return new Promise(async(resolve) => {
    const items = await storageManager.get('options') as Options | false;

    if (items && items.options) {
      const space = items.options.space;
      const options = items.options.options;

      if (target === 'close') {
        return resolve(options.close);
      } else if (target === 'watch') {
        return resolve(options.watch);
      } else if (target === 'space' && Object.keys(space).length) {
        return resolve(space);
      }
    }
    return resolve(false);
  });
};
export const overwriteSpaceName = (spaceName: string) => {
  if (spaceName.indexOf('backlog.jp') === -1 && spaceName.indexOf('backlog.com') === -1) {
    spaceName = `${spaceName}.backlog.jp`;
  }
  return spaceName;
};
