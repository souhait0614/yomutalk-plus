import type { UserConfig } from '@commitlint/types';
import { RuleConfigSeverity } from '@commitlint/types';

const config: UserConfig = {
  extends: [
    '@commitlint/config-conventional',
  ],
  rules: {
    // 件名を日本語で書く運用のため大文字小文字の判定が成立しない。
    'subject-case': [RuleConfigSeverity.Disabled],
    // 日本語の本文・箇条書きは 100 文字で折り返さない運用のため無効化する。
    'body-max-line-length': [RuleConfigSeverity.Disabled],
  },
};

export default config;
