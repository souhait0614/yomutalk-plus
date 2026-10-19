import svelteConfig from '@repo/eslint-config/svelte.ts';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    ignores: ['src/lib/shadcn-svelte/**', 'src/lib/paraglide/**'],
  },
  {
    extends: [svelteConfig],
    settings: {
      'better-tailwindcss': {
        entryPoint: './src/app.css',
      },
    },
  },
);
