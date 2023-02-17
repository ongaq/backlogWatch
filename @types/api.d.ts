import { IssueComments } from './issues';

export type FetchIssueCommentAPI = (
  issueId: string,
  issuesDBName: string
) => Promise<IssueComments | false>;
