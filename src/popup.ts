import type { Watchings } from '../@types/watch';
import type { Options } from '../@types/index';
import type { CreateTag, Tags } from '../@types/popup';
import type { PopupDB } from '../@types/storage';
import { getWatchListFetchAPI } from './api';
import storageManager from './storage';

const addNumberWatchesToClass = (watchCount: number) => {
  document.body.classList.remove('is-watch3');

  if (watchCount >= 3) {
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
      <h2 class="watchList__li__title" title="${issue.summary}">[${issue.issueKey}] ${issue.summary}</h2>
      <p class="watchList__li__desc" title="${issue.description}">${issue.description}</p>
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
const createHTMLFromAPI = async ({ space, spaceName }: { space: Options['options']['space'], spaceName?: string }) => {
  const spaceNames = Object.keys(space);
  let hostname = '';

  if (spaceName) {
    if (space[spaceName]?.name) {
      hostname = space[spaceName].name;
    } else {
      const popupDB: PopupDB = {
        'popup': {
          'selectedSpace': undefined,
        }
      };
      await storageManager.set(popupDB);
      hostname = space[spaceNames[0]].name;
      spaceName ??= spaceNames[0];
    }
  } else {
    hostname = space[spaceNames[0]].name;
    spaceName ??= spaceNames[0];
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
const createDropdown = async (htmlArray: string[]) => {
  const popup = await storageManager.get('popup');
  let initSpaceName = htmlArray[0];
  if (popup && Object.keys(popup).length && popup.popup?.selectedSpace) {
    initSpaceName = popup.popup.selectedSpace;
  }

  return `<div id="dropdown" class="dropdown">
    <div class="dropdown-trigger">
      <button class="button" aria-haspopup="true" aria-controls="dropdown-menu">
        <span id="dropdown-name">${initSpaceName}</span>
        <span class="icon is-small">
          <i class="fas fa-angle-down" aria-hidden="true"></i>
        </span>
      </button>
    </div>
    <div class="dropdown-menu" id="dropdown-menu" role="menu">
      <div class="dropdown-content">
        ${htmlArray.map((spaceName) => `<a href="#" class="dropdown-item${spaceName===initSpaceName?' is-active':''}" data-dropdown="${spaceName}">
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
      const notWatchElm = document.querySelector('.notWatch');
      watchListElm?.remove();
      notWatchElm?.remove();
      const data = await createHTMLFromAPI({ space, spaceName });

      if (data) {
        const nameElm = document.querySelector('#dropdown-name');
        if (!nameElm) return;
        addNumberWatchesToClass(data.watchCount);
        nameElm.textContent = spaceName;
        wrapperElm.insertAdjacentHTML('beforeend', data.html);
        const newWatchListElm = document.querySelector('.watchList');

        if (newWatchListElm) {
          removeActiveClass();
          self.classList.add('is-active');
        }
        const popupDB: PopupDB = {
          'popup': {
            'selectedSpace': spaceName,
          }
        };
        await storageManager.set(popupDB);
      } else {
        removeActiveClass();
        self.classList.add('is-active');
        wrapperElm.insertAdjacentHTML('beforeend', createNotWatchHTML());
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
const createNotWatchHTML = () => {
  const falsyText = '現在ウォッチしてる課題が無いか、<a href="options.html" target="_blank">オプション</a>でスペース情報の入力がありません';
  return `<div class="notWatch">${falsyText}</div>`;
};
const setHTML = async () => {
  const headerElm = document.querySelector('.header');
  const wrapperElm = document.querySelector('#wrapper');
  const [options, popup] = await Promise.all([storageManager.get('options'), storageManager.get('popup')]);
  if (!wrapperElm || !headerElm) return;
  if (!options || !Object.keys(options).length) {
    wrapperElm.insertAdjacentHTML('beforeend', createNotWatchHTML());
    return;
  }
  const space = options['options']['space'];
  const spaceNames = Object.keys(space);
  const spaceName = (() => {
    if (popup && Object.keys(popup).length && popup.popup?.selectedSpace) {
      return popup.popup.selectedSpace;
    }
    return;
  })();
  const data = await createHTMLFromAPI({ space, spaceName });

  if (spaceNames.length >= 2) {
    const dropdownHTML = await createDropdown(spaceNames);
    headerElm.insertAdjacentHTML('beforeend', dropdownHTML);
    document.body.classList.add('has-dropdown');
    setDropdownEvents();
  }
  if (data) {
    addNumberWatchesToClass(data.watchCount);
    wrapperElm.insertAdjacentHTML('beforeend', data.html);
  } else {
    wrapperElm.insertAdjacentHTML('beforeend', createNotWatchHTML());
  }
};

if (document.readyState !== 'loading') {
  void setHTML();
} else {
  document.addEventListener('DOMContentLoaded', () => void setHTML());
}
