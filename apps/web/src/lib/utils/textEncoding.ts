const TEXT_DECODERS = ['utf-8', 'shift_jis'].map((encoding) => new TextDecoder(encoding, { fatal: true }));

export const decodeTextContent = (content: ArrayBuffer): string => {
  const errors: unknown[] = [];

  for (const decoder of TEXT_DECODERS) {
    try {
      return decoder.decode(content);
    } catch (error) {
      errors.push(error);
    }
  }

  throw new AggregateError(errors, 'Failed to decode text content.');
};

export const decodeTextFile = async (file: File): Promise<string> => (
  decodeTextContent(await file.arrayBuffer())
);
