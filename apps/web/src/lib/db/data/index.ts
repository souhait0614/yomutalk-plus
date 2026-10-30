import type { LoadedNovelDocumentFileType, NovelWritingMode } from '../types';
import { hashireMerosuSource } from './hashireMerosu';

export interface BundledNovelDocument {
  readonly title: string;
  readonly fileType: LoadedNovelDocumentFileType;
  readonly source: string;
  readonly writingMode: NovelWritingMode;
}

export const bundledNovelDocuments: readonly BundledNovelDocument[] = [
  {
    title: '走れメロス',
    fileType: 'aozoratext',
    source: hashireMerosuSource,
    writingMode: 'vertical-rl',
  },
];
