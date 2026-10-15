<script lang='ts'>
  import appIcon from '@repo/assets/app-icons/icon-256.png?url&no-inline';
  import { IconBrandGithub, IconExternalLink, IconWorld } from '@tabler/icons-svelte';
  import NavigationItem from '$lib/components/NavigationItem.svelte';
  import * as Item from '$lib/shadcn-svelte/components/ui/item';
  import { ttsModuleList } from '$lib/tts';

  import packageJson from '../../../../../package.json';
</script>

<div class='flex flex-col gap-2'>
  <section class='contents'>
    <h2 class='sr-only scroll-m-20 text-xl tracking-tight'>アプリケーション情報</h2>
    <div class='flex flex-col items-center gap-2 p-2'>
      <img
        src={appIcon}
        alt='Yomutalk Plus Icon'
        class='size-16 rounded-sm'>
      <div class='flex flex-col items-center'>
        <p class='text-lg'>よむとーく＋</p>
        <p class='text-sm text-muted-foreground'>ver: {packageJson.version}</p>
      </div>
    </div>
  </section>
  <section class='contents'>
    <h2 class='scroll-m-20 text-xl tracking-tight'>TTSモジュール情報</h2>
    {#each ttsModuleList as module (module.id)}
      <Item.Root variant='muted' size='xs'>
        <Item.Content>
          <Item.Title>{module.name}</Item.Title>
          <Item.Description>{module.description ?? '説明なし'}</Item.Description>
        </Item.Content>
        <Item.Description>ver: {module.version}</Item.Description>
      </Item.Root>
    {/each}
  </section>
  <section class='contents'>
    <h2 class='scroll-m-20 text-xl tracking-tight'>その他情報</h2>
    <NavigationItem href='https://github.com/souhait0614/yomutalk-plus' target='_blank'>
      {#snippet startIcon()}
        <IconBrandGithub/>
      {/snippet}
      GitHubリポジトリ
      {#snippet endIcon()}
        <IconExternalLink/>
      {/snippet}
    </NavigationItem>
    <NavigationItem href='https://hyakkano.souhait.app/yomutalk-plus' target='_blank'>
      {#snippet startIcon()}
        <IconWorld/>
      {/snippet}
      アプリ概要・機能紹介ページ
      {#snippet endIcon()}
        <IconExternalLink/>
      {/snippet}
    </NavigationItem>
    <NavigationItem href='https://souhait.me' target='_blank'>
      {#snippet startIcon()}
        <IconWorld/>
      {/snippet}
      制作者のサイト
      {#snippet endIcon()}
        <IconExternalLink/>
      {/snippet}
    </NavigationItem>
  </section>
</div>
