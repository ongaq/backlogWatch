import type { Issues, IssueComment } from './issues';
import type { Watchings } from './watch';
import type { Space, User } from './index';

export type FetchApiArg =
  `issues/${string}/comments` |
  `issues/${string}` |
  `watchings/${string}` |
  'watchings' |
  `users/${string}/watchings` |
  `users/myself` |
  string;

export type FetchApiReturn<T> =
  T extends `issues/${string}/comments`
  ? IssueComment[] | false
  : T extends `issues/${string}`
  ? Issues | false
  : T extends (`watchings/${string}` | 'watchings')
  ? Watchings | false
  : T extends `users/${string}/watchings`
  ? Watchings[] | false
  : T extends 'users/myself'
  ? User | false
  : T extends string
  ? any | false
  : never;
