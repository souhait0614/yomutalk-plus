<script module lang='ts'>
  export type TextInsertion = {
    kind: 'text';
    prefix: string;
    suffix?: string;
    placeholder?: string;
    suffixSelection?: { start: number; end: number; };
    wholeLine?: boolean;
  } | {
    kind: 'heading';
    level: '大' | '中' | '小';
  };
</script>

<script lang='ts'>
  import type { LoadedNovelDocumentFileType } from '$lib/db';
  import { IconBold, IconBrackets, IconHeading, IconHighlight, IconItalic, IconPageBreak, IconPencilPlus, IconSpace, IconTypography } from '@tabler/icons-svelte';
  import { m } from '$lib/paraglide/messages';
  import { buttonVariants } from '$lib/shadcn-svelte/components/ui/button';
  import * as DropdownMenu from '$lib/shadcn-svelte/components/ui/dropdown-menu';
  import * as Tooltip from '$lib/shadcn-svelte/components/ui/tooltip';

  interface NovelTextToolbarProps {
    readonly fileType: LoadedNovelDocumentFileType;
    readonly disabled: boolean;
    readonly oninsert: (insertion: TextInsertion) => void;
  }

  const { fileType, disabled, oninsert }: NovelTextToolbarProps = $props();
  const brackets = [
    ['「', '」'], ['『', '』'], ['（', '）'], ['(', ')'],
    ['〔', '〕'], ['［', '］'], ['｛', '｝'], ['{', '}'],
    ['〈', '〉'], ['《', '》'], ['【', '】'], ['〖', '〗'],
    ['〘', '〙'], ['〚', '〛'], ['“', '”'], ['‘', '’'],
  ] as const;
  const punctuation = ['。', '．', '｡', '、', '，', '､', '？', '?', '⁇', '⁈', '！', '!', '‼', '⁉', '…', '‥'];
  const headingLevels = ['大', '中', '小'] as const;
  const getHeadingLabel = (level: typeof headingLevels[number]) => {
    if (level === '大') return m.editor_heading_large();
    if (level === '中') return m.editor_heading_medium();
    return m.editor_heading_small();
  };
  const toolClass = buttonVariants({ variant: 'ghost', size: 'icon-sm' });
</script>

