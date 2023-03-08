import type { Issues } from './issues';

/** response: /api/v2/watchings */
export type Watchings = {
  id: number;
  resourceAlreadyRead: boolean;
  note: string | null;
  type: string;
  issue: Issues;
  lastContentUpdated: Date;
  created: Date;
  updated: Date;
  errors?: {};
}
/** response: /api/v2/users/:userId/watchings */
export type WatchingsList = Watchings[];
