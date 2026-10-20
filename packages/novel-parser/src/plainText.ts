import type { NovelBlock, NovelDocument, PlainTextOptions } from './types.ts';
import { normalizeSource, splitSentences } from './shared.ts';

export function parsePlainText(
  source: string,
  options: PlainTextOptions,
): NovelDocument {
  const blocks: NovelBlock[] = [];
  const lines = normalizeSource(source).split('\n');
  // NOTE: 末尾の改行は最後の行の終端であり、空行ではない
  if (lines.at(-1) === '') lines.pop();
  for (const [lineIndex, line] of lines.entries()) {
    blocks.push(line.trim() === ''
      ? { type: 'blank' }
      : {
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
