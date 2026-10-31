import type {
  EmphasisMark,
  InlineSide,
  LineMark,
  NovelInline,
  NovelInlineStyle,
  RubyInline,
} from './types.ts';

// NOTE: 外字は本文中では読み（読みがなければ代替文字）1文字分として数える
const GAIJI_PLACEHOLDER_CHARACTER = '□';

const EMPHASIS_MARKS: ReadonlyMap<string, EmphasisMark> = new Map([
  ['傍点', 'sesame-dot'],
  ['白ゴマ傍点', 'white-sesame-dot'],
  ['丸傍点', 'black-circle'],
  ['白丸傍点', 'white-circle'],
  ['黒三角傍点', 'black-triangle'],
  ['白三角傍点', 'white-triangle'],
  ['二重丸傍点', 'bullseye'],
  ['蛇の目傍点', 'fisheye'],
  ['ばつ傍点', 'saltire'],
]);

const LINE_MARKS: ReadonlyMap<string, LineMark> = new Map([
  ['傍線', 'solid'],
  ['二重傍線', 'double'],
  ['鎖線', 'dotted'],
  ['破線', 'dashed'],
  ['波線', 'wave'],
]);

const SIDE_PREFIXES: readonly { prefix: string; side: InlineSide; }[] = [
  { prefix: 'に', side: 'right' },
  { prefix: 'の左に', side: 'left' },
];

const WARICHU_MARKER = '割り注';

const MARKER_STYLES: ReadonlyMap<string, NovelInlineStyle> = buildMarkerStyles();

const KAERITEN_PATTERN = /^(?:レ|[一二三四五六七八九十上中下甲乙丙丁天地人]レ?)$/u;
const OKURIGANA_PATTERN = /^（([^）]*)）$/u;
const FONT_SIZE_STEP_PATTERN = /^は([０-９0-9]+)段階(大きな|小さな)文字$/u;
const INLINE_HEADING_PATTERN = /^は(同行|窓)(大|中|小)見出し$/u;
const MAMA_NOTE_PATTERN = /^に「([^」]*)」の注記$/u;

const HAN_CHARACTER = /^[\p{Script=Han}々〆〇ヶ仝]$/u;
const HIRAGANA_CHARACTER = /^\p{Script=Hiragana}$/u;
const KATAKANA_CHARACTER = /^[\p{Script=Katakana}ー]$/u;
const LATIN_CHARACTER = /^\p{Script=Latin}$/u;

function buildMarkerStyles(): ReadonlyMap<string, NovelInlineStyle> {
  const markers = new Map<string, NovelInlineStyle>();

  for (const [name, mark] of EMPHASIS_MARKS) {
    markers.set(name, { emphasis: { mark, side: 'right' } });
    markers.set(`左に${name}`, { emphasis: { mark, side: 'left' } });
  }

  for (const [name, mark] of LINE_MARKS) {
    markers.set(name, { line: { mark, side: 'right' } });
    markers.set(`左に${name}`, { line: { mark, side: 'left' } });
  }

  markers.set('太字', { bold: true });
  markers.set('斜体', { italic: true });
  markers.set('縦中横', { tateChuYoko: true });
  markers.set('上付き小文字', { script: 'superscript' });
  markers.set('行右小書き', { script: 'superscript' });
  markers.set('下付き小文字', { script: 'subscript' });
  markers.set('行左小書き', { script: 'subscript' });
  markers.set('横組み', { horizontal: true });
  markers.set('罫囲み', { frame: true });
  markers.set(WARICHU_MARKER, { warichu: true });

  return markers;
}

/**
 * 開始／終了型でない修飾注記を一つにまとめる。
 * 同じ種類の修飾は、後から指定された内容で上書きする。
 */
