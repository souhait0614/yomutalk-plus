<script lang='ts' module>
  import type { WithElementRef } from '$lib/shadcn-svelte/utils';
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
  import type { VariantProps } from 'tailwind-variants';
  import { itemVariants } from '$lib/shadcn-svelte/components/ui/item/item.svelte';
  import { cn } from '$lib/shadcn-svelte/utils';
  import { tv } from 'tailwind-variants';

  export const navigationItemVariants = tv({
    extend: itemVariants,
    base: `
      cursor-pointer border-transparent text-left select-none
      hover:bg-muted
      active:bg-muted/80
      disabled:pointer-events-none disabled:opacity-50
      aria-disabled:pointer-events-none aria-disabled:opacity-50
      **:data-[slot=navigation-item-description]:text-foreground/60
    `,
    variants: {
      variant: {
        destructive: `
          text-destructive
          hover:bg-destructive/10
          focus-visible:border-destructive/40 focus-visible:ring-destructive/20
          active:bg-destructive/20
          **:data-[slot=navigation-item-description]:text-destructive/60
          dark:hover:bg-destructive/20
          dark:focus-visible:ring-destructive/40
        `,
      },
    },
  });

  export type NavigationItemVariant = VariantProps<typeof navigationItemVariants>['variant'];

  export type NavigationItemProps = WithElementRef<HTMLButtonAttributes>
    & WithElementRef<HTMLAnchorAttributes>;
</script>

<script lang='ts'>
  import type { Snippet } from 'svelte';

  let {
    ref = $bindable(null),
    class: className,
    href = undefined,
    type = 'button',
    variant = 'default',
    disabled,
    children,
    startIcon,
    endIcon,
    description,
    ...restProps
  }: NavigationItemProps & {
    variant?: NavigationItemVariant;
    startIcon?: Snippet;
    endIcon?: Snippet;
    description?: Snippet;
  } = $props();

  const classes = $derived(
    cn(navigationItemVariants({ variant }), className),
  );
</script>

{#snippet content()}
  {#if startIcon}
    {@render startIcon()}
  {/if}
  <div class='flex min-w-0 flex-1 flex-col gap-1'>
    {@render children?.()}
    {#if description}
      <span data-slot='navigation-item-description' class='text-sm font-normal'>
        {@render description()}
      </span>
    {/if}
  </div>
  {#if endIcon}
    {@render endIcon()}
  {/if}
{/snippet}

{#if href}
  <!-- eslint-disable svelte/no-navigation-without-resolve -- This component also accepts external URLs. -->
  <a
    bind:this={ref}
    data-slot='navigation-item'
    class={classes}
    href={disabled ? undefined : href}
    aria-disabled={disabled}
    role={disabled ? 'link' : undefined}
    tabindex={disabled ? -1 : undefined}
    {...restProps}>
    {@render content()}
  </a>
  <!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
  <button
    bind:this={ref}
    data-slot='navigation-item'
    class={classes}
    {type}
    {disabled}
    {...restProps}>
    {@render content()}
  </button>
{/if}
