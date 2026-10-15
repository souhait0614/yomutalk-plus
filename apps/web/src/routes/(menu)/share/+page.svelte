<script lang='ts'>
  import { IconShare } from '@tabler/icons-svelte';
  import { getLoadedNovelDocuments } from '$lib/db';
  import Button from '$lib/shadcn-svelte/components/ui/button/button.svelte';
  import { Checkbox } from '$lib/shadcn-svelte/components/ui/checkbox';
  import * as Field from '$lib/shadcn-svelte/components/ui/field';
  import { Spinner } from '$lib/shadcn-svelte/components/ui/spinner';
  import { createSharedNovelsImportUrl, uploadSharedNovels } from '$lib/sharedNovels';
  import { stateQuery } from 'dexie-svelte-query';
  import { toast } from 'svelte-sonner';
  import { SvelteMap } from 'svelte/reactivity';

  import ShareUrlDialog from './_components/ShareUrlDialog.svelte';

  const loadedNovelDocumentsQuery = stateQuery(getLoadedNovelDocuments);
  const filteredLoadedNovelDocuments = $derived(
    loadedNovelDocumentsQuery.current?.filter(
      ({ type }) => type !== 'internal',
    ) ?? [],
  );

  const selectedIds = new SvelteMap<string, boolean>();
  const selectedCount = $derived([...selectedIds.values()].filter((selected) => selected).length);

  let isUploading = $state(false);
  let shareUrlDialogOpen = $state(false);
  let shareUrl = $state('');

  const handleClickShareButton = async () => {
    if (isUploading) return;
    const documents = filteredLoadedNovelDocuments.filter(({ id }) => selectedIds.get(id) === true);
    if (documents.length === 0) return;

    isUploading = true;
    try {
      const id = await uploadSharedNovels(documents);
      shareUrl = createSharedNovelsImportUrl(id);
      shareUrlDialogOpen = true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '共有URLを作成できませんでした');
      console.error('Failed to upload shared novels:', error);
    } finally {
      isUploading = false;
    }
  };
</script>

<div class='flex flex-col gap-4'>
  <Field.Set>
    <Field.Legend>共有する小説を選択</Field.Legend>
    <Field.Description>
      共有する小説を1つ以上選択してください
    </Field.Description>
    <Field.Group class='gap-4'>
      {#each filteredLoadedNovelDocuments as loadedNovelDocument (loadedNovelDocument.id)}
        <Field.Label>
          <Field.Field orientation='horizontal'>
            <Checkbox
              bind:checked={() => selectedIds.get(loadedNovelDocument.id) ?? false,
              (value) => selectedIds.set(loadedNovelDocument.id, value)}/>
            <Field.Content>
              <Field.Title>{loadedNovelDocument.title}</Field.Title>
            </Field.Content>
          </Field.Field>
        </Field.Label>
      {:else}
        <p class='text-sm text-muted-foreground'>共有できる小説がありません。</p>
      {/each}
    </Field.Group>
  </Field.Set>
  <div class='flex justify-end'>
    <Button
      disabled={selectedCount === 0 || isUploading}
      size='lg'
      onclick={() => void handleClickShareButton()}>
      {#if isUploading}
        <Spinner/> 共有URLを作成中…
      {:else}
        <IconShare/> 共有
      {/if}
    </Button>
  </div>
</div>

<ShareUrlDialog bind:open={shareUrlDialogOpen} url={shareUrl}/>
