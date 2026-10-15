export type NovelFormat = 'plain-text' | 'aozora-text';

export type NovelTextType = 'dialogue' | 'narration' | 'heading';

export type BracketKind = 'open' | 'close';

export interface TextInline {
  type: 'text';
  value: string;
}

export interface RubyInline {
  type: 'ruby';
  base: string;
  reading: string;
}

export interface GaijiInline {
  type: 'gaiji';
  description: string;
  reading: string | null;
}

export interface BracketInline {
  type: 'bracket';
  value: string;
  kind: BracketKind;
}

export interface SpaceInline {
  type: 'space';
  value: string;
}

export type NovelInline = TextInline | RubyInline | GaijiInline | BracketInline | SpaceInline;

export interface NovelSentence {
  readonly textType: NovelTextType;
  readonly inlines: NovelInline[];
}

export interface ParagraphBlock {
  type: 'paragraph';
  sentences: NovelSentence[];
  indent?: number;
  align?: 'end';
}

export interface HeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3;
  sentences: NovelSentence[];
  indent?: number;
  align?: 'end';
}

export type NovelBlock = ParagraphBlock | HeadingBlock;

export interface NovelDocument {
  format: NovelFormat;
  title: string;
  author: string | null;
  blocks: NovelBlock[];
}

export interface NovelParserOptions {
  onBlock?: (sourceLineIndex: number) => void;
}

export interface PlainTextOptions extends NovelParserOptions {
  title: string;
  author: string | null;
}
