<script lang='ts'>
  import type { SharedNovel } from '$lib/sharedNovels';
  import { IconCamera, IconFileImport } from '@tabler/icons-svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import QrCodeScanner from '$lib/components/QrCodeScanner.svelte';
  import { novelShareFileExtension } from '$lib/constants';
  import { addLoadedNovelDocumentFromFile, getLoadedNovelDocuments } from '$lib/db';
  import { m } from '$lib/paraglide/messages';
  import Button from '$lib/shadcn-svelte/components/ui/button/button.svelte';
  import { Checkbox } from '$lib/shadcn-svelte/components/ui/checkbox';
  import * as Dialog from '$lib/shadcn-svelte/components/ui/dialog';
  import * as Field from '$lib/shadcn-svelte/components/ui/field';
  import { Spinner } from '$lib/shadcn-svelte/components/ui/spinner';
  import {
    decodeSharedNovels,
    downloadSharedNovels,
    parseSharedNovelsQrText,
  } from '$lib/sharedNovels';
  import { computeContentHash } from '$lib/utils/hash';
  import { FileNotSelectedError, getErrorMessage, pickSingleFile } from '$lib/utils/misc';
  import { getNovelFileName } from '$lib/utils/novelFile';
  import { toast } from 'svelte-sonner';
  import { SvelteMap } from 'svelte/reactivity';

  interface SharedNovelEntry {
    readonly novel: SharedNovel;
    readonly isAdded: boolean;
  }

  type Status = 'selecting' | 'loading' | 'ready';

  let status = $state<Status>('selecting');
  let entries = $state<SharedNovelEntry[]>([]);
  let isAdding = $state(false);
  let isScannerDialogOpen = $state(false);
  let scannerErrorMessage = $state('');
  let cameraErrorMessage = $state('');
  let loadErrorMessage = $state('');

  const selectedIndexes = new SvelteMap<number, boolean>();
  const selectedCount = $derived([...selectedIndexes.values()].filter((selected) => selected).length);

  const fileName = (novel: SharedNovel): string => getNovelFileName(novel.fileType, novel.title);

  const setEntries = async (sharedNovels: SharedNovel[]) => {
    if (sharedNovels.length === 0) throw new Error(m.share_no_novel_received());
    const loadedNovelDocuments = await getLoadedNovelDocuments();
    // ファイルのバイト列と書き込み方向が一致する小説は追加済みとみなす
    const addedDocumentKeys = new Set(
      loadedNovelDocuments.map(({ hash, writingMode }) => `${hash}:${writingMode}`),
    );
    const loadedEntries = await Promise.all(sharedNovels.map(async (novel): Promise<SharedNovelEntry> => {
      const hash = await computeContentHash(novel.data.buffer);
      return {
        novel,
        isAdded: addedDocumentKeys.has(`${hash}:${novel.writingMode}`),
      };
    }));

    entries = loadedEntries;
    selectedIndexes.clear();
    for (const [index, entry] of loadedEntries.entries()) {
      selectedIndexes.set(index, !entry.isAdded);
    }
    status = 'ready';
  };

  const loadFromSharedNovelsId = async (sharedNovelsId: string) => {
    status = 'loading';
    loadErrorMessage = '';
    try {
      await setEntries(await downloadSharedNovels(sharedNovelsId));
    } catch (error) {
      loadErrorMessage = getErrorMessage(error, m.share_fetch_failed());
      status = 'selecting';
      console.error('Failed to download shared novels:', error);
    }
  };

  const handleReadQrCode = (text: string): boolean => {
    const sharedNovelsId = parseSharedNovelsQrText(text);
    if (sharedNovelsId === null) {
      scannerErrorMessage = m.share_qr_invalid();
      return false;
    }

    isScannerDialogOpen = false;
    scannerErrorMessage = '';
    void loadFromSharedNovelsId(sharedNovelsId);
    return true;
  };

  const handleOpenScanner = () => {
    scannerErrorMessage = '';
    cameraErrorMessage = '';
    isScannerDialogOpen = true;
  };

  const handleScannerError = (error: unknown) => {
    isScannerDialogOpen = false;
    cameraErrorMessage = m.share_camera_failed();
    console.error('Failed to start the camera:', error);
  };

  const handleClickSelectFileButton = async () => {
    if (status === 'loading') return;
    try {
      const file = await pickSingleFile({ accept: `.${novelShareFileExtension}` });
      status = 'loading';
      loadErrorMessage = '';
      await setEntries(await decodeSharedNovels(file));
    } catch (error) {
      if (error instanceof FileNotSelectedError) {
        status = entries.length > 0 ? 'ready' : 'selecting';
        return;
      }
      loadErrorMessage = getErrorMessage(error, m.share_load_failed());
      status = 'selecting';
      console.error('Failed to read the shared novels file:', error);
    }
  };

  const handleClickAddButton = async () => {
    if (isAdding) return;
    const selectedEntries = entries.filter((_, index) => selectedIndexes.get(index) === true);
    if (selectedEntries.length === 0) return;

    isAdding = true;
    try {
      for (const { novel } of selectedEntries) {
        const file = new File([novel.data], fileName(novel), { type: 'text/plain' });
        await addLoadedNovelDocumentFromFile(novel.fileType, file, novel.writingMode, novel.isEditLocked);
      }
      toast.success(m.share_added_count({ count: selectedEntries.length }));
      await goto(resolve('/'));
    } catch (error) {
      toast.error(m.share_add_failed());
      console.error('Failed to add shared novels:', error);
    } finally {
      isAdding = false;
    }
  };
