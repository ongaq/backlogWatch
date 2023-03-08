export type CreatedUser = {
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
export type Category = {
  id: number;
  name: string;
  displayOrder: number;
};
export type IssueType = {
  id: number;
  projectId: number;
  name: string;
  color: string;
  displayOrder: number;
};
export type Priority = {
  id: number;
  name: string;
};
export type Issues = {
  id: number;
  projectId: number;
  issueKey: string;
  keyId: number;
  issueType: IssueType;
  summary: string;
  description: string;
  resolution: null;
  priority: Priority;
  status: IssueType;
  assignee: CreatedUser;
  category: Category[];
  versions: any[];
  milestone: any[];
  startDate: null;
  dueDate: Date;
  estimatedHours: null;
  actualHours: null;
  parentIssueId: null;
  createdUser: CreatedUser;
  created: Date;
  updatedUser: CreatedUser;
  updated: Date;
  customFields: any[];
  attachments: any[];
  sharedFiles: any[];
  stars: any[];
};
export type ChangeLog = {
  field: string;
  newValue: string;
  originalValue: null;
};
export type IssueComment = {
  id: number;
  content: string;
  changeLog: ChangeLog[] | null;
  createdUser: CreatedUser;
  created: Date;
  updated: Date;
  stars: any[];
  notifications: any[];
};
export type IssueComments = IssueComment[];

export type WatchStyle = {
  heartElement: HTMLElement;
  textElement: HTMLElement;
};
export type WatchState = {
  issueId: string;
  watchingId?: number;
};
