<script lang='ts'>
  import { IconCopy, IconShare } from '@tabler/icons-svelte';
  import { browser } from '$app/environment';
  import QRCode from '$lib/components/QRCode.svelte';
  import Button from '$lib/shadcn-svelte/components/ui/button/button.svelte';
  import * as Dialog from '$lib/shadcn-svelte/components/ui/dialog';
  import { toast } from 'svelte-sonner';

  interface ShareUrlDialogProps {
    open: boolean;
    readonly url: string;
  }

  let { open = $bindable(), url }: ShareUrlDialogProps = $props();

  // 端末の共有メニュー (Web Share API) に対応していない場合は共有ボタンを表示しない
  const canShare = browser && typeof navigator.share === 'function';

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('共有URLをコピーしました');
    } catch {
      toast.error('共有URLをコピーできませんでした');
    }
  };

  const shareUrl = async () => {
    try {
      await navigator.share({ title: 'よむとーく＋', url });
    } catch (error) {
      // 共有メニューを閉じただけの場合はエラーにしない
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error('共有メニューを開けませんでした');
      console.error('Failed to share the URL:', error);
    }
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>共有URLを作成しました</Dialog.Title>
      <Dialog.Description>
        このURLを開くと、共有した小説を追加できます。
        URLは作成から1日で無効になります。
      </Dialog.Description>
    </Dialog.Header>
    <div class='flex justify-center'>
      <QRCode text={url} class='size-40'/>
    </div>
    <Dialog.Footer>
      <Button variant='outline' onclick={copyUrl}>
        <IconCopy/> URLをコピー
      </Button>
      {#if canShare}
        <Button onclick={shareUrl}>
          <IconShare/> URLを共有
        </Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
