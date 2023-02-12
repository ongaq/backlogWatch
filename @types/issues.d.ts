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
  assignee: Assignee;
  category: Category[];
  versions: any[];
  milestone: any[];
  startDate: null;
  dueDate: Date;
  estimatedHours: null;
  actualHours: null;
  parentIssueId: null;
  createdUser: Assignee;
  created: Date;
  updatedUser: Assignee;
  updated: Date;
  customFields: any[];
  attachments: any[];
  sharedFiles: any[];
  stars: any[];
};
export type Assignee = {
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
