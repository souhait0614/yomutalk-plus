<script lang='ts'>
  import type { NovelDocument } from '@repo/novel-parser';
  import type { LoadedNovelDocumentFileType, NovelWritingMode } from '$lib/db';
  import { parsePlainText } from '@repo/novel-parser';
  import { IconEye, IconPencil } from '@tabler/icons-svelte';
  import NovelDocumentViewer from '$lib/components/NovelDocumentViewer.svelte';
  import { m } from '$lib/paraglide/messages';
  import * as InputGroup from '$lib/shadcn-svelte/components/ui/input-group';
  import { Spinner } from '$lib/shadcn-svelte/components/ui/spinner';
  import * as Tabs from '$lib/shadcn-svelte/components/ui/tabs';
  import { parseNovelDocument } from '$lib/utils/novelParsing';
  import { onMount, tick } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';

  import type { TextInsertion } from './NovelTextToolbar.svelte';
  import NovelTextToolbar from './NovelTextToolbar.svelte';

  interface NovelEditorProps {
    body: string;
    readonly source: string;
    readonly title: string;
    readonly fileType: LoadedNovelDocumentFileType;
    readonly writingMode: NovelWritingMode;
    readonly disabled: boolean;
  }

  let { body = $bindable(), source, title, fileType, writingMode, disabled }: NovelEditorProps = $props();

  const wideViewport = new MediaQuery('(min-width: 1024px)');
  let activeTab = $state('input');
  let textareaElement = $state<HTMLTextAreaElement | null>(null);
  let previewViewer = $state<ReturnType<typeof NovelDocumentViewer>>();
  let previewDocument = $state.raw<NovelDocument>(parsePlainText('', { title: '', author: null }));
  let previewPending = $state(false);
  let previewScrollValue = $state(0);
  let previewBlockByLine = $state.raw<Record<number, number>>({});
  let cursorOffset: number | undefined;
  let cursorLine: number | undefined;
  let cursorFollowAnimationFrame: number | undefined;

  const scheduleCursorPreview = () => {
    if (cursorFollowAnimationFrame !== undefined) return;
    cursorFollowAnimationFrame = requestAnimationFrame(() => {
      cursorFollowAnimationFrame = undefined;
      if (previewPending || cursorLine === undefined || !previewViewer || (!wideViewport.current && activeTab !== 'preview')) return;
      const blockIndex = previewBlockByLine[cursorLine];
      if (blockIndex !== undefined) void previewViewer.scrollBlockIntoViewIfNeeded(blockIndex);
    });
  };

  const updateCursorLine = () => {
    const element = textareaElement;
    if (!element) return;
    const offset = element.selectionDirection === 'backward' ? element.selectionStart : element.selectionEnd;
    const line = element.value.slice(0, offset).split('\n').length - 1;
    if (cursorOffset === offset && cursorLine === line) return;
    previewViewer?.cancelScrollToPosition();
    cursorOffset = offset;
    cursorLine = line;
    scheduleCursorPreview();
  };

  const setActiveTab = (value: string) => {
    if (activeTab === 'input') updateCursorLine();
    activeTab = value;
    scheduleCursorPreview();
  };

  $effect(() => {
    const nextSource = source;
    const nextBody = body;
    const nextTitle = title.trim() || m.novel_untitled();
    const nextFileType = fileType;
    previewPending = true;
    const timer = setTimeout(() => {
      const sourcePrefix = nextSource.slice(0, nextSource.length - nextBody.length);
      const lineOffset = nextFileType === 'aozoratext' ? sourcePrefix.split('\n').length - 1 : 0;
      const blocksByLine: Record<number, number> = {};
      let blockIndex = 0;
      const onBlock = (sourceLineIndex: number) => {
        blocksByLine[sourceLineIndex - lineOffset] = blockIndex;
        blockIndex += 1;
      };
      previewDocument = parseNovelDocument(nextFileType, nextSource, { title: nextTitle, onBlock });
      previewBlockByLine = blocksByLine;
      previewPending = false;
      scheduleCursorPreview();
    }, 250);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    if (previewViewer && !previewPending && (wideViewport.current || activeTab === 'preview')) scheduleCursorPreview();
  });

  const insertText = async (insertion: TextInsertion) => {
    const element = textareaElement;
    if (!element || disabled) return;
    let start = element.selectionStart;
    let end = element.selectionEnd;
    if (start === end && (insertion.kind === 'heading' || (insertion.kind === 'text' && insertion.wholeLine))) {
      start = body.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = body.indexOf('\n', end);
      end = lineEnd === -1 ? body.length : lineEnd;
    }
    let replacement: string;
    let selectionStart: number;
    let selectionEnd: number;
    if (insertion.kind === 'chapter') {
      // NOTE: 章タイトルのタグは行頭に単独で置く必要があるため、行の上に新しい行として挿入する
      const lineStart = body.lastIndexOf('\n', start - 1) + 1;
      const title = m.editor_chapter();
      start = lineStart;
      end = lineStart;
      replacement = `[chapter:${title}]\n`;
      selectionStart = lineStart + '[chapter:'.length;
      selectionEnd = selectionStart + title.length;
    } else if (insertion.kind === 'pageBreak') {
      // NOTE: 改ページのタグも行頭に単独で置き、現在の行はそのまま残す
      const lineStart = body.lastIndexOf('\n', start - 1) + 1;
      start = lineStart;
      end = lineStart;
      replacement = '[newpage]\n';
      selectionStart = lineStart + replacement.length;
      selectionEnd = selectionStart;
    } else if (insertion.kind === 'heading') {
      const content = body.slice(start, end) || m.editor_heading();
      replacement = content.split('\n').map((line) => (line ? `${line}［＃「${line}」は${insertion.level}見出し］` : '')).join('\n');
      selectionStart = start;
      selectionEnd = start + replacement.length;
    } else {
      const content = insertion.suffix !== undefined || insertion.wholeLine
        ? body.slice(start, end) || insertion.placeholder || ''
        : '';
      replacement = insertion.prefix + content + (insertion.suffix ?? '');
      selectionStart = start + insertion.prefix.length;
      selectionEnd = selectionStart + content.length;
      if (insertion.suffixSelection) {
        selectionStart += content.length + insertion.suffixSelection.start;
        selectionEnd = start + insertion.prefix.length + content.length + insertion.suffixSelection.end;
      }
    }
    element.focus({ preventScroll: true });
    element.setSelectionRange(start, end);
    if (!document.execCommand('insertText', false, replacement)) {
      element.setRangeText(replacement, start, end, 'preserve');
    }
    body = element.value;
    await tick();
    element.focus({ preventScroll: true });
    element.setSelectionRange(selectionStart, selectionEnd);
    updateCursorLine();
  };

  onMount(() => {
    const onSelectionChange = () => {
      if (document.activeElement === textareaElement) updateCursorLine();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      if (cursorFollowAnimationFrame !== undefined) cancelAnimationFrame(cursorFollowAnimationFrame);
    };
  });
