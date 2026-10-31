import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type { NovelInline, NovelSentence } from '../src/index.ts';
import {
  composeAozoraText,
  parseAozoraText,
  parsePlainText,
  splitAozoraText,
} from '../src/index.ts';

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

test('does not remove non-newline whitespace at the start of Aozora body', () => {
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
  assert.deepEqual(parseAozoraText(composeAozoraText({ ...parts, title: '新しい題名', author: null })).blocks, parseAozoraText(source).blocks);
});

test('rejects empty or multiline Aozora metadata', () => {
  assert.throws(() => composeAozoraText({ title: ' ', author: null, body: '' }));
  assert.throws(() => composeAozoraText({ title: '題名\n本文', author: null, body: '' }));
  assert.throws(() => composeAozoraText({ title: '題名', author: '著者\n本文', body: '' }));
});

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

test('keeps plain-text blank lines without treating the final newline as one', () => {
  const options = { title: '題名', author: null };
  const novel = parsePlainText('最初。\n\n\n次の。\n', options);
  assert.deepEqual(novel.blocks.map((block) => block.type), [
    'paragraph',
    'blank',
    'blank',
    'paragraph',
  ]);

  const sourceLines: number[] = [];
  parsePlainText('最初。\r\n \r\n\r\n次。\r\n', {
    ...options,
    onBlock: (lineIndex) => sourceLines.push(lineIndex),
  });
  assert.deepEqual(sourceLines, [0, 1, 2, 3]);
});

