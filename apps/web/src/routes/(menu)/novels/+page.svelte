<script lang='ts'>
  import type { AozoraTextSource } from '@repo/novel-parser';
  import type { LoadedNovelDocument, LoadedNovelDocumentFileType } from '$lib/db';
  import { composeAozoraText, splitAozoraText } from '@repo/novel-parser';
  import { IconBook2, IconDotsVertical, IconFilePlus, IconLock, IconLockOpen, IconPencil, IconSearch, IconTrash, IconTypography } from '@tabler/icons-svelte';
  import { goto, replaceState } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { addLoadedNovelDocumentFromFile, deleteLoadedNovelDocument, getLoadedNovelDocuments, setLoadedNovelDocumentEditLocked, updateLoadedNovelDocumentFromFile } from '$lib/db';
  import * as AlertDialog from '$lib/shadcn-svelte/components/ui/alert-dialog';
  import { Badge } from '$lib/shadcn-svelte/components/ui/badge';
  import { Button, buttonVariants } from '$lib/shadcn-svelte/components/ui/button';
  import * as Dialog from '$lib/shadcn-svelte/components/ui/dialog';
  import * as DropdownMenu from '$lib/shadcn-svelte/components/ui/dropdown-menu';
  import { Input } from '$lib/shadcn-svelte/components/ui/input';
  import * as InputGroup from '$lib/shadcn-svelte/components/ui/input-group';
  import { Label } from '$lib/shadcn-svelte/components/ui/label';
  import * as NativeSelect from '$lib/shadcn-svelte/components/ui/native-select';
  import { Spinner } from '$lib/shadcn-svelte/components/ui/spinner';
  import { getErrorMessage } from '$lib/utils/misc';
  import { decodeTextFile } from '$lib/utils/textEncoding';
  import { stateQuery } from 'dexie-svelte-query';
  import { PersistedState } from 'runed';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';

  import CreateNovelDialog from './_components/CreateNovelDialog.svelte';

  const loadedNovelDocumentsQuery = stateQuery(getLoadedNovelDocuments);
  const documents = $derived(loadedNovelDocumentsQuery.current ?? []);
  const currentTabIndex = new PersistedState<number>('current-tab-index', 0);
  let search = $state('');
  let formatFilter = $state('all');
  const filteredDocuments = $derived(documents.filter((document) => (
    document.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
    && (formatFilter === 'all' || document.fileType === formatFilter)
  )));

  let createDialogOpen = $state(false);
  let createFileType = $state<LoadedNovelDocumentFileType>('aozoratext');
  let createTitle = $state('');
  let createAuthor = $state('');
  let isCreating = $state(false);

  const openCreateDialog = () => {
    if (isCreating) return;
    createFileType = 'aozoratext';
    createTitle = '';
    createAuthor = '';
    createDialogOpen = true;
  };

  const createNovel = async () => {
    if (isCreating || !createTitle.trim()) return;
    isCreating = true;
    try {
      const title = createTitle.trim();
      const source = createFileType === 'aozoratext'
        ? composeAozoraText({ title, author: createAuthor.trim() || null, body: '' })
        : '';
      const file = new File([source], createFileType === 'plaintext' ? title : `${title}.txt`, { type: 'text/plain;charset=utf-8' });
      const id = await addLoadedNovelDocumentFromFile(createFileType, file, 'vertical-rl');
      createDialogOpen = false;
      await goto(resolve('/(menu)/novels/[id]', { id }));
    } catch (error) {
      toast.error(getErrorMessage(error, '小説を作成できませんでした'));
    } finally {
      isCreating = false;
    }
  };

  onMount(() => {
    if (!page.url.searchParams.has('create')) return;
    openCreateDialog();
    replaceState(resolve('/(menu)/novels'), page.state);
  });

  let metadataDialogOpen = $state(false);
  let metadataTarget = $state.raw<LoadedNovelDocument>();
  let metadataParts = $state.raw<AozoraTextSource>();
  let metadataTitle = $state('');
  let metadataAuthor = $state('');
  let isLoadingMetadata = $state(false);
  let isSavingMetadata = $state(false);
  let metadataLoadGeneration = 0;
  let deleteDialogOpen = $state(false);
  let deleteTarget = $state.raw<LoadedNovelDocument>();
  let isDeleting = $state(false);
  let isTogglingEditLock = $state(false);

  const openMetadataDialog = async (document: LoadedNovelDocument) => {
    if (document.type !== 'file' || document.isEditLocked) return;
    metadataLoadGeneration += 1;
    const generation = metadataLoadGeneration;
    metadataTarget = document;
    metadataParts = undefined;
    metadataTitle = document.title;
    metadataAuthor = '';
    metadataDialogOpen = true;
    isLoadingMetadata = true;
    try {
      if (document.fileType === 'aozoratext') {
        const text = await decodeTextFile(document.fileData);
        if (generation !== metadataLoadGeneration) return;
        metadataParts = splitAozoraText(text);
        metadataTitle = metadataParts.title || document.title;
        metadataAuthor = metadataParts.author ?? '';
      }
    } catch (error) {
      if (generation !== metadataLoadGeneration) return;
      toast.error(getErrorMessage(error, '小説を読み込めませんでした'));
      metadataDialogOpen = false;
    } finally {
      if (generation === metadataLoadGeneration) isLoadingMetadata = false;
    }
  };

  const saveMetadata = async (event: SubmitEvent) => {
    event.preventDefault();
    const target = metadataTarget;
    if (!target || target.type === 'internal' || isLoadingMetadata || isSavingMetadata || !metadataTitle.trim()) return;
    isSavingMetadata = true;
    try {
      let file: File;
      if (target.fileType === 'aozoratext') {
        if (!metadataParts) return;
        const text = composeAozoraText({ ...metadataParts, title: metadataTitle, author: metadataAuthor.trim() || null });
        file = new File([text], target.fileData.name, { type: 'text/plain;charset=utf-8' });
      } else {
        file = new File([target.fileData], metadataTitle.trim(), { type: target.fileData.type });
      }
      await updateLoadedNovelDocumentFromFile(target.id, target.fileType, file, target.writingMode, target.hash);
      metadataDialogOpen = false;
      toast.success('小説の情報を変更しました');
    } catch (error) {
      toast.error(getErrorMessage(error, '小説の情報を変更できませんでした'));
    } finally {
      isSavingMetadata = false;
    }
  };

  const toggleEditLock = async (document: LoadedNovelDocument) => {
    if (document.type !== 'file' || isTogglingEditLock) return;
    const nextEditLocked = !document.isEditLocked;
    isTogglingEditLock = true;
    try {
      await setLoadedNovelDocumentEditLocked(document.id, nextEditLocked);
      toast.success(nextEditLocked ? '小説の編集をロックしました' : '小説の編集ロックを解除しました');
    } catch (error) {
      toast.error(getErrorMessage(error, '編集ロックを変更できませんでした'));
    } finally {
      isTogglingEditLock = false;
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    const deletedIndex = documents.findIndex(({ id }) => id === deleteTarget?.id);
    const selectedIndex = Math.min(currentTabIndex.current, documents.length - 1);
    const documentCount = documents.length;
    isDeleting = true;
    try {
      await deleteLoadedNovelDocument(deleteTarget.id);
      if (selectedIndex > deletedIndex || (selectedIndex === deletedIndex && deletedIndex === documentCount - 1)) {
        currentTabIndex.current = Math.max(0, selectedIndex - 1);
      }
      deleteDialogOpen = false;
      toast.success('小説を削除しました');
    } catch (error) {
      toast.error(getErrorMessage(error, '小説を削除できませんでした'));
    } finally {
      isDeleting = false;
    }
  };
</script>

<div class='flex flex-col gap-4'>
  <div class='flex items-center justify-between gap-3'>
    <p class='text-sm text-muted-foreground'>{documents.length}件の小説</p>
    <Button onclick={openCreateDialog}><IconFilePlus/> 新規作成</Button>
  </div>
  <div class='flex flex-wrap items-center gap-2'>
    <InputGroup.Root class='min-w-40 flex-1'>
      <InputGroup.Input placeholder='小説を検索...' bind:value={search}/>
      <InputGroup.Addon>
        <IconSearch/>
      </InputGroup.Addon>
    </InputGroup.Root>
    <NativeSelect.Root aria-label='形式で絞り込み' bind:value={formatFilter}>
      <NativeSelect.Option value='all'>すべての形式</NativeSelect.Option>
      <NativeSelect.Option value='aozoratext'>青空文庫形式</NativeSelect.Option>
      <NativeSelect.Option value='plaintext'>プレーンテキスト</NativeSelect.Option>
    </NativeSelect.Root>
  </div>
  {#if loadedNovelDocumentsQuery.current === undefined}
    <div class='flex justify-center py-16' role='status' aria-label='小説一覧を読み込み中'><Spinner/></div>
  {:else if documents.length === 0}
    <div
      class='
        flex flex-col items-center gap-3 border-y py-16 text-muted-foreground
      '>
      <IconBook2 class='size-8'/>
      <p>小説がありません。</p>
    </div>
  {:else}
    <ul class='divide-y border-y'>
      {#each filteredDocuments as document (document.id)}
        <li class='flex min-w-0 items-center gap-3 py-3'>
          <IconBook2
            class='
              hidden size-5 shrink-0 text-muted-foreground
              sm:block
            '/>
          <div class='min-w-0 flex-1'>
            {#if document.type === 'file' && !document.isEditLocked}
              <a
                class='
                  block font-medium wrap-break-word
                  hover:underline
                '
                href={resolve('/(menu)/novels/[id]', { id: document.id })}>
                {document.title}
              </a>
            {:else}
              <span class='block font-medium wrap-break-word'>{document.title}</span>
            {/if}
            <div
              class='
                mt-1 flex flex-wrap items-center gap-2 text-xs
                text-muted-foreground
              '>
              <span>{document.fileType === 'aozoratext' ? '青空文庫形式' : 'プレーンテキスト'}</span>
              {#if document.type === 'internal'}<Badge variant='outline'>内蔵</Badge>{/if}
            </div>
          </div>
          {#if document.type === 'file' && document.isEditLocked}
            <Badge variant='outline'><IconLock/> 編集ロック</Badge>
          {/if}
          {#if document.type === 'file' && !document.isEditLocked}
            <Button
              variant='ghost'
              size='icon'
              aria-label={`「${document.title}」を編集`}
              title='編集'
              href={resolve('/(menu)/novels/[id]', { id: document.id })}>
              <IconPencil/>
            </Button>
          {/if}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              class={buttonVariants({ variant: 'ghost', size: 'icon' })}
              aria-label={`「${document.title}」のメニュー`}
              title='小説のメニュー'>
              <IconDotsVertical/>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align='end'>
              {#if document.type === 'file'}
                <DropdownMenu.Item
                  disabled={document.isEditLocked}
                  onSelect={() => void openMetadataDialog(document)}>
                  <IconTypography/> {document.fileType === 'aozoratext' ? 'タイトル・著者名を変更' : 'ファイル名を変更'}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => void toggleEditLock(document)}>
                  {#if document.isEditLocked}<IconLockOpen/> 編集ロックを解除{:else}<IconLock/> 編集をロック{/if}
                </DropdownMenu.Item>
                <DropdownMenu.Separator/>
              {/if}
              <DropdownMenu.Item
                variant='destructive'
                onSelect={() => {
                  deleteTarget = document;
                  deleteDialogOpen = true;
                }}>
                <IconTrash/> 削除
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </li>
      {:else}
        <li class='py-12 text-center text-sm text-muted-foreground'>一致する小説がありません。</li>
      {/each}
    </ul>
  {/if}
</div>

<CreateNovelDialog
  bind:open={createDialogOpen}
  bind:fileType={createFileType}
  bind:title={createTitle}
  bind:author={createAuthor}
  busy={isCreating}
  onconfirm={() => void createNovel()}/>

<Dialog.Root bind:open={metadataDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{metadataTarget?.fileType === 'aozoratext' ? 'タイトル・著者名を変更' : 'ファイル名を変更'}</Dialog.Title>
    </Dialog.Header>
    {#if isLoadingMetadata}
      <div class='flex justify-center py-8' role='status' aria-label='小説の情報を読み込み中'><Spinner/></div>
    {:else}
      <form class='flex flex-col gap-4' onsubmit={saveMetadata}>
        <div class='flex flex-col gap-2'>
          <Label for='metadata-title'>{metadataTarget?.fileType === 'aozoratext' ? 'タイトル' : 'ファイル名'}</Label>
          <Input
            id='metadata-title'
            required
            disabled={isSavingMetadata}
            bind:value={metadataTitle}/>
        </div>
        {#if metadataTarget?.fileType === 'aozoratext'}
          <div class='flex flex-col gap-2'>
            <Label for='metadata-author'>著者名</Label>
            <Input id='metadata-author' disabled={isSavingMetadata} bind:value={metadataAuthor}/>
          </div>
        {/if}
        <Dialog.Footer>
          <Button variant='outline' disabled={isSavingMetadata} onclick={() => metadataDialogOpen = false}>キャンセル</Button>
          <Button type='submit' disabled={isSavingMetadata || !metadataTitle.trim()}>
            {#if isSavingMetadata}<Spinner/>{/if} 変更
          </Button>
        </Dialog.Footer>
      </form>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>小説を削除しますか？</AlertDialog.Title>
      <AlertDialog.Description>「{deleteTarget?.title}」と、この小説のブックマークを削除します。この操作は取り消せません。</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={isDeleting}>キャンセル</AlertDialog.Cancel>
      <AlertDialog.Action variant='destructive' disabled={isDeleting} onclick={() => void confirmDelete()}><IconTrash/> 削除</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
