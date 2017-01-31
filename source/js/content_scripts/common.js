var WATCH_COMMON;

(() => {
	WATCH_COMMON = {
		location: {
			href: window.location.href,
			home: false,
			issue: false
		},
		returnMsec(_int){
			var mil = 1000;
			var sec = 60;

			return mil * sec * _int;
		},
		position(){
			if(this.location.href.indexOf('backlog.jp/dashboard') > 0) {
				this.location.home = true;
			}
			if(this.location.href.indexOf('backlog.jp/view') > 0) {
				this.location.issue = true;
			}
		},
		getCookie(){
			var result = [];
			var cookies = document.cookie;

			if(cookies !== '') {
				var cookieArray = cookies.split(';');
				for(var i = 0; i < cookieArray.length; i++) {
					var cookie = cookieArray[i].split('=');
					result[cookie[0].replace(/^\s/, '')] = decodeURIComponent(cookie[1]);
				}
			}
			return result;
		},
		locationObserver(_fn){
			var target = document.querySelector('.ticket__mask');

			if(target === null) return;

			var timeout = 500;
			var observeConfig = {
				attributes: true,
				childList: true,
				characterData: true
			};
			var state = history.state;
			var observer = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					// loading表示が消えたら実行
					if(mutation.target.style.display === 'none' && state.issueKey !== history.state.issueKey) {
						state = history.state;
						observer.disconnect();
						setTimeout(() => _fn(), timeout);
					}
				});
			});
			observer.observe(target, observeConfig);
		},
		watchControl(_self, _state){
			var self = _self;
			var state = _state;
			var timer = 10;

			if(state === 'add') {
				self.classList.remove('is-running');
				self.classList.add('is-watch');
			}
			if(state === 'remove') {
				self.classList.remove('is-running', 'is-watch');
			}
			setTimeout(() => {
				self.classList.add('is-running');
			}, timer);
		}
	};
})();
