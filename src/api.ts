import type { FetchApiArg, FetchApiReturn } from '../@types/api';
import type { Space, SpaceInfo } from '../@types/index';
import { spaceUrl, consoleLog, getOptions, getBacklogUserId } from './common';

const fetchAPI = async <T extends FetchApiArg>({ apiPath, query = '', method, hostname = '' }: {
  apiPath: T;
  query?: string;
  method: 'GET' | 'POST' | 'DELETE';
  hostname?: string;
}): Promise<FetchApiReturn<T> | false> => {
  const space = await getOptions('space');
  const result = typeof hostname === 'string' ? spaceUrl(hostname) : spaceUrl();
  if (!space || !result.subdomain || !result.hostname) {
    consoleLog('fetchAPI failed:', { space, result, hostname, apiPath });
    return false;
  }

  const apiKey = space[result.subdomain].apiKey;
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

export const getIssueFetchAPI = async (issueId: string, hostname: string) => {
  const apiPath = `issues/${issueId}` as const;
  const method = 'GET';

  try {
    return await fetchAPI({ apiPath, method, hostname });
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
export const getIssueCommentFetchAPI = async (issueId: string, hostname: string) => {
  const query = '&minId=0';
  const apiPath = `issues/${issueId}/comments` as const;
  const method = 'GET';

  try {
    return await fetchAPI({ apiPath, query, method, hostname });
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
    return await fetchAPI({ apiPath, query, method, });
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
export const getWatchListFetchAPI = async (hostname: string, userId?: number | false) => {
  if (typeof userId === 'undefined') {
    userId = await getBacklogUserId(hostname);
    if (!userId) return false;
  }
  const apiPath = `users/${userId}/watchings` as const;
  const method = 'GET';
  const query = '&count=100';

  try {
    return await fetchAPI({ apiPath, method, query, hostname });
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
export const deleteWatchFetchAPI = async (watchingId: number, hostname?: string) => {
  const apiPath = `watchings/${watchingId}` as const;
  const method = 'DELETE';

  try {
    return await fetchAPI({ apiPath, method, hostname });
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
export const getUserInfoFetchAPI = async (hostname: string) => {
  const apiPath = 'users/myself' as const;
  const method = 'GET';

  try {
    return await fetchAPI({ apiPath, method, hostname });
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
export const getNotificationsFetchAPI = async (hostname: string) => {
  const query = '&count=10';
  const apiPath = 'notifications';
  const method = 'GET';

  try {
    return await fetchAPI({ apiPath, query, method, hostname });
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
