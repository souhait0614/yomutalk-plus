/// <reference types="vite-plugin-pwa/client" />

import type { SharedFilesBucket } from '@repo/api';

import type { MenuPageData } from './routes/(menu)/_types/page-data';

type AppPageData = MenuPageData;

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface PageData extends AppPageData {}
    // interface PageState {}
    interface Platform {
      env: {
        SHARED_FILES?: SharedFilesBucket;
      };
    }
  }
}

export {};
