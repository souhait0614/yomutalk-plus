import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type { NovelInline } from '../src/index.ts';
import { composeAozoraText, parseAozoraText, parsePlainText, splitAozoraText } from '../src/index.ts';

const aozoraSource = (body: string): string => [
  'テストタイトル',
  'テスト著者',
  '',
  '--------------------',
  '記号について',
  '--------------------',
  body,
  '底本：テスト',
].join('\n');

const parseAozoraBlocks = (body: string) => parseAozoraText(aozoraSource(body)).blocks;

test('composes new Aozora text without treating metadata as body', () => {
  const source = composeAozoraText({ title: '題名', author: '著者', body: '｜本文《ほんぶん》。' });
  const novel = parseAozoraText(source);
  assert.equal(novel.title, '題名');
  assert.equal(novel.author, '著者');
  assert.equal(novel.blocks.length, 1);
  const firstBlock = novel.blocks[0];
  assert.ok(firstBlock?.type === 'paragraph');
  assert.equal(firstBlock.sentences[0]?.inlines[0]?.type, 'ruby');
  assert.equal(splitAozoraText(source).body, '｜本文《ほんぶん》。');
});

test('keeps newlines after the Aozora body separator in the header', () => {
  const prefix = ['題名', '著者', '', '--------------------', '記号の説明', '--------------------'].join('\n');
  for (const gap of ['\n', '\n\n', '\n\n\n']) {
    const body = '｜本文《ほんぶん》。\n\n次の段落。\n';
    const source = prefix + gap + body;
    const parts = splitAozoraText(source);
    assert.equal(parts.header, prefix + gap);
    assert.equal(parts.body, body);
    assert.equal(parts.header + parts.body, source);
    assert.equal(composeAozoraText(parts), source);
    const sourceLines: number[] = [];
    parseAozoraText(source, { onBlock: (lineIndex) => sourceLines.push(lineIndex) });
    const firstBodyLine = 5 + gap.length;
    assert.deepEqual(sourceLines, [firstBodyLine, firstBodyLine + 1, firstBodyLine + 2]);
  }
});

test('does not remove non-newline whitespace at the start of the Aozora body', () => {
  const prefix = ['題名', '著者', '', '--------------------', '記号の説明', '--------------------'].join('\n');
  const body = ' \n\u3000本文。';
  const source = `${prefix}\n\n${body}`;
  const parts = splitAozoraText(source);
  assert.equal(parts.header, `${prefix}\n\n`);
  assert.equal(parts.body, body);
  assert.equal(composeAozoraText(parts), source);
});

test('preserves separator newlines for an empty Aozora body', () => {
  const prefix = ['題名', '著者', '', '--------------------', '記号の説明', '--------------------'].join('\n');
  for (const gap of ['', '\n', '\n\n', '\n\n\n']) {
    const source = prefix + gap;
    const parts = splitAozoraText(source);
    assert.equal(parts.header, source);
    assert.equal(parts.body, '');
    assert.equal(composeAozoraText(parts), source);
  }
});

test('edits Aozora metadata while preserving annotations, body, and footer', async () => {
  const source = await readFile(new URL('./assets/wagahaiwa_nekodearu_aozora.txt', import.meta.url), 'utf8');
  const parts = splitAozoraText(source);
  assert.ok(parts.body.startsWith('［＃８字下げ］'));
  assert.ok(parts.header.endsWith('\n\n'));
  const updated = composeAozoraText({ ...parts, title: '変更した題名', author: '変更した著者' });
  assert.equal(splitAozoraText(updated).body, parts.body);
  assert.ok(updated.includes('【テキスト中に現れる記号について】'));
  assert.deepEqual(parseAozoraText(updated).blocks, parseAozoraText(source).blocks);
  assert.equal(parseAozoraText(updated).title, '変更した題名');
  assert.equal(parseAozoraText(updated).author, '変更した著者');
});

test('allows clearing an author without losing additional header lines', () => {
  const source = ['題名', '著者', '追加情報', '', '--------------------', '記号の説明', '--------------------', '本文'].join('\n');
  const updated = composeAozoraText({ ...splitAozoraText(source), author: null });
  assert.equal(parseAozoraText(updated).author, null);
  assert.ok(updated.includes('追加情報'));
  assert.ok(updated.includes('記号の説明'));
  assert.deepEqual(parseAozoraText(updated).blocks, parseAozoraText(source).blocks);
});

