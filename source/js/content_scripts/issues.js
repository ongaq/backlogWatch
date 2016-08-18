var WATCH_ISSUE = null;

(($, WATCH_COMMON, WATCH_STORAGE, WATCH_NOTICE) => {
	WATCH_ISSUE = {
		createWatchIssue(){
			var issueCard = $('#issuecard');
			var issueItem = {
				id: $(issueCard).find('.key > strong[data-bind]').text(),
				title: $(issueCard).find('h4.summary span[data-bind*="summary"]').text(),
				assigner: $('#issueProperties').find('td[data-bind*="assigner"]').text(),
				description: $('#issueDescription').text(),
				time: new Date()
			};

			if(issueCard.length > 0) {
				$(issueCard).find('.desc').append('<i class="fa fa-heart" title="watchリストに入れる"></i>');

				// Storageに課題キーが存在するか確認
				var promise = WATCH_STORAGE.getItem(issueItem, 'issues');
				promise.done((result) => {
					console.log('createWatchIssue:', result);
					if(result) WATCH_COMMON.watchControl(document.querySelector('.fa-heart'), 'add');
				});

				$('body').on('click', '.fa-heart', (e) => {
					var $this = $(e.currentTarget);

					if($this.is('.is-watch')) {
						WATCH_COMMON.watchControl(e.currentTarget, 'remove');
						WATCH_STORAGE.remove(issueItem, 'issues');
					} else {
						WATCH_COMMON.watchControl(e.currentTarget, 'add');
						WATCH_STORAGE.add(issueItem, 'issues');
					}
				});
			}
		},
		createWatchHome: function(){
			// Storageに課題キーが存在するか確認
			var promise = WATCH_STORAGE.throwItem('issues');
			promise.done((result) => {
				console.log(result);
				this.createWatchIssues(result);

				$('body').on('click', '.fa-heart', (e) => {
					var $this = $(e.currentTarget);
					var $tr = $this.parent().parent();
					var issueItem = {
						id: $tr.find('.Key').text().replace(/[\n\t\s]/g, '')
					};
					var speed = 500;

					if($this.is('.is-watch')) {
						WATCH_COMMON.watchControl(e.currentTarget, 'remove');
						WATCH_STORAGE.remove(issueItem, 'issues');
						WATCH_NOTICE.deletingCommentIdFromLocalStorage(issueItem.id);

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
				console.log('fail', result);
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
				var textTrim = item.description.substr(0, cut);

				tbodyTr = document.createElement('tr');
				tbodyTr.classList.add('Issue', 'watch-issue-list', evenOdd);
				tbodyTr.innerHTML = `
				<td class="Key">
					<p><a href="/view/${item.id}" class="watch-issue-anchor" title="${item.id}">${item.id}</a></p>
				</td>
				<td class="Title"><p>${item.title}</p></td>
				<td class="Assigner">${item.assigner}</td>
				<td class="Description" title="${item.description}"><p>${textTrim}...</p></td>
				<td class="Watch"><i class="fa fa-heart is-watch"></i></td>`;

				fragment.appendChild(tbodyTr);
			}
			tbody.appendChild(fragment);
			table.appendChild(tbody);
			div.appendChild(table);
			section.appendChild(h1);
			section.appendChild(div);

			var projects = document.querySelector('#projects:not([data-id="projects-fav"])');
			return projects.parentNode.insertBefore(section, projects.nextSibling);
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

})(window.jQuery, window.WATCH_COMMON, window.WATCH_STORAGE, window.WATCH_NOTICE);
