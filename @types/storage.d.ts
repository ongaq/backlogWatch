import type { IssueItem } from 'index';

export type ThrowItem = (
  tableName: string
) => Promise<IssueItem[] | false>;

export type Add = (
  item: IssueItem,
  tableName: string,
) => Promise<Boolean>;

export type Common = (
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
