export type CreateTag = {
  name: string;
  value: string | boolean;
  grow: string;
  date?: Date;
};
export type Tags = {
  'ステータス': string | undefined;
  '未読/既読': boolean;
  '優先度': string | undefined;
  '最終更新日時': Date | undefined;
  '開始日': Date | undefined;
  '期限日': Date | undefined;
};
