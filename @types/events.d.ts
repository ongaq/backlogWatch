// import { GetOptionsResult } from './index';
import { SpaceName, SpaceData } from './index';
// import { IssueComments } from './issues';

export type CheckWatchIssues = {
  space: SpaceName | false;
  close: string | false;
  watch: string | false;
};
export type PopupNotification = {
  issueId: string;
  issuesDBName: string;
};
export type IssueCommentsCount = {
  [issueId: string]: number;
}
export type SpaceComments = {
  [spaceId: string]: IssueCommentsCount | undefined;
}

