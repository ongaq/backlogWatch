import type { SpaceName, SpaceData } from './index';

export type CheckWatchIssues = {
  space: SpaceName | false;
  close: string | false;
  watch: string | false;
};
export type PopupNotification = {
  hostname: string;
  spaceId: string;
  issueId: string;
  commentCountDbName: string;
};
export type IssueCommentsCount = {
  [issueId: string]: number;
}
export type SpaceComments = {
  [issueDBName: string]: {
    [spaceId: string]: IssueCommentsCount | undefined;
  };
}

