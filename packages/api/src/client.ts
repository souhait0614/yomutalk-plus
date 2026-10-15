import { hc } from 'hono/client';

import type { ApiRouter } from './index.ts';

export { computeContentHash } from './hash.ts';
export type {
  InternalNovelEntry,
  InternalNovelFileType,
  InternalNovelInfo,
  InternalNovelVariant,
  InternalNovelVariantGroup,
} from './internalNovels.ts';
export { internalNovelList, isInternalNovelVariantGroup, toInternalNovelVariantInfo } from './internalNovels.ts';

export const apiClient = hc<ApiRouter>('/api');
