import type { IssueItem, Options } from 'index';

export type ThrowItem = (
  spaceId: string,
  tableName: string
) => Promise<IssueItem[] | false>;

export type Add = (
  spaceId: string,
  item: IssueItem | CommentCount,
  tableName: string,
) => Promise<Boolean>;

export type Common = (
  spaceId: string,
  itemId: string,
  tableName: string,
) => Promise<Boolean>;

export type ItemId = {
  [itemId: string]: IssueItem;
}
export type Space = {
  [space: string]: ItemId;
};
export type DataBase = {
  [tableName: string]: Space;
};

export type GetArg = 'issues' | 'watching' | 'projects' | 'options' | string;
export type GetReturn<T> = T extends 'issues'
  ? IssuesDB | false
  : T extends 'watching'
  ? WatchingDB | false
  : T extends 'projects'
  ? ProjectsDB | false
  : T extends 'options'
  ? Options | false
  : T extends string
  ? Record<string, any> | false
  : never;

export type IssuesDB = {
  [tableName: string]: {
    [spaceName: string]: {
      [issueId: string]: IssueItem;
    }
  }
};
export type WatchingDB = {
  [tableName: string]: {
    [spaceName: string]: {
      [issueId: string]: number;
    }
  }
};
export type ProjectsDB = {
  [tableName: string]: {
    [spaceName: string]: {
      [issueId: string]: IssueItem;
    }
  }
};
