import type { NovelDocument } from '@repo/novel-parser';
import { computeContentHash } from '$lib/utils/hash';

import type { NovelWritingMode } from '../types';
import { hashireMerosuDocument, hashireMerosuSource } from './hashireMerosu';

export interface BundledNovelDocument {
  readonly document: NovelDocument;
  readonly source: string;
  readonly hash: string;
  readonly writingMode: NovelWritingMode;
}

const createBundledNovelDocument = async (
  document: NovelDocument,
  source: string,
  writingMode: NovelWritingMode,
): Promise<BundledNovelDocument> => ({
  document,
  source,
  hash: await computeContentHash(new TextEncoder().encode(source).buffer),
  writingMode,
});

export const bundledNovelDocuments: readonly BundledNovelDocument[] = [
  await createBundledNovelDocument(hashireMerosuDocument, hashireMerosuSource, 'vertical-rl'),
];
