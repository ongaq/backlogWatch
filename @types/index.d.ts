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

export type FetchAPI = ({ apiPath, query }: {
  apiPath: string,
  query?: string,
}) => Promise<unknown>
