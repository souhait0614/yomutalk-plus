import type { RegisteredText } from '$lib/selectedText';

export type LoadedNovelDocumentFileType = 'plaintext' | 'aozoratext';

export type NovelWritingMode = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';

interface LoadedNovelDocumentBase {
  id: string;
  title: string;
  fileType: LoadedNovelDocumentFileType;
  fileData: File;
  writingMode: NovelWritingMode;
  hash: string;
  sortOrder: number;
}

export interface LoadedFileNovelDocument extends LoadedNovelDocumentBase {
  type: 'file';
}

export interface LoadedInternalNovelDocument extends LoadedNovelDocumentBase {
  type: 'internal';
  novelId: string;
}

export type LoadedNovelDocument = LoadedFileNovelDocument | LoadedInternalNovelDocument;

export type Bookmark = RegisteredText & {
  id: string;
  folderId: string | null;
};

export interface BookmarkFolder {
  id: string;
  name: string;
  sortOrder: number;
}
