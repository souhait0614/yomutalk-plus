<script lang='ts'>
  import type { Bookmark, BookmarkFolder, LoadedNovelDocument } from '$lib/db';
  import { IconFolderPlus } from '@tabler/icons-svelte';
  import {
    addBookmarkFolder,
    deleteBookmark,
    deleteBookmarkFolder,
    getBookmarkFolders,
    getBookmarks,
    setBookmarkFolder,
  } from '$lib/db';
  import { m } from '$lib/paraglide/messages';
  import * as AlertDialog from '$lib/shadcn-svelte/components/ui/alert-dialog';
  import { Button } from '$lib/shadcn-svelte/components/ui/button';
  import { Input } from '$lib/shadcn-svelte/components/ui/input';
  import * as Sheet from '$lib/shadcn-svelte/components/ui/sheet';
  import { Spinner } from '$lib/shadcn-svelte/components/ui/spinner';
  import { stateQuery } from 'dexie-svelte-query';
  import { PersistedState } from 'runed';
  import { toast } from 'svelte-sonner';

  import BookmarkSection from './BookmarkSection.svelte';

  interface BookmarksSheetProps {
    open: boolean;
    readonly loadedNovelDocuments: LoadedNovelDocument[];
    readonly onClickLocationButton: (bookmark: Bookmark) => void;
    readonly onClickAddToSelectedTextsButton: (bookmark: Bookmark) => void;
  }

  let {
    open = $bindable(),
    loadedNovelDocuments,
    onClickLocationButton,
    onClickAddToSelectedTextsButton,
  }: BookmarksSheetProps = $props();

  const bookmarksQuery = stateQuery(getBookmarks);
  const bookmarkFoldersQuery = stateQuery(getBookmarkFolders);
  const bookmarks = $derived(bookmarksQuery.current ?? []);
  const bookmarkFolders = $derived(bookmarkFoldersQuery.current ?? []);
  const uncategorizedBookmarks = $derived(bookmarks.filter(({ folderId }) => folderId === null));
  const bookmarkFolderItems = $derived([
    { value: '', label: m.bookmark_folder_uncategorized() },
    ...bookmarkFolders.map(({ id, name }) => ({ value: id, label: name })),
  ]);
  const collapsedSections = new PersistedState<Record<string, boolean>>('bookmark-section-collapsed', {});

  let newFolderName = $state('');
  let deleteTarget = $state<
    { type: 'bookmark'; bookmark: Bookmark; }
    | { type: 'folder'; folder: BookmarkFolder; }
  >();
  let deleteDialogOpen = $state(false);
  let isDeleting = $state(false);

  const getFolderBookmarks = (folderId: string) => bookmarks.filter((bookmark) => bookmark.folderId === folderId);
  const toggleCollapsedSection = (sectionId: string) => {
    collapsedSections.current[sectionId] = !collapsedSections.current[sectionId];
  };

  const handleCreateFolder = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await addBookmarkFolder(newFolderName);
      newFolderName = '';
    } catch {
      toast.error(m.bookmark_folder_create_failed());
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteBookmarkFolder(folderId);
    } catch {
      toast.error(m.bookmark_folder_delete_failed());
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      await deleteBookmark(bookmarkId);
    } catch {
      toast.error(m.bookmark_delete_failed());
    }
  };

  const handleRequestDeleteBookmark = (bookmark: Bookmark) => {
    deleteTarget = { type: 'bookmark', bookmark };
    deleteDialogOpen = true;
  };

  const handleRequestDeleteFolder = (folder: BookmarkFolder) => {
    deleteTarget = { type: 'folder', folder };
    deleteDialogOpen = true;
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    isDeleting = true;
    try {
      if (deleteTarget.type === 'bookmark') {
        await handleDeleteBookmark(deleteTarget.bookmark.id);
      } else {
        await handleDeleteFolder(deleteTarget.folder.id);
      }
      deleteDialogOpen = false;
    } finally {
      isDeleting = false;
    }
  };

  const handleSetBookmarkFolder = async (bookmarkId: string, folderId: string | null) => {
    try {
      await setBookmarkFolder(bookmarkId, folderId);
    } catch {
      toast.error(m.bookmark_folder_change_failed());
    }
  };

  const handleRestoreLocation = (bookmark: Bookmark) => {
    onClickLocationButton(bookmark);
    open = false;
  };

  const handleAddToSelectedTexts = (bookmark: Bookmark) => {
    try {
      onClickAddToSelectedTextsButton(bookmark);
      toast.success(m.tts_added());
    } catch {
      toast.error(m.tts_add_failed());
    }
  };
