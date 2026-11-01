import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import type { EmphasisMark, NovelBlock, NovelInline } from '../src/index.ts';
import { parsePixivNovel } from '../src/index.ts';

const parseBlocks = (source: string): NovelBlock[] => parsePixivNovel(source, {
  title: 'テスト',
  author: null,
}).blocks;

const joinVisibleText = (inlines: readonly NovelInline[]): string => inlines
  .map((inline) => {
    if (inline.type === 'text' || inline.type === 'bracket' || inline.type === 'space') return inline.value;
    return '';
  })
  .join('');

const parseInlines = (source: string): NovelInline[] => {
  const block = parseBlocks(source)[0];
  assert.ok(block?.type === 'paragraph');

  return block.sentences.flatMap((sentence) => sentence.inlines);
};

test('sets the pixiv format and metadata', () => {
  const novel = parsePixivNovel('本文。', { title: '題名', author: '著者' });
  assert.equal(novel.format, 'pixiv-novel');
  assert.equal(novel.title, '題名');
  assert.equal(novel.author, '著者');
});

test('converts a chapter line into a heading', () => {
  assert.deepEqual(parseBlocks('  [chapter:第一章]'), [
    {
      type: 'heading',
      level: 1,
      sentences: [{ textType: 'heading', inlines: [{ type: 'text', value: '第一章' }] }],
    },
  ]);
});

test('appends the rest of the line to the chapter title', () => {
  assert.deepEqual(parseBlocks('[chapter:第一章]出会い'), [
    {
      type: 'heading',
      level: 1,
      sentences: [{ textType: 'heading', inlines: [{ type: 'text', value: '第一章出会い' }] }],
    },
  ]);
});

test('keeps a chapter tag literal when it is not at the line start', () => {
  assert.deepEqual(parseInlines('前[chapter:章]後'), [
    { type: 'text', value: '前[chapter:章]後' },
  ]);
});

test('drops a chapter line without a title', () => {
  assert.deepEqual(parseBlocks('[chapter:]'), []);
});

test('converts ruby with and without spaces', () => {
  assert.deepEqual(parseInlines('彼は[[rb:漢字 > かんじ]]を書いた。'), [
    { type: 'text', value: '彼は' },
    { type: 'ruby', base: '漢字', reading: 'かんじ' },
    { type: 'text', value: 'を書いた。' },
  ]);
  assert.deepEqual(parseInlines('[[rb:pixiv>ピクシブ]]'), [
    { type: 'ruby', base: 'pixiv', reading: 'ピクシブ' },
  ]);
});

test('splits ruby at the last angle bracket', () => {
  assert.deepEqual(parseInlines('[[rb:a > b > c]]'), [
    { type: 'ruby', base: 'a > b', reading: 'c' },
  ]);
});

test('converts bold and keeps the spaces inside', () => {
  assert.deepEqual(parseInlines('[b: 太字 ]'), [
    { type: 'space', value: ' ', style: { bold: true } },
    { type: 'text', value: '太字', style: { bold: true } },
    { type: 'space', value: ' ', style: { bold: true } },
  ]);
});

test('converts italic', () => {
  assert.deepEqual(parseInlines('a[i:斜体]b'), [
    { type: 'text', value: 'a' },
    { type: 'text', value: '斜体', style: { italic: true } },
    { type: 'text', value: 'b' },
  ]);
});

test('drops style tags without content', () => {
  assert.deepEqual(parseBlocks('[b:]'), []);
  assert.deepEqual(parseBlocks('[i:]'), []);
});

test('converts emphasis and keeps the given character', () => {
  assert.deepEqual(parseInlines('[[emphasismark:大切>﹅]]'), [
    { type: 'text', value: '大切', style: { emphasis: { mark: 'sesame-dot', character: '﹅', side: 'right' } } },
  ]);
});

