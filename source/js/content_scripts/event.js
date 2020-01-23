var WATCH_NOTICE = null;

(($, WATCH_COMMON, WATCH_STORAGE, chrome) => {
	var reSpace, reAutoCloseSecond, reAutoReleaseWatch, array;

	WATCH_NOTICE = {
		getOptions(_target){
			var item = '';
			var t = _target;

			return new Promise((resolve, reject) => {
				WATCH_STORAGE.Storage.get('options', (items) => {
					if(!chrome.runtime.error && items.options) {
						var space = items.options.space;
						var options = items.options.options;

						if(t === 'close' || t === 'watch') {
							if(t === 'close') item = String(options.close);
							if(t === 'watch') item = String(options.watch);

							item.length > 0 ? resolve(item) : reject('close or watch:', items);
						}
						if(t === 'space') {
							item = space;
							Object.keys(item).length > 0 ? resolve(item) : reject('space:', items);
						}
					} else {
						reject('error:', items);
					}
				});
			});
		},
		space: () => WATCH_NOTICE.getOptions('space'),
		autoCloseSecond: () => WATCH_NOTICE.getOptions('close'),
		autoReleaseWatch: () => WATCH_NOTICE.getOptions('watch'),

		acceptNotification(){
			console.log('check acceptNotification...');
			array = [
				this.space(),
				this.autoCloseSecond(),
				this.autoReleaseWatch()
			];

			return Promise.all(array).then((results) => {
				console.log('results:', results);
				chrome.alarms.get('backlogOptionsSetting', (val) => {
					if(typeof val !== 'undefined') chrome.alarms.clear('backlogOptionsSetting');
				});

				if(results[0] === null) {
					console.warn('please input space name and apiKey.');
				} else {
					chrome.notifications.getPermissionLevel((response) => {
						if(response === 'granted') {
							WATCH_NOTICE.checkWatchIssues(results);
						} else if(response === 'denied') {
							throw new Error('notification request false.');
						}
					});
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
				} else {
					throw new Error('promise failed.');
				}
			});
		},
		checkWatchIssues(_results){
			var space = reSpace || _results[0];
			var autoCloseSecond = reAutoCloseSecond || _results[1];
			var autoReleaseWatch = Boolean(reAutoReleaseWatch) || Boolean(_results[2]);

			Object.keys(space).forEach((key) => {
				var promise = WATCH_STORAGE.throwItem('issues', key);
				var issuesDB = `${key}_comments_count`;
				// console.log('issuesDB:', issuesDB);

				promise.done((result) => {
					// console.log('checkWatchIssues:', result);
					result.forEach((item) => popupNotification(item.id, key, issuesDB));
				}).fail((result) => console.warn('failed:', result));
			});

			function popupNotification(_result, _key, _issuesDB){
				var issueKey = _result;
				var issueItem = { id: issueKey };
				var db = _issuesDB;
				var spaceName = space[_key].name;

				if (spaceName.indexOf('backlog.jp') === -1 && spaceName.indexOf('backlog.com') === -1) {
					spaceName = `${spaceName}.backlog.jp`;
				}

				ajaxRequest(_result, _key, db)
				.then((result) => requestReturnValue(result), (result) => {
					console.error(result);
					throw new Error('popupNotification: promise failed.');
				});

				function requestReturnValue(result){
					var res, commentLastId, useStorageVal, comparisonVal;

					if(result.length) {
						res = result[0];
						commentLastId = res.id;
						useStorageVal = {};
						comparisonVal = {};

						// storageに***_comments_countがセットされていなければ初期化
						WATCH_STORAGE.Storage.get(db, (items) => {
							var comment = items[db];
							// JSONのidとStorageにセットされている値の比較用
							comparisonVal[issueKey] = comment ? comment[issueKey] : 0;

							if(!chrome.runtime.error) {
								// Storageにセットする値
								if(comment) {
									useStorageVal = items;
									useStorageVal[db][issueKey] = commentLastId;
								} else {
									useStorageVal[db] = {};
									useStorageVal[db][issueKey] = commentLastId;
								}
							}

							if(commentLastId > comparisonVal[issueKey]) {
								var note = `[${issueKey}] @${res.createdUser.name}`;
								var url = `https://${spaceName}/favicon.ico`;

								var options = {
									type: 'basic',
									iconUrl: url,
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
							backlogCompletedWhenCancel();
						});
					}

					// 通知を作成する
					function createNotifications(_options, _issueKey){
						chrome.notifications.create(`backlog-${space[_key].name}-${_issueKey}`, _options, (notificationId) => {
							var listener = () => {
								chrome.tabs.create({
									url: `https://${spaceName}/view/${_issueKey}#comment-${res.id}`
								});
								chrome.notifications.onClicked.removeListener(listener);
								chrome.notifications.clear(notificationId);
							};
							chrome.notifications.onClicked.addListener(listener);
							chrome.notifications.onClosed.addListener(() => {
								chrome.notifications.onClicked.removeListener(listener);
								chrome.notifications.clear(notificationId);
							});
							// 機能オプション
							closeNotificationAfterSeconds(notificationId);
						});
						backlogCompletedWhenCancel();
					}
					// 課題情報を取得する
					function getIssueInfo(_issueKey){
						var defer = $.Deferred();
						var path = `https://${spaceName}/api/v2/issues/${_issueKey}?apiKey=${space[_key].apiKey}`;

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
						// console.log('res:', res);
						if(autoReleaseWatch && res.changeLog.length) {
							Object.keys(res.changeLog).forEach((key) => {
								var log = res.changeLog[key];
								// console.log('log:', log);

								if(log.field === 'status' && log.newValue === '完了') {
									WATCH_STORAGE.remove(issueItem, 'issues', _key);
								}
							});
						}
					}
					// n秒後に通知を閉じる
					function closeNotificationAfterSeconds(_id){
						var msec = 1000;
						console.log('notificationId:', _id, '->', new Date());

						if(typeof autoCloseSecond !== 'undefined' && Number(autoCloseSecond) > 0) {
							chrome.alarms.create('autoClose', {
								when: Date.now() + (msec * Number(autoCloseSecond))
							});
						}
						chrome.alarms.onAlarm.addListener((alarm) => {
							if(alarm && alarm.name === 'autoClose') {
								chrome.notifications.clear(_id);
							}
						});
					}
				}
			}
			function ajaxRequest(_issueKey, _key, _db){
				var key = _issueKey;
				var query = '';
				var path = '';
				var spaceName = space[_key].name;

				if (spaceName.indexOf('backlog.jp') === -1 && spaceName.indexOf('backlog.com') === -1) {
					spaceName = `${spaceName}.backlog.jp`;
				}

				return new Promise((resolve, reject) => {
					WATCH_STORAGE.Storage.get(_db, (items) => {
						var comment = items[_db];
						if(comment) {
							query = typeof comment[key] === 'undefined' ? '&minId=0' : `&minId=${comment[key]}`;
						}
						path = `https://${spaceName}/api/v2/issues/${key}/comments?apiKey=${space[_key].apiKey+query}`;

						$.ajax({
							url: path,
							type: 'GET',
							dataType: 'json',
						}).done((result) => {
							resolve(result);
						}).fail((result) => {
							console.log('ajax failed.....');
							reject(result);
						});
					});
				});
			}
		},
		intervalCheck(){
			Promise.all([
				WATCH_NOTICE.space(),
				WATCH_NOTICE.autoCloseSecond(),
				WATCH_NOTICE.autoReleaseWatch()
			]).then((results) => {
				reSpace = results[0];
				reAutoCloseSecond = results[1];
				reAutoReleaseWatch = Boolean(results[2]);
				WATCH_NOTICE.checkWatchIssues(results);
			});
		},
		runChromeFunctions(){
			// オプション保存時に発火
			chrome.storage.onChanged.addListener((changes) => {
				Object.keys(changes).forEach((key) => {
					if(key === 'options') {
						console.log('storage:', new Date());
						WATCH_NOTICE.intervalCheck();
					}
				});
			});
			// アラーム設定
			chrome.alarms.onAlarm.addListener((alarm) => {
				if(alarm && alarm.name === 'backlog') {
					WATCH_NOTICE.intervalCheck();
				}
			});
			// 1分毎にイベントを発生させる
			chrome.alarms.get('backlog', (val) => {
				if(typeof val === 'undefined') {
					chrome.alarms.create('backlog', { periodInMinutes: 1 });
				}
			});
		}
	};

	// Chromeインストール時に実行
	chrome.runtime.onInstalled.addListener((details) => {
		if(details.reason === 'install') {
			var oldVersion = 1.2;
			if(parseFloat(details.previousVersion) <= oldVersion) {
				WATCH_STORAGE.Storage.clear((items) => console.log(items));
			}
			if(chrome.runtime.openOptionsPage) {
				chrome.runtime.openOptionsPage();
			} else {
				window.open(chrome.runtime.getURL('options.html'));
			}
		}
	});

	chrome.notifications.getPermissionLevel((response) => {
		if(response === 'granted') {
			array = [
				WATCH_NOTICE.space(),
				WATCH_NOTICE.autoCloseSecond(),
				WATCH_NOTICE.autoReleaseWatch()
			];
			Promise.all(array).then((results) => {
				WATCH_NOTICE.checkWatchIssues(results);
			});

			WATCH_NOTICE.runChromeFunctions();
		} else if(response === 'denied') {
			throw new Error('notification request false.');
		}
	});
})(window.jQuery, window.WATCH_COMMON, window.WATCH_STORAGE, window.chrome);
