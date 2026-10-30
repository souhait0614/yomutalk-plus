<script lang='ts'>
  import { IconShare } from '@tabler/icons-svelte';
  import { getLoadedNovelDocuments } from '$lib/db';
  import { m } from '$lib/paraglide/messages';
  import Button from '$lib/shadcn-svelte/components/ui/button/button.svelte';
  import { Checkbox } from '$lib/shadcn-svelte/components/ui/checkbox';
  import * as Field from '$lib/shadcn-svelte/components/ui/field';
  import { stateQuery } from 'dexie-svelte-query';
  import { SvelteMap } from 'svelte/reactivity';

  import SelectShareMethodDialog from './_components/SelectShareMethodDialog.svelte';
  import ShareNovelFileDialog from './_components/ShareNovelFileDialog.svelte';
  import ShareNovelQrDialog from './_components/ShareNovelQrDialog.svelte';

  const loadedNovelDocumentsQuery = stateQuery(getLoadedNovelDocuments);
  const filteredLoadedNovelDocuments = $derived(
    loadedNovelDocumentsQuery.current?.filter(
      ({ type }) => type !== 'internal',
    ) ?? [],
  );

  const selectedIds = new SvelteMap<string, boolean>();
  const selectedCount = $derived([...selectedIds.values()].filter((selected) => selected).length);
  const selectedDocuments = $derived(
    filteredLoadedNovelDocuments.filter(({ id }) => selectedIds.get(id) === true),
  );
  const selectedShareKey = $derived(selectedDocuments.map(({ id }) => id).sort().join());

  // 一度アップロードした組み合わせは、同じ共有 ID で QR コードを表示できる
  const uploadedSharedNovelsIds = new SvelteMap<string, string>();

  let selectMethodDialogOpen = $state(false);
  let qrDialogOpen = $state(false);
  let fileDialogOpen = $state(false);

  const handleClickShareButton = () => {
    if (selectedDocuments.length === 0) return;
    selectMethodDialogOpen = true;
  };

  const handleSelectShareMethod = (method: 'qr' | 'file') => {
    selectMethodDialogOpen = false;
    qrDialogOpen = method === 'qr';
    fileDialogOpen = method === 'file';
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
      disabled={selectedCount === 0}
      size='lg'
      onclick={handleClickShareButton}>
      <IconShare/> {m.share_send_action()}
    </Button>
  </div>
</div>

<SelectShareMethodDialog
  bind:open={selectMethodDialogOpen}
  onSelectMethod={handleSelectShareMethod}/>
<ShareNovelQrDialog
  bind:open={qrDialogOpen}
  documents={selectedDocuments}
  uploadedSharedNovelsId={uploadedSharedNovelsIds.get(selectedShareKey)}
  onUploadSharedNovels={(id) => uploadedSharedNovelsIds.set(selectedShareKey, id)}
  onSelectFile={() => handleSelectShareMethod('file')}/>
<ShareNovelFileDialog bind:open={fileDialogOpen} documents={selectedDocuments}/>
