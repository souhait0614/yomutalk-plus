/**
 * 青空文庫テキスト（青空文庫注記形式）のパーサー。
 *
 * 青空文庫「注記一覧」(https://www.aozora.gr.jp/annotation/) と
 * 「青空文庫作業マニュアル【入力】」(https://www.aozora.gr.jp/aozora-manual/index-input.html)
 * に沿って注記を解釈する。
 *
 * == 対応している記法 ==
 * ・見出し
 *   - ［＃「○○」は大見出し／中見出し／小見出し］
 *   - ［＃大見出し］…［＃大見出し終わり］（中・小も同様）
 *   - ［＃ここから大見出し］…［＃ここで大見出し終わり］（中・小も同様）
 *   - ［＃「○○」は同行大見出し］［＃「○○」は窓大見出し］（中・小も同様。行全体ではなく対象文字だけを見出しとして組む）
 * ・ルビ
 *   - ○○《…》／｜○○《…》
 *   - 外字の直後に置く《…》（※［＃…］《…》）
 * ・外字
 *   - ※［＃…］（説明はそのまま保持し、読みが添えられていれば併記する）
 * ・強調
 *   - 傍点: ［＃「○○」に傍点］［＃「○○」の左に傍点］［＃傍点］…［＃傍点終わり］
 *     （白ゴマ傍点・丸傍点・白丸傍点・黒三角傍点・白三角傍点・二重丸傍点・蛇の目傍点・ばつ傍点も同様）
 *   - 傍線: ［＃「○○」に傍線］［＃「○○」の左に傍線］［＃傍線］…［＃傍線終わり］
 *     （二重傍線・鎖線・破線・波線も同様）
 *   - 太字: ［＃「○○」は太字］［＃太字］…［＃太字終わり］［＃ここから太字］…［＃ここで太字終わり］
 *   - 斜体: ［＃「○○」は斜体］［＃斜体］…［＃斜体終わり］［＃ここから斜体］…［＃ここで斜体終わり］
 *   ※ 行中で使う開始／終了型は、注記のある行の末尾までを対象とする（行をまたがない）。
 * ・文字組
 *   - 縦中横: ［＃「○○」は縦中横］［＃縦中横］…［＃縦中横終わり］
 *   - 上付き小文字・行右小書き／下付き小文字・行左小書き（開始／終了型も可）
 *   - 文字サイズ: ［＃「○○」はＮ段階大きな文字］［＃「○○」はＮ段階小さな文字］
 *   - 割り注: ［＃割り注］…［＃割り注終わり］（丸括弧で囲まれていないときは括弧を補う。
 *     旧形式の［＃ここから割り注］…［＃ここで割り注終わり］も可）
 *   - 訓点: ［＃レ］［＃一レ］などの返り点、［＃（ノ）］などの訓点送り仮名
 * ・レイアウト
 *   - 字下げ: ［＃Ｎ字下げ］［＃ここからＮ字下げ］［＃ここで字下げ終わり］
 *   - 折り返し字下げ: ［＃ここから折り返してＮ字下げ］［＃ここから改行天付き、折り返してＮ字下げ］
 *     ［＃ここからＭ字下げ、折り返してＮ字下げ］
 *   - 地付き: ［＃地付き］、地寄せ: ［＃地からＮ字上げ］［＃ここから地からＮ字上げ］［＃ここで字上げ終わり］
 *   - 左右中央: ［＃ページの左右中央］（改丁・改ページまで）
 *   - 字詰め: ［＃ここからＮ字詰め］［＃ここで字詰め終わり］
 *   - 横組み: ［＃「○○」は横組み］［＃横組み］…［＃横組み終わり］［＃ここから横組み］…［＃ここで横組み終わり］
 *     ※ 行中に書かれている場合は、その範囲だけを横組みにする。
 *   - キャプション: ［＃「○○」はキャプション］［＃ここからキャプション］［＃ここでキャプション終わり］
 * ・その他
 *   - ［＃本文終わり］（以降を本文として読まない）
 *   - ママ注記: ［＃「○○」に「ママ」の注記］（本文では「ママ」のルビとして扱う）
 *   - 底本：から始まる記載事項（本文から除外する）
 *
 * == 対応していない記法 ==
 * ・図版注記: ［＃…（fig…、横…×縦…）入る］
 *   画像ファイルを扱わないため、注記ごと読み飛ばす。
 * ・改丁／改ページ／改見開き／改段
 *   リフロー表示では紙面の区切りを再現しないため、注記ごと読み飛ばす（内容は失わない）。
 * ・左ルビ: ［＃「○○」の左に「…」のルビ］［＃左にルビ付き］…［＃左に「…」のルビ付き終わり］
 *   HTML の ruby では左ルビを表現できないため、読み飛ばす。
 * ・注記付き: ［＃注記付き］…［＃「…」の注記付き終わり］
 *   親文字の左に添える注記を保持する場所がないため、読み飛ばす。
 * ・罫囲み: ［＃「○○」は罫囲み］［＃ここから罫囲み］…［＃ここで罫囲み終わり］
 *   本文を一行ごとのブロックとして扱っており、複数行を一つの枠にまとめられないため、注記だけを読み飛ばす（本文は残す）。
 * ・本文の訂正・異同の注記: ［＃「○○」は底本では「…」］［＃ルビの「…」は底本では「…」］
 *   本文の読みには影響しないため、読み飛ばす。
 * ・注記としてのママ: ［＃「○○」はママ］
 *   本文の読みには影響しないため、読み飛ばす（［＃「○○」に「ママ」の注記］はルビとして扱う）。
 * ・割り注内の意図的な改行: ［＃改行］
 *   割り注を一行として組むため、改行位置は保持しない。
 */
