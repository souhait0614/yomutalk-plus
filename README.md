# よむとーく＋

小説の表示が可能なテキスト読み上げWebアプリ

## 主な機能

- テキストファイル（アプリ内蔵/外部ファイル）の読み込み・縦書き電子書籍風表示
- 文章のタップによる自動選択や手動での選択によって範囲選択された文字の音声による読み上げ・キューイングによる連続読み上げ（読み上げ中の範囲は本文上にハイライト表示）
- ブックマーク機能による任意の文字の即時読み上げ登録
- 小説の作成・編集
- QRコードや端末の共有メニューによる小説の共有
- PWAによる端末へのインストールとオフライン環境での利用

## 対応しているファイル形式

- [青空文庫形式](https://www.aozora.gr.jp/aozora-manual/index-input.html)のtxtファイル
- 通常のtxtファイル

## 対応している読み上げエンジン

- Web Speech API
- VOICEVOX

## 技術スタック

- pnpm workspaces + Turborepo
- SvelteKit 2 / Svelte 5（runes） / Tailwind CSS 4 / shadcn-svelte
- Dexie
- Hono

## 必要環境

- Node.js 24.21.0
- pnpm 12.9.1

バージョンは `mise.toml` で固定しています。mise を使う場合はリポジトリ直下で `mise install` を実行してください。

## セットアップ

```sh
pnpm install
```

## 開発

```sh
pnpm dev
```

### コマンド

| コマンド                                | 内容                            |
| --------------------------------------- | ------------------------------- |
| `pnpm dev`                              | 開発サーバーを起動します        |
| `pnpm build`                            | 本番ビルド（Turbo 経由）        |
| `pnpm lint` / `pnpm lint:fix`           | ワークスペース全体の ESLint     |
| `pnpm typecheck`                        | ワークスペース全体の型チェック  |
| `pnpm --filter @repo/novel-parser test` | パーサーのテスト（node --test） |

### 環境変数

`apps/web/.env` に次の環境変数を設定します。

```env
PUBLIC_VOICEVOX_ENGINE_API_ENABLED=true
VOICEVOX_ENGINE_API_URL=...
VOICEVOX_ENGINE_API_BEARER_TOKEN=...
```

- `PUBLIC_VOICEVOX_ENGINE_API_ENABLED` は必須です。未設定の場合はビルドに失敗します。
  - `true` の場合のみ VOICEVOX の TTS モジュールを読み込み、音声合成 API（`/api/tts/voicevox`）を有効にします。それ以外の値では、モジュールをクライアントのバンドルから除外し、API は 404 を返します。
  - ビルド時に埋め込まれる（`$env/static/public`）ため、値を変更した場合は再ビルドが必要です。
- `VOICEVOX_ENGINE_API_URL` と `VOICEVOX_ENGINE_API_BEARER_TOKEN` は VOICEVOX を有効にする場合に設定します。
  - どちらもサーバー側（`$env/dynamic/private`）だけで参照され、クライアントには渡りません。
  - `VOICEVOX_ENGINE_API_URL` が未設定の場合、VOICEVOX の音声合成 API は 503 を返します。
- ブラウザ内蔵の読み上げ（Web Speech API）は VOICEVOX の設定に関係なく動作します。

### 小説の共有

`/share` で選択した小説を 1 ファイルにまとめて圧縮し、Cloudflare R2 へアップロードします。
発行される URL（`/share/import/<id>`）を開くと、共有された小説を確認してから端末へ追加できます。

- R2 バケット `yomutalk-shared-files` を用意し、`apps/web/wrangler.jsonc` の `r2_buckets` で `SHARED_FILES` としてバインドします。
- バケットには有効期限 1 日のライフサイクルルールを設定してください（共有 URL の有効期限はこのルールに依存します）。
- バインディングが無い場合、共有 API は 503 を返します。
- 開発サーバーでも `@sveltejs/adapter-cloudflare` の `platformProxy` が `wrangler.jsonc` を読んでバインディングをエミュレートします（状態は `apps/web/.wrangler` に保存されます）。

## ビルドとデプロイ

Cloudflare Workers にデプロイします。ビルドしてから、`apps/web` を作業ディレクトリとして wrangler を実行します。

```sh
pnpm --filter web build
cd apps/web
pnpm exec wrangler deploy
```

## リリース

[Release Please](https://github.com/googleapis/release-please) でリリースを自動化しています。`main` へ push すると、Conventional Commits を基にバージョンと `CHANGELOG.md` を更新するリリース PR が作成されます。リリース PR をマージすると `<パッケージ名>-v<バージョン>` タグと GitHub Release が作成されます。

対象は `apps/web` と、`apps/web` が依存する機能パッケージ（`packages/api`、`packages/assets`、`packages/novel-parser`、`packages/tts`）です。パッケージごとに独立したリリース PR が出るため、任意のパッケージだけをリリースできます。

- 設定は [release-please-config.json](release-please-config.json) と [.release-please-manifest.json](.release-please-manifest.json) です。
- 初回リリースのバージョンは `1.0.0`（`initial-version`）で、タグは `web-v1.0.0`、`tts-v1.0.0` のようになります。
- リリース対象になるのは `feat`（マイナー）、`fix`・`perf`・`revert`（パッチ）、および `!` や `BREAKING CHANGE` を伴うコミット（メジャー）です。`chore`・`docs`・`style`・`refactor`・`test`・`build`・`ci` は変更履歴に載らず、これらだけの変更ではリリース PR が作成されません。コミットメッセージは [commitlint.config.ts](commitlint.config.ts) で検証される形式で書いてください。
- `node-workspace` プラグインにより、依存するパッケージが更新されると、それを参照するパッケージ（`apps/web` など）のリリース PR も作成されます。
- 変更履歴は各パッケージ配下（`apps/web/CHANGELOG.md` など）に書かれます。
- リポジトリ直下のみの変更や、`packages/eslint-config`・`packages/tsconfig`（ツール設定）のみの変更ではリリース PR は作成されません。リリースだけを先に起こしたい場合は `git commit --allow-empty -m "fix: ..."` のように空コミットを使います。
- リリース PR はどれも `.release-please-manifest.json` を書き換えるため、**1つずつマージ**してください。`always-update` を有効にしているため、実行のたびに各 PR のブランチは最新の `main` から作り直されます（本文が変わらない PR も更新されます）。
- 設定画面に表示されるバージョンは `apps/web/package.json` を参照しているため、リリース PR をマージすると自動で更新されます。

### リリース PR の CI（GitHub App）

リリース PR の CI を自動実行するため、Release Please は `GITHUB_TOKEN` ではなく専用の GitHub App のインストールトークンで PR を作成します。`GITHUB_TOKEN` で作成・更新された PR は、`pull_request` イベントのワークフローが**承認待ち**（`Approve workflows to run` を押すまで実行されない）になり、`pull_request_target` のワークフロー（`Lint`）は実行自体が作成されません。GitHub App や PAT で作成した PR はこの制限を受けず、CI が自動で実行されます。

セットアップ:

1. [GitHub App](https://docs.github.com/apps/creating-github-apps/setting-up-a-github-app/creating-a-github-app) を作成します。Webhook は無効にし、リポジトリの権限は `Contents: Read and write`・`Issues: Read and write`・`Pull requests: Read and write` のみにします。
2. 作成した App をこのリポジトリ**だけ**にインストールします。
3. App の Client ID をリポジトリ変数 `RELEASE_PLEASE_APP_CLIENT_ID` に、生成した秘密鍵（`.pem`）をリポジトリシークレット `RELEASE_PLEASE_APP_PRIVATE_KEY` に登録します。CLI では次のとおりです。

   ```sh
   gh variable set RELEASE_PLEASE_APP_CLIENT_ID --body "<App の Client ID>"
   gh secret set RELEASE_PLEASE_APP_PRIVATE_KEY < private-key.pem
   ```

4. 秘密鍵は定期的にローテーションします（[.github/workflows/release-please.yaml](.github/workflows/release-please.yaml) が 1 時間で失効するトークンを都度発行します）。

## ライセンス

ソースコードは [MIT License](LICENSE) です。

[packages/assets/](packages/assets/) 以下は MIT ライセンスの適用外です。
