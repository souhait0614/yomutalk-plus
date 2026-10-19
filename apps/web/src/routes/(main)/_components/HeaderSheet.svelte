<script lang='ts'>
  import { IconBook2, IconDeviceMobileDown, IconDevices, IconDownload, IconFilePencil, IconMessageDots, IconMoon, IconSend, IconSettings, IconSun } from '@tabler/icons-svelte';
  import { resolve } from '$app/paths';
  import NavigationItem from '$lib/components/NavigationItem.svelte';
  import { getManageLoadedNovelDocumentsDialogContext } from '$lib/contexts/manageLoadedNovelDocumentsDialog';
  import { getManageSelectedTextsDialogContext } from '$lib/contexts/manageSelectedTextsDialog';
  import { m } from '$lib/paraglide/messages';
  import { pwaInstallation } from '$lib/pwaInstallation.svelte';
  import { buttonVariants } from '$lib/shadcn-svelte/components/ui/button';
  import * as DropdownMenu from '$lib/shadcn-svelte/components/ui/dropdown-menu';
  import Separator from '$lib/shadcn-svelte/components/ui/separator/separator.svelte';
  import * as Sheet from '$lib/shadcn-svelte/components/ui/sheet';
  import { resetMode, setMode, userPrefersMode } from 'mode-watcher';

  interface HeaderSheetProps {
    open: boolean;
  }

  let { open = $bindable() }: HeaderSheetProps = $props();

  const manageLoadedNovelDocumentsDialog = getManageLoadedNovelDocumentsDialogContext();
  const manageSelectedTextsDialog = getManageSelectedTextsDialogContext();
</script>

<Sheet.Root bind:open>
  <Sheet.Content side='left'>
    <Sheet.Header>
      <Sheet.Title>{m.app_name()}</Sheet.Title>
    </Sheet.Header>
    <div class='flex flex-col gap-2 overflow-y-auto px-2'>
      {#if !pwaInstallation.standalone}
        <NavigationItem
          onclick={() => {
            void pwaInstallation.install();
            open = false;
          }}>
          {#snippet startIcon()}
            <IconDeviceMobileDown/>
          {/snippet}
          {m.pwa_add_to_home_screen()}
        </NavigationItem>
        <Separator/>
      {/if}
      <NavigationItem
        onclick={() => {
          manageSelectedTextsDialog.open();
          open = false;
        }}>
        {#snippet startIcon()}
          <IconMessageDots/>
        {/snippet}
        {m.nav_tts_manage()}
      </NavigationItem>
      <NavigationItem
        onclick={() => {
          manageLoadedNovelDocumentsDialog.open();
          open = false;
        }}>
        {#snippet startIcon()}
          <IconBook2/>
        {/snippet}
        {m.nav_library_manage()}
      </NavigationItem>
      <NavigationItem href={resolve('/(menu)/novels')}>
        {#snippet startIcon()}
          <IconFilePencil/>
        {/snippet}
        {m.nav_novel_editor()}
      </NavigationItem>
      <NavigationItem href={resolve('/share/send')}>
        {#snippet startIcon()}
          <IconSend/>
        {/snippet}
        {m.nav_share_send()}
      </NavigationItem>
      <NavigationItem href={resolve('/share/receive')}>
        {#snippet startIcon()}
          <IconDownload/>
        {/snippet}
        {m.nav_share_receive()}
      </NavigationItem>
      <NavigationItem href={resolve('/settings')}>
        {#snippet startIcon()}
          <IconSettings/>
        {/snippet}
        {m.nav_app_settings()}
      </NavigationItem>
    </div>
    <Sheet.Footer>
      <div class='flex'>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger class={buttonVariants({ variant: 'outline' })}>
            {#if userPrefersMode.current === 'system'}
              <IconDevices/>
            {:else if userPrefersMode.current === 'light'}
              <IconSun/>
            {:else}
              <IconMoon/>
            {/if}
            {m.settings_theme()}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content class='w-32'>
            <DropdownMenu.Group>
              <DropdownMenu.RadioGroup
                value={userPrefersMode.current}
                onValueChange={(value) => {
                  if (value === 'system') {
                    resetMode();
                  } else if (value === 'light') {
                    setMode('light');
                  } else if (value === 'dark') {
                    setMode('dark');
                  }
                }}>
                <DropdownMenu.RadioItem value='system'><IconDevices/> {m.theme_system()}</DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem value='light'><IconSun/> {m.theme_light()}</DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem value='dark'><IconMoon/> {m.theme_dark()}</DropdownMenu.RadioItem>
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Group>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </Sheet.Footer>
  </Sheet.Content>
</Sheet.Root>
