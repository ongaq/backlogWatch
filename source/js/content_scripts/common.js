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
