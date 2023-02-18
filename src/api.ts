import type { FetchApiArg, FetchApiReturn } from '../@types/api';
import { spaceUrl, consoleLog, getOptions, backlogResource } from './common';
import storageManager from './storage';

const fetchAPI = async <T extends FetchApiArg>({ apiPath, query, method }: {
  apiPath: T;
  query?: string;
  method: 'GET' | 'POST' | 'DELETE';
}): Promise<FetchApiReturn<T> | false> => {
  const res = await getOptions('space');
  if (!res) return false;
  const { hostname, subdomain } = spaceUrl;
  const apiKey = res[subdomain].apiKey;
  const url = `https://${hostname}/api/v2/${apiPath}?apiKey=${apiKey+query}`;
  const options = {
    method,
  };

  try {
    return await (await fetch(url, options)).json() as FetchApiReturn<T>;
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};

export const getIssueFetchAPI = async (issueId: string) => {
  const apiPath = `issues/${issueId}` as const;
  const method = 'GET';

  try {
    return await fetchAPI({ apiPath, method });
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
export const getIssueCommentFetchAPI = async (issueId: string, issuesDBName: string) => {
  const items = await storageManager.get(issuesDBName);
  if (!items) return false;

  const comment = items[issuesDBName];
  const query = comment && comment?.[issueId] ? `&minId=${comment[issueId]}` : '&minId=0';
  const apiPath = `issues/${issueId}/comments` as const;
  const method = 'GET';

  try {
    return await fetchAPI({ apiPath, query, method });
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
export const addWatchFetchAPI = async (issueId: string) => {
  const query = `&issueIdOrKey=${issueId}` as const;
  const apiPath = 'watchings';
  const method = 'POST';

  try {
    return await fetchAPI({ apiPath, query, method });
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
export const getWatchListFetchAPI = async () => {
  const userId = backlogResource?.['loginUser.id'] || '';
  const apiPath = `users/${userId}/watchings` as const;
  const method = 'GET';

  try {
    return await fetchAPI({ apiPath, method });
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
export const deleteWatchFetchAPI = async (watchingId: number) => {
  const apiPath = `watchings/${watchingId}` as const;
  const method = 'DELETE';

  try {
    return await fetchAPI({ apiPath, method });
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
