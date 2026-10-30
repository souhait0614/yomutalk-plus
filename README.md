# よむとーく＋

小説の表示が可能なテキスト読み上げWebアプリ

## 主な機能

- テキストファイル（アプリ内蔵/外部ファイル）の読み込み・縦書き電子書籍風表示
- 範囲選択した文字の読み上げ・キューイングによる連続読み上げ（読み上げ中の範囲は本文上にハイライト表示）
- ブックマークによる任意の文字の即時読み上げ登録
- 小説の作成・編集（ファイルから読み込んだ小説は編集をロック可能）
- QRコードや端末の共有メニューによる共有
- PWAによる端末へのインストールとオフライン利用

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

- Node.js
- pnpm

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
PUBLIC_BASE_URL=...
PUBLIC_VOICEVOX_ENGINE_API_ENABLED=true
VOICEVOX_ENGINE_API_URL=...
VOICEVOX_ENGINE_API_BEARER_TOKEN=...
```

- `PUBLIC_BASE_URL` と `PUBLIC_VOICEVOX_ENGINE_API_ENABLED` は必須です。未設定の場合はビルドに失敗します。
  - `PUBLIC_VOICEVOX_ENGINE_API_ENABLED` が `true` の場合のみ VOICEVOX の TTS モジュールを読み込み、音声合成 API（`/api/tts/voicevox`）を有効にします。それ以外の値では、モジュールをクライアントのバンドルから除外し、API は 404 を返します。
  - ビルド時に埋め込まれる（`$env/static/public`）ため、値を変更した場合は再ビルドが必要です。
- `VOICEVOX_ENGINE_API_URL` と `VOICEVOX_ENGINE_API_BEARER_TOKEN` は VOICEVOX を有効にする場合に設定します。
  - どちらもサーバー側（`$env/dynamic/private`）だけで参照され、クライアントには渡りません。
  - `VOICEVOX_ENGINE_API_URL` が未設定の場合、VOICEVOX の音声合成 API は 503 を返します。
- ブラウザ内蔵の読み上げ（Web Speech API）は VOICEVOX の設定に関係なく動作します。

### 小説の共有

`/share/send`（小説を送る）で小説を選択し、「送る」を押すと送り方を選ぶダイアログが開きます。
QR コードで送る場合は、選択した小説を 1 ファイルにまとめて圧縮し、Cloudflare R2 へアップロードします（共有は作成から 1 日で無効）。
送り先では QR コード（`yomutalk-plus-share:<id>`、`/share/receive` でカメラから読み取り）を読み取ります。
小説ファイルで送る場合は端末内で `yomutalk-plus-novel-<日付>.yomutalk-plus-novel` ファイルを作成し、ダウンロード（または Web Share API が使える場合のみ端末の共有メニュー）で渡します。こちらはアップロードを行いません。
受け取り側は追加済みでない小説だけを選んで端末へ保存できます。

## ビルドとデプロイ

Cloudflare Workers にデプロイします。 GitHub Actions で自動的にデプロイされるようになっています。

手元で行う場合は `pnpm --filter web build` でビルドしてから、`apps/web` を作業ディレクトリとして `pnpm exec wrangler deploy` を実行します。

## リリース

[Release Please](https://github.com/googleapis/release-please) でリリースを自動化しています。
設定は [.github/release-please/config.json](.github/release-please/config.json) と [.github/release-please/manifest.json](.github/release-please/manifest.json) です。

## ライセンス

ソースコードは [MIT License](LICENSE) です。

[packages/assets/](packages/assets/) 以下は MIT ライセンスの適用外です。
