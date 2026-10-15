import type { TtsPreparedInstance } from '@repo/tts';
import type { RegisteredText } from '$lib/selectedText';

export type SelectedTextStatus = 'preparing' | 'prepared' | 'error';

export type SelectedText = RegisteredText & {
  id: string;
  preparedInstance: TtsPreparedInstance;
  status: SelectedTextStatus;
};

export type SelectedTextMap = Map<string, SelectedText>;
