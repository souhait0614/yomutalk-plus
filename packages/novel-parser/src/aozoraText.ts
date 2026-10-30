import type { NovelBlock, NovelDocument, NovelInline, NovelParserOptions } from './types.ts';
import { normalizeSource, splitSentences } from './shared.ts';

const AOZORA_SEPARATOR = /^-{20,}$/u;
const AOZORA_FOOTER = /^底本(?:の親本)?：/u;
const AOZORA_HEADING = /［＃「[^」]+」は(大|中|小)見出し］/u;
const AOZORA_INDENT_START = /［＃ここから([０-９0-9]+)字下げ］/u;
const AOZORA_INDENT_SINGLE = /［＃([０-９0-9]+)字下げ］/u;
const AOZORA_INDENT_END = /［＃ここで字下げ終わり］/u;
const AOZORA_END_ALIGNMENT = /［＃地付き］/u;

// NOTE: 外字の読みを推定する際に1文字ごとに判定するため、正規表現は生成し直さず使い回す
const HAN_CHARACTER = /^[\p{Script=Han}々〆〇ヶ仝]$/u;
const HIRAGANA_CHARACTER = /^\p{Script=Hiragana}$/u;
const KATAKANA_CHARACTER = /^[\p{Script=Katakana}ー]$/u;
const LATIN_CHARACTER = /^\p{Script=Latin}$/u;

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
  let bodyEnd = footerIndex === -1 ? lines.length : footerIndex;
  // NOTE: 底本情報やファイル末尾に続く空行は本文の間隔ではない
  while (bodyEnd > 0 && lines[bodyEnd - 1]?.trim() === '') bodyEnd -= 1;
  let indent: number | undefined;
  const blocks: NovelBlock[] = [];

  for (const [lineIndex, line] of lines.entries()) {
    if (lineIndex >= bodyEnd) break;
    if (line.trim() === '') {
      // NOTE: 本文先頭の空行はファイル整形によるものとして扱う
      if (blocks.length > 0) {
        blocks.push({ type: 'blank' });
        options.onBlock?.(bodyLineOffset + lineIndex);
      }
      continue;
    }

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
  const align = AOZORA_END_ALIGNMENT.test(line) ? 'end' : undefined;
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
    align,
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

const getPreviousCharacterStart = (value: string, end: number): number => {
  const codeUnit = value.charCodeAt(end - 1);
  return codeUnit >= 0xDC00 && codeUnit <= 0xDFFF && end >= 2 ? end - 2 : end - 1;
};

function takeImplicitRubyBase(inlines: NovelInline[]): string | null {
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

  if (baseStart === 0) {
    inlines.pop();
  } else {
    lastInline.value = value.slice(0, baseStart);
  }

  return base;
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
