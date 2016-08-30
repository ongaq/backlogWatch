var WATCH_ISSUE = null;

(($, WATCH_COMMON, WATCH_STORAGE) => {
	var spaceName = location.hostname.split('.')[0];

	WATCH_ISSUE = {
		createWatchIssue(){
			var limitedBytes = 100;
			var issueCard = $('#issuecard');
			var issueItem = {
				id: $(issueCard).find('.key > strong[data-bind]').text(),
				title: $(issueCard).find('h4.summary span[data-bind*="summary"]').text(),
				assigner: $('#issueProperties').find('td[data-bind*="assigner"]').text(),
				description: $('#issueDescription').text(),
				time: new Date()
			};
			if(issueItem.description.length > limitedBytes) {
				issueItem.description = `${issueItem.description.substr(0, limitedBytes)}...`;
			}

			if(issueCard.length > 0) {
				var isWatch = 'ウォッチ中';
				var notWatch = 'ウォッチリストに入れる';
				var html = (_text) => {
					return `<div class="watchIconWrap">
					<span>${_text}</span>
					<i class="fa fa-heart" title="${_text}"></i>
					</div>`;
				};

				// Storageに課題キーが存在するか確認
				var promise = WATCH_STORAGE.getItem(issueItem, 'issues', spaceName);
				promise.done((result) => {
					if(result) {
						$('body').append(html(isWatch));
						WATCH_COMMON.watchControl(document.querySelector('.fa-heart'), 'add');
					} else {
						$('body').append(html(notWatch));
					}
				}).fail(() => $('body').append(html(notWatch)));

				$('body').on('click', '.watchIconWrap', (e) => {
					var $this = $(e.currentTarget);
					var heart = e.currentTarget.querySelector('.fa-heart');

					if($this.find('.fa-heart').is('.is-watch')) {
						WATCH_COMMON.watchControl(heart, 'remove');
						WATCH_STORAGE.remove(issueItem, 'issues', spaceName);
						$('.watchIconWrap > span').text(notWatch);
					} else {
						WATCH_COMMON.watchControl(heart, 'add');
						WATCH_STORAGE.add(issueItem, 'issues', spaceName);
						$('.watchIconWrap > span').text(isWatch);
					}
				});
			}
		},
		createWatchHome: function(){
			// Storageに課題キーが存在するか確認
			var promise = WATCH_STORAGE.throwItem('issues', spaceName);
			promise.done((result) => {
				if(result.length) this.createWatchIssues(result);

				$('body').on('click', '.fa-heart', (e) => {
					var $this = $(e.currentTarget);
					var $tr = $this.parent().parent();
					var issueItem = {
						id: $tr.find('.Key').text().replace(/[\n\t\s]/g, '')
					};
					var speed = 500;

					if($this.is('.is-watch')) {
						WATCH_COMMON.watchControl(e.currentTarget, 'remove');
						WATCH_STORAGE.remove(issueItem, 'issues', spaceName);

						$tr.stop().animate({
							'opacity':'0'
						}, speed, () => $tr.remove());
					}
				});
				$('body').on('mouseenter', '.watch-issue-list', (e) => {
					$(e.currentTarget).addClass('is-hover');
				});
				$('body').on('mouseleave', '.watch-issue-list', (e) => {
					$(e.currentTarget).removeClass('is-hover');
				});
				$('body').on('mousedown', '.watch-issue-list', (e) => {
					var $this = $(e.currentTarget);
					var href = $this.find('.watch-issue-anchor').attr('href');

					if(e.target.tagName === 'A' || e.target.tagName === 'I') return;

					if(e.ctrlKey || e.which === 2) {
						window.open(href);
					} else if(e.which === 1) {
						location.href = href;
					}
				});
			}).fail((result) => {
				if(result === 'noItems') {
					console.warn('Not watch issues.');
				} else {
					console.error('issues failed', result);
				}
			});
		},
		createWatchIssues(_object){
			var resultLength = _object.length;
			var section, h1, icon, div,
				table, thead, theadTr, theadTh, theadThSpan,
				tbody, tbodyTr;
			var i;
			var tableCellTitle = ['キー', '件名', '担当者', '詳細', 'watch'];
			var tableCellLength = tableCellTitle.length;
			var fragment = document.createDocumentFragment();

			section = document.createElement('section');
			h1 = document.createElement('h1');
			icon = document.createElement('i');
			div = document.createElement('div');
			table = document.createElement('table');
			thead = document.createElement('thead');
			theadTr = document.createElement('tr');
			tbody = document.createElement('tbody');

			section.id = 'myIssues';
			section.classList.add('Board-item');
			section.setAttribute('data-id', 'projects-issues');
			h1.innerText = ' Watch Issues';
			icon.classList.add('fa', 'fa-eye');
			table.id = 'issueList';
			table.classList.add('watch-issue');
			table.setAttribute('cellspacing', '0');
			table.setAttribute('cellpadding', '0');
			table.setAttribute('border', '0');

			for(i=1; i <= tableCellLength; i++) {
				theadTh = document.createElement('th');
				theadThSpan = document.createElement('span');

				theadTh.classList.add('watch-issue-col-'+i);
				theadThSpan.innerText = tableCellTitle[i-1];
				theadTh.appendChild(theadThSpan);
				fragment.appendChild(theadTh);
			}
			theadTr.appendChild(fragment);
			thead.appendChild(theadTr);
			table.appendChild(thead);
			h1.insertBefore(icon, h1.childNodes[0]);

			var cut = 60; // カットする文字数
			fragment = document.createDocumentFragment();

			for(i=0; i < resultLength; i++) {
				var item = _object[i];
				var evenOdd = i % 2 ? 'odd' : 'even';
				createTR(item, evenOdd);
			}
			tbody.appendChild(fragment);
			table.appendChild(tbody);
			div.appendChild(table);
			section.appendChild(h1);
			section.appendChild(div);

			var projects = document.querySelector('#projects:not([data-id="projects-fav"])');
			return projects.parentNode.insertBefore(section, projects.nextSibling);

			function createTR(_item, _evenOdd){
				var itemChild = _item;
				var textTrim = itemChild.description.substr(0, cut);

				tbodyTr = document.createElement('tr');
				tbodyTr.classList.add('Issue', 'watch-issue-list', _evenOdd);
				tbodyTr.innerHTML = `
				<td class="Key">
					<p><a href="/view/${itemChild.id}" class="watch-issue-anchor" title="${itemChild.id}">
					${itemChild.id}</a></p>
				</td>
				<td class="Title"><p>${itemChild.title}</p></td>
				<td class="Assigner">${itemChild.assigner}</td>
				<td class="Description" title="${itemChild.description}"><p>${textTrim}...</p></td>
				<td class="Watch"><i class="fa fa-heart is-watch"></i></td>`;

				fragment.appendChild(tbodyTr);
			}
		},

		run: function(){
			WATCH_COMMON.position();

			if(WATCH_COMMON.location.issue) {
				this.createWatchIssue();
			}
			if(WATCH_COMMON.location.home) {
				this.createWatchHome();
			}
		}
	};

	$(() => WATCH_ISSUE.run());

})(window.jQuery, window.WATCH_COMMON, window.WATCH_STORAGE);
