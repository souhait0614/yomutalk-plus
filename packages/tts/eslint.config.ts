import typescriptConfig from '@repo/eslint-config/typescript.ts';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    extends: [typescriptConfig],
    files: ['**/*.ts'],
  },
);