const emphasisMarks: readonly (readonly [string, EmphasisMark])[] = [
  ['・', 'sesame-dot'],
  ['○', 'white-circle'],
  ['●', 'black-circle'],
  ['△', 'white-triangle'],
  ['×', 'saltire'],
  ['☆', 'sesame-dot'],
];

for (const [character, mark] of emphasisMarks) {
  test(`maps the ${character} emphasis mark to ${mark}`, () => {
    assert.deepEqual(parseInlines(`[[emphasismark:強調>${character}]]`), [
      { type: 'text', value: '強調', style: { emphasis: { mark, character, side: 'right' } } },
    ]);
  });
}

test('uses ﹅ when the emphasis mark is empty', () => {
  assert.deepEqual(parseInlines('[[emphasismark:強調>]]'), [
    { type: 'text', value: '強調', style: { emphasis: { mark: 'sesame-dot', character: '﹅', side: 'right' } } },
  ]);
});

test('keeps an emphasis tag without an angle bracket literal', () => {
  assert.deepEqual(parseInlines('[[emphasismark:強調]]'), [
    { type: 'text', value: '[[emphasismark:強調]]' },
  ]);
});

test('keeps the jumpuri title and drops the URL', () => {
  assert.deepEqual(parseInlines('[[jumpuri:リンク > https://example.com]]を見る。'), [
    { type: 'text', value: 'リンクを見る。' },
  ]);
});

test('keeps the whole jumpuri content when there is no angle bracket', () => {
  assert.deepEqual(parseInlines('[[jumpuri:タイトル]]'), [
    { type: 'text', value: 'タイトル' },
  ]);
});

test('drops newpage lines', () => {
  assert.deepEqual(parseBlocks('  [newpage]  '), []);
});

test('drops inline newpage tags', () => {
  assert.deepEqual(parseInlines('前[newpage]後'), [{ type: 'text', value: '前後' }]);
  assert.deepEqual(parseInlines('[newpage]本文'), [{ type: 'text', value: '本文' }]);
});

test('drops illustration tags', () => {
  assert.deepEqual(parseInlines('a[pixivimage:1]b[uploadedimage:2]c'), [
    { type: 'text', value: 'abc' },
  ]);
});

test('drops page-link tags', () => {
  assert.deepEqual(parseInlines('a[jump:3]b'), [{ type: 'text', value: 'ab' }]);
});

test('keeps unknown tags literal', () => {
  assert.equal(joinVisibleText(parseInlines('a[foo:bar]b')), 'a[foo:bar]b');
});

test('keeps a bare bracket literal', () => {
  assert.equal(joinVisibleText(parseInlines('a[注]b')), 'a[注]b');
});

test('keeps unclosed tags literal', () => {
  assert.equal(joinVisibleText(parseInlines('a[b:c')), 'a[b:c');
  assert.equal(joinVisibleText(parseInlines('a[[rb:x > y')), 'a[[rb:x > y');
});

test('preserves Unicode text and styles in tag-free segments', () => {
  const text = 'タグのない本文😀。';
  assert.deepEqual(parseInlines(text), [{ type: 'text', value: text }]);
  assert.deepEqual(parseInlines(`[b:${text}]`), [{ type: 'text', value: text, style: { bold: true } }]);
});

test('preserves long runs of unclosed brackets and tags', () => {
  for (const source of ['['.repeat(32000), '[b:'.repeat(8000), '[[rb:'.repeat(4000)]) {
    assert.equal(joinVisibleText(parseInlines(source)), source);
  }
});

test('preserves deeply nested unknown brackets', () => {
  const source = `${'['.repeat(8000)}literal${']'.repeat(8000)}`;
  assert.equal(joinVisibleText(parseInlines(source)), source);
});

