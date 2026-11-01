import type { LoadedNovelDocumentFileType } from '$lib/db';

/**
 * 保存するファイルの名前。
 * ファイル名がそのままタイトルになる形式はタイトルをそのまま使い、
 * 中身にタイトルを持つ青空文庫形式だけ拡張子を付ける。
 */
export const getNovelFileName = (fileType: LoadedNovelDocumentFileType, title: string): string => (
  fileType === 'aozoratext' ? `${title}.txt` : title
);