export function mergeInlineStyles(
  ...styles: readonly (NovelInlineStyle | undefined)[]
): NovelInlineStyle | undefined {
  let merged: NovelInlineStyle | undefined;

  for (const style of styles) {
    if (!style) continue;

    if (style.emphasis) (merged ??= {}).emphasis = style.emphasis;
    if (style.line) (merged ??= {}).line = style.line;
    if (style.bold) (merged ??= {}).bold = true;
    if (style.italic) (merged ??= {}).italic = true;
    if (style.tateChuYoko) (merged ??= {}).tateChuYoko = true;
    if (style.script) (merged ??= {}).script = style.script;
    if (style.fontSizeStep !== undefined) (merged ??= {}).fontSizeStep = style.fontSizeStep;
    if (style.horizontal) (merged ??= {}).horizontal = true;
    if (style.frame) (merged ??= {}).frame = true;
    if (style.warichu) (merged ??= {}).warichu = true;
    if (style.kunten) (merged ??= {}).kunten = style.kunten;
    if (style.inlineHeading) (merged ??= {}).inlineHeading = style.inlineHeading;
  }

  return merged;
}

export function applyInlineStyle(
  inlines: readonly NovelInline[],
  style: NovelInlineStyle | undefined,
): NovelInline[] {
  if (!style) return [...inlines];

  return inlines.map((inline) => {
    const merged = mergeInlineStyles(inline.style, style);
    return merged ? { ...inline, style: merged } : inline;
  });
}

class InlineStyleStack {
  readonly #entries = new Map<string, NovelInlineStyle>();
  #merged: NovelInlineStyle | undefined;
  #isDirty = true;

  push(key: string, style: NovelInlineStyle): void {
    this.#entries.set(key, style);
    this.#isDirty = true;
  }

