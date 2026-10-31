import type {
  BracketInline,
  BracketKind,
  NovelInline,
  NovelInlineStyle,
  NovelSentence,
  NovelTextType,
  SpaceInline,
  TextInline,
} from './types.ts';

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
    if (style.warichu) (merged ??= {}).warichu = true;
    if (style.kunten) (merged ??= {}).kunten = style.kunten;
    if (style.inlineHeading) (merged ??= {}).inlineHeading = style.inlineHeading;
  }

  return merged;
}

const SENTENCE_DELIMITERS = new Set([
  '。', '．', '｡',
  '、', '，', '､',
  '？', '?', '⁇', '⁈',
  '！', '!', '‼', '⁉',
  '…', '‥',
]);

const SPACES = new Set([' ', '\u3000']);

const BRACKET_PAIRS = new Map([
  ['「', '」'],
  ['『', '』'],
  ['（', '）'],
  ['(', ')'],
  ['〔', '〕'],
  ['［', '］'],
  ['｛', '｝'],
  ['{', '}'],
  ['〈', '〉'],
  ['《', '》'],
  ['【', '】'],
  ['〖', '〗'],
  ['〘', '〙'],
  ['〚', '〛'],
  ['“', '”'],
  ['‘', '’'],
]);

const BRACKET_CLOSERS = new Set(BRACKET_PAIRS.values());

const DIALOGUE_OPEN = '「';

export function splitSentences(inlines: NovelInline[]): NovelSentence[] {
  const sentences: NovelSentence[] = [];
  let currentInlines: NovelInline[] = [];
  let currentTextType: NovelTextType = 'narration';
  let isInsideDialogue = false;

  const flush = () => {
    if (currentInlines.length === 0) return;
    sentences.push({ textType: currentTextType, inlines: currentInlines });
    currentInlines = [];
    currentTextType = isInsideDialogue ? 'dialogue' : 'narration';
  };

  const pushInline = (inline: NovelInline) => {
    if (currentInlines.length === 0) {
      currentTextType = isInsideDialogue ? 'dialogue' : 'narration';
    }
    currentInlines.push(inline);
  };

  const pushBracket = (inline: BracketInline) => {
    flush();
    if (inline.kind === 'open') isInsideDialogue = true;
    pushInline(inline);
    flush();
    if (inline.kind === 'close') isInsideDialogue = false;
  };

  const pushSpace = (inline: SpaceInline) => {
    flush();
    pushInline(inline);
    flush();
  };

  for (const inline of inlines) {
    if (inline.type === 'bracket') {
      pushBracket(inline);
      continue;
    }

    if (inline.type === 'space') {
      pushSpace(inline);
      continue;
    }

    if (inline.type !== 'text') {
      pushInline(inline);
      continue;
    }

    for (const part of splitTextBySentence(inline)) {
      if (part.type === 'bracket') {
        pushBracket(part);
      } else if (part.type === 'space') {
        pushSpace(part);
      } else {
        pushInline(part);
        if (part.type === 'text' && isSentenceDelimiter(part.value.at(-1))) flush();
      }
    }
  }

  flush();

  return sentences.length > 0 ? sentences : [{ textType: 'narration', inlines: [...inlines] }];
}

function isSentenceDelimiter(char: string | undefined): boolean {
  return char !== undefined && SENTENCE_DELIMITERS.has(char);
}

function splitTextBySentence(inline: TextInline): NovelInline[] {
  const style = inline.style;
  const result: NovelInline[] = [];
  let current = '';
  let previousWasDelimiter = false;
  let bracketCloser: string | undefined;

  const flushText = () => {
    if (current === '') return;
    result.push(createTextInline(current, style));
    current = '';
  };

  for (const char of inline.value) {
    const isDelimiter = SENTENCE_DELIMITERS.has(char);

    if (previousWasDelimiter && !isDelimiter) {
      flushText();
    }

    if (bracketCloser !== undefined) {
      if (char === bracketCloser) {
        flushText();
        result.push(createBracketInline(char, 'close', style));
        bracketCloser = undefined;
      } else if (SPACES.has(char)) {
        flushText();
        result.push(createSpaceInline(char, style));
      } else {
        current += char;
      }
    } else if (BRACKET_PAIRS.has(char)) {
      flushText();
      result.push(createBracketInline(char, 'open', style));
      bracketCloser = BRACKET_PAIRS.get(char);
    } else if (BRACKET_CLOSERS.has(char)) {
      flushText();
      result.push(createBracketInline(char, 'close', style));
    } else if (SPACES.has(char)) {
      flushText();
      result.push(createSpaceInline(char, style));
    } else {
      current += char;
    }

    previousWasDelimiter = isDelimiter;
  }

  flushText();

  return result;
}

function createTextInline(value: string, style: NovelInlineStyle | undefined): TextInline {
  return { type: 'text', value, ...(style === undefined ? {} : { style }) };
}

function createBracketInline(
  value: string,
  kind: BracketKind,
  style: NovelInlineStyle | undefined,
): BracketInline {
  return { type: 'bracket', value, kind, ...(style === undefined ? {} : { style }) };
}

function createSpaceInline(value: string, style: NovelInlineStyle | undefined): SpaceInline {
  return { type: 'space', value, ...(style === undefined ? {} : { style }) };
}

export function classifySentenceTextType(inlines: NovelInline[]): NovelTextType {
  const firstInline = inlines[0];
  if (firstInline?.type === 'bracket' && firstInline.value === DIALOGUE_OPEN) {
    return 'dialogue';
  }
  return 'narration';
}

export function normalizeSource(source: string): string {
  return source.replace(/^\uFEFF/u, '').replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}
