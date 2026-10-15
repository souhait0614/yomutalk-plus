<script lang='ts'>
  import type { HTMLAttributes } from 'svelte/elements';
  import { generate } from 'lean-qr';
  let canvas: HTMLCanvasElement;

  interface QRCodeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    text: string;
  }
  const { text, ...rest }: QRCodeProps = $props();

  $effect(() => {
    const qr = generate(text);
    qr.toCanvas(canvas);
  });
</script>

<div {...rest}>
  <canvas
    bind:this={canvas}
    class='aspect-square size-full [image-rendering:pixelated]'></canvas>
</div>
