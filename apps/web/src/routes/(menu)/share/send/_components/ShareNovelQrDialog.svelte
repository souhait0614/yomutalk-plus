<script lang='ts'>
  import type { LoadedNovelDocument } from '$lib/db';
  import { IconFileDownload } from '@tabler/icons-svelte';
  import QRCode from '$lib/components/QRCode.svelte';
  import { m } from '$lib/paraglide/messages';
  import Button from '$lib/shadcn-svelte/components/ui/button/button.svelte';
  import * as Dialog from '$lib/shadcn-svelte/components/ui/dialog';
  import { Spinner } from '$lib/shadcn-svelte/components/ui/spinner';
  import { createSharedNovelsQrText, encodeSharedNovels, uploadSharedNovels } from '$lib/sharedNovels';
  import { getErrorMessage } from '$lib/utils/misc';

  interface ShareNovelQrDialogProps {
    open: boolean;
    readonly documents: LoadedNovelDocument[];
    /** 同じ組み合わせの小説をアップロード済みなら、その共有 ID */
    readonly uploadedSharedNovelsId: string | undefined;
    readonly onUploadSharedNovels: (id: string) => void;
    /** アップロードできないときに小説ファイルでの送信へ切り替える */
    readonly onSelectFile: () => void;
  }

  type Status = 'preparing' | 'ready' | 'error';

  let {
    open = $bindable(),
    documents,
    uploadedSharedNovelsId,
    onUploadSharedNovels,
    onSelectFile,
  }: ShareNovelQrDialogProps = $props();

  let status = $state<Status>('preparing');
  let sharedNovelsId = $state('');
  let errorMessage = $state('');
  // 閉じる前に始めたアップロードの結果を捨てるための識別子
  let preparationToken = 0;

  const prepare = async () => {
    // 同じ組み合わせをアップロード済みなら、その共有 ID で QR コードを表示する
    if (uploadedSharedNovelsId) {
      sharedNovelsId = uploadedSharedNovelsId;
      status = 'ready';
      return;
    }

    const token = ++preparationToken;
    status = 'preparing';
    errorMessage = '';
    try {
      const uploadedId = await uploadSharedNovels(await encodeSharedNovels(documents));
      if (token !== preparationToken) return;
      sharedNovelsId = uploadedId;
      onUploadSharedNovels(uploadedId);
      status = 'ready';
    } catch (error) {
      if (token !== preparationToken) return;
      errorMessage = getErrorMessage(error, m.share_prepare_failed());
      status = 'error';
      console.error('Failed to upload shared novels:', error);
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
    // 閉じ終わったら次に開くときに備えて初期化する
    preparationToken += 1;
    status = 'preparing';
    sharedNovelsId = '';
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
        <Button variant='outline' onclick={onSelectFile}>
          <IconFileDownload/> {m.share_send_with_file()}
        </Button>
        <Button onclick={() => void prepare()}>{m.share_retry()}</Button>
      </Dialog.Footer>
    {:else}
      <Dialog.Header>
        <Dialog.Title>{m.share_dialog_title()}</Dialog.Title>
        <Dialog.Description>
          {m.share_dialog_description()} {m.share_expiry_note()}
        </Dialog.Description>
      </Dialog.Header>
      <div class='flex justify-center'>
        <QRCode text={createSharedNovelsQrText(sharedNovelsId)} class='size-40'/>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
