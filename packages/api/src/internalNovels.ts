export type InternalNovelFileType = 'plaintext' | 'aozoratext';

/** 追加ボタン・プルダウン項目に渡す内蔵小説の情報。 */
export interface InternalNovelInfo {
  id: string;
  title: string;
  fileType: InternalNovelFileType;
}

/** ダウンロード・更新に使う実体。バリエーションごとに独立した id を持つ。 */
export interface InternalNovelDefinition extends InternalNovelInfo {
  assetPath: string;
}

/** 同じ小説のバリエーション。 */
export interface InternalNovelVariant {
  id: string;
  /** プルダウンの項目に表示する名前。 */
  label: string;
  fileType: InternalNovelFileType;
  assetPath: string;
}

/** バリエーションを持つ内蔵小説。ボタンではなくプルダウンで表示する。 */
export interface InternalNovelVariantGroup {
  id: string;
  title: string;
  variants: InternalNovelVariant[];
}

/** 内蔵小説一覧の項目。単体の小説か、バリエーションを持つ小説のいずれか。 */
export type InternalNovelEntry = InternalNovelDefinition | InternalNovelVariantGroup;

export const internalNovelAssetBaseUrl = 'https://assets.yomutalk.souhait.app/novel';

export const internalNovelList: InternalNovelEntry[] = [
  {
    id: 'rentaro-family-names',
    title: '恋太郎ファミリー 名前一覧',
    variants: [
      {
        id: 'rentaro-family-names-anime',
        label: 'TVアニメまで',
        fileType: 'aozoratext',
        assetPath: 'aozora-text/rentaro-family-names-anime.txt',
      },
      {
        id: 'rentaro-family-names-comics',
        label: 'コミックスまで',
        fileType: 'aozoratext',
        assetPath: 'aozora-text/rentaro-family-names-comics.txt',
      },
      {
        id: 'rentaro-family-names-jump-plus',
        label: '少年ジャンプ＋まで',
        fileType: 'aozoratext',
        assetPath: 'aozora-text/rentaro-family-names-jump-plus.txt',
      },
      {
        id: 'rentaro-family-names-young-jump',
        label: '週刊ヤングジャンプまで',
        fileType: 'aozoratext',
        assetPath: 'aozora-text/rentaro-family-names-young-jump.txt',
      },
    ],
  },
];

export const isInternalNovelVariantGroup = (entry: InternalNovelEntry): entry is InternalNovelVariantGroup => (
  'variants' in entry
);

/** バリエーションを追加ボタン用の情報に変換する（タイトルにバリエーション名を付けて区別する）。 */
export const toInternalNovelVariantInfo = (
  group: InternalNovelVariantGroup,
  variant: InternalNovelVariant,
): InternalNovelInfo => ({
  id: variant.id,
  title: `${group.title}（${variant.label}）`,
  fileType: variant.fileType,
});

/** すべての内蔵小説の実体（バリエーションを含む）。 */
const internalNovelDefinitions: InternalNovelDefinition[] = internalNovelList.flatMap((entry) => (
  isInternalNovelVariantGroup(entry)
    ? entry.variants.map((variant) => ({
      ...toInternalNovelVariantInfo(entry, variant),
      assetPath: variant.assetPath,
    }))
    : [entry]
));

export const resolveInternalNovel = (id: string): InternalNovelDefinition | undefined => (
  internalNovelDefinitions.find((definition) => definition.id === id)
);

export const getInternalNovelAssetUrl = (definition: InternalNovelDefinition): string => (
  `${internalNovelAssetBaseUrl}/${definition.assetPath}`
);
