import type { SpaceName, SpaceData } from './index';
import type { IssueComment } from './issues';

export type CheckWatchIssues = {
  space: SpaceName | false;
  close: string | false;
  watch: string | false;
};
export type PopupNotification = {
  hostname: string;
  spaceId: string;
  // issueId: string;
  // commentCountDbName: string;
  watch: string;
};
export type IssueCommentsCount = {
  [issueId: string]: number;
}
export type SpaceComments = {
  [issueDBName: string]: {
    [spaceId: string]: IssueCommentsCount | undefined;
  };
}
export type BacklogCompletedWhenCancel = {
  hostname: string;
  subdomain: string;
  watch: string;
  status: string;
  issueId: string;
  watchingId: number;
};
