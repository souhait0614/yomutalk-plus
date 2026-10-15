type Promisable<T> = T | Promise<T>;

export interface TtsPreparedInstance {
  readonly ready: Promise<void>;
  speak: () => Promise<void>;
  stop: () => void;
}

export interface TtsInstance {
  prepare: (text: string) => TtsPreparedInstance;
  stop: () => void;
}

export interface TtsPreset {
  id: string;
  name: string;
  description?: string;
  init: () => Promisable<TtsInstance>;
}

export interface TtsModule {
  id: string;
  name: string;
  description?: string;
  version: string;
  presets: ReadonlyArray<TtsPreset>;
}
