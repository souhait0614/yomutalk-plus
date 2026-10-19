<script lang='ts'>
  import type { Bookmark, LoadedNovelDocument } from '$lib/db';
  import { IconChevronDown, IconChevronRight, IconMapPin, IconPlayerPlay, IconTrash } from '@tabler/icons-svelte';
  import NovelInlineContent from '$lib/components/NovelInlineContent.svelte';
  import { m } from '$lib/paraglide/messages';
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
    if (bookmark.documentId === null) return m.bookmark_no_document();
    return loadedNovelDocuments.find(({ id }) => id === bookmark.documentId)?.title ?? m.bookmark_deleted_document();
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
        aria-label={isCollapsed ? m.bookmark_expand_section({ title }) : m.bookmark_collapse_section({ title })}
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
        aria-label={m.bookmark_delete_section({ title })}
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
                  {m.bookmark_manual()}
                {/if}
              </Item.Description>
              <!-- eslint-disable-next-line better-tailwindcss/enforce-consistent-line-wrapping -->
              <div class='mt-2 grid grid-cols-[minmax(0,1fr)_auto] justify-between gap-2'>
                <NativeSelect
                  size='sm'
                  class='max-w-full'
                  value={bookmark.folderId ?? ''}
                  onchange={(event) => onSetBookmarkFolder(bookmark.id, event.currentTarget.value || null)}
                  aria-label={m.bookmark_target_folder()}>
                  {#each bookmarkFolderItems as folder (folder.value)}
                    <NativeSelectOption value={folder.value}>{folder.label}</NativeSelectOption>
                  {/each}
                </NativeSelect>
                <Item.Actions>
                  <Tooltip.Root>
                    <Tooltip.Trigger
                      class={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
                      aria-label={m.bookmark_show_position()}
                      disabled={!canRestoreLocation(bookmark)}
                      onclick={() => onRestoreLocation(bookmark)}>
                      <IconMapPin/>
                    </Tooltip.Trigger>
                    <Tooltip.Content><p>{m.bookmark_show_position()}</p></Tooltip.Content>
                  </Tooltip.Root>
                  <Tooltip.Root>
                    <Tooltip.Trigger
                      class={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
                      aria-label={m.tts_add()}
                      onclick={() => onAddToSelectedTexts(bookmark)}>
                      <IconPlayerPlay/>
                    </Tooltip.Trigger>
                    <Tooltip.Content><p>{m.tts_add()}</p></Tooltip.Content>
                  </Tooltip.Root>
                  <Tooltip.Root>
                    <Tooltip.Trigger
                      class={buttonVariants({ variant: 'destructive', size: 'icon-sm' })}
                      aria-label={m.bookmark_delete_section({ title: m.bookmark_title() })}
                      onclick={() => onDeleteBookmark(bookmark)}>
                      <IconTrash/>
                    </Tooltip.Trigger>
                    <Tooltip.Content><p>{m.common_delete()}</p></Tooltip.Content>
                  </Tooltip.Root>
                </Item.Actions>
              </div>
            </Item.Content>
          </Item.Root>
        {/each}
      </Item.Group>
    {:else}
      <p class='py-4 text-center text-sm text-muted-foreground'>{m.bookmark_empty()}</p>
    {/if}
  {/if}
</section>
