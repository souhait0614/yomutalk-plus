import assert from 'node:assert/strict';
import test from 'node:test';

import type { NovelSentence } from '../src/index.ts';
import { parseAozoraText, parsePixivNovel, parsePlainText } from '../src/index.ts';

const parseSentenceBody = (body: string): NovelSentence[] => {
  const novel = parsePlainText(body, { title: 'テスト', author: null });
  const paragraph = novel.blocks.find((block) => block.type === 'paragraph');
  assert.ok(paragraph?.type === 'paragraph');

  return paragraph.sentences;
};

const getSentenceTexts = (sentences: readonly NovelSentence[]): string[] => sentences.map((sentence) => (
  sentence.inlines
    .map((inline) => {
      if (inline.type === 'text' || inline.type === 'bracket' || inline.type === 'space') return inline.value;
      return '';
    })
    .join('')
));

test('splits paragraphs by sentence punctuation', () => {
  assert.deepEqual(parseSentenceBody('これは文です。次の文です。最後の文'), [
    { textType: 'narration', inlines: [{ type: 'text', value: 'これは文です。' }] },
    { textType: 'narration', inlines: [{ type: 'text', value: '次の文です。' }] },
    { textType: 'narration', inlines: [{ type: 'text', value: '最後の文' }] },
  ]);
});

test('splits sentences on question, exclamation, and ellipsis marks', () => {
  assert.deepEqual(
    getSentenceTexts(parseSentenceBody('これは文ですか？Yes!そう?そう!本当に…。')),
    ['これは文ですか？', 'Yes!', 'そう?', 'そう!', '本当に…。'],
  );
});

test('keeps consecutive delimiters as a single sentence break', () => {
  assert.deepEqual(
    getSentenceTexts(parseSentenceBody('すごい！！！次は！？！？！？！？終わり。')),
    ['すごい！！！', '次は！？！？！？！？', '終わり。'],
  );
});

test('splits sentences around quoted speech', () => {
  assert.deepEqual(
    getSentenceTexts(parseSentenceBody('御師匠さんの声で「三毛や三毛や御飯だよ」と呼ぶ。')),
    ['御師匠さんの声で', '「', '三毛や三毛や御飯だよ', '」', 'と呼ぶ。'],
  );
});

test('separates brackets from sentences and keeps dialogue text type', () => {
  const sentences = parseSentenceBody(
    '彼は大に軽蔑せる調子で「何、猫だ？　猫が聞いてあきれらあ。全てえどこに住んでるんだ」随分傍若無人である。',
  );

  assert.deepEqual(sentences, [
    { textType: 'narration', inlines: [{ type: 'text', value: '彼は大に軽蔑せる調子で' }] },
    { textType: 'dialogue', inlines: [{ type: 'bracket', value: '「', kind: 'open' }] },
    { textType: 'dialogue', inlines: [{ type: 'text', value: '何、' }] },
    { textType: 'dialogue', inlines: [{ type: 'text', value: '猫だ？' }] },
    { textType: 'dialogue', inlines: [{ type: 'space', value: '　' }] },
    { textType: 'dialogue', inlines: [{ type: 'text', value: '猫が聞いてあきれらあ。' }] },
    { textType: 'dialogue', inlines: [{ type: 'text', value: '全てえどこに住んでるんだ' }] },
    { textType: 'dialogue', inlines: [{ type: 'bracket', value: '」', kind: 'close' }] },
    { textType: 'narration', inlines: [{ type: 'text', value: '随分傍若無人である。' }] },
  ]);
});

test('separates spaces from sentences as independent elements', () => {
  assert.deepEqual(parseSentenceBody('これは文です。 次の文です。　最後の文'), [
    { textType: 'narration', inlines: [{ type: 'text', value: 'これは文です。' }] },
    { textType: 'narration', inlines: [{ type: 'space', value: ' ' }] },
    { textType: 'narration', inlines: [{ type: 'text', value: '次の文です。' }] },
    { textType: 'narration', inlines: [{ type: 'space', value: '　' }] },
    { textType: 'narration', inlines: [{ type: 'text', value: '最後の文' }] },
  ]);
});

test('keeps ruby when splitting Aozora sentences', () => {
  const novel = parseAozoraText('吾輩《わがはい》は猫です。名前はまだ無い。');
  const paragraph = novel.blocks.find((block) => block.type === 'paragraph');
  assert.ok(paragraph?.type === 'paragraph');

  assert.equal(paragraph.sentences.length, 2);
  assert.deepEqual(paragraph.sentences[0]?.inlines[0], {
    type: 'ruby',
    base: '吾輩',
    reading: 'わがはい',
  });
});

test('keeps ruby when splitting pixiv sentences', () => {
  const novel = parsePixivNovel('[[rb:吾輩 > わがはい]]は猫です。名前はまだ無い。', {
    title: 'テスト',
    author: null,
  });
  const paragraph = novel.blocks.find((block) => block.type === 'paragraph');
  assert.ok(paragraph?.type === 'paragraph');

  assert.equal(paragraph.sentences.length, 2);
  assert.deepEqual(paragraph.sentences[0]?.inlines[0], {
    type: 'ruby',
    base: '吾輩',
    reading: 'わがはい',
  });
});
