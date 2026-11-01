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
    readonly documentsKey: string;
    /** 同じ内容の小説をアップロード済みなら、その共有 ID */
    readonly uploadedSharedNovelsId: string | undefined;
    readonly onUploadSharedNovels: (key: string, id: string) => void;
    /** アップロードできないときに小説ファイルでの送信へ切り替える */
    readonly onSelectFile: () => void;
  }

  type Status = 'preparing' | 'ready' | 'error';

  let {
    open = $bindable(),
    documents,
    documentsKey,
    uploadedSharedNovelsId,
    onUploadSharedNovels,
    onSelectFile,
  }: ShareNovelQrDialogProps = $props();

  let status = $state<Status>('preparing');
  let sharedNovelsId = $state('');
  let errorMessage = $state('');
  // 閉じる前に始めたアップロードの結果を捨てるための識別子
  let preparationToken = 0;

  const prepare = async (key = documentsKey) => {
    const token = ++preparationToken;
    if (uploadedSharedNovelsId) {
      sharedNovelsId = uploadedSharedNovelsId;
      status = 'ready';
      return;
    }

    status = 'preparing';
    errorMessage = '';
    try {
      const uploadedId = await uploadSharedNovels(await encodeSharedNovels(documents));
      if (token !== preparationToken) return;
      sharedNovelsId = uploadedId;
      onUploadSharedNovels(key, uploadedId);
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
