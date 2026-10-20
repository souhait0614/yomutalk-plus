import type { Unzipped } from 'fflate';

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

const TEXT_FILE_EXTENSION = '.txt';

export type ZipExtractionErrorReason = 'invalid-archive' | 'no-text-file' | 'multiple-text-files';

export class ZipExtractionError extends Error {
  readonly reason: ZipExtractionErrorReason;

  constructor(reason: ZipExtractionErrorReason, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ZipExtractionError';
    this.reason = reason;
  }
}

const getBaseName = (fileName: string): string => fileName.split(/[/\\]/).at(-1) ?? fileName;

const isMacMetadataEntry = (fileName: string): boolean => {
  const segments = fileName.split(/[/\\]/);
  const baseName = getBaseName(fileName);
  return segments.includes('__MACOSX') || baseName.startsWith('._') || baseName === '.DS_Store';
};

const isTextFileEntry = (fileName: string): boolean => (
  !isMacMetadataEntry(fileName) && getBaseName(fileName).toLowerCase().endsWith(TEXT_FILE_EXTENSION)
);

const unzipTextFileEntries = async (bytes: Uint8Array): Promise<Unzipped> => {
  const { unzipSync } = await import('fflate');
  try {
    return unzipSync(bytes, {
      filter: ({ name }) => isTextFileEntry(name),
    });
  } catch (error) {
    throw new ZipExtractionError('invalid-archive', 'Failed to extract the ZIP archive', { cause: error });
  }
};

export const isZipFile = async (file: File): Promise<boolean> => {
  if (file.size < 4) return false;
  const signature = new DataView(await file.slice(0, 4).arrayBuffer()).getUint32(0, true);
  return signature === ZIP_LOCAL_FILE_HEADER_SIGNATURE || signature === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE;
};

export const extractTextFileFromZip = async (file: File): Promise<File> => {
  const unzipped = await unzipTextFileEntries(new Uint8Array(await file.arrayBuffer()));
  const [entry, ...restEntries] = Object.entries(unzipped);
  if (!entry) {
    throw new ZipExtractionError('no-text-file', 'No text file was found in the ZIP archive');
  }
  if (restEntries.length > 0) {
    throw new ZipExtractionError('multiple-text-files', 'Multiple text files were found in the ZIP archive');
  }

  const [fileName, content] = entry;
  return new File([content], getBaseName(fileName), { type: 'text/plain' });
};
