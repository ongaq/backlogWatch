import type { Options, Space, SpaceInfo } from '../@types/index';
import { consoleLog } from './common';
import storageManager from './storage';
import { getSpaceInfoFetchAPI } from './api';

const error = 'is-danger';
const visible = 'is-visible';
const ok = 'is-ok';

/** 入力フィールドをスペースごとに複製する */
const addCloneFieldList = (spaceFieldULElm: HTMLUListElement, fieldListLen: number) => {
  const cloneFieldUlElm = spaceFieldULElm.cloneNode(true) as HTMLUListElement;

  cloneFieldUlElm.classList.remove(ok);
  cloneFieldUlElm.setAttribute('data-id', String(fieldListLen));
  cloneFieldUlElm.querySelectorAll<HTMLInputElement>('[data-id]').forEach((elm) => {
    elm.setAttribute('data-id', String(fieldListLen));
    elm.disabled = false;
    elm.classList.remove(error, ok);
    elm.value = '';
  });
  document.querySelector('.js-field')?.insertAdjacentElement('beforeend', cloneFieldUlElm);
};
/** 引数にdata-name属性の値を入れ対象のdata属性のvalueを全て取得する */
const getFieldValues = (dataName: string) => {
  return [...document.querySelectorAll<HTMLInputElement>(`[data-name="${dataName}"]:not([disabled])`)]
    .map((elm) => elm.value);
};
/** 入力したスペース情報やAPIKEYが正確だったかどうか結果をDOM上に反映する */
const authResult = ({ status, result, index }: { status: number; result: boolean; index: number }) => {
  const noticeElm = document.querySelector('#js-options-notice');
  const notFound = 404;
  const notAuth = 401;
  const visibleTime = 1500;
  const spaceElm = document.querySelector<HTMLInputElement>(`[data-name="space"][data-id="${index}"]`);
  const keyElm = document.querySelector<HTMLInputElement>(`[data-name="key"][data-id="${index}"]`);
  const targetListElm = spaceElm?.closest('.js-field-list');
  let mes = '';

  if (!noticeElm) return;

  noticeElm.classList.remove(visible, error);

  if (result) {
    mes = '保存しました！';

    if (spaceElm && keyElm && targetListElm) {
      targetListElm.classList.add(ok);
      spaceElm.classList.add(ok)
      spaceElm.disabled = true;
      keyElm.classList.add(ok)
      keyElm.disabled = true;
    }
  } else {
    mes = '保存出来ませんでした。<br>';
    if (status === notFound) mes += 'スペースが見つかりませんでした。';
    else if (status === notAuth) mes += 'APIキーが間違っている可能性があります。';
    noticeElm.classList.add(error);
  }
  noticeElm.innerHTML = mes;
  noticeElm.classList.add(visible);
  setTimeout(() => noticeElm.classList.remove(visible), visibleTime);
};
/** chrome.storageにスペース情報を保存する */
const waitPromise = async (settings: Record<string, any>, promises: Promise<SpaceInfo | (Space & SpaceInfo)>[]) => {
  const spaceOptions: Options = {
    options: {
      space: {},
      options: {
        close: '0',
        watch: '0',
      },
    },
  };

  const result = await Promise.all(promises);
  for (let i = 0; i < result.length; i++) {
    const res = result[i];
    authResult({ status: res.status, result: res.result, index: i });
    if (res.result === false) continue;
    spaceOptions.options.space[(res as Space).spaceKey] = {
      name: settings.space.name[i],
      apiKey: settings.space.apiKey[i],
    };
  }
  spaceOptions.options.options = settings.options;
  await storageManager.set(spaceOptions);
  consoleLog(spaceOptions);
};
/** $('body').on('click', targetClass, () => {}) の代用 */
const onEventHandler = (targetClass: string, callback: (self: HTMLElement) => void) => {
  document.body.addEventListener('click', (e) => {
    const self = <HTMLElement>e.target;
    if (self.classList.contains(targetClass)) {
      callback(self);
    }
  });
};
/** スペース入力フィールドの追加 */
const addSpaceInputField = () => {
  const fieldList = document.querySelectorAll<HTMLUListElement>('.js-field-list');
  const fieldListLen = fieldList.length;
  const lastFieldList = fieldList[fieldListLen-1];
  lastFieldList && addCloneFieldList(lastFieldList, fieldListLen);
};
/** スペース入力フィールドの削除 */
const removeSpaceInputField = (self: HTMLElement) => {
  const fieldListElm = self.closest('.js-field-list');
  fieldListElm?.remove();
};
/** スペース入力フィールドの編集 */
const editSpaceInputField = (self: HTMLElement) => {
  const fieldListElm = self.closest('.js-field-list');
  const disabledElms = fieldListElm?.querySelectorAll('[disabled]');
  if (!disabledElms || !disabledElms.length) return;

  for (const disabledElm of disabledElms) {
    disabledElm.removeAttribute('disabled');
    disabledElm.classList.remove(ok);
  }
};
/** 入力、オプションデータの保存 */
const saveSettings = () => {
  const promises: Promise<SpaceInfo | (Space & SpaceInfo)>[] = [];
  const autoCloseElm = document.querySelector('#js-options-autoClose');
  const releaseWatchElm = document.querySelector('#js-options-releaseWatch');
  const settings = {
    space: {
      name: getFieldValues('space'),
      apiKey: getFieldValues('key'),
    },
    options: {
      close: autoCloseElm?.querySelector<HTMLOptionElement>('option:checked')?.value || '0',
      watch: releaseWatchElm?.querySelector<HTMLOptionElement>('option:checked')?.value || '0',
    },
  };
  const apiLength = 64;
  const arrayAPIKeyLength = settings.space.apiKey.length;

  for (let i=0; i < arrayAPIKeyLength; i++) {
    const spaceElm = document.querySelector(`[data-name="space"][data-id="${i}"]`);
    const keyElm = document.querySelector(`[data-name="key"][data-id="${i}"]`);
    const name = settings.space.name[i];
    const key = settings.space.apiKey[i];

    if (name === '') {
      spaceElm?.classList.add(error);
      alert('スペース名を入力して下さい。');
    }
    if ([...key].length !== apiLength) {
      keyElm?.classList.add(error);
      alert('API Keyが入力されていないか、桁数が正しくありません。');
    }
    if (name && key.length === apiLength) {
      spaceElm?.classList.remove(error);
      keyElm?.classList.remove(error);
      promises.push(getSpaceInfoFetchAPI(name, key));
    }
  }

  waitPromise(settings, promises);
};
const deleteDB = async () => {
  await storageManager.deleteDB();
};
const addWatch = async () => {
  await storageManager.add('watchtest', { 'TEST-1': 100 }, 'watching');
  await storageManager.add('watchtest', { 'TEST-2': 100 }, 'watching');
  await storageManager.add('watchtest', { 'TEST-3': 100 }, 'watching');
  console.log('add:', await storageManager.get('watching'));
};
const removeWatch = async () => {
  await storageManager.remove('watchtest', 'TEST-2', 'watching');
  console.log('remove:', await storageManager.get('watching'));
};
/** 初期表示設定 */
const setInitialDisplay = async () => {
  const items = await storageManager.get('options');
  console.log('items:', items);
  if (!items || !Object.keys(items).length) return;

  const { options, space } = items.options;
  const fieldListElm = document.querySelectorAll<HTMLUListElement>('.js-field-list');
  const fieldListLen = fieldListElm.length;
  const spaces = Object.keys(space);

  for (let i = 0; i < spaces.length; i++) {
    const spaceName = spaces[i];
    const spaceFieldULElm = fieldListElm[i];
    if (!spaceFieldULElm) continue;

    if ((i+1) > fieldListLen) {
      addCloneFieldList(spaceFieldULElm, i);
    }
    spaceFieldULElm.classList.add(ok);
    const spaceFieldElm = spaceFieldULElm.querySelector<HTMLInputElement>(`[data-id="${i}"][data-name="space"]`);
    const keyFieldElm = spaceFieldULElm.querySelector<HTMLInputElement>(`[data-id="${i}"][data-name="key"]`);
    if (!spaceFieldElm || !keyFieldElm) continue;

    spaceFieldElm.value = space[spaceName].name;
    spaceFieldElm.classList.add(ok);
    spaceFieldElm.disabled = true;
    keyFieldElm.value = space[spaceName].apiKey;
    keyFieldElm.classList.add(ok);
    keyFieldElm.disabled = true;
  }

  // 機能オプションの初期選択設定
  const autoCloseElm = document.querySelector('#js-options-autoClose');
  const releaseWatchElm = document.querySelector('#js-options-releaseWatch');
  const autoCloseOptionElm = autoCloseElm?.querySelector<HTMLOptionElement>(`option[value="${options.close}"]`);
  const releaseWatchOptionElm = releaseWatchElm?.querySelector<HTMLOptionElement>(`option[value="${options.watch}"]`);

  if (autoCloseOptionElm && releaseWatchOptionElm) {
    autoCloseOptionElm.selected = true;
    releaseWatchOptionElm.selected = true;
  }
};

(() => {
  setInitialDisplay();

  // スペース入力フィールドの追加
  onEventHandler('fa-plus-circle', addSpaceInputField);
  // スペース入力フィールドの削除
  onEventHandler('fa-minus-circle', removeSpaceInputField);
  // スペース入力フィールドの編集
  onEventHandler('fa-pencil', editSpaceInputField);
  // 入力、オプションデータの保存
  document.querySelector('#js-options-spaceSubmit')?.addEventListener('click', saveSettings);
  // deleteDB
  document.querySelector('#js-options-deleteDB')?.addEventListener('click', deleteDB);

  document.querySelector('#js-options-addWatch')?.addEventListener('click', addWatch);
  document.querySelector('#js-options-removeWatch')?.addEventListener('click', removeWatch);
})();