  remove(key: string): void {
    if (this.#entries.delete(key)) this.#isDirty = true;
  }

  get merged(): NovelInlineStyle | undefined {
    if (this.#isDirty) {
      this.#merged = mergeInlineStyles(...this.#entries.values());
      this.#isDirty = false;
    }

    return this.#merged;
  }
}

/**
 * 青空文庫の一行分のインライン注記を解釈する。
 * ルビ、外字、傍点・傍線などの強調、訓点、割り注、文字サイズを扱う。
 */
export function parseAozoraInline(source: string): NovelInline[] {
  const inlines: NovelInline[] = [];
  const styles = new InlineStyleStack();
  const warichuParentheses: boolean[] = [];
  let cursor = 0;

  const pushInline = (inline: NovelInline): void => {
    const style = inline.style === undefined
      ? styles.merged
      : mergeInlineStyles(inline.style, styles.merged);
    const styled = style === undefined ? inline : { ...inline, style };
    const previous = inlines.at(-1);

    if (
      styled.type === 'text'
      && previous?.type === 'text'
      && (previous.style === styled.style || stylesEqual(previous.style, styled.style))
    ) {
      previous.value += styled.value;
      return;
    }

    inlines.push(styled);
  };

  const pushKunten = (value: string, kunten: NonNullable<NovelInlineStyle['kunten']>): void => {
    pushInline({ type: 'text', value, style: { kunten } });
  };

  const handleNote = (body: string, noteStart: number): void => {
    // NOTE: 割り注には「ここから割り注」「ここで割り注終わり」という旧形式もある
    const endMarker = readEndMarker(body)
      ?? (body.startsWith('ここで') ? readEndMarker(body.slice('ここで'.length)) : undefined);

    if (endMarker !== undefined) {
      if (endMarker === WARICHU_MARKER && warichuParentheses.pop() === true) {
        pushInline({ type: 'bracket', value: '）', kind: 'close' });
      }

      styles.remove(endMarker);
      return;
    }

    const startBody = body.startsWith('ここから') ? body.slice('ここから'.length) : body;
    const startMarker = MARKER_STYLES.get(startBody);

    if (startMarker !== undefined) {
      if (startBody === WARICHU_MARKER) {
        styles.push(startBody, startMarker);
        const hasParentheses = isWrappedByParentheses(source, noteStart);
        warichuParentheses.push(!hasParentheses);
        if (!hasParentheses) pushInline({ type: 'bracket', value: '（', kind: 'open' });
        return;
      }

      styles.push(startBody, startMarker);
      return;
    }

    const okurigana = body.match(OKURIGANA_PATTERN);

    if (okurigana !== null) {
      pushKunten(okurigana[1] ?? '', 'okurigana');
      return;
    }

    if (KAERITEN_PATTERN.test(body)) {
      pushKunten(body, 'kaeriten');
      return;
    }

    const forwardNote = readForwardNote(body);

    if (forwardNote === null) return;

    if (forwardNote.kind === 'ruby') {
      applyTrailingRuby(inlines, forwardNote.target, forwardNote.reading);
      return;
    }

    applyTrailingStyle(inlines, forwardNote.target, forwardNote.style);
  };

  while (cursor < source.length) {
    if (source.startsWith('※［＃', cursor)) {
      const noteEnd = source.indexOf('］', cursor + 3);

      if (noteEnd !== -1) {
        const ruby = readRuby(source, noteEnd + 1);
        inlines.push({
          type: 'gaiji',
          description: source.slice(cursor + 3, noteEnd),
          reading: ruby?.reading ?? null,
          ...(styles.merged === undefined ? {} : { style: styles.merged }),
        });
        cursor = ruby?.end ?? noteEnd + 1;
        continue;
      }
    }

    if (source.startsWith('［＃', cursor)) {
      const noteEnd = source.indexOf('］', cursor + 2);

      if (noteEnd !== -1) {
        handleNote(source.slice(cursor + 2, noteEnd), cursor);
        cursor = noteEnd + 1;
        continue;
      }
    }

    if (source[cursor] === '｜') {
      const rubyStart = source.indexOf('《', cursor + 1);
      const ruby = rubyStart === -1 ? null : readRuby(source, rubyStart);

      if (rubyStart !== -1 && ruby !== null && rubyStart > cursor + 1) {
        inlines.push({
          type: 'ruby',
          base: source.slice(cursor + 1, rubyStart),
          reading: ruby.reading,
          ...(styles.merged === undefined ? {} : { style: styles.merged }),
        });
        cursor = ruby.end;
        continue;
      }
    }

    if (source[cursor] === '《') {
      const ruby = readRuby(source, cursor);
      const base = ruby === null ? null : takeImplicitRubyBase(inlines);

      if (ruby !== null && base !== null) {
        const style = mergeInlineStyles(base.style, styles.merged);
        inlines.push({
          type: 'ruby',
          base: base.value,
          reading: ruby.reading,
          ...(style === undefined ? {} : { style }),
        });
        cursor = ruby.end;
        continue;
      }
    }

    const codePoint = source.codePointAt(cursor);

    if (codePoint === undefined) {
      break;
    }

    const character = String.fromCodePoint(codePoint);
    pushInline({ type: 'text', value: character });
    cursor += character.length;
  }

  return inlines;
}

function readEndMarker(body: string): string | undefined {
  const suffix = '終わり';

  if (!body.endsWith(suffix)) return undefined;

  const key = body.slice(0, -suffix.length);

  return MARKER_STYLES.has(key) ? key : undefined;
}

function isWrappedByParentheses(source: string, noteStart: number): boolean {
  const previous = source[noteStart - 1];

  return previous === '（' || previous === '(';
}

// eslint-disable-next-line @stylistic/operator-linebreak -- 長い union は行頭の | で揃えたい
type ForwardNote =
  | { kind: 'style'; target: string; style: NovelInlineStyle; }
  | { kind: 'ruby'; target: string; reading: string; };

function readForwardNote(body: string): ForwardNote | null {
  if (!body.startsWith('「')) return null;

  const targetEnd = findQuotedTargetEnd(body, 1);

  if (targetEnd === -1) return null;

  const target = body.slice(1, targetEnd);
  const rest = body.slice(targetEnd + 1);

  if (target === '') return null;

  const mama = rest.match(MAMA_NOTE_PATTERN);

  if (mama !== null) {
    return { kind: 'ruby', target, reading: mama[1] ?? '' };
  }

  const style = readForwardNoteStyle(rest);

  return style === undefined ? null : { kind: 'style', target, style };
}

function findQuotedTargetEnd(body: string, start: number): number {
  let depth = 0;

  for (let index = start - 1; index < body.length; index += 1) {
    const character = body[index];

    if (character === '「') {
      depth += 1;
    } else if (character === '」') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function readForwardNoteStyle(rest: string): NovelInlineStyle | undefined {
  for (const { prefix, side } of SIDE_PREFIXES) {
    if (!rest.startsWith(prefix)) continue;

    const name = rest.slice(prefix.length);
    const emphasis = EMPHASIS_MARKS.get(name);

    if (emphasis !== undefined) return { emphasis: { mark: emphasis, side } };

    const line = LINE_MARKS.get(name);

    if (line !== undefined) return { line: { mark: line, side } };
  }

  switch (rest) {
    case 'は太字': return { bold: true };
    case 'は斜体': return { italic: true };
    case 'は縦中横': return { tateChuYoko: true };
    case 'は上付き小文字':
    case 'は行右小書き': return { script: 'superscript' };
    case 'は下付き小文字':
    case 'は行左小書き': return { script: 'subscript' };
    case 'は横組み': return { horizontal: true };
    case 'は罫囲み': return { frame: true };
    default: break;
  }

  const fontSize = rest.match(FONT_SIZE_STEP_PATTERN);

  if (fontSize !== null) {
    const step = parseFullWidthNumber(fontSize[1]);
    return { fontSizeStep: fontSize[2] === '大きな' ? step : -step };
  }

  const heading = rest.match(INLINE_HEADING_PATTERN);

  if (heading !== null) {
    return {
      inlineHeading: {
        level: getHeadingLevel(heading[2]),
        style: heading[1] === '窓' ? 'window' : 'inline',
      },
    };
  }

  return undefined;
}

function getHeadingLevel(level: string | undefined): 1 | 2 | 3 {
  if (level === '大') return 1;
  if (level === '小') return 3;
  return 2;
}

function parseFullWidthNumber(value: string | undefined): number {
  return Number.parseInt(
    (value ?? '0').replace(/[０-９]/gu, (digit) => String.fromCharCode(digit.charCodeAt(0) - '０'.charCodeAt(0) + '0'.charCodeAt(0))),
    10,
  );
}

function applyTrailingStyle(inlines: NovelInline[], target: string, style: NovelInlineStyle): void {
  const plainText = getInlinesPlainText(inlines);

  if (target === '' || !plainText.endsWith(target)) return;

  replaceRange(
    inlines,
    plainText.length - target.length,
    plainText.length,
    (inline) => {
      const merged = mergeInlineStyles(inline.style, style);
      return merged ? { ...inline, style: merged } : inline;
    },
  );
}

function applyTrailingRuby(inlines: NovelInline[], target: string, reading: string): void {
  const plainText = getInlinesPlainText(inlines);

  if (target === '' || reading === '' || !plainText.endsWith(target)) return;

  const taken = takeTrailingPlainInlines(inlines, target.length);

  if (taken === null) return;

  const base = taken.map((inline) => (inline.type === 'text' || inline.type === 'bracket' || inline.type === 'space'
    ? inline.value
    : '')).join('');
  const style = taken[0]?.style;
  const ruby: RubyInline = { type: 'ruby', base, reading, ...(style === undefined ? {} : { style }) };

  inlines.push(ruby);
}

function replaceRange(
  inlines: NovelInline[],
  start: number,
  end: number,
  transform: (inline: NovelInline) => NovelInline,
): void {
  const replaced: NovelInline[] = [];
  let offset = 0;

  for (const inline of inlines) {
    const length = getInlinePlainText(inline).length;
    const inlineStart = offset;
    const inlineEnd = offset + length;
    offset = inlineEnd;

    if (inlineEnd <= start || inlineStart >= end) {
      replaced.push(inline);
      continue;
    }

    if (inlineStart >= start && inlineEnd <= end) {
      replaced.push(transform(inline));
      continue;
    }

    if (inline.type !== 'text' && inline.type !== 'bracket' && inline.type !== 'space') {
      replaced.push(transform(inline));
      continue;
    }

    const from = Math.max(start, inlineStart) - inlineStart;
    const to = Math.min(end, inlineEnd) - inlineStart;
    const value = inline.value;

    if (from > 0) replaced.push({ ...inline, value: value.slice(0, from) });
    if (to > from) replaced.push(transform({ ...inline, value: value.slice(from, to) }));
    if (to < value.length) replaced.push({ ...inline, value: value.slice(to) });
  }

  inlines.splice(0, inlines.length, ...replaced);
}

/**
 * 末尾から指定した文字数分のインラインを取り出す。
 * ルビや外字の途中で切れる場合は null を返し、inlines は変更しない。
 */
function takeTrailingPlainInlines(inlines: NovelInline[], length: number): NovelInline[] | null {
  const taken: NovelInline[] = [];
  let remaining = length;
  let end = inlines.length;
  let split: { index: number; head: string; inline: Extract<NovelInline, { value: string; }>; } | undefined;

  while (remaining > 0) {
    const index = end - 1;
    const inline = inlines[index];

    if (inline === undefined) return null;
    if (inline.type !== 'text' && inline.type !== 'bracket' && inline.type !== 'space') return null;

    const value = inline.value;

    if (value.length > remaining) {
      const cut = value.length - remaining;
      split = { index, head: value.slice(0, cut), inline };
      taken.unshift({ ...inline, value: value.slice(cut) });
      remaining = 0;
    } else {
      taken.unshift(inline);
      remaining -= value.length;
      end = index;
    }
  }

  if (split !== undefined) inlines[split.index] = { ...split.inline, value: split.head };
  inlines.splice(end);

  return taken;
}

function getInlinesPlainText(inlines: readonly NovelInline[]): string {
  return inlines.map(getInlinePlainText).join('');
}

function getInlinePlainText(inline: NovelInline): string {
  if (inline.type === 'ruby') return inline.base;
  if (inline.type === 'gaiji') return inline.reading ?? GAIJI_PLACEHOLDER_CHARACTER;
  return inline.value;
}

function stylesEqual(a: NovelInlineStyle | undefined, b: NovelInlineStyle | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

const getPreviousCharacterStart = (value: string, end: number): number => {
  const codeUnit = value.charCodeAt(end - 1);
  return codeUnit >= 0xDC00 && codeUnit <= 0xDFFF && end >= 2 ? end - 2 : end - 1;
};

function takeImplicitRubyBase(inlines: NovelInline[]): { value: string; style?: NovelInlineStyle; } | null {
  const lastInline = inlines.at(-1);

  if (lastInline?.type !== 'text' || lastInline.value === '') {
    return null;
  }

  const { value } = lastInline;
  let baseStart = getPreviousCharacterStart(value, value.length);
  const script = getCharacterScript(value.slice(baseStart));

  if (script === null) {
    return null;
  }

  while (baseStart > 0) {
    const previousStart = getPreviousCharacterStart(value, baseStart);
    if (getCharacterScript(value.slice(previousStart, baseStart)) !== script) break;
    baseStart = previousStart;
  }

  const base = value.slice(baseStart);
  const style = lastInline.style;

  if (baseStart === 0) {
    inlines.pop();
  } else {
    lastInline.value = value.slice(0, baseStart);
  }

  return { value: base, ...(style === undefined ? {} : { style }) };
}

function getCharacterScript(character: string): string | null {
  if (HAN_CHARACTER.test(character)) {
    return 'han';
  }

  if (HIRAGANA_CHARACTER.test(character)) {
    return 'hiragana';
  }

  if (KATAKANA_CHARACTER.test(character)) {
    return 'katakana';
  }

  if (LATIN_CHARACTER.test(character)) {
    return 'latin';
  }

  return null;
}

function readRuby(
  source: string,
  rubyStart: number,
): { reading: string; end: number; } | null {
  if (source[rubyStart] !== '《') {
    return null;
  }

  const rubyEnd = source.indexOf('》', rubyStart + 1);

  if (rubyEnd === -1) {
    return null;
  }

  return {
    reading: source.slice(rubyStart + 1, rubyEnd),
    end: rubyEnd + 1,
  };
}
