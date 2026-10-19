<script lang='ts'>
  import { IconDownload, IconShare } from '@tabler/icons-svelte';
  import { browser } from '$app/environment';
  import QRCode from '$lib/components/QRCode.svelte';
  import { m } from '$lib/paraglide/messages';
  import Button from '$lib/shadcn-svelte/components/ui/button/button.svelte';
  import * as Dialog from '$lib/shadcn-svelte/components/ui/dialog';
  import { createSharedNovelsFileName, createSharedNovelsQrText } from '$lib/sharedNovels';
  import { downloadBlob } from '$lib/utils/misc';
  import { toast } from 'svelte-sonner';

  interface ShareNovelsDialogProps {
    open: boolean;
    readonly id: string;
    readonly blob: Blob | undefined;
  }

  let { open = $bindable(), id, blob }: ShareNovelsDialogProps = $props();

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

  const downloadSharedNovels = () => {
    if (!blob) return;
    downloadBlob(blob, createSharedNovelsFileName());
  };

  const shareSharedNovels = async () => {
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

<Dialog.Root bind:open>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{m.share_dialog_title()}</Dialog.Title>
      <Dialog.Description>
        {m.share_dialog_description()} {m.share_expiry_note()}
      </Dialog.Description>
    </Dialog.Header>
    <div class='flex justify-center'>
      <QRCode text={createSharedNovelsQrText(id)} class='size-40'/>
    </div>
    <Dialog.Footer>
      <Button variant='outline' disabled={!blob} onclick={downloadSharedNovels}>
        <IconDownload/> {m.share_download_file()}
      </Button>
      {#if canShareFile}
        <Button disabled={!sharedNovelsFile} onclick={shareSharedNovels}>
          <IconShare/> {m.share_share_file()}
        </Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
