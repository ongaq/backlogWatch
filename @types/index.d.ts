export type Resolve<T> = (value: T | PromiseLike<T>) => void;
export type IssueItem = {
  id: string;
  title?: string;
  assigner?: string;
  description?: string;
  time?: Date;
};
export type SpaceName = {
  [spaceName: string]: {
    name: string;
    apiKey: string;
  };
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
