import { fileURLToPath } from 'node:url';

import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
      },
      paths: {
        // オフライン時は任意のパスへの遷移にプリレンダリングした '/' の HTML を返すため、
        // 相対アセットパスだと '/settings' などで解決に失敗する。SPA のフォールバックと同様に
        // 常にルート相対のパスを出力する。
        relative: false,
      },
      adapter: adapter({
        // 開発サーバーでも wrangler のバインディング (R2 など) を使えるようにする。
        // 既定では `wrangler.toml` を読むため、このプロジェクトの設定ファイルを明示する。
        platformProxy: {
          configPath: 'wrangler.jsonc',
        },
      }),
    }),
    viteStaticCopy({
      targets: [
        {
          src: fileURLToPath(import.meta.resolve('@repo/assets/app-icons/favicon.ico')),
          dest: 'images',
          rename: { stripBase: true },
        },
        {
          src: fileURLToPath(import.meta.resolve('@repo/assets/app-icons/icon-apple-touch-icon.png')),
          dest: 'images',
          rename: { stripBase: true },
        },
        {
          src: fileURLToPath(import.meta.resolve('@repo/assets/app-icons/icon-pwa-128.png')),
          dest: 'images',
          rename: { stripBase: true },
        },
        {
          src: fileURLToPath(import.meta.resolve('@repo/assets/app-icons/icon-pwa-512.png')),
          dest: 'images',
          rename: { stripBase: true },
        },
      ],
    }),
    SvelteKitPWA({
      registerType: 'prompt',
      manifest: {
        name: 'よむとーく＋',
        short_name: 'よむとーく＋',
        lang: 'ja',
        start_url: '/',
        display: 'standalone',
        theme_color: '#83ACD8',
        icons: [
          { src: '/images/icon-pwa-128.png', sizes: '128x128', type: 'image/png', purpose: 'maskable' },
          { src: '/images/icon-pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        scope: '/',
        handle_links: 'preferred',
        launch_handler: {
          client_mode: 'focus-existing',
        },
      },
    }),
  ],
});
