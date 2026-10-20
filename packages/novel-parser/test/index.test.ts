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
    '［＃「見出し」は中見出し］',
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
