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

/** ダッシュボードのウォッチ一覧用HTML */
const createHTML = (watchings: Watchings[]) => {
  const tableClass = 'watch-issue watch-issue_new data-table data-table--default my-issues-table';
  const createTR = (data: Watchings, evenOdd: string) => {
    const { issueKey, summary, assignee, description } = data.issue;
    const desc = description.slice(0, 60);

    return `<tr class="Issue watch-issue-list watch-issue-list_new ${evenOdd}" data-watch-id="${data.id}">
      <td class="Key">
        <p><a href="/view/${issueKey}" class="watch-issue-anchor" title="${issueKey}">${issueKey}</a></p>
      </td>
      <td class="Title"><p>${summary}</p></td>
      <td class="Assigner">${assignee.name}</td>
      <td class="Description" title="${desc}"><p>${desc}...</p></td>
      <td class="Watch"><i class="fa fa-heart is-watch"></i></td>
    </tr>`;
  };
  const html = (tr: string) => `<section id="myIssues" class="watch-issueSection" data-id="projects-issues">
  <h3 class="watch-title title title--thirdly title-group__inline-title">ウォッチ中の課題</h3>
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

    if (self.classList.contains('is-watch')) {
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

    if ((e.target as HTMLElement)?.classList.contains('fa-heart')) {
      return;
    }
    if (typeof href === 'undefined') return;

    if (e.ctrlKey || e.button === 2) {
      window.open(href);
    } else if (e.button === 0) {
      location.href = href;
    }
  };

  const watchIssueElements = document.querySelectorAll<HTMLElement>('.watch-issue-list');
  const watchingElements = document.querySelectorAll<HTMLElement>('.watch-issue .fa-heart');

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
  const spaceInfo = spaceUrl();
  if (!spaceInfo) return;
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
  const changeWatchState = async ({ heartElement, textElement, issueId }: WatchStyle & WatchState) => {
    const watching = await storageManager.get('watching');
    if (!watching) return;
    const issueIds = watching?.['watching']?.[subdomain] || {};
    const isWatching = Object.keys(issueIds).includes(issueItem.id);

    if (!textElement || !heartElement) {
      return consoleLog('ウォッチ状態変更の失敗');
    }
    if (isWatching) {
      removeWatch({ heartElement, textElement, issueId });
    } else {
      addWatch({ heartElement, textElement, issueId });
    }
  };
  const createWatchButton = async (issueId: string) => {
    const watchIconWrap = document.querySelector('.watchIconWrap');
    if (watchIconWrap) {
      watchIconWrap.remove();
    }
    const html = (text: string) => `<div id="extension-btn" class="watchIconWrap watchIconWrap_new">
      <span id="extension-text">${text}</span>
      <i id="extension-heartIcon" class="fa fa-heart" title="${text}"></i>
    </div>`;

    // Storageに課題キーが存在するか確認
    const isWatching = await hasStorageWatchItem(issueId);

    if (isWatching) {
      document.body.insertAdjacentHTML('beforeend', html(watchText.watching));
      const watchElement = document.querySelector<HTMLElement>('.watchIconWrap .fa-heart');
      if (watchElement === null) return;
      watchControl(watchElement, 'add');
    } else {
      document.body.insertAdjacentHTML('beforeend', html(watchText.notWatch));
    }
  };

  const issueItem = getIssueItem(issueCard);
  const issueId = issueItem.id;
  await createWatchButton(issueId);
  const watchBtnElement = document.querySelector('.watchIconWrap');
  if (watchBtnElement === null) return;
  const heartElement = document.querySelector<HTMLElement>('#extension-heartIcon');
  const textElement = document.querySelector<HTMLElement>('#extension-text');

  if (heartElement && textElement && issueId) {
    const items = { heartElement, textElement, issueId };
    await saveIssueWatching(items);
    watchBtnElement.addEventListener('click', () => changeWatchState(items));
  }
};
/** 課題ページでDOMが構築されるのを待つ */
const observeIssueCard = (callback: () => void) => {
  const rootElement = document.querySelector('#root');
  const hasIssueArea = () => document.querySelector('#issueArea') !== null;
  if (rootElement === null) return;

  const observer = new MutationObserver((_, observer: MutationObserver) => {
    if (!hasIssueArea()) return;
    observer.disconnect();
    callback();
  });

  if (hasIssueArea()) {
    callback();
  } else {
    observer.observe(rootElement, { childList: true, subtree: true });
  }
};

const exec = () => {
  if (backlogLocation.isHome) {
    createWatchHome();
  } else if (backlogLocation.isIssue) {
    observeIssueCard(() => createWatchIssue());
  }
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
