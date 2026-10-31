import type { BlockLayout } from '@repo/novel-parser';

type NovelBlockWritingMode = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';

/**
 * 青空文庫注記の組み方を、ブラウザで再現できる CSS 宣言に変換する。
 * 字下げ・寄せは論理プロパティで指定する。縦組みでは、行末（下端）が地になる。
 */
export const getNovelBlockStyleAttribute = (
  block: BlockLayout,
  writingMode: NovelBlockWritingMode = 'horizontal-tb',
): string | undefined => {
  const declarations: string[] = [];
  const marginInlineStart = block.wrapIndent ?? block.indent;

  if (marginInlineStart !== undefined && marginInlineStart !== 0) {
    declarations.push(`margin-inline-start: ${marginInlineStart}em`);
  }

  if (block.wrapIndent !== undefined) {
    declarations.push(`text-indent: ${(block.indent ?? 0) - block.wrapIndent}em`);
  }

  if (block.align !== undefined) declarations.push(`text-align: ${block.align}`);
  if (block.width !== undefined) declarations.push(`max-inline-size: ${block.width}em`);
  if (block.rise !== undefined) {
    // NOTE: 地は横組みではブロック軸の終端、縦組みでは行末（インライン軸の終端）にあたる
    const writesHorizontally = block.horizontal === true || writingMode === 'horizontal-tb';
    declarations.push(`${writesHorizontally ? 'padding-block-end' : 'padding-inline-end'}: ${block.rise}em`);
  }

  if (block.horizontal === true) declarations.push('writing-mode: horizontal-tb');

  if (block.frame === true) {
    declarations.push('border: 1px solid currentColor', 'padding: 0.2em 0.4em');
  }

  if (block.caption === true) declarations.push('font-size: 0.85em');

  return declarations.length === 0 ? undefined : declarations.join('; ');
};
