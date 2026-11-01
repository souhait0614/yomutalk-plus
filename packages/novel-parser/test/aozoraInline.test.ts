import assert from 'node:assert/strict';
import test from 'node:test';

import type { EmphasisMark, LineMark, NovelInline, NovelSentence } from '../src/index.ts';
import { parseAozoraText } from '../src/index.ts';

const parseParagraphSentences = (body: string): NovelSentence[] => {
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
};

const getParagraphInlines = (body: string): NovelInline[] => parseParagraphSentences(body)
  .flatMap((sentence) => sentence.inlines);

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

const emphasisMarks: readonly (readonly [string, EmphasisMark])[] = [
  ['傍点', 'sesame-dot'],
  ['白ゴマ傍点', 'white-sesame-dot'],
  ['丸傍点', 'black-circle'],
  ['白丸傍点', 'white-circle'],
  ['黒三角傍点', 'black-triangle'],
  ['白三角傍点', 'white-triangle'],
  ['二重丸傍点', 'bullseye'],
  ['蛇の目傍点', 'fisheye'],
  ['ばつ傍点', 'saltire'],
];

for (const [name, mark] of emphasisMarks) {
  test(`applies the ${name} emphasis mark on both sides`, () => {
    assert.deepEqual(getParagraphInlines(`あ［＃「あ」に${name}］`), [
      { type: 'text', value: 'あ', style: { emphasis: { mark, side: 'right' } } },
    ]);
    assert.deepEqual(getParagraphInlines(`あ［＃「あ」の左に${name}］`), [
      { type: 'text', value: 'あ', style: { emphasis: { mark, side: 'left' } } },
    ]);
  });
}

const lineMarks: readonly (readonly [string, LineMark])[] = [
  ['傍線', 'solid'],
  ['二重傍線', 'double'],
  ['鎖線', 'dotted'],
  ['破線', 'dashed'],
  ['波線', 'wave'],
];

for (const [name, mark] of lineMarks) {
  test(`applies the ${name} line mark on both sides`, () => {
    assert.deepEqual(getParagraphInlines(`あ［＃「あ」に${name}］`), [
      { type: 'text', value: 'あ', style: { line: { mark, side: 'right' } } },
    ]);
    assert.deepEqual(getParagraphInlines(`あ［＃「あ」の左に${name}］`), [
      { type: 'text', value: 'あ', style: { line: { mark, side: 'left' } } },
    ]);
  });
}

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

test('applies bold and italic pairs written on one line', () => {
  assert.deepEqual(
    getParagraphInlines('［＃ここから太字］太字です［＃ここで太字終わり］。'),
    [
      { type: 'text', value: '太字です', style: { bold: true } },
      { type: 'text', value: '。' },
    ],
  );
  assert.deepEqual(
    getParagraphInlines('［＃ここから斜体］斜体です［＃ここで斜体終わり］。'),
    [
      { type: 'text', value: '斜体です', style: { italic: true } },
      { type: 'text', value: '。' },
    ],
  );
});

test('applies targeted bold and italic notes', () => {
  assert.deepEqual(getParagraphInlines('これは太字［＃「太字」は太字］です。'), [
    { type: 'text', value: 'これは' },
    { type: 'text', value: '太字', style: { bold: true } },
    { type: 'text', value: 'です。' },
  ]);
  assert.deepEqual(getParagraphInlines('これは斜体［＃「斜体」は斜体］です。'), [
    { type: 'text', value: 'これは' },
    { type: 'text', value: '斜体', style: { italic: true } },
    { type: 'text', value: 'です。' },
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

test('reads explicit and implicit ruby', () => {
  assert.deepEqual(getParagraphInlines('｜吾輩《わがはい》は猫。'), [
    { type: 'ruby', base: '吾輩', reading: 'わがはい' },
    { type: 'text', value: 'は猫。' },
  ]);
  assert.deepEqual(getParagraphInlines('吾輩《わがはい》は猫。'), [
    { type: 'ruby', base: '吾輩', reading: 'わがはい' },
    { type: 'text', value: 'は猫。' },
  ]);
});

test('reads gaiji with and without a reading', () => {
  assert.deepEqual(getParagraphInlines('外※［＃「にんべん＋外」］《がい》です。'), [
    { type: 'text', value: '外' },
    { type: 'gaiji', description: '「にんべん＋外」', reading: 'がい' },
    { type: 'text', value: 'です。' },
  ]);
  assert.deepEqual(getParagraphInlines('外※［＃「にんべん＋外」］です。'), [
    { type: 'text', value: '外' },
    { type: 'gaiji', description: '「にんべん＋外」', reading: null },
    { type: 'text', value: 'です。' },
  ]);
});

test('applies tate-chu-yoko and script annotations', () => {
  const inlines = getParagraphInlines(
    '米機Ｂ29［＃「29」は縦中横］と22［＃「2」は上付き小文字］とH2［＃「2」は下付き小文字］O。',
  );

  assert.deepEqual(inlines[1], { type: 'text', value: '29', style: { tateChuYoko: true } });
  assert.deepEqual(inlines[3], { type: 'text', value: '2', style: { script: 'superscript' } });
  assert.deepEqual(inlines[5], { type: 'text', value: '2', style: { script: 'subscript' } });
});

test('accepts the 行右小書き and 行左小書き script aliases', () => {
  const inlines = getParagraphInlines('2［＃「2」は行右小書き］と2［＃「2」は行左小書き］');
  assert.deepEqual(inlines[0], { type: 'text', value: '2', style: { script: 'superscript' } });
  assert.deepEqual(inlines[2], { type: 'text', value: '2', style: { script: 'subscript' } });
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

test('applies inline horizontal writing annotations', () => {
  const marked = getParagraphInlines('有名な［＃横組み］λ-4［＃横組み終わり］の方則');
  assert.deepEqual(marked[0], { type: 'text', value: '有名な' });
  assert.deepEqual(marked[1], { type: 'text', value: 'λ-4', style: { horizontal: true } });

  const braced = getParagraphInlines('［＃ここから横組み］Ａ＋Ｂ［＃ここで横組み終わり］という式');
  assert.deepEqual(braced[0], { type: 'text', value: 'Ａ＋Ｂ', style: { horizontal: true } });

  const targeted = getParagraphInlines('スハフ［＃「スハフ」は横組み］');
  assert.deepEqual(targeted[0], { type: 'text', value: 'スハフ', style: { horizontal: true } });
});

test('keeps kunten annotations as small text', () => {
  const inlines = getParagraphInlines('自［＃二］女王國［＃一］東度［＃レ］海千餘里。山城［＃（ノ）］國。');

  assert.deepEqual(inlines[1], { type: 'text', value: '二', style: { kunten: 'kaeriten' } });
  assert.deepEqual(inlines[3], { type: 'text', value: '一', style: { kunten: 'kaeriten' } });
  assert.deepEqual(inlines[5], { type: 'text', value: 'レ', style: { kunten: 'kaeriten' } });

  const okurigana = inlines.find((inline) => inline.type === 'text' && inline.value === 'ノ');
  assert.deepEqual(okurigana, { type: 'text', value: 'ノ', style: { kunten: 'okurigana' } });
});

test('ignores kekomi annotations', () => {
  assert.deepEqual(
    getParagraphInlines('本日記事解禁［＃「本日記事解禁」は罫囲み］'),
    [{ type: 'text', value: '本日記事解禁' }],
  );
});
