import type * as Storage from '../@types/storage';
import type { Resolve } from '../@types/index';
import { QUOTA_BYTES_PER_ITEM } from './text';

class StorageManager {
  private storage: chrome.storage.LocalStorageArea;
  private db: Storage.DataBase;

  constructor() {
    this.storage = chrome.storage.local;
    this.db = {};
  }
  #error(resolve: Resolve<boolean>) {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);

      switch (chrome.runtime.lastError.message) {
        case 'QUOTA_BYTES quota exceeded':
        case 'QUOTA_BYTES_PER_ITEM quota exceeded':
          alert(QUOTA_BYTES_PER_ITEM);
          break;
        default:
          break;
      }
      return resolve(false);
    }
    return resolve(true);
  }
  get<T extends Storage.GetArg>(key: T) {
    return new Promise<Storage.GetReturn<T>>((resolve) => {
      this.storage.get(key, (result) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          return resolve(false as unknown as Storage.GetReturn<T>);
        }
        return resolve(result as unknown as Storage.GetReturn<T>);
      });
    });
  }
  async set(key: Record<string, any>): Promise<void> {
    await this.storage.set(key);
  }
  /**
   * 第一引数で指定されたitemをtableに追加する
   * @param {String} spaceId - spaceの名前を入力します
   * @param {Object<string, string>} item - objectを指定します。objectにidは必ず含めて下さい
   * @param {String} tableName - DBのテーブル名を入力します
   */
  add: Storage.Add = (spaceId, item, tableName) => {
    const tableKey = Object.keys(item)[0];
    const tableValue = Object.values(item)[0];
    const createTable = (resolve: Resolve<boolean>) => {
      this.db[tableName] = {
        [spaceId]: {
          [tableKey]: tableValue,
        }
      };
      this.storage.set(this.db, () => this.#error(resolve));
    };
    const insertTable = (value: Storage.DataBase, resolve: Resolve<boolean>) => {
      this.db[tableName] = value[tableName];
      this.db[tableName][spaceId] ??= {};
      this.db[tableName][spaceId][tableKey] = tableValue;
      this.storage.set(this.db, () => this.#error(resolve));
    };

    return new Promise((resolve) => {
      this.storage.get(tableName, (value) => {
        if (Object.keys(value).length === 0) {
          createTable(resolve);
        } else {
          insertTable(value, resolve);
        }
      });
    });
  }
  /**
   * 第一引数で指定されたitemをtableから削除する
   * @param {String} spaceId - spaceの名前を入力します
   * @param {String} issueId - IssueのIDを文字列で指定
   * @param {String} tableName - DBのテーブル名を入力します
   */
  remove: Storage.Common = (spaceId, issueId, tableName) => {
    const removeTable = async (value: Storage.DataBase, resolve: Resolve<true>) => {
      this.db[tableName] = value[tableName];
      delete this.db[tableName][spaceId][issueId];
      await this.storage.set(this.db);
      return resolve(true);
    };

    return new Promise((resolve) => {
      this.storage.get(tableName, async (value: Storage.DataBase) => {
        await removeTable(value, resolve);
      });
    });
  }
  async deleteDB() {
    await this.storage.clear();
    // 通知IDの消去
    chrome.notifications.getAll((notify) =>
      Object.keys(notify).forEach((id) =>
        chrome.notifications.clear(id)));
  }
}

export default new StorageManager();
