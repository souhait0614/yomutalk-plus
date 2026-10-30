import type { MiddlewareHandler } from 'hono';
import { Hono } from 'hono/tiny';
import { validator } from 'hono/validator';
import * as v from 'valibot';

import type { ApiEnv } from './types.ts';

export const sharedNovelMaxFileSize = 20 * 1024 * 1024;

export const sharedNovelContentType = 'application/octet-stream';

/** 共有 ID の形式。推測できない値であればよいので、形式そのものは緩く検証する。 */
const sharedNovelIdPattern = /^[\w-]{16,64}$/;

/** multipart/form-data の境界文字列とヘッダの分。 */
const multipartOverheadAllowance = 1024;

const sharedNovelUploadSchema = v.object({
  file: v.pipe(
    v.file('共有するファイルがありません'),
    v.check((file) => file.size > 0, '共有するファイルが空です'),
    v.check((file) => file.size <= sharedNovelMaxFileSize, '共有できるファイルのサイズを超えています'),
  ),
}, '共有するファイルがありません');

/**
 * 本文を読み込む前にサイズで弾く。
 * `validator('form')` は本文をすべてメモリに読み込むため、先に確認しておく。
 */
const rejectLargeRequestBody: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const contentLength = Number(c.req.header('content-length') ?? 0);
  if (contentLength > sharedNovelMaxFileSize + multipartOverheadAllowance) {
    return c.json({ message: '共有できるファイルのサイズを超えています' }, 413);
  }
  return next();
};

export const sharedNovels = new Hono<ApiEnv>()
  .post('/', rejectLargeRequestBody, validator('form', (value: unknown, c) => {
    const parsed = v.safeParse(sharedNovelUploadSchema, value);
    if (!parsed.success) return c.json({ message: parsed.issues[0].message }, 400);
    return parsed.output;
  }), async (c) => {
    const bucket = c.env.SHARED_FILES;
    if (!bucket) return c.json({ message: '共有機能を利用できません' }, 503);

    const id = crypto.randomUUID();
    await bucket.put(id, await c.req.valid('form').file.arrayBuffer(), {
      httpMetadata: { contentType: sharedNovelContentType },
    });

    return c.json({ id }, 201);
  })
  .get('/:id', async (c) => {
    const bucket = c.env.SHARED_FILES;
    if (!bucket) return c.json({ message: '共有機能を利用できません' }, 503);

    const id = c.req.param('id');
    if (!sharedNovelIdPattern.test(id)) {
      return c.json({ message: '共有IDの形式が正しくありません' }, 400);
    }

    const object = await bucket.get(id);
    if (!object) {
      return c.json({ message: '共有された小説が見つかりません。有効期限が切れた可能性があります' }, 404);
    }

    return new Response(object.body, {
      headers: {
        'cache-control': 'no-store',
        'content-type': object.httpMetadata?.contentType ?? sharedNovelContentType,
      },
    });
  });