import type {
  BlockLayout,
  HeadingBlock,
  NovelBlock,
  NovelDocument,
  NovelInlineStyle,
  NovelParserOptions,
  ParagraphBlock,
} from './types.ts';
import { applyInlineStyle, parseAozoraInline } from './aozoraInline.ts';
import { mergeInlineStyles, normalizeSource, splitSentences } from './shared.ts';

const AOZORA_SEPARATOR = /^-{20,}$/u;
const AOZORA_FOOTER = /^底本(?:の親本)?：/u;
const AOZORA_BODY_END = '［＃本文終わり］';
const AOZORA_HEADING = /［＃「.+?」は(大|中|小)見出し］/u;
const AOZORA_CAPTION = /［＃「.+?」はキャプション］/u;

const INDENT_START = /^ここから([０-９0-9]+)字下げ$/u;
const INDENT_WRAP_START = /^ここから(?:([０-９0-9]+)字下げ、)?折り返して([０-９0-9]+)字下げ$/u;
const INDENT_TOP_START = /^ここから改行天付き、折り返して([０-９0-9]+)字下げ$/u;
const INDENT_SINGLE = /^([０-９0-9]+)字下げ$/u;
const INDENT_END = 'ここで字下げ終わり';
const PAGE_CENTER = 'ページの左右中央';
const END_ALIGNMENT = '地付き';
const RISE_SINGLE = /^地から([０-９0-9]+)字上げ$/u;
const RISE_START = /^ここから地から([０-９0-9]+)字上げ$/u;
const RISE_END = 'ここで字上げ終わり';
const WIDTH_START = /^ここから([０-９0-9]+)字詰め$/u;
const WIDTH_END = 'ここで字詰め終わり';
const CAPTION_START = 'ここからキャプション';
const CAPTION_END = 'ここでキャプション終わり';
const HORIZONTAL_START = 'ここから横組み';
const HORIZONTAL_END = 'ここで横組み終わり';
const BOLD_START = 'ここから太字';
const BOLD_END = 'ここで太字終わり';
const ITALIC_START = 'ここから斜体';
const ITALIC_END = 'ここで斜体終わり';
const HEADING_BLOCK_START = /^ここから(大|中|小)見出し$/u;
const HEADING_BLOCK_END = /^ここで(大|中|小)見出し終わり$/u;
const HEADING_INLINE_START = /^(大|中|小)見出し$/u;
const HEADING_INLINE_END = /^(大|中|小)見出し終わり$/u;
const PAGE_BREAK = /^(?:改丁|改ページ|改見開き|改段)$/u;

// NOTE: ブロック用の注記でも、開始と終了が同じ行にそろっている場合は行中の修飾として扱う
const INLINE_NOTE_PAIRS: readonly (readonly [string, string])[] = [
  [HORIZONTAL_START, HORIZONTAL_END],
  [BOLD_START, BOLD_END],
  [ITALIC_START, ITALIC_END],
];

