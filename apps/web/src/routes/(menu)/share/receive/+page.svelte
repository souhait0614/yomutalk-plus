<script lang='ts'>
  import type { SharedNovel } from '$lib/sharedNovels';
  import { IconCamera, IconFileImport } from '@tabler/icons-svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import QrCodeScanner from '$lib/components/QrCodeScanner.svelte';
  import { novelShareFileExtension } from '$lib/constants';
  import { addLoadedNovelDocumentFromFile, getLoadedNovelDocuments } from '$lib/db';
  import Button from '$lib/shadcn-svelte/components/ui/button/button.svelte';
  import { Checkbox } from '$lib/shadcn-svelte/components/ui/checkbox';
  import * as Dialog from '$lib/shadcn-svelte/components/ui/dialog';
  import * as Field from '$lib/shadcn-svelte/components/ui/field';
  import { Spinner } from '$lib/shadcn-svelte/components/ui/spinner';
  import {
    decodeSharedNovels,
    downloadSharedNovels,
    fileTypeLabels,
    formatByteSize,
    parseSharedNovelsQrText,
    writingModeLabels,
  } from '$lib/sharedNovels';
  import { computeContentHash } from '$lib/utils/hash';
  import { FileNotSelectedError, getErrorMessage, pickSingleFile } from '$lib/utils/misc';
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

  const fileName = (novel: SharedNovel): string => (
    // プレーンテキストはファイル名がそのまま小説のタイトルになるため、タイトルを保つ
    novel.fileType === 'plaintext' ? novel.title : `${novel.title}.txt`
  );

  const setEntries = async (sharedNovels: SharedNovel[]) => {
    if (sharedNovels.length === 0) throw new Error('受け取った小説がありません');
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
      loadErrorMessage = getErrorMessage(error, '共有された小説を取得できませんでした');
      status = 'selecting';
      console.error('Failed to download shared novels:', error);
    }
  };

  const handleReadQrCode = (text: string): boolean => {
    const sharedNovelsId = parseSharedNovelsQrText(text);
    if (sharedNovelsId === null) {
      scannerErrorMessage = 'このQRコードは小説の共有用ではありません。小説を送る側のQRコードを読み取ってください。';
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
    cameraErrorMessage = 'カメラを起動できませんでした。カメラの使用を許可しているか確認してください。';
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
      loadErrorMessage = getErrorMessage(error, '共有ファイルを読み込めませんでした');
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
      toast.success(`${selectedEntries.length}件の小説を追加しました`);
      await goto(resolve('/'));
    } catch (error) {
      toast.error('共有された小説を追加できませんでした');
      console.error('Failed to add shared novels:', error);
    } finally {
      isAdding = false;
    }
  };
</script>

{#if status === 'ready'}
  <div class='flex flex-col gap-4'>
    <Field.Set>
      <Field.Legend>追加する小説を選択</Field.Legend>
      <Field.Description>
        受け取った小説です。追加するとこの端末の小説一覧に保存されます。
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
                  {#if entry.isAdded}（追加済み）{/if}
                </Field.Title>
                <Field.Description>
                  {fileTypeLabels[entry.novel.fileType]}
                  ／{writingModeLabels[entry.novel.writingMode]}
                  ／{formatByteSize(entry.novel.data.byteLength)}
                  {#if entry.novel.isEditLocked}／編集ロック{/if}
                </Field.Description>
              </Field.Content>
            </Field.Field>
          </Field.Label>
        {/each}
      </Field.Group>
    </Field.Set>
    <div class='flex justify-between gap-2'>
      <Button
        variant='outline'
        disabled={isAdding}
        onclick={() => {
          entries = [];
          status = 'selecting';
        }}>
        別の小説を受け取る
      </Button>
      <Button
        disabled={selectedCount === 0 || isAdding}
        size='lg'
        onclick={() => void handleClickAddButton()}>
        {#if isAdding}
          <Spinner/> 追加中…
        {:else}
          追加
        {/if}
      </Button>
    </div>
  </div>
{:else}
  <div class='flex flex-col gap-4'>
    <p class='text-sm text-muted-foreground'>
      小説を送った人のQRコードを読み取るか、受け取った小説ファイルを選択してください。
    </p>
    {#if cameraErrorMessage}
      <p class='text-sm text-destructive'>{cameraErrorMessage}</p>
    {/if}
    {#if loadErrorMessage}
      <p class='text-sm text-destructive'>{loadErrorMessage}</p>
    {/if}
    <div class='flex flex-col gap-2'>
      <Button disabled={status === 'loading'} size='lg' onclick={handleOpenScanner}>
        <IconCamera/> QRコードを読み取る
      </Button>
      <Button variant='outline' disabled={status === 'loading'} onclick={() => void handleClickSelectFileButton()}>
        {#if status === 'loading'}
          <Spinner/> 読み込み中…
        {:else}
          <IconFileImport/> 小説ファイルを選択
        {/if}
      </Button>
    </div>
    <p class='text-sm text-muted-foreground'>
      QRコードでの受け取りは、小説を送ってから1日以内に読み取ってください。
      小説ファイルは保存した場所からいつでも選択できます。
    </p>
  </div>
{/if}

<Dialog.Root bind:open={isScannerDialogOpen}>
  <Dialog.Content class='max-h-[calc(100dvh-(--spacing(8)))] overflow-y-auto'>
    <Dialog.Header>
      <Dialog.Title>QRコードを読み取る</Dialog.Title>
      <Dialog.Description>
        小説を送った人のQRコードを、枠の中に写してください。
      </Dialog.Description>
    </Dialog.Header>
    <QrCodeScanner onReadQrCode={handleReadQrCode} onError={handleScannerError}/>
    {#if scannerErrorMessage}
      <p class='text-sm text-destructive'>{scannerErrorMessage}</p>
    {/if}
  </Dialog.Content>
</Dialog.Root>
