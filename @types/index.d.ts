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
export type GetOptionsResult = string | false | SpaceName;
export type GetOptions = (
  target: 'space' | 'close' | 'watch'
) => Promise<GetOptionsResult>
export type FetchAPI = ({ apiPath, query }: {
  apiPath: string,
  query?: string,
}) => Promise<unknown>
