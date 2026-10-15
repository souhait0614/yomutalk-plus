<script lang='ts'>
  import type { LoadedNovelDocument, LoadedNovelDocumentFileType, NovelWritingMode } from '$lib/db';
  import { composeAozoraText, splitAozoraText } from '@repo/novel-parser';
  import { IconCheck, IconDeviceFloppy, IconList, IconReload } from '@tabler/icons-svelte';
  import { beforeNavigate, goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { appDatabase, updateLoadedNovelDocumentFromFile } from '$lib/db';
  import * as AlertDialog from '$lib/shadcn-svelte/components/ui/alert-dialog';
  import { Button } from '$lib/shadcn-svelte/components/ui/button';
  import { Spinner } from '$lib/shadcn-svelte/components/ui/spinner';
  import { decodeTextFile } from '$lib/utils/textEncoding';
  import { untrack } from 'svelte';
  import { toast } from 'svelte-sonner';

  import NovelEditor from './_components/NovelEditor.svelte';

  const writingMode: NovelWritingMode = 'vertical-rl';

  let originalDocument = $state.raw<LoadedNovelDocument>();
  let fileType = $state<LoadedNovelDocumentFileType>('aozoratext');
  let title = $state('');
  let author = $state('');
  let body = $state('');
  let header = $state('');
  let savedDraft = $state('');
  let isLoading = $state(true);
  let loadError = $state('');
  let isSaving = $state(false);
  let discardDialogOpen = $state(false);
  let pendingUrl = $state<URL>();

  const draft = $derived(JSON.stringify({ fileType, writingMode, title, author, body }));
  const hasUnsavedChanges = $derived(!isLoading && !loadError && draft !== savedDraft);
  const canSave = $derived(!isLoading && !isSaving && !!originalDocument && !!title.trim() && hasUnsavedChanges);
  const source = $derived(fileType === 'aozoratext'
    ? composeAozoraText({ title: title.trim() || '無題', author: author.trim() || null, body, header })
    : body);

  $effect(() => {
    const id = page.params.id;
    const controller = new AbortController();
    isLoading = true;
    loadError = '';
    void (async () => {
      try {
        if (!id) throw new Error('小説が見つかりません。');
        const document = await appDatabase.loadedNovelDocuments.get(id);
        if (!document) throw new Error('小説が見つかりません。削除されている可能性があります。');
        if (document.type === 'internal') throw new Error('アプリ内蔵小説は編集できません。');
        const text = await decodeTextFile(document.fileData);
        if (controller.signal.aborted) return;
        const nextFileType = document.fileType;
        const parts = nextFileType === 'aozoratext' ? splitAozoraText(text) : undefined;
        untrack(() => {
          originalDocument = document;
          fileType = nextFileType;
          title = parts?.title || document.title;
          author = parts?.author ?? '';
          body = parts?.body ?? text;
          header = parts?.header ?? '';
          savedDraft = JSON.stringify({ fileType, writingMode, title, author, body });
          isLoading = false;
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        loadError = error instanceof Error ? error.message : '小説を読み込めませんでした。';
        isLoading = false;
      }
    })();
    return () => controller.abort();
  });

  const save = async () => {
    if (!canSave || !originalDocument) return;
    isSaving = true;
    const savedSnapshot = draft;
    try {
      const file = new File([source], fileType === 'plaintext' ? title.trim() : `${title.trim()}.txt`, { type: 'text/plain;charset=utf-8' });
      const id = originalDocument.id;
      await updateLoadedNovelDocumentFromFile(id, fileType, file, writingMode, originalDocument.hash);
      originalDocument = await appDatabase.loadedNovelDocuments.get(id);
      savedDraft = savedSnapshot;
      toast.success('小説を保存しました');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '小説を保存できませんでした');
    } finally {
      isSaving = false;
    }
  };

  beforeNavigate((navigation) => {
    if (!hasUnsavedChanges) return;
    navigation.cancel();
    if (navigation.willUnload) return;
    pendingUrl = navigation.to?.url;
    discardDialogOpen = true;
  });

  const discardChanges = () => {
    if (!pendingUrl) return;
    savedDraft = draft;
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    void goto(pendingUrl);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!event.isComposing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void save();
    }
  };
</script>

<svelte:window onkeydown={onKeyDown}/>

{#if isLoading}
  <div class='flex justify-center py-16' role='status' aria-label='小説を読み込み中'><Spinner/></div>
{:else if loadError}
  <div class='flex flex-col items-center gap-4 py-16'>
    <p role='alert'>{loadError}</p>
    <Button variant='outline' onclick={() => window.location.reload()}><IconReload/> 再読み込み</Button>
    <Button variant='ghost' href={resolve('/(menu)/novels')}><IconList/> 一覧</Button>
  </div>
{:else}
  <div class='grid size-full grid-rows-[auto_minmax(0,1fr)] gap-2'>
    <div class='flex items-center justify-end gap-2'>
      <div class='flex items-center gap-3'>
        <span class='flex items-center gap-1 text-xs text-muted-foreground' role='status'>
          {#if hasUnsavedChanges}未保存{:else}<IconCheck class='size-3'/> 保存済み{/if}
        </span>
        <Button disabled={!canSave} onclick={() => void save()}>
          {#if isSaving}<Spinner/>{:else}<IconDeviceFloppy/>{/if}
          保存
        </Button>
      </div>
    </div>
    <NovelEditor
      bind:body
      {source}
      {title}
      {fileType}
      {writingMode}
      disabled={isSaving}/>
  </div>
{/if}

<AlertDialog.Root bind:open={discardDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>変更を破棄しますか？</AlertDialog.Title>
      <AlertDialog.Description>保存していない変更があります。移動すると変更は失われます。</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>編集を続ける</AlertDialog.Cancel>
      <AlertDialog.Action variant='destructive' onclick={discardChanges}>変更を破棄して移動</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