test('preserves unheaded text and normalizes source line endings', () => {
  const source = '\uFEFF最初の段落\r\n次の段落\r最後の段落';
  const parts = splitAozoraText(source);
  assert.equal(parts.header, '');
  assert.equal(parts.body, '最初の段落\n次の段落\n最後の段落');
  assert.deepEqual(
    parseAozoraText(composeAozoraText({ ...parts, title: '新しい題名', author: null })).blocks,
    parseAozoraText(source).blocks,
  );
});

test('rejects empty or multiline Aozora metadata', () => {
  assert.throws(() => composeAozoraText({ title: ' ', author: null, body: '' }));
  assert.throws(() => composeAozoraText({ title: '題名\n本文', author: null, body: '' }));
  assert.throws(() => composeAozoraText({ title: '題名', author: '著者\n本文', body: '' }));
});

test('converts Aozora headings, ruby, and gaiji', () => {
  const novel = parseAozoraText([
    '配布用タイトル',
    '配布用著者',
    '',
    '--------------------',
    '【テキスト中に現れる記号について】',
    '--------------------',
    '［＃８字下げ］一［＃「一」は中見出し］',
    '',
    '　吾輩《わがはい》は一番｜獰悪《どうあく》で、※［＃「言＋墟のつくり」］《いつ》わる。',
    '',
    '底本：「底本」',
    '入力：入力者',
  ].join('\n'));

  assert.equal(novel.title, '配布用タイトル');
  assert.equal(novel.author, '配布用著者');
  assert.equal(novel.blocks.length, 3);
  assert.equal(novel.blocks[0]?.type, 'heading');
  assert.deepEqual(novel.blocks[1], { type: 'blank' });
  const paragraph = novel.blocks[2];
  assert.ok(paragraph?.type === 'paragraph');
  assert.ok(paragraph.sentences.length > 0);
});

test('keeps Aozora blank lines and drops blanks around metadata', () => {
  const source = [
    '題名',
    '著者',
    '',
    '--------------------',
    '記号',
    '--------------------',
    '一行目',
    '',
    '',
    '三行目',
    '',
    '底本：底本',
  ].join('\n');
  const sourceLines: number[] = [];
  const novel = parseAozoraText(source, { onBlock: (lineIndex) => sourceLines.push(lineIndex) });
  assert.deepEqual(novel.blocks.map((block) => block.type), ['paragraph', 'blank', 'blank', 'paragraph']);
  assert.deepEqual(sourceLines, [6, 7, 8, 9]);

  const unheaded = parseAozoraText('一行目\n\n三行目\n');
  assert.deepEqual(unheaded.blocks.map((block) => block.type), ['paragraph', 'blank', 'paragraph']);
});

test('reports Aozora block source lines excluding headers, annotations, and footer', () => {
  const source = [
    '題名', '著者', '', '--------------------', '記号', '--------------------',
    '', '［＃ここから２字下げ］', '｜本文《ほんぶん》。', '',
    '見出し［＃「見出し」は中見出し］', '［＃ここで字下げ終わり］',
    '底本：底本情報', '入力：入力者',
  ].join('\n');
  const sourceLines: number[] = [];
  const novel = parseAozoraText(source, { onBlock: (lineIndex) => sourceLines.push(lineIndex) });
  assert.deepEqual(sourceLines, [8, 9, 10]);
  assert.deepEqual(novel, parseAozoraText(source));

  const unheadedLines: number[] = [];
  parseAozoraText('\n［＃ここから２字下げ］\n本文。\n底本：情報', {
    onBlock: (lineIndex) => unheadedLines.push(lineIndex),
  });
  assert.deepEqual(unheadedLines, [2]);
});

test('converts Aozora indentation ranges and end alignment', () => {
  const blocks = parseAozoraBlocks([
    '［＃８字下げ］見出し［＃「見出し」は中見出し］',
    '［＃ここから３字下げ］',
    '引用文',
    '［＃ここから４字下げ］',
    '引用文２',
    '［＃ここで字下げ終わり］',
    '署名［＃地付き］',
  ].join('\n'));

  assert.equal(blocks.length, 4);
  assert.equal(blocks[0]?.type, 'heading');
  const block1 = blocks[1];
  assert.ok(block1?.type === 'paragraph');
  assert.equal(block1.indent, 3);
  const block2 = blocks[2];
  assert.ok(block2?.type === 'paragraph');
  assert.equal(block2.indent, 4);
  const block3 = blocks[3];
  assert.ok(block3?.type === 'paragraph');
  assert.equal(block3.align, 'end');
});

