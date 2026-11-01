import assert from 'node:assert/strict';
import test from 'node:test';

import type { TtsInstance, TtsPreset } from '../src/types.ts';
import { createTtsController } from '../src/createTtsController.ts';
import { isTtsAbortError, TtsAbortError } from '../src/errors.ts';

const createPreset = (prepare: TtsInstance['prepare']): TtsPreset => ({
  id: 'test',
  name: 'Test',
  init: () => ({ prepare, stop: () => {} }),
});

test('initializes once and prepares each text eagerly', async () => {
  let initialized = 0;
  const texts: string[] = [];
  const spoken: string[] = [];
  const preset = createPreset((text) => {
    texts.push(text);
    return {
      ready: Promise.resolve(),
      speak: () => {
        spoken.push(text);
        return Promise.resolve();
      },
      stop: () => {},
    };
  });
  const init = preset.init;
  preset.init = () => {
    initialized += 1;
    return init();
  };
  const controller = createTtsController(preset);
  const first = controller.prepare('first');
  const second = controller.prepare('second');

  await Promise.all([first.ready, second.ready]);
  assert.equal(initialized, 1);
  assert.deepEqual(texts, ['first', 'second']);
  await first.speak();
  await second.speak();
  assert.deepEqual(spoken, texts);
});

test('waits for readiness before speaking', async () => {
  const ready = Promise.withResolvers<void>();
  let spoken = false;
  const controller = createTtsController(createPreset(() => ({
    ready: ready.promise,
    speak: () => {
      spoken = true;
      return Promise.resolve();
    },
    stop: () => {},
  })));

  const playback = controller.prepare('text').speak();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(spoken, false);
  ready.resolve();
  await playback;
  assert.equal(spoken, true);
});

test('does not speak a stopped generation after readiness resolves', async () => {
  const ready = Promise.withResolvers<void>();
  let spoken = false;
  let stopped = 0;
  const controller = createTtsController(createPreset(() => ({
    ready: ready.promise,
    speak: () => {
      spoken = true;
      return Promise.resolve();
    },
    stop: () => {
      stopped += 1;
    },
  })));
  const prepared = controller.prepare('text');
  const playback = prepared.speak();
  await Promise.resolve();
  await Promise.resolve();
  prepared.stop();
  ready.resolve();

  await assert.rejects(playback, TtsAbortError);
  assert.equal(spoken, false);
  assert.equal(stopped, 1);
});

test('discards stale preparation while asynchronous initialization is pending', async () => {
  const initialized = Promise.withResolvers<TtsInstance>();
  let preparations = 0;
  const controller = createTtsController({ id: 'test', name: 'Test', init: () => initialized.promise });
  const prepared = controller.prepare('text');
  const staleReadiness = assert.rejects(prepared.ready, TtsAbortError);
  prepared.stop();
  const playback = prepared.speak();
  initialized.resolve({
    prepare: () => {
      preparations += 1;
      return { ready: Promise.resolve(), speak: () => Promise.resolve(), stop: () => {} };
    },
    stop: () => {},
  });

  await Promise.all([staleReadiness, playback]);
  assert.equal(preparations, 1);
});

test('creates a fresh delegate when replaying after stop', async () => {
  let preparations = 0;
  const calls: string[] = [];
  const controller = createTtsController(createPreset(() => {
    const generation = ++preparations;
    return {
      ready: Promise.resolve(),
      speak: () => {
        calls.push(`speak:${generation}`);
        return Promise.resolve();
      },
      stop: () => {
        calls.push(`stop:${generation}`);
      },
    };
  }));
  const prepared = controller.prepare('text');
  await prepared.ready;
  await prepared.speak();
  prepared.stop();
  await prepared.speak();

  assert.equal(preparations, 2);
  assert.deepEqual(calls, ['speak:1', 'stop:1', 'speak:2']);
});

test('controller stop cancels the active playback', async () => {
  const started = Promise.withResolvers<void>();
  const speech = Promise.withResolvers<void>();
  let stopped = 0;
  const controller = createTtsController(createPreset(() => ({
    ready: Promise.resolve(),
    speak: () => {
      started.resolve();
      return speech.promise;
    },
    stop: () => {
      stopped += 1;
      speech.reject(new TtsAbortError());
    },
  })));
  const playback = controller.prepare('text').speak();
  await started.promise;
  controller.stop();

  await assert.rejects(playback, TtsAbortError);
  assert.equal(stopped, 1);
});

test('propagates initialization errors through readiness and playback', async () => {
  const error = new Error('Initialization failed');
  const controller = createTtsController({
    id: 'test',
    name: 'Test',
    init: () => Promise.reject(error),
  });
  const prepared = controller.prepare('text');

  await assert.rejects(prepared.ready, error);
  await assert.rejects(prepared.speak(), error);
});

test('handles preparation rejection during replay without an unhandled promise', async () => {
  const error = new Error('Preparation failed');
  let preparations = 0;
  const controller = createTtsController(createPreset(() => {
    preparations += 1;
    const ready = preparations === 1 ? Promise.resolve() : Promise.reject(error);
    return { ready, speak: () => ready, stop: () => {} };
  }));
  const prepared = controller.prepare('text');
  await prepared.ready;
  prepared.stop();

  await assert.rejects(prepared.speak(), error);
  await new Promise<void>((resolve) => setImmediate(resolve));
});

test('recognizes abort errors across duplicate module instances', () => {
  const duplicateError = new Error('Stopped');
  duplicateError.name = 'TtsAbortError';
  assert.equal(isTtsAbortError(new TtsAbortError()), true);
  assert.equal(isTtsAbortError(duplicateError), true);
  assert.equal(isTtsAbortError(new Error('Other error')), false);
  assert.equal(isTtsAbortError('TtsAbortError'), false);
});
