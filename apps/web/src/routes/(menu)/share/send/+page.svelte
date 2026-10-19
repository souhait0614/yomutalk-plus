<script lang='ts'>
  import { IconShare } from '@tabler/icons-svelte';
  import { getLoadedNovelDocuments } from '$lib/db';
  import { m } from '$lib/paraglide/messages';
  import Button from '$lib/shadcn-svelte/components/ui/button/button.svelte';
  import { Checkbox } from '$lib/shadcn-svelte/components/ui/checkbox';
  import * as Field from '$lib/shadcn-svelte/components/ui/field';
  import { Spinner } from '$lib/shadcn-svelte/components/ui/spinner';
  import { encodeSharedNovels, uploadSharedNovels } from '$lib/sharedNovels';
  import { getErrorMessage } from '$lib/utils/misc';
  import { stateQuery } from 'dexie-svelte-query';
  import { toast } from 'svelte-sonner';
  import { SvelteMap } from 'svelte/reactivity';

  import ShareNovelsDialog from './_components/ShareNovelsDialog.svelte';

  const loadedNovelDocumentsQuery = stateQuery(getLoadedNovelDocuments);
  const filteredLoadedNovelDocuments = $derived(
    loadedNovelDocumentsQuery.current?.filter(
      ({ type }) => type !== 'internal',
    ) ?? [],
  );

  const selectedIds = new SvelteMap<string, boolean>();
  const selectedCount = $derived([...selectedIds.values()].filter((selected) => selected).length);

  let isPreparing = $state(false);
  let shareDialogOpen = $state(false);
  let sharedNovelsId = $state('');
  let sharedNovelsBlob = $state.raw<Blob>();

  const handleClickShareButton = async () => {
    if (isPreparing) return;
    const documents = filteredLoadedNovelDocuments.filter(({ id }) => selectedIds.get(id) === true);
    if (documents.length === 0) return;

    isPreparing = true;
    try {
      // サーバーに預ける分と渡す分は同じ中身なので、一度だけ符号化する
      const blob = await encodeSharedNovels(documents);
      sharedNovelsId = await uploadSharedNovels(blob);
      sharedNovelsBlob = blob;
      shareDialogOpen = true;
    } catch (error) {
      toast.error(getErrorMessage(error, m.share_prepare_failed()));
      console.error('Failed to prepare shared novels:', error);
    } finally {
      isPreparing = false;
    }
  };
</script>

<div class='flex min-h-full flex-col gap-4'>
  <Field.Set class='grow'>
    <Field.Legend>{m.share_send_select()}</Field.Legend>
    <Field.Description>
      {m.share_send_select_hint()}
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
        <p class='text-sm text-muted-foreground'>{m.share_send_empty()}</p>
      {/each}
    </Field.Group>
  </Field.Set>
  <div class='sticky bottom-4 flex flex-col gap-2'>
    <Button
      disabled={selectedCount === 0 || isPreparing}
      size='lg'
      onclick={() => void handleClickShareButton()}>
      {#if isPreparing}
        <Spinner/> {m.share_preparing()}
      {:else}
        <IconShare/> {m.share_send_action()}
      {/if}
    </Button>
  </div>
</div>

<ShareNovelsDialog bind:open={shareDialogOpen} id={sharedNovelsId} blob={sharedNovelsBlob}/>
