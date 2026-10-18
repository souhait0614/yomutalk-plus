export { createTtsController } from './createTtsController.ts';
export { isTtsAbortError, TtsAbortError } from './errors.ts';
export { default as speechSynthesisModule } from './modules/SpeechSynthesis.ts';
export { default as voicevoxModule } from './modules/Voicevox.ts';
export type { TtsInstance, TtsModule, TtsPreparedInstance, TtsPreset } from './types.ts';
