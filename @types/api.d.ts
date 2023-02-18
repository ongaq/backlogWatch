import { IssueComments } from './issues';

export type FetchAPI = (props: {
  apiPath: string;
  query?: string;
  method?: 'GET' | 'POST' | 'DELETE';
}) => Promise<unknown>

export type FetchIssueCommentAPI = (
  issueId: string,
  issuesDBName: string
) => Promise<IssueComments | false>;
