import type { IssueItem, Options, User, CommentCount } from 'index';
import type { ProjectItem } from 'projects';

export type Add = (
  spaceId: string,
  item: CommentCount,
  tableName: string,
) => Promise<boolean>;

export type Common = (
  spaceId: string,
  itemId: string,
  tableName: string,
) => Promise<boolean>;

export type ItemId = {
  [itemId: string]: number | CommentCount;
}
export type Space = {
  [space: string]: ItemId;
};
export type DataBase = {
  [tableName: string]: Space;
};

export type GetArg = 'watching' | 'options' | 'user';
export type GetReturn<T> = T extends 'watching'
  ? WatchingDB | false
  : T extends 'options'
  ? Options | false
  : T extends 'user'
  ? UserDB | false
  : never;

export type WatchingDB = {
  [tableName: string]: {
    [spaceName: string]: {
      [issueId: string]: number;
    }
  }
};
export type UserDB = {
  [tableName: string]: {
    [spaceName: string]: {
      user: User['id']
    }
  }
};
