<script lang='ts'>
  import appIcon from '@repo/assets/app-icons/icon-256.png?url&no-inline';
  import { IconDeviceMobileDown, IconX } from '@tabler/icons-svelte';
  import { pwaInstallBypassed } from '$lib/appSettings.svelte';
  import { m } from '$lib/paraglide/messages';
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
    aria-label={m.common_close()}
    onclick={() => {
      warningOpen = true;
    }}>
    {m.common_close()} <IconX/>
  </Button>
  <div class='flex flex-col items-center gap-3'>
    <img
      src={appIcon}
      alt={m.app_name()}
      class='size-20 rounded-2xl'>
    <div class='flex flex-col items-center gap-1'>
      <h1 class='text-xl font-medium'>{m.app_name()}</h1>
      <p class='text-center text-sm text-muted-foreground'>
        {m.pwa_guide_install_description()}
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
        {m.pwa_add_to_home_screen()}
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
      <AlertDialog.Title>{m.pwa_bypass_confirm_title()}</AlertDialog.Title>
      <AlertDialog.Description>
        {m.pwa_bypass_confirm_description()}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Action onclick={bypass}>{m.pwa_open_anyway()}</AlertDialog.Action>
      <AlertDialog.Cancel>{m.common_cancel()}</AlertDialog.Cancel>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
