import type { BacklogResource } from '../@types/index';

declare global {
  interface Window {
    Backlog: {
      resource: BacklogResource;
    }
  }
}
export {};
