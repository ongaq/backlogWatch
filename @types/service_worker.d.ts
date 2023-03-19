import type { SpaceName, Options } from './index';

export type CheckWatchIssues = {
  space: SpaceName | false;
  options: Options['options']['options'] | false;
};
export type WatchNotification = {
  hostname: string;
  spaceId: string;
  options: Options['options']['options'];
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
  watch: 1 | 0;
  status: string;
  issueId: string;
  watchingId: number;
};