test('converts Aozora layout annotations', () => {
  const blocks = parseAozoraBlocks([
    '［＃ページの左右中央］',
    '章の名前',
    '［＃改ページ］',
    '［＃ここから１０字詰め］',
    '字詰めの段落',
    '［＃ここで字詰め終わり］',
    '［＃ここから横組み］',
    '横組みの段落',
    '［＃ここで横組み終わり］',
    '［＃ここから改行天付き、折り返して１字下げ］',
    '箇条書きの段落',
    '［＃ここで字下げ終わり］',
    '［＃地から２字上げ］長谷川辰之助',
  ].join('\n'));

  assert.deepEqual(blocks.map((block) => block.type), [
    'paragraph', 'paragraph', 'paragraph', 'paragraph', 'paragraph',
  ]);
  assert.deepEqual(blocks[0], {
    type: 'paragraph',
    align: 'center',
    sentences: [{ textType: 'narration', inlines: [{ type: 'text', value: '章の名前' }] }],
  });
  assert.equal(blocks[1]?.type === 'paragraph' ? blocks[1].width : undefined, 10);
  assert.equal(blocks[2]?.type === 'paragraph' ? blocks[2].horizontal : undefined, true);
  assert.equal(blocks[3]?.type === 'paragraph' ? blocks[3].wrapIndent : undefined, 1);

  const nested = parseAozoraBlocks([
    '［＃ここから２字下げ］',
    '引用',
    '［＃ここから改行天付き、折り返して１字下げ］',
    '箇条書き',
    '［＃ここで字下げ終わり］',
  ].join('\n'));
  const nestedParagraph = nested[1];
  assert.ok(nestedParagraph?.type === 'paragraph');
  assert.equal(nestedParagraph.indent, 2);
  assert.equal(nestedParagraph.wrapIndent, 3);

  const rise = parseAozoraBlocks('［＃地から２字上げ］長谷川辰之助')[0];
  assert.deepEqual(rise, {
    type: 'paragraph',
    align: 'end',
    rise: 2,
    sentences: [{ textType: 'narration', inlines: [{ type: 'text', value: '長谷川辰之助' }] }],
  });
});

test('resets center alignment at page breaks and skips the page-break lines', () => {
  const blocks = parseAozoraBlocks([
    '［＃ページの左右中央］',
    '中央の行',
    '［＃改丁］',
    '次の行',
  ].join('\n'));

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0]?.type === 'paragraph' ? blocks[0].align : undefined, 'center');
  assert.equal(blocks[1]?.type === 'paragraph' ? blocks[1].align : undefined, undefined);
});

test('converts caption annotations', () => {
  const blocks = parseAozoraBlocks([
    '大獅子金剛大ラマの水刑［＃「大獅子金剛大ラマの水刑」はキャプション］',
    '［＃ここからキャプション］',
    '第３図『雪華図説』図版第十面',
    '［＃ここでキャプション終わり］',
  ].join('\n'));

  assert.deepEqual(blocks.map((block) => block.type === 'paragraph' && block.caption), [true, true]);
});

test('converts block and inline heading annotations', () => {
  const blocks = parseAozoraBlocks([
    '［＃ここから中見出し］',
    '章の見出し',
    '［＃ここで中見出し終わり］',
    '［＃大見出し］序［＃大見出し終わり］',
    '清水詣《きよみずもう》で［＃「清水詣で」は大見出し］',
  ].join('\n'));

  assert.deepEqual(blocks.map((block) => block.type), ['heading', 'heading', 'heading']);
  assert.deepEqual(blocks.map((block) => block.type === 'heading' && block.level), [2, 1, 1]);
  assert.equal(
    blocks[0]?.type === 'heading' ? blocks[0].sentences[0]?.textType : undefined,
    'heading',
  );
});

