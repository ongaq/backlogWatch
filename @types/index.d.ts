export type Resolve<T> = (value: T | PromiseLike<T>) => void;
export type IssueItem = {
  id: string;
  title?: string;
  assigner?: string;
  description?: string;
  time?: Date;
};
export type CommentCount = {
  [issueId: string]: number;
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
      close: string;
      watch: string;
    };
  };
};

export type GetOptionsArg = 'space' | 'close' | 'watch';
export type GetOptionsReturn<T> = T extends 'space'
  ? SpaceName | false
  : T extends ('close' | 'watch')
  ? string | false
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
