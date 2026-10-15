import typescriptConfig from '@repo/eslint-config/typescript.ts';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    files: ['*.ts'],
    extends: [typescriptConfig],
  },
);
