import type { RegisteredText } from '$lib/selectedText';
import { parseAozoraText } from '@repo/novel-parser';
import { m } from '$lib/paraglide/messages';
import { copyRegisteredText } from '$lib/selectedText';
import { computeContentHash } from '$lib/utils/hash';
import { decodeTextFile } from '$lib/utils/textEncoding';
import { Dexie } from 'dexie';
import { v7 as uuidv7 } from 'uuid';

import type { Bookmark, BookmarkFolder, LoadedNovelDocument, LoadedNovelDocumentFileType, NovelWritingMode } from './types';
import { bundledNovelDocuments } from './data';

export class AppDatabase extends Dexie {
  bookmarks!: Dexie.Table<Bookmark, string>;
  bookmarkFolders!: Dexie.Table<BookmarkFolder, string>;
  loadedNovelDocuments!: Dexie.Table<LoadedNovelDocument, string>;

  constructor() {
    super('AppDatabase');
    this.version(1).stores({
      bookmarks: '&id, documentId, folderId',
      bookmarkFolders: '&id, &name, sortOrder',
      loadedNovelDocuments: '&id, title, type, fileType, sortOrder',
    });
  }
}

const appDatabase = new AppDatabase();

const getBookmarks = async (): Promise<Bookmark[]> => {
  const bookmarks = await appDatabase.bookmarks.orderBy('id').toArray();
  return bookmarks;
};

const addBookmark = (registeredText: RegisteredText, folderId: string | null = null): Promise<string> => {
  return appDatabase.transaction('rw', appDatabase.bookmarks, appDatabase.bookmarkFolders, async () => {
    if (folderId !== null && !(await appDatabase.bookmarkFolders.get(folderId))) {
      throw new Error(`Bookmark folder not found: ${folderId}`);
    }
    return appDatabase.bookmarks.add({
      ...copyRegisteredText(registeredText),
      id: uuidv7(),
      folderId,
    });
  });
};

const deleteBookmark = (id: string): Promise<void> => appDatabase.bookmarks.delete(id);

const countBookmarksByDocumentId = (documentId: string): Promise<number> => (
  appDatabase.bookmarks.where('documentId').equals(documentId).count()
);

const deleteBookmarksByDocumentId = async (documentId: string): Promise<void> => {
  await appDatabase.bookmarks.where('documentId').equals(documentId).delete();
};

const getBookmarkFolders = async (): Promise<BookmarkFolder[]> => {
  const folders = await appDatabase.bookmarkFolders.orderBy('sortOrder').toArray();
  return folders;
};

const addBookmarkFolder = async (name: string): Promise<string> => {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Bookmark folder name is required');

  return appDatabase.transaction('rw', appDatabase.bookmarkFolders, async () => {
    const folders = await appDatabase.bookmarkFolders.toArray();
    const lastSortOrder = Math.max(-1, ...folders.map(({ sortOrder }) => sortOrder));
    return appDatabase.bookmarkFolders.add({
      id: uuidv7(),
      name: normalizedName,
      sortOrder: lastSortOrder + 1,
    });
  });
};

const deleteBookmarkFolder = async (id: string): Promise<void> => {
  await appDatabase.transaction('rw', appDatabase.bookmarks, appDatabase.bookmarkFolders, async () => {
    await appDatabase.bookmarks.where('folderId').equals(id).modify({ folderId: null });
    await appDatabase.bookmarkFolders.delete(id);
  });
};

const setBookmarkFolder = async (bookmarkId: string, folderId: string | null): Promise<void> => {
  await appDatabase.transaction('rw', appDatabase.bookmarks, appDatabase.bookmarkFolders, async () => {
    if (folderId !== null && !(await appDatabase.bookmarkFolders.get(folderId))) {
      throw new Error(`Bookmark folder not found: ${folderId}`);
    }
    await appDatabase.bookmarks.update(bookmarkId, { folderId });
  });
};

const getLoadedNovelDocuments = async (): Promise<LoadedNovelDocument[]> => {
  const documents = await appDatabase.loadedNovelDocuments.orderBy('sortOrder').toArray();
  return documents;
};

const getNextSortOrder = async (): Promise<number> => {
  const documents = await appDatabase.loadedNovelDocuments.orderBy('sortOrder').toArray();
  return Math.max(-1, documents.at(-1)?.sortOrder ?? -1) + 1;
};

