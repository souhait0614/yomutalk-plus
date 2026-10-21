import { fileURLToPath } from 'node:url';

import { paraglideVitePlugin } from '@inlang/paraglide-js';
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
  optimizeDeps: {
    // バックアップ・復元の動的インポートは、Svelte のテンプレートからしか参照されない関数の中にある。
    // Vite の依存スキャンは <script> ブロックだけを tree-shaking しながら解析するため、
    // その関数ごと削除されて依存が検出されず、初回クリック時の import が 504 (Outdated Optimize Dep) になる。
    include: ['dexie-export-import'],
  },
  plugins: [
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/lib/paraglide',
      emitTsDeclarations: true,
      // 明示的な選択 (cookie) → ブラウザの言語 (preferredLanguage) → 日本語 (baseLocale) の順で解決する
      strategy: ['cookie', 'preferredLanguage', 'baseLocale'],
    }),
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
        {
          src: fileURLToPath(import.meta.resolve('@repo/assets/app-icons/icon-256.png')),
          dest: 'images',
          rename: { stripBase: true },
        },
      ],
    }),
    SvelteKitPWA({
      registerType: 'prompt',
      manifest: false,
    }),
  ],
});
