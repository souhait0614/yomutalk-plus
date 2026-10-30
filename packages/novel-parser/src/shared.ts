import type {
  BracketInline,
  BracketKind,
  NovelInline,
  NovelSentence,
  NovelTextType,
  SpaceInline,
} from './types.ts';

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

    for (const part of splitTextBySentence(inline.value)) {
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

function splitTextBySentence(text: string): NovelInline[] {
  const result: NovelInline[] = [];
  let current = '';
  let previousWasDelimiter = false;
  let bracketCloser: string | undefined;

  const flushText = () => {
    if (current === '') return;
    result.push({ type: 'text', value: current });
    current = '';
  };

  for (const char of text) {
    const isDelimiter = SENTENCE_DELIMITERS.has(char);

    if (previousWasDelimiter && !isDelimiter) {
      flushText();
    }

    if (bracketCloser !== undefined) {
      if (char === bracketCloser) {
        flushText();
        result.push(createBracketInline(char, 'close'));
        bracketCloser = undefined;
      } else if (SPACES.has(char)) {
        flushText();
        result.push(createSpaceInline(char));
      } else {
        current += char;
      }
    } else if (BRACKET_PAIRS.has(char)) {
      flushText();
      result.push(createBracketInline(char, 'open'));
      bracketCloser = BRACKET_PAIRS.get(char);
    } else if (BRACKET_CLOSERS.has(char)) {
      flushText();
      result.push(createBracketInline(char, 'close'));
    } else if (SPACES.has(char)) {
      flushText();
      result.push(createSpaceInline(char));
    } else {
      current += char;
    }

    previousWasDelimiter = isDelimiter;
  }

  flushText();

  return result;
}

function createBracketInline(value: string, kind: BracketKind): BracketInline {
  return { type: 'bracket', value, kind };
}

function createSpaceInline(value: string): SpaceInline {
  return { type: 'space', value };
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