export interface AozoraTextSource {
  title: string;
  author: string | null;
  header: string;
  body: string;
}

interface AozoraLayoutState {
  indent?: number;
  wrapIndent?: number;
  width?: number;
  rise?: number;
  caption?: boolean;
  horizontal?: boolean;
  center?: boolean;
  headingLevel?: 1 | 2 | 3;
  bold?: boolean;
  italic?: boolean;
}

interface AozoraLineLayout {
  readonly state: AozoraLayoutState;
  readonly single: {
    indent?: number;
    rise?: number;
    endAlignment?: boolean;
    headingLevel?: 1 | 2 | 3;
  };
}

interface AozoraLineFormat {
  content: string;
  layout: BlockLayout;
  headingLevel: 1 | 2 | 3 | undefined;
  baseStyle: NovelInlineStyle | undefined;
  state: AozoraLayoutState;
}

export function splitAozoraText(source: string): AozoraTextSource {
  const normalizedSource = normalizeSource(source);
  const lines = normalizedSource.split('\n');
  const separators = lines.flatMap((line, index) => (AOZORA_SEPARATOR.test(line) ? [index] : []));
  let bodyStart = separators.length >= 2 ? (separators[1] ?? -1) + 1 : 0;
  if (bodyStart > 0) {
    while (bodyStart < lines.length && lines[bodyStart] === '') bodyStart += 1;
  }
  const body = lines.slice(bodyStart).join('\n');
  return {
    ...getAozoraMetadata(lines),
    header: normalizedSource.slice(0, normalizedSource.length - body.length),
    body,
  };
}

export function composeAozoraText({
  title,
  author,
  body,
  header = '',
}: Omit<AozoraTextSource, 'header'> & { header?: string; }): string {
  if (!title.trim() || (/[\r\n]/u).test(title) || (/[\r\n]/u).test(author ?? '')) {
    throw new Error('Aozora title and author must be single lines, and title is required');
  }
  const headerLines = normalizeSource(header).split('\n');
  const separatorIndex = headerLines.findIndex((line) => AOZORA_SEPARATOR.test(line));
  const bodySeparatorIndex = headerLines.findIndex((line, index) => index > separatorIndex && AOZORA_SEPARATOR.test(line));
  const extraMetadata = separatorIndex === -1 ? [] : headerLines.slice(0, separatorIndex)
    .filter((line) => line.trim() !== '').slice(2);
  const annotations = bodySeparatorIndex === -1 ? [] : headerLines.slice(separatorIndex + 1, bodySeparatorIndex);
  const bodyPrefix = bodySeparatorIndex === -1 ? '\n' : ['', ...headerLines.slice(bodySeparatorIndex + 1)].join('\n');
  const separator = '--------------------';
  return [title.trim(), author?.trim() ?? '', '', separator, ...extraMetadata, ...annotations, separator].join('\n')
    + (bodyPrefix || (body ? '\n' : '')) + body;
}

export function parseAozoraText(
  source: string,
  options: NovelParserOptions = {},
): NovelDocument {
  const metadata = splitAozoraText(source);
  const bodyLineOffset = metadata.header.split('\n').length - 1;
  const lines = metadata.body.split('\n');
  const footerIndex = lines.findIndex((line) => AOZORA_FOOTER.test(line));
  let bodyEnd = footerIndex === -1 ? lines.length : footerIndex;
  // NOTE: 底本情報やファイル末尾に続く空行は本文の間隔ではない
  while (bodyEnd > 0 && lines[bodyEnd - 1]?.trim() === '') bodyEnd -= 1;
  let state: AozoraLayoutState = {};
  const blocks: NovelBlock[] = [];

  const appendLine = (line: string, lineIndex: number): void => {
    if (line.trim() === '') {
      // NOTE: 本文先頭の空行はファイル整形によるものとして扱う
      if (blocks.length > 0) {
        blocks.push({ type: 'blank' });
        options.onBlock?.(bodyLineOffset + lineIndex);
      }
      return;
    }

    const lineFormat = getAozoraLineFormat(line, state);
    state = lineFormat.state;

    if (lineFormat.content.trim() === '') return;

    const block = parseAozoraLine(
      lineFormat.content,
      lineFormat.layout,
      lineFormat.headingLevel,
      lineFormat.baseStyle,
    );

    if (block === null) return;

    blocks.push(block);
    options.onBlock?.(bodyLineOffset + lineIndex);
  };

  for (const [lineIndex, line] of lines.entries()) {
    if (lineIndex >= bodyEnd) break;

    const bodyEndIndex = line.indexOf(AOZORA_BODY_END);

    if (bodyEndIndex === -1) {
      appendLine(line, lineIndex);
      continue;
    }

    const rest = line.slice(0, bodyEndIndex);

    if (rest.trim() !== '') appendLine(rest, lineIndex);

    break;
  }

  return {
    format: 'aozora-text',
    title: metadata.title,
    author: metadata.author,
    blocks,
  };
}

