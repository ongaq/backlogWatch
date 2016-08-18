var WATCH_NOTICE = null;

(($, WATCH_COMMON, WATCH_STORAGE, chrome) => {
	WATCH_NOTICE = {
		getOptions(_target){
			var item = '';

			return new Promise((resolve, reject) => {
				WATCH_STORAGE.Storage.get('options', (items) => {
					if(!chrome.runtime.error && items.options) {
						var space = items.options.space;
						var options = items.options.options;

						switch(_target) {
							case 'close': item = String(options.close); break;
							case 'watch': item = String(options.watch); break;
							case 'name': item = space.name; break;
							case 'apiKey': item = space.apiKey; break;
							default: break;
						}

						item.length > 0 ? resolve(item) : reject(null);
					} else {
						reject(null);
					}
				});
			});
		},
		space: () => WATCH_NOTICE.getOptions('name'),
		apiKey: () => WATCH_NOTICE.getOptions('apiKey'),
		autoCloseSecond: () => WATCH_NOTICE.getOptions('close'),
		autoReleaseWatch: () => WATCH_NOTICE.getOptions('watch'),

		acceptNotification(){
			console.log('check acceptNotification...');
			var array = [
				this.space(),
				this.apiKey(),
				this.autoCloseSecond(),
				this.autoReleaseWatch()
			];

			return Promise.all(array).then((results) => {
				console.log('results:', results);
				chrome.alarms.get('backlogOptionsSetting', (val) => {
					if(typeof val !== 'undefined') chrome.alarms.clear('backlogOptionsSetting');
				});

				if(results[0] !== null && results[1] !== null) {
					chrome.notifications.getPermissionLevel((response) => {
						runNotificationActions(response, results);
					});
				} else {
					console.warn('please input space name and apiKey.');
				}
			}, (error) => {
				if(error === null) {
					console.warn('It does not have to set the options.');

					chrome.alarms.get('backlogOptionsSetting', (val) => {
						if(typeof val === 'undefined') {
							chrome.alarms.create('backlogOptionsSetting', { periodInMinutes: 1 });

							chrome.alarms.onAlarm.addListener((alarm) => {
								if(alarm && alarm.name === 'backlogOptionsSetting') {
									WATCH_NOTICE.acceptNotification();
								}
							});
						}
					});
				}
			});

			function runNotificationActions(response, results){
				if(response === 'granted') {
					// 1分毎にイベントを発生させる
					chrome.alarms.get('backlog', (val) => {
						if(typeof val === 'undefined') {
							chrome.alarms.create('backlog', { periodInMinutes: 1 });
						}
					});
					chrome.alarms.onAlarm.addListener((alarm) => {
						if(alarm && alarm.name === 'backlog') {
							WATCH_NOTICE.checkWatchIssues(results);
						}
					});
				}
				if(response === 'denied') {
					throw new Error('notification request false.');
				}
			}
		},
		checkWatchIssues(_results){
			var spaceName = _results[0];
			var spaceKey = _results[1];
			var autoCloseSecond = _results[2];
			var autoReleaseWatch = Boolean(_results[3]);
			var promise = WATCH_STORAGE.throwItem('issues');
			var issuesDB = `${spaceName}_comments_count`;

			promise.done((result) => {
				for(var i=0, resLen=result.length; i < resLen; i++) {
					popupNotification(this, result[i].id);
				}
			}).fail((result) => {
				console.warn('failed:', result);
			});

			function popupNotification(_self, _result){
				var issueKey = _result;
				var issueItem = { id: issueKey };

				ajaxRequest(_self, _result).done((result) => {
					if(result.length) {
						var res = result[0];
						var commentLastId = res.id;
						var useStorageVal = {};
						var comparisonVal = {};

						// storageに***_comments_countがセットされていなければ初期化
						WATCH_STORAGE.Storage.get(issuesDB, (items) => {
							var comment = items[issuesDB];
							// JSONのidとStorageにセットされている値の比較用
							comparisonVal[issueKey] = comment ? comment[issueKey] : 0;

							if(!chrome.runtime.error) {
								// Storageにセットする値
								if(comment) {
									useStorageVal = items;
									useStorageVal[issuesDB][issueKey] = commentLastId;
								} else {
									useStorageVal[issuesDB] = {};
									useStorageVal[issuesDB][issueKey] = commentLastId;
								}
							}

							if(commentLastId > comparisonVal[issueKey]) {
								var note = `[${issueKey}] @${res.createdUser.name}`;
								var options = {
									type: 'basic',
									iconUrl: `https://${spaceName}.backlog.jp/favicon.ico`,
									title: issueKey,
									message: res.content,
									contextMessage: note,
									requireInteraction: true
								};
								getIssueInfo(issueKey).done((info) => {
									options.title = info.summary;
									createNotifications(options, issueKey);
								}).fail(() => createNotifications(options, issueKey));
							}
							WATCH_STORAGE.Storage.set(useStorageVal);
						});

						// 通知を作成する
						function createNotifications(_options, _issueKey){
							var id = '';
							chrome.notifications.create(`backlog-${_issueKey}`, _options, (notificationId) => {
								id = notificationId;
								var listener = () => {
									chrome.tabs.create({
										url: `https://${spaceName}.backlog.jp/view/${_issueKey}#comment-${res.id}`
									});
									chrome.notifications.onClicked.removeListener(listener);
									chrome.notifications.clear(notificationId);
								};
								chrome.notifications.onClicked.addListener(listener);
								chrome.notifications.onClosed.addListener(() => {
									chrome.notifications.onClicked.removeListener(listener);
									chrome.notifications.clear(notificationId);
								});
							});
							// 機能オプション
							closeNotificationAfterSeconds(id);
							backlogCompletedWhenCancel();
						}
						// 課題情報を取得する
						function getIssueInfo(_issueKey){
							var defer = $.Deferred();
							var path = `https://${spaceName}.backlog.jp/api/v2/issues/${_issueKey}?apiKey=${spaceKey}`;

							$.ajax({
								url: path,
								type: 'GET',
								dataType: 'json',
							}).done((info) => {
								defer.resolve(info);
							}).fail((info) => {
								console.log('ajax failed.....');
								defer.reject(info);
							});

							return defer.promise();
						}
						// 課題完了時にウォッチを解除する
						function backlogCompletedWhenCancel(){
							if(autoReleaseWatch && res.changeLog.length) {
								Object.keys(res.changeLog).forEach((key) => {
									var log = res.changeLog[key];

									if(log.field === 'status' && log.newValue === '完了') {
										WATCH_STORAGE.remove(issueItem, 'issues');
									}
								});
							}
						}
						// n秒後に通知を閉じる
						function closeNotificationAfterSeconds(_id){
							if(typeof autoCloseSecond !== 'undefined' && Boolean(autoCloseSecond)) {
								var msec = 1000;
								chrome.alarms.create('autoClose', {
									when: Date.now() + (autoCloseSecond * msec)
								});
							}
							chrome.alarms.onAlarm.addListener((alarm) => {
								if(alarm && alarm.name === 'autoClose') {
									chrome.notifications.clear(_id);
								}
							});
						}
					}
				}).fail((result) => {
					console.log(result);
					console.log('promise failed...');
				});
			}
			function ajaxRequest(_self, _issueKey){
				var defer = $.Deferred();
				var key = _issueKey;
				var query = '';
				var path = '';

				WATCH_STORAGE.Storage.get(issuesDB, (items) => {
					var comment = items[issuesDB];
					if(comment) {
						query = typeof comment[key] === 'undefined' ? '&minId=0' : `&minId=${comment[key]}`;
					}
					path = `https://${spaceName}.backlog.jp/api/v2/issues/${key}/comments?apiKey=${spaceKey+query}`;

					$.ajax({
						url: path,
						type: 'GET',
						dataType: 'json',
					}).done((result) => {
						defer.resolve(result);
					}).fail((result) => {
						console.log('ajax failed.....');
						defer.reject(result);
					});
				});

				return defer.promise();
			}
		}
	};

	// Chromeインストール時に実行
	chrome.runtime.onInstalled.addListener((details) => {
		WATCH_NOTICE.acceptNotification();

		if(details.reason === 'install') {
			if(chrome.runtime.openOptionsPage) {
				chrome.runtime.openOptionsPage();
			} else {
				window.open(chrome.runtime.getURL('options.html'));
			}
		}
	});
	// Chrome起動時に実行
	chrome.runtime.onStartup.addListener(() => WATCH_NOTICE.acceptNotification());

})(window.jQuery, window.WATCH_COMMON, window.WATCH_STORAGE, window.chrome);