</script>

<Sheet.Root bind:open>
  <Sheet.Content
    side='right'
    class='
      w-full
      sm:max-w-xl
    '>
    <Sheet.Header>
      <Sheet.Title>{m.bookmark_title()}</Sheet.Title>
    </Sheet.Header>
    <div class='min-h-0 flex-1 overflow-y-auto px-4 pb-4'>
      {#if bookmarksQuery.isLoading || bookmarkFoldersQuery.isLoading}
        <div class='flex h-full items-center justify-center'>
          <Spinner/>
        </div>
      {:else}
        <div class='flex flex-col gap-2'>
          <BookmarkSection
            title={m.bookmark_folder_uncategorized()}
            isCollapsed={collapsedSections.current.uncategorized ?? false}
            bookmarks={uncategorizedBookmarks}
            {bookmarkFolderItems}
            {loadedNovelDocuments}
            onDeleteBookmark={handleRequestDeleteBookmark}
            onToggleCollapsed={() => toggleCollapsedSection('uncategorized')}
            onSetBookmarkFolder={handleSetBookmarkFolder}
            onRestoreLocation={handleRestoreLocation}
            onAddToSelectedTexts={handleAddToSelectedTexts}/>
          {#each bookmarkFolders as folder (folder.id)}
            {@const folderBookmarks = getFolderBookmarks(folder.id)}
            <BookmarkSection
              title={folder.name}
              isCollapsed={collapsedSections.current[folder.id] ?? false}
              bookmarks={folderBookmarks}
              {bookmarkFolderItems}
              {loadedNovelDocuments}
              onDeleteFolder={() => handleRequestDeleteFolder(folder)}
              onDeleteBookmark={handleRequestDeleteBookmark}
              onToggleCollapsed={() => toggleCollapsedSection(folder.id)}
              onSetBookmarkFolder={handleSetBookmarkFolder}
              onRestoreLocation={handleRestoreLocation}
              onAddToSelectedTexts={handleAddToSelectedTexts}/>
          {/each}
        </div>
        <form class='mt-4 flex gap-2' onsubmit={handleCreateFolder}>
          <Input bind:value={newFolderName} aria-label={m.bookmark_new_folder_name()} placeholder={m.bookmark_new_folder_name()}/>
          <Button
            type='submit'
            size='icon'
            variant='outline'
            disabled={!newFolderName.trim()}
            aria-label={m.bookmark_create_folder()}>
            <IconFolderPlus/>
          </Button>
        </form>
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>

<AlertDialog.Root
  bind:open={deleteDialogOpen}
  onOpenChangeComplete={(isOpen) => {
    if (!isOpen) deleteTarget = undefined;
  }}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{deleteTarget?.type === 'folder' ? m.bookmark_delete_confirm_folder_title() : m.bookmark_delete_confirm_bookmark_title()}</AlertDialog.Title>
      <AlertDialog.Description>
        {#if deleteTarget?.type === 'folder'}
          {m.bookmark_delete_confirm_folder_description({ name: deleteTarget.folder.name })}
        {:else if deleteTarget?.type === 'bookmark'}
          {m.bookmark_delete_confirm_bookmark_description()}
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={isDeleting}>{m.common_cancel()}</AlertDialog.Cancel>
      <AlertDialog.Action
        variant='destructive'
        disabled={isDeleting}
        onclick={handleConfirmDelete}>
        {m.common_delete()}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
