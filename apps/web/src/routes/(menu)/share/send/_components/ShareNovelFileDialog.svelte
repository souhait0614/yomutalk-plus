<script lang='ts'>
  import type { LoadedNovelDocument } from '$lib/db';
  import { IconDownload, IconShare } from '@tabler/icons-svelte';
  import { browser } from '$app/environment';
  import { m } from '$lib/paraglide/messages';
  import Button from '$lib/shadcn-svelte/components/ui/button/button.svelte';
  import * as Dialog from '$lib/shadcn-svelte/components/ui/dialog';
  import { Spinner } from '$lib/shadcn-svelte/components/ui/spinner';
  import { createSharedNovelsFileName, encodeSharedNovels } from '$lib/sharedNovels';
  import { downloadBlob, getErrorMessage } from '$lib/utils/misc';
  import { toast } from 'svelte-sonner';

  interface ShareNovelFileDialogProps {
    open: boolean;
    readonly documents: LoadedNovelDocument[];
  }

  type Status = 'preparing' | 'ready' | 'error';

  let { open = $bindable(), documents }: ShareNovelFileDialogProps = $props();

  let status = $state<Status>('preparing');
  let blob = $state.raw<Blob>();
  let errorMessage = $state('');
  // 閉じる前に始めた準備の結果を捨てるための識別子
  let preparationToken = 0;

  const sharedNovelsFile = $derived(
    blob ? new File([blob], createSharedNovelsFileName(), { type: blob.type }) : undefined,
  );

  const canShareFile = $derived.by(() => {
    if (!browser || !sharedNovelsFile) return false;
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
    try {
      return navigator.canShare({ files: [sharedNovelsFile] });
    } catch {
      return false;
    }
  });

  const prepare = async () => {
    const token = ++preparationToken;
    status = 'preparing';
    errorMessage = '';
    try {
      const preparedBlob = await encodeSharedNovels(documents);
      if (token !== preparationToken) return;
      blob = preparedBlob;
      status = 'ready';
    } catch (error) {
      if (token !== preparationToken) return;
      errorMessage = getErrorMessage(error, m.share_prepare_failed());
      status = 'error';
      console.error('Failed to prepare the shared novels file:', error);
    }
  };

  const downloadNovelsFile = () => {
    if (!blob) return;
    downloadBlob(blob, createSharedNovelsFileName());
  };

  const shareNovelsFile = async () => {
    if (!sharedNovelsFile) return;
    try {
      await navigator.share({
        files: [sharedNovelsFile],
        title: m.share_file_title({ appName: m.app_name() }),
      });
    } catch (error) {
      // 共有メニューを閉じただけの場合はエラーにしない
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error(m.share_sheet_failed());
      console.error('Failed to share the shared novels file:', error);
    }
  };
</script>

<Dialog.Root
  bind:open
  onOpenChangeComplete={(isOpen) => {
    if (isOpen) {
      void prepare();
      return;
    }
    preparationToken += 1;
    status = 'preparing';
    blob = undefined;
    errorMessage = '';
  }}>
  <Dialog.Content>
    {#if status === 'preparing'}
      <Dialog.Header>
        <Dialog.Title>{m.share_preparing()}</Dialog.Title>
      </Dialog.Header>
      <div class='flex justify-center py-4'>
        <Spinner class='size-6'/>
      </div>
    {:else if status === 'error'}
      <Dialog.Header>
        <Dialog.Title>{m.share_prepare_failed()}</Dialog.Title>
        <Dialog.Description class='text-destructive'>{errorMessage}</Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer>
        <Button onclick={() => void prepare()}>{m.share_retry()}</Button>
      </Dialog.Footer>
    {:else}
      <Dialog.Header>
        <Dialog.Title>{m.share_file_dialog_title()}</Dialog.Title>
        <Dialog.Description>
          {m.share_file_dialog_description()} {m.share_file_note()}
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer>
        <Button variant='outline' onclick={downloadNovelsFile}>
          <IconDownload/> {m.share_download_file()}
        </Button>
        {#if canShareFile}
          <Button onclick={() => void shareNovelsFile()}>
            <IconShare/> {m.share_share_file()}
          </Button>
        {/if}
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
