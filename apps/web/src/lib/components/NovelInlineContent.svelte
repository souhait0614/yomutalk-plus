<script lang='ts'>
  import type { NovelInline } from '@repo/novel-parser';
  import type { NovelTextOffsetRange } from '$lib/utils/novelInlines';
  import type { HTMLAttributes } from 'svelte/elements';
  import { showRuby } from '$lib/appSettings.svelte';
  import { gaijiFallbackCharacter, getNovelInlineTextLength } from '$lib/utils/novelInlines';
  import { getNovelInlineStyleAttribute } from '$lib/utils/novelInlineStyle';

  interface NovelInlineContentProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
    readonly inlines: readonly NovelInline[];
    readonly trim?: boolean;
    // NOTE: 文字オフセットは trim 後の表示テキスト基準で指定する
    readonly highlightRange?: NovelTextOffsetRange;
  }

  interface NovelInlineSegment {
    readonly inlines: NovelInline[];
    readonly isHighlighted: boolean;
  }

  let { inlines, trim = true, highlightRange, ...restProps }: NovelInlineContentProps = $props();

  const getVisibleText = (inline: NovelInline) => {
    if (inline.type === 'text') return inline.value;
    if (inline.type === 'bracket') return inline.value;
    if (inline.type === 'space') return inline.value;
    if (inline.type === 'ruby') return inline.base;
    return inline.reading ?? gaijiFallbackCharacter;
  };

  const replaceVisibleText = (inline: NovelInline, value: string): NovelInline => {
    if (inline.type === 'text') return { ...inline, value };
    if (inline.type === 'bracket') return { ...inline, value };
    if (inline.type === 'space') return { ...inline, value };
    if (inline.type === 'ruby') return { ...inline, base: value };
    return { ...inline, reading: value };
  };

  const trimInlines = (values: readonly NovelInline[]): NovelInline[] => {
    const trimmed = [...values];
    while (trimmed.length > 0) {
      const first = trimmed[0];
      if (!first) break;
      const visibleText = getVisibleText(first);
      const trimmedText = visibleText.trimStart();
      if (!trimmedText) {
        trimmed.shift();
        continue;
      }
      if (visibleText !== trimmedText) trimmed[0] = replaceVisibleText(first, trimmedText);
      break;
    }
    while (trimmed.length > 0) {
      const lastIndex = trimmed.length - 1;
      const last = trimmed[lastIndex];
      if (!last) break;
      const visibleText = getVisibleText(last);
      const trimmedText = visibleText.trimEnd();
      if (!trimmedText) {
        trimmed.pop();
        continue;
      }
      if (visibleText !== trimmedText) trimmed[lastIndex] = replaceVisibleText(last, trimmedText);
      break;
    }
    return trimmed;
  };

  const visibleInlines = $derived(trim ? trimInlines(inlines) : inlines);

  const sliceInline = (inline: NovelInline, from: number, to: number): NovelInline | undefined => {
    if (inline.type !== 'text' && inline.type !== 'bracket' && inline.type !== 'space') return undefined;
    const value = inline.value.slice(from, to);
    if (!value) return undefined;
    return { ...inline, value };
  };

  const splitInlinesByHighlight = (
    values: readonly NovelInline[],
    range: NovelTextOffsetRange,
  ): NovelInlineSegment[] => {
    const segments: NovelInlineSegment[] = [];
    const append = (inline: NovelInline, isHighlighted: boolean) => {
      const previous = segments.at(-1);
      if (previous?.isHighlighted === isHighlighted) {
        previous.inlines.push(inline);
        return;
      }
      segments.push({ inlines: [inline], isHighlighted });
    };

    let offset = 0;
    for (const inline of values) {
      const inlineStart = offset;
      const inlineEnd = offset + getNovelInlineTextLength(inline);
      offset = inlineEnd;

      const rangeStart = Math.max(inlineStart, range.start);
      const rangeEnd = Math.min(inlineEnd, range.end);
      if (rangeStart >= rangeEnd) {
        append(inline, false);
        continue;
      }
      if (rangeStart === inlineStart && rangeEnd === inlineEnd) {
        append(inline, true);
        continue;
      }
      // NOTE: ルビと外字は文字単位で分割できないため、一部でも範囲に含まれていればハイライトする
      if (inline.type === 'ruby' || inline.type === 'gaiji') {
        append(inline, true);
        continue;
      }
      const leading = sliceInline(inline, 0, rangeStart - inlineStart);
      if (leading) append(leading, false);
      const highlighted = sliceInline(inline, rangeStart - inlineStart, rangeEnd - inlineStart);
      if (highlighted) append(highlighted, true);
      const trailing = sliceInline(inline, rangeEnd - inlineStart, inlineEnd - inlineStart);
      if (trailing) append(trailing, false);
    }
    return segments;
  };

  const segments = $derived.by((): NovelInlineSegment[] => {
    if (!highlightRange || highlightRange.start >= highlightRange.end) {
      return [{ inlines: [...visibleInlines], isHighlighted: false }];
    }
    return splitInlinesByHighlight(visibleInlines, highlightRange);
  });
</script>

{#snippet inlineBody(inline: NovelInline)}
  {#if inline.type === 'ruby'}
    <ruby>{inline.base}<rt
      class='
        text-[0.5em] leading-none select-none
        {!showRuby.current ? 'hidden' : undefined}'>{inline.reading}</rt></ruby>
  {:else if inline.type === 'gaiji'}
    <span data-role='gaiji' title={inline.description}>{inline.reading ?? gaijiFallbackCharacter}</span>
  {:else if inline.type === 'bracket'}
    <span data-novel-bracket>{inline.value}</span>
  {:else if inline.type === 'space'}
    <span data-novel-space>{inline.value}</span>
  {:else}{inline.value}{/if}
{/snippet}

{#snippet inlineItem(inline: NovelInline)}
  {@const styleAttribute = getNovelInlineStyleAttribute(inline.style)}
  {#if styleAttribute === undefined}
    {@render inlineBody(inline)}
  {:else}
    <span style={styleAttribute}>{@render inlineBody(inline)}</span>
  {/if}
{/snippet}

{#snippet inlineItems(values: readonly NovelInline[])}
  {#each values as inline, inlineIndex (inlineIndex)}
    {@render inlineItem(inline)}
  {/each}
{/snippet}

<span {...restProps}>
  {#each segments as segment, segmentIndex (segmentIndex)}
    {#if segment.isHighlighted}
      <span class='bg-primary/40'>{@render inlineItems(segment.inlines)}</span>
    {:else}
      {@render inlineItems(segment.inlines)}
    {/if}
  {/each}
</span>
