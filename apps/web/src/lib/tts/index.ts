import type { TtsModule, TtsPreset } from '@repo/tts';
import { speechSynthesisModule, voicevoxModule } from '@repo/tts';
import { PUBLIC_VOICEVOX_ENGINE_API_ENABLED } from '$env/static/public';

export const ttsModuleList: ReadonlyArray<TtsModule> = Array.from((function*(): Iterable<TtsModule> {
  yield speechSynthesisModule;
  if (PUBLIC_VOICEVOX_ENGINE_API_ENABLED === 'true') {
    yield voicevoxModule;
  }
})()).sort((a, b) => a.name.localeCompare(b.name));

export interface TtsPresetEntry {
  readonly preset: TtsPreset;
  readonly key: string;
}

export interface TtsPresetGroup {
  readonly module: TtsModule;
  readonly entries: ReadonlyArray<TtsPresetEntry>;
}

export const ttsPresetGroups: ReadonlyArray<TtsPresetGroup> = ttsModuleList.map((module) => ({
  module,
  entries: module.presets.map((preset) => ({
    preset,
    key: `${module.id}:${preset.id}`,
  })),
}));

export const ttsPresetEntries: ReadonlyArray<TtsPresetEntry> = ttsPresetGroups.flatMap((group) => group.entries);
