export type NovelFormat = 'plain-text' | 'aozora-text';

export type NovelTextType = 'dialogue' | 'narration' | 'heading';

export type BracketKind = 'open' | 'close';

/** 傍点の種類。青空文庫注記の名称と対応する。 */
// eslint-disable-next-line @stylistic/operator-linebreak -- 長い union は行頭の | で揃えたい
export type EmphasisMark =
  | 'sesame-dot'
  | 'white-sesame-dot'
  | 'black-circle'
  | 'white-circle'
  | 'black-triangle'
  | 'white-triangle'
  | 'bullseye'
  | 'fisheye'
  | 'saltire';

/** 傍線の種類。青空文庫注記の名称と対応する。 */
export type LineMark = 'solid' | 'double' | 'dotted' | 'dashed' | 'wave';

/** 傍点や傍線が付く側。縦組みでは行の左右、横組みでは文字の上下に対応する。 */
export type InlineSide = 'right' | 'left';

/** 訓点の種類。 */
export type KuntenKind = 'kaeriten' | 'okurigana';

/**
 * 一つのインラインに付く修飾。注記の重複（青空文庫「注記の重複」）に備え、
 * 複数の修飾を同時に持てる。
 */
export interface NovelInlineStyle {
  /** 傍点。side が 'left' のときは行の左（縦組み）に打たれた傍点を表す。 */
  emphasis?: {
    mark: EmphasisMark;
    side: InlineSide;
  };
  /** 傍線。side が 'left' のときは行の左（縦組み）に引かれた傍線を表す。 */
  line?: {
    mark: LineMark;
    side: InlineSide;
  };
  /** 太字（ゴシック）。 */
  bold?: boolean;
  /** 斜体（イタリック）。 */
  italic?: boolean;
  /** 縦中横。 */
  tateChuYoko?: boolean;
  /** 上付き小文字と行右小書き（どちらも上付き）、下付き小文字と行左小書き（どちらも下付き）。 */
  script?: 'superscript' | 'subscript';
  /** 本文の標準サイズとの段階差。正で大きく、負で小さく組む。 */
  fontSizeStep?: number;
  /** 行中の横組み。 */
  horizontal?: boolean;
  /** 罫囲み。 */
  frame?: boolean;
  /** 割り注。 */
  warichu?: boolean;
  /** 訓点。返り点と訓点送り仮名。 */
  kunten?: KuntenKind;
  /** 同行見出し・窓見出し。行全体の見出しにせず、対象文字だけを見出しとして組む。 */
  inlineHeading?: {
    level: 1 | 2 | 3;
    style: 'inline' | 'window';
  };
}

export interface TextInline {
  type: 'text';
  value: string;
  style?: NovelInlineStyle;
}

export interface RubyInline {
  type: 'ruby';
  base: string;
  reading: string;
  style?: NovelInlineStyle;
}

export interface GaijiInline {
  type: 'gaiji';
  description: string;
  reading: string | null;
  style?: NovelInlineStyle;
}

export interface BracketInline {
  type: 'bracket';
  value: string;
  kind: BracketKind;
  style?: NovelInlineStyle;
}

export interface SpaceInline {
  type: 'space';
  value: string;
  style?: NovelInlineStyle;
}

export type NovelInline = TextInline | RubyInline | GaijiInline | BracketInline | SpaceInline;

export interface NovelSentence {
  readonly textType: NovelTextType;
  readonly inlines: NovelInline[];
}

/** 段落・見出しに共通の組み方。 */
export interface BlockLayout {
  /** 先頭行の字下げ。 */
  indent?: number;
  /** 折り返し行の字下げ。「ここから改行天付き、折り返して○字下げ」などで使う。 */
  wrapIndent?: number;
  /** 行の寄せ。'center' は左右中央、'end' は地付き・地寄せ。 */
  align?: 'center' | 'end';
  /** 字詰め。一行の字数。 */
  width?: number;
  /** 地からの字上げ。地寄せのあきを表す。 */
  rise?: number;
  /** 罫囲み。 */
  frame?: boolean;
  /** 図版のキャプション。 */
  caption?: boolean;
  /** 横組み。 */
  horizontal?: boolean;
}

export interface ParagraphBlock extends BlockLayout {
  type: 'paragraph';
  sentences: NovelSentence[];
}

export interface HeadingBlock extends BlockLayout {
  type: 'heading';
  level: 1 | 2 | 3;
  sentences: NovelSentence[];
}

export interface BlankBlock {
  type: 'blank';
}

export type NovelBlock = ParagraphBlock | HeadingBlock | BlankBlock;

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
