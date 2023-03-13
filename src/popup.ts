import type { Watchings } from '../@types/watch';
import { getWatchListFetchAPI } from './api';
import storageManager from './storage';

const createTag = (name: string, value: string | boolean, date?: Date) => {
  let addClass = '';
  if (date && new Date().getTime() > new Date(date).getTime()) {
    addClass = ' is-danger';
  }
  if (name === '未読/既読') {
    value = value ? '既読' : '未読';
  } else if (name === 'ステータス') {
    if (value === '処理中') {
      addClass = ' is-info';
    } else if (value === '処理済み') {
      addClass = ' is-success';
    } else if (value === '完了') {
      addClass = ' is-primary';
    }
  }
  return `<div class="control">
    <div class="tags has-addons">
      <span class="tag is-dark">${name}</span>
      <span class="tag is-light${addClass}">${value}</span>
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
  const hasResourceAlreadyRead = typeof watching.resourceAlreadyRead === 'boolean';

  return `<li class="watchList__li">
    <a href="https://${hostname}/view/${issue.issueKey}" class="watchList__li__a" target="_blank">
      <h2 class="watchList__li__title title is-6">[${issue.issueKey}] ${issue.summary}</h2>
      <p class="watchList__li__desc subtitle is-7">${issue.description}</p>
      <div class="field is-grouped is-grouped-multiline">
        ${issue.startDate ? createTag('開始日', dateConvert(issue.startDate)) : ''}
        ${issue.dueDate ? createTag('期限日', dateConvert(issue.dueDate), issue.dueDate) : ''}
        ${hasResourceAlreadyRead ? createTag('未読/既読', watching.resourceAlreadyRead) : ''}
        ${issue?.status?.name ? createTag('ステータス', issue.status.name) : ''}
        ${issue?.priority?.name ? createTag('優先度', issue.priority.name) : ''}
        ${issue?.assignee?.name ? createTag('担当', issue.assignee.name) : ''}
        ${issue?.createdUser?.name ? createTag('課題作成者', issue.createdUser.name) : ''}
        ${watching.lastContentUpdated ? createTag('最終更新日時', dateConvert(watching.lastContentUpdated)) : ''}
      </div>
    </a>
  </li>`;
};
const createHTMLFromAPI = async () => {
  const options = await storageManager.get('options');
  if (!options || !Object.keys(options).length) return [];
  const spaceNames = Object.keys(options.options.space);
  const htmlArray = [];

  for (const spaceName of spaceNames) {
    const hostname = options.options.space[spaceName].name;
    const watchList = await getWatchListFetchAPI(hostname);
    if (!watchList || !watchList.length) continue;
    let html = spaceNames.length > 1
      ? `<ul class="watchList" data-tab="${spaceName}">`
      : '<ul class="watchList">';
    for (const watching of watchList) {
      html += createHTML(watching, hostname);
    }
    html += '</ul>';
    htmlArray.push({ spaceName, html });
  }
  return htmlArray;
};
const createTabs = (htmlArray: { spaceName: string, html: string; }[]) => {
  return `<div class="tabs">
    <ul>
      ${htmlArray.map(({ spaceName }) => `<li data-tab="${spaceName}"><a><span>${spaceName}</span></a></li>`).join('')}
    </ul>
  </div>`;
};
const createNotWatchHTML = () => {
  return '<div class="notWatch">現在ウォッチしてる課題が無いか、オプションでスペース情報の入力がありません</div>';
};

const selectInitialActive = (htmlArray: { spaceName: string; html: string; }[]) => {
  const lists = document.querySelectorAll<HTMLUListElement>('.watchList');
  const tabs = document.querySelectorAll<HTMLLIElement>('.tabs li');
  const selectTab = (e: Event, tabs: NodeListOf<HTMLLIElement>, lists: NodeListOf<HTMLUListElement>) => {
    const self = e.currentTarget as HTMLElement;

    if (self.classList.contains('is-active')) {
      return;
    }
    const spaceName = self.getAttribute('data-tab');
    const list = [...lists].find((el) => el.getAttribute('data-tab') === spaceName);

    if (spaceName && list) {
      tabs.forEach((el) => el.classList.remove('is-active'));
      lists.forEach((el) => el.classList.remove('is-active'));
      self.classList.add('is-active');
      list.classList.add('is-active');
    }
  };
  const spaceName = htmlArray[0].spaceName;
  const list = [...lists].find((el) => el.getAttribute('data-tab') === spaceName);

  if (lists.length > 1 && tabs.length > 1) {
    const tab = [...tabs].find((el) => el.getAttribute('data-tab') === spaceName);
    list?.classList.add('is-active');
    tab?.classList.add('is-active');

    for (const tab of tabs) {
      tab.addEventListener('click', (e) => selectTab(e, tabs, lists));
    }
  } else if (lists.length === 1) {
    list?.classList.add('is-active');
  }
};
const setHTML = async () => {
  const appElm = document.querySelector('#app');
  if (!appElm) return;
  const htmlArray = await createHTMLFromAPI();

  if (htmlArray.length === 0) {
    appElm.insertAdjacentHTML('afterbegin', createNotWatchHTML());
  } else if (htmlArray.length === 1) {
    appElm.insertAdjacentHTML('afterbegin', htmlArray[0].html);
    selectInitialActive(htmlArray);
  } else if (htmlArray.length > 1) {
    const div = document.createElement('div');
    div.classList.add('watchListWrap');
    for (const data of htmlArray) {
      div.insertAdjacentHTML('afterbegin', data.html);
    }
    appElm.insertAdjacentElement('afterbegin', div);
    appElm.insertAdjacentHTML('afterbegin', createTabs(htmlArray));
    selectInitialActive(htmlArray);
  }
};

if (document.readyState !== 'loading') {
  void setHTML();
} else {
  document.addEventListener('DOMContentLoaded', () => void setHTML());
}