function parseAozoraLine(
  line: string,
  layout: BlockLayout,
  headingLevel: 1 | 2 | 3 | undefined,
  baseStyle: NovelInlineStyle | undefined,
): ParagraphBlock | HeadingBlock | null {
  const inlines = applyInlineStyle(parseAozoraInline(line), baseStyle);

  // NOTE: 注記だけの行は本文を持たないため、ブロックにしない
  if (inlines.length === 0) return null;

  const sentences = splitSentences(inlines);
  const layoutProps = Object.keys(layout).length === 0 ? {} : layout;

  if (headingLevel !== undefined) {
    return {
      type: 'heading',
      level: headingLevel,
      sentences: sentences.map((sentence) => ({ ...sentence, textType: 'heading' })),
      ...layoutProps,
    };
  }

  return {
    type: 'paragraph',
    sentences,
    ...layoutProps,
  };
}

function getAozoraLineFormat(line: string, state: AozoraLayoutState): AozoraLineFormat {
  const nextState: AozoraLayoutState = { ...state };
  const context: AozoraLineLayout = { state: nextState, single: {} };
  let content = '';
  let cursor = 0;

  while (cursor < line.length) {
    const noteStart = line.indexOf('［＃', cursor);

    if (noteStart === -1) {
      content += line.slice(cursor);
      break;
    }

    const noteEnd = line.indexOf('］', noteStart + 2);

    if (noteEnd === -1) {
      content += line.slice(cursor);
      break;
    }

    // NOTE: ※［＃…］は外字注記であり、レイアウト注記ではない
    if (line[noteStart - 1] === '※') {
      content += line.slice(cursor, noteEnd + 1);
      cursor = noteEnd + 1;
      continue;
    }

    const note = line.slice(noteStart + 2, noteEnd);

    content += line.slice(cursor, noteStart);

    if (!applyLayoutNote(note, context, line)) {
      content += line.slice(noteStart, noteEnd + 1);
    }

    cursor = noteEnd + 1;
  }

  const indent = context.single.indent ?? nextState.indent;
  const rise = context.single.rise ?? nextState.rise;
  const layout: BlockLayout = {};

  if (indent !== undefined) layout.indent = indent;
  if (nextState.wrapIndent !== undefined) layout.wrapIndent = nextState.wrapIndent;
  if (nextState.width !== undefined) layout.width = nextState.width;
  if (rise !== undefined) layout.rise = rise;
  if (rise !== undefined || context.single.endAlignment === true) {
    layout.align = 'end';
  } else if (nextState.center === true) {
    layout.align = 'center';
  }
  if (nextState.caption === true || AOZORA_CAPTION.test(content)) layout.caption = true;
  if (nextState.horizontal === true) layout.horizontal = true;

  return {
    content,
    layout,
    headingLevel: context.single.headingLevel
      ?? nextState.headingLevel
      ?? getHeadingLevel(content.match(AOZORA_HEADING)?.[1]),
    baseStyle: mergeInlineStyles(
      nextState.bold === true ? { bold: true } : undefined,
      nextState.italic === true ? { italic: true } : undefined,
    ),
    state: nextState,
  };
}

