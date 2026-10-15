import taiymeConfig from '@taiyme/eslint-config';
import tsEslintParser from '@typescript-eslint/parser';
import gitignore from 'eslint-config-flat-gitignore';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

export default defineConfig(
  gitignore(),
  {
    files: ['**/*.{js,ts}'],
    extends: [
      taiymeConfig.configs.typescript,
      taiymeConfig.configs.stylistic,
      svelte.configs.recommended,
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
  {
    files: ['**/*.svelte', '**/*.svelte.{js,ts}'],
    extends: [
      taiymeConfig.configs.typescript,
      taiymeConfig.configs.stylistic,
      svelte.configs.recommended,
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: tsEslintParser,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'prefer-const': 'off', // $props() の $bindable() あたりと相性が悪いためオフ
      'svelte/first-attribute-linebreak': [
        'warn',
        { multiline: 'below', singleline: 'beside' },
      ],
      'svelte/html-closing-bracket-new-line': [
        'warn',
        {
          multiline: 'never',
          selfClosingTag: { multiline: 'never' },
        },
      ],
      'svelte/html-closing-bracket-spacing': [
        'warn',
        { startTag: 'never', endTag: 'never', selfClosingTag: 'never' },
      ],
      'svelte/html-quotes': ['warn', { prefer: 'single' }],
      'svelte/html-self-closing': [
        'warn',
        {
          void: 'never',
          normal: 'never',
          svg: 'always',
          math: 'always',
          component: 'always',
          svelte: 'always',
        },
      ],
      'svelte/indent': [
        'warn',
        {
          indent: 2,
          switchCase: 1,
          alignAttributesVertically: true,
        },
      ],
      'svelte/max-attributes-per-line': [
        'warn',
        { singleline: 3, multiline: 1 },
      ],
      'svelte/mustache-spacing': [
        'warn',
        {
          textExpressions: 'never',
          attributesAndProps: 'never',
          directiveExpressions: 'never',
        },
      ],
      'svelte/no-spaces-around-equal-signs-in-attribute': 'error',
      'svelte/no-trailing-spaces': 'warn',
      'svelte/shorthand-attribute': ['warn', { prefer: 'always' }],
      'svelte/shorthand-directive': ['warn', { prefer: 'always' }],
      'svelte/spaced-html-comment': ['warn', 'always'],
    },
  },
  {
    files: ['**/*.svelte'],
    extends: [betterTailwindcss.configs.recommended],
    rules: {
      'better-tailwindcss/no-unknown-classes': ['error', { detectComponentClasses: true }],
    },
  },
);
