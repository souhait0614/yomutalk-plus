import svelteConfig from '@repo/eslint-config/svelte.ts';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    extends: [svelteConfig],
    ignores: ['src/lib/shadcn-svelte/**'],
    settings: {
      'better-tailwindcss': {
        entryPoint: './src/app.css',
      },
    },
  },
);
