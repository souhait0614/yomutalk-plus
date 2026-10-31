<script lang='ts'>
  import { IconBrandGithub, IconExternalLink, IconWorld } from '@tabler/icons-svelte';
  import NavigationItem from '$lib/components/NavigationItem.svelte';
  import { m } from '$lib/paraglide/messages';
  import * as Item from '$lib/shadcn-svelte/components/ui/item';
  import { ttsModuleList } from '$lib/tts';

  import packageJson from '../../../../../package.json';
</script>

<div class='flex flex-col gap-2'>
  <section class='contents'>
    <h2 class='sr-only scroll-m-20 text-xl tracking-tight'>{m.info_app_section()}</h2>
    <div class='flex flex-col items-center gap-2 p-2'>
      <img
        src='/images/icon-256.png'
        alt={m.info_app_icon_alt()}
        class='size-16 rounded-sm'>
      <div class='flex flex-col items-center'>
        <p class='text-lg'>{m.app_name()}</p>
        <p class='text-sm text-muted-foreground'>ver: {packageJson.version}</p>
      </div>
    </div>
  </section>
  <section class='contents'>
    <h2 class='scroll-m-20 text-xl tracking-tight'>{m.info_tts_section()}</h2>
    {#each ttsModuleList as module (module.id)}
      <Item.Root variant='muted' size='xs'>
        <Item.Content>
          <Item.Title>{module.name}</Item.Title>
          <Item.Description>{module.description ?? m.info_no_description()}</Item.Description>
        </Item.Content>
        <Item.Description>ver: {module.version}</Item.Description>
      </Item.Root>
    {/each}
  </section>
  <section class='contents'>
    <h2 class='scroll-m-20 text-xl tracking-tight'>{m.info_other_section()}</h2>
    <NavigationItem href='https://github.com/souhait0614/yomutalk-plus' target='_blank'>
      {#snippet startIcon()}
        <IconBrandGithub/>
      {/snippet}
      {m.info_github_repo()}
      {#snippet description()}
        {m.info_github_repo_description()}
      {/snippet}
      {#snippet endIcon()}
        <IconExternalLink/>
      {/snippet}
    </NavigationItem>
    <NavigationItem href='https://souhait.me' target='_blank'>
      {#snippet startIcon()}
        <IconWorld/>
      {/snippet}
      {m.info_author_site()}
      {#snippet description()}
        {m.info_author_site_description()}
      {/snippet}
      {#snippet endIcon()}
        <IconExternalLink/>
      {/snippet}
    </NavigationItem>
    <NavigationItem href='https://hyakkano.souhait.app/yomutalk-plus' target='_blank'>
      {#snippet startIcon()}
        <IconWorld/>
      {/snippet}
      {m.info_overview_page()}
      {#snippet endIcon()}
        <IconExternalLink/>
      {/snippet}
    </NavigationItem>
    <NavigationItem href='https://hyakkano.souhait.app/privacy' target='_blank'>
      {#snippet startIcon()}
        <IconWorld/>
      {/snippet}
      {m.info_privacy_policy()}
      {#snippet endIcon()}
        <IconExternalLink/>
      {/snippet}
    </NavigationItem>
  </section>
</div>
