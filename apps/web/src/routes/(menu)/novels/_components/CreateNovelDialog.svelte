<script lang='ts'>
  import type { LoadedNovelDocumentFileType } from '$lib/db';
  import { Button } from '$lib/shadcn-svelte/components/ui/button';
  import * as Dialog from '$lib/shadcn-svelte/components/ui/dialog';
  import { Input } from '$lib/shadcn-svelte/components/ui/input';
  import { Label } from '$lib/shadcn-svelte/components/ui/label';
  import * as NativeSelect from '$lib/shadcn-svelte/components/ui/native-select';
  import { Spinner } from '$lib/shadcn-svelte/components/ui/spinner';

  interface CreateNovelDialogProps {
    open: boolean;
    fileType: LoadedNovelDocumentFileType;
    title: string;
    author: string;
    readonly busy: boolean;
    readonly onconfirm: () => void;
  }

  let {
    open = $bindable(),
    fileType = $bindable(),
    title = $bindable(),
    author = $bindable(),
    busy,
    onconfirm,
  }: CreateNovelDialogProps = $props();

  const confirm = (event: SubmitEvent) => {
    event.preventDefault();
    if (!busy && title.trim()) onconfirm();
  };
</script>

<Dialog.Root
  bind:open={() => open, (value) => {
    if (!busy) open = value;
  }}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>小説の新規作成</Dialog.Title>
    </Dialog.Header>
    <form class='flex flex-col gap-4' onsubmit={confirm}>
      <div class='flex flex-col gap-2'>
        <Label for='create-novel-format'>形式</Label>
        <NativeSelect.Root
          id='create-novel-format'
          class='w-full'
          disabled={busy}
          bind:value={fileType}>
          <NativeSelect.Option value='aozoratext'>青空文庫形式</NativeSelect.Option>
          <NativeSelect.Option value='plaintext'>プレーンテキスト</NativeSelect.Option>
        </NativeSelect.Root>
      </div>
      <div class='flex flex-col gap-2'>
        <Label for='create-novel-title'>{fileType === 'plaintext' ? 'ファイル名' : 'タイトル'}</Label>
        <Input
          id='create-novel-title'
          required
          disabled={busy}
          bind:value={title}/>
      </div>
      {#if fileType === 'aozoratext'}
        <div class='flex flex-col gap-2'>
          <Label for='create-novel-author'>著者名</Label>
          <Input id='create-novel-author' disabled={busy} bind:value={author}/>
        </div>
      {/if}
      <Dialog.Footer>
        <Button variant='outline' disabled={busy} onclick={() => open = false}>キャンセル</Button>
        <Button type='submit' disabled={busy || !title.trim()}>
          {#if busy}<Spinner/>{/if} 作成
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
