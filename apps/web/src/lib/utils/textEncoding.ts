const TEXT_ENCODING_CANDIDATES = [
  'utf-8',
  'shift_jis',
] as const;

export type SupportedTextEncoding = (typeof TEXT_ENCODING_CANDIDATES)[number];

export interface DecodedTextContent {
  encoding: SupportedTextEncoding;
  text: string;
}

const TEXT_DECODERS = TEXT_ENCODING_CANDIDATES.map((encoding) => ({
  encoding,
  decoder: new TextDecoder(encoding, { fatal: true }),
}));

export const decodeTextContentWithEncoding = (content: ArrayBuffer): DecodedTextContent => {
  const errors: unknown[] = [];

  for (const { decoder, encoding } of TEXT_DECODERS) {
    try {
      return {
        encoding,
        text: decoder.decode(content),
      };
    } catch (error) {
      errors.push(error);
    }
  }

  throw new AggregateError(errors, 'Failed to decode text content.');
};

export const decodeTextContent = (content: ArrayBuffer): string => (
  decodeTextContentWithEncoding(content).text
);

export const decodeTextFile = async (file: File): Promise<string> => (
  decodeTextContent(await file.arrayBuffer())
);
