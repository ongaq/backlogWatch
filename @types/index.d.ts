import type { Issues, IssueComment, CreatedUser } from './issues';

export type Resolve<T> = (value: T | PromiseLike<T>) => void;
export type IssueItem = {
  id: string;
  title?: string;
  assigner?: string;
  description?: string;
  time?: Date;
};
export type WatchingData = {
  /** serviceWorkerで更新時間を比較するのに必要 */
  updateTime: number;
  /** ウォッチ削除に必要なID */
  watchId: number;
};
export type SpaceData = {
  name: string;
  apiKey: string;
};
export type SpaceName = {
  /** spaceNameには *.backlog.jp の * 部分が入る */
  [spaceName: string]: SpaceData;
};
export type Options = {
  options: {
    space: SpaceName;
    options: {
      /** 課題完了時にウォッチを解除するか - 0: 解除しない, 1: 解除する */
      watch: 0 | 1;
      /** 通知ウインドウを何秒後に閉じるか - 0: 閉じない, 5-10: n秒後に閉じる */
      close: 0 | 5 | 6 | 7 | 8 | 9 | 10;
      /** ウォッチした課題を通知するか - 1: 通知する, 2: 通知しない */
      notifyWatch: 1 | 0;
      /** お知らせを通知するか - 1: 通知する, 2: 通知しない */
      notifyInfo: 1 | 0;
    };
  };
};
export type GetOptionsArg = 'space' | 'options';
export type GetOptionsReturn<T> = T extends 'space'
  ? SpaceName | false
  : T extends 'options'
  ? Options['options']['options'] | false
  : never;

export type SpaceInfo = { status: number, result: boolean };
export type Space = {
  /** spaceKeyには *.backlog.jp の * 部分が入る */
  spaceKey: string;
  name: string;
  ownerId: number;
  lang: string;
  timezone: string;
  reportSendTime: string;
  textFormattingRule: string;
  created: Date;
  updated: Date;
}
export type User = {
  id: number;
  userId: string;
  name: string;
  roleType: number;
  lang: string;
  mailAddress: string;
  nulabAccount: NulabAccount;
  keyword: string;
  lastLoginTime: Date;
};
export type NulabAccount = {
  nulabId: string;
  name: string;
  uniqueId: string;
};
/**
 * reson:
通知の種別：
1:課題の担当者に設定
2:課題にコメント
3:課題の追加
4:課題の更新
5:ファイルを追加
6:プロジェクトユーザーの追加
9:その他
10:プルリクエストの担当者に設定
11:プルリクエストにコメント
12:プルリクエストの追加
13:プルリクエストの更新
 */
export type Notification = {
  id: number;
  alreadyRead: boolean;
  reason: number;
  /** 既読かどうか。trueの場合は既読、falseの場合は未読 */
  resourceAlreadyRead: boolean;
  project: Project;
  issue: Issues;
  comment: IssueComment & {
    projectId: number;
    issueId: number;
  };
  pullRequest: null;
  pullRequestComment: null;
  sender: Omit<CreatedUser, 'nulabAccount' | 'keyword'>;
  created: Date;
};
export type Project = {
  id: number;
  projectKey: string;
  name: string;
  chartEnabled: boolean;
  useResolvedForChart: boolean;
  subtaskingEnabled: boolean;
  projectLeaderCanEditProjectLeader: boolean;
  useWiki: boolean;
  useFileSharing: boolean;
  useWikiTreeView: boolean;
  useOriginalImageSizeAtWiki: boolean;
  textFormattingRule: string;
  archived: boolean;
  displayOrder: number;
  useDevAttributes: boolean;
}
