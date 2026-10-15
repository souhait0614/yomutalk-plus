import type { RequestHandler } from '@sveltejs/kit';
import { api } from '@repo/api';
import { env } from '$env/dynamic/private';
import { PUBLIC_VOICEVOX_ENGINE_API_ENABLED } from '$env/static/public';

const handler: RequestHandler = ({ request, platform }) => api.fetch(request, {
  SHARED_FILES: platform?.env.SHARED_FILES,
  VOICEVOX_ENGINE_API_ENABLED: PUBLIC_VOICEVOX_ENGINE_API_ENABLED === 'true',
  VOICEVOX_ENGINE_API_URL: env.VOICEVOX_ENGINE_API_URL,
  VOICEVOX_ENGINE_API_BEARER_TOKEN: env.VOICEVOX_ENGINE_API_BEARER_TOKEN,
});

export const GET = handler;
export const POST = handler;
