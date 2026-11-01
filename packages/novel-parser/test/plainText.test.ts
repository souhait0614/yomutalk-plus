import assert from 'node:assert/strict';
import test from 'node:test';

import type { NovelInline } from '../src/index.ts';
import { parsePlainText } from '../src/index.ts';

const joinInlineText = (inlines: readonly NovelInline[]): string => inlines
  .map((inline) => {
    if (inline.type === 'ruby') return inline.base;
    if (inline.type === 'gaiji') return '□';
    return inline.value;
  })
  .join('');

test('converts plain text metadata and paragraphs', () => {
  const novel = parsePlainText('最初の段落\n\n次の段落\n', {
    title: '題名',
    author: '著者名',
  });

  assert.deepEqual(novel, {
    format: 'plain-text',
    title: '題名',
    author: '著者名',
    blocks: [
      {
        type: 'paragraph',
        sentences: [
          { textType: 'narration', inlines: [{ type: 'text', value: '最初の段落' }] },
        ],
      },
      { type: 'blank' },
      {
        type: 'paragraph',
        sentences: [
          { textType: 'narration', inlines: [{ type: 'text', value: '次の段落' }] },
        ],
      },
    ],
  });
});

test('keeps blank lines without treating the final newline as a blank', () => {
  const options = { title: '題名', author: null };
  const novel = parsePlainText('最初。\n\n\n次の。\n', options);
  assert.deepEqual(novel.blocks.map((block) => block.type), [
    'paragraph',
    'blank',
    'blank',
    'paragraph',
  ]);
});

test('reports block source lines including empty lines', () => {
  const source = '\uFEFF最初。\r\n \r\n\r\n次。\r終わり。';
  const sourceLines: number[] = [];
  const options = { title: '題名', author: null };
  const novel = parsePlainText(source, { ...options, onBlock: (lineIndex) => sourceLines.push(lineIndex) });
  assert.deepEqual(sourceLines, [0, 1, 2, 3, 4]);
  assert.deepEqual(novel, parsePlainText(source, options));
});

test('keeps notation-like text literally', () => {
  const novel = parsePlainText('[b:太字]と｜漢字《かんじ》と［＃傍点］', { title: '題名', author: null });
  const paragraph = novel.blocks[0];
  assert.ok(paragraph?.type === 'paragraph');

  assert.equal(
    joinInlineText(paragraph.sentences.flatMap((sentence) => sentence.inlines)),
    '[b:太字]と｜漢字《かんじ》と［＃傍点］',
  );
});
