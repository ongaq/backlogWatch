import type { IssueItem } from 'index';

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
