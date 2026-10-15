export class TtsAbortError extends Error {
  override readonly name = 'TtsAbortError';

  constructor(message = 'The speech was stopped.') {
    super(message);
  }
}
