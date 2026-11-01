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
 * ・入れ子: [b:…] の内側に [i:…] や [[rb:…]] などを置いた形
 *   内側のタグから順に修飾を重ねる。
 *
 * == 対応していない記法 ==
 * ・挿絵: [pixivimage:イラストID] [uploadedimage:挿絵ID]
 *   画像を扱わないため、タグだけを読み飛ばす。
 * ・ページ内リンク: [jump:ページ番号]
 *   ページを持たないため、タグだけを読み飛ばす。
 * ・記法変換機能の変換元: ｜漢字《かんじ》 《《漢字》》
 *   pixiv小説記法ではないため解釈しない（《》は本文の文字として残す）。
 * ・未知のタグ: [foo:…] など
 *   本文を失わないよう、タグを文字としてそのまま残す。
 * ・閉じていないタグや、末尾の ]] がそろわない二重括弧のタグ
 *   末尾の文字を欠落させず、タグを本文の文字として残す。
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
import { mergeInlineStyles, normalizeSource, splitSentences } from './shared.ts';

const CHAPTER_TAG = /^\s*\[chapter:([^\]]*)\]/u;
const PAGE_BREAK_LINE = /^\s*\[newpage\]\s*$/u;
const TAG_PREFIX = /\[(?:\[(rb|emphasismark|jumpuri):|(b|i|pixivimage|uploadedimage|jump):|(newpage)\]|\[(newpage)\]\])/uy;

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
  return parsePixivSegment(line, 0, line.length, undefined);
}

/**
 * 行全体と括弧マップを共有し、指定範囲の入れ子だけを解析する。
 */
function parsePixivSegment(
  text: string,
  start: number,
  end: number,
  baseStyle: NovelInlineStyle | undefined,
  tagEnds?: ReadonlyMap<number, number>,
): NovelInline[] {
  if (start === end) return [];
  const nextBracket = text.indexOf('[', start);
  if (nextBracket === -1 || nextBracket >= end) {
    return [{ type: 'text', value: text.slice(start, end), ...(baseStyle === undefined ? {} : { style: baseStyle }) }];
  }

  const inlines: NovelInline[] = [];
  const ends = tagEnds ?? findPixivTagEnds(text);
  let cursor = start;

  const appendText = (value: string, style: NovelInlineStyle | undefined = baseStyle): void => {
    if (value === '') return;

    const previous = inlines.at(-1);

    if (previous?.type === 'text' && stylesEqual(previous.style, style)) {
      previous.value += value;
      return;
    }

    inlines.push({ type: 'text', value, ...(style === undefined ? {} : { style }) });
  };

  while (cursor < end) {
    const tag = readPixivTag(text, cursor, end, ends);

    if (tag !== undefined) {
      const nextCursor = applyPixivTag(text, tag, baseStyle, inlines, ends);

      if (nextCursor !== undefined) {
        cursor = nextCursor;
        continue;
      }
    }

    const codePoint = text.codePointAt(cursor);

    if (codePoint === undefined) break;

    const character = String.fromCodePoint(codePoint);
    appendText(character);
    cursor += character.length;
  }

  return inlines;
}

// eslint-disable-next-line @stylistic/operator-linebreak -- 長い union は行頭の | で揃えたい
type PixivTag =
  | { kind: 'bare'; name: string; end: number; }
  | { kind: 'single'; name: string; contentStart: number; contentEnd: number; end: number; }
  | { kind: 'double'; name: string; contentStart: number; contentEnd: number; end: number; };

/**
 * 対応する閉じ括弧が指定範囲内にあるタグだけを読み取る。
 */
