export class TtsAbortError extends Error {
  override readonly name = 'TtsAbortError';

  constructor(message = 'The speech was stopped.') {
    super(message);
  }
}

export function isTtsAbortError(error: unknown): error is TtsAbortError {
  return error instanceof TtsAbortError || (error instanceof Error && error.name === 'TtsAbortError');
}
