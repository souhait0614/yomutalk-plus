<script lang='ts'>
  import type { LoadedNovelDocument, NovelWritingMode } from '$lib/db';
  import type { InternalNovelInfo } from '$lib/internalNovels';
  import { IconFilePlus } from '@tabler/icons-svelte';
  import { resolve } from '$app/paths';
  import { internalNovelList, isInternalNovelVariantGroup, toInternalNovelVariantInfo } from '$lib/internalNovels';
  import { Button, buttonVariants } from '$lib/shadcn-svelte/components/ui/button';
  import * as Dialog from '$lib/shadcn-svelte/components/ui/dialog';
  import * as DropdownMenu from '$lib/shadcn-svelte/components/ui/dropdown-menu';
  import Separator from '$lib/shadcn-svelte/components/ui/separator/separator.svelte';

  interface AddLoadedNovelDocumentDialogProps {
    open: boolean;
    readonly loadedNovelDocuments: LoadedNovelDocument[];
    readonly onClickSelectAozoraTextFileButton: (writingMode: NovelWritingMode) => Promise<void>;
    readonly onClickSelectPlainTextFileButton: (writingMode: NovelWritingMode) => Promise<void>;
    readonly onClickAddInternalNovelButton: (novel: InternalNovelInfo, writingMode: NovelWritingMode) => Promise<void>;
  }

  let {
    open = $bindable(),
    loadedNovelDocuments,
    onClickSelectAozoraTextFileButton,
    onClickSelectPlainTextFileButton,
    onClickAddInternalNovelButton,
  }: AddLoadedNovelDocumentDialogProps = $props();

  let addingInternalNovelId = $state<string>();

  //TODO: いつか横書き文書に対応する
  const writingMode: NovelWritingMode = 'vertical-rl';

  const isAddedInternalNovel = (novelId: string) => (
    loadedNovelDocuments.some((document) => document.type === 'internal' && document.novelId === novelId)
  );

  const handleClickAddInternalNovelButton = async (novel: InternalNovelInfo) => {
    addingInternalNovelId = novel.id;
    try {
      await onClickAddInternalNovelButton(novel, writingMode);
      open = false;
    } finally {
      addingInternalNovelId = undefined;
    }
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Content class='z-60'>
    <Dialog.Header>
      <Dialog.Title>小説を追加</Dialog.Title>
    </Dialog.Header>
    <div class='flex flex-col gap-4'>
      <div class='flex flex-col gap-2'>
        <h3 class='text-sm font-medium'>アプリ内蔵小説</h3>
        {#each internalNovelList as entry (entry.id)}
          {#if isInternalNovelVariantGroup(entry)}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                class={buttonVariants({ variant: 'outline' })}
                disabled={addingInternalNovelId !== undefined}>
                {entry.title}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content class='z-70'>
                {#each entry.variants as variant (variant.id)}
                  <DropdownMenu.Item
                    disabled={isAddedInternalNovel(variant.id) || addingInternalNovelId !== undefined}
                    onSelect={() => void handleClickAddInternalNovelButton(toInternalNovelVariantInfo(entry, variant))}>
                    {variant.label}
                    {#if isAddedInternalNovel(variant.id)}
                      （追加済み）
                    {/if}
                  </DropdownMenu.Item>
                {/each}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          {:else}
            <Button
              variant='outline'
              disabled={isAddedInternalNovel(entry.id) || addingInternalNovelId !== undefined}
              onclick={() => handleClickAddInternalNovelButton(entry)}>
              {entry.title}
              {#if isAddedInternalNovel(entry.id)}
                （追加済み）
              {/if}
            </Button>
          {/if}
        {:else}
          <p class='text-sm text-muted-foreground'>アプリ内蔵小説はありません。</p>
        {/each}
      </div>
      <div class='flex flex-col gap-2'>
        <h3 class='text-sm font-medium'>ファイルから追加</h3>
        <Button
          variant='outline'
          onclick={async () => {
            await onClickSelectAozoraTextFileButton(writingMode);
            open = false;
          }}>
          青空文庫形式テキストファイル
        </Button>
        <Button
          variant='outline'
          onclick={async () => {
            await onClickSelectPlainTextFileButton(writingMode);
            open = false;
          }}>
          プレーンテキストファイル
        </Button>
      </div>
      <Separator class='my-4'/>
      <Button
        variant='outline'
        href={`${resolve('/(menu)/novels')}?create`}
        onclick={() => open = false}>
        <IconFilePlus/> 新しい小説を作成
      </Button>
    </div>
  </Dialog.Content>
</Dialog.Root>
