<script lang='ts'>
  import type { Bookmark, LoadedNovelDocument } from '$lib/db';
  import { IconBookmark, IconChevronDown, IconChevronUp, IconMessageDots, IconPlayerPlay, IconPlayerStop, IconSettingsAutomation, IconTrash } from '@tabler/icons-svelte';
  import { autoStartPlayback } from '$lib/appSettings.svelte';
  import NovelInlineContent from '$lib/components/NovelInlineContent.svelte';
  import { getManageSelectedTextsDialogContext } from '$lib/contexts/manageSelectedTextsDialog';
  import { m } from '$lib/paraglide/messages';
  import { Badge } from '$lib/shadcn-svelte/components/ui/badge';
  import { Button, buttonVariants } from '$lib/shadcn-svelte/components/ui/button';
  import * as Card from '$lib/shadcn-svelte/components/ui/card';
  import { Separator } from '$lib/shadcn-svelte/components/ui/separator';
  import { Slider } from '$lib/shadcn-svelte/components/ui/slider';
  import { Toggle } from '$lib/shadcn-svelte/components/ui/toggle';
  import * as Tooltip from '$lib/shadcn-svelte/components/ui/tooltip';
  import { twFade, twSlideToBottom } from '$lib/transitions';

  import type { SelectedTextMap } from '../_types';
  import BookmarksSheet from './BookmarksSheet.svelte';

  interface FooterProps {
    readonly loadedNovelDocuments: LoadedNovelDocument[];
    readonly selectedTextMap: SelectedTextMap;
    collapsed: boolean;
    scrollValue: number;
    readonly scrollMax: number;
    readonly isPlaying: boolean;
    readonly onClickPlayButton: () => void;
    readonly onClickBookmarkLocationButton: (bookmark: Bookmark) => void;
    readonly onClickAddBookmarkToSelectedTextsButton: (bookmark: Bookmark) => void;
    readonly onClickDeleteButton: (selectedTextId: string) => void;
  }

  let {
    loadedNovelDocuments,
    selectedTextMap,
    collapsed = $bindable(),
    scrollValue = $bindable(),
    scrollMax,
    isPlaying,
    onClickPlayButton,
    onClickBookmarkLocationButton,
    onClickAddBookmarkToSelectedTextsButton,
    onClickDeleteButton,
  }: FooterProps = $props();

  const manageSelectedTextsDialog = getManageSelectedTextsDialogContext();
  let isOpenBookmarksSheet = $state(false);

  const selectedTextEntries = $derived(Array.from(selectedTextMap.entries()));
  const seekResolution = 1000;
  const getSeekValue = () => {
    if (scrollMax === 0) return 0;
    return Math.min(seekResolution, Math.max(0, Math.round((scrollValue / scrollMax) * seekResolution)));
  };
  const setSeekValue = (value: number) => {
    scrollValue = (value / seekResolution) * scrollMax;
  };

  let scrollArea: HTMLElement | null = $state(null);
  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (scrollArea) {
      if (isPlaying) {
        scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' });
      } else {
        scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  });
</script>

