import { Hono } from 'hono/tiny';

import type { ApiEnv } from './types.ts';
import { novels } from './novels.ts';
import { sharedNovels } from './sharedNovels.ts';
import { tts } from './tts.ts';

export type { ApiBindings, SharedFilesBucket, SharedFilesBucketObject } from './types.ts';

export const router = new Hono<ApiEnv>()
  .route('/novels', novels)
  .route('/shared-novels', sharedNovels)
  .route('/tts', tts);

export const api = new Hono<ApiEnv>().route('/api', router);

export type ApiRouter = typeof router;