test('reports plain-text block source lines including empty lines', () => {
  const source = '\uFEFF最初。\r\n \r\n\r\n次。\r終わり。';
  const sourceLines: number[] = [];
  const options = { title: '題名', author: null };
  const novel = parsePlainText(source, { ...options, onBlock: (lineIndex) => sourceLines.push(lineIndex) });
  assert.deepEqual(sourceLines, [0, 1, 2, 3, 4]);
  assert.deepEqual(novel, parsePlainText(source, options));
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

test('converts Aozora headings, ruby, and gaiji', () => {
  const source = [
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
  ].join('\n');
  const novel = parseAozoraText(source);

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

test('converts Aozora indentation ranges and end alignment', () => {
  const source = [
    '題名',
    '著者',
    '',
    '--------------------',
    '記号',
    '--------------------',
    '［＃８字下げ］見出し［＃「見出し」は中見出し］',
    '［＃ここから３字下げ］',
    '引用文',
    '［＃ここから４字下げ］',
    '引用文２',
    '［＃ここで字下げ終わり］',
    '署名［＃地付き］',
    '底本：「底本」',
  ].join('\n');

  const blocks = parseAozoraText(source).blocks;
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

test('converts the provided samples', async () => {
  const [plainSource, aozoraSource] = await Promise.all([
    readFile(new URL('./assets/wagahaiwa_nekodearu_plain.txt', import.meta.url), 'utf8'),
    readFile(new URL('./assets/wagahaiwa_nekodearu_aozora.txt', import.meta.url), 'utf8'),
  ]);
  const plainNovel = parsePlainText(plainSource, {
    title: '吾輩は猫である',
    author: '夏目漱石',
  });
  const aozoraNovel = parseAozoraText(aozoraSource);
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

function isWagahaiRuby(inline: NovelInline): boolean {
  return inline.type === 'ruby'
    && inline.base === '吾輩'
    && inline.reading === 'わがはい';
}

function parseParagraphSentences(body: string): NovelSentence[] {
  const novel = parseAozoraText([
    'テストタイトル',
    'テスト著者',
    '',
    '--------------------',
    '記号について',
    '--------------------',
    body,
    '底本：テスト',
  ].join('\n'));
  const paragraph = novel.blocks.find((block) => block.type === 'paragraph');
  assert.ok(paragraph?.type === 'paragraph');

  return paragraph.sentences;
}

function getSentenceTexts(sentences: NovelSentence[]): string[] {
  return sentences.map((sentence) => sentence.inlines
    .map((inline) => {
      if (inline.type === 'text') return inline.value;
      if (inline.type === 'bracket') return inline.value;
      if (inline.type === 'space') return inline.value;
      return '';
    })
    .join(''));
}

test('splits paragraphs by sentence punctuation', () => {
  const novel = parseAozoraText([
    'テストタイトル',
    'テスト著者',
    '',
    '--------------------',
    '記号について',
    '--------------------',
    'これは文です。次の文です。最後の文',
    '底本：テスト',
  ].join('\n'));

  const paragraph = novel.blocks.find((b) => b.type === 'paragraph');
  assert.ok(paragraph?.type === 'paragraph');

  assert.equal(paragraph.sentences.length, 3);
  assert.deepEqual(paragraph.sentences[0], {
    textType: 'narration',
    inlines: [{ type: 'text', value: 'これは文です。' }],
  });
  assert.deepEqual(paragraph.sentences[1], {
    textType: 'narration',
    inlines: [{ type: 'text', value: '次の文です。' }],
  });
  assert.deepEqual(paragraph.sentences[2], {
    textType: 'narration',
    inlines: [{ type: 'text', value: '最後の文' }],
  });
});

test('splits sentences on question, exclamation, and ellipsis marks', () => {
  const sentences = parseParagraphSentences('これは文ですか？Yes!そう?そう!本当に…。');
  assert.deepEqual(getSentenceTexts(sentences), [
    'これは文ですか？',
    'Yes!',
    'そう?',
    'そう!',
    '本当に…。',
  ]);
});

test('keeps consecutive delimiters as a single sentence break', () => {
  const sentences = parseParagraphSentences('すごい！！！次は！？！？！？！？終わり。');
  assert.deepEqual(getSentenceTexts(sentences), [
    'すごい！！！',
    '次は！？！？！？！？',
    '終わり。',
  ]);
});

test('splits sentences around quoted speech', () => {
  const sentences = parseParagraphSentences('御師匠さんの声で「三毛や三毛や御飯だよ」と呼ぶ。');
  assert.deepEqual(getSentenceTexts(sentences), [
    '御師匠さんの声で',
    '「',
    '三毛や三毛や御飯だよ',
    '」',
    'と呼ぶ。',
  ]);
});

test('separates brackets from sentences and keeps dialogue text type', () => {
  const sentences = parseParagraphSentences(
    '彼は大に軽蔑せる調子で「何、猫だ？　猫が聞いてあきれらあ。全てえどこに住んでるんだ」随分傍若無人である。',
  );

  assert.deepEqual(sentences, [
    {
      textType: 'narration',
      inlines: [{ type: 'text', value: '彼は大に軽蔑せる調子で' }],
    },
    {
      textType: 'dialogue',
      inlines: [{ type: 'bracket', value: '「', kind: 'open' }],
    },
    {
      textType: 'dialogue',
      inlines: [{ type: 'text', value: '何、' }],
    },
    {
      textType: 'dialogue',
      inlines: [{ type: 'text', value: '猫だ？' }],
    },
    {
      textType: 'dialogue',
      inlines: [{ type: 'space', value: '　' }],
    },
    {
      textType: 'dialogue',
      inlines: [{ type: 'text', value: '猫が聞いてあきれらあ。' }],
    },
    {
      textType: 'dialogue',
      inlines: [{ type: 'text', value: '全てえどこに住んでるんだ' }],
    },
    {
      textType: 'dialogue',
      inlines: [{ type: 'bracket', value: '」', kind: 'close' }],
    },
    {
      textType: 'narration',
      inlines: [{ type: 'text', value: '随分傍若無人である。' }],
    },
  ]);
});

test('marks heading sentences as heading text type', () => {
  const novel = parseAozoraText([
    'テストタイトル',
    'テスト著者',
    '',
    '--------------------',
    '記号について',
    '--------------------',
    '見出し［＃「見出し」は中見出し］',
    '底本：テスト',
  ].join('\n'));

  const heading = novel.blocks.find((block) => block.type === 'heading');
  assert.ok(heading?.type === 'heading');
  assert.equal(heading.sentences[0]?.textType, 'heading');
});

test('separates spaces from sentences as independent elements', () => {
  const sentences = parseParagraphSentences('これは文です。 次の文です。　最後の文');
  assert.deepEqual(sentences, [
    {
      textType: 'narration',
      inlines: [{ type: 'text', value: 'これは文です。' }],
    },
    {
      textType: 'narration',
      inlines: [{ type: 'space', value: ' ' }],
    },
    {
      textType: 'narration',
      inlines: [{ type: 'text', value: '次の文です。' }],
    },
    {
      textType: 'narration',
      inlines: [{ type: 'space', value: '　' }],
    },
    {
      textType: 'narration',
      inlines: [{ type: 'text', value: '最後の文' }],
    },
  ]);
});

test('preserves ruby when splitting sentences', () => {
  const novel = parseAozoraText([
    'テストタイトル',
    'テスト著者',
    '',
    '--------------------',
    '記号について',
    '--------------------',
    '吾輩《わがはい》は猫です。名前はまだ無い。',
    '底本：テスト',
  ].join('\n'));

  const paragraph = novel.blocks.find((b) => b.type === 'paragraph');
  assert.ok(paragraph?.type === 'paragraph');

  assert.equal(
    paragraph.sentences.length,
    2,
    `Expected 2 sentences, got ${paragraph.sentences.length}`,
  );
  assert.equal(paragraph.sentences[0]?.inlines[0]?.type, 'ruby');
});

function getParagraphInlines(body: string): NovelInline[] {
  const sentences = parseParagraphSentences(body);
  return sentences.flatMap((sentence) => sentence.inlines);
}

function parseAozoraBlocks(body: string) {
  return parseAozoraText([
    'テストタイトル',
    'テスト著者',
    '',
    '--------------------',
    '記号について',
    '--------------------',
    body,
    '底本：テスト',
  ].join('\n')).blocks;
}

test('applies emphasis dots and lines from forward annotations', () => {
  const inlines = getParagraphInlines(
    '腹がへっても［＃「腹がへっても」に傍点］、この形は傍線［＃「傍線」に傍線］です。',
  );

  assert.deepEqual(inlines, [
    { type: 'text', value: '腹がへっても', style: { emphasis: { mark: 'sesame-dot', side: 'right' } } },
    { type: 'text', value: '、' },
    { type: 'text', value: 'この形は' },
    { type: 'text', value: '傍線', style: { line: { mark: 'solid', side: 'right' } } },
    { type: 'text', value: 'です。' },
  ]);

  const leftDots = getParagraphInlines('責［＃「責」の左に白丸傍点］空文庫');
  assert.deepEqual(leftDots[0], {
    type: 'text',
    value: '責',
    style: { emphasis: { mark: 'white-circle', side: 'left' } },
  });
});

test('applies start and end style annotations', () => {
  const inlines = getParagraphInlines(
    '［＃傍点］青空文庫で読書しよう［＃傍点終わり］。［＃二重傍線］強調［＃二重傍線終わり］。',
  );

  assert.deepEqual(inlines, [
    { type: 'text', value: '青空文庫で読書しよう', style: { emphasis: { mark: 'sesame-dot', side: 'right' } } },
    { type: 'text', value: '。' },
    { type: 'text', value: '強調', style: { line: { mark: 'double', side: 'right' } } },
    { type: 'text', value: '。' },
  ]);
});

test('merges overlapping emphasis annotations', () => {
  const inlines = getParagraphInlines(
    'このプロジェクトを、青空［＃「青空」に傍点］文庫［＃「青空文庫」に傍線］と呼んでいます。',
  );

  assert.deepEqual(inlines[1], {
    type: 'text',
    value: '青空',
    style: {
      emphasis: { mark: 'sesame-dot', side: 'right' },
      line: { mark: 'solid', side: 'right' },
    },
  });
  assert.deepEqual(inlines[2], {
    type: 'text',
    value: '文庫',
    style: { line: { mark: 'solid', side: 'right' } },
  });
});

test('keeps bold, italic, and ruby together', () => {
  const inlines = getParagraphInlines(
    '「［＃太字］選考するんだ［＃太字終わり］」と、来《き》た［＃「来た」に白丸傍点］。',
  );

  assert.deepEqual(inlines[1], { type: 'text', value: '選考するんだ', style: { bold: true } });

  const ruby = inlines.find((inline) => inline.type === 'ruby');
  assert.deepEqual(ruby, {
    type: 'ruby',
    base: '来',
    reading: 'き',
    style: { emphasis: { mark: 'white-circle', side: 'right' } },
  });
});

test('applies tate-chu-yoko and script annotations', () => {
  const inlines = getParagraphInlines(
    '米機Ｂ29［＃「29」は縦中横］と22［＃「2」は上付き小文字］とH2［＃「2」は下付き小文字］O。',
  );

  assert.deepEqual(inlines[1], { type: 'text', value: '29', style: { tateChuYoko: true } });
  assert.deepEqual(inlines[3], { type: 'text', value: '2', style: { script: 'superscript' } });
  assert.deepEqual(inlines[5], { type: 'text', value: '2', style: { script: 'subscript' } });
});

test('wraps warichu in parentheses only when the source has none', () => {
  const bare = getParagraphInlines('理論家の説と［＃割り注］ヒロソヒイ［＃割り注終わり］政治家の事。');
  assert.deepEqual(bare[1], { type: 'bracket', value: '（', kind: 'open', style: { warichu: true } });
  assert.deepEqual(bare[2], { type: 'text', value: 'ヒロソヒイ', style: { warichu: true } });
  assert.deepEqual(bare[3], { type: 'bracket', value: '）', kind: 'close', style: { warichu: true } });

  const bracketed = getParagraphInlines('被官（［＃割り注］中世の下級武士［＃割り注終わり］）、下部。');
  const brackets = bracketed.filter((inline) => inline.type === 'bracket' && inline.value === '（');
  assert.equal(brackets.length, 1);

  const legacy = getParagraphInlines('理論家の説と［＃ここから割り注］ヒロソヒイ［＃ここで割り注終わり］政治家。');
  assert.deepEqual(legacy[1], { type: 'bracket', value: '（', kind: 'open', style: { warichu: true } });
});

test('applies font size and inline heading styles', () => {
  const inlines = getParagraphInlines(
    '県立高女の怪事［＃「県立高女の怪事」は２段階大きな文字］と本日記事解禁［＃「本日記事解禁」は１段階小さな文字］',
  );

  assert.deepEqual(inlines[0], { type: 'text', value: '県立高女の怪事', style: { fontSizeStep: 2 } });
  assert.deepEqual(inlines[2], {
    type: 'text',
    value: '本日記事解禁',
    style: { fontSizeStep: -1 },
  });

  const heading = getParagraphInlines('龍王岬［＃「龍王岬」は窓中見出し］　峨々たる岩岬。');
  assert.deepEqual(heading[0], {
    type: 'text',
    value: '龍王岬',
    style: { inlineHeading: { level: 2, style: 'window' } },
  });
});

test('turns mama annotations into ruby', () => {
  const inlines = getParagraphInlines('吹喋［＃「喋」に「ママ」の注記］');
  assert.deepEqual(inlines.at(-1), { type: 'ruby', base: '喋', reading: 'ママ' });
});

test('applies inline horizontal writing annotations', () => {
  const marked = getParagraphInlines('有名な［＃横組み］λ-4［＃横組み終わり］の方則');
  assert.deepEqual(marked[0], { type: 'text', value: '有名な' });
  assert.deepEqual(marked[1], { type: 'text', value: 'λ-4', style: { horizontal: true } });

  const braced = getParagraphInlines('［＃ここから横組み］Ａ＋Ｂ［＃ここで横組み終わり］という式');
  assert.deepEqual(braced[0], { type: 'text', value: 'Ａ＋Ｂ', style: { horizontal: true } });

  const targeted = getParagraphInlines('スハフ［＃「スハフ」は横組み］と書く');
  assert.deepEqual(targeted[0], { type: 'text', value: 'スハフ', style: { horizontal: true } });
});

test('keeps text when a mama annotation cannot be applied', () => {
  // NOTE: 対象がルビや外字をまたぐ場合は注記を適用しないが、本文は失わない
  const rubyTarget = getParagraphInlines('見《み》た［＃「見た」に「ママ」の注記］。');
  assert.deepEqual(rubyTarget, [
    { type: 'ruby', base: '見', reading: 'み' },
    { type: 'text', value: 'た。' },
  ]);

  const gaijiTarget = getParagraphInlines('外※［＃「にんべん＋外」］《がい》です［＃「がいです」に「ママ」の注記］。');
  assert.deepEqual(gaijiTarget, [
    { type: 'text', value: '外' },
    { type: 'gaiji', description: '「にんべん＋外」', reading: 'がい' },
    { type: 'text', value: 'です。' },
  ]);
});

test('keeps kunten annotations as small text', () => {
  const inlines = getParagraphInlines('自［＃二］女王國［＃一］東度［＃レ］海千餘里。山城［＃（ノ）］國。');

  assert.deepEqual(inlines[1], { type: 'text', value: '二', style: { kunten: 'kaeriten' } });
  assert.deepEqual(inlines[3], { type: 'text', value: '一', style: { kunten: 'kaeriten' } });
  assert.deepEqual(inlines[5], { type: 'text', value: 'レ', style: { kunten: 'kaeriten' } });

  const okurigana = inlines.find((inline) => inline.type === 'text' && inline.value === 'ノ');
  assert.deepEqual(okurigana, { type: 'text', value: 'ノ', style: { kunten: 'okurigana' } });
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

test('ignores kekomi annotations', () => {
  assert.deepEqual(
    getParagraphInlines('本日記事解禁［＃「本日記事解禁」は罫囲み］'),
    [{ type: 'text', value: '本日記事解禁' }],
  );

  const blocks = parseAozoraBlocks([
    '［＃ここから罫囲み］',
    '罫囲みの段落',
    '［＃ここで罫囲み終わり］',
  ].join('\n'));
  assert.deepEqual(blocks, [
    {
      type: 'paragraph',
      sentences: [{ textType: 'narration', inlines: [{ type: 'text', value: '罫囲みの段落' }] }],
    },
  ]);
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

test('stops the body at the Aozora body end annotation', () => {
  const blocks = parseAozoraBlocks([
    '本文です。',
    '［＃本文終わり］',
    '入力：入力者',
  ].join('\n'));

  assert.deepEqual(blocks, [
    {
      type: 'paragraph',
      sentences: [{ textType: 'narration', inlines: [{ type: 'text', value: '本文です。' }] }],
    },
  ]);
});
