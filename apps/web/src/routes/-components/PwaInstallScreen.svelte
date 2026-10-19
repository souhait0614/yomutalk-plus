<script lang='ts'>
  import appIcon from '@repo/assets/app-icons/icon-256.png?url&no-inline';
  import { IconDeviceMobileDown, IconX } from '@tabler/icons-svelte';
  import { pwaInstallBypassed } from '$lib/appSettings.svelte';
  import { pwaInstallation } from '$lib/pwaInstallation.svelte';
  import * as AlertDialog from '$lib/shadcn-svelte/components/ui/alert-dialog';
  import { Button } from '$lib/shadcn-svelte/components/ui/button';

  let warningOpen = $state(false);

  const bypass = () => {
    pwaInstallBypassed.current = true;
  };
</script>

<div
  class='
    relative flex min-h-dvh flex-col items-center justify-center gap-8
    bg-background px-6 py-10
  '>
  <Button
    class='absolute top-[calc(1rem+var(--safe-area-inset-top))] right-4'
    variant='ghost'
    size='lg'
    aria-label='閉じる'
    onclick={() => {
      warningOpen = true;
    }}>
    閉じる <IconX/>
  </Button>
  <div class='flex flex-col items-center gap-3'>
    <img
      src={appIcon}
      alt='よむとーく＋'
      class='size-20 rounded-2xl'>
    <div class='flex flex-col items-center gap-1'>
      <h1 class='text-xl font-medium'>よむとーく＋</h1>
      <p class='text-center text-sm text-muted-foreground'>
        ホーム画面に追加すると、アプリとして快適にお使いいただけます。
      </p>
    </div>
  </div>
  <div class='flex w-full max-w-sm flex-col gap-4'>
    {#if pwaInstallation.canInstall}
      <Button
        size='lg'
        onclick={() => {
          void pwaInstallation.install();
        }}>
        <IconDeviceMobileDown/>
        ホーム画面に追加
      </Button>
    {:else}
      <p class='text-sm'>{pwaInstallation.guide.description}</p>
      {#if pwaInstallation.guide.steps.length > 0}
        <ol class='flex list-decimal flex-col gap-2 pl-5 text-sm'>
          {#each pwaInstallation.guide.steps as step (step)}
            <li>{step}</li>
          {/each}
        </ol>
      {/if}
    {/if}
  </div>
</div>

<AlertDialog.Root bind:open={warningOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>ホーム画面に追加せずに開きますか？</AlertDialog.Title>
      <AlertDialog.Description>
        このままブラウザで開くと、正常に動作しない可能性があります。ホーム画面に追加してからご利用ください。
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Action onclick={bypass}>そのまま開く</AlertDialog.Action>
      <AlertDialog.Cancel>キャンセル</AlertDialog.Cancel>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
