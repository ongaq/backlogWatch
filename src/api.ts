import { spaceUrl, consoleLog, getOptions, backlogResource } from './common';
import storageManager from './storage';
import { FetchAPI, FetchIssueCommentAPI } from '../@types/api';
import { SpaceName } from '../@types/index';
import { IssueComments } from '../@types/issues';
import { Watchings, WatchingsList } from '../@types/watch';

export const fetchAPI: FetchAPI = async ({ apiPath, query, method = 'GET' }) => {
  const res = await getOptions('space') as false | SpaceName;
  if (!res) return;
  const { hostname, subdomain } = spaceUrl;
  const apiKey = res[subdomain].apiKey;
  const url = `https://${hostname}/api/v2/${apiPath}?apiKey=${apiKey+query}`;
  const options = {
    method,
  };

  try {
    return await (await fetch(url, options)).json();
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
export const fetchIssueCommentAPI: FetchIssueCommentAPI = async (issueId, issuesDBName) => {
  const items = await storageManager.get(issuesDBName);
  if (!items) return false;

  const comment = items[issuesDBName];
  const query = comment && comment?.[issueId] ? `&minId=${comment[issueId]}` : '&minId=0';
  const apiPath = `issues/${issueId}/comments`;

  try {
    return await fetchAPI({ apiPath, query }) as IssueComments;
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
export const addWatchAPI = async (issueId: string): Promise<Watchings | false> => {
  const query = `&issueIdOrKey=${issueId}`;
  const apiPath = 'watchings';
  const method = 'POST';

  try {
    return await fetchAPI({ apiPath, query, method }) as Watchings;
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
export const getWatchListAPI = async () => {
  const userId = backlogResource?.['loginUser.id'] || '';
  const apiPath = `users/${userId}/watchings`;
  const method = 'GET';

  try {
    return await fetchAPI({ apiPath, method }) as WatchingsList;
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
export const deleteWatchAPI = async (watchingId: number) => {
  const apiPath = `watchings/${watchingId}`; // Watchings.id
  const method = 'DELETE';

  try {
    return await fetchAPI({ apiPath, method }) as Watchings;
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
