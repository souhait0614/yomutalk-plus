<script lang='ts'>
  import type { LoadedNovelDocument } from '$lib/db';
  import { IconChevronDown, IconChevronUp, IconEye, IconPlus, IconTrash } from '@tabler/icons-svelte';
  import { getAddLoadedNovelDocumentDialogContext } from '$lib/contexts/addLoadedNovelDocumentDialog';
  import { getInternalNovelUpdateContext } from '$lib/contexts/internalNovelUpdate';
  import * as AlertDialog from '$lib/shadcn-svelte/components/ui/alert-dialog';
  import { Button, buttonVariants } from '$lib/shadcn-svelte/components/ui/button';
  import * as ButtonGroup from '$lib/shadcn-svelte/components/ui/button-group';
  import * as Dialog from '$lib/shadcn-svelte/components/ui/dialog';
  import * as Item from '$lib/shadcn-svelte/components/ui/item';
  import { Toggle } from '$lib/shadcn-svelte/components/ui/toggle';

  interface ManageLoadedNovelDocumentsDialogProps {
    open: boolean;
    readonly loadedNovelDocuments: LoadedNovelDocument[];
    currentTabIndex: number;
    readonly onClickDeleteButton: (id: string) => Promise<void>;
    readonly onClickMoveButton: (id: string, direction: 'up' | 'down') => void;
  }

  let {
    open = $bindable(),
    loadedNovelDocuments,
    currentTabIndex = $bindable(),
    onClickDeleteButton,
    onClickMoveButton,
  }: ManageLoadedNovelDocumentsDialogProps = $props();

  const addLoadedNovelDocumentDialog = getAddLoadedNovelDocumentDialogContext();
  const internalNovelUpdate = getInternalNovelUpdateContext();

  let deleteTarget = $state<LoadedNovelDocument>();
  let deleteDialogOpen = $state(false);
  let isDeleting = $state(false);

  const handleClickConfirmDeleteButton = async () => {
    if (!deleteTarget || isDeleting) return;
    isDeleting = true;
    try {
      await onClickDeleteButton(deleteTarget.id);
      deleteDialogOpen = false;
    } finally {
      isDeleting = false;
    }
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Content
    class='
      flex max-h-[calc(100dvh-(--spacing(8)))] flex-col
      sm:max-w-2xl
    '>
    <Dialog.Header>
      <Dialog.Title>小説管理・設定</Dialog.Title>
    </Dialog.Header>
    <div class='flex grow flex-col overflow-y-auto rounded-2xl border'>
      {#if loadedNovelDocuments.length > 0}
        <ol class='flex flex-col gap-2 p-2'>
          {#each loadedNovelDocuments as loadedNovelDocument, index (loadedNovelDocument.id)}
            <Item.Root variant='muted' size='xs'>
              {#snippet child({ props })}
                <li {...props}>
                  <Item.Actions>
                    <ButtonGroup.Root orientation='vertical'>
                      <Button
                        size='icon-xs'
                        variant='outline'
                        aria-label='上へ移動'
                        disabled={index === 0}
                        onclick={() => onClickMoveButton(loadedNovelDocument.id, 'up')}>
                        <IconChevronUp/>
                      </Button>
                      <Button
                        size='icon-xs'
                        variant='outline'
                        aria-label='下へ移動'
                        disabled={index === loadedNovelDocuments.length - 1}
                        onclick={() => onClickMoveButton(loadedNovelDocument.id, 'down')}>
                        <IconChevronDown/>
                      </Button>
                    </ButtonGroup.Root>
                  </Item.Actions>
                  <Item.Content>
                    <Item.Title>{loadedNovelDocument.title}</Item.Title>
                    {#if loadedNovelDocument.type === 'internal'}
                      <Item.Description>アプリ内蔵小説</Item.Description>
                    {:else if loadedNovelDocument.fileType === 'aozoratext'}
                      <Item.Description>青空文庫形式テキストファイル</Item.Description>
                    {:else if loadedNovelDocument.fileType === 'plaintext'}
                      <Item.Description>プレーンテキストファイル</Item.Description>
                    {/if}
                  </Item.Content>
                  <Item.Actions>
                    {#if internalNovelUpdate.updatedDocumentIds.has(loadedNovelDocument.id)}
                      <Button
                        size='sm'
                        disabled={internalNovelUpdate.updatingDocumentIds.has(loadedNovelDocument.id)}
                        onclick={() => void internalNovelUpdate.updateDocument(loadedNovelDocument.id)}>
                        小説を更新する
                      </Button>
                    {/if}
                    <Toggle
                      variant='outline'
                      aria-label='表示'
                      bind:pressed={() => currentTabIndex === index,
                      () => {
                        currentTabIndex = index;
                      }}
                      class='
                        {buttonVariants({ size: 'icon-sm', variant: 'outline' })}
                        data-[state=on]:*:[svg]:stroke-primary
                      '
                      onPressedChange={() => {
                        open = false;
                      }}>
                      <IconEye/>
                    </Toggle>
                    <Button
                      size='icon'
                      variant='destructive'
                      aria-label='削除'
                      onclick={() => {
                        deleteTarget = loadedNovelDocument;
                        deleteDialogOpen = true;
                      }}>
                      <IconTrash/>
                    </Button>
                  </Item.Actions>
                </li>
              {/snippet}
            </Item.Root>
          {/each}
        </ol>
      {:else}
        <p class='px-4 py-8 text-center text-muted-foreground'>読み込まれた小説はありません。</p>
      {/if}
      <div class='sticky bottom-0 flex w-full justify-end bg-muted p-2'>
        <Button variant='outline' onclick={() => addLoadedNovelDocumentDialog.open()}>
          <IconPlus/> 小説を追加
        </Button>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root
  bind:open={deleteDialogOpen}
  onOpenChangeComplete={(open) => {
    if (!open) deleteTarget = undefined;
  }}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>小説を削除しますか？</AlertDialog.Title>
      <AlertDialog.Description>
        「{deleteTarget?.title}」を削除します。この操作は取り消せません。
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={isDeleting}>キャンセル</AlertDialog.Cancel>
      <AlertDialog.Action
        variant='destructive'
        disabled={isDeleting}
        onclick={handleClickConfirmDeleteButton}>
        <IconTrash/> 削除
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
