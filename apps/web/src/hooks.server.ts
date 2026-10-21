import type { Handle } from '@sveltejs/kit';
import { PUBLIC_BASE_URL } from '$env/static/public';
import { m } from '$lib/paraglide/messages';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';

const ogLocales: Record<string, string> = {
  en: 'en_US',
  ja: 'ja_JP',
};

export const handle: Handle = ({ event, resolve }) => paraglideMiddleware(
  event.request,
  ({ request, locale }) => {
    const appName = m.app_name({}, { locale });
    const description = m.app_description({}, { locale });
    const ogUrl = new URL(event.url.pathname, PUBLIC_BASE_URL).href;
    const ogImage = new URL('/images/icon-256.png', PUBLIC_BASE_URL).href;
    const ogLocale = ogLocales[locale] ?? locale.replace('-', '_');

    return resolve(
      { ...event, request },
      {
        transformPageChunk: ({ html }) => html
          .replaceAll('%lang%', locale)
          .replaceAll('%dir%', getTextDirection(locale))
          .replaceAll('%app_name%', appName)
          .replaceAll('%app_description%', description)
          .replaceAll('%og_url%', ogUrl)
          .replaceAll('%og_image%', ogImage)
          .replaceAll('%og_locale%', ogLocale)
          .replaceAll('%manifest%', `/manifest.${locale}.webmanifest`),
      },
    );
  },
);
