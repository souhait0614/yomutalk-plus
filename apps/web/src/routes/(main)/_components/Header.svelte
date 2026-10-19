<script lang='ts'>
  import type { LoadedNovelDocument } from '$lib/db';
  import { IconMenu2, IconPlus } from '@tabler/icons-svelte';
  import { getAddLoadedNovelDocumentDialogContext } from '$lib/contexts/addLoadedNovelDocumentDialog';
  import { getInternalNovelUpdateContext } from '$lib/contexts/internalNovelUpdate';
  import { getManageLoadedNovelDocumentsDialogContext } from '$lib/contexts/manageLoadedNovelDocumentsDialog';
  import { m } from '$lib/paraglide/messages';
  import { pwaUpdate } from '$lib/pwaUpdate.svelte';
  import { Button } from '$lib/shadcn-svelte/components/ui/button';
  import * as NativeSelect from '$lib/shadcn-svelte/components/ui/native-select';
  import * as Tabs from '$lib/shadcn-svelte/components/ui/tabs';
  import * as Tooltip from '$lib/shadcn-svelte/components/ui/tooltip';
  import { twSlideToTop } from '$lib/transitions';

  import HeaderSheet from './HeaderSheet.svelte';
  interface HeaderProps {
    readonly loadedNovelDocuments: LoadedNovelDocument[];
    currentTabIndex: number;
    readonly collapsed: boolean;
    readonly narrowViewport: boolean;
  }

  let {
    loadedNovelDocuments,
    currentTabIndex = $bindable(),
    collapsed,
    narrowViewport,
  }: HeaderProps = $props();

  const addLoadedNovelDocumentDialog = getAddLoadedNovelDocumentDialogContext();
  const internalNovelUpdate = getInternalNovelUpdateContext();
  const manageLoadedNovelDocumentsDialog = getManageLoadedNovelDocumentsDialogContext();
  let isOpenHeaderSheet = $state(false);
</script>

<div
  class='
    pointer-events-none flex w-full flex-col
    *:pointer-events-auto
  '>
  {#if !collapsed}
    <header
      class='
        flex items-center gap-2 bg-muted/60 px-4 pt-(--safe-area-inset-top)
      '
      transition:twSlideToTop>
      <div class='flex items-center gap-2 py-4'>
        <Button
          variant='outline'
          size='icon-lg'
          aria-label={m.header_open_menu()}
          onclick={() => (isOpenHeaderSheet = true)}>
          <IconMenu2/>
        </Button>
      </div>
      <div class='flex grow items-center gap-2 overflow-x-auto py-4'>
        {#if loadedNovelDocuments.length}
          {#if narrowViewport}
            <NativeSelect.Root
              class='min-w-0 flex-1'
              aria-label={m.header_switch_novel()}
              bind:value={() => currentTabIndex.toString(),
                (v) => (currentTabIndex = parseInt(v))}>
              {#each loadedNovelDocuments as loadedNovelDocument, index (loadedNovelDocument.id)}
                <NativeSelect.Option value={index.toString()}>
                  {loadedNovelDocument.title}
                </NativeSelect.Option>
              {/each}
            </NativeSelect.Root>
          {:else}
            <Tabs.Root
              bind:value={() => currentTabIndex.toString(),
                (v) => (currentTabIndex = parseInt(v))}>
              <Tabs.List>
                {#each loadedNovelDocuments as loadedNovelDocument, index (loadedNovelDocument.id)}
                  <Tabs.Trigger value={index.toString()}>
                    {loadedNovelDocument.title}
                  </Tabs.Trigger>
                {/each}
              </Tabs.List>
            </Tabs.Root>
          {/if}
        {/if}
        {#if loadedNovelDocuments.length}
          <Tooltip.Root>
            <Tooltip.Trigger>
              {#snippet child({ props })}
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={m.nav_add_novel()}
                  {...props}
                  onclick={() => addLoadedNovelDocumentDialog.open()}>
                  <IconPlus/>
                </Button>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>{m.nav_add_novel()}</p>
            </Tooltip.Content>
          </Tooltip.Root>
        {:else}
          <Button
            variant='default'
            size='sm'
            onclick={() => addLoadedNovelDocumentDialog.open()}>
            <IconPlus/> {m.nav_add_novel()}
          </Button>
        {/if}
      </div>
      {#if internalNovelUpdate.updatedDocumentIds.size > 0 && !pwaUpdate.updateAvailable}
        <div class='flex items-center gap-2 py-4'>
          <Button
            variant='default'
            onclick={() => manageLoadedNovelDocumentsDialog.open()}>
            {m.novel_update_available()}
          </Button>
        </div>
      {/if}
      {#if pwaUpdate.updateAvailable}
        <div class='flex items-center gap-2 py-4'>
          <Button
            variant='default'
            onclick={() => pwaUpdate.applyUpdate()}>
            {m.app_update_available()}
          </Button>
        </div>
      {/if}
    </header>
  {/if}
</div>

<HeaderSheet bind:open={isOpenHeaderSheet}/>
