import type { SpaceName, Options, WatchingData } from './index';
import type { DataBase } from './storage';
import type { Watchings } from './watch';

export type CheckWatchIssues = {
  space: SpaceName | false;
  options: Options['options']['options'] | false;
};
export type WatchNotification = {
  hostname: string;
  spaceId: string;
  options: Options['options']['options'];
};
export type BacklogCompletedWhenCancel = {
  hostname: string;
  subdomain: string;
  watch: 1 | 0;
  status: string;
  issueId: string;
  watchingId: number;
};
export type UpdateWatchDB = {
  watchDB: DataBase;
  spaceId: string;
  issueId: string;
  lastContentUpdated: Date;
  watching?: Watchings;
};
