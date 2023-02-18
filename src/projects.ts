import type { IssueItem } from '../@types/index';
import { spaceUrl, backlogLocation } from './common';
import storageManager from './storage';
const { subdomain } = spaceUrl;

const createStar = (issueItems: IssueItem[] | false) => {
  const project = document.querySelector('#project-list');
  const listItems = project?.querySelectorAll('.project-list__item') || [];

  for (const listItem of listItems) {
    const star = document.createElement('i');
    star.className = 'fa fa-star';

    if (issueItems) {
      const key = listItem.getElementsByTagName('a')[0].href.split('/').pop();

      for (const issueItem of issueItems) {
        if (key === issueItem.id) star.classList.add('is-watch');
      }
    }
    const linkElement = listItem.querySelector<HTMLAnchorElement>('.project-list__link');

    if (linkElement !== null) {
      const projectName = linkElement.href.split('/').pop();

      if (projectName) {
        listItem.setAttribute('data-id', projectName);
      }
      listItem.appendChild(star);
    }
  }
};
const createWatchProject = (_object, _bool) => {
  var projectsFav = document.querySelectorAll('[data-id="projects-fav"]');
  var obj = _object;
  var item = null;
  var section,
    html1 = '',
    html2 = '';

  if(projectsFav.length === 0) {
    section = document.createElement('section');
    section.classList.add('title-group', '_mg-b-10', 'see-all-wrapper');
    section.setAttribute('data-id', 'projects-fav');
    html1 += `
    <h3 class="title title--thirdly watch-title title-group__inline-title js_folding-handle">
      <span>
        ウォッチ中のプロジェクト
      </span>
    </h3>
    <ul class="project-list -list-view"></ul>`;
    section.innerHTML = html1;

    var primary = document.querySelector('.dashboard-contents__left');
    primary.insertBefore(section, primary.childNodes[0]);
  }
  projectsFav = document.querySelectorAll('[data-id="projects-fav"]');

  if(projectsFav.length > 0) {
    html2 = document.querySelector('[data-id="projects-fav"] .project-list').innerHTML;

    for(var i=0; i < (obj.length+1); i++) {
      if(i === obj.length) break;
      createProjectsList(i);
    }
    projectsFav[0].querySelector('.project-list').innerHTML = html2;
  }

  function createProjectsList(_i){
    item = _bool ? obj[_i] : obj[0];

    html2 += `
    <li class="project-list__item js-project-list-item watch-item theme-default" data-id="${item.id}">
      <div class="project-list__wrapper watch-item-wrapper">
        <span class="project-list__info">
          <a href="/projects/${item.id}">
            <span class="project-list__icon">
              <project-icon>
                <img src="${item.icon}" alt="${item.title}">
              </project-icon>
            </span>
            <span class="project-list__name-group">
              <span class="project-list__name">${item.title}</span>
              <span class="project-list__key">${item.id}</span>
            </span>
          </a>
        </span>
      </div>
      <a class="project-list__link" href="/projects/${item.id}"></a>
      <i class="fa fa-star is-watch"></i>
    </li>`;
  }
};
const createFavoriteProject = async () => {
  const timer = 250;
  // chrome.storageに課題キーが存在するか確認
  const issueItems = await storageManager.throwItem('projects');

  if (issueItems) {
    createStar(issueItems);
    createWatchProject(issueItems, true);
  } else {
    createStar(false);
  }

  // プロジェクト「すべて見る」をクリックするとDOMが生成され直すのでお気に入りボタンも生成し直す。
  document.body.addEventListener('click', (event) => {
    const target = <HTMLElement>event.target;
    const seeAllLink = target.closest('#project-list .see-all__link');

    if (seeAllLink) {
      setTimeout(() => createStar(issueItems), timer);
    }
  });

  // プロジェクトをお気に入りに追加/削除する。
  $('body').on('click', '.fa-star', (e) => {
    var $this = $(e.currentTarget);
    var $parent = $this.parent();
    var projectItem = [{
      id: $parent.find('a:first-of-type').attr('href').split('/').pop(),
      title: $parent.find('.project-list__name').text(),
      icon: $parent.find('.project-list__icon img').attr('src'),
    }];
    var target = projectItem[0];

    if($this.is('.is-watch')) {
      WATCH_COMMON.watchControl(e.currentTarget, 'remove');
      WATCH_STORAGE.remove(target, 'projects', subdomain);

      var speed = 300;
      $('[data-id="projects-fav"]').find(`[data-id="${target.id}"]`).stop().animate({
        'opacity':'0'
      }, speed, () => {
        $(`[data-id="${target.id}"]`).find('.fa-star').removeClass('is-watch').end()
        .remove();
      });
    } else {
      WATCH_COMMON.watchControl(e.currentTarget, 'add');
      WATCH_STORAGE.add(target, 'projects', subdomain);
      this.createWatchProject(projectItem, false);
    }
  });
};

window.addEventListener('DOMContentLoaded', () => {
  if (backlogLocation.isHome) {
    createFavoriteProject();
  }
});
