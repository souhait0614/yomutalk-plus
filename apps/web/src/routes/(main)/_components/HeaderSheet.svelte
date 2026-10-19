<script lang='ts'>
  import { IconBook2, IconDeviceMobileDown, IconDevices, IconDownload, IconFilePencil, IconMessageDots, IconMoon, IconSend, IconSettings, IconSun } from '@tabler/icons-svelte';
  import { resolve } from '$app/paths';
  import NavigationItem from '$lib/components/NavigationItem.svelte';
  import { getManageLoadedNovelDocumentsDialogContext } from '$lib/contexts/manageLoadedNovelDocumentsDialog';
  import { getManageSelectedTextsDialogContext } from '$lib/contexts/manageSelectedTextsDialog';
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
      <Sheet.Title>よむとーく＋</Sheet.Title>
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
          ホーム画面に追加
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
        読み上げ管理・設定
      </NavigationItem>
      <NavigationItem
        onclick={() => {
          manageLoadedNovelDocumentsDialog.open();
          open = false;
        }}>
        {#snippet startIcon()}
          <IconBook2/>
        {/snippet}
        小説管理・設定
      </NavigationItem>
      <NavigationItem href={resolve('/(menu)/novels')}>
        {#snippet startIcon()}
          <IconFilePencil/>
        {/snippet}
        小説の作成・編集
      </NavigationItem>
      <NavigationItem href={resolve('/share/send')}>
        {#snippet startIcon()}
          <IconSend/>
        {/snippet}
        小説を送る
      </NavigationItem>
      <NavigationItem href={resolve('/share/receive')}>
        {#snippet startIcon()}
          <IconDownload/>
        {/snippet}
        小説を受け取る
      </NavigationItem>
      <NavigationItem href={resolve('/settings')}>
        {#snippet startIcon()}
          <IconSettings/>
        {/snippet}
        アプリ設定
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
            {:else if userPrefersMode.current === 'dark'}
              <IconMoon/>
            {/if}
            テーマ
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
                <DropdownMenu.RadioItem value='system'><IconDevices/> システムに追従</DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem value='light'><IconSun/> ライト</DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem value='dark'><IconMoon/> ダーク</DropdownMenu.RadioItem>
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Group>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </Sheet.Footer>
  </Sheet.Content>
</Sheet.Root>
