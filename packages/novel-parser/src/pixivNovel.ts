/**
 * pixiv小説フォーマット（pixiv小説記法）のパーサー。
 *
 * pixivヘルプ「小説作品の本文内に使えるpixiv小説記法の特殊タグとは？」
 * (https://www.pixiv.help/hc/ja/articles/235584168) に沿って特殊タグを解釈する。
 *
 * == 対応している記法 ==
 * ・章タイトル: [chapter:タイトル]
 *   行頭に置いたときに、その行を見出しとして扱う。タグの後ろに続く文字は見出しの本文になる。
 * ・ルビ: [[rb:親文字 > ルビ]]
 * ・太字: [b:テキスト]
 * ・斜体: [i:テキスト]
 * ・傍点: [[emphasismark:テキスト>﹅]]
 *   「>」の後ろの1文字をそのまま傍点として使う（「・」「○」など）。
 * ・リンク: [[jumpuri:タイトル > URL]]
 *   リンク先は扱わず、タイトルの文字だけを本文に残す。
 * ・改ページ: [newpage]
 *   リフロー表示では紙面の区切りを再現しないため、読み飛ばす。
 *
 * == 対応していない記法 ==
 * ・挿絵: [pixivimage:イラストID] [uploadedimage:挿絵ID]
 *   画像を扱わないため、タグだけを読み飛ばす。
 * ・ページ内リンク: [jump:ページ番号]
 *   ページを持たないため、タグだけを読み飛ばす。
 * ・記法変換機能の変換元: ｜漢字《かんじ》 《《漢字》》
 *   pixiv小説記法ではないため解釈しない（《》は本文の文字として残す）。
 * ・入れ子のタグ: [b:…] の内側に [[rb:…]] などを置く形
 *   タグの終端が内側の ]] と重なるため、入れ子は扱わない。
 * ・未知のタグ: [foo:…] など
 *   本文を失わないよう、タグを文字としてそのまま残す。
 */
import type {
  EmphasisMark,
  NovelBlock,
  NovelDocument,
  NovelInline,
  NovelInlineStyle,
  NovelSentence,
  PlainTextOptions,
} from './types.ts';
import { normalizeSource, splitSentences } from './shared.ts';

const CHAPTER_TAG = /^\s*\[chapter:([^\]]*)\]/u;
const PAGE_BREAK_LINE = /^\s*\[newpage\]\s*$/u;

const EMPHASIS_MARKS: ReadonlyMap<string, EmphasisMark> = new Map([
  ['﹅', 'sesame-dot'],
  ['•', 'sesame-dot'],
  ['・', 'sesame-dot'],
  ['･', 'sesame-dot'],
  ['⋅', 'sesame-dot'],
  ['○', 'white-circle'],
  ['〇', 'white-circle'],
  ['◯', 'white-circle'],
  ['◦', 'white-circle'],
  ['●', 'black-circle'],
  ['⬤', 'black-circle'],
  ['△', 'white-triangle'],
  ['▲', 'black-triangle'],
  ['◎', 'bullseye'],
  ['◉', 'fisheye'],
  ['×', 'saltire'],
  ['✕', 'saltire'],
  ['✖', 'saltire'],
]);

/** pixiv 小説記法の傍点の既定文字。 */
const DEFAULT_EMPHASIS_MARK = '﹅';

