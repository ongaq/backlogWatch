var WATCH_STORAGE;

(($, chrome) => {
	WATCH_STORAGE = {
		Storage: chrome.storage.sync,

		/**
		 * 第一引数で指定された_item(object)を_tableに追加する。
		 * @param {object} _item objectを指定します。objectにidは必ず含めて下さい。
		 * @param {string} _table DBのテーブル名を入力します。
		 */
		add(_item, _table){
			var tableName = _table;
			var item = _item;
			var db = {};

			this.Storage.get(tableName, (value) => {
				if(Object.keys(value).length === 0) {
					db[tableName] = {};
					db[tableName][item.id] = item;
					this.Storage.set(db);
				} else {
					db[tableName] = value[tableName];
					db[tableName][item.id] = item;
					this.Storage.set(db);
				}
			});
		},

		/**
		 * 第一引数で指定された_item(object)を_tableから削除する。
		 * @param {object} _item objectを指定します。objectにidは必ず含めて下さい。
		 * @param {string} _table DBのテーブル名を入力します。
		 */
		remove(_item, _table){
			var tableName = _table;
			var item = _item;
			var db = {};

			this.Storage.get(tableName, (value) => {
				db[tableName] = value[tableName];
				delete db[tableName][item.id];
				this.Storage.set(db);
			});
		},

		/**
		 * 第一引数で指定された_item(object)を_tableに取得に行く。
		 * @param {object} _item objectを指定します。objectにidは必ず含めて下さい。
		 * @param {string} _table DBのテーブル名を入力します。
		 * @return {boolean}
		 */
		getItem(_item, _table){
			var item = _item;
			var result = false;
			var defer = $.Deferred();

			this.Storage.get(_table, (value) => {
				if(Object.keys(value).length === 0) {
					defer.reject(result);
				} else {
					var db;
					if(typeof value[_table][_item.id] === 'undefined') {
						defer.reject(result);
					} else {
						db = value[_table][_item.id];
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
		 * @return {array.<object>}
		 */

		throwItem(_table){
			var table = _table;
			var res = [];
			var defer = $.Deferred();

			this.Storage.get(table, (value) => {
				Object.keys(value).forEach((key) => {
					var object = value[key];
					Object.keys(object).forEach((key2) => {
						res.push(object[key2]);
					});
				});
				defer.resolve(res);
			});

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
