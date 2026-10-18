import type { LoadedNovelDocument, LoadedNovelDocumentFileType, NovelWritingMode } from '$lib/db';
import { apiClient } from '@repo/api/client';
import { resolve } from '$app/paths';
import * as v from 'valibot';

export const fileTypeLabels: Record<LoadedNovelDocumentFileType, string> = {
  aozoratext: '青空文庫形式テキストファイル',
  plaintext: 'プレーンテキストファイル',
};

export const writingModeLabels: Record<NovelWritingMode, string> = {
  'horizontal-tb': '横書き',
  'vertical-lr': '縦書き（左から）',
  'vertical-rl': '縦書き（右から）',
};

export interface SharedNovel {
  data: Uint8Array<ArrayBuffer>;
  fileType: LoadedNovelDocumentFileType;
  title: string;
  writingMode: NovelWritingMode;
  isEditLocked: boolean;
}

/** 共有ファイルの形式バージョン。構造を変えたら上げる。 */
const sharedNovelsFormatVersion = 1;

/**
 * 共有ファイルの中身。CBOR で符号化したあと deflate-raw で圧縮する。
 * 小説の本文はファイルのバイト列をそのまま持つため、受け取った側でも元の文字コードのまま読み込める。
 */
const sharedNovelsPayloadSchema = v.object({
  version: v.literal(sharedNovelsFormatVersion),
  novels: v.array(v.object({
    data: v.instance(Uint8Array),
    fileType: v.picklist(['plaintext', 'aozoratext']),
    title: v.string(),
    writingMode: v.picklist(['horizontal-tb', 'vertical-rl', 'vertical-lr']),
    isEditLocked: v.optional(v.boolean(), false),
  })),
});

const compressionFormat = 'deflate-raw';

const compress = async (bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> => (
  new Uint8Array(await new Response(
    new Blob([bytes]).stream().pipeThrough(new CompressionStream(compressionFormat)),
  ).arrayBuffer())
);

const decompress = async (blob: Blob): Promise<Uint8Array<ArrayBuffer>> => (
  new Uint8Array(await new Response(
    blob.stream().pipeThrough(new DecompressionStream(compressionFormat)),
  ).arrayBuffer())
);

/** 選択した小説を 1 ファイルへまとめて圧縮する。 */
export const encodeSharedNovels = async (documents: LoadedNovelDocument[]): Promise<Blob> => {
  const { encode } = await import('cborg');
  const novels = await Promise.all(documents.map(async (document) => ({
    data: new Uint8Array(await document.fileData.arrayBuffer()),
    fileType: document.fileType,
    title: document.title,
    writingMode: document.writingMode,
    isEditLocked: document.type === 'file' && (document.isEditLocked ?? false),
  })));

  const bytes = await compress(encode({ version: sharedNovelsFormatVersion, novels }));
  return new Blob([bytes], { type: 'application/octet-stream' });
};

export const decodeSharedNovels = async (blob: Blob): Promise<SharedNovel[]> => {
  const { decode } = await import('cborg');
  let decoded: unknown;
  try {
    decoded = decode(await decompress(blob));
  } catch {
    throw new Error('共有ファイルを読み込めませんでした');
  }

  const parsed = v.safeParse(sharedNovelsPayloadSchema, decoded);
  if (!parsed.success) throw new Error('共有ファイルの形式が正しくありません');

  return parsed.output.novels.map((novel) => ({
    data: new Uint8Array(novel.data),
    fileType: novel.fileType,
    title: novel.title,
    writingMode: novel.writingMode,
    isEditLocked: novel.isEditLocked,
  }));
};

/** 受け取りページの URL。共有先の端末で開くと小説を追加できる。 */
export const createSharedNovelsImportUrl = (id: string): string => (
  new URL(resolve(`/share/import/${encodeURIComponent(id)}`), location.origin).href
);

export const formatByteSize = (byteLength: number): string => {
  if (byteLength < 1024) return `${byteLength} B`;
  if (byteLength < 1024 * 1024) return `${(byteLength / 1024).toFixed(1)} KB`;
  return `${(byteLength / (1024 * 1024)).toFixed(1)} MB`;
};

const readApiErrorMessage = async (response: Response, fallbackMessage: string): Promise<string> => {
  try {
    const body = await response.json() as { message?: unknown; };
    if (typeof body.message === 'string') return body.message;
  } catch {
    // JSON 以外が返ってきた場合はフォールバックのメッセージを使う
  }
  return fallbackMessage;
};

export const uploadSharedNovels = async (documents: LoadedNovelDocument[]): Promise<string> => {
  const blob = await encodeSharedNovels(documents);
  // Hono RPC の推奨に合わせて multipart/form-data の File として送る (ファイル名はサーバーでは使わない)
  const response = await apiClient['shared-novels'].$post({
    form: { file: new File([blob], 'shared-novels.bin', { type: blob.type }) },
  });
  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, '共有URLを作成できませんでした'));
  }

  const body = await response.json() as { id?: unknown; };
  if (typeof body.id !== 'string') throw new Error('共有URLを作成できませんでした');
  return body.id;
};

export const downloadSharedNovels = async (id: string): Promise<SharedNovel[]> => {
  const response = await apiClient['shared-novels'][':id'].$get({ param: { id } });
  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, '共有された小説を取得できませんでした'));
  }

  return decodeSharedNovels(await response.blob());
};
