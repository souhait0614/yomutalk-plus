import type { NovelBlock, NovelDocument, NovelInline, NovelParserOptions } from './types.ts';
import { normalizeSource, splitSentences } from './shared.ts';

const AOZORA_SEPARATOR = /^-{20,}$/u;
const AOZORA_FOOTER = /^底本(?:の親本)?：/u;
const AOZORA_HEADING = /［＃「[^」]+」は(大|中|小)見出し］/u;
const AOZORA_INDENT_START = /［＃ここから([０-９0-9]+)字下げ］/u;
const AOZORA_INDENT_SINGLE = /［＃([０-９0-9]+)字下げ］/u;
const AOZORA_INDENT_END = /［＃ここで字下げ終わり］/u;
const AOZORA_END_ALIGNMENT = /［＃地付き］/u;

export interface AozoraTextSource {
  title: string;
  author: string | null;
  header: string;
  body: string;
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
  const bodyEnd = footerIndex === -1 ? lines.length : footerIndex;
  let indent: number | undefined;
  const blocks: NovelBlock[] = [];

  for (const [lineIndex, line] of lines.slice(0, bodyEnd).entries()) {
    const lineFormat = getAozoraLineFormat(line, indent);

    if (lineFormat.content.trim() !== '') {
      blocks.push(parseAozoraLine(lineFormat.content, lineFormat.indent, lineFormat.align));
      options.onBlock?.(bodyLineOffset + lineIndex);
    }

    indent = lineFormat.nextIndent;
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
  indent?: number,
  align?: 'end',
): NovelBlock {
  const heading = line.match(AOZORA_HEADING);
  const children = parseAozoraInline(line);
  const sentences = splitSentences(children);

  if (heading !== null) {
    return {
      type: 'heading',
      level: getHeadingLevel(heading[1]),
      sentences: sentences.map((sentence) => ({ ...sentence, textType: 'heading' })),
      ...(indent === undefined ? {} : { indent }),
      ...(align === undefined ? {} : { align }),
    };
  }

  return {
    type: 'paragraph',
    sentences,
    ...(indent === undefined ? {} : { indent }),
    ...(align === undefined ? {} : { align }),
  };
}

function getAozoraLineFormat(
  line: string,
  activeIndent: number | undefined,
): {
  content: string;
  indent: number | undefined;
  nextIndent: number | undefined;
  align: 'end' | undefined;
} {
  const start = line.match(AOZORA_INDENT_START);
  const single = line.match(AOZORA_INDENT_SINGLE);
  const endsIndent = AOZORA_INDENT_END.test(line);
  const indent = start === null
    ? single === null
      ? activeIndent
      : parseIndent(single[1])
    : parseIndent(start[1]);
  const nextIndent = endsIndent
    ? undefined
    : start === null
      ? activeIndent
      : indent;
  const content = line
    .replace(AOZORA_INDENT_START, '')
    .replace(AOZORA_INDENT_SINGLE, '')
    .replace(AOZORA_INDENT_END, '')
    .replace(AOZORA_END_ALIGNMENT, '');

  return {
    content,
    indent,
    nextIndent,
    align: AOZORA_END_ALIGNMENT.test(line) ? 'end' : undefined,
  };
}

function parseIndent(value: string | undefined): number {
  return Number.parseInt(value?.replace(/[０-９]/gu, (digit) => (
    String.fromCharCode(digit.charCodeAt(0) - '０'.charCodeAt(0) + '0'.charCodeAt(0))
  )) ?? '0', 10);
}

function parseAozoraInline(source: string): NovelInline[] {
  const inlines: NovelInline[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    if (source.startsWith('※［＃', cursor)) {
      const noteEnd = source.indexOf('］', cursor + 3);

      if (noteEnd !== -1) {
        const ruby = readRuby(source, noteEnd + 1);
        inlines.push({
          type: 'gaiji',
          description: source.slice(cursor + 3, noteEnd),
          reading: ruby?.reading ?? null,
        });
        cursor = ruby?.end ?? noteEnd + 1;
        continue;
      }
    }

    if (source.startsWith('［＃', cursor)) {
      const noteEnd = source.indexOf('］', cursor + 2);

      if (noteEnd !== -1) {
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
        });
        cursor = ruby.end;
        continue;
      }
    }

    if (source[cursor] === '《') {
      const ruby = readRuby(source, cursor);
      const base = ruby === null ? null : takeImplicitRubyBase(inlines);

      if (ruby !== null && base !== null) {
        inlines.push({ type: 'ruby', base, reading: ruby.reading });
        cursor = ruby.end;
        continue;
      }
    }

    const codePoint = source.codePointAt(cursor);

    if (codePoint === undefined) {
      break;
    }

    const character = String.fromCodePoint(codePoint);
    appendText(inlines, character);
    cursor += character.length;
  }

  return inlines;
}

function takeImplicitRubyBase(inlines: NovelInline[]): string | null {
  const lastInline = inlines.at(-1);

  if (lastInline?.type !== 'text') {
    return null;
  }

  const characters = Array.from(lastInline.value);
  const lastCharacter = characters.at(-1);
  const script = lastCharacter === undefined ? null : getCharacterScript(lastCharacter);

  if (script === null) {
    return null;
  }

  let baseStart = characters.length - 1;

  while (
    baseStart > 0
    && getCharacterScript(characters[baseStart - 1] ?? '') === script
  ) {
    baseStart -= 1;
  }

  const base = characters.slice(baseStart).join('');
  const remainingText = characters.slice(0, baseStart).join('');

  if (remainingText === '') {
    inlines.pop();
  } else {
    lastInline.value = remainingText;
  }

  return base;
}

function getCharacterScript(character: string): string | null {
  if ((/^[\p{Script=Han}々〆〇ヶ仝]$/u).test(character)) {
    return 'han';
  }

  if ((/^\p{Script=Hiragana}$/u).test(character)) {
    return 'hiragana';
  }

  if ((/^[\p{Script=Katakana}ー]$/u).test(character)) {
    return 'katakana';
  }

  if ((/^\p{Script=Latin}$/u).test(character)) {
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

function appendText(inlines: NovelInline[], value: string): void {
  const lastInline = inlines.at(-1);

  if (lastInline?.type === 'text') {
    lastInline.value += value;
  } else {
    inlines.push({ type: 'text', value });
  }
}

function getHeadingLevel(level: string | undefined): 1 | 2 | 3 {
  if (level === '大') {
    return 1;
  }

  if (level === '小') {
    return 3;
  }

  return 2;
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
