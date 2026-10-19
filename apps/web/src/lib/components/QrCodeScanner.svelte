<script lang='ts' module>
  import { prepareZXingModule } from 'zxing-wasm/reader';
  import zxingReaderWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (
        path.endsWith('.wasm') ? zxingReaderWasmUrl : `${prefix}${path}`
      ),
    },
  });
</script>

<script lang='ts'>
  import type { HTMLAttributes } from 'svelte/elements';
  import { onMount } from 'svelte';
  import { readBarcodes } from 'zxing-wasm/reader';

  interface QrCodeScannerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    readonly onReadQrCode: (text: string) => boolean;
    readonly onError: (error: unknown) => void;
  }

  let { onReadQrCode, onError, ...restProps }: QrCodeScannerProps = $props();

  const scanIntervalMs = 200;
  const maxDecodeWidth = 640;
  const maxDecodeFailureCount = 5;

  let video: HTMLVideoElement;

  onMount(() => {
    let stopped = false;
    let isDecoding = false;
    let decodeFailureCount = 0;
    let scanTimer: ReturnType<typeof setInterval> | undefined;
    let stream: MediaStream | undefined;
    let canvas: HTMLCanvasElement | undefined;

    const stop = () => {
      stopped = true;
      if (scanTimer !== undefined) clearInterval(scanTimer);
      for (const track of stream?.getTracks() ?? []) track.stop();
      stream = undefined;
    };

    const getCanvas = (): HTMLCanvasElement => {
      canvas ??= document.createElement('canvas');
      return canvas;
    };

    const decodeFrame = async () => {
      if (stopped || isDecoding || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      const { videoWidth, videoHeight } = video;
      if (videoWidth === 0 || videoHeight === 0) return;

      isDecoding = true;
      try {
        const scale = Math.min(1, maxDecodeWidth / videoWidth);
        const width = Math.round(videoWidth * scale);
        const height = Math.round(videoHeight * scale);
        const frameCanvas = getCanvas();
        frameCanvas.width = width;
        frameCanvas.height = height;
        const context = frameCanvas.getContext('2d', { willReadFrequently: true });
        if (!context) return;

        context.drawImage(video, 0, 0, width, height);
        const results = await readBarcodes(context.getImageData(0, 0, width, height), {
          formats: ['QRCode'],
          maxNumberOfSymbols: 1,
        });
        decodeFailureCount = 0;
        const text = results[0]?.text;
        if (text === undefined) return;
        if (onReadQrCode(text)) stop();
      } catch (error) {
        // QRコードが見つからないだけの場合は例外にならないため、連続で失敗するのは読み取り器を用意できていないとき
        decodeFailureCount += 1;
        if (decodeFailureCount <= maxDecodeFailureCount) return;
        stop();
        onError(error);
      } finally {
        isDecoding = false;
      }
    };

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (stopped) {
          stop();
          return;
        }
        video.srcObject = stream;
        await video.play();
      } catch (error) {
        stop();
        onError(error);
        return;
      }
      scanTimer = setInterval(() => void decodeFrame(), scanIntervalMs);
    };

    void startCamera();

    return stop;
  });
</script>

<div {...restProps}>
  <div
    class='
      mx-auto aspect-square w-full max-w-[min(100%,45dvh)] overflow-hidden
      rounded-4xl bg-black
    '>
    <div class='relative size-full'>
      <video
        bind:this={video}
        class='size-full object-cover'
        muted
        playsinline></video>
      <div
        class='
          pointer-events-none absolute inset-0 flex items-center justify-center
        '>
        <div class='size-2/3 rounded-2xl ring-4 ring-white/70 ring-inset'></div>
      </div>
    </div>
  </div>
</div>
