import { Hono } from 'hono/tiny';
import { validator } from 'hono/validator';
import * as v from 'valibot';

import type { ApiEnv } from './types.ts';

const VOICEVOX_MAX_TEXT_LENGTH = 1000;

const voicevoxRequestSchema = v.object({
  text: v.pipe(
    v.string('textが不正です'),
    v.check((text) => text.trim().length > 0, 'textが不正です'),
    v.maxLength(VOICEVOX_MAX_TEXT_LENGTH, 'textが不正です'),
  ),
  speaker: v.pipe(
    v.number('speakerが不正です'),
    v.integer('speakerが不正です'),
    v.minValue(0, 'speakerが不正です'),
  ),
}, 'リクエストが不正です');

export const tts = new Hono<ApiEnv>()
  .use('/voicevox', async (c, next) => {
    if (!c.env.VOICEVOX_ENGINE_API_ENABLED) return c.notFound();
    return next();
  })
  .post('/voicevox', validator('json', (value: unknown, c) => {
    const parsed = v.safeParse(voicevoxRequestSchema, value);
    if (!parsed.success) return c.text(parsed.issues[0].message, 400);
    return parsed.output;
  }), async (c) => {
    const apiUrl = c.env.VOICEVOX_ENGINE_API_URL?.replace(/\/+$/, '');
    if (!apiUrl) return c.text('VOICEVOX APIが設定されていません', 503);

    const { text, speaker } = c.req.valid('json');

    const headers = new Headers();
    if (c.env.VOICEVOX_ENGINE_API_BEARER_TOKEN) headers.set('Authorization', `Bearer ${c.env.VOICEVOX_ENGINE_API_BEARER_TOKEN}`);
    const signal = c.req.raw.signal;

    const queryResponse = await fetch(`${apiUrl}/audio_query?${new URLSearchParams({ text, speaker: String(speaker) }).toString()}`, { method: 'POST', headers, signal });
    if (!queryResponse.ok) return c.text(`VOICEVOX audio_query failed: ${queryResponse.status}`, 502);

    headers.set('Content-Type', 'application/json');
    const synthesisResponse = await fetch(`${apiUrl}/synthesis?${new URLSearchParams({ speaker: String(speaker) }).toString()}`, {
      method: 'POST',
      headers,
      body: await queryResponse.text(),
      signal,
    });
    if (!synthesisResponse.ok || !synthesisResponse.body) return c.text(`VOICEVOX synthesis failed: ${synthesisResponse.status}`, 502);

    return new Response(synthesisResponse.body, {
      headers: { 'content-type': synthesisResponse.headers.get('content-type') ?? 'audio/wav' },
    });
  });
