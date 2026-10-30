<script lang='ts'>
  import { IconFileDownload, IconQrcode } from '@tabler/icons-svelte';
  import { m } from '$lib/paraglide/messages';
  import * as Dialog from '$lib/shadcn-svelte/components/ui/dialog';
  import * as Item from '$lib/shadcn-svelte/components/ui/item';

  interface SelectShareMethodDialogProps {
    open: boolean;
    readonly onSelectMethod: (method: 'qr' | 'file') => void;
  }

  let { open = $bindable(), onSelectMethod }: SelectShareMethodDialogProps = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{m.share_send_method_title()}</Dialog.Title>
    </Dialog.Header>
    <div class='flex flex-col gap-2'>
      <Item.Root
        variant='outline'
        class='
          cursor-pointer text-left
          hover:bg-muted
        '>
        {#snippet child({ props })}
          <button {...props} type='button' onclick={() => onSelectMethod('qr')}>
            <Item.Media variant='icon'><IconQrcode/></Item.Media>
            <Item.Content>
              <Item.Title>{m.share_send_with_qr()}</Item.Title>
              <Item.Description class='line-clamp-none'>{m.share_send_with_qr_hint()}</Item.Description>
            </Item.Content>
          </button>
        {/snippet}
      </Item.Root>
      <Item.Root
        variant='outline'
        class='
          cursor-pointer text-left
          hover:bg-muted
        '>
        {#snippet child({ props })}
          <button {...props} type='button' onclick={() => onSelectMethod('file')}>
            <Item.Media variant='icon'><IconFileDownload/></Item.Media>
            <Item.Content>
              <Item.Title>{m.share_send_with_file()}</Item.Title>
              <Item.Description class='line-clamp-none'>{m.share_send_with_file_hint()}</Item.Description>
            </Item.Content>
          </button>
        {/snippet}
      </Item.Root>
    </div>
  </Dialog.Content>
</Dialog.Root>
