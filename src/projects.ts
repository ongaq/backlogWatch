import type { IssueItem } from '../@types/index';
import type { ProjectItem } from '../@types/projects';
import { spaceUrl, backlogLocation, watchControl } from './common';
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
const createWatchProject = (projectItem: ProjectItem[], isInit: boolean) => {
  const getProjectsFavElm = () => document.querySelector<HTMLElement>('[data-id="projects-fav"]');
  const createProjectsList = (index: number) => {
    const item = isInit ? projectItem[index] : projectItem[0];
    return `<li class="project-list__item js-project-list-item watch-item theme-default" data-id="${item.id}">
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

  if (!getProjectsFavElm()) {
    const html = `<section data-id="projects-fav" class="title-group _mg-b-10 see-all-wrapper">
      <h3 class="title title--thirdly watch-title title-group__inline-title js_folding-handle">
        <span>ウォッチ中のプロジェクト</span>
      </h3>
      <ul class="project-list -list-view"></ul>
    </section>`;

    const primary = document.querySelector('.dashboard-contents__left');
    primary?.insertAdjacentHTML('afterbegin', html);
  }
  const projectsFavElm = getProjectsFavElm();

  if (projectsFavElm) {
    let html = document.querySelector('[data-id="projects-fav"] .project-list')?.innerHTML || '';

    for(var i=0; i < (projectItem.length+1); i++) {
      if (i === projectItem.length) break;
      html += createProjectsList(i);
    }
    const projectListElm = projectsFavElm.querySelector<HTMLElement>('.project-list');

    if (projectListElm) {
      projectListElm.innerHTML = html;
    }
  }
};
const createFavoriteProject = async () => {
  const timer = 250;
  // chrome.storageに課題キーが存在するか確認
  const issueItems = await storageManager.throwItem('projects');
  const favStarAnimation = (projectItemId: string) => {
    const speed = 300;
    const projectFav = document.querySelector('[data-id="projects-fav"]');
    const projectItemElm = document.querySelector<HTMLElement>(`[data-id="${projectItemId}"]`);

    if (projectItemElm) {
      projectItemElm.style.transition = `opacity ${speed}ms`;
      projectItemElm.style.opacity = '0';

      setTimeout(() => {
        const faStar = projectItemElm.querySelector('.fa-star');
        faStar?.classList.remove('is-watch');
        projectFav?.removeChild(projectItemElm);
      }, speed);
    }
  };

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
  document.body.addEventListener('click', async (event) => {
    const target = <HTMLElement>event.target;
    const starElm = target.closest('.fa-star');
    const self = <HTMLElement>event.currentTarget;
    const parent = self.parentElement;
    if (!starElm || !parent) return;

    const projectItem: ProjectItem = {
      id: parent.querySelector<HTMLAnchorElement>('a:first-of-type')?.href.split('/').pop() || '',
      title: parent.querySelector('.project-list__name')?.textContent || '',
      icon: parent.querySelector<HTMLImageElement>('.project-list__icon img')?.src || '',
    };

    if (self.classList.contains('is-watch')) {
      watchControl(self, 'remove');
      void storageManager.remove(projectItem.id, 'projects');
      favStarAnimation(projectItem.id);
    } else {
      watchControl(self, 'add');
      await storageManager.add(target, 'projects');
      createWatchProject([projectItem], false);
    }
  });
};

window.addEventListener('DOMContentLoaded', () => {
  if (backlogLocation.isHome) {
    createFavoriteProject();
  }
});