function readPixivTag(text: string, start: number, limit: number, tagEnds: ReadonlyMap<number, number>): PixivTag | undefined {
  if (text[start] !== '[') return undefined;

  const end = tagEnds.get(start);
  if (end === undefined || end >= limit) return undefined;

  TAG_PREFIX.lastIndex = start;
  const prefix = TAG_PREFIX.exec(text);
  if (!prefix) return undefined;

  const bareName = prefix[3] ?? prefix[4];
  if (bareName) return { kind: 'bare', name: bareName, end };
  const name = prefix[1] ?? prefix[2];
  if (name === undefined) return undefined;
  const isDouble = prefix[1] !== undefined;
  if (isDouble && text[end - 1] !== ']') return undefined;

  return {
    kind: isDouble ? 'double' : 'single',
    name,
    contentStart: start + prefix[0].length,
    contentEnd: end - (isDouble ? 1 : 0),
    end,
  };
}

function findPixivTagEnds(text: string): ReadonlyMap<number, number> {
  const starts: number[] = [];
  const ends = new Map<number, number>();

  // 閉じていない括弧や未知のタグが続いても、同じ残りの文字列を繰り返し走査しない
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '[') {
      starts.push(index);
    } else if (text[index] === ']') {
      const start = starts.pop();
      if (start !== undefined) ends.set(start, index);
    }
  }

  return ends;
}

function trimPixivRange(text: string, start: number, end: number): readonly [number, number] {
  const content = text.slice(start, end);
  const trimmedStart = content.trimStart();
  const rangeStart = start + content.length - trimmedStart.length;
  return [rangeStart, rangeStart + trimmedStart.trimEnd().length];
}

function applyPixivTag(
  text: string,
  tag: PixivTag,
  baseStyle: NovelInlineStyle | undefined,
  inlines: NovelInline[],
  tagEnds: ReadonlyMap<number, number>,
): number | undefined {
  const nextCursor = tag.end + 1;

  if (tag.kind === 'bare') {
    return tag.name === 'newpage' ? nextCursor : undefined;
  }

  if (tag.kind === 'double') {
    const content = text.slice(tag.contentStart, tag.contentEnd);
    switch (tag.name) {
      case 'rb': {
        const split = content.lastIndexOf('>');

        if (split === -1) return undefined;

        const base = content.slice(0, split).trim();
        const reading = content.slice(split + 1).trim();

        if (base === '' || reading === '') return undefined;

        inlines.push({ type: 'ruby', base, reading, ...(baseStyle === undefined ? {} : { style: baseStyle }) });
        return nextCursor;
      }
      case 'emphasismark': {
        const split = content.lastIndexOf('>');

        if (split === -1) return undefined;

        const [start, end] = trimPixivRange(text, tag.contentStart, tag.contentStart + split);
        const character = content.slice(split + 1).trim() || DEFAULT_EMPHASIS_MARK;

        if (start === end) return undefined;

        inlines.push(...parsePixivSegment(text, start, end, mergeInlineStyles(baseStyle, {
          emphasis: {
            mark: EMPHASIS_MARKS.get(character) ?? 'sesame-dot',
            character,
            side: 'right',
          },
        }), tagEnds));
        return nextCursor;
      }
      case 'jumpuri': {
        const split = content.lastIndexOf('>');
        const [start, end] = trimPixivRange(text, tag.contentStart, split === -1 ? tag.contentEnd : tag.contentStart + split);

        inlines.push(...parsePixivSegment(text, start, end, baseStyle, tagEnds));
        return nextCursor;
      }
      default: return undefined;
    }
  }

  switch (tag.name) {
    case 'pixivimage':
    case 'uploadedimage':
    case 'jump': return nextCursor;
    case 'b': {
      inlines.push(...parsePixivSegment(text, tag.contentStart, tag.contentEnd, mergeInlineStyles(baseStyle, { bold: true }), tagEnds));
      return nextCursor;
    }
    case 'i': {
      inlines.push(...parsePixivSegment(text, tag.contentStart, tag.contentEnd, mergeInlineStyles(baseStyle, { italic: true }), tagEnds));
      return nextCursor;
    }
    default: return undefined;
  }
}

function stylesEqual(a: NovelInlineStyle | undefined, b: NovelInlineStyle | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
