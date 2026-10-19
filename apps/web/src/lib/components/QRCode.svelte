<script lang='ts'>
  import type { HTMLAttributes } from 'svelte/elements';
  import { generate } from 'lean-qr';
  let canvas: HTMLCanvasElement;

  interface QRCodeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    text: string;
  }
  const { text, ...rest }: QRCodeProps = $props();

  const quietZoneModules = 4;

  $effect(() => {
    const qr = generate(text);
    // ダークテーマの背景でも読み取れるように、白地・黒モジュールで描画する
    qr.toCanvas(canvas, { pad: quietZoneModules, on: [0, 0, 0, 255], off: [255, 255, 255, 255] });
  });
</script>

<div {...rest}>
  <canvas
    bind:this={canvas}
    class='aspect-square size-full [image-rendering:pixelated]'></canvas>
</div>