<div
  class='
    pointer-events-none relative flex w-full flex-col
    *:pointer-events-auto
  '>
  {#if selectedTextEntries.length > 0 && !collapsed}
    <div
      class='
        max-w-full self-end
        max-sm:w-full
        sm:min-w-xs
      '
      transition:twFade>
      <Card.Root
        class='w-full rounded-b-none bg-card/95 shadow-none'
        size='sm'>
        <!-- NOTE: fixが無限に繰り返されてしまうため -->
        <!-- eslint-disable-next-line better-tailwindcss/enforce-consistent-line-wrapping -->
        <Card.Content class='grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto] justify-end gap-2'>
          <div class='max-h-18 rounded-lg border'>
            <div class='size-full scroll-fade overflow-y-auto' bind:this={scrollArea}>
              <ol class='flex flex-col-reverse px-2 py-1'>
                {#each selectedTextEntries as [selectedTextId, selectedText], index (selectedTextId)}
                  <!-- NOTE: fixが無限に繰り返されてしまうため -->
                  <!-- eslint-disable-next-line better-tailwindcss/enforce-consistent-line-wrapping -->
                  <li class='grid grid-cols-[1fr_auto] items-center gap-1'>
                    {#if selectedText.status === 'preparing'}
                      <NovelInlineContent class='shimmer text-muted-foreground' inlines={selectedText.inlines}/>
                    {:else if selectedText.status === 'prepared'}
                      <NovelInlineContent inlines={selectedText.inlines}/>
                    {:else}
                      <NovelInlineContent class='text-destructive' inlines={selectedText.inlines}/>
                    {/if}
                    <div>
                      <Button
                        size='icon-sm'
                        variant='ghost'
                        aria-label={m.common_delete()}
                        onclick={() => onClickDeleteButton(selectedTextId)}>
                        <IconTrash/>
                      </Button>
                    </div>
                  </li>
                  {#if index !== selectedTextEntries.length - 1}
                    <li class='my-1'>
                      <Separator/>
                    </li>
                  {/if}
                {/each}
              </ol>
            </div>
          </div>
          <div class='flex flex-row justify-between gap-2'>
            <Tooltip.Root>
              <Tooltip.Trigger>
                {#snippet child({ props })}
                  <Toggle
                    {...props}
                    bind:pressed={autoStartPlayback.current}
                    aria-label={m.tts_auto_start()}
                    class="
                      {buttonVariants({ size: 'icon', variant: 'outline' })}
                      data-[state=on]:*:[svg]:stroke-primary
                    ">
                    <IconSettingsAutomation/>
                  </Toggle>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>{m.tts_auto_start()}</p>
              </Tooltip.Content>
            </Tooltip.Root>
            <Button
              class='grow'
              aria-label={isPlaying ? m.tts_stop() : m.tts_play()}
              onclick={onClickPlayButton}>
              {#if isPlaying}
                <IconPlayerStop/> {m.tts_stop()}
              {:else}
                <IconPlayerPlay/> {m.tts_play()}
              {/if}
            </Button>
            <Tooltip.Root>
              <Tooltip.Trigger>
                {#snippet child({ props })}
                  <Button
                    size='icon'
                    variant='outline'
                    aria-label={m.tts_manage()}
                    {...props}
                    onclick={manageSelectedTextsDialog.open}>
                    <IconMessageDots/>
                  </Button>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>{m.tts_manage()}</p>
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  {/if}
  {#if collapsed}
    <div class='absolute bottom-(--safe-area-inset-bottom) left-0 p-4' transition:twFade>
      <Tooltip.Root>
        <Tooltip.Trigger
          class={buttonVariants({ size: 'icon-lg', variant: 'outline' })}
          onclick={() => collapsed = false}>
          <IconChevronUp/>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>{m.footer_open_controls()}</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  {/if}
  {#if selectedTextEntries.length > 0 && collapsed}
    <div class='absolute right-0 bottom-(--safe-area-inset-bottom) p-4' transition:twFade>
      <Badge variant='outline' class='absolute top-0 left-0'>
        {selectedTextEntries.length}
      </Badge>
      <Button
        size='icon-lg'
        variant='outline'
        aria-label={isPlaying ? m.tts_stop() : m.tts_play()}
        onclick={onClickPlayButton}>
        {#if isPlaying}
          <IconPlayerStop/>
        {:else}
          <IconPlayerPlay/>
        {/if}
      </Button>
    </div>
  {/if}
  {#if !collapsed}
    <footer
      class='
        flex items-center gap-2 bg-muted/60 px-4 pt-4
        pb-[calc(1rem+var(--safe-area-inset-bottom))]
      '
      transition:twSlideToBottom>
      <Tooltip.Root>
        <Tooltip.Trigger class={buttonVariants({ size: 'icon-lg', variant: 'outline' })} onclick={() => collapsed = true}>
          <IconChevronDown/>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>{m.footer_close_controls()}</p>
        </Tooltip.Content>
      </Tooltip.Root>
      <div class='grow'>
        <Slider
          type='single'
          min={0}
          max={seekResolution}
          disabled={scrollMax === 0}
          dir='rtl'
          bind:value={getSeekValue, setSeekValue}/>
      </div>
      <Tooltip.Root>
        <Tooltip.Trigger
          class={buttonVariants({ size: 'icon-lg', variant: 'outline' })}
          aria-label={m.bookmark_open()}
          onclick={() => isOpenBookmarksSheet = true}>
          <IconBookmark/>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>{m.bookmark_title()}</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </footer>
  {/if}
</div>

<BookmarksSheet
  bind:open={isOpenBookmarksSheet}
  {loadedNovelDocuments}
  onClickLocationButton={onClickBookmarkLocationButton}
  onClickAddToSelectedTextsButton={onClickAddBookmarkToSelectedTextsButton}/>
