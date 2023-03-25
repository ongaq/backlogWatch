import type { Watchings } from '../@types/watch';
import type { Options } from '../@types/index';
import type { CreateTag, Tags } from '../@types/popup';
import { getWatchListFetchAPI } from './api';
import storageManager from './storage';

const createPeople = (name: string, value: string) => {
  return `<li class="people">
    <span class="people__text">${name}</span>
    <span class="people__name">${value}</span>
  </li>`;
};
const createTag = ({ name, value, grow, date }: CreateTag) => {
  let addClass = '';
  let dateClass = '';
  if (date && new Date().getTime() > new Date(date).getTime()) {
    addClass = ' -danger';
  }
  if (name === '未読/既読') {
    value = value ? '既読' : '未読';
  } else if (name === 'ステータス') {
    if (value === '処理中') {
      addClass = ' -info';
    } else if (value === '開発中') {
      addClass = ' -link';
    } else if (value === '処理済み') {
      addClass = ' -primary';
    } else if (value === '完了') {
      addClass = ' -success';
    }
  } else if (name === '最終更新日時' || name === '開始日' || name === '期限日') {
    dateClass = ' is-date';
  }
  return `<li class="tag${grow}${dateClass}">
    <span class="tag__text">${name}</span>
    <span class="tag__state${addClass}">${value}</span>
  </li>`;
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
  const tags: Tags = {
    'ステータス': issue?.status?.name,
    '未読/既読': hasResourceAlreadyRead,
    '優先度': issue?.priority?.name,
    '最終更新日時': watching.lastContentUpdated,
    '開始日': issue.startDate,
    '期限日': issue.dueDate,
  };
  const tagEntries = Object.entries(tags);
  const definedTags = tagEntries.filter(([_, value]) => value);
  const grow = definedTags.length > 5 ? ' is-grow' : '';

  return `<li class="watchList__li">
    <a href="https://${hostname}/view/${issue.issueKey}" class="watchList__li__a" target="_blank">
      <h2 class="watchList__li__title">[${issue.issueKey}] ${issue.summary}</h2>
      <p class="watchList__li__desc">${issue.description}</p>
      <ul class="tags">
        ${issue?.status?.name ? createTag({ name: 'ステータス', value: issue.status.name, grow }) : ''}
        ${hasResourceAlreadyRead ? createTag({ name: '未読/既読', value: watching.resourceAlreadyRead, grow }) : ''}
        ${issue?.priority?.name ? createTag({ name: '優先度', value: issue.priority.name, grow }) : ''}
        ${watching.lastContentUpdated ? createTag({ name: '最終更新日時', value: dateConvert(watching.lastContentUpdated), grow }) : ''}
        ${issue.startDate ? createTag({ name: '開始日', value: dateConvert(issue.startDate), grow }) : ''}
        ${issue.dueDate ? createTag({ name: '期限日', value: dateConvert(issue.dueDate), date: issue.dueDate, grow }) : ''}
      </ul>
      <ul class="peoples">
        ${issue?.createdUser?.name ? createPeople('課題作成者', issue.createdUser.name) : ''}
        ${issue?.assignee?.name ? createPeople('担当', issue.assignee.name) : ''}
      </ul>
    </a>
  </li>`;
};
const createHTMLFromAPI = async ({ space, init, spaceName }: { space: Options['options']['space'], init: boolean; spaceName?: string }) => {
  const spaceNames = Object.keys(space);
  let hostname = '';

  if (init) {
    hostname = space[spaceNames[0]].name;
    spaceName ??= spaceNames[0];
  } else if (spaceName) {
    hostname = space[spaceName].name;
  }
  if (hostname === '') return false;

  const watchList = await getWatchListFetchAPI(hostname);
  if (!watchList || !watchList.length) return false;

  let html = `<ul class="watchList" data-tab="${spaceName}">`;
  for (const watching of watchList) {
    html += createHTML(watching, hostname);
  }
  html += '</ul>';
  return { spaceName, html };
};
const createTabs = (htmlArray: string[]) => {
  return `<div class="tabs">
    <div class="tabs__wrapper">
      ${htmlArray.map((spaceName) => `<button type="button" data-tab="${spaceName}"><span>${spaceName}</span></button>`).join('')}
    </div>
  </div>`;
};
const createNotWatchHTML = ({ init }: { init: boolean }) => {
  const initFalsyText = '現在ウォッチしてる課題が無いか、オプションでスペース情報の入力がありません';
  const falsyText = 'データの取得に失敗しました';
  return `<div class="notWatch">${init ? initFalsyText : falsyText}</div>`;
};
const selectInitialActive = async (spaceNames: string[]) => {
  const wrapperElm = document.querySelector('#wrapper');
  const options = await storageManager.get('options');
  if (!wrapperElm || !options || !Object.keys(options).length) return;
  const lists = document.querySelectorAll<HTMLUListElement>('.watchList');
  const tabs = document.querySelectorAll<HTMLButtonElement>('.tabs button');
  const selectTab = async (e: Event, tabs: NodeListOf<HTMLButtonElement>, lists: NodeListOf<HTMLUListElement>) => {
    const removeActiveClass = () => {
      tabs.forEach((el) => el.classList.remove('is-active'));
      lists.forEach((el) => el.classList.remove('is-active'));
    };
    const self = e.currentTarget as HTMLElement;
    if (self.classList.contains('is-active')) {
      return;
    }
    const spaceName = self.getAttribute('data-tab');
    const currentWatchListElm = document.querySelector('.watchList');
    if (!spaceName) return;
    currentWatchListElm?.remove();
    const space = options['options']['space'];
    const data = await createHTMLFromAPI({ space, spaceName, init: false });

    if (data) {
      wrapperElm.insertAdjacentHTML('beforeend', data.html);
      const newWatchListElm = document.querySelector('.watchList');

      if (newWatchListElm) {
        removeActiveClass();
        self.classList.add('is-active');
        newWatchListElm.classList.add('is-active');
      }
    } else {
      removeActiveClass();
      self.classList.add('is-active');
      wrapperElm.insertAdjacentHTML('beforeend', createNotWatchHTML({ init: false }));
    }
  };
  const spaceName = spaceNames[0];
  const list = [...lists].find((el) => el.getAttribute('data-tab') === spaceName);

  if (tabs.length > 1) {
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
  const wrapperElm = document.querySelector('#wrapper');
  const options = await storageManager.get('options');
  if (!wrapperElm || !options || !Object.keys(options).length) return;
  const space = options['options']['space'];
  const data = await createHTMLFromAPI({ space, init: true });

  if (data) {
    const spaceNames = Object.keys(space);
    if (spaceNames.length > 1) {
      wrapperElm.insertAdjacentHTML('beforeend', createTabs(spaceNames));
    }
    wrapperElm.insertAdjacentHTML('beforeend', data.html);
    selectInitialActive(spaceNames);
  } else {
    wrapperElm.insertAdjacentHTML('beforeend', createNotWatchHTML({ init: true }));
  }
};

if (document.readyState !== 'loading') {
  void setHTML();
} else {
  document.addEventListener('DOMContentLoaded', () => void setHTML());
}
