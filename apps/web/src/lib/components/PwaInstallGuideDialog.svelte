<script lang='ts'>
  import { pwaInstallation } from '$lib/pwaInstallation.svelte';
  import { buttonVariants } from '$lib/shadcn-svelte/components/ui/button';
  import * as Dialog from '$lib/shadcn-svelte/components/ui/dialog';
</script>

<Dialog.Root bind:open={pwaInstallation.guideOpen}>
  <Dialog.Content class='sm:max-w-md' showCloseButton={false}>
    <Dialog.Header>
      <Dialog.Title>ホーム画面に追加</Dialog.Title>
      <Dialog.Description>{pwaInstallation.guide.description}</Dialog.Description>
    </Dialog.Header>
    {#if pwaInstallation.guide.steps.length > 0}
      <ol class='flex list-decimal flex-col gap-2 pl-6 text-sm'>
        {#each pwaInstallation.guide.steps as step (step)}
          <li>{step}</li>
        {/each}
      </ol>
    {/if}
    <Dialog.Footer>
      <Dialog.Close class={buttonVariants({ variant: 'outline' })}>閉じる</Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