</script>

{#snippet inputPane()}
  <InputGroup.Root>
    <InputGroup.Textarea
      aria-label={m.editor_body()}
      style='writing-mode:horizontal-tb'
      spellcheck={false}
      {disabled}
      oninput={updateCursorLine}
      onselect={updateCursorLine}
      onkeyup={updateCursorLine}
      onclick={updateCursorLine}
      bind:ref={textareaElement}
      bind:value={body}/>
    <InputGroup.Addon align='block-start' class='overflow-x-auto border-b'>
      <NovelTextToolbar {fileType} {disabled} oninsert={(insertion) => void insertText(insertion)}/>
    </InputGroup.Addon>
    <InputGroup.Addon align='block-end' class='border-t'>
      <InputGroup.Text>{m.editor_char_count({ count: body.length.toLocaleString() })}</InputGroup.Text>
      <InputGroup.Text>{m.editor_line_count({ count: body.split('\n').length.toLocaleString() })}</InputGroup.Text>
    </InputGroup.Addon>
  </InputGroup.Root>
{/snippet}

{#snippet previewPane()}
  <section
    class='flex flex-col overflow-hidden rounded-3xl border'
    aria-label={m.editor_preview()}>
    <div class='flex items-center gap-2 p-3 text-sm text-muted-foreground'>
      <IconEye class='size-4'/> {m.editor_preview()}
      {#if previewPending}<Spinner class='ml-auto size-4'/>{/if}
    </div>
    <div class='relative min-h-0 flex-1'>
      {#if previewDocument.blocks.length > 0}
        <NovelDocumentViewer
          document={previewDocument}
          documentId='novel-editor-preview'
          {writingMode}
          persistMeasurements={false}
          bind:this={previewViewer}
          bind:scrollValue={previewScrollValue}/>
      {:else}
        <p
          class='
            flex h-full items-center justify-center text-sm
            text-muted-foreground
          '>{m.editor_no_body()}</p>
      {/if}
    </div>
  </section>
{/snippet}

{#if wideViewport.current}
  <div class='grid grid-cols-2 grid-rows-1 gap-4'>
    {@render inputPane()}
    {@render previewPane()}
  </div>
{:else}
  <Tabs.Root
    bind:value={() => activeTab, setActiveTab}
    class='grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-2'
    data-editor-layout='tabs'>
    <Tabs.List class='w-full'>
      <Tabs.Trigger value='input'><IconPencil class='size-4'/> {m.editor_body()}</Tabs.Trigger>
      <Tabs.Trigger value='preview'><IconEye class='size-4'/> {m.editor_preview()}</Tabs.Trigger>
    </Tabs.List>
    <Tabs.Content value='input' class='grid grid-cols-1 grid-rows-1'>
      {@render inputPane()}
    </Tabs.Content>
    <Tabs.Content value='preview' class='grid grid-cols-1 grid-rows-1'>
      {@render previewPane()}
    </Tabs.Content>
  </Tabs.Root>
{/if}
