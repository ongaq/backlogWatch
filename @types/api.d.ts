import type { Issues, IssueComments } from './issues';
import type { Watchings } from './watch';
import type { Space } from './index';

export type FetchApiArg =
  `issues/${string}/comments` |
  `issues/${string}` |
  `watchings/${string}` |
  'watchings' |
  `users/${string}/watchings`;

export type FetchApiReturn<T> =
  T extends `issues/${string}/comments`
  ? IssueComments | false
  : T extends `issues/${string}`
  ? Issues | false
  : T extends (`watchings/${string}` | 'watchings')
  ? Watchings | false
  : T extends `users/${string}/watchings`
  ? Watchings[] | false
  : never;
