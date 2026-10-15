import type { TtsInstance, TtsModule, TtsPreparedInstance } from '../types.ts';
import { TtsAbortError } from '../errors.ts';

const createInit = (lang: string) => (): TtsInstance => {
  let activePreparedInstance: TtsPreparedInstance | undefined;

  const prepare = (text: string): TtsPreparedInstance => {
    const abortController = new AbortController();
    let stopped = false;

    const preparedInstance: TtsPreparedInstance = {
      ready: Promise.resolve(),
      speak: () => new Promise<void>((resolve, reject) => {
        if (stopped) {
          reject(new TtsAbortError());
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        activePreparedInstance = preparedInstance;
        let settled = false;

        const settle = (callback: () => void) => {
          if (settled) return;
          settled = true;
          abortController.signal.onabort = null;
          if (activePreparedInstance === preparedInstance) activePreparedInstance = undefined;
          callback();
        };
        abortController.signal.onabort = () => {
          settle(() => {
            window.speechSynthesis.cancel();
            reject(new TtsAbortError());
          });
        };

        utterance.onend = () => settle(resolve);
        utterance.onerror = (event) => settle(() => {
          if (event.error === 'canceled' || event.error === 'interrupted') {
            reject(new TtsAbortError());
            return;
          }
          reject(event.error);
        });

        window.speechSynthesis.speak(utterance);
      }),
      stop: () => {
        if (stopped) return;
        stopped = true;
        abortController.abort();
      },
    };

    return preparedInstance;
  };

  return {
    prepare,
    stop: () => activePreparedInstance?.stop(),
  };
};

const module: TtsModule = {
  id: 'speech-synthesis',
  name: 'ブラウザ内蔵読み上げ',
  description: 'Web Speech APIを利用したテキスト読み上げモジュール',
  version: '1.0.0',
  presets: [
    {
      id: 'ja-JP',
      name: 'ブラウザ内蔵読み上げ 日本語',
      init: createInit('ja-JP'),
    },
    {
      id: 'en-US',
      name: 'ブラウザ内蔵読み上げ 英語',
      init: createInit('en-US'),
    },
  ],
};

export default module;
