<script lang='ts'>
  import type { AozoraTextSource } from '@repo/novel-parser';
  import type { LoadedNovelDocument, LoadedNovelDocumentFileType } from '$lib/db';
  import { composeAozoraText, splitAozoraText } from '@repo/novel-parser';
  import { IconBook2, IconDotsVertical, IconFilePlus, IconLock, IconLockOpen, IconPencil, IconSearch, IconTrash, IconTypography } from '@tabler/icons-svelte';
  import { goto, replaceState } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { addLoadedNovelDocumentFromFile, deleteLoadedNovelDocument, getLoadedNovelDocuments, setLoadedNovelDocumentEditLocked, updateLoadedNovelDocumentFromFile } from '$lib/db';
  import { m } from '$lib/paraglide/messages';
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
      toast.error(getErrorMessage(error, m.novel_create_failed()));
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
      toast.error(getErrorMessage(error, m.novel_load_failed()));
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
      toast.success(m.novel_metadata_updated());
    } catch (error) {
      toast.error(getErrorMessage(error, m.novel_metadata_update_failed()));
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
      toast.success(nextEditLocked ? m.novel_edit_locked_toast() : m.novel_edit_unlocked_toast());
    } catch (error) {
      toast.error(getErrorMessage(error, m.novel_edit_lock_failed()));
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
      toast.success(m.novel_deleted());
    } catch (error) {
      toast.error(getErrorMessage(error, m.novel_delete_failed()));
    } finally {
      isDeleting = false;
    }
  };
</script>

<div class='flex flex-col gap-4'>
  <div class='flex items-center justify-between gap-3'>
    <p class='text-sm text-muted-foreground'>{m.novel_count({ count: documents.length })}</p>
    <Button onclick={openCreateDialog}><IconFilePlus/> {m.novel_create()}</Button>
  </div>
  <div class='flex flex-wrap items-center gap-2'>
    <InputGroup.Root class='min-w-40 flex-1'>
      <InputGroup.Input placeholder={m.novel_search_placeholder()} bind:value={search}/>
      <InputGroup.Addon>
        <IconSearch/>
      </InputGroup.Addon>
    </InputGroup.Root>
    <NativeSelect.Root aria-label={m.novel_filter_by_format()} bind:value={formatFilter}>
      <NativeSelect.Option value='all'>{m.novel_filter_all_formats()}</NativeSelect.Option>
      <NativeSelect.Option value='aozoratext'>{m.format_aozora()}</NativeSelect.Option>
      <NativeSelect.Option value='plaintext'>{m.format_plain()}</NativeSelect.Option>
    </NativeSelect.Root>
  </div>
  {#if loadedNovelDocumentsQuery.current === undefined}
    <div class='flex justify-center py-16' role='status' aria-label={m.novel_list_loading()}><Spinner/></div>
  {:else if documents.length === 0}
    <div
      class='
        flex flex-col items-center gap-3 border-y py-16 text-muted-foreground
      '>
      <IconBook2 class='size-8'/>
      <p>{m.novel_empty()}</p>
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
              <span>{document.fileType === 'aozoratext' ? m.format_aozora() : m.format_plain()}</span>
              {#if document.type === 'internal'}<Badge variant='outline'>{m.novel_badge_internal()}</Badge>{/if}
            </div>
          </div>
          {#if document.type === 'file' && document.isEditLocked}
            <Badge variant='outline'><IconLock/> {m.novel_edit_lock_badge()}</Badge>
          {/if}
          {#if document.type === 'file' && !document.isEditLocked}
            <Button
              variant='ghost'
              size='icon'
              aria-label={m.novel_edit_aria({ title: document.title })}
              title={m.novel_edit()}
              href={resolve('/(menu)/novels/[id]', { id: document.id })}>
              <IconPencil/>
            </Button>
          {/if}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              class={buttonVariants({ variant: 'ghost', size: 'icon' })}
              aria-label={m.novel_menu_aria({ title: document.title })}
              title={m.novel_menu()}>
              <IconDotsVertical/>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align='end'>
              {#if document.type === 'file'}
                <DropdownMenu.Item
                  disabled={document.isEditLocked}
                  onSelect={() => void openMetadataDialog(document)}>
                  <IconTypography/> {document.fileType === 'aozoratext' ? m.novel_change_metadata() : m.novel_change_filename()}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => void toggleEditLock(document)}>
                  {#if document.isEditLocked}<IconLockOpen/> {m.novel_unlock_edit()}{:else}<IconLock/> {m.novel_lock_edit()}{/if}
                </DropdownMenu.Item>
                <DropdownMenu.Separator/>
              {/if}
              <DropdownMenu.Item
                variant='destructive'
                onSelect={() => {
                  deleteTarget = document;
                  deleteDialogOpen = true;
                }}>
                <IconTrash/> {m.common_delete()}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </li>
      {:else}
        <li class='py-12 text-center text-sm text-muted-foreground'>{m.novel_no_match()}</li>
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
      <Dialog.Title>{metadataTarget?.fileType === 'aozoratext' ? m.novel_change_metadata() : m.novel_change_filename()}</Dialog.Title>
    </Dialog.Header>
    {#if isLoadingMetadata}
      <div class='flex justify-center py-8' role='status' aria-label={m.novel_metadata_loading()}><Spinner/></div>
    {:else}
      <form class='flex flex-col gap-4' onsubmit={saveMetadata}>
        <div class='flex flex-col gap-2'>
          <Label for='metadata-title'>{metadataTarget?.fileType === 'aozoratext' ? m.novel_title() : m.novel_filename()}</Label>
          <Input
            id='metadata-title'
            required
            disabled={isSavingMetadata}
            bind:value={metadataTitle}/>
        </div>
        {#if metadataTarget?.fileType === 'aozoratext'}
          <div class='flex flex-col gap-2'>
            <Label for='metadata-author'>{m.novel_author()}</Label>
            <Input id='metadata-author' disabled={isSavingMetadata} bind:value={metadataAuthor}/>
          </div>
        {/if}
        <Dialog.Footer>
          <Button variant='outline' disabled={isSavingMetadata} onclick={() => metadataDialogOpen = false}>{m.common_cancel()}</Button>
          <Button type='submit' disabled={isSavingMetadata || !metadataTitle.trim()}>
            {#if isSavingMetadata}<Spinner/>{/if} {m.common_change()}
          </Button>
        </Dialog.Footer>
      </form>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{m.library_delete_confirm_title()}</AlertDialog.Title>
      <AlertDialog.Description>{m.novel_delete_confirm_description({ title: deleteTarget?.title ?? '' })}</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={isDeleting}>{m.common_cancel()}</AlertDialog.Cancel>
      <AlertDialog.Action variant='destructive' disabled={isDeleting} onclick={() => void confirmDelete()}><IconTrash/> {m.common_delete()}</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
