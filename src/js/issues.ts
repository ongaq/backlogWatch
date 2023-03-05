import type { IssueItem } from '../../@types/index';
import { spaceUrl, backlogLocation, locationObserver, watchControl, consoleLog } from './common.js';
import storageManager from './storage.js';

const createHTML = (issues: IssueItem[]) => {
  const tableClass = 'watch-issue watch-issue_new data-table data-table--default my-issues-table';
  const createTR = (data: IssueItem, evenOdd: string) => {
    if (!data.id || !data.title || !data.assigner || !data.description) {
      return '';
    }
    return `<tr class="Issue watch-issue-list watch-issue-list_new ${evenOdd}">
      <td class="Key">
        <p><a href="/view/${data.id}" class="watch-issue-anchor" title="${data.id}">${data.id}</a></p>
      </td>
      <td class="Title"><p>${data.title}</p></td>
      <td class="Assigner">${data.assigner}</td>
      <td class="Description" title="aaaa"><p>${data.description.slice(0, 60)}...</p></td>
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
  for (let i=0; i < issues.length; i++) {
    const evenOdd = i % 2 ? 'odd' : 'even';
    tr += createTR(issues[i], evenOdd);
  }
  return html(tr);
};
const createHomeTheIssueUnderWatch = (issues: IssueItem[]) => {
  const html = createHTML(issues);
  const projects = document.querySelector<HTMLElement>('#project-list:not([data-id="projects-fav"])');

  if (projects !== null) {
    projects.insertAdjacentHTML('beforebegin', html);
  }
};
const createWatchHome = async () => {
  const spaceInfo = spaceUrl;
  if (!spaceInfo) return;
  const subdomain = spaceInfo.subdomain;

  // Storageに課題キーが存在するか確認
  const result = await storageManager.throwItem(subdomain, 'issues');
  if (result === false) return;
  if (result.length) {
    createHomeTheIssueUnderWatch(result);
  }
  const watchingElements = document.querySelectorAll<HTMLElement>('.watch-issue .fa-heart');
  const watchRemoveHandler = async (event: MouseEvent) => {
    const self = <HTMLElement>event.currentTarget;
    const trElement = self.closest('tr');
    if (trElement === null) return;
    const issueItem = {
      id: trElement.querySelector('.Key')?.textContent?.replace(/[\n\t\s]/g, '') || '',
    };
    const speed = 500;

    if (self.classList.contains('is-watch')) {
      watchControl(self, 'remove');
      await storageManager.remove(subdomain, issueItem.id, 'issues');
      trElement.style.opacity = '0';
      setTimeout(() => trElement.remove(), speed);
    }
  };
  for (const watchingElement of watchingElements) {
    watchingElement.addEventListener('click', (event) => void watchRemoveHandler(event));
  }

  const watchIssueElements = document.querySelectorAll<HTMLElement>('.watch-issue-list');
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

    if (typeof href === 'undefined') return;

    if (e.ctrlKey || e.button === 2) {
      window.open(href);
    } else if (e.button === 0) {
      location.href = href;
    }
  };
  for (const watchIssueElement of watchIssueElements) {
    watchIssueElement.addEventListener('mouseenter', mouseEnterHandler);
    watchIssueElement.addEventListener('mouseleave', mouseLeaveHandler);
    watchIssueElement.addEventListener('mousedown', mouseDownHandler);
  }
};
/** 課題ページでウォッチボタンの作成 */
const createWatchIssue = async () => {
  const spaceInfo = spaceUrl;
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
  const changeWatchState = async (event: Event, issueItem: IssueItem) => {
    const self = <HTMLElement>event.currentTarget;
    const isWatching = await storageManager.hasIssue(subdomain, issueItem.id, 'issues');
    const heartElement = self.querySelector<HTMLElement>('.fa-heart');
    const textElement = self.querySelector<HTMLElement>('span');

    if (!textElement || !heartElement) {
      return consoleLog('ウォッチ状態変更の失敗');
    }
    if (isWatching) {
      watchControl(heartElement, 'remove');
      void storageManager.remove(subdomain, issueItem.id, 'issues');
      textElement.textContent = watchText.notWatch;
    } else {
      const limitedBytes = 100;
      const description = issueItem.description || '';
      if ([...description].length > limitedBytes) {
        issueItem.description = `${description.slice(0, limitedBytes)}...`;
      }
      watchControl(heartElement, 'add');
      void storageManager.add(subdomain, issueItem, 'issues');
      textElement.textContent = watchText.watching;
    }
  };
  const createWatchButton = async (issueItemId: string) => {
    const watchIconWrap = document.querySelector('.watchIconWrap');
    if (watchIconWrap) {
      watchIconWrap.remove();
    }
    const html = (text: string) => `<div class="watchIconWrap watchIconWrap_new">
      <span>${text}</span>
      <i class="fa fa-heart" title="${text}"></i>
    </div>`;

    // Storageに課題キーが存在するか確認
    const isWatching = await storageManager.hasIssue(subdomain, issueItemId, 'issues');

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
  await createWatchButton(issueItem.id);
  const watchBtnElement = document.querySelector('.watchIconWrap');
  if (watchBtnElement === null) return;
  watchBtnElement.addEventListener('click', (e) => changeWatchState(e, issueItem));
};
const observeIssueCard = (callback: Function) => {
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

document.addEventListener('DOMContentLoaded', () => {
  exec();
  locationObserver(exec);
});
