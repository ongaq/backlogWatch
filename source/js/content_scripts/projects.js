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
			$('body').on('click', '#bottom-bar-project a', () => {
				var target = document.querySelector('#bottom-bar-project a');
				var config = { childList: true, characterData: true };
				var observer = new MutationObserver((mutations) => {
					mutations.forEach((mutation) => {
						var text = mutation.target.textContent;
						if(text === 'すべて見る' || text === '戻す') {
							setStar();
						}
					});
				});
				observer.observe(target, config);

				function setStar(){
					return setTimeout(() => {
						_this.createStar(checkKey);
						observer.disconnect();
					}, timer);
				}
			});
			// プロジェクトをお気に入りに追加/削除する。
			$('body').on('click', '.fa-star', (e) => {
				var $this = $(e.currentTarget);
				var $parent = $this.parent();
				var projectItem = [{
					id: $parent.find('a:first-of-type').attr('href').split('/').pop(),
					title: $parent.find('.Project-name').text(),
					icon: $parent.find('.Project-icon img').attr('src'),
				}];
				var target = projectItem[0];

				if($this.is('.is-watch')) {
					WATCH_COMMON.watchControl(e.currentTarget, 'remove');
					WATCH_STORAGE.remove(target, 'projects', spaceName);

					var speed = 500;
					$('[data-id="projects-fav"]').find(`[data-id="${target.id}"]`).stop().animate({
						'opacity':'0'
					}, speed, (ev) => {
						$(`[data-id="${target.id}"]`).find('.fa-star').removeClass('is-watch');
						$(ev.currentTarget).remove();
					});
				} else {
					WATCH_COMMON.watchControl(e.currentTarget, 'add');
					WATCH_STORAGE.add(target, 'projects', spaceName);
					this.createWatchProject(projectItem, false);
				}
			});
		},
		createStar(_object){
			var project = document.querySelector('#form-filter-project + #projectList');
			var li = project.querySelectorAll('.Project');
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
				var projectName = item.querySelector('a').getAttribute('href').split('/').pop();
				item.setAttribute('data-id', projectName);
				item.appendChild(star);
			}
		},
		createWatchProject(_object, _bool){
			var projectsFav = document.querySelectorAll('[data-id="projects-fav"]');
			var obj = _object;
			var item = null;
			var section, h1, icon, ul, li, a, span, img, fragment;

			if(projectsFav.length === 0) {
				section = document.createElement('section');
				h1 = document.createElement('h1');
				icon = document.createElement('i');
				ul = document.createElement('ul');

				section.id = 'projects';
				section.classList.add('Board-item');
				section.setAttribute('data-id', 'projects-fav');
				h1.innerText = ' Watch Project';
				icon.classList.add('fa', 'fa-eye');
				ul.id = 'projectList';

				h1.insertBefore(icon, h1.childNodes[0]);
				section.appendChild(h1);
				section.appendChild(ul);

				var primary = document.querySelector('.Board.Primary');
				primary.insertBefore(section, primary.childNodes[0]);
			}
			projectsFav = document.querySelectorAll('[data-id="projects-fav"]');

			if(projectsFav.length > 0) {
				fragment = document.createDocumentFragment();

				for(var i=0; i < (obj.length+1); i++) {
					if(i === obj.length) break;
					createProjectsList(i);
				}
				projectsFav[0].querySelector('#projectList').appendChild(fragment);
			}

			function createProjectsList(_i){
				item = _bool ? obj[_i] : obj[0];

				li = document.createElement('li');
				a = document.createElement('a');
				span = {
					icon: document.createElement('span'),
					name: document.createElement('span')
				};
				img = document.createElement('img');
				icon = document.createElement('i');

				li.classList.add('Project');
				li.setAttribute('data-id', item.id);
				a.href = '/projects/'+item.id;
				span.icon.classList.add('Project-icon');
				span.name.classList.add('Project-name');
				span.name.innerText = item.title;
				img.src = item.icon;
				img.alt = item.title;
				img.style.height = '25px';
				icon.classList.add('fa', 'fa-star', 'is-watch');
				span.icon.appendChild(img);
				a.appendChild(span.icon);
				a.appendChild(span.name);
				li.appendChild(a);
				li.appendChild(icon);
				fragment.appendChild(li);
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