test('keeps deeply nested styled text within a bounded heap', () => {
  const parserUrl = new URL('../src/pixivNovel.ts', import.meta.url).href;
  const result = spawnSync(process.execPath, [
    '--max-old-space-size=256',
    '--input-type=module',
    '--eval',
    `
      import assert from 'node:assert/strict';
      import { parsePixivNovel } from ${JSON.stringify(parserUrl)};
      const body = '[unknown:x]'.repeat(20000);
      const source = '[b:'.repeat(300) + body + ']'.repeat(300);
      assert.deepEqual(parsePixivNovel(source, { title: 'Memory regression', author: null }), {
        format: 'pixiv-novel',
        title: 'Memory regression',
        author: null,
        blocks: [{
          type: 'paragraph',
          sentences: [{
            textType: 'narration',
            inlines: [{ type: 'text', value: body, style: { bold: true } }],
          }],
        }],
      });
    `,
  ], { encoding: 'utf8', timeout: 10000 });

  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
});

test('still parses recognized tags inside unknown or unclosed brackets', () => {
  for (const source of ['[unknown:[b:bold]]', '[unclosed [b:bold]']) {
    const inlines = parseInlines(source);
    assert.ok(inlines.some((inline) => inline.type === 'text' && inline.value === 'bold' && inline.style?.bold));
    assert.equal(joinVisibleText(inlines), source.replace('[b:bold]', 'bold'));
  }
});

test('preserves the existing double-bracket page break behavior', () => {
  assert.deepEqual(parseBlocks('[[newpage]]'), []);
});

test('keeps malformed double tags literal without truncating their final character', () => {
  for (const source of ['[[rb:漢字>かんじ]x]', '[[jumpuri:😀]😀]', '[[emphasismark:本文>○]x]']) {
    assert.equal(joinVisibleText(parseInlines(source)), source);
  }
});

test('supports nested bold and italic', () => {
  assert.deepEqual(parseInlines('[b:太字と[i:斜体太字]]'), [
    { type: 'text', value: '太字と', style: { bold: true } },
    { type: 'text', value: '斜体太字', style: { bold: true, italic: true } },
  ]);
});

test('supports ruby inside bold', () => {
  assert.deepEqual(parseInlines('[b:[[rb:漢字 > かんじ]]]'), [
    { type: 'ruby', base: '漢字', reading: 'かんじ', style: { bold: true } },
  ]);
});

test('supports emphasis over bold', () => {
  assert.deepEqual(parseInlines('[[emphasismark:[b:傍点太字]>○]]'), [
    {
      type: 'text',
      value: '傍点太字',
      style: {
        bold: true,
        emphasis: { mark: 'white-circle', character: '○', side: 'right' },
      },
    },
  ]);
});

test('parses tags inside a jumpuri title', () => {
  assert.deepEqual(parseInlines('[[jumpuri:[b:リンク] > https://example.com]]'), [
    { type: 'text', value: 'リンク', style: { bold: true } },
  ]);
});

test('preserves nested styles and Unicode offsets when trimming tag content', () => {
  assert.deepEqual(parseInlines('前[b:太字 [[jumpuri:  [i:漢字😀]  > https://example.com]] 後]終わり。'), [
    { type: 'text', value: '前' },
    { type: 'text', value: '太字', style: { bold: true } },
    { type: 'space', value: ' ', style: { bold: true } },
    { type: 'text', value: '漢字😀', style: { bold: true, italic: true } },
    { type: 'space', value: ' ', style: { bold: true } },
    { type: 'text', value: '後', style: { bold: true } },
    { type: 'text', value: '終わり。' },
  ]);
  assert.deepEqual(parseInlines('前[b:[[emphasismark:　[i:漢字😀]　 > ○]]末]後。'), [
    { type: 'text', value: '前' },
    {
      type: 'text',
      value: '漢字😀',
      style: {
        emphasis: { mark: 'white-circle', character: '○', side: 'right' },
        bold: true,
        italic: true,
      },
    },
    { type: 'text', value: '末', style: { bold: true } },
    { type: 'text', value: '後。' },
  ]);
});

