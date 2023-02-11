import { QUOTA_BYTES_PER_ITEM } from './text';
import * as Storage from '../@types/storage';

export class StorageManager {
  private storage: chrome.storage.SyncStorageArea;
  private db: Storage.DataBase;

  constructor() {
    this.storage = chrome.storage.sync;
    this.db = {};
  }
  #error() {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);

      if (chrome.runtime.lastError.message === 'QUOTA_BYTES_PER_ITEM quota exceeded') {
        alert(QUOTA_BYTES_PER_ITEM);
      }
    }
  }
  /**
   * 第一引数で指定されたitemをtableに追加する
   * @param {Object<string, string>} item - objectを指定します。objectにidは必ず含めて下さい
   * @param {String} tableName - DBのテーブル名を入力します
   * @param {String} space - データを挿入するBacklogスペース名を入力します
   */
  add: Storage.AddRemove = (item, tableName, space) => {
    const createTable = () => {
      this.db[tableName] = {
        [space]: {
          [item.id]: item
        }
      };
      this.storage.set(this.db, this.#error);
    };
    const insertTable = (value: Storage.DataBase) => {
      this.db[tableName] = value[tableName];
      this.db[tableName][space] ??= {};
      this.db[tableName][space][item.id] = item;
      this.storage.set(this.db, this.#error);
    };

    this.storage.get(tableName, (value) => {
      if (Object.keys(value).length === 0) {
        createTable();
      } else {
        insertTable(value);
      }
    });
  }
  /**
   * 第一引数で指定されたitemをtableから削除する
   * @param {Object<string, string>} item - objectを指定します。objectにidは必ず含めて下さい
   * @param {String} tableName - DBのテーブル名を入力します
   * @param {String} space - データを挿入するBacklogスペース名を入力します
   */
  remove: Storage.AddRemove = (item, tableName, space) => {
    const removeTable = (value: Storage.DataBase) => {
      this.db[tableName] = value[tableName];
      delete this.db[tableName][space][item.id];
      this.storage.set(this.db);
    };
    this.storage.get(tableName, removeTable);
  }
  /**
   * 第一引数で指定されたitemをtableから取得する
   * 課題キーが存在するかどうかを確認に用いる
   * @param {Object<string, string>} item - objectを指定します。objectにidは必ず含めて下さい
   * @param {String} tableName - DBのテーブル名を入力します
   * @param {String} space - データを挿入するBacklogスペース名を入力します
   * @return {Boolean}
   */
  hasIssue: Storage.HasIssue = (item, tableName, space) => {
    return new Promise((resolve) => {
      this.storage.get(tableName, (value: Storage.DataBase) => {
        const spaceData = value[tableName][space];
        const isNoIssue = Object.keys(value).length === 0;
        const isNoSpace = typeof spaceData === 'undefined';

        if (isNoIssue || isNoSpace) {
          return resolve(false);
        }
        const db = spaceData[item.id];

        if (db && db.id === item.id) {
          return resolve(true);
        }
        return resolve(false);
      });
    });
  }
  /**
   * 第一引数で指定されたtableに格納されているitemを全て配列で返す。
   * @param {String} tableName - DBのテーブル名を入力します
   * @param {String} space - データを挿入するBacklogスペース名を入力します
   * @return {Storage.issueItem[] | false}
   */
  throwItem: Storage.ThrowItem = (tableName, space) => {
    type Resolve = (value: false | any[] | PromiseLike<false | any[]>) => void;

    const res: Storage.issueItem[] = [];
    const createItemArray = (spaceData: Storage.ItemId, resolve: Resolve) => {
      const itemIds = Object.keys(spaceData);
      const len = itemIds.length;

      if (!len) {
        return resolve(false);
      }
      for (let i = 0; i < len; i++) {
        const key = itemIds[i];
        const object = spaceData[key];
        res.push(object);

        if (i === len-1) {
          return resolve(res.length ? res : false);
        }
      }
      return resolve(false);
    };

    return new Promise((resolve) => {
      this.storage.get(tableName, (value: Storage.DataBase) => {
        if (typeof value[tableName] === 'undefined') {
          resolve(false);
        }
        const spaceData = value[tableName][space];

        if (typeof spaceData === 'undefined') {
          resolve(false);
        } else {
          createItemArray(spaceData, resolve);
        }
      });
    });
  }
  async deleteDB() {
    console.log('Backlog Watch storage is all delete..');
    await this.storage.clear();
  }
}
