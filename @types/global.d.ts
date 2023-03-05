import type { Space, SpaceInfo, BacklogResource, Options, GetOptionsArg, GetOptionsReturn } from './index';
import type { Issues, IssueComments } from './issues';
import type { FetchApiArg, FetchApiReturn } from './api';
import type { Watchings, WatchingsList } from './watch';
import type { SpaceComments } from './service_worker';

import { StorageManager } from '../src/js/storage';

declare global {
  interface Window {
    Backlog: {
      resource: BacklogResource;
    }
  }
  interface GlobalThis {
    // common.ts
    consoleLog: (log: any) => void;
    backlogResource: BacklogResource | null;
    spaceDomain: string | false;
    backlogLocation: {
      isHome: boolean;
      isIssue: boolean;
    };
    returnMsec: (number: number) => number;
    locationObserver: (callback: () => void) => void;
    watchControl: (element: HTMLElement, state: string) => void;
    getOptions: <T extends GetOptionsArg>(target: T) => Promise<GetOptionsReturn<T>>;
    spaceUrl: false | {
      hostname: string;
      subdomain: string;
    };

    // storage.ts
    storageManager: StorageManager;

    // api.ts
    getIssueFetchAPI: (issueId: string) => Promise<false | Issues>;
    getIssueCommentFetchAPI: (issueId: string, issuesDBName: string) => Promise<false | IssueComments>
    addWatchFetchAPI: (issueId: string) => Promise<false | Watchings>;
    getWatchListFetchAPI: () => Promise<false | WatchingsList>;
    deleteWatchFetchAPI: (watchingId: number) => Promise<false | Watchings>;
    getSpaceInfoFetchAPI: (hostname: string, apiKey: string) => Promise<SpaceInfo | (Space & SpaceInfo)>;
  }
}
// declare var globalThis: GlobalThis;
export {};
