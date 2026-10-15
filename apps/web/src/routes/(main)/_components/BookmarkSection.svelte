<script lang='ts'>
  import type { Bookmark, LoadedNovelDocument } from '$lib/db';
  import { IconChevronDown, IconChevronRight, IconMapPin, IconPlayerPlay, IconTrash } from '@tabler/icons-svelte';
  import NovelInlineContent from '$lib/components/NovelInlineContent.svelte';
  import { Button, buttonVariants } from '$lib/shadcn-svelte/components/ui/button';
  import * as Item from '$lib/shadcn-svelte/components/ui/item';
  import {
    NativeSelect,
    NativeSelectOption,
  } from '$lib/shadcn-svelte/components/ui/native-select';
  import * as Tooltip from '$lib/shadcn-svelte/components/ui/tooltip';

  interface BookmarkFolderItem {
    readonly value: string;
    readonly label: string;
  }

  interface BookmarkSectionProps {
    readonly title: string;
    readonly isCollapsed: boolean;
    readonly bookmarks: Bookmark[];
    readonly bookmarkFolderItems: BookmarkFolderItem[];
    readonly loadedNovelDocuments: LoadedNovelDocument[];
    readonly onDeleteFolder?: () => void;
    readonly onDeleteBookmark: (bookmark: Bookmark) => void;
    readonly onToggleCollapsed: () => void;
    readonly onSetBookmarkFolder: (bookmarkId: string, folderId: string | null) => void;
    readonly onRestoreLocation: (bookmark: Bookmark) => void;
    readonly onAddToSelectedTexts: (bookmark: Bookmark) => void;
  }

  let {
    title,
    isCollapsed,
    bookmarks,
    bookmarkFolderItems,
    loadedNovelDocuments,
    onDeleteFolder,
    onDeleteBookmark,
    onToggleCollapsed,
    onSetBookmarkFolder,
    onRestoreLocation,
    onAddToSelectedTexts,
  }: BookmarkSectionProps = $props();

  const getDocumentTitle = (bookmark: Bookmark) => {
    if (bookmark.documentId === null) return '文書なし';
    return loadedNovelDocuments.find(({ id }) => id === bookmark.documentId)?.title ?? '削除された文書';
  };
  const canRestoreLocation = (bookmark: Bookmark) => (
    bookmark.documentId !== null
    && loadedNovelDocuments.some(({ id }) => id === bookmark.documentId)
  );
</script>

<section class='relative'>
  <div
    class='
      sticky top-0 flex items-center justify-between gap-2 bg-background py-2
    '>
    <div class='flex items-center gap-2'>
      <Button
        size='icon-sm'
        variant='outline'
        aria-label={`${title}を${isCollapsed ? '展開' : '折りたたみ'}`}
        onclick={onToggleCollapsed}>
        {#if isCollapsed}
          <IconChevronRight/>
        {:else}
          <IconChevronDown/>
        {/if}
      </Button>
      <h3 class='text-sm font-medium'>{title}</h3>
      <span class='text-xs text-muted-foreground tabular-nums'>{bookmarks.length}</span>
    </div>
    {#if onDeleteFolder}
      <Button
        size='icon-sm'
        variant='destructive'
        aria-label={`${title}を削除`}
        onclick={onDeleteFolder}>
        <IconTrash/>
      </Button>
    {/if}
  </div>
  {#if !isCollapsed}
    {#if bookmarks.length > 0}
      <Item.Group>
        {#each bookmarks as bookmark (bookmark.id)}
          <Item.Root variant='outline' size='xs'>
            <Item.Content class='min-w-0'>
              <Item.Title class='line-clamp-3 wrap-break-word'>
                <NovelInlineContent class='min-w-0' inlines={bookmark.inlines}/>
              </Item.Title>
              <Item.Description>
                {getDocumentTitle(bookmark)}
                {#if bookmark.registrationMethod === 'manual'}
                  (手動)
                {/if}
              </Item.Description>
              <!-- eslint-disable-next-line better-tailwindcss/enforce-consistent-line-wrapping -->
              <div class='mt-2 grid grid-cols-[minmax(0,1fr)_auto] justify-between gap-2'>
                <NativeSelect
                  size='sm'
                  class='max-w-full'
                  value={bookmark.folderId ?? ''}
                  onchange={(event) => onSetBookmarkFolder(bookmark.id, event.currentTarget.value || null)}
                  aria-label='保存先フォルダ'>
                  {#each bookmarkFolderItems as folder (folder.value)}
                    <NativeSelectOption value={folder.value}>{folder.label}</NativeSelectOption>
                  {/each}
                </NativeSelect>
                <Item.Actions>
                  <Tooltip.Root>
                    <Tooltip.Trigger
                      class={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
                      aria-label='ブックマーク位置を表示'
                      disabled={!canRestoreLocation(bookmark)}
                      onclick={() => onRestoreLocation(bookmark)}>
                      <IconMapPin/>
                    </Tooltip.Trigger>
                    <Tooltip.Content><p>ブックマーク位置を表示</p></Tooltip.Content>
                  </Tooltip.Root>
                  <Tooltip.Root>
                    <Tooltip.Trigger
                      class={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
                      aria-label='読み上げに追加'
                      onclick={() => onAddToSelectedTexts(bookmark)}>
                      <IconPlayerPlay/>
                    </Tooltip.Trigger>
                    <Tooltip.Content><p>読み上げに追加</p></Tooltip.Content>
                  </Tooltip.Root>
                  <Tooltip.Root>
                    <Tooltip.Trigger
                      class={buttonVariants({ variant: 'destructive', size: 'icon-sm' })}
                      aria-label='ブックマークを削除'
                      onclick={() => onDeleteBookmark(bookmark)}>
                      <IconTrash/>
                    </Tooltip.Trigger>
                    <Tooltip.Content><p>削除</p></Tooltip.Content>
                  </Tooltip.Root>
                </Item.Actions>
              </div>
            </Item.Content>
          </Item.Root>
        {/each}
      </Item.Group>
    {:else}
      <p class='py-4 text-center text-sm text-muted-foreground'>ブックマークはありません。</p>
    {/if}
  {/if}
</section>
