import { PersistedState } from 'runed';

export const ttsPreset = new PersistedState<string | null>('settings-tts-preset', null);
export const autoStartPlayback = new PersistedState<boolean>('settings-auto-start-playback', false);
export const showRuby = new PersistedState<boolean>('settings-show-ruby', true);
export const novelDocumentViewFontSize = new PersistedState<'sm' | 'md' | 'lg' | 'xl'>('settings-novel-document-view-font-size', 'lg');
export const pwaInstallBypassed = new PersistedState<boolean>('settings-pwa-install-bypassed', false);
