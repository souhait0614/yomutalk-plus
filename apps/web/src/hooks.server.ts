import type { Handle } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';

export const handle: Handle = ({ event, resolve }) => paraglideMiddleware(
  event.request,
  ({ request, locale }) => resolve(
    { ...event, request },
    {
      transformPageChunk: ({ html }) => html
        .replace('%lang%', locale)
        .replace('%dir%', getTextDirection(locale))
        .replace('%app_name%', m.app_name({}, { locale }))
        .replace('%manifest%', `/manifest.${locale}.webmanifest`),
    },
  ),
);