</script>

{#if status === 'ready'}
  <div class='flex min-h-full flex-col gap-4'>
    <Field.Set class='grow'>
      <Field.Legend>{m.share_receive_select()}</Field.Legend>
      <Field.Description>
        {m.share_receive_description()}
      </Field.Description>
      <Field.Group class='gap-4'>
        {#each entries as entry, index (index)}
          <Field.Label>
            <Field.Field orientation='horizontal'>
              <Checkbox
                disabled={entry.isAdded}
                bind:checked={() => selectedIndexes.get(index) ?? false,
                (value) => selectedIndexes.set(index, value)}/>
              <Field.Content>
                <Field.Title>
                  {entry.novel.title}
                  {#if entry.isAdded}{m.common_already_added()}{/if}
                </Field.Title>
              </Field.Content>
            </Field.Field>
          </Field.Label>
        {/each}
      </Field.Group>
    </Field.Set>
    <div class='sticky bottom-4 flex flex-col gap-2'>
      <Button
        variant='outline'
        disabled={isAdding}
        onclick={() => {
          entries = [];
          status = 'selecting';
        }}>
        {m.share_receive_another()}
      </Button>
      <Button
        disabled={selectedCount === 0 || isAdding}
        size='lg'
        onclick={() => void handleClickAddButton()}>
        {#if isAdding}
          <Spinner/> {m.share_adding()}
        {:else}
          {m.share_add()}
        {/if}
      </Button>
    </div>
  </div>
{:else}
  <div class='flex flex-col gap-4'>
    <p class='text-sm text-muted-foreground'>
      {m.share_receive_hint()}
    </p>
    {#if cameraErrorMessage}
      <p class='text-sm text-destructive'>{cameraErrorMessage}</p>
    {/if}
    {#if loadErrorMessage}
      <p class='text-sm text-destructive'>{loadErrorMessage}</p>
    {/if}
    <div class='flex flex-col gap-2'>
      <Button disabled={status === 'loading'} size='lg' onclick={handleOpenScanner}>
        <IconCamera/> {m.share_scan_qr()}
      </Button>
      <Button variant='outline' disabled={status === 'loading'} onclick={() => void handleClickSelectFileButton()}>
        {#if status === 'loading'}
          <Spinner/> {m.common_loading()}
        {:else}
          <IconFileImport/> {m.share_select_file()}
        {/if}
      </Button>
    </div>
    <p class='text-sm text-muted-foreground'>
      {m.share_qr_note()} {m.share_file_note()}
    </p>
  </div>
{/if}

<Dialog.Root bind:open={isScannerDialogOpen}>
  <Dialog.Content class='max-h-[calc(100dvh-(--spacing(8)))] overflow-y-auto'>
    <Dialog.Header>
      <Dialog.Title>{m.share_scan_qr()}</Dialog.Title>
      <Dialog.Description>
        {m.share_scan_qr_description()}
      </Dialog.Description>
    </Dialog.Header>
    <QrCodeScanner onReadQrCode={handleReadQrCode} onError={handleScannerError}/>
    {#if scannerErrorMessage}
      <p class='text-sm text-destructive'>{scannerErrorMessage}</p>
    {/if}
  </Dialog.Content>
</Dialog.Root>
