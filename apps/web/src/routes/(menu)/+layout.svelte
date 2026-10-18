<script lang='ts'>
  import { IconChevronLeft } from '@tabler/icons-svelte';
  import { page } from '$app/state';
  import { Button } from '$lib/shadcn-svelte/components/ui/button';
  import { goBackOrHome } from '$lib/utils/navigation';

  const { children } = $props();
</script>

<div
  class='
    grid min-h-dvh grid-rows-[auto_minmax(0,1fr)]
    {page.data.forceFullScreen ? 'h-dvh' : ''}'>
  <header
    class='
      sticky top-0 left-0 flex h-16 items-center gap-2 bg-muted px-2 py-4
      text-muted-foreground
    '>
    <Button variant='ghost' size='icon-lg' onclick={goBackOrHome}>
      <IconChevronLeft/>
    </Button>
    <h1>{page.data.pageTitle}</h1>
  </header>
  <main
    class='
      p-4
      {page.data.forceFullScreen ? '' : 'container mx-auto'}'>
    {@render children()}
  </main>
</div>
