import type { FetchApiArg, FetchApiReturn } from '../@types/api';
import type { SpaceComments } from '../@types/service_worker';
import type { Space, SpaceInfo } from '../@types/index';
import { spaceUrl, consoleLog, getOptions, getBacklogUserId } from './common';
import storageManager from './storage';

const fetchAPI = async <T extends FetchApiArg>({ apiPath, query = '', method, hostname = '' }: {
  apiPath: T;
  query?: string;
  method: 'GET' | 'POST' | 'DELETE';
  hostname?: string;
}): Promise<FetchApiReturn<T> | false> => {
  const space = await getOptions('space');
  const result = hostname ? spaceUrl(hostname) : spaceUrl();
  if (!space || !result) {
    console.log('fetchAPI failed:', space, result, hostname, apiPath);
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
export const getIssueCommentFetchAPI = async (issueId: string, commentCountDbName: string, hostname: string) => {
  const items = await storageManager.get(commentCountDbName) as SpaceComments | false;
  const url = spaceUrl(hostname);
  if (!items || !Object.keys(items).length || !url) return false;

  const subdomain = url.subdomain;
  const comment = items[commentCountDbName][subdomain];
  const query = comment && comment?.[issueId] ? `&minId=${comment[issueId]}` : '&minId=0';
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
export const getWatchListFetchAPI = async () => {
  const userId = getBacklogUserId();
  if (!userId) return false;
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
