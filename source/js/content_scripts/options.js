var WATCH_OPTIONS;

(($, chrome) => {
	WATCH_OPTIONS = {
		run(){
			var e = 'is-error';
			var v = 'is-visible';
			var o = 'is-ok';
			var promises = [];
			var spaceOptions = {
				options: {
					space: {},
					options: {}
				}
			};

			chrome.storage.sync.get('options', (items) => {
				if(!chrome.runtime.error && items.options) {
					var op = items.options;
					var $fieldList = $('.js-field-list:last-child');
					var fieldListLen = $fieldList.length;

					Object.keys(op.space).forEach((item, i) => {
						fieldListLen = $fieldList.length;

						if((i+1) > fieldListLen) {
							addCloneFieldList($fieldList, i);
							$fieldList = $('.js-field-list:last-child');
						}
						$fieldList.addClass(o)
						.find(`[data-id="${i}"][data-name="space"]`)
						.val(op.space[item].name).addClass(o).attr('disabled', '').end()
						.find(`[data-id="${i}"][data-name="key"]`)
						.val(op.space[item].apiKey).addClass(o).attr('disabled', '');
					});
					$('#js-options-autoClose').find(`option[value="${op.options.close}"]`).attr('selected', 'selected');
					$('#js-options-releaseWatch').find(`option[value="${op.options.watch}"]`).attr('selected', 'selected');
				}
			});

			// スペース入力フィールドの追加
			$('body').on('click', '.fa-plus-circle', function(){
				var $fieldList = $('.js-field-list');
				var fieldListLen = $fieldList.length;

				addCloneFieldList($(this).closest($fieldList), fieldListLen);
			});
			// スペース入力フィールドの削除
			$('body').on('click', '.fa-minus-circle', function(){
				var $fieldList = $(this).closest('.js-field-list');
				$fieldList.remove();
			});
			// スペース入力フィールドの編集
			$('body').on('click', '.fa-pencil', function(){
				var $fieldList = $(this).closest('.js-field-list');
				$fieldList.find('[disabled]').removeAttr('disabled').removeClass(o);
			});

			// 入力、オプションデータの保存
			$('#js-options-spaceSubmit').on('click', function(){
				promises = [];
				var settings = {
					space: {
						name: getFieldValues('space'),
						apiKey: getFieldValues('key')
					},
					options: {
						close: $('#js-options-autoClose').find('option:selected').val(),
						watch: $('#js-options-releaseWatch').find('option:selected').val()
					}
				};
				var apiLength = 64;
				var arrayAPIKeyLength = settings.space.apiKey.length;

				for(var i=0; i < arrayAPIKeyLength; i++) {
					var $space = $(`[data-name="space"][data-id="${i}"]`);
					var $key = $(`[data-name="key"][data-id="${i}"]`);
					var name = settings.space.name[i];
					var key = settings.space.apiKey[i];
					var url = `https://${name}.backlog.jp/api/v2/space?apiKey=${key}`;

					if (name.indexOf('backlog.jp') !== -1 || name.indexOf('backlog.com') !== -1) {
						url = `https://${name}/api/v2/space?apiKey=${key}`;
					}

					if(name === '') {
						$space.addClass(e);
						alert('スペース名を入力して下さい。');
					}
					if(key.length !== apiLength) {
						$key.addClass(e);
						alert('API Keyが入力されていないか、桁数が正しくありません。');
					}
					if(name && key.length === apiLength) {
						$space.removeClass(e);
						$key.removeClass(e);
						promises.push(authCheck(url));
					}
				}

				waitPromise(settings);
			});

			function addCloneFieldList(_fieldList, _fieldListLen){
				var $cloneField = _fieldList.clone();

				$cloneField.removeClass(o).attr('data-id', _fieldListLen)
				.find('[data-id]').attr('data-id', _fieldListLen)
				.removeAttr('disabled').removeClass(`${e} ${o}`).val('');

				$('.js-field').append($cloneField);
			}
			function getFieldValues(_name){
				var array = [];
				var field = document.querySelectorAll(`[data-name="${_name}"]`);

				for(var i=0, fieldLen=field.length; i < fieldLen; i++) {
					array.push(field[i].value);
				}
				return array;
			}
			function authResult(_result, _state, _i){
				var res = _result;
				var status = _state;
				var mes = '';
				var $notice = $('#js-options-notice');
				var notFound = 404;
				var notAuth = 401;
				var visibleTime = 1500;
				var $space = $(`[data-name="space"][data-id="${_i}"]`);
				var $key = $(`[data-name="key"][data-id="${_i}"]`);

				$notice.removeClass(`${v} ${e}`);

				if(status) {
					mes = '保存しました！';
					$space.closest('.js-field-list').addClass(o).end()
					.addClass(o).attr('disabled', '');
					$key.closest('.js-field-list').addClass(o).end()
					.addClass(o).attr('disabled', '');
					setTimeout(() => $notice.removeClass(v), visibleTime);
				} else {
					mes = '保存出来ませんでした。<br>';
					if(res.status === notFound) mes += 'スペースが見つかりませんでした。';
					if(res.status === notAuth) mes += 'APIキーが間違っている可能性があります。';
					$notice.addClass(e);
					setTimeout(() => $notice.removeClass(v), visibleTime);
				}
				$notice.html(mes).addClass(v);
			}
			function authCheck(_url){
				return new Promise((resolve, reject) => {
					$.ajax({
						url: _url,
						type: 'GET',
						dataType: 'json',
					}).done((result) => {
						resolve(result);
					}).fail((result) => {
						console.log('reject:', spaceOptions);
						reject(result);
					});
				});
			}
			function waitPromise(_settings){
				var s = _settings;

				return Promise.all(promises).then((result) => {
					result.forEach((res, num) => {
						authResult(res, true, num);
						spaceOptions.options.space[res.spaceKey] = {};
						spaceOptions.options.space[res.spaceKey]['name'] = s.space.name[num];
						spaceOptions.options.space[res.spaceKey]['apiKey'] = s.space.apiKey[num];
					});
					spaceOptions.options.options = s.options;
					chrome.storage.sync.set(spaceOptions, function(){});
					console.log(spaceOptions);
				}, (result) => authResult(result, false));
			}
		}
	};
	WATCH_OPTIONS.run();
})(window.jQuery, window.chrome);
