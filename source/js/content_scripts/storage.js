var WATCH_STORAGE;

(($, chrome) => {
	WATCH_STORAGE = {
		Storage: chrome.storage.sync,

		text: {
			QUOTA_BYTES_PER_ITEM: 'ウォッチ数の限界に到達しました。ウォッチ出来ません。ウォッチの数を減らして下さい。'
		},

		/**
		 * 第一引数で指定された_item(object)を_tableに追加する。
		 * @param {object} _item objectを指定します。objectにidは必ず含めて下さい。
		 * @param {string} _table DBのテーブル名を入力します。
		 * @param {string} _space データを挿入するBacklogスペース名を入力します。
		 */
		add(_item, _table, _space){
			var item = _item;
			var tableName = _table;
			var space = _space;
			var db = {};

			this.Storage.get(tableName, (value) => {
				console.log('value_before:', value);
				if(Object.keys(value).length === 0) {
					db[tableName] = {};
					db[tableName][space] = {};
					db[tableName][space][item.id] = item;
					this.Storage.set(db, () => {
						if(chrome.runtime.lastError) {
							console.error(chrome.runtime.lastError.message);
							if(chrome.runtime.lastError.message === 'QUOTA_BYTES_PER_ITEM quota exceeded') {
								alert(WATCH_STORAGE.text.QUOTA_BYTES_PER_ITEM);
							}
						}
					});
				} else {
					db[tableName] = value[tableName];
					if(typeof db[tableName][space] === 'undefined') {
						db[tableName][space] = {};
					}
					db[tableName][space][item.id] = item;
					this.Storage.set(db, () => {
						if(chrome.runtime.lastError) {
							console.error(chrome.runtime.lastError.message);
							if(chrome.runtime.lastError.message === 'QUOTA_BYTES_PER_ITEM quota exceeded') {
								alert(WATCH_STORAGE.text.QUOTA_BYTES_PER_ITEM);
							}
						}
					});
				}
				console.log('value_after:', db);
			});
		},

		/**
		 * 第一引数で指定された_item(object)を_tableから削除する。
		 * @param {object} _item objectを指定します。objectにidは必ず含めて下さい。
		 * @param {string} _table DBのテーブル名を入力します。
		 * @param {string} _space データを挿入するBacklogスペース名を入力します。
		 */
		remove(_item, _table, _space){
			var item = _item;
			var tableName = _table;
			var space = _space;
			var db = {};
			// console.log('item:', item);
			// console.log('tableName:', tableName);
			// console.log('space:', space);

			this.Storage.get(tableName, (value) => {
				db[tableName] = value[tableName];
				console.log('db:', db);
				delete db[tableName][space][item.id];
				this.Storage.set(db);
			});
		},

		/**
		 * 第一引数で指定された_item(object)を_tableに取得に行く。
		 * @param {object} _item objectを指定します。objectにidは必ず含めて下さい。
		 * @param {string} _table DBのテーブル名を入力します。
		 * @param {string} _space データを挿入するBacklogスペース名を入力します。
		 * @return {boolean}
		 */
		getItem(_item, _table, _space){
			var item = _item;
			var tableName = _table;
			var space = _space;
			var result = false;
			var defer = $.Deferred();

			this.Storage.get(tableName, (value) => {
				console.log('value:', value);
				if(Object.keys(value).length === 0) {
					defer.reject(result);
				} else {
					var db;
					if(typeof value[tableName][space] === 'undefined') {
						defer.reject(result);
					} else {
						db = value[tableName][space][item.id];
					}
					if(db && db.id === item.id) {
						result = true;
					}
					defer.resolve(result);
				}
			});

			return defer.promise();
		},

		/**
		 * 第一引数で指定された_tableに格納されているitemを全て配列で返す。
		 * @param {string} _table DBのテーブル名を入力します。
		 * @param {string} _space データを挿入するBacklogスペース名を入力します。
		 * @return {array.<object>}
		 */

		throwItem(_table, _space){
			var table = _table;
			var space = _space;
			var res = [];
			var defer = $.Deferred();
			var objValue;

			this.Storage.get(table, (value) => {
				if(typeof value[table] === 'undefined') {
					defer.reject('noItems');
				} else {
					objValue = value[table][space];

					if(typeof objValue === 'undefined') {
						defer.reject('noItems');
					} else {
						createItemArray(objValue);
					}
				}
			});

			function createItemArray(_obj){
				var obj = Object.keys(_obj);

				obj.forEach((key, idx) => {
					var object = _obj[key];
					res.push(object);

					if(idx === (obj.length-1)) {
						res.length ? defer.resolve(res) : defer.reject('noItems');
					}
				});
			}

			return defer.promise();
		},
		deleteDB(){
			console.log('Backlog Watch storage is all delete..');
			return this.Storage.clear();
		}
	};

	chrome.storage.onChanged.addListener((changes, namespace) => {
		Object.keys(changes).forEach((key) => {
			var storageChange = changes[key];
			console.log('Storage key "%s" in namespace "%s" changed. Old value was "%s", new value is "%s".',
			key, namespace, storageChange.oldValue, storageChange.newValue);
		});
	});
})(window.jQuery, window.chrome);
