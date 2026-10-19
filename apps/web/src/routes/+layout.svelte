<script lang='ts'>
  import { pwaInstallBypassed } from '$lib/appSettings.svelte';
  import PwaInstallGuideDialog from '$lib/components/PwaInstallGuideDialog.svelte';
  import { pwaInstallation } from '$lib/pwaInstallation.svelte';
  import { pwaUpdate } from '$lib/pwaUpdate.svelte';
  import { Toaster } from '$lib/shadcn-svelte/components/ui/sonner';
  import * as Tooltip from '$lib/shadcn-svelte/components/ui/tooltip';
  import { mode, ModeWatcher } from 'mode-watcher';
  import { onMount } from 'svelte';

  import PwaInstallScreen from './-components/PwaInstallScreen.svelte';

  import '../app.css';

  const { children } = $props();
  const themeColors = { dark: '#22292b', light: '#f1f3f3' };

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

<ModeWatcher {themeColors}/>
<Toaster position='top-right'/>
<PwaInstallGuideDialog/>
{#if pwaInstallation.requiresInstallation && !pwaInstallBypassed.current}
  <PwaInstallScreen/>
{:else}
  <Tooltip.Provider>
    {@render children()}
  </Tooltip.Provider>
{/if}

<!-- TODO: 消したい -->
<!-- NOTE: IOS 27 Blur Fix Hack -->
<div
  class='
    pointer-events-none fixed inset-x-0 top-0 z-2147483647 h-[11px] bg-clip-text
  '
  style:background-color={themeColors[mode.current ?? 'light']}
  aria-hidden='true'></div>
