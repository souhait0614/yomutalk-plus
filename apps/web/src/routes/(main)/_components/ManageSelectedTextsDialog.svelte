<script lang='ts'>
  import {
    IconKeyboard,
    IconPlayerPlay,
    IconPlayerStop,
    IconTrash,
  } from '@tabler/icons-svelte';
  import BookmarkPlus from '@tabler/icons-svelte/icons/bookmark-plus';
  import { autoStartPlayback, ttsPreset } from '$lib/appSettings.svelte';
  import NovelInlineContent from '$lib/components/NovelInlineContent.svelte';
  import { defaultTtsPresetKey } from '$lib/constants';
  import { m } from '$lib/paraglide/messages';
  import { Badge } from '$lib/shadcn-svelte/components/ui/badge';
  import {
    Button,
    buttonVariants,
  } from '$lib/shadcn-svelte/components/ui/button';
  import * as Dialog from '$lib/shadcn-svelte/components/ui/dialog';
  import * as Field from '$lib/shadcn-svelte/components/ui/field';
  import { Input } from '$lib/shadcn-svelte/components/ui/input';
  import * as Item from '$lib/shadcn-svelte/components/ui/item';
  import {
    NativeSelect,
    NativeSelectOptGroup,
    NativeSelectOption,
  } from '$lib/shadcn-svelte/components/ui/native-select';
  import { Switch } from '$lib/shadcn-svelte/components/ui/switch';
  import { ttsPresetEntries, ttsPresetGroups } from '$lib/tts';

  import type { SelectedTextMap } from '../_types';

  interface ManageSelectedTextsDialogProps {
    open: boolean;
    readonly isPlaying: boolean;
    readonly selectedTextMap: SelectedTextMap;

    readonly onClickPlayButton: () => void;
    readonly onClickAddSelectedTextButton: (text: string) => void;
    readonly onClickAddBookmarkButton: (selectedTextId: string) => void;
    readonly onClickDeleteButton: (selectedTextId: string) => void;
    readonly onClickDeleteAllButton: () => void;
  }

  let {
    open = $bindable(),
    selectedTextMap,
    isPlaying,
    onClickPlayButton,
    onClickAddSelectedTextButton,
    onClickAddBookmarkButton,
    onClickDeleteButton,
    onClickDeleteAllButton,
  }: ManageSelectedTextsDialogProps = $props();

  const selectedTextEntries = $derived(Array.from(selectedTextMap.entries()));

  let openAddSelectedTextDialog = $state(false);
  let addSelectedTextInput = $state('');

  const defaultTtsPreset = ttsPresetEntries.find(({ key }) => key === defaultTtsPresetKey);
  const getTtsPreset = () => ttsPreset.current ?? '';
  const setTtsPreset = (preset: string | undefined) => {
    if (!preset) {
      ttsPreset.current = null;
    } else {
      ttsPreset.current = preset;
    }
  };

  const defaultTtsPresetLabel = $derived(m.tts_default_preset({ preset: defaultTtsPreset?.preset.name ?? '' }));

  const handleAddSelectedTextFormSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!addSelectedTextInput.trim()) return;
    onClickAddSelectedTextButton(addSelectedTextInput);
    openAddSelectedTextDialog = false;
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Content
    class='
      flex max-h-[calc(100dvh-(--spacing(8)))] flex-col
      sm:max-w-2xl
    '>
    <Dialog.Header>
      <Dialog.Title>{m.tts_manage()}</Dialog.Title>
    </Dialog.Header>
    <div class='flex grow flex-col overflow-y-auto rounded-2xl border'>
      {#if selectedTextEntries.length > 0}
        <ol class='flex flex-col gap-2 p-2'>
          {#each selectedTextEntries as [selectedTextId, selectedText], index (selectedTextId)}
            <Item.Root variant='muted' size='xs'>
              {#snippet child({ props })}
                <li {...props}>
                  <Item.Media>
                    <Badge
                      variant='outline'
                      class='h-6 min-w-6 rounded-full p-0 tabular-nums'>
                      {index + 1}
                    </Badge>
                  </Item.Media>
                  <Item.Content>
                    <Item.Title>
                      <NovelInlineContent inlines={selectedText.inlines}/>
                    </Item.Title>
                    {#if selectedText.status === 'preparing'}
                      <Item.Description class='shimmer'>
                        {m.tts_state_preparing()}
                      </Item.Description>
                    {:else if selectedText.status === 'prepared'}
                      <Item.Description>
                        {m.tts_state_ready()}
                      </Item.Description>
                    {:else}
                      <Item.Description class='text-destructive'>
                        {m.tts_state_failed()}
                      </Item.Description>
                    {/if}
                  </Item.Content>
                  <Item.Actions>
                    <Button
                      size='icon'
                      variant='outline'
                      aria-label={m.bookmark_add()}
                      onclick={() => onClickAddBookmarkButton(selectedTextId)}>
                      <BookmarkPlus/>
                    </Button>
                    <Button
                      size='icon'
                      variant='outline'
                      aria-label={m.common_delete()}
                      onclick={() => onClickDeleteButton(selectedTextId)}>
                      <IconTrash/>
                    </Button>
                  </Item.Actions>
                </li>
              {/snippet}
            </Item.Root>
          {/each}
        </ol>
      {:else}
        <p class='px-4 py-8 text-center text-muted-foreground'>
          {m.tts_no_texts()}
        </p>
      {/if}
      <div
        class='
          sticky bottom-0 flex w-full items-center justify-between gap-2
          bg-muted p-2
        '>
        <div class='flex items-center gap-2'>
          <Button
            variant='destructive'
            onclick={onClickDeleteAllButton}
            disabled={selectedTextEntries.length === 0}>
            <IconTrash/> {m.tts_delete_all()}
          </Button>
        </div>
        <div class='flex items-center gap-2'>
          <Dialog.Root
            bind:open={openAddSelectedTextDialog}
            onOpenChangeComplete={() => (addSelectedTextInput = '')}>
            <Dialog.Trigger class={buttonVariants({ variant: 'outline' })}>
              <IconKeyboard/> {m.tts_manual_input()}
            </Dialog.Trigger>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{m.tts_manual_input()}</Dialog.Title>
                <Dialog.Description>
                  {m.tts_manual_input_description()}
                </Dialog.Description>
              </Dialog.Header>
              <form class='contents' onsubmit={handleAddSelectedTextFormSubmit}>
                <Input bind:value={addSelectedTextInput}/>
                <Dialog.Footer>
                  <Dialog.Close class={buttonVariants({ variant: 'outline' })}>
                    {m.common_cancel()}
                  </Dialog.Close>
                  <Button
                    variant='default'
                    type='submit'
                    disabled={!addSelectedTextInput.trim()}>
                    {m.tts_register()}
                  </Button>
                </Dialog.Footer>
              </form>
            </Dialog.Content>
          </Dialog.Root>
          <Button
            size='icon'
            aria-label={isPlaying ? m.tts_stop() : m.tts_play()}
            onclick={onClickPlayButton}
            disabled={selectedTextEntries.length === 0}>
            {#if isPlaying}
              <IconPlayerStop/>
            {:else}
              <IconPlayerPlay/>
            {/if}
          </Button>
        </div>
      </div>
    </div>
    <Field.Group>
      <Field.Set>
        <Field.Legend>{m.tts_settings()}</Field.Legend>
        <Field.Group>
          <Field.Field orientation='responsive'>
            <Field.Label for='ttsPreset'>{m.tts_voice()}</Field.Label>
            <NativeSelect
              id='ttsPreset'
              size='sm'
              bind:value={getTtsPreset, setTtsPreset}
              aria-label={m.tts_voice()}>
              <NativeSelectOptGroup label={m.tts_default()}>
                <NativeSelectOption value=''>{defaultTtsPresetLabel}</NativeSelectOption>
              </NativeSelectOptGroup>
              {#each ttsPresetGroups as group (group.module.id)}
                <NativeSelectOptGroup label={group.module.name}>
                  {#each group.entries as entry (entry.key)}
                    <NativeSelectOption value={entry.key}>
                      {entry.preset.name}
                    </NativeSelectOption>
                  {/each}
                </NativeSelectOptGroup>
              {/each}
            </NativeSelect>
          </Field.Field>
          <Field.Field orientation='horizontal'>
            <Field.Content>
              <Field.Label for='autoStartPlayback'>{m.tts_auto_start()}</Field.Label>
              <Field.Description>
                {m.tts_auto_start_description()}
              </Field.Description>
            </Field.Content>
            <Switch id='autoStartPlayback' bind:checked={autoStartPlayback.current}/>
          </Field.Field>
        </Field.Group>
      </Field.Set>
    </Field.Group>
  </Dialog.Content>
</Dialog.Root>
