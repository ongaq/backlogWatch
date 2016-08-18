var WATCH_OPTIONS;

(($, chrome) => {
	WATCH_OPTIONS = {
		run(){
			chrome.storage.sync.get('options', (items) => {
				if(!chrome.runtime.error && items.options) {
					var op = items.options;
					$('#js-options-spaceName').val(op.space.name);
					$('#js-options-spaceApi').val(op.space.apiKey);
					$('#js-options-autoClose').find(`option[value="${op.options.close}"]`).attr('selected', 'selected');
					$('#js-options-releaseWatch').find(`option[value="${op.options.watch}"]`).attr('selected', 'selected');
				}
			});

			$('#js-options-spaceSubmit').on('click', function(){
				var settings = {
					space: {
						name: $('#js-options-spaceName').val(),
						apiKey: $('#js-options-spaceApi').val()
					},
					options: {
						close: $('#js-options-autoClose').find('option:selected').val(),
						watch: $('#js-options-releaseWatch').find('option:selected').val()
					}
				};
				var apiLength = 64;

				if(settings.space.apiKey.length !== apiLength) {
					alert('API Key の桁数が正しくありません。');
				}
				if(settings.space.name && settings.space.apiKey.length === apiLength) {
					setPreserveItem(settings);
				}
			});

			function authResult(_result, _state){
				var res = _result;
				var status = _state;
				var mes = '';
				var $notice = $('#js-options-notice');
				var notFound = 404;
				var notAuth = 401;
				var e = 'is-error';
				var v = 'is-visible';
				var visibleTime = 1500;

				$notice.removeClass(`${v} ${e}`);

				if(status) {
					mes = '保存しました！';
					setTimeout(() => $notice.removeClass(v), visibleTime);
				} else {
					mes = '保存出来ませんでした。<br>';
					if(res.status === notFound) mes += 'スペースが見つかりませんでした。';
					if(res.status === notAuth) mes += 'APIキーが間違っている可能性があります。';
					$notice.addClass(e);
				}
				$notice.html(mes).addClass(v);
			}
			function authCheck(_url){
				var defer = $.Deferred();

				$.ajax({
					url: _url,
					type: 'GET',
					dataType: 'json',
				}).done((result) => {
					defer.resolve(result);
				}).fail((result) => {
					console.log('ajax failed.....');
					defer.reject(result);
				});

				return defer.promise();
			}
			function setPreserveItem(_settings){
				var s = _settings;
				var url = `https://${s.space.name}.backlog.jp/api/v2/space?apiKey=${s.space.apiKey}`;
				var spaceOptions = {
					options: {}
				};
				authCheck(url).done((result) => {
					authResult(result, true);
					spaceOptions.options['space'] = s.space;
					spaceOptions.options['options'] = s.options;

					chrome.storage.sync.set(spaceOptions, function(){});
					console.log(spaceOptions);
				}).fail((result) => authResult(result, false));
			}
		}
	};
	WATCH_OPTIONS.run();
})(window.jQuery, window.chrome);