export function parsePixivNovel(
  source: string,
  options: PlainTextOptions,
): NovelDocument {
  const blocks: NovelBlock[] = [];
  const lines = normalizeSource(source).split('\n');
  // NOTE: 末尾の改行は最後の行の終端であり、空行ではない
  if (lines.at(-1) === '') lines.pop();

  for (const [lineIndex, line] of lines.entries()) {
    if (line.trim() === '') {
      blocks.push({ type: 'blank' });
      options.onBlock?.(lineIndex);
      continue;
    }

    if (PAGE_BREAK_LINE.test(line)) continue;

    const chapter = line.match(CHAPTER_TAG);

    if (chapter !== null) {
      const content = `${chapter[1] ?? ''}${line.slice(chapter[0].length)}`;
      const sentences = splitSentences(parsePixivInline(content))
        .map((sentence) => ({ ...sentence, textType: 'heading' as const }));

      if (hasInlines(sentences)) {
        blocks.push({ type: 'heading', level: 1, sentences });
        options.onBlock?.(lineIndex);
      }
      continue;
    }

    const sentences = splitSentences(parsePixivInline(line));

    if (!hasInlines(sentences)) continue;

    blocks.push({ type: 'paragraph', sentences });
    options.onBlock?.(lineIndex);
  }

  return {
    format: 'pixiv-novel',
    title: options.title,
    author: options.author,
    blocks,
  };
}

function hasInlines(sentences: readonly NovelSentence[]): boolean {
  return sentences.some((sentence) => sentence.inlines.length > 0);
}

function parsePixivInline(line: string): NovelInline[] {
  const inlines: NovelInline[] = [];
  let cursor = 0;

  const appendText = (value: string, style?: NovelInlineStyle): void => {
    if (value === '') return;

    const previous = inlines.at(-1);

    if (previous?.type === 'text' && stylesEqual(previous.style, style)) {
      previous.value += value;
      return;
    }

    inlines.push({ type: 'text', value, ...(style === undefined ? {} : { style }) });
  };

  const handleDoubleTag = (body: string): boolean => {
    const separator = body.indexOf(':');

    if (separator === -1) return false;

    const name = body.slice(0, separator);
    const value = body.slice(separator + 1);

    switch (name) {
      case 'rb': {
        const split = value.lastIndexOf('>');

        if (split === -1) return false;

        const base = value.slice(0, split).trim();
        const reading = value.slice(split + 1).trim();

        if (base === '' || reading === '') return false;

        inlines.push({ type: 'ruby', base, reading });
        return true;
      }
      case 'emphasismark': {
        const split = value.lastIndexOf('>');

        if (split === -1) return false;

        const text = value.slice(0, split).trim();
        const character = value.slice(split + 1).trim() || DEFAULT_EMPHASIS_MARK;

        if (text === '') return false;

        appendText(text, {
          emphasis: {
            mark: EMPHASIS_MARKS.get(character) ?? 'sesame-dot',
            character,
            side: 'right',
          },
        });
        return true;
      }
      case 'jumpuri': {
        const split = value.lastIndexOf('>');
        const title = (split === -1 ? value : value.slice(0, split)).trim();

        appendText(title);
        return true;
      }
      default: return false;
    }
  };

  const handleSingleTag = (body: string): boolean => {
    if (body === 'newpage') return true;
    if (body.startsWith('pixivimage:')) return true;
    if (body.startsWith('uploadedimage:')) return true;
    if (body.startsWith('jump:')) return true;

    if (body.startsWith('b:')) {
      appendText(body.slice('b:'.length), { bold: true });
      return true;
    }

    if (body.startsWith('i:')) {
      appendText(body.slice('i:'.length), { italic: true });
      return true;
    }

    return false;
  };

  while (cursor < line.length) {
    if (line.startsWith('[[', cursor)) {
      const end = line.indexOf(']]', cursor + 2);

      if (end !== -1 && handleDoubleTag(line.slice(cursor + 2, end))) {
        cursor = end + 2;
        continue;
      }
    }

    if (line[cursor] === '[') {
      const end = line.indexOf(']', cursor + 1);

      if (end !== -1 && handleSingleTag(line.slice(cursor + 1, end))) {
        cursor = end + 1;
        continue;
      }
    }

    const codePoint = line.codePointAt(cursor);

    if (codePoint === undefined) break;

    const character = String.fromCodePoint(codePoint);
    appendText(character);
    cursor += character.length;
  }

  return inlines;
}

function stylesEqual(a: NovelInlineStyle | undefined, b: NovelInlineStyle | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
