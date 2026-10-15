export interface ApiBindings {
  SHARED_FILES?: SharedFilesBucket;
  VOICEVOX_ENGINE_API_ENABLED?: boolean;
  VOICEVOX_ENGINE_API_URL?: string;
  VOICEVOX_ENGINE_API_BEARER_TOKEN?: string;
}

export interface ApiEnv {
  Bindings: ApiBindings;
}

/** 共有ファイルの取得結果。R2 の `get` が返す値のうち、必要な部分だけを型にする。 */
export interface SharedFilesBucketObject {
  body: ReadableStream;
  httpMetadata?: {
    contentType?: string;
  };
}

export interface SharedFilesBucketPutOptions {
  httpMetadata?: {
    contentType?: string;
  };
}

/**
 * 共有ファイルを置く R2 バケット。
 * `@cloudflare/workers-types` をワークスペースへ持ち込まないよう、必要なメソッドだけを構造的に型付けする。
 */
export interface SharedFilesBucket {
  get(key: string): Promise<SharedFilesBucketObject | null>;
  put(key: string, value: ArrayBuffer, options?: SharedFilesBucketPutOptions): Promise<unknown>;
}
