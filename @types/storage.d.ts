export type issueItem = {
  id: string;
  title: string;
  assigner: string;
  description: string;
  time: Date;
};

export type ThrowItem = (
  tableName: string,
  space: string
) => Promise<issueItem[] | false>;

export type Common = (
  item: issueItem,
  tableName: string,
  space: string
) => Promise<Boolean>;

export type ItemId = {
  [itemId: string]: issueItem;
}
export type Space = {
  [space: string]: ItemId;
};
export type DataBase = {
  [tableName: string]: Space;
};
