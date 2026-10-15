import { Hono } from 'hono/tiny';

import type { ApiEnv } from './types.ts';
import { computeContentHash } from './hash.ts';
import { getInternalNovelAssetUrl, resolveInternalNovel } from './internalNovels.ts';

export const novels = new Hono<ApiEnv>()
  .get('/:id', async (c) => {
    const definition = resolveInternalNovel(c.req.param('id'));
    if (!definition) return c.text('アプリ内蔵小説が見つかりません', 404);

    const response = await fetch(getInternalNovelAssetUrl(definition));
    if (!response.ok || !response.body) return c.text('アプリ内蔵小説を取得できませんでした', 502);

    return new Response(response.body, {
      headers: {
        'content-type': response.headers.get('content-type') ?? 'text/plain; charset=utf-8',
      },
    });
  })
  .get('/:id/hash', async (c) => {
    const id = c.req.param('id');
    const definition = resolveInternalNovel(id);
    if (!definition) return c.text('アプリ内蔵小説が見つかりません', 404);

    const response = await fetch(getInternalNovelAssetUrl(definition));
    if (!response.ok) return c.text('アプリ内蔵小説を取得できませんでした', 502);

    const hash = await computeContentHash(await response.arrayBuffer());
    return c.json({ id, hash });
  });
