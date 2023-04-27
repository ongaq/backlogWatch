import type { Watchings } from '../@types/watch';
import type { WatchStyle, WatchState } from '../@types/issues';
import {
  spaceUrl,
  backlogLocation,
  locationObserver,
  watchControl,
  consoleLog,
  addWatch,
  removeWatch,
  saveIssueWatching,
  hasStorageWatchItem,
} from './common';
import storageManager from './storage';
import { getWatchListFetchAPI, deleteWatchFetchAPI } from './api';

const EYE_URL = chrome.runtime.getURL('images/eye.svg');
const EYE_SLASH_URL = chrome.runtime.getURL('images/eye-slash.svg');

/** 課題コメントの通知ユーザー画像を左側に配置するか */
const setImageLeft = async () => {
  const options = await storageManager.get('options');
  if (!options || !Object.keys(options).length) return;
  const style = `<style id="ext-imageLeft-style">
    .comment-notified-users__list {
      text-align: left !important;
    }
  </style>`;
  const hasStyle = document.querySelector('#ext-imageLeft-style');

  if (typeof options.options.options?.imageLeft === 'undefined') {
    options.options.options.imageLeft = 1;
  }
  if (options.options.options?.imageLeft && !hasStyle) {
    document.head.insertAdjacentHTML('beforeend', style);
  }
};
/** ウォッチボタンの削除 */
const deleteWatchBtn = () => {
  const watchIconWrap = document.querySelector('#extension-btn');

  if (watchIconWrap !== null) {
    watchIconWrap.remove();
  }
};
/** 課題ページでDOMが構築されるのを待つ */
const observeIssueCard = (callback: () => void) => {
  const rootElement = document.querySelector('#root');
  let currentSummaryObserve = '';
  /** 再帰的に引数の要素がDOMとして表示されているか確認する */
  const isElementVisible = (element: HTMLElement | null): boolean => {
    if (!element || element === rootElement) return true;
    const style = window.getComputedStyle(element);
    const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    if (!isVisible) return false;

    return isElementVisible(element.parentElement);
  };
  const getCurrentSummary = (currentSummary: string) => {
    const summaryElm = document.querySelector('#summary') as HTMLElement;
    const summary = summaryElm?.textContent;
    const isVisible = isElementVisible(summaryElm);

    // 課題ページのタイトルが無かったら初期化
    if (!summaryElm || !summary || !isVisible) {
      deleteWatchBtn();
      currentSummaryObserve = '';
      return false;
    }
    if (typeof summary === 'string' && currentSummary !== summary) {
      return summary;
    }
    return false;
  };
  if (rootElement === null) return;

  const observer = new MutationObserver(() => {
    const currentSummary = getCurrentSummary(currentSummaryObserve);
    if (currentSummary !== false) {
      currentSummaryObserve = currentSummary;
      callback();
    }
  });
  observer.observe(rootElement, { childList: true, subtree: true });
};
/** ダッシュボードのウォッチ一覧用HTML */
const createHTML = (watchings: Watchings[]) => {
  const tableClass = 'watch-issue watch-issue_new data-table data-table--default my-issues-table';
  const createTR = (data: Watchings, evenOdd: string) => {
    const { issueKey, summary, assignee, description } = data.issue;
    const desc = description || '-';
    const name = assignee?.name || '-';

    return `<tr class="Issue watch-issue-list watch-issue-list_new ${evenOdd}" data-watch-id="${data.id}">
      <td class="Key">
        <p><a href="/view/${issueKey}" class="watch-issue-anchor" title="${issueKey}">${issueKey}</a></p>
      </td>
      <td class="Title" title="${summary}"><p>${summary}</p></td>
      <td class="Assigner" title="${name}"><p>${name}</p></td>
      <td class="Description" title="${desc}"><p>${desc}</p></td>
      <td class="Watch">
        <i class="fa fa-eye ext-watching-icon is-watched"></i>
      </td>
    </tr>`;
  };
  const html = (tr: string) => `<section id="myIssues" class="watch-issueSection" data-id="projects-issues">
  <h3 class="watch-title title title--thirdly">
    ウォッチ中の課題
  </h3>
  <style id="ext-watching-style">
  .ext-watching-icon.is-watched {
    -webkit-mask-image:url(${EYE_URL});
    mask-image:url(${EYE_URL});
    width: 20px;
    height: 20px;
  }
  .ext-watching-icon.is-watched:hover {
    -webkit-mask-image:url(${EYE_SLASH_URL});
    mask-image:url(${EYE_SLASH_URL});
    width: 22px;
    height: 22px;
  }
  </style>
  <div>
    <table id="issueList" class="${tableClass}" cellspacing="0" cellpadding="0" border="0">
      <thead>
        <tr>
          <th class="watch-issue-col-1"><span>キー</span></th>
          <th class="watch-issue-col-2"><span>件名</span></th>
          <th class="watch-issue-col-3"><span>担当者</span></th>
          <th class="watch-issue-col-4"><span>詳細</span></th>
          <th class="watch-issue-col-5"><span>watch</span></th>
        </tr>
      </thead>
      <tbody>${tr}</tbody>
    </table>
  </div>
  </section>`;

  let tr = '';
  for (let i=0; i < watchings.length; i++) {
    const evenOdd = i % 2 ? 'odd' : 'even';
    tr += createTR(watchings[i], evenOdd);
  }
  return html(tr);
};
/** ダッシュボードにウォッチ一覧用のHTMLを追加する */
const createHomeTheIssueUnderWatch = (watchings: Watchings[]) => {
  const html = createHTML(watchings);
  const projects = document.querySelector<HTMLElement>('#project-list:not([data-id="projects-fav"])');

  if (projects !== null) {
    projects.insertAdjacentHTML('beforebegin', html);
  }
};
/** ダッシュボードにウォッチ一覧を作成 */
const createWatchHome = async () => {
  const { subdomain, hostname } = spaceUrl();
  const result = await getWatchListFetchAPI(hostname);
  if (!result || !result.length) return;
  createHomeTheIssueUnderWatch(result);

  const watchRemoveHandler = async (e: MouseEvent) => {
    const self = <HTMLElement>e.currentTarget;
    const trElement = self.closest('tr');
    if (trElement === null) return;
    const item = {
      id: trElement.getAttribute('data-watch-id'),
      issueKey: trElement.querySelector<HTMLAnchorElement>('.Key a')?.title,
    };
    const speed = 500;
    if (!item.issueKey || !item.id) return;

    if (self.classList.contains('is-watched')) {
      watchControl(self, 'remove');
      const res = await deleteWatchFetchAPI(Number(item.id));

      if (res) {
        void storageManager.remove(subdomain, item.issueKey, 'watching');
        trElement.style.opacity = '0';
        setTimeout(() => trElement.remove(), speed);
      }
    }
  };
  const mouseEnterHandler = (e: MouseEvent) => {
    const self = <HTMLElement>e.currentTarget;
    self?.classList.add('is-hover');
  };
  const mouseLeaveHandler = (e: MouseEvent) => {
    const self = <HTMLElement>e.currentTarget;
    self?.classList.remove('is-hover');
  };
  const mouseDownHandler = (e: MouseEvent) => {
    const self = <HTMLElement>e.currentTarget;
    const href = self.querySelector<HTMLAnchorElement>('.watch-issue-anchor')?.href;

    if ((e.target as HTMLElement)?.classList.contains('fa-eye')) {
      return;
    }
    if (typeof href === 'undefined') return;

    if ((e.ctrlKey && e.button === 0) || e.button === 1) {
      window.open(href);
    } else if (e.button === 0) {
      location.href = href;
    }
  };

  const watchIssueElements = document.querySelectorAll<HTMLElement>('.watch-issue-list');
  const watchingElements = document.querySelectorAll<HTMLElement>('.watch-issue .fa-eye');

  for (const watchingElement of watchingElements) {
    watchingElement.addEventListener('click', (event) => void watchRemoveHandler(event));
  }
  for (const watchIssueElement of watchIssueElements) {
    watchIssueElement.addEventListener('mouseenter', mouseEnterHandler);
    watchIssueElement.addEventListener('mouseleave', mouseLeaveHandler);
    watchIssueElement.addEventListener('mousedown', mouseDownHandler);
  }
};
/** 課題ページでウォッチボタンの作成 */
const createWatchIssue = async () => {
  const options = await storageManager.get('options');
  const spaceInfo = spaceUrl();
  if (!spaceInfo || !options || !Object.keys(options).length) return;
  const subdomain = spaceInfo.subdomain;

  const issueCard = document.querySelector<HTMLElement>('#issueArea');
  if (issueCard === null) {
    return consoleLog('ウォッチボタンの作成失敗');
  }
  const watchText = {
    watching: 'ウォッチ中',
    notWatch: 'ウォッチリストに入れる',
  };
  const getIssueItem = (issueCard: HTMLElement) => ({
    id: issueCard.querySelector<HTMLElement>('.ticket__key-number')?.textContent || '',
    title: issueCard.querySelector<HTMLElement>('.title-group__title-text')?.textContent || '',
    assigner: issueCard.querySelector<HTMLElement>('.ticket__article-header .user-icon-set__name')?.firstChild?.textContent || '',
    description: issueCard.querySelector<HTMLElement>('.ticket__description')?.textContent || '',
    time: new Date()
  });
  const changeWatchState = async ({ watchBtnElement, textElement, issueId }: WatchStyle & WatchState) => {
    // Storageに課題キーが存在するか確認
    const isWatching = await hasStorageWatchItem(issueId, subdomain);

    if (!textElement || !watchBtnElement) {
      return consoleLog('ウォッチ状態変更の失敗');
    }
    if (isWatching) {
      removeWatch({ watchBtnElement, textElement, issueId });
    } else {
      addWatch({ watchBtnElement, textElement, issueId });
    }
  };
  const createWatchButton = async (issueId: string) => {
    deleteWatchBtn();
    const html = (text: string) => `<div id="extension-btn" class="watchIconWrap" title="${text}">
      <i id="extension-eyeIcon" class="watchIconWrap__icon fa fa-eye" style="-webkit-mask-image:url(${EYE_URL});mask-image:url(${EYE_URL});"></i>
      <span id="extension-text" class="watchIconWrap__text">${text}</span>
    </div>`;

    // Storageに課題キーが存在するか確認
    const isWatching = await hasStorageWatchItem(issueId);

    if (isWatching) {
      document.body.insertAdjacentHTML('beforeend', html(watchText.watching));
      const watchBtnElement = document.querySelector<HTMLElement>('#extension-btn');
      if (watchBtnElement === null) return;
      watchControl(watchBtnElement, 'add');
    } else {
      document.body.insertAdjacentHTML('beforeend', html(watchText.notWatch));
    }
  };

  const issueItem = getIssueItem(issueCard);
  const issueId = issueItem.id;
  await createWatchButton(issueId);
  const watchBtnElement = document.querySelector<HTMLElement>('#extension-btn');
  if (watchBtnElement === null) return;
  const eyeElement = document.querySelector<HTMLElement>('#extension-eyeIcon');
  const textElement = document.querySelector<HTMLElement>('#extension-text');

  if (eyeElement && textElement && issueId) {
    const items = { watchBtnElement, textElement, issueId };
    await saveIssueWatching(items);
    watchBtnElement.addEventListener('click', () => changeWatchState(items));
  }
};

const exec = () => {
  if (backlogLocation.isHome) {
    createWatchHome();
  }
  observeIssueCard(() => {
    createWatchIssue();
    setImageLeft();
  });
};

if (document.readyState !== 'loading') {
  exec();
  locationObserver(exec);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    exec();
    locationObserver(exec);
  });
}
