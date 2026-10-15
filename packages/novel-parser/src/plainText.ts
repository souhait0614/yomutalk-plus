import type { NovelBlock, NovelDocument, PlainTextOptions } from './types.ts';
import { normalizeSource, splitSentences } from './shared.ts';

export function parsePlainText(
  source: string,
  options: PlainTextOptions,
): NovelDocument {
  const blocks: NovelBlock[] = [];
  for (const [lineIndex, line] of normalizeSource(source).split('\n').entries()) {
    if (line.trim() === '') continue;
    blocks.push({
      type: 'paragraph',
      sentences: splitSentences([{ type: 'text', value: line }]),
    });
    options.onBlock?.(lineIndex);
  }
  return {
    format: 'plain-text',
    title: options.title,
    author: options.author,
    blocks,
  };
}