const getLoadedNovelDocumentFileTitle = async (
  fileType: LoadedNovelDocumentFileType,
  fileData: File,
): Promise<string> => {
  switch (fileType) {
    case 'plaintext': {
      return fileData.name;
    }
    case 'aozoratext': {
      const textContent = await decodeTextFile(fileData);
      const novelDocument = parseAozoraText(textContent);
      return novelDocument.title || fileData.name;
    }
    default: {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }
};

const addLoadedNovelDocumentFromFile = async (
  fileType: LoadedNovelDocumentFileType,
  fileData: File,
  writingMode: NovelWritingMode,
  isEditLocked = false,
): Promise<string> => {
  const title = await getLoadedNovelDocumentFileTitle(fileType, fileData);
  const hash = await computeContentHash(await fileData.arrayBuffer());

  return appDatabase.transaction('rw', appDatabase.loadedNovelDocuments, async () => (
    appDatabase.loadedNovelDocuments.add({
      id: uuidv7(),
      type: 'file',
      fileType,
      fileData,
      writingMode,
      hash,
      title,
      isEditLocked,
      sortOrder: await getNextSortOrder(),
    })
  ));
};

const updateLoadedNovelDocumentFromFile = async (
  id: string,
  fileType: LoadedNovelDocumentFileType,
  fileData: File,
  writingMode: NovelWritingMode,
  expectedHash?: string,
): Promise<void> => {
  const title = await getLoadedNovelDocumentFileTitle(fileType, fileData);
  const hash = await computeContentHash(await fileData.arrayBuffer());

  await appDatabase.transaction('rw', appDatabase.loadedNovelDocuments, async () => {
    const document = await appDatabase.loadedNovelDocuments.get(id);
    if (!document) throw new Error('Novel document not found');
    if (document.type === 'internal') throw new Error(m.editor_internal_not_editable());
    if (document.isEditLocked) throw new Error(m.editor_edit_locked());
    if (expectedHash !== undefined && document.hash !== expectedHash) {
      throw new Error(m.editor_stale_document());
    }
    await appDatabase.loadedNovelDocuments.put({
      id,
      type: 'file',
      fileType,
      fileData,
      writingMode,
      hash,
      title,
      isEditLocked: document.isEditLocked ?? false,
      sortOrder: document.sortOrder,
    });
  });
};

const setLoadedNovelDocumentEditLocked = async (id: string, isEditLocked: boolean): Promise<void> => {
  await appDatabase.transaction('rw', appDatabase.loadedNovelDocuments, async () => {
    const document = await appDatabase.loadedNovelDocuments.get(id);
    if (!document) throw new Error('Novel document not found');
    if (document.type === 'internal') throw new Error(m.editor_internal_not_editable());
    await appDatabase.loadedNovelDocuments.put({ ...document, isEditLocked });
  });
};

interface AddLoadedInternalNovelDocumentParams {
  novelId: string;
  title: string;
  fileType: LoadedNovelDocumentFileType;
  fileData: File;
  writingMode: NovelWritingMode;
  hash: string;
}

const addLoadedInternalNovelDocument = async (params: AddLoadedInternalNovelDocumentParams): Promise<string> => (
  appDatabase.transaction('rw', appDatabase.loadedNovelDocuments, async () => (
    appDatabase.loadedNovelDocuments.add({
      id: uuidv7(),
      type: 'internal',
      ...params,
      sortOrder: await getNextSortOrder(),
    })
  ))
);

interface UpdateLoadedInternalNovelDocumentParams {
  title: string;
  fileType: LoadedNovelDocumentFileType;
  fileData: File;
  hash: string;
}

const updateLoadedInternalNovelDocument = async (
  id: string,
  params: UpdateLoadedInternalNovelDocumentParams,
): Promise<void> => {
  await appDatabase.loadedNovelDocuments.update(id, params);
};

const deleteLoadedNovelDocument = async (id: string): Promise<void> => {
  await appDatabase.transaction('rw', appDatabase.bookmarks, appDatabase.loadedNovelDocuments, async () => {
    await appDatabase.bookmarks.where('documentId').equals(id).delete();
    await appDatabase.loadedNovelDocuments.delete(id);
  });
};

const moveLoadedNovelDocument = async (id: string, direction: 'up' | 'down'): Promise<void> => {
  await appDatabase.transaction('rw', appDatabase.loadedNovelDocuments, async () => {
    const documents = await getLoadedNovelDocuments();
    const currentIndex = documents.findIndex((document) => document.id === id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (!documents[currentIndex] || !documents[targetIndex]) return;

    [documents[currentIndex], documents[targetIndex]] = [documents[targetIndex], documents[currentIndex]];
    await appDatabase.loadedNovelDocuments.bulkPut(documents.map((document, sortOrder) => ({
      ...document,
      sortOrder,
    })));
  });
};

const resetDatabase = async (): Promise<void> => {
  await appDatabase.delete();
  await appDatabase.open();
};

appDatabase.on('populate', (transaction) => {
  const table = transaction.table<LoadedNovelDocument, string>('loadedNovelDocuments');
  const additions = bundledNovelDocuments.map(({ document, source, hash, writingMode }, sortOrder) => {
    const bytes = new TextEncoder().encode(source);
    return table.add({
      id: uuidv7(),
      type: 'file',
      fileType: document.format === 'aozora-text' ? 'aozoratext' : 'plaintext',
      fileData: new File([bytes], `${document.title}.txt`, { type: 'text/plain;charset=utf-8' }),
      writingMode,
      hash,
      title: document.title,
      sortOrder,
    });
  });
  return Promise.all(additions);
});

appDatabase.open().catch((error) => {
  console.error('Failed to open the database:', error);
});

export {
  addBookmark,
  addBookmarkFolder,
  addLoadedInternalNovelDocument,
  addLoadedNovelDocumentFromFile,
  appDatabase,
  countBookmarksByDocumentId,
  deleteBookmark,
  deleteBookmarkFolder,
  deleteBookmarksByDocumentId,
  deleteLoadedNovelDocument,
  getBookmarkFolders,
  getBookmarks,
  getLoadedNovelDocuments,
  moveLoadedNovelDocument,
  resetDatabase,
  setBookmarkFolder,
  setLoadedNovelDocumentEditLocked,
  updateLoadedInternalNovelDocument,
  updateLoadedNovelDocumentFromFile,
};
export type * from './types';
