<script lang='ts'>
  import {
    IconChevronDown,
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
  import * as Command from '$lib/shadcn-svelte/components/ui/command';
  import * as Dialog from '$lib/shadcn-svelte/components/ui/dialog';
  import * as Field from '$lib/shadcn-svelte/components/ui/field';
  import { Input } from '$lib/shadcn-svelte/components/ui/input';
  import * as Item from '$lib/shadcn-svelte/components/ui/item';
  import { Switch } from '$lib/shadcn-svelte/components/ui/switch';
  import { ttsPresetEntries, ttsPresetGroups } from '$lib/tts';

  import type { SelectedTextMap } from '../_types';

  interface ManageSelectedTextsDialogProps {
    open: boolean;
    readonly isPlaying: boolean;
    readonly selectedTextMap: SelectedTextMap;

    readonly onClickPlayButton: () => void;
    readonly onClickAddSelectedTextButton: (text: string, reading: string | undefined) => void;
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
  let addSelectedTextReadingInput = $state('');
  let openTtsPresetCommandDialog = $state(false);
  let ttsPresetCommandValue = $state('');

  const defaultTtsPresetItemValue = 'tts-preset:default';

  const defaultTtsPreset = ttsPresetEntries.find(({ key }) => key === defaultTtsPresetKey);

  const defaultTtsPresetLabel = $derived(m.tts_default_preset({ preset: defaultTtsPreset?.preset.name ?? '' }));

  const selectedTtsPresetLabel = $derived(
    ttsPresetEntries.find(({ key }) => key === ttsPreset.current)?.preset.name ?? defaultTtsPresetLabel,
  );

  const openTtsPresetCommand = () => {
    ttsPresetCommandValue = ttsPreset.current ?? defaultTtsPresetItemValue;
    openTtsPresetCommandDialog = true;
  };

  const selectTtsPreset = (presetKey: string | null) => {
    ttsPreset.current = presetKey;
    openTtsPresetCommandDialog = false;
  };

  const handleAddSelectedTextFormSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const text = addSelectedTextInput.trim();
    if (!text) return;
    const reading = addSelectedTextReadingInput.trim();
    onClickAddSelectedTextButton(text, reading || undefined);
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
            onOpenChangeComplete={() => {
              addSelectedTextInput = '';
              addSelectedTextReadingInput = '';
            }}>
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
                <Field.Group class='gap-4'>
                  <Field.Field>
                    <Field.Label for='addSelectedTextInput'>{m.tts_text()}</Field.Label>
                    <Input
                      id='addSelectedTextInput'
                      bind:value={addSelectedTextInput}
                      autocomplete='off'/>
                  </Field.Field>
                  <Field.Field>
                    <Field.Label for='addSelectedTextReadingInput'>
                      {m.tts_reading()}
                    </Field.Label>
                    <Input
                      id='addSelectedTextReadingInput'
                      bind:value={addSelectedTextReadingInput}
                      autocomplete='off'/>
                  </Field.Field>
                </Field.Group>
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
            <Button
              id='ttsPreset'
              variant='outline'
              size='sm'
              class='max-w-full min-w-0'
              aria-label={`${m.tts_voice()}: ${selectedTtsPresetLabel}`}
              aria-haspopup='dialog'
              aria-expanded={openTtsPresetCommandDialog}
              onclick={openTtsPresetCommand}>
              <span class='min-w-0 truncate'>{selectedTtsPresetLabel}</span>
              <IconChevronDown class='text-muted-foreground'/>
            </Button>
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

<Command.Dialog
  bind:open={openTtsPresetCommandDialog}
  bind:value={ttsPresetCommandValue}
  title={m.tts_voice()}
  description={m.tts_voice_description()}>
  <Command.Input placeholder={m.tts_voice_search()}/>
  <Command.List aria-label={m.tts_voice()} class='scroll-fade'>
    <Command.Empty>{m.tts_voice_no_results()}</Command.Empty>
    <Command.Group heading={m.tts_default()}>
      <Command.Item
        value={defaultTtsPresetItemValue}
        keywords={[defaultTtsPreset?.preset.name ?? '']}
        data-checked={ttsPreset.current === null}
        onSelect={() => selectTtsPreset(null)}>
        {defaultTtsPreset?.preset.name ?? ''}
      </Command.Item>
    </Command.Group>
    {#each ttsPresetGroups as group (group.module.id)}
      <Command.Group heading={group.module.name}>
        {#each group.entries as entry (entry.key)}
          <Command.Item
            value={entry.key}
            keywords={[entry.preset.name, group.module.name]}
            data-checked={ttsPreset.current === entry.key}
            onSelect={() => selectTtsPreset(entry.key)}>
            {entry.preset.name}
          </Command.Item>
        {/each}
      </Command.Group>
    {/each}
  </Command.List>
</Command.Dialog>
