import type { FetchApiArg, FetchApiReturn } from '../../@types/api';
import type { SpaceComments } from '../../@types/service_worker';
import type { Space, SpaceInfo } from '../../@types/index';
import { spaceUrl, consoleLog, getOptions, backlogResource } from './common.js';
import storageManager from './storage.js';

const fetchAPI = async <T extends FetchApiArg>({ apiPath, query, method }: {
  apiPath: T;
  query?: string;
  method: 'GET' | 'POST' | 'DELETE';
}): Promise<FetchApiReturn<T> | false> => {
  const res = await getOptions('space');
  if (!res) return false;
  const result = spaceUrl;
  if (!result) return false;

  const apiKey = res[result.subdomain].apiKey;
  const url = `https://${result.hostname}/api/v2/${apiPath}?apiKey=${apiKey+query}`;
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
  const items = await storageManager.get(issuesDBName) as SpaceComments | false;
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
export const getSpaceInfoFetchAPI = async (hostname: string, apiKey: string) => {
  const url = `https://${hostname}/api/v2/space?apiKey=${apiKey}`;

  return await fetch(url).then(async(response): Promise<SpaceInfo | (Space & SpaceInfo)> => {
    if (response.ok) {
      return { status: response.status, result: true, ...await response.json() };
    } else {
      return { status: response.status, result: false } as unknown as Promise<SpaceInfo>;
    }
  });
};
