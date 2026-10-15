import taiymeConfig from '@taiyme/eslint-config';
import tsEslintParser from '@typescript-eslint/parser';
import gitignore from 'eslint-config-flat-gitignore';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

const files = [
  '**/*.{js,ts}',
];

export default defineConfig(
  gitignore(),
  {
    files,
    extends: [
      taiymeConfig.configs.typescript,
      taiymeConfig.configs.stylistic,
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parser: tsEslintParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