function applyLayoutNote(note: string, context: AozoraLineLayout, line: string): boolean {
  const { state, single } = context;

  if (isClosedInLine(note, line)) return false;

  if (note === INDENT_END) {
    state.indent = undefined;
    state.wrapIndent = undefined;
    return true;
  }

  const indentStart = note.match(INDENT_START);

  if (indentStart !== null) {
    state.indent = parseIndent(indentStart[1]);
    state.wrapIndent = undefined;
    return true;
  }

  const indentTopStart = note.match(INDENT_TOP_START);

  if (indentTopStart !== null) {
    // NOTE: 外側の字下げがあれば、折り返しは外側の字下げに加算する
    state.wrapIndent = (state.indent ?? 0) + parseIndent(indentTopStart[1]);
    return true;
  }

  const indentWrapStart = note.match(INDENT_WRAP_START);

  if (indentWrapStart !== null) {
    state.indent = parseIndent(indentWrapStart[1]);
    state.wrapIndent = parseIndent(indentWrapStart[2]);
    return true;
  }

  const indentSingle = note.match(INDENT_SINGLE);

  if (indentSingle !== null) {
    single.indent = parseIndent(indentSingle[1]);
    return true;
  }

  if (note === PAGE_CENTER) {
    state.center = true;
    return true;
  }

  if (note === END_ALIGNMENT) {
    single.endAlignment = true;
    return true;
  }

  if (note === RISE_END) {
    state.rise = undefined;
    return true;
  }

  const riseStart = note.match(RISE_START);

  if (riseStart !== null) {
    state.rise = parseIndent(riseStart[1]);
    return true;
  }

  const riseSingle = note.match(RISE_SINGLE);

  if (riseSingle !== null) {
    single.rise = parseIndent(riseSingle[1]);
    return true;
  }

  if (note === WIDTH_END) {
    state.width = undefined;
    return true;
  }

  const widthStart = note.match(WIDTH_START);

  if (widthStart !== null) {
    state.width = parseIndent(widthStart[1]);
    return true;
  }

  if (note === CAPTION_START) {
    state.caption = true;
    return true;
  }

  if (note === CAPTION_END) {
    state.caption = undefined;
    return true;
  }

  if (note === HORIZONTAL_START) {
    state.horizontal = true;
    return true;
  }

  if (note === HORIZONTAL_END) {
    state.horizontal = undefined;
    return true;
  }

  if (note === BOLD_START) {
    state.bold = true;
    return true;
  }

  if (note === BOLD_END) {
    state.bold = undefined;
    return true;
  }

  if (note === ITALIC_START) {
    state.italic = true;
    return true;
  }

  if (note === ITALIC_END) {
    state.italic = undefined;
    return true;
  }

  if (HEADING_BLOCK_END.test(note)) {
    state.headingLevel = undefined;
    return true;
  }

  const headingBlockStart = note.match(HEADING_BLOCK_START);

  if (headingBlockStart !== null) {
    state.headingLevel = getHeadingLevel(headingBlockStart[1]);
    return true;
  }

  if (HEADING_INLINE_END.test(note)) {
    return true;
  }

  const headingInlineStart = note.match(HEADING_INLINE_START);

  if (headingInlineStart !== null) {
    single.headingLevel = getHeadingLevel(headingInlineStart[1]);
    return true;
  }

  if (PAGE_BREAK.test(note)) {
    state.center = undefined;
    return true;
  }

  return false;
}

function isClosedInLine(note: string, line: string): boolean {
  const pair = INLINE_NOTE_PAIRS.find(([start, end]) => note === start || note === end);

  return pair !== undefined && line.includes(pair[0]) && line.includes(pair[1]);
}

function parseIndent(value: string | undefined): number {
  return Number.parseInt(value?.replace(/[０-９]/gu, (digit) => (
    String.fromCharCode(digit.charCodeAt(0) - '０'.charCodeAt(0) + '0'.charCodeAt(0))
  )) ?? '0', 10);
}

function getHeadingLevel(level: string | undefined): 1 | 2 | 3 | undefined {
  if (level === '大') {
    return 1;
  }

  if (level === '中') {
    return 2;
  }

  if (level === '小') {
    return 3;
  }

  return undefined;
}

function getAozoraMetadata(lines: string[]): {
  title: string;
  author: string | null;
} {
  const separatorIndex = lines.findIndex((line) => AOZORA_SEPARATOR.test(line));
  const headerLines = lines
    .slice(0, separatorIndex === -1 ? lines.length : separatorIndex)
    .filter((line) => line.trim() !== '');

  return {
    title: headerLines[0] ?? '',
    author: headerLines[1] ?? null,
  };
}
