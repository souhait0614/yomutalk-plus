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

  const defaultTtsPresetLabel = $derived(`デフォルト (${defaultTtsPreset?.preset.name})`);

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
      <Dialog.Title>読み上げ管理・設定</Dialog.Title>
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
                        準備中
                      </Item.Description>
                    {:else if selectedText.status === 'prepared'}
                      <Item.Description>
                        準備完了
                      </Item.Description>
                    {:else}
                      <Item.Description class='text-destructive'>
                        準備に失敗しました
                      </Item.Description>
                    {/if}
                  </Item.Content>
                  <Item.Actions>
                    <Button
                      size='icon'
                      variant='outline'
                      aria-label='ブックマークに追加'
                      onclick={() => onClickAddBookmarkButton(selectedTextId)}>
                      <BookmarkPlus/>
                    </Button>
                    <Button
                      size='icon'
                      variant='outline'
                      aria-label='削除'
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
          読み上げる文章はありません。
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
            <IconTrash/> 一括削除
          </Button>
        </div>
        <div class='flex items-center gap-2'>
          <Dialog.Root
            bind:open={openAddSelectedTextDialog}
            onOpenChangeComplete={() => (addSelectedTextInput = '')}>
            <Dialog.Trigger class={buttonVariants({ variant: 'outline' })}>
              <IconKeyboard/> 文字入力
            </Dialog.Trigger>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>文字入力</Dialog.Title>
                <Dialog.Description>
                  入力した文字を読み上げに登録します
                </Dialog.Description>
              </Dialog.Header>
              <form class='contents' onsubmit={handleAddSelectedTextFormSubmit}>
                <Input bind:value={addSelectedTextInput}/>
                <Dialog.Footer>
                  <Dialog.Close class={buttonVariants({ variant: 'outline' })}>
                    キャンセル
                  </Dialog.Close>
                  <Button
                    variant='default'
                    type='submit'
                    disabled={!addSelectedTextInput.trim()}>
                    登録
                  </Button>
                </Dialog.Footer>
              </form>
            </Dialog.Content>
          </Dialog.Root>
          <Button
            size='icon'
            aria-label={isPlaying ? '停止' : '再生'}
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
        <Field.Legend>設定</Field.Legend>
        <Field.Group>
          <Field.Field orientation='responsive'>
            <Field.Label for='ttsPreset'>読み上げ音声</Field.Label>
            <NativeSelect
              id='ttsPreset'
              size='sm'
              bind:value={getTtsPreset, setTtsPreset}
              aria-label='読み上げ音声'>
              <NativeSelectOptGroup label='デフォルト'>
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
              <Field.Label for='autoStartPlayback'>読み上げ自動開始</Field.Label>
              <Field.Description>
                文字選択後に読み上げを自動で開始します
              </Field.Description>
            </Field.Content>
            <Switch id='autoStartPlayback' bind:checked={autoStartPlayback.current}/>
          </Field.Field>
        </Field.Group>
      </Field.Set>
    </Field.Group>
  </Dialog.Content>
</Dialog.Root>
