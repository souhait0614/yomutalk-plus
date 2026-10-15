<script lang='ts'>
  import PwaInstallGuideDialog from '$lib/components/PwaInstallGuideDialog.svelte';
  import { pwaUpdate } from '$lib/pwaUpdate.svelte';
  import { Toaster } from '$lib/shadcn-svelte/components/ui/sonner';
  import * as Tooltip from '$lib/shadcn-svelte/components/ui/tooltip';
  import { ModeWatcher } from 'mode-watcher';
  import { onMount } from 'svelte';

  import '../app.css';

  const { children } = $props();

  onMount(async () => {
    const { registerSW } = await import('virtual:pwa-register');
    const updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh() {
        pwaUpdate.markUpdateAvailable();
      },
    });
    pwaUpdate.setUpdater(updateServiceWorker);
  });
</script>

<ModeWatcher themeColors={{ dark: '#22292b', light: '#f1f3f3' }}/>
<Toaster position='top-right'/>
<PwaInstallGuideDialog/>
<Tooltip.Provider>
  {@render children()}
</Tooltip.Provider>