test('does not read a tag beyond a trimmed segment boundary', () => {
  assert.deepEqual(parseInlines('前[[emphasismark: [b:本文 >○]]]後。'), [
    { type: 'text', value: '前' },
    {
      type: 'text',
      value: '[b:本文',
      style: { emphasis: { mark: 'sesame-dot', character: '○]', side: 'right' } },
    },
    { type: 'text', value: '後。' },
  ]);
});

test('splits sentences on one line', () => {
  const blocks = parseBlocks('これは文です。次の文です。');
  const paragraph = blocks[0];
  assert.ok(paragraph?.type === 'paragraph');
  assert.deepEqual(paragraph.sentences.map((sentence) => sentence.inlines), [
    [{ type: 'text', value: 'これは文です。' }],
    [{ type: 'text', value: '次の文です。' }],
  ]);
});

test('reports block source lines and skips tag-only lines', () => {
  const sourceLines: number[] = [];
  parsePixivNovel([
    '[chapter:第一章]',
    '',
    '本文。',
    '[newpage]',
    '[pixivimage:1]',
    '終わり。',
  ].join('\n'), {
    title: 'テスト',
    author: null,
    onBlock: (lineIndex) => sourceLines.push(lineIndex),
  });

  assert.deepEqual(sourceLines, [0, 1, 2, 5]);
});

test('keeps legacy Aozora notation literal', () => {
  const inlines = parseInlines('｜漢字《かんじ》と《《傍点》》と［＃傍点］');
  const text = inlines
    .map((inline) => {
      if (inline.type === 'text' || inline.type === 'bracket' || inline.type === 'space') return inline.value;
      return '';
    })
    .join('');

  assert.equal(text, '｜漢字《かんじ》と《《傍点》》と［＃傍点］');
  assert.equal(inlines.some((inline) => inline.type === 'ruby'), false);
});

test('handles CRLF and blank lines', () => {
  assert.deepEqual(parseBlocks('一行\r\n\r\n二行\r\n').map((block) => block.type), [
    'paragraph',
    'blank',
    'paragraph',
  ]);
});

test('converts a document with several tags in order', () => {
  const blocks = parseBlocks([
    '[chapter:第一章]',
    '',
    '彼は[[rb:漢字 > かんじ]]を書いた。',
    '[b:太字]と[i:斜体]と[[emphasismark:傍点>﹅]]。',
    '[[jumpuri:リンク > https://example.com]]を見る。',
    '[newpage]',
    '[pixivimage:12345]',
    '終わり。',
  ].join('\n'));

  assert.deepEqual(blocks, [
    {
      type: 'heading',
      level: 1,
      sentences: [{ textType: 'heading', inlines: [{ type: 'text', value: '第一章' }] }],
    },
    { type: 'blank' },
    {
      type: 'paragraph',
      sentences: [{
        textType: 'narration',
        inlines: [
          { type: 'text', value: '彼は' },
          { type: 'ruby', base: '漢字', reading: 'かんじ' },
          { type: 'text', value: 'を書いた。' },
        ],
      }],
    },
    {
      type: 'paragraph',
      sentences: [{
        textType: 'narration',
        inlines: [
          { type: 'text', value: '太字', style: { bold: true } },
          { type: 'text', value: 'と' },
          { type: 'text', value: '斜体', style: { italic: true } },
          { type: 'text', value: 'と' },
          {
            type: 'text',
            value: '傍点',
            style: { emphasis: { mark: 'sesame-dot', character: '﹅', side: 'right' } },
          },
          { type: 'text', value: '。' },
        ],
      }],
    },
    {
      type: 'paragraph',
      sentences: [{ textType: 'narration', inlines: [{ type: 'text', value: 'リンクを見る。' }] }],
    },
    {
      type: 'paragraph',
      sentences: [{ textType: 'narration', inlines: [{ type: 'text', value: '終わり。' }] }],
    },
  ]);
});
