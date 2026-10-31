import type { EmphasisMark, LineMark, NovelInlineStyle } from '@repo/novel-parser';

const EMPHASIS_STYLES: Record<EmphasisMark, string> = {
  'sesame-dot': 'filled sesame',
  'white-sesame-dot': 'open sesame',
  'black-circle': 'filled circle',
  'white-circle': 'open circle',
  'black-triangle': 'filled triangle',
  'white-triangle': 'open triangle',
  bullseye: 'filled double-circle',
  fisheye: 'open double-circle',
  saltire: '"×"',
};

const LINE_STYLES: Record<LineMark, string> = {
  solid: 'solid',
  double: 'double',
  dotted: 'dotted',
  dashed: 'dashed',
  wave: 'wavy',
};

const HEADING_FONT_SIZES: Record<1 | 2 | 3, number> = {
  1: 1.3,
  2: 1.15,
  3: 1,
};

/**
 * 青空文庫注記の修飾を、ブラウザで再現できる CSS 宣言に変換する。
 * 縦組み・横組みのどちらでも成り立つよう、論理プロパティを優先する。
 */
export const getNovelInlineStyleAttribute = (style: NovelInlineStyle | undefined): string | undefined => {
  if (style === undefined) return undefined;

  const declarations: string[] = [];
  let fontSize = 1;

  if (style.emphasis !== undefined) {
    declarations.push(`text-emphasis-style: ${EMPHASIS_STYLES[style.emphasis.mark]}`);
    declarations.push(`text-emphasis-position: over ${style.emphasis.side === 'left' ? 'left' : 'right'}`);
  }

  if (style.line !== undefined) {
    declarations.push(`text-decoration-line: ${style.line.side === 'left' ? 'overline' : 'underline'}`);
    declarations.push(`text-decoration-style: ${LINE_STYLES[style.line.mark]}`);
  }

  if (style.bold === true) declarations.push('font-weight: 700');
  if (style.italic === true) declarations.push('font-style: italic');
  if (style.tateChuYoko === true) declarations.push('text-combine-upright: all');

  // NOTE: 縦組みの中に行中の横組みを入れるため、インラインブロックで書字方向を切り替える
  if (style.horizontal === true) declarations.push('writing-mode: horizontal-tb', 'display: inline-block');

  if (style.script === 'superscript') {
    declarations.push('vertical-align: super', 'font-size: 0.7em');
  } else if (style.script === 'subscript') {
    declarations.push('vertical-align: sub', 'font-size: 0.7em');
  }

  if (style.kunten === 'kaeriten') {
    declarations.push('vertical-align: sub', 'font-size: 0.6em');
  } else if (style.kunten === 'okurigana') {
    declarations.push('vertical-align: super', 'font-size: 0.6em');
  }

  if (style.warichu === true) declarations.push('font-size: 0.6em', 'line-height: 1.3');

  if (style.fontSizeStep !== undefined) {
    fontSize *= 1.2 ** style.fontSizeStep;
  }

  if (style.inlineHeading !== undefined) {
    declarations.push('font-weight: 700');
    fontSize *= HEADING_FONT_SIZES[style.inlineHeading.level];

    if (style.inlineHeading.style === 'window') {
      declarations.push('border: 1px solid currentColor', 'padding-inline: 0.2em');
    }
  }

  if (fontSize !== 1) declarations.push(`font-size: ${fontSize.toFixed(2)}em`);

  return declarations.length === 0 ? undefined : declarations.join('; ');
};
