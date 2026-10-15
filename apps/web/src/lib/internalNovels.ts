import { apiClient, computeContentHash } from '@repo/api/client';

export type {
  InternalNovelEntry,
  InternalNovelFileType,
  InternalNovelInfo,
  InternalNovelVariant,
  InternalNovelVariantGroup,
} from '@repo/api/client';
export { internalNovelList, isInternalNovelVariantGroup, toInternalNovelVariantInfo } from '@repo/api/client';

export const fetchInternalNovelHash = async (novelId: string): Promise<string> => {
  const response = await apiClient.novels[':id'].hash.$get({ param: { id: novelId } });
  if (!response.ok) throw new Error(`アプリ内蔵小説のハッシュを取得できませんでした (${response.status})`);

  const body = await response.json();
  return body.hash;
};

export const downloadInternalNovel = async (novelId: string): Promise<{ fileData: File; hash: string; }> => {
  const response = await apiClient.novels[':id'].$get({ param: { id: novelId } });
  if (!response.ok) throw new Error(`アプリ内蔵小説をダウンロードできませんでした (${response.status})`);

  const content = await response.arrayBuffer();
  return {
    fileData: new File([content], `${novelId}.txt`, { type: 'text/plain' }),
    hash: await computeContentHash(content),
  };
};
