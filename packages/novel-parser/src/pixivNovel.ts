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
  return parsePixivSegment(line, undefined);
}

/**
 * 入れ子のタグは内側から順に修飾を重ねる。
 */
function parsePixivSegment(text: string, baseStyle: NovelInlineStyle | undefined): NovelInline[] {
  const inlines: NovelInline[] = [];
  let cursor = 0;

  const appendText = (value: string, style: NovelInlineStyle | undefined = baseStyle): void => {
    if (value === '') return;

    const previous = inlines.at(-1);

    if (previous?.type === 'text' && stylesEqual(previous.style, style)) {
      previous.value += value;
      return;
    }

    inlines.push({ type: 'text', value, ...(style === undefined ? {} : { style }) });
  };

  while (cursor < text.length) {
    const tag = readPixivTag(text, cursor);

    if (tag !== undefined) {
      const nextCursor = applyPixivTag(tag, baseStyle, inlines);

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
  | { kind: 'single'; name: string; content: string; end: number; }
  | { kind: 'double'; name: string; content: string; end: number; };

/**
 * 指定位置から始まるタグを読み取る。閉じ位置は角括弧の対応を数えて決めるため、
 * 入れ子になったタグも 1 つのタグとして切り出せる。
 */
function readPixivTag(text: string, start: number): PixivTag | undefined {
  if (text[start] !== '[') return undefined;

  const end = findPixivTagEnd(text, start);

  if (end === undefined) return undefined;

  const isDouble = text.startsWith('[[', start);
  const body = text.slice(start + (isDouble ? 2 : 1), end - (isDouble ? 1 : 0));
  const separator = body.indexOf(':');

  if (separator === -1) return { kind: 'bare', name: body, end };

  return {
    kind: isDouble ? 'double' : 'single',
    name: body.slice(0, separator),
    content: body.slice(separator + 1),
    end,
  };
}

function findPixivTagEnd(text: string, start: number): number | undefined {
  let depth = 0;

  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '[') {
      depth += 1;
    } else if (text[index] === ']') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return undefined;
}

function applyPixivTag(
  tag: PixivTag,
  baseStyle: NovelInlineStyle | undefined,
  inlines: NovelInline[],
): number | undefined {
  const nextCursor = tag.end + 1;

  if (tag.kind === 'bare') {
    return tag.name === 'newpage' ? nextCursor : undefined;
  }

  if (tag.kind === 'double') {
    switch (tag.name) {
      case 'rb': {
        const split = tag.content.lastIndexOf('>');

        if (split === -1) return undefined;

        const base = tag.content.slice(0, split).trim();
        const reading = tag.content.slice(split + 1).trim();

        if (base === '' || reading === '') return undefined;

        inlines.push({ type: 'ruby', base, reading, ...(baseStyle === undefined ? {} : { style: baseStyle }) });
        return nextCursor;
      }
      case 'emphasismark': {
        const split = tag.content.lastIndexOf('>');

        if (split === -1) return undefined;

        const marked = tag.content.slice(0, split).trim();
        const character = tag.content.slice(split + 1).trim() || DEFAULT_EMPHASIS_MARK;

        if (marked === '') return undefined;

        inlines.push(...parsePixivSegment(marked, mergeInlineStyles(baseStyle, {
          emphasis: {
            mark: EMPHASIS_MARKS.get(character) ?? 'sesame-dot',
            character,
            side: 'right',
          },
        })));
        return nextCursor;
      }
      case 'jumpuri': {
        const split = tag.content.lastIndexOf('>');
        const title = (split === -1 ? tag.content : tag.content.slice(0, split)).trim();

        inlines.push(...parsePixivSegment(title, baseStyle));
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
      inlines.push(...parsePixivSegment(tag.content, mergeInlineStyles(baseStyle, { bold: true })));
      return nextCursor;
    }
    case 'i': {
      inlines.push(...parsePixivSegment(tag.content, mergeInlineStyles(baseStyle, { italic: true })));
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
