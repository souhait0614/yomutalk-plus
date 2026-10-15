import type { NovelInline } from '@repo/novel-parser';
import type { NovelSelectionRange, NovelTextPosition } from '$lib/selectedText';

export const gaijiFallbackCharacter = '□';

export interface NovelTextOffsetRange {
  readonly start: number;
  readonly end: number;
}

// NOTE: 選択範囲の textOffset は対象の文の DOM を Range で測って数えるため、ルビの読みや空白も文字数に含まれる
export const getNovelInlineTextLength = (inline: NovelInline): number => {
  if (inline.type === 'ruby') return inline.base.length + inline.reading.length;
  if (inline.type === 'gaiji') return (inline.reading ?? gaijiFallbackCharacter).length;
  return inline.value.length;
};

export const getNovelInlinesTextLength = (inlines: readonly NovelInline[]): number => (
  inlines.reduce((total, inline) => total + getNovelInlineTextLength(inline), 0)
);

const compareNovelTextPositions = (a: NovelTextPosition, b: NovelTextPosition): number => {
  if (a.blockIndex !== b.blockIndex) return a.blockIndex - b.blockIndex;
  if (a.sentenceIndex !== b.sentenceIndex) return a.sentenceIndex - b.sentenceIndex;
  return a.textOffset - b.textOffset;
};

export const resolveSentenceHighlightRange = (
  selectionRange: NovelSelectionRange,
  blockIndex: number,
  sentenceIndex: number,
  sentenceTextLength: number,
): NovelTextOffsetRange | undefined => {
  const sentenceStart: NovelTextPosition = { blockIndex, sentenceIndex, textOffset: 0 };
  const sentenceEnd: NovelTextPosition = { blockIndex, sentenceIndex, textOffset: sentenceTextLength };
  if (compareNovelTextPositions(selectionRange.end, sentenceStart) <= 0) return undefined;
  if (compareNovelTextPositions(selectionRange.start, sentenceEnd) >= 0) return undefined;

  const start = compareNovelTextPositions(selectionRange.start, sentenceStart) <= 0
    ? 0
    : selectionRange.start.textOffset;
  const end = compareNovelTextPositions(selectionRange.end, sentenceEnd) >= 0
    ? sentenceTextLength
    : selectionRange.end.textOffset;
  if (start >= end) return undefined;
  return { start, end };
};
