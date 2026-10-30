# Changelog

## [1.2.0](https://github.com/souhait0614/yomutalk-plus/compare/web-v1.1.1...web-v1.2.0) (2026-10-30)


### Features

* **web:** 読み上げ音声の選択をCommandダイアログに変更し、ダイアログ内のスクロール不能を修正 ([056a080](https://github.com/souhait0614/yomutalk-plus/commit/056a080201d52d01c879c63f07d5030bd89e3024))


### Bug Fixes

* **deps:** update dependency svelte-sonner to v1.2.2 ([#41](https://github.com/souhait0614/yomutalk-plus/issues/41)) ([2b29bc3](https://github.com/souhait0614/yomutalk-plus/commit/2b29bc396bd243bac0eb103e6ac0de840fb31c7d))
* **deps:** update npm production dependencies (non-major) ([#29](https://github.com/souhait0614/yomutalk-plus/issues/29)) ([3943944](https://github.com/souhait0614/yomutalk-plus/commit/39439446047c449ca0453125911c40bad8d07b49))
* **web:** 各種リンクの並び順の変更と説明文の追加 ([662a334](https://github.com/souhait0614/yomutalk-plus/commit/662a334d5cf0fb732db5470ca26c31bcc732108e))
* **web:** 小説の共有を送り方の選択とQRコード/小説ファイルで分離 ([1d32136](https://github.com/souhait0614/yomutalk-plus/commit/1d321369ab3380441b1fbd9bb2686449433360f8))
* バックアップ時にダイアログを表示するように修正 ([3043759](https://github.com/souhait0614/yomutalk-plus/commit/3043759811ae0afabb663bef60933f8530a5651e))
* 読み上げ文字の手動追加で読み方を入力できるように ([23dfa53](https://github.com/souhait0614/yomutalk-plus/commit/23dfa53bc581f238f02e08e308f711411fc32adb))


### Performance Improvements

* **web:** IndexedDB の読み書きを効率化 ([d1eac9a](https://github.com/souhait0614/yomutalk-plus/commit/d1eac9a411ef396c91c57abd37c26830050b444c))
* **web:** スクロール中の localStorage 読み書きを削減 ([956cab2](https://github.com/souhait0614/yomutalk-plus/commit/956cab2b0a3209ff1d373cd69acb49ab185310bc))
* **web:** ブックマークと小説一覧の参照を事前計算 ([6c3f1b7](https://github.com/souhait0614/yomutalk-plus/commit/6c3f1b72f1d73aa99d2da4d26b5ea86251c3422c))
* **web:** 内蔵小説の更新チェックを並列化し再取得を抑止 ([d7aeda8](https://github.com/souhait0614/yomutalk-plus/commit/d7aeda81631cb311019ce4e33b322a9528c38574))
* **web:** 同梱小説の解析済みデータをバンドルから削除 ([d165dd8](https://github.com/souhait0614/yomutalk-plus/commit/d165dd89e91b2f692d1ec5929c41c592f7e98903))

## [1.1.1](https://github.com/souhait0614/yomutalk-plus/compare/web-v1.1.0...web-v1.1.1) (2026-10-22)


### Bug Fixes

* Noto Serif JPを埋め込み ([22233d4](https://github.com/souhait0614/yomutalk-plus/commit/22233d4311c74f7adaa3ffe99a46f0caff12be07))

## [1.1.0](https://github.com/souhait0614/yomutalk-plus/compare/web-v1.0.0...web-v1.1.0) (2026-10-21)


### Features

* metaを設定 ([333f3c4](https://github.com/souhait0614/yomutalk-plus/commit/333f3c40ff012f824c3ed159345749f5a7f2d715))
* 本文をずらす機能のオンオフを追加 ([eb7bcbb](https://github.com/souhait0614/yomutalk-plus/commit/eb7bcbbedf5c5f64ef25c25ae042d8dd81077ff5))
* 青空文庫のzipから小説を追加できるように改修 ([b95c82b](https://github.com/souhait0614/yomutalk-plus/commit/b95c82bf34590e1c6baa06a8a716daf4d4f595f2))


### Bug Fixes

* **deps:** update npm production dependencies (non-major) ([#12](https://github.com/souhait0614/yomutalk-plus/issues/12)) ([40a8c80](https://github.com/souhait0614/yomutalk-plus/commit/40a8c8048e9721638d64ca2c561d0315c3abd642))
* 改行のみの行を本文に表示できるように修正 ([c53bcb5](https://github.com/souhait0614/yomutalk-plus/commit/c53bcb5362efe90d753b6811934100f2491b1710))
* 表示周りの細かい修正 ([6d85336](https://github.com/souhait0614/yomutalk-plus/commit/6d85336be22ce9a2101fabbd203a512b19d22109))

## 1.0.0 (2026-10-19)


### Features

* PWAインストールを促す画面を追加 ([a67af2a](https://github.com/souhait0614/yomutalk-plus/commit/a67af2a83ebc07aa589df9a20298bb10c1460ddf))
* **web:** add Japanese and English localization ([09f94d4](https://github.com/souhait0614/yomutalk-plus/commit/09f94d464ab9b440d8a60b660821232208f63c0d))
* **web:** 小説の共有をQRコードと小説ファイルの受け渡しに変更 ([61c7063](https://github.com/souhait0614/yomutalk-plus/commit/61c7063caceaff30cd5a01983715a63ec06ef7c8))
* **web:** 小説編集のロック機能を追加 ([fb84495](https://github.com/souhait0614/yomutalk-plus/commit/fb84495c24bb69da70f8ab7327f92cfac7e4e176))
* **web:** 小説編集前にブックマークの削除を行うように修正 ([ed962a1](https://github.com/souhait0614/yomutalk-plus/commit/ed962a12c45198309b5e01a683362a0f01a6512b))
* 小説を表示して読み上げるWebアプリを追加 ([4a2469b](https://github.com/souhait0614/yomutalk-plus/commit/4a2469bf8b09f46a3cde87cd22a5e56f20716f93))


### Bug Fixes

* **deps:** update dependency @sveltejs/kit to v2.70.2 [security] ([#7](https://github.com/souhait0614/yomutalk-plus/issues/7)) ([41f2278](https://github.com/souhait0614/yomutalk-plus/commit/41f2278ab8083b5ad3b4d93e19827e96af7e7b29))
* **deps:** 依存関係を整理 ([21251f9](https://github.com/souhait0614/yomutalk-plus/commit/21251f98bbd5049a2c8dc4026e9120fe1c3cc860))
* iOS用の細かい調整 ([07018d9](https://github.com/souhait0614/yomutalk-plus/commit/07018d9ecb96a5e34420c3b64d555235641cdcef))
* UIの微調整 ([0efc837](https://github.com/souhait0614/yomutalk-plus/commit/0efc837456cd479065564b89f0faa2c2ebeae6e2))
* アンマウント後のビューアがnull参照でクラッシュする問題を修正 ([84758e1](https://github.com/souhait0614/yomutalk-plus/commit/84758e104816fc4adb198a8d2d84d3f1428abedb))
* ブックマークの追加に失敗することがある問題を修正 ([3df5594](https://github.com/souhait0614/yomutalk-plus/commit/3df5594fe94a6f96d4a07024074d89879fff9512))
* ローカル開サーバーで小説・ブックマークのバックアップが動かないことがある問題を修正 ([9c514d5](https://github.com/souhait0614/yomutalk-plus/commit/9c514d548b058037d406d1bb8fe0a17a1ea6565c))
* 不要な編集メニュー項目を削除 ([6cb00df](https://github.com/souhait0614/yomutalk-plus/commit/6cb00dfc7ae04e0d0e9f53cf523d4e0f25b4168b))