test('converts every heading level', () => {
  const blocks = parseAozoraBlocks([
    '［＃ここから大見出し］',
    '大',
    '［＃ここで大見出し終わり］',
    '［＃ここから中見出し］',
    '中',
    '［＃ここで中見出し終わり］',
    '［＃ここから小見出し］',
    '小',
    '［＃ここで小見出し終わり］',
  ].join('\n'));

  assert.deepEqual(blocks.map((block) => block.type === 'heading' && block.level), [1, 2, 3]);
});

test('marks heading sentences as heading text type', () => {
  const blocks = parseAozoraBlocks('見出し［＃「見出し」は中見出し］');
  const heading = blocks.find((block) => block.type === 'heading');
  assert.ok(heading?.type === 'heading');
  assert.equal(heading.sentences[0]?.textType, 'heading');
});

test('applies block-wide bold and skips annotation-only lines', () => {
  const blocks = parseAozoraBlocks([
    '［＃ここから太字］',
    '太字の段落',
    '［＃ここで太字終わり］',
    '［＃石鏃二つの図（fig42154_01.png、横321×縦123）入る］',
  ].join('\n'));

  assert.deepEqual(blocks, [
    {
      type: 'paragraph',
      sentences: [
        { textType: 'narration', inlines: [{ type: 'text', value: '太字の段落', style: { bold: true } }] },
      ],
    },
  ]);
});

test('ignores block-wide kekomi annotations', () => {
  assert.deepEqual(
    parseAozoraBlocks([
      '［＃ここから罫囲み］',
      '罫囲みの段落',
      '［＃ここで罫囲み終わり］',
    ].join('\n')),
    [
      {
        type: 'paragraph',
        sentences: [{ textType: 'narration', inlines: [{ type: 'text', value: '罫囲みの段落' }] }],
      },
    ],
  );
});

test('stops the body at the Aozora body end annotation', () => {
  assert.deepEqual(
    parseAozoraBlocks([
      '本文です。',
      '［＃本文終わり］',
      '入力：入力者',
    ].join('\n')),
    [
      {
        type: 'paragraph',
        sentences: [{ textType: 'narration', inlines: [{ type: 'text', value: '本文です。' }] }],
      },
    ],
  );
});

test('drops footer lines from the body', () => {
  const blocks = parseAozoraBlocks('本文です。\n底本：底本情報\n入力：入力者');
  assert.deepEqual(blocks, [
    {
      type: 'paragraph',
      sentences: [{ textType: 'narration', inlines: [{ type: 'text', value: '本文です。' }] }],
    },
  ]);
});

const isWagahaiRuby = (inline: NovelInline): boolean => (
  inline.type === 'ruby' && inline.base === '吾輩' && inline.reading === 'わがはい'
);

test('converts the provided samples', async () => {
  const [plainSource, aozoraSourceText] = await Promise.all([
    readFile(new URL('./assets/wagahaiwa_nekodearu_plain.txt', import.meta.url), 'utf8'),
    readFile(new URL('./assets/wagahaiwa_nekodearu_aozora.txt', import.meta.url), 'utf8'),
  ]);
  const plainNovel = parsePlainText(plainSource, { title: '吾輩は猫である', author: '夏目漱石' });
  const aozoraNovel = parseAozoraText(aozoraSourceText);
  const firstAozoraParagraph = aozoraNovel.blocks.find((block) => block.type === 'paragraph');

  assert.equal(plainNovel.blocks.length > 0, true);
  assert.equal(aozoraNovel.title, '吾輩は猫である');
  assert.equal(aozoraNovel.author, '夏目漱石');
  assert.deepEqual(aozoraNovel.blocks[0], {
    type: 'heading',
    level: 2,
    indent: 8,
    sentences: [{ textType: 'heading', inlines: [{ type: 'text', value: '一' }] }],
  });
  assert.ok(firstAozoraParagraph?.type === 'paragraph');

  const hasWagahaiRuby = firstAozoraParagraph.sentences.some(
    (sentence) => sentence.inlines.some(isWagahaiRuby),
  );
  assert.equal(hasWagahaiRuby, true);

  const hasFooter = aozoraNovel.blocks.some((block) => {
    if (block.type !== 'paragraph') return false;
    return block.sentences.some((sentence) => sentence.inlines.some(
      (inline) => inline.type === 'text' && inline.value.includes('底本：'),
    ));
  });
  assert.equal(hasFooter, false);
});
