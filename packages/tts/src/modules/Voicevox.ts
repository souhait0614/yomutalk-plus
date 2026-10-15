import { apiClient } from '@repo/api/client';

import type { TtsInstance, TtsModule, TtsPreparedInstance, TtsPreset } from '../types.ts';
import { TtsAbortError } from '../errors.ts';

const synthesize = async (text: string, speaker: number, signal: AbortSignal): Promise<Blob> => {
  const response = await apiClient.tts.voicevox.$post({ json: { text, speaker } }, { init: { signal } });
  if (!response.ok) throw new Error(`Failed to fetch VOICEVOX audio: ${response.status} ${response.statusText}`);
  return response.blob();
};

const createInit = (speaker: number) => (): TtsInstance => {
  let activePreparedInstance: TtsPreparedInstance | undefined;

  const prepare = (text: string): TtsPreparedInstance => {
    const abortController = new AbortController();
    let audio: HTMLAudioElement | undefined;
    let audioUrl: string | undefined;
    let stopped = false;

    const audioBlobPromise = synthesize(text, speaker, abortController.signal).catch((error: unknown) => {
      if (abortController.signal.aborted) throw new TtsAbortError();
      throw error;
    });

    const preparedInstance: TtsPreparedInstance = {
      ready: audioBlobPromise.then(() => undefined),
      speak: async () => {
        if (stopped) throw new TtsAbortError();
        activePreparedInstance = preparedInstance;

        try {
          const audioBlob = await audioBlobPromise;
          if (abortController.signal.aborted) throw new TtsAbortError();

          audioUrl = URL.createObjectURL(audioBlob);
          const currentAudio = new Audio(audioUrl);
          audio = currentAudio;

          await new Promise<void>((resolve, reject) => {
            const onAbort = () => reject(new TtsAbortError());
            abortController.signal.addEventListener('abort', onAbort, { once: true });

            currentAudio.onended = () => {
              abortController.signal.removeEventListener('abort', onAbort);
              resolve();
            };
            currentAudio.onerror = (event) => {
              abortController.signal.removeEventListener('abort', onAbort);
              reject(event);
            };
            currentAudio.play().catch((error: unknown) => {
              abortController.signal.removeEventListener('abort', onAbort);
              reject(error);
            });
          });
        } finally {
          if (activePreparedInstance === preparedInstance) activePreparedInstance = undefined;
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          audio = undefined;
          audioUrl = undefined;
        }
      },
      stop: () => {
        if (stopped) return;
        stopped = true;
        abortController.abort();
        audio?.pause();
        if (audio) audio.currentTime = 0;
      },
    };

    return preparedInstance;
  };

  return {
    prepare,
    stop: () => activePreparedInstance?.stop(),
  };
};

// NOTE: スタイルIDは VOICEVOX ENGINE の /speakers に準拠。名前はクレジット表記を兼ねる
const speakers: ReadonlyArray<{ id: number; name: string; }> = [
  { id: 3, name: 'VOICEVOX:ずんだもん' },
  { id: 2, name: 'VOICEVOX:四国めたん' },
  { id: 8, name: 'VOICEVOX:春日部つむぎ' },
  { id: 10, name: 'VOICEVOX:雨晴はう' },
  { id: 9, name: 'VOICEVOX:波音リツ' },
  { id: 11, name: 'VOICEVOX:玄野武宏' },
  { id: 12, name: 'VOICEVOX:白上虎太郎' },
  { id: 13, name: 'VOICEVOX:青山龍星' },
  { id: 14, name: 'VOICEVOX:冥鳴ひまり' },
  { id: 16, name: 'VOICEVOX:九州そら' },
  { id: 20, name: 'VOICEVOX:もち子(cv 明日葉よもぎ)' },
  { id: 21, name: 'VOICEVOX:剣崎雌雄' },
  { id: 23, name: 'VOICEVOX:WhiteCUL' },
  { id: 27, name: 'VOICEVOX:後鬼' },
  { id: 29, name: 'VOICEVOX:No.7' },
  { id: 42, name: 'VOICEVOX:ちび式じい' },
  { id: 43, name: 'VOICEVOX:櫻歌ミコ' },
  { id: 46, name: 'VOICEVOX:小夜/SAYO' },
  { id: 47, name: 'VOICEVOX:ナースロボ＿タイプＴ' },
  { id: 51, name: 'VOICEVOX:†聖騎士 紅桜†' },
  { id: 52, name: 'VOICEVOX:雀松朱司' },
  { id: 53, name: 'VOICEVOX:麒ヶ島宗麟' },
  { id: 54, name: 'VOICEVOX:春歌ナナ' },
  { id: 55, name: 'VOICEVOX:猫使アル' },
  { id: 58, name: 'VOICEVOX:猫使ビィ' },
  { id: 61, name: 'VOICEVOX:中国うさぎ' },
  { id: 67, name: 'VOICEVOX:栗田まろん' },
  { id: 68, name: 'VOICEVOX:あいえるたん' },
  { id: 69, name: 'VOICEVOX:満別花丸' },
  { id: 74, name: 'VOICEVOX:琴詠ニア' },
  { id: 89, name: 'VOICEVOX:Voidoll(CV:丹下桜)' },
  { id: 90, name: 'VOICEVOX:ぞん子' },
  { id: 94, name: 'VOICEVOX:中部つるぎ' },
  { id: 99, name: 'VOICEVOX:離途' },
  { id: 100, name: 'VOICEVOX:黒沢冴白' },
  { id: 102, name: 'VOICEVOX:ユーレイちゃん(CV:神崎零)' },
  { id: 107, name: 'VOICEVOX:東北ずん子' },
  { id: 108, name: 'VOICEVOX:東北きりたん' },
  { id: 109, name: 'VOICEVOX:東北イタコ' },
  { id: 113, name: 'VOICEVOX:あんこもん' },
  { id: 118, name: 'VOICEVOX:夜語トバリ' },
  { id: 122, name: 'VOICEVOX:暁記ミタマ' },
  { id: 126, name: 'VOICEVOX:里石ユカ（つぼみ）' },
];

const presets: ReadonlyArray<TtsPreset> = speakers.map(({ id, name }) => ({ id: String(id), name, init: createInit(id) }));

const module: TtsModule = {
  id: 'voicevox',
  name: 'VOICEVOX',
  description: 'VOICEVOX ENGINE APIを利用したテキスト読み上げモジュール',
  version: '1.0.0',
  presets,
};

export default module;
