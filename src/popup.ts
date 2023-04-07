import type { Watchings } from '../@types/watch';
import type { Options } from '../@types/index';
import type { CreateTag, Tags } from '../@types/popup';
import { getWatchListFetchAPI } from './api';
import storageManager from './storage';

const addNumberWatchesToClass = (watchCount: number) => {
  document.body.removeAttribute('class');

  if (watchCount < 3) {
    document.body.classList.add(`is-watch${watchCount}`);
  } else {
    document.body.classList.add('is-watch3');
  }
};
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
  return `<li class="watchTag${grow}${dateClass}">
    <span class="watchTag__text">${name}</span>
    <span class="watchTag__state${addClass}">${value}</span>
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
      <ul class="watchTags">
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

  let html = `<ul class="watchList is-active" data-dropdown="${spaceName}">`;
  for (const watching of watchList) {
    html += createHTML(watching, hostname);
  }
  html += '</ul>';
  return { spaceName, html, watchCount: watchList.length };
};
const createDropdown = (htmlArray: string[]) => {
  return `<div id="dropdown" class="dropdown">
    <div class="dropdown-trigger">
      <button class="button" aria-haspopup="true" aria-controls="dropdown-menu">
        <span>${htmlArray[0]}</span>
        <span class="icon is-small">
          <i class="fas fa-angle-down" aria-hidden="true"></i>
        </span>
      </button>
    </div>
    <div class="dropdown-menu" id="dropdown-menu" role="menu">
      <div class="dropdown-content">
        ${htmlArray.map((spaceName, idx) => `<a href="#" class="dropdown-item${idx===0?' is-active':''}" data-dropdown="${spaceName}">
          ${spaceName}
        </a>`).join('')}
      </div>
    </div>
  </div>`;
};
const setDropdownEvents = async () => {
  const options = await storageManager.get('options');
  const wrapperElm = document.querySelector('#wrapper');
  const dropdownElm = document.querySelector('#dropdown');
  const linkElms = document.querySelectorAll('#dropdown-menu a');
  const triggerElm = document.querySelector('.dropdown-trigger');

  if (!linkElms || !wrapperElm || !triggerElm || !options || !Object.keys(options).length) {
    dropdownElm?.remove();
    return;
  }
  if (!dropdownElm) return;
  const space = options['options']['space'];
  const removeActiveClass = () => {
    linkElms.forEach((el) => el.classList.remove('is-active'));
  };
  const clickEvent = (e: Event) => {
    e.preventDefault();
    const self = e.currentTarget as HTMLElement;
    const spaceName = self.getAttribute('data-dropdown');
    const isSelfClick = self.classList.contains('is-active');

    if (!spaceName || isSelfClick) return;

    (async() => {
      const watchListElm = document.querySelector('.watchList');
      watchListElm?.remove();
      const data = await createHTMLFromAPI({ space, spaceName, init: false });

      if (data) {
        addNumberWatchesToClass(data.watchCount);
        wrapperElm.insertAdjacentHTML('beforeend', data.html);
        const newWatchListElm = document.querySelector('.watchList');

        if (newWatchListElm) {
          removeActiveClass();
          self.classList.add('is-active');
        }
      } else {
        removeActiveClass();
        self.classList.add('is-active');
        wrapperElm.insertAdjacentHTML('beforeend', createNotWatchHTML({ init: false }));
      }
    })();
  };
  const toggleDropdownEvent = (e: Event) => {
    e.stopPropagation();
    const classList = dropdownElm.classList;
    const toggleEvent = () => {
      if (classList.contains('is-active')) {
        classList.remove('is-active');
      } else {
        classList.add('is-active');
      }
      document.body.removeEventListener('click', toggleEvent);
    };
    toggleEvent();
    document.body.addEventListener('click', toggleEvent);
  };

  triggerElm.addEventListener('click', toggleDropdownEvent);
  linkElms.forEach((el) => el.addEventListener('click', (e) => clickEvent(e)));
};
const createNotWatchHTML = ({ init }: { init: boolean }) => {
  const initFalsyText = '現在ウォッチしてる課題が無いか、<a href="options.html" target="_blank">オプション</a>でスペース情報の入力がありません';
  const falsyText = 'データの取得に失敗しました';
  return `<div class="notWatch">${init ? initFalsyText : falsyText}</div>`;
};
const setHTML = async () => {
  const headerElm = document.querySelector('.header');
  const wrapperElm = document.querySelector('#wrapper');
  const options = await storageManager.get('options');
  if (!wrapperElm || !headerElm) return;
  if (!options || !Object.keys(options).length) {
    wrapperElm.insertAdjacentHTML('beforeend', createNotWatchHTML({ init: true }));
    return;
  }
  const space = options['options']['space'];
  const data = await createHTMLFromAPI({ space, init: true });

  if (data) {
    const spaceNames = Object.keys(space);
    if (spaceNames.length >= 2) {
      headerElm.insertAdjacentHTML('beforeend', createDropdown(spaceNames));
      setDropdownEvents();
    }
    addNumberWatchesToClass(data.watchCount);
    wrapperElm.insertAdjacentHTML('beforeend', data.html);
  } else {
    wrapperElm.insertAdjacentHTML('beforeend', createNotWatchHTML({ init: true }));
  }
};

if (document.readyState !== 'loading') {
  void setHTML();
} else {
  document.addEventListener('DOMContentLoaded', () => void setHTML());
}
