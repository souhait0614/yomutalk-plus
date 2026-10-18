<script lang='ts'>
  import type { SharedNovel } from '$lib/sharedNovels';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { addLoadedNovelDocumentFromFile, getLoadedNovelDocuments } from '$lib/db';
  import Button from '$lib/shadcn-svelte/components/ui/button/button.svelte';
  import { Checkbox } from '$lib/shadcn-svelte/components/ui/checkbox';
  import * as Field from '$lib/shadcn-svelte/components/ui/field';
  import { Spinner } from '$lib/shadcn-svelte/components/ui/spinner';
  import { downloadSharedNovels, fileTypeLabels, formatByteSize, writingModeLabels } from '$lib/sharedNovels';
  import { computeContentHash } from '$lib/utils/hash';
  import { getErrorMessage } from '$lib/utils/misc';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { SvelteMap } from 'svelte/reactivity';

  interface SharedNovelEntry {
    readonly novel: SharedNovel;
    /** 追加済みかどうかを判定するために計算した、ファイルのバイト列のハッシュ。 */
    readonly isAdded: boolean;
  }

  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let errorMessage = $state('');
  let entries = $state<SharedNovelEntry[]>([]);
  let isAdding = $state(false);

  const selectedIndexes = new SvelteMap<number, boolean>();
  const selectedCount = $derived([...selectedIndexes.values()].filter((selected) => selected).length);

  const fileName = (novel: SharedNovel): string => (
    // プレーンテキストはファイル名がそのまま小説のタイトルになるため、タイトルを保つ
    novel.fileType === 'plaintext' ? novel.title : `${novel.title}.txt`
  );

  onMount(async () => {
    const sharedNovelId = page.params.id;
    if (!sharedNovelId) {
      status = 'error';
      errorMessage = '共有URLが正しくありません';
      return;
    }

    try {
      const [sharedNovels, loadedNovelDocuments] = await Promise.all([
        downloadSharedNovels(sharedNovelId),
        getLoadedNovelDocuments(),
      ]);

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
      for (const [index, entry] of loadedEntries.entries()) {
        selectedIndexes.set(index, !entry.isAdded);
      }
      status = 'ready';
    } catch (error) {
      errorMessage = getErrorMessage(error, '共有された小説を取得できませんでした');
      status = 'error';
      console.error('Failed to download shared novels:', error);
    }
  });

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

{#if status === 'loading'}
  <div class='flex items-center gap-2 text-sm text-muted-foreground'>
    <Spinner/> 共有された小説を読み込んでいます…
  </div>
{:else if status === 'error'}
  <Field.Group>
    <p class='text-sm text-destructive'>{errorMessage}</p>
    <p class='text-sm text-muted-foreground'>
      共有URLは作成から1日で無効になります。共有した人にURLを作り直してもらってください。
    </p>
    <div>
      <Button variant='outline' href={resolve('/')}>小説一覧へ戻る</Button>
    </div>
  </Field.Group>
{:else}
  <div class='flex flex-col gap-4'>
    <Field.Set>
      <Field.Legend>追加する小説を選択</Field.Legend>
      <Field.Description>
        共有された小説です。追加するとこの端末の小説一覧に保存されます。
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
    <div class='flex justify-end'>
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
{/if}
