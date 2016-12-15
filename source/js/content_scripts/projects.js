var WATCH_PROJECTS;

(($, WATCH_DB, WATCH_COMMON, WATCH_STORAGE) => {
	var spaceName = location.hostname.split('.')[0];

	WATCH_PROJECTS = {
		createFavoriteProject(){
			var _this = this;
			var checkKey = null;
			var timer = 250;

			// chrome.storageに課題キーが存在するか確認
			var promise = WATCH_STORAGE.throwItem('projects', spaceName);
			promise.done((result) => {
				checkKey = result;

				_this.createStar(checkKey);
				_this.createWatchProject(checkKey, true);
			}).fail((result) => {
				_this.createStar();
				if(result === 'noItems') {
					console.warn('Not watch projects.');
				} else {
					console.error('projects failed', result);
				}
			});

			// プロジェクト「すべて見る」をクリックするとDOMが生成され直すのでお気に入りボタンも生成し直す。
			$('body').on('click', '#project-list .see-all__link', () => {
				setTimeout(() => {
					_this.createStar(checkKey);
				}, timer);
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
					WATCH_STORAGE.remove(target, 'projects', spaceName);

					var speed = 300;
					$('[data-id="projects-fav"]').find(`[data-id="${target.id}"]`).stop().animate({
						'opacity':'0'
					}, speed, () => {
						$(`[data-id="${target.id}"]`).find('.fa-star').removeClass('is-watch').end()
						.remove();
					});
				} else {
					WATCH_COMMON.watchControl(e.currentTarget, 'add');
					WATCH_STORAGE.add(target, 'projects', spaceName);
					this.createWatchProject(projectItem, false);
				}
			});
		},
		createStar(_object){
			var project = document.querySelector('#project-list');
			var li = project.querySelectorAll('.project-list__item');
			var liLength = li.length;
			var obj = _object;
			var star, key;

			for(var i=0; i < liLength; i++) {
				var item = li[i];
				star = document.createElement('i');
				star.className = 'fa fa-star';

				if(obj) {
					key = item.getElementsByTagName('a')[0].href.split('/').pop();

					for(var j=0; j < obj.length; j++) {
						if(key === obj[j].id) star.classList.add('is-watch');
					}
				}
				var projectName = item.querySelector('.project-list__link').getAttribute('href').split('/').pop();
				item.setAttribute('data-id', projectName);
				item.appendChild(star);
			}
		},
		createWatchProject(_object, _bool){
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
		},

		run: function(){
			WATCH_COMMON.position();

			if(WATCH_COMMON.location.home) {
				this.createFavoriteProject();
			}
		}
	};

	$(() => WATCH_PROJECTS.run());

})(window.jQuery, window.WATCH_DB, window.WATCH_COMMON, window.WATCH_STORAGE);
