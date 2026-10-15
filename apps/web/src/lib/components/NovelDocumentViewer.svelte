<script lang='ts'>
  import type { NovelDocument, NovelInline, NovelSentence } from '@repo/novel-parser';
  import type { VirtualItem } from '@tanstack/svelte-virtual';
  import type { NovelWritingMode } from '$lib/db';
  import type { NovelSelectionRange, NovelTextPosition, SelectedNovelText } from '$lib/selectedText';
  import type { ClassValue } from 'svelte/elements';
  import { createVirtualizer } from '@tanstack/svelte-virtual';
  import { browser } from '$app/environment';
  import { novelDocumentViewFontSize } from '$lib/appSettings.svelte';
  import NovelInlineContent from '$lib/components/NovelInlineContent.svelte';
  import { twFade } from '$lib/transitions';
  import { getNovelInlinesTextLength, resolveSentenceHighlightRange } from '$lib/utils/novelInlines';
  import { cn } from 'cn';
  import { PersistedState } from 'runed';
  import { tick, untrack } from 'svelte';
  import { get } from 'svelte/store';

  interface NovelDocumentViewerProps {
    readonly document: NovelDocument;
    readonly documentId: string;
    readonly documentHash?: string;
    readonly writingMode: NovelWritingMode;
    readonly class?: ClassValue;
    scrollValue?: number;
    scrollMax?: number;
    readonly showTitle?: boolean;
    readonly persistMeasurements?: boolean;
    readonly highlightRange?: NovelSelectionRange;
    readonly onselectionchange?: (selectedText: SelectedNovelText) => void;
  }

  interface MeasuredScroll {
    documentId: string;
    scrollMax: number;
  }

  interface MeasurementCache {
    width: number;
    height: number;
    writingMode: string;
    documentHash?: string;
    items: VirtualItem[];
  }

  let {
    document: novelDocument,
    documentId,
    documentHash,
    writingMode,
    class: containerClass,
    scrollValue = $bindable(0),
    scrollMax = $bindable(0),
    showTitle,
    persistMeasurements = true,
    highlightRange,
    onselectionchange,
  }: NovelDocumentViewerProps = $props();
  const scrollDirection = $derived.by(() => {
    if (writingMode === 'horizontal-tb') return 'vertical';
    return 'horizontal';
  });

  const containerDir = $derived(writingMode === 'vertical-rl' ? 'rtl' : 'ltr');

  let containerElement: HTMLElement;
  let scrollMaxAnimationFrame: number | undefined;
  let scrollValueAnimationFrame: number | undefined;
  let pendingScrollValue = 0;
  let jumpGeneration = 0;

  const measurementCache = untrack(() => (persistMeasurements
    ? new PersistedState<MeasurementCache | null>(`novel-measurements-v1-${documentId}`, null)
    : undefined));
  const initialMeasurements = untrack(() => {
    const cached = measurementCache?.current;
    if (!browser || cached?.width !== window.innerWidth || cached.height !== window.innerHeight
      || cached.writingMode !== writingMode || cached.documentHash !== documentHash) return [];
    return cached.items;
  });

  let measuredScroll = $state<MeasuredScroll>();

  type RtlScrollModel = 'negative' | 'reverse';
  let rtlScrollModel: RtlScrollModel | undefined;

  const resolveRtlScrollModel = (): RtlScrollModel => {
    if (rtlScrollModel) return rtlScrollModel;

    const probe = document.createElement('div');
    if (containerDir === 'rtl') probe.setAttribute('dir', 'rtl');
    probe.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'visibility:hidden',
      'pointer-events:none',
      'writing-mode:horizontal-tb',
      'overflow:scroll',
      'width:100px',
      'height:100px',
    ].join(';');
    const probeContent = document.createElement('div');
    probeContent.style.cssText = 'width:300px;height:300px';
    probe.appendChild(probeContent);
    document.body.appendChild(probe);

    let upperBound = 0;
    let lowerBound = 0;
    try {
      probe.scrollLeft = 1000;
      upperBound = probe.scrollLeft;
      probe.scrollLeft = -1000;
      lowerBound = probe.scrollLeft;
    } finally {
      probe.remove();
    }

    rtlScrollModel = Math.abs(upperBound) <= Math.abs(lowerBound) ? 'negative' : 'reverse';
    return rtlScrollModel;
  };

  const getScrollMax = () => Math.max(0, scrollDirection === 'vertical'
    ? containerElement.scrollHeight - containerElement.clientHeight
    : containerElement.scrollWidth - containerElement.clientWidth);

  const getScrollOffset = () => {
    if (scrollDirection === 'vertical') return containerElement.scrollTop;
    if (containerDir === 'ltr') return containerElement.scrollLeft;
    const model = resolveRtlScrollModel();
    if (model === 'negative') return -containerElement.scrollLeft;
    return getScrollMax() - containerElement.scrollLeft;
  };

  const applyScrollOffset = (offset: number) => {
    const clampedOffset = Math.min(Math.max(offset, 0), getScrollMax());
    if (scrollDirection === 'vertical') {
      containerElement.scrollTop = clampedOffset;
      return;
    }
    if (containerDir === 'ltr') {
      containerElement.scrollLeft = clampedOffset;
      return;
    }
    const model = resolveRtlScrollModel();
    containerElement.scrollLeft = model === 'negative' ? -clampedOffset : getScrollMax() - clampedOffset;
  };

  const updateScrollMax = () => {
    if (containerElement.clientWidth === 0 || containerElement.clientHeight === 0) return;
    const nextScrollMax = getScrollMax();
    measuredScroll = { documentId, scrollMax: nextScrollMax };
    if (nextScrollMax !== scrollMax) scrollMax = nextScrollMax;
  };

  const scheduleScrollMaxUpdate = () => {
    if (scrollMaxAnimationFrame !== undefined) return;
    scrollMaxAnimationFrame = requestAnimationFrame(() => {
      scrollMaxAnimationFrame = undefined;
      updateScrollMax();
    });
  };

  const virtualizer = createVirtualizer<HTMLElement, HTMLElement>({
    count: 0,
    getScrollElement: () => containerElement,
    estimateSize: () => 240,
    initialOffset: () => scrollValue,
    initialMeasurementsCache: initialMeasurements,
    paddingStart: 48,
    paddingEnd: 48,
    overscan: 3,
    measureElement: (element) => {
      const rect = element.getBoundingClientRect();
      return scrollDirection === 'horizontal' ? rect.width : rect.height;
    },
    observeElementOffset: (instance, callback) => {
      const element = instance.scrollElement;
      if (!element) return;
      const onOffset = () => callback(getScrollOffset(), true);
      const onEnd = () => callback(getScrollOffset(), false);
      element.addEventListener('scroll', onOffset, { passive: true });
      element.addEventListener('scrollend', onEnd);
      return () => {
        element.removeEventListener('scroll', onOffset);
        element.removeEventListener('scrollend', onEnd);
      };
    },
    scrollToFn: (offset, { adjustments = 0 }) => applyScrollOffset(offset + adjustments),
    onChange: () => scheduleScrollMaxUpdate(),
  });

  const measureBlock = (element: HTMLElement) => {
    get(virtualizer).measureElement(element);
    return {
      destroy: () => get(virtualizer).measureElement(null),
    };
  };

  const saveMeasurements = () => {
    if (!measurementCache) return;
    measurementCache.current = {
      width: containerElement.clientWidth,
      height: containerElement.clientHeight,
      writingMode,
      documentHash,
      items: get(virtualizer).takeSnapshot(),
    };
  };

  $effect(() => {
    get(virtualizer).setOptions({
      count: novelDocument.blocks.length,
      horizontal: scrollDirection === 'horizontal',
      onChange: () => scheduleScrollMaxUpdate(),
    });
  });

  $effect(() => {
    $virtualizer.getTotalSize();
    scheduleScrollMaxUpdate();
  });

  const onScroll = () => {
    if (containerElement.clientWidth === 0 || containerElement.clientHeight === 0) return;
    pendingScrollValue = getScrollOffset();
    scheduleScrollMaxUpdate();
    if (scrollValueAnimationFrame !== undefined) return;
    scrollValueAnimationFrame = requestAnimationFrame(() => {
      scrollValueAnimationFrame = undefined;
      if (Math.abs(scrollValue - pendingScrollValue) < 0.5) return;
      scrollValue = pendingScrollValue;
    });
  };

  $effect(() => {
    let width = containerElement.clientWidth;
    let height = containerElement.clientHeight;
    const resizeObserver = new ResizeObserver(() => {
      const nextWidth = containerElement.clientWidth;
      const nextHeight = containerElement.clientHeight;
      if (nextWidth === 0 || nextHeight === 0) return;
      if (nextWidth !== width || nextHeight !== height) {
        width = nextWidth;
        height = nextHeight;
        const instance = get(virtualizer);
        instance.setOptions({ onChange: () => scheduleScrollMaxUpdate() });
        containerElement.querySelectorAll<HTMLElement>('[data-index]').forEach(instance.measureElement);
      }
      scheduleScrollMaxUpdate();
    });
    resizeObserver.observe(containerElement);
    window.addEventListener('pagehide', saveMeasurements);
    window.addEventListener('beforeunload', saveMeasurements);
    scheduleScrollMaxUpdate();

    return () => {
      saveMeasurements();
      window.removeEventListener('pagehide', saveMeasurements);
      window.removeEventListener('beforeunload', saveMeasurements);
      jumpGeneration += 1;
      resizeObserver.disconnect();
      if (scrollMaxAnimationFrame !== undefined) cancelAnimationFrame(scrollMaxAnimationFrame);
      if (scrollValueAnimationFrame !== undefined) cancelAnimationFrame(scrollValueAnimationFrame);
    };
  });

  $effect(() => {
    if (novelDocument.blocks.length === 0) return;
    scheduleScrollMaxUpdate();
  });

  let measuredContainerClass = untrack(() => containerClass);
  $effect(() => {
    // NOTE: スクロールコンテナの class が変わるとスクロール可能量も変わるため再計測する
    if (containerClass === measuredContainerClass) return;
    measuredContainerClass = containerClass;
    scheduleScrollMaxUpdate();
  });

  $effect(() => {
    if (containerElement.clientWidth === 0 || containerElement.clientHeight === 0) return;
    const measured = measuredScroll;
    if (measured?.documentId !== documentId) return;
    const targetScrollValue = Math.min(Math.max(scrollValue, 0), measured.scrollMax);
    if (Math.abs(getScrollOffset() - targetScrollValue) < 0.5) return;
    applyScrollOffset(targetScrollValue);
  });

  export const cancelScrollToPosition = () => {
    jumpGeneration += 1;
  };

  export const scrollToPosition = async (
    position: NovelTextPosition,
    options: { wholeBlock?: boolean; } = {},
  ): Promise<void> => {
    const { blockIndex, sentenceIndex } = position;
    const targetBlock = novelDocument.blocks[blockIndex];
    if (!targetBlock?.sentences[sentenceIndex]) return;

    const generation = ++jumpGeneration;
    const scrollToBlock = () => {
      const offset = get(virtualizer).getOffsetForIndex(blockIndex, 'center');
      if (!offset) return;
      applyScrollOffset(offset[0]);
      pendingScrollValue = getScrollOffset();
      scrollValue = pendingScrollValue;
    };
    scrollToBlock();
    let stableFrames = 0;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await tick();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (generation !== jumpGeneration) return;
      const blockElement = containerElement.querySelector<HTMLElement>(`[data-novel-block='${blockIndex}']`);
      if (!blockElement) {
        scrollToBlock();
        continue;
      }
      get(virtualizer).measureElement(blockElement.parentElement);
      const sentenceElement = blockElement.querySelector<HTMLElement>(`[data-sentence-index='${sentenceIndex}']`);
      const targetRect = (options.wholeBlock ? blockElement : sentenceElement ?? blockElement).getBoundingClientRect();
      const containerRect = containerElement.getBoundingClientRect();
      const delta = scrollDirection === 'vertical'
        ? containerRect.top + (containerRect.height / 2) - (targetRect.top + (targetRect.height / 2))
        : containerRect.left + (containerRect.width / 2) - (targetRect.left + (targetRect.width / 2));
      const offsetDirection = scrollDirection === 'horizontal' && containerDir === 'rtl' ? 1 : -1;
      const previousOffset = getScrollOffset();
      applyScrollOffset(previousOffset + (offsetDirection * delta));
      scrollValue = getScrollOffset();
      onScroll();
      stableFrames = Math.abs(getScrollOffset() - previousOffset) < 0.5 ? stableFrames + 1 : 0;
      if (stableFrames >= 2) return;
    }
  };

  export const scrollBlockIntoViewIfNeeded = async (blockIndex: number): Promise<void> => {
    const generation = ++jumpGeneration;
    await tick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (generation !== jumpGeneration) return;
    const targetBlock = novelDocument.blocks[blockIndex];
    if (!targetBlock?.sentences.some((sentence) => sentence.inlines.length > 0)
      || containerElement.clientWidth === 0 || containerElement.clientHeight === 0) return;
    const blockElement = containerElement.querySelector<HTMLElement>(`[data-novel-block='${blockIndex}']`);
    if (blockElement) {
      const containerRect = containerElement.getBoundingClientRect();
      const blockRect = blockElement.getBoundingClientRect();
      const start = scrollDirection === 'vertical' ? blockRect.top : blockRect.left;
      const end = scrollDirection === 'vertical' ? blockRect.bottom : blockRect.right;
      const viewportStart = scrollDirection === 'vertical' ? containerRect.top : containerRect.left;
      const viewportEnd = scrollDirection === 'vertical' ? containerRect.bottom : containerRect.right;
      const fits = end - start <= viewportEnd - viewportStart;
      if (fits ? start >= viewportStart - 1 && end <= viewportEnd + 1 : end > viewportStart && start < viewportEnd) return;
    }
    await scrollToPosition({ blockIndex, sentenceIndex: 0, textOffset: 0 }, { wholeBlock: true });
  };

  const selectSentence = (node: HTMLElement, selection: Selection) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    if (range.collapsed) return;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const onSentenceClick = (event: MouseEvent) => {
    event.stopPropagation();
    const selection = document.getSelection();
    if (!selection || !(event.currentTarget instanceof HTMLElement)) return;
    if (!selection.isCollapsed) return;
    selectSentence(event.currentTarget, selection);
  };

  const onSentenceKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      const selection = document.getSelection();
      if (!selection || !(event.currentTarget instanceof HTMLElement)) return;
      selectSentence(event.currentTarget, selection);
    }
  };

  const getSelectionContent = (selection: Selection): NovelInline[] => {
    if (selection.rangeCount === 0) return [];

    const inlines: NovelInline[] = [];
    const appendText = (value: string) => {
      const previous = inlines.at(-1);
      if (previous?.type === 'text') {
        previous.value += value;
      } else {
        inlines.push({ type: 'text', value });
      }
    };
    const visitNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        appendText(node.textContent ?? '');
        return;
      }
      if (!(node instanceof Element)) return;
      if (node.tagName === 'RUBY') {
        const reading = node.querySelector('rt')?.textContent;
        const base = Array.from(node.childNodes)
          .filter((child) => !(child instanceof Element && child.tagName === 'RT'))
          .map((child) => child.textContent)
          .join('');
        if (reading) inlines.push({ type: 'ruby', base, reading });
        else appendText(base);
        return;
      }
      if (node.getAttribute('data-role') === 'gaiji') {
        inlines.push({
          type: 'gaiji',
          description: node.getAttribute('title') ?? '',
          reading: node.textContent,
        });
        return;
      }
      node.childNodes.forEach(visitNode);
    };

    selection.getRangeAt(0).cloneContents().childNodes.forEach(visitNode);
    return inlines;
  };

  const getSelectionRange = (selection: Selection): NovelSelectionRange | null => {
    if (selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    const getPosition = (node: Node, offset: number) => {
      const element = node instanceof Element ? node : node.parentElement;
      const sentenceElement = element?.closest<HTMLElement>('[data-novel-sentence]');
      if (!sentenceElement || !containerElement.contains(sentenceElement)) return null;

      const blockIndex = Number(sentenceElement.dataset.blockIndex);
      const sentenceIndex = Number(sentenceElement.dataset.sentenceIndex);
      if (!Number.isInteger(blockIndex) || !Number.isInteger(sentenceIndex)) return null;

      const offsetRange = document.createRange();
      offsetRange.selectNodeContents(sentenceElement);
      offsetRange.setEnd(node, offset);
      return {
        blockIndex,
        sentenceIndex,
        textOffset: offsetRange.toString().length,
      };
    };

    const start = getPosition(range.startContainer, range.startOffset);
    const end = getPosition(range.endContainer, range.endOffset);
    if (!start || !end) return null;
    return { start, end };
  };

  const getSelectedTextType = ({ start }: NovelSelectionRange) => {
    const block = novelDocument.blocks[start.blockIndex];
    if (!block) return 'narration';
    return block.sentences[start.sentenceIndex]?.textType ?? 'narration';
  };

  const getSentenceHighlightRange = (blockIndex: number, sentenceIndex: number, inlines: readonly NovelInline[]) => {
    if (!highlightRange) return undefined;
    return resolveSentenceHighlightRange(
      highlightRange,
      blockIndex,
      sentenceIndex,
      getNovelInlinesTextLength(inlines),
    );
  };

  $effect(() => {
    const callback = () => {
      const selection = document.getSelection();
      if (!selection || !containerElement.contains(selection.anchorNode) || !containerElement.contains(selection.focusNode)) return;
      const selectionRange = getSelectionRange(selection);
      if (!selectionRange) return;
      onselectionchange?.({
        documentId,
        inlines: getSelectionContent(selection),
        registrationMethod: 'selection',
        selectionRange,
        textType: getSelectedTextType(selectionRange),
      });
    };
    document.addEventListener('selectionchange', callback);

    return () => {
      document.removeEventListener('selectionchange', callback);
    };
  });
</script>

{#snippet documentSentence(sentence: NovelSentence, blockIndex: number, sentenceIndex: number)}
  {@const isNonSelectable = sentence.inlines.every((inline) => inline.type === 'bracket' || inline.type === 'space')}
  {@const highlight = getSentenceHighlightRange(blockIndex, sentenceIndex, sentence.inlines)}
  {#if isNonSelectable}
    <NovelInlineContent
      trim={false}
      inlines={sentence.inlines}
      highlightRange={highlight}
      data-novel-sentence
      data-block-index={blockIndex}
      data-sentence-index={sentenceIndex}/>
  {:else}
    <NovelInlineContent
      trim={false}
      inlines={sentence.inlines}
      highlightRange={highlight}
      role='button'
      tabindex={0}
      data-novel-sentence
      data-block-index={blockIndex}
      data-sentence-index={sentenceIndex}
      onclick={onSentenceClick}
      onkeydown={onSentenceKeyDown}/>
  {/if}
{/snippet}

<div
  class={cn(`
    relative size-full scrollbar-none overscroll-none font-serif wrap-break-word
    [word-break:auto-phrase]
    data-[font-size="lg"]:text-lg
    data-[font-size="md"]:text-base
    data-[font-size="sm"]:text-sm
    data-[font-size="xl"]:text-xl
  `, containerClass)}
  data-font-size={novelDocumentViewFontSize.current}
  style:writing-mode='horizontal-tb'
  style:overflow-x={scrollDirection === 'horizontal' ? 'auto' : 'hidden'}
  style:overflow-y={scrollDirection === 'vertical' ? 'auto' : 'hidden'}
  dir={containerDir}
  role='region'
  aria-label='小説本文'
  onscroll={onScroll}
  onscrollend={saveMeasurements}
  onpointerdown={cancelScrollToPosition}
  onwheel={cancelScrollToPosition}
  bind:this={containerElement}>
  {#if showTitle}
    <h2 class='fixed top-6 left-4 text-[0.8em]' transition:twFade>{novelDocument.title}</h2>
  {/if}
  <div
    class='relative'
    style:width={scrollDirection === 'horizontal' ? `${$virtualizer.getTotalSize()}px` : '100%'}
    style:height={scrollDirection === 'vertical' ? `${$virtualizer.getTotalSize()}px` : '100%'}>
    {#each $virtualizer.getVirtualItems() as item (item.key)}
      {@const blockIndex = item.index}
      {@const block = novelDocument.blocks[blockIndex]}
      {#if block}
        <div
          class='absolute [direction:ltr]'
          style:writing-mode={writingMode}
          style:top={scrollDirection === 'vertical' ? `${item.start}px` : '80px'}
          style:left={scrollDirection === 'vertical' ? '80px' : containerDir === 'ltr' ? `${item.start}px` : undefined}
          style:right={scrollDirection === 'horizontal' && containerDir === 'rtl' ? `${item.start}px` : undefined}
          style:width={scrollDirection === 'vertical' ? 'calc(100% - 160px)' : 'max-content'}
          style:height={scrollDirection === 'horizontal' ? 'calc(100% - 160px)' : undefined}
          data-index={blockIndex}
          use:measureBlock>
          {#if block.type === 'heading'}
            {#if block.level === 1}
              <h3
                data-novel-block={blockIndex}
                style:text-align={block.align}
                style:margin-inline-start={block.indent ? `${block.indent}em` : undefined}>
                {#each block.sentences as sentence, sentenceIndex (sentenceIndex)}
                  {@render documentSentence(sentence, blockIndex, sentenceIndex)}
                {/each}
              </h3>
            {:else if block.level === 2}
              <h4
                data-novel-block={blockIndex}
                style:text-align={block.align}
                style:margin-inline-start={block.indent ? `${block.indent}em` : undefined}>
                {#each block.sentences as sentence, sentenceIndex (sentenceIndex)}
                  {@render documentSentence(sentence, blockIndex, sentenceIndex)}
                {/each}
              </h4>
            {:else}
              <h5
                data-novel-block={blockIndex}
                style:text-align={block.align}
                style:margin-inline-start={block.indent ? `${block.indent}em` : undefined}>
                {#each block.sentences as sentence, sentenceIndex (sentenceIndex)}
                  {@render documentSentence(sentence, blockIndex, sentenceIndex)}
                {/each}
              </h5>
            {/if}
          {:else}
            <p
              data-novel-block={blockIndex}
              style:text-align={block.align}
              style:margin-inline-start={block.indent ? `${block.indent}em` : undefined}>
              {#each block.sentences as sentence, sentenceIndex (sentenceIndex)}
                {@render documentSentence(sentence, blockIndex, sentenceIndex)}
              {/each}
            </p>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
</div>
