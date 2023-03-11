import type { Watchings } from '../@types/watch';
import { getWatchListFetchAPI } from './api';
import storageManager from './storage';

const createTag = (name: string, value: string) => {
  return `<div class="control">
    <div class="tags has-addons">
      <span class="tag is-dark">${name}</span>
      <span class="tag is-light">${value}</span>
    </div>
  </div>`;
};
const dateConvert = (date: Date) => {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}年${mm}月${dd}日`;
};
const createHTML = (watching: Watchings, hostname: string) => {
  const issue = watching.issue;

  return `<li class="watchList__li">
    <a href="https://${hostname}/view/${issue.issueKey}" class="watchList__li__a" target="_blank">
      <h2 class="title is-6">[${issue.issueKey}] ${issue.summary}</h2>
      <p class="watchList__li__desc subtitle is-7">${issue.description}</p>
      <div class="field is-grouped is-grouped-multiline">
        ${issue.startDate ? createTag('開始日', dateConvert(issue.startDate)) : ''}
        ${issue.dueDate ? createTag('期限日', dateConvert(issue.dueDate)) : ''}
        ${issue?.priority?.name ? createTag('優先度', issue.priority.name) : ''}
        ${issue?.status?.name ? createTag('ステータス', issue.status.name) : ''}
        ${issue?.assignee?.name ? createTag('担当', issue.assignee.name) : ''}
        ${issue?.createdUser?.name ? createTag('課題作成者', issue.createdUser.name) : ''}
        ${watching.lastContentUpdated ? createTag('最終更新日時', dateConvert(watching.lastContentUpdated)) : ''}
      </div>
    </a>
  </li>`;
};
const createHTMLFromAPI = async () => {
  const options = await storageManager.get('options');
  if (!options) return [];
  const spaceNames = Object.keys(options.options.space);
  const htmlArray = [];

  for (const spaceName of spaceNames) {
    const hostname = options.options.space[spaceName].name;
    const watchList = await getWatchListFetchAPI(hostname);
    if (!watchList) continue;
    let html = spaceNames.length > 1
      ? `<ul class="watchList is-hidden" data-tab="${spaceName}">`
      : '<ul class="watchList">';
    for (const watching of watchList) {
      html += createHTML(watching, hostname);
    }
    html += '</ul>';
    if (html) {
      htmlArray.push({ spaceName, html });
    }
  }
  return htmlArray;
};
const createTabs = (htmlArray: { spaceName: string, html: string; }[]) => {
  return `<div class="tabs is-toggle">
    <ul>
      ${htmlArray.map(({ spaceName }) => `<li data-tab="${spaceName}"><span>${spaceName}</span></li>`)}
    </ul>
  </div>`;
};
const setHTML = async () => {
  const appElm = document.querySelector('#app');
  if (!appElm) return;
  const htmlArray = await createHTMLFromAPI();

  if (htmlArray.length === 1) {
    appElm.insertAdjacentHTML('afterbegin', htmlArray[0].html);
  } else if (htmlArray.length > 1) {
    for (const data of htmlArray) {
      appElm.insertAdjacentHTML('afterbegin', data.html);
    }
    appElm.insertAdjacentHTML('afterbegin', createTabs(htmlArray));
  }
};

if (document.readyState !== 'loading') {
  void setHTML();
} else {
  document.addEventListener('DOMContentLoaded', () => void setHTML());
}
