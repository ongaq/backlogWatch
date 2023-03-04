export type Resolve<T> = (value: T | PromiseLike<T>) => void;
export type IssueItem = {
  id: string;
  title?: string;
  assigner?: string;
  description?: string;
  time?: Date;
};
export type SpaceData = {
  name: string;
  apiKey: string;
};
export type SpaceName = {
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

export type BacklogResource = {
  "project.id": number;
  "project.key": string;
  "project.name": string;
  "project.icon": string;
  "loginUser.id": number;
  "loginUser.name": string;
  "loginUser.mailAddress": string;
  "loginUser.hasNulabAccount": boolean;
  "space.id": number;
  "space.spaceKey": string;
  "btn.star": string;
  "lbl.emoticon.people": string;
  "lbl.emoticon.nature": string;
  "lbl.emoticon.objects": string;
  "lbl.emoticon.places": string;
  naiSpaceIsWithinUserLimit: boolean;
  canInviteNulabAccount: boolean;
  isJustCreated: boolean;
  isAdmin: boolean;
  isContractorAdmin: boolean;
  "lbl.assignMe": string;
  "lbl.chosen.noResultsMatch": string;
  "lbl.a11y.reset": string;
  "lbl.globalbar.filter.board.noitem": string;
  "lbl.globalbar.filter.list.noitem": string;
  "lbl.globalbar.filter.search.placeholder.board": string;
  "lbl.globalbar.filter.search.placeholder.list": string;
  "lbl.globalbar.filter.user": string;
  "lbl.globalbar.issue.search.placeholder": string;
  "lbl.globalbar.recent.issue.noitem": string;
  "lbl.globalbar.recent.wiki.noitem": string;
  "lbl.globalbar.search.filter.deleteConfirm": string;
  "lbl.globalbar.wiki.search.placeholder": string;
  "msg.issue.store.filter.condition.invalid.argument": string;
  "loginUser.userSetting.useShortcutKey": boolean;
  projectKey: string;
  isProjectAdmin: boolean;
}

export type SpaceInfo = { status: number, result: boolean };
export type Space = {
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