<Tooltip.Provider delayDuration={300}>
  <div class='flex shrink-0 flex-wrap items-center gap-1' aria-label={m.editor_notation_tools()}>
    {#each brackets.slice(0, 2) as [prefix, suffix] (prefix)}
      <Tooltip.Root>
        <Tooltip.Trigger
          class={toolClass}
          {disabled}
          aria-label={m.editor_insert_notation({ notation: `${prefix}${suffix}` })}
          onclick={() => oninsert({ kind: 'text', prefix, suffix })}>
          {prefix}{suffix}
        </Tooltip.Trigger>
        <Tooltip.Content>{m.editor_insert_notation({ notation: `${prefix}${suffix}` })}</Tooltip.Content>
      </Tooltip.Root>
    {/each}
    <Tooltip.Root>
      <Tooltip.Trigger
        class={toolClass}
        {disabled}
        aria-label={m.editor_insert_ellipsis()}
        onclick={() => oninsert({ kind: 'text', prefix: '…' })}>
        …
      </Tooltip.Trigger>
      <Tooltip.Content>{m.editor_ellipsis()}</Tooltip.Content>
    </Tooltip.Root>
    <Tooltip.Root>
      <Tooltip.Trigger
        class={toolClass}
        {disabled}
        aria-label={m.editor_insert_full_width_space()}
        onclick={() => oninsert({ kind: 'text', prefix: '\u3000' })}>
        <IconSpace/>
      </Tooltip.Trigger>
      <Tooltip.Content>{m.editor_full_width_space()}</Tooltip.Content>
    </Tooltip.Root>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class={toolClass}
        {disabled}
        aria-label={m.editor_brackets()}
        title={m.editor_brackets()}>
        <IconBrackets/>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>{m.editor_brackets()}</DropdownMenu.Label>
        <DropdownMenu.Group class='grid grid-cols-4'>
          {#each brackets as [prefix, suffix] (prefix)}
            <DropdownMenu.Item
              class='justify-center'
              aria-label={m.editor_insert_notation({ notation: `${prefix}${suffix}` })}
              onSelect={() => oninsert({ kind: 'text', prefix, suffix })}>
              {prefix}{suffix}
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class={toolClass}
        {disabled}
        aria-label={m.editor_punctuation()}
        title={m.editor_punctuation()}>
        、。
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>{m.editor_punctuation()}</DropdownMenu.Label>
        <DropdownMenu.Group class='grid grid-cols-4'>
          {#each punctuation as symbol (symbol)}
            <DropdownMenu.Item
              class='justify-center'
              aria-label={m.editor_insert_notation({ notation: symbol })}
              onSelect={() => oninsert({ kind: 'text', prefix: symbol })}>
              {symbol}
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
    {#if fileType === 'aozoratext'}
      <span class='mx-1 h-5 border-l' aria-hidden='true'></span>
      <Tooltip.Root>
        <Tooltip.Trigger
          class={toolClass}
          {disabled}
          aria-label={m.editor_insert_ruby()}
          onclick={() => oninsert({ kind: 'text', prefix: '｜', suffix: '《よみ》', placeholder: '漢字', suffixSelection: { start: 1, end: 3 } })}>
          <IconTypography/>
        </Tooltip.Trigger>
        <Tooltip.Content>{m.editor_ruby()}</Tooltip.Content>
      </Tooltip.Root>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class={toolClass}
          {disabled}
          aria-label={m.editor_heading()}
          title={m.editor_heading()}>
          <IconHeading/>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {#each headingLevels as level (level)}
            <DropdownMenu.Item onSelect={() => oninsert({ kind: 'heading', level })}>
              {getHeadingLabel(level)}
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class={toolClass}
          {disabled}
          aria-label={m.editor_aozora_notes()}
          title={m.editor_aozora_notes()}>
          <IconPencilPlus/>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => oninsert({ kind: 'text', prefix: '※［＃', suffix: '］《よみ》', placeholder: '外字の説明' })}>
            {m.editor_gaiji()}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => oninsert({ kind: 'text', prefix: '［＃', suffix: '］', placeholder: '注記' })}>
            {m.editor_note()}
          </DropdownMenu.Item>
          <DropdownMenu.Separator/>
          <DropdownMenu.Item onSelect={() => oninsert({ kind: 'text', prefix: '［＃１字下げ］', wholeLine: true })}>
            {m.editor_indent()}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => oninsert({ kind: 'text', prefix: '［＃ここから１字下げ］\n', suffix: '\n［＃ここで字下げ終わり］', placeholder: '本文' })}>
            {m.editor_indent_block()}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => oninsert({ kind: 'text', prefix: '［＃ここで字下げ終わり］' })}>
            {m.editor_indent_end()}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => oninsert({ kind: 'text', prefix: '', suffix: '［＃地付き］', wholeLine: true })}>
            {m.editor_attach_bottom()}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {:else if fileType === 'pixivnovel'}
      <span class='mx-1 h-5 border-l' aria-hidden='true'></span>
      <Tooltip.Root>
        <Tooltip.Trigger
          class={toolClass}
          {disabled}
          aria-label={m.editor_insert_ruby()}
          onclick={() => oninsert({ kind: 'text', prefix: '[[rb:', suffix: ' > よみ]]', placeholder: '漢字', suffixSelection: { start: 3, end: 5 } })}>
          <IconTypography/>
        </Tooltip.Trigger>
        <Tooltip.Content>{m.editor_ruby()}</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger
          class={toolClass}
          {disabled}
          aria-label={m.editor_bold()}
          onclick={() => oninsert({ kind: 'text', prefix: '[b:', suffix: ']', placeholder: '太字' })}>
          <IconBold/>
        </Tooltip.Trigger>
        <Tooltip.Content>{m.editor_bold()}</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger
          class={toolClass}
          {disabled}
          aria-label={m.editor_italic()}
          onclick={() => oninsert({ kind: 'text', prefix: '[i:', suffix: ']', placeholder: '斜体' })}>
          <IconItalic/>
        </Tooltip.Trigger>
        <Tooltip.Content>{m.editor_italic()}</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger
          class={toolClass}
          {disabled}
          aria-label={m.editor_emphasis_mark()}
          onclick={() => oninsert({ kind: 'text', prefix: '[[emphasismark:', suffix: '>﹅]]', placeholder: '傍点', suffixSelection: { start: 1, end: 2 } })}>
          <IconHighlight/>
        </Tooltip.Trigger>
        <Tooltip.Content>{m.editor_emphasis_mark()}</Tooltip.Content>
      </Tooltip.Root>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class={toolClass}
          {disabled}
          aria-label={m.editor_pixiv_notes()}
          title={m.editor_pixiv_notes()}>
          <IconPencilPlus/>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => oninsert({ kind: 'text', prefix: '[chapter:', suffix: ']', placeholder: '章タイトル', wholeLine: true })}>
            <IconHeading/> {m.editor_chapter()}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => oninsert({ kind: 'text', prefix: '[newpage]\n', wholeLine: true })}>
            <IconPageBreak/> {m.editor_page_break()}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {/if}
  </div>
</Tooltip.Provider>
