<script lang='ts'>
  import type { NovelInline } from '@repo/novel-parser';
  import type { Bookmark, LoadedNovelDocumentFileType, NovelWritingMode } from '$lib/db';
  import type { InternalNovelInfo } from '$lib/internalNovels';
  import type { ManuallyEnteredText, RegisteredText, SelectedNovelText } from '$lib/selectedText';
  import { classifySentenceTextType, parseAozoraText, parsePlainText } from '@repo/novel-parser';
  import { createTtsController, isTtsAbortError } from '@repo/tts';
  import { autoStartPlayback, shiftMainByGesture, ttsPreset } from '$lib/appSettings.svelte';
  import NovelDocumentViewer from '$lib/components/NovelDocumentViewer.svelte';
  import { defaultTtsPresetKey } from '$lib/constants';
  import { setAddLoadedNovelDocumentDialogContext } from '$lib/contexts/addLoadedNovelDocumentDialog';
  import { setManageLoadedNovelDocumentsDialogContext } from '$lib/contexts/manageLoadedNovelDocumentsDialog';
  import { setManageSelectedTextsDialogContext } from '$lib/contexts/manageSelectedTextsDialog';
  import {
    addBookmark,
    addLoadedInternalNovelDocument,
    addLoadedNovelDocumentFromFile,
    deleteLoadedNovelDocument,
    getLoadedNovelDocuments,
    moveLoadedNovelDocument,
  } from '$lib/db';
  import { downloadInternalNovel } from '$lib/internalNovels';
  import { m } from '$lib/paraglide/messages';
  import { copyRegisteredText } from '$lib/selectedText';
  import { Spinner } from '$lib/shadcn-svelte/components/ui/spinner';
  import { ttsPresetEntries } from '$lib/tts';
  import { FileNotSelectedError, pickSingleFile } from '$lib/utils/misc';
  import { decodeTextFile } from '$lib/utils/textEncoding';
  import { extractTextFileFromZip, isZipFile, ZipExtractionError } from '$lib/utils/zip';
  import { stateQuery } from 'dexie-svelte-query';
  import { onCleanup, PersistedState, useDebounce } from 'runed';
  import { tick, untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { MediaQuery, SvelteMap } from 'svelte/reactivity';

  import type { SelectedText, SelectedTextStatus } from './_types';
  import AddLoadedNovelDocumentDialog from './_components/AddLoadedNovelDocumentDialog.svelte';
  import Footer from './_components/Footer.svelte';
  import Header from './_components/Header.svelte';
  import ManageLoadedNovelDocumentsDialog from './_components/ManageLoadedNovelDocumentsDialog.svelte';
  import ManageSelectedTextsDialog from './_components/ManageSelectedTextsDialog.svelte';
  import { contentToText } from './_utils';

  const defaultTtsPreset = ttsPresetEntries.find(({ key }) => key === defaultTtsPresetKey);
  if (!defaultTtsPreset) throw new Error(`Default TTS preset not found: ${defaultTtsPresetKey}`);

  const resolveTtsPreset = (key: string | null | undefined) => (
    ttsPresetEntries.find((entry) => entry.key === key) ?? defaultTtsPreset
  );
  const initialTtsPreset = resolveTtsPreset(ttsPreset.current);
  let activeTtsPresetKey = $state(initialTtsPreset.key);
  let ttsInstance = $state.raw(createTtsController(initialTtsPreset.preset));

  const loadedNovelDocumentsQuery = stateQuery(getLoadedNovelDocuments);
  const loadedNovelDocuments = $derived(loadedNovelDocumentsQuery.current ?? []);

  const currentTabIndex = new PersistedState<number>('current-tab-index', 0);
  let pendingCurrentDocumentId = $state<string>();

  const uiCollapsed = new PersistedState('ui-collapsed', false);
  const narrowViewport = new MediaQuery('max-width: 639.98px', false);

  const resolvedCurrentTabIndex = $derived.by(() => {
    const documentCount = loadedNovelDocuments.length;
    if (documentCount === 0) return 0;
    return Math.min(currentTabIndex.current, documentCount - 1);
  });

  $effect(() => {
    if (!pendingCurrentDocumentId) return;
    const addedDocumentIndex = loadedNovelDocuments.findIndex(({ id }) => id === pendingCurrentDocumentId);
    if (addedDocumentIndex === -1) return;
    currentTabIndex.current = addedDocumentIndex;
    pendingCurrentDocumentId = undefined;
  });

  const novelDocument = $derived.by(async () => {
    const loadedNovelDocument = loadedNovelDocuments[resolvedCurrentTabIndex];
    if (!loadedNovelDocument) return undefined;
    const text = await decodeTextFile(loadedNovelDocument.fileData);
    return {
      document: loadedNovelDocument.fileType === 'aozoratext'
        ? parseAozoraText(text)
        : parsePlainText(text, { title: loadedNovelDocument.title, author: null }),
      documentId: loadedNovelDocument.id,
      documentHash: loadedNovelDocument.hash,
      writingMode: loadedNovelDocument.writingMode,
    };
  });

  let isOpenAddLoadedNovelDocumentDialog = $state(false);
  let isOpenManageLoadedNovelDocumentsDialog = $state(false);
  let isOpenManageSelectedTextsDialog = $state(false);
  setAddLoadedNovelDocumentDialogContext({
    open: () => isOpenAddLoadedNovelDocumentDialog = true,
  });
  setManageLoadedNovelDocumentsDialogContext({
    open: () => isOpenManageLoadedNovelDocumentsDialog = true,
  });
  setManageSelectedTextsDialogContext({
    open: () => isOpenManageSelectedTextsDialog = true,
  });

  const getAddNovelFileErrorMessage = (error: unknown): string => {
    if (!(error instanceof ZipExtractionError)) return m.library_add_file_failed();
    if (error.reason === 'no-text-file') return m.error_zip_no_text_file();
    if (error.reason === 'multiple-text-files') return m.error_zip_multiple_text_files();
    return m.error_zip_invalid();
  };

  const handleClickAddNovelFileButton = async (
    fileType: LoadedNovelDocumentFileType,
    writingMode: NovelWritingMode,
  ): Promise<boolean> => {
    try {
      const pickedFile = await pickSingleFile({
        accept: fileType === 'aozoratext' ? '.txt,.zip' : 'text/plain',
      });
      const file = fileType === 'aozoratext' && await isZipFile(pickedFile)
        ? await extractTextFileFromZip(pickedFile)
        : pickedFile;
      pendingCurrentDocumentId = await addLoadedNovelDocumentFromFile(fileType, file, writingMode);
      return true;
    } catch (error) {
      if (error instanceof FileNotSelectedError) return false;
      toast.error(getAddNovelFileErrorMessage(error));
      console.error('Failed to add the novel from the file:', error);
      return false;
    }
  };

  const handleClickSelectAozoraTextFileButton = (writingMode: NovelWritingMode) => (
    handleClickAddNovelFileButton('aozoratext', writingMode)
  );

  const handleClickSelectPlainTextFileButton = (writingMode: NovelWritingMode) => (
    handleClickAddNovelFileButton('plaintext', writingMode)
  );

  const handleClickAddInternalNovelButton = async (novel: InternalNovelInfo, writingMode: NovelWritingMode) => {
    try {
      const { fileData, hash } = await downloadInternalNovel(novel.id);
      pendingCurrentDocumentId = await addLoadedInternalNovelDocument({
        novelId: novel.id,
        title: novel.title,
        fileType: novel.fileType,
        fileData,
        writingMode,
        hash,
      });
      toast.success(m.library_added_novel({ title: novel.title }));
    } catch {
      toast.error(m.library_add_built_in_failed());
    }
  };

  const handleClickDeleteLoadedNovelDocumentButton = async (id: string) => {
    const deletedIndex = loadedNovelDocuments.findIndex((document) => document.id === id);
    if (deletedIndex === -1) return;

    const documentCount = loadedNovelDocuments.length;
    const selectedIndex = resolvedCurrentTabIndex;
    await deleteLoadedNovelDocument(id);
    const isLastDocumentSelected = selectedIndex === deletedIndex && deletedIndex === documentCount - 1;
    if (selectedIndex > deletedIndex || isLastDocumentSelected) {
      currentTabIndex.current = Math.max(0, selectedIndex - 1);
    }
  };

  const handleClickMoveLoadedNovelDocumentButton = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = loadedNovelDocuments.findIndex((document) => document.id === id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (!loadedNovelDocuments[currentIndex] || !loadedNovelDocuments[targetIndex]) return;

    const selectedIndex = resolvedCurrentTabIndex;
    await moveLoadedNovelDocument(id, direction);
    if (selectedIndex === currentIndex) currentTabIndex.current = targetIndex;
    else if (selectedIndex === targetIndex) currentTabIndex.current = currentIndex;
  };

  let scrollMax = $state(0);
  let novelDocumentViewer: ReturnType<typeof NovelDocumentViewer> | undefined = $state();

  const scrollValueByDocumentId = new PersistedState<Record<string, number>>('scroll-value-by-document-id', {});
  const currentDocumentId = $derived(loadedNovelDocuments[resolvedCurrentTabIndex]?.id);
  const getScrollValue = () => {
    if (currentDocumentId === undefined) return 0;
    return scrollValueByDocumentId.current[currentDocumentId] ?? 0;
  };
  const setScrollValue = (value: number) => {
    if (currentDocumentId !== undefined) scrollValueByDocumentId.current[currentDocumentId] = value;
  };

  $effect(() => {
    if (currentDocumentId === undefined) return;
    scrollMax = 0;
  });

  const selectedTextMap = new SvelteMap<string, SelectedText>();

  const currentWritingMode = $derived(loadedNovelDocuments[resolvedCurrentTabIndex]?.writingMode);
  const isVerticalWritingMode = $derived(currentWritingMode === 'vertical-rl' || currentWritingMode === 'vertical-lr');
  const isFooterOverlappingMain = $derived(selectedTextMap.size > 0 && !uiCollapsed.current);
  const isMainShiftEnabled = $derived(shiftMainByGesture.current && isFooterOverlappingMain);

  let shiftedUpDocumentId = $state<string>();
  const isMainShiftedUp = $derived(
    isMainShiftEnabled && isVerticalWritingMode
      && shiftedUpDocumentId !== undefined && shiftedUpDocumentId === currentDocumentId,
  );

  // 誤操作を避けるため、同じ方向へ一定量スクロールするまでは移動させない
  const mainShiftWheelDeltaThreshold = 80;
  const mainShiftWheelGestureInterval = 200;
  const wheelLineHeight = 16;
  // タッチでのフリックも同じように一定量動かすまでは反応させない
  const mainShiftFlickDistanceThreshold = 40;
  const mainShiftFlickVerticalDominance = 1.5;

  let pendingWheelDeltaY = 0;
  let lastWheelTime = 0;
  let flickGesture: { identifier: number; startX: number; startY: number; } | undefined;
  let isSelectionChangedDuringFlick = false;

  $effect(() => {
    if (isMainShiftEnabled) return;
    shiftedUpDocumentId = undefined;
    pendingWheelDeltaY = 0;
    flickGesture = undefined;
  });

  const handleMainWheel = (event: WheelEvent) => {
    if (!isMainShiftEnabled || !isVerticalWritingMode) return;
    if (event.deltaY === 0) return;

    const now = performance.now();
    if (now - lastWheelTime > mainShiftWheelGestureInterval) pendingWheelDeltaY = 0;
    lastWheelTime = now;

    const deltaY = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * wheelLineHeight : event.deltaY;
    if (Math.sign(deltaY) !== Math.sign(pendingWheelDeltaY)) pendingWheelDeltaY = 0;
    pendingWheelDeltaY += deltaY;
    if (Math.abs(pendingWheelDeltaY) < mainShiftWheelDeltaThreshold) return;

    shiftedUpDocumentId = pendingWheelDeltaY > 0 ? currentDocumentId : undefined;
    pendingWheelDeltaY = 0;
  };

  const findTouch = (touches: TouchList, identifier: number) => {
    for (let index = 0; index < touches.length; index += 1) {
      const touch = touches.item(index);
      if (!touch) continue;
      if (touch.identifier === identifier) return touch;
    }
    return undefined;
  };

  const handleMainTouchStart = (event: TouchEvent) => {
    flickGesture = undefined;
    isSelectionChangedDuringFlick = false;
    if (!isMainShiftEnabled || !isVerticalWritingMode) return;
    if (event.touches.length !== 1) return;

    const touch = event.touches.item(0);
    if (!touch) return;
    flickGesture = { identifier: touch.identifier, startX: touch.clientX, startY: touch.clientY };
  };

  const handleMainTouchMove = (event: TouchEvent) => {
    // NOTE: 2本指での操作（ピンチズームなど）はフリックと判定しない
    if (event.touches.length > 1) flickGesture = undefined;
  };

  const handleMainTouchEnd = (event: TouchEvent) => {
    const gesture = flickGesture;
    flickGesture = undefined;
    if (!gesture || isSelectionChangedDuringFlick) return;

    const touch = findTouch(event.changedTouches, gesture.identifier);
    if (!touch) return;
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    if (Math.abs(deltaY) < mainShiftFlickDistanceThreshold) return;
    if (Math.abs(deltaY) <= Math.abs(deltaX) * mainShiftFlickVerticalDominance) return;

    // NOTE: 上フリックでmainを上へ移動させ、下フリックで元の位置へ戻す
    shiftedUpDocumentId = deltaY < 0 ? currentDocumentId : undefined;
  };

  const handleMainTouchCancel = () => {
    flickGesture = undefined;
    isSelectionChangedDuringFlick = false;
  };

  $effect(() => {
    // NOTE: 長押しでの選択範囲の調整をフリックと誤判定しないようにする
    const onSelectionChange = () => {
      if (flickGesture) isSelectionChangedDuringFlick = true;
    };
    document.addEventListener('selectionchange', onSelectionChange);

    return () => document.removeEventListener('selectionchange', onSelectionChange);
  });

  const preparePlayback = (id: string, registeredText: RegisteredText): SelectedText => {
    const selectedTextData = copyRegisteredText(registeredText);
    let status = $state<SelectedTextStatus>('preparing');
    const preparedInstance = ttsInstance.prepare(contentToText(selectedTextData.inlines, true));
    preparedInstance.ready
      .then(() => {
        status = 'prepared';
      })
      .catch(() => {
        status = 'error';
      });
    return {
      ...selectedTextData,
      id,
      preparedInstance,
      get status() {
        return status;
      },
    };
  };

  $effect(() => {
    const nextTtsPreset = resolveTtsPreset(ttsPreset.current);
    if (nextTtsPreset.key === activeTtsPresetKey) return;

    untrack(() => {
      ttsInstance.stop();
      activeTtsPresetKey = nextTtsPreset.key;
      ttsInstance = createTtsController(nextTtsPreset.preset);
      for (const [id, selectedText] of Array.from(selectedTextMap.entries())) {
        selectedText.preparedInstance.stop();
        selectedTextMap.set(id, preparePlayback(id, selectedText));
      }
    });
  });

  let isPlaying = $state(false);
  let playbackRunId = 0;

  const playingSelectedText = $derived.by(() => {
    if (!isPlaying) return undefined;
    const playing = selectedTextMap.values().next().value;
    if (!playing || playing.registrationMethod !== 'selection') return undefined;
    if (playing.documentId !== currentDocumentId) return undefined;
    return playing;
  });

  const playSelectedTexts = async (runId: number) => {
    while (runId === playbackRunId && selectedTextMap.size > 0) {
      const first = selectedTextMap.entries().next().value;
      if (!first) break;
      const [firstId, firstSelectedText] = first;
      try {
        await firstSelectedText.preparedInstance.speak();
      } catch (error) {
        if (isTtsAbortError(error)) {
          if (runId !== playbackRunId) break;
          const wasReplaced = selectedTextMap.get(firstId) !== firstSelectedText;
          if (autoStartPlayback.current && wasReplaced) continue;
          break;
        }
        throw error;
      }
      if (runId !== playbackRunId) break;
      selectedTextMap.delete(firstId);
    }
  };

  const handleClickPlayButton = async () => {
    document.getSelection()?.removeAllRanges();
    if (isPlaying) {
      playbackRunId += 1;
      isPlaying = false;
      ttsInstance.stop();
      return;
    }
    const runId = ++playbackRunId;
    isPlaying = true;
    try {
      await playSelectedTexts(runId);
    } finally {
      if (runId === playbackRunId) isPlaying = false;
    }
  };

  const requestAutoPlayback = () => {
    if (!autoStartPlayback.current || isPlaying) return;
    handleClickPlayButton();
  };

  const handleSelectionChange = (registeredText: SelectedNovelText) => {
    const selectedText = contentToText(registeredText.inlines);
    if (!selectedText) return;
    if (selectedTextMap.size === 0) {
      const id = crypto.randomUUID();
      selectedTextMap.set(id, preparePlayback(id, registeredText));
      requestAutoPlayback();
      return;
    }
    const lastSelectedText = Array.from(selectedTextMap.entries()).at(-1);
    if (!lastSelectedText) return;
    const [lastSelectedTextId, lastSelectedTextData] = lastSelectedText;
    const lastSelectedTextContent = contentToText(lastSelectedTextData.inlines);
    if (
      lastSelectedTextContent.startsWith(selectedText)
      || lastSelectedTextContent.endsWith(selectedText)
      || selectedText.startsWith(lastSelectedTextContent)
      || selectedText.endsWith(lastSelectedTextContent)
    ) {
      lastSelectedTextData.preparedInstance.stop();
      selectedTextMap.set(lastSelectedTextId, preparePlayback(lastSelectedTextId, registeredText));
    } else {
      const id = crypto.randomUUID();
      selectedTextMap.set(id, preparePlayback(id, registeredText));
    }
    requestAutoPlayback();
  };

  const handleClickAddSelectedTextButton = (text: string) => {
    const id = crypto.randomUUID();
    const inlines: NovelInline[] = [{ type: 'text', value: text }];
    const manuallyEnteredText: ManuallyEnteredText = {
      documentId: null,
      inlines,
      registrationMethod: 'manual',
      selectionRange: null,
      textType: classifySentenceTextType(inlines),
    };
    selectedTextMap.set(id, preparePlayback(id, manuallyEnteredText));
    requestAutoPlayback();
  };

  const handleClickDeleteButton = (selectedTextId: string) => {
    const selectedText = selectedTextMap.get(selectedTextId);
    if (!selectedText) return;
    selectedText.preparedInstance.stop();
    selectedTextMap.delete(selectedTextId);
  };

  const handleClickAddBookmarkButton = async (selectedTextId: string) => {
    const selectedText = selectedTextMap.get(selectedTextId);
    if (!selectedText) return;
    try {
      await addBookmark(selectedText);
      toast.success(m.bookmark_added());
    } catch {
      toast.error(m.bookmark_add_failed());
    }
  };

  const handleClickBookmarkLocationButton = async (bookmark: Bookmark) => {
    if (bookmark.selectionRange === null) return;
    const documentIndex = loadedNovelDocuments.findIndex(({ id }) => id === bookmark.documentId);
    if (documentIndex === -1) return;
    currentTabIndex.current = documentIndex;
    const resolvedNovelDocument = await novelDocument;
    if (resolvedNovelDocument?.documentId !== bookmark.documentId) return;
    await tick();
    await novelDocumentViewer?.scrollToPosition(bookmark.selectionRange.start);
  };

  const handleClickAddBookmarkToSelectedTextsButton = (bookmark: Bookmark) => {
    const id = crypto.randomUUID();
    selectedTextMap.set(id, preparePlayback(id, bookmark));
    requestAutoPlayback();
  };

  const handleClickDeleteAllButton = () => {
    selectedTextMap.forEach((selectedText) => {
      selectedText.preparedInstance.stop();
    });
    selectedTextMap.clear();
  };

  const debouncedHandleSelectionChange = useDebounce(handleSelectionChange, 200);

  onCleanup(() => {
    debouncedHandleSelectionChange.cancel();
  });

</script>

{#snippet loadingScreen()}
  <div class='flex size-full items-center justify-center'>
    <Spinner/>
  </div>
{/snippet}

<div class='relative h-dvh w-dvw'>
  {#if !loadedNovelDocumentsQuery.isLoading}
    <div class='absolute top-0 z-1 w-full'>
      <Header
        {loadedNovelDocuments}
        collapsed={uiCollapsed.current}
        narrowViewport={narrowViewport.current}
        bind:currentTabIndex={() => resolvedCurrentTabIndex,
        (v) => currentTabIndex.current = v}/>
    </div>
  {/if}
  <main
    class='absolute top-0 left-0 z-0 size-full touch-none transition-transform'
    class:-translate-y-35={isMainShiftedUp}
    onwheel={handleMainWheel}
    ontouchstart={handleMainTouchStart}
    ontouchmove={handleMainTouchMove}
    ontouchend={handleMainTouchEnd}
    ontouchcancel={handleMainTouchCancel}>
    {#if loadedNovelDocumentsQuery.isLoading}
      {@render loadingScreen()}
    {:else}
      {#await novelDocument}
        {@render loadingScreen()}
      {:then resolvedNovelDocument}
        {#if resolvedNovelDocument && resolvedNovelDocument.documentId === currentDocumentId}
          <NovelDocumentViewer
            bind:this={novelDocumentViewer}
            document={resolvedNovelDocument.document}
            documentId={resolvedNovelDocument.documentId}
            documentHash={resolvedNovelDocument.documentHash}
            writingMode={resolvedNovelDocument.writingMode}
            highlightRange={playingSelectedText?.selectionRange}
            class={{
              'pb-35': isFooterOverlappingMain && resolvedNovelDocument.writingMode === 'horizontal-tb',
            }}
            showTitle={uiCollapsed.current}
            bind:scrollValue={getScrollValue, setScrollValue}
            bind:scrollMax
            onselectionchange={debouncedHandleSelectionChange}/>
        {/if}
      {:catch error}
        <div class='flex size-full items-center justify-center'>
          <span>{m.common_error({ message: error.message })}</span>
        </div>
      {/await}
    {/if}
  </main>
  <div class='absolute bottom-0 z-1 w-full'>
    <Footer
      {loadedNovelDocuments}
      {selectedTextMap}
      {isPlaying}
      {scrollMax}
      bind:collapsed={uiCollapsed.current}
      bind:scrollValue={getScrollValue, setScrollValue}
      onClickPlayButton={handleClickPlayButton}
      onClickBookmarkLocationButton={handleClickBookmarkLocationButton}
      onClickAddBookmarkToSelectedTextsButton={handleClickAddBookmarkToSelectedTextsButton}
      onClickDeleteButton={handleClickDeleteButton}/>
  </div>
</div>

<ManageLoadedNovelDocumentsDialog
  bind:open={isOpenManageLoadedNovelDocumentsDialog}
  {loadedNovelDocuments}
  bind:currentTabIndex={() => resolvedCurrentTabIndex,
  (v) => currentTabIndex.current = v}
  onClickDeleteButton={handleClickDeleteLoadedNovelDocumentButton}
  onClickMoveButton={handleClickMoveLoadedNovelDocumentButton}/>
<AddLoadedNovelDocumentDialog
  bind:open={isOpenAddLoadedNovelDocumentDialog}
  {loadedNovelDocuments}
  onClickSelectAozoraTextFileButton={handleClickSelectAozoraTextFileButton}
  onClickSelectPlainTextFileButton={handleClickSelectPlainTextFileButton}
  onClickAddInternalNovelButton={handleClickAddInternalNovelButton}/>
<ManageSelectedTextsDialog
  bind:open={isOpenManageSelectedTextsDialog}
  {selectedTextMap}
  {isPlaying}
  onClickPlayButton={handleClickPlayButton}
  onClickAddSelectedTextButton={handleClickAddSelectedTextButton}
  onClickAddBookmarkButton={handleClickAddBookmarkButton}
  onClickDeleteButton={handleClickDeleteButton}
  onClickDeleteAllButton={handleClickDeleteAllButton}/>
