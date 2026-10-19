<script lang='ts'>
  import { IconDownload, IconShare } from '@tabler/icons-svelte';
  import { browser } from '$app/environment';
  import QRCode from '$lib/components/QRCode.svelte';
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
        title: 'よむとーく＋の小説',
      });
    } catch (error) {
      // 共有メニューを閉じただけの場合はエラーにしない
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error('共有メニューを開けませんでした');
      console.error('Failed to share the shared novels file:', error);
    }
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>小説を送る準備ができました</Dialog.Title>
      <Dialog.Description>
        送り先の端末で「小説を受け取る」画面を開き、このQRコードを読み取るか、小説ファイルを渡してください。
        共有は作成から1日で無効になります。
      </Dialog.Description>
    </Dialog.Header>
    <div class='flex justify-center'>
      <QRCode text={createSharedNovelsQrText(id)} class='size-40'/>
    </div>
    <Dialog.Footer>
      <Button variant='outline' disabled={!blob} onclick={downloadSharedNovels}>
        <IconDownload/> 小説ファイルをダウンロード
      </Button>
      {#if canShareFile}
        <Button disabled={!sharedNovelsFile} onclick={shareSharedNovels}>
          <IconShare/> 小説ファイルを共有
        </Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
