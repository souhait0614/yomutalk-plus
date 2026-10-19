import typescriptConfig from '@repo/eslint-config/typescript.ts';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig(
  // Each workspace is linted by its own config through `turbo run lint`.
  globalIgnores(['apps/', 'packages/', 'dummy-text/']),
  {
    files: ['*.ts'],
    extends: [typescriptConfig],
  },
);
