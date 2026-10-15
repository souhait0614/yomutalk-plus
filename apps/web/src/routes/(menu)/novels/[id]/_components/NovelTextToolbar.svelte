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
  import { IconBrackets, IconHeading, IconPencilPlus, IconSpace, IconTypography } from '@tabler/icons-svelte';
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
  const toolClass = buttonVariants({ variant: 'ghost', size: 'icon-sm' });
</script>

<Tooltip.Provider delayDuration={300}>
  <div class='flex shrink-0 flex-wrap items-center gap-1' aria-label='記法ツール'>
    {#each brackets.slice(0, 2) as [prefix, suffix] (prefix)}
      <Tooltip.Root>
        <Tooltip.Trigger
          class={toolClass}
          {disabled}
          aria-label={`${prefix}${suffix}を挿入`}
          onclick={() => oninsert({ kind: 'text', prefix, suffix })}>
          {prefix}{suffix}
        </Tooltip.Trigger>
        <Tooltip.Content>{prefix}{suffix}を挿入</Tooltip.Content>
      </Tooltip.Root>
    {/each}
    <Tooltip.Root>
      <Tooltip.Trigger
        class={toolClass}
        {disabled}
        aria-label='三点リーダーを挿入'
        onclick={() => oninsert({ kind: 'text', prefix: '…' })}>
        …
      </Tooltip.Trigger>
      <Tooltip.Content>三点リーダー</Tooltip.Content>
    </Tooltip.Root>
    <Tooltip.Root>
      <Tooltip.Trigger
        class={toolClass}
        {disabled}
        aria-label='全角空白を挿入'
        onclick={() => oninsert({ kind: 'text', prefix: '\u3000' })}>
        <IconSpace/>
      </Tooltip.Trigger>
      <Tooltip.Content>全角空白</Tooltip.Content>
    </Tooltip.Root>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class={toolClass}
        {disabled}
        aria-label='括弧'
        title='括弧'>
        <IconBrackets/>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>括弧</DropdownMenu.Label>
        <DropdownMenu.Group class='grid grid-cols-4'>
          {#each brackets as [prefix, suffix] (prefix)}
            <DropdownMenu.Item
              class='justify-center'
              aria-label={`${prefix}${suffix}を挿入`}
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
        aria-label='句読点・記号'
        title='句読点・記号'>
        、。
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>句読点・記号</DropdownMenu.Label>
        <DropdownMenu.Group class='grid grid-cols-4'>
          {#each punctuation as symbol (symbol)}
            <DropdownMenu.Item
              class='justify-center'
              aria-label={`${symbol}を挿入`}
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
          aria-label='ルビを挿入'
          onclick={() => oninsert({ kind: 'text', prefix: '｜', suffix: '《よみ》', placeholder: '漢字', suffixSelection: { start: 1, end: 3 } })}>
          <IconTypography/>
        </Tooltip.Trigger>
        <Tooltip.Content>ルビ</Tooltip.Content>
      </Tooltip.Root>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class={toolClass}
          {disabled}
          aria-label='見出し'
          title='見出し'>
          <IconHeading/>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {#each headingLevels as level (level)}
            <DropdownMenu.Item onSelect={() => oninsert({ kind: 'heading', level })}>
              {level}見出し
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class={toolClass}
          {disabled}
          aria-label='青空文庫の注記'
          title='青空文庫の注記'>
          <IconPencilPlus/>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => oninsert({ kind: 'text', prefix: '※［＃', suffix: '］《よみ》', placeholder: '外字の説明' })}>
            外字
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => oninsert({ kind: 'text', prefix: '［＃', suffix: '］', placeholder: '注記' })}>
            注記
          </DropdownMenu.Item>
          <DropdownMenu.Separator/>
          <DropdownMenu.Item onSelect={() => oninsert({ kind: 'text', prefix: '［＃１字下げ］', wholeLine: true })}>
            1字下げ
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => oninsert({ kind: 'text', prefix: '［＃ここから１字下げ］\n', suffix: '\n［＃ここで字下げ終わり］', placeholder: '本文' })}>
            字下げ範囲
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => oninsert({ kind: 'text', prefix: '［＃ここで字下げ終わり］' })}>
            字下げ終わり
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => oninsert({ kind: 'text', prefix: '', suffix: '［＃地付き］', wholeLine: true })}>
            地付き
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {/if}
  </div>
</Tooltip.Provider>
