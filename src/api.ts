import { spaceUrl, consoleLog, getOptions } from './common';
import storageManager from './storage';
import { FetchIssueCommentAPI } from '../@types/api';
import { SpaceName, FetchAPI } from '../@types/index';
import { IssueComments } from '../@types/issues';

export const fetchAPI: FetchAPI = async ({ apiPath, query }) => {
  const res = await getOptions('space') as false | SpaceName;
  if (!res) return;
  const { hostname, subdomain } = spaceUrl;
  const apiKey = res[subdomain].apiKey;
  const url = `https://${hostname}/api/v2/${apiPath}?apiKey=${apiKey+query}`;

  try {
    const result = await (await fetch(url)).json();
    return result;
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
    const result = await fetchAPI({ apiPath, query }) as IssueComments;
    return result;
  } catch (e) {
    consoleLog(String(e));
    return false;
  }
};
