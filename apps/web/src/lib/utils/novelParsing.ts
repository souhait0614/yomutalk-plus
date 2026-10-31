import type { NovelDocument } from '@repo/novel-parser';
import type { LoadedNovelDocumentFileType } from '$lib/db';
import { parseAozoraText, parsePixivNovel, parsePlainText } from '@repo/novel-parser';

interface ParseNovelDocumentOptions {
  readonly title: string;
  readonly onBlock?: (sourceLineIndex: number) => void;
}

/** 保存された小説を、ファイル形式に合わせて解析する。 */
export const parseNovelDocument = (
  fileType: LoadedNovelDocumentFileType,
  source: string,
  options: ParseNovelDocumentOptions,
): NovelDocument => {
  switch (fileType) {
    case 'aozoratext': return parseAozoraText(source, options);
    case 'pixivnovel': return parsePixivNovel(source, { title: options.title, author: null, onBlock: options.onBlock });
    default: return parsePlainText(source, { title: options.title, author: null, onBlock: options.onBlock });
  }
};
