import type { TtsInstance, TtsPreparedInstance, TtsPreset } from './types.ts';
import { TtsAbortError } from './errors.ts';

export const createTtsController = (preset: TtsPreset): TtsInstance => {
  const instancePromise = Promise.resolve(preset.init());
  let activePlayback: { preparedInstance: TtsPreparedInstance; } | undefined;

  return {
    prepare: (text) => {
      let generation = 0;
      let delegate: TtsPreparedInstance | undefined;

      const createDelegate = (targetGeneration: number) => instancePromise.then((instance) => {
        if (targetGeneration !== generation) throw new TtsAbortError();
        const nextDelegate = instance.prepare(text);
        delegate = nextDelegate;
        return nextDelegate;
      });

      let delegatePromise = createDelegate(generation);
      let readyPromise = delegatePromise.then((instance) => instance.ready);
      let shouldPrepareAgain = false;

      const preparedInstance: TtsPreparedInstance = {
        get ready() {
          return readyPromise;
        },
        speak: async () => {
          if (shouldPrepareAgain) {
            shouldPrepareAgain = false;
            delegatePromise = createDelegate(generation);
            readyPromise = delegatePromise.then((instance) => instance.ready);
          }
          const playback = { preparedInstance };
          activePlayback = playback;
          const currentGeneration = generation;
          const currentDelegatePromise = delegatePromise;
          const currentReadyPromise = readyPromise;
          try {
            await currentReadyPromise;
            const instance = await currentDelegatePromise;
            if (currentGeneration !== generation) throw new TtsAbortError();
            await instance.speak();
          } finally {
            if (activePlayback === playback) activePlayback = undefined;
          }
        },
        stop: () => {
          generation += 1;
          shouldPrepareAgain = true;
          delegate?.stop();
          delegate = undefined;
        },
      };

      return preparedInstance;
    },
    stop: () => activePlayback?.preparedInstance.stop(),
  };
};
