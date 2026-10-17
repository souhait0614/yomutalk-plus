# Repository Guidelines

## Toolchain

- Use the versions pinned in [mise.toml](mise.toml): Node.js 24.21.0 and pnpm 12.9.1.
- Run workspace tasks from the repository root. Turbo builds package dependencies (`^build`) before dependent tasks.
- Use `pnpm lint` for the whole workspace (root + turbo) and `pnpm build` for a production build.
- `pnpm typecheck` (Turbo) runs every workspace script named `typecheck`, including `apps/web` (`svelte-kit sync` + `svelte-check`).
- Run parser tests with `pnpm --filter @repo/novel-parser test` (`node --test`); fixtures live in `packages/novel-parser/test/assets/`. The gitignored `dummy-text/` directory at the repository root is local sample data for manual/browser testing only.
- Lefthook runs lint and type checks for staged files per package (the root config covers root-level files; `apps/*` and `packages/*` configs run their own) and commitlint on the commit message. Keep each workspace's `eslint.config.ts`, `tsconfig.json`, and `lefthook.yml` aligned with the shared `@repo/eslint-config` and `@repo/tsconfig` instead of duplicating or bypassing them from the root.

## Architecture

- `apps/web` is the SvelteKit application (Cloudflare adapter, PWA/offline support). It owns UI state, IndexedDB persistence, file decoding, and browser TTS integration. There is no `svelte.config.js`; SvelteKit options live in the `sveltekit({ ... })` call in `vite.config.ts`.
- `packages/novel-parser` converts plain text and Aozora text into format-independent document blocks. Keep format parsing and its Node test coverage here rather than in Svelte components.
- `packages/api` is the Hono API. The `.` entry is server-only (`api`, `ApiRouter`); `./client` is browser-safe (`apiClient` from `hc`, `computeContentHash`, `internalNovelList`). It is mounted by `apps/web/src/routes/api/[...paths]/+server.ts`, which forwards secrets from `$env/dynamic/private`.
- Novel sharing is split between `packages/api/src/sharedNovels.ts` (R2 upload/download; the bucket arrives as the `SHARED_FILES` Hono binding, typed structurally to avoid `@cloudflare/workers-types`) and `apps/web/src/lib/sharedNovels.ts` (the payload codec plus upload/download helpers). Uploads follow the Hono RPC file-upload pattern: `apiClient['shared-novels'].$post({ form: { file } })` against `validator('form', ...)` with a `valibot` schema. The payload itself is CBOR (`cborg`) compressed with `deflate-raw` and validated with `valibot` on decode; the server never parses it. `apps/web/wrangler.jsonc` binds the bucket and `apps/web/vite.config.ts` passes `platformProxy.configPath` so dev emulates it.
- `packages/tts` owns the transport-independent TTS lifecycle (`createTtsController`, `TtsAbortError`) and the `TtsModule`/`TtsPreset` types, and ships the built-in modules. The web-side registry stays in `apps/web/src/lib/tts`: it lists the modules (VOICEVOX only when `PUBLIC_VOICEVOX_ENGINE_API_ENABLED` is `'true'`) and derives the preset groups.
- `packages/assets` ships the app icons used by the PWA; it is excluded from the MIT license (see `README.md` and its `LICENSE`).
- `packages/eslint-config` and `packages/tsconfig` are shared configuration sources. Extend them from workspaces rather than duplicating rules.

## Implementation Conventions

- Svelte files run in Svelte 5 runes mode (forced through `compilerOptions.runes` in `vite.config.ts`). Follow nearby `$state`, `$derived`, `$effect`, `$props`, function binding, `SvelteMap`, and `createContext` patterns; do not introduce legacy reactive syntax. Runes resolve only in `.svelte` and `.svelte.ts` files — the shared ESLint config reports `no-undef` for `$state` in a plain `.ts` file — so shared reactive state lives in `.svelte.ts` modules such as `$lib/appSettings.svelte.ts` and `$lib/pwaUpdate.svelte.ts`.
- Use the existing shadcn-svelte primitives and `$lib/shadcn-svelte` aliases (`components.json` points there). Preserve portal layering when one dialog opens another: overlays and content need an explicit, coordinated z-index, as in `AddLoadedNovelDocumentDialog.svelte` (`z-60` for the dialog content, `z-70` for the nested dropdown menu).
- Treat `stateQuery(...).current` as the reactive IndexedDB read model. Perform multi-row Dexie mutations in a transaction and preserve the stable `sortOrder`, then let the query update consumers. `LoadedNovelDocument` is a discriminated union on `type: 'file' | 'internal'` with a required `hash`.
- Persist settings with `runed`'s `PersistedState`, one key per setting. Do not store reference types such as `SvelteMap` as `.current` (it is re-deserialized on every access); use a plain object/`Record` and assign properties, and note that `delete` is not persisted because runed's storage proxy only intercepts `get`/`set`. `runed` has no `useMediaQuery`; use `MediaQuery` from `svelte/reactivity` inside a client-only route (`ssr = false`).
- Store uploaded `File` values unchanged and decode them through `decodeTextFile` when reading. Parser changes must preserve ruby/gaiji structure and sentence arrays, not flatten rendered text early.
- `NovelDocumentViewer.svelte` virtualizes document blocks with `@tanstack/svelte-virtual` (`createVirtualizer`) and exposes `scrollValue`/`scrollMax` plus `scrollToPosition`, `scrollBlockIntoViewIfNeeded`, and `cancelScrollToPosition`. Keep offsets normalized to the reading direction (vertical RTL differs per engine: negative vs reverse `scrollLeft`; probe instead of assuming), sync the container and the bound values through `requestAnimationFrame`, and never write a `bind:` target synchronously inside an effect.
- Vertical writing mode needs physical CSS properties: Tailwind's logical utilities follow the text axis rather than the screen (`px-*` becomes `padding-inline`, i.e. vertical padding). That is why the viewer places blocks with physical offsets and applies `pb-*` only in horizontal mode, while indentation that should follow the text flow uses `margin-inline-start`.
- Treat `TtsAbortError` as expected control flow for stop/cancel (check `instanceof` and `Error.name`, since dev can load duplicate module instances). Keep prepare, replay-after-stop, and stale-generation handling inside `@repo/tts`, not duplicated in UI components. VOICEVOX credentials stay in `$env/dynamic/private` and never inside `@repo/tts`.
- Mutate reactive collections through `SvelteMap` methods (`set`, `delete`) rather than replacing or spreading them, and keep `SvelteMap` out of `PersistedState`.

## Change Validation

- Run the narrowest package command first, then broaden for shared changes.
- Web UI: `pnpm --filter web typecheck` and `pnpm --filter web lint`.
- Novel parser: `pnpm --filter @repo/novel-parser test`, `pnpm --filter @repo/novel-parser typecheck`, and its lint task.
- TTS package: `pnpm --filter @repo/tts typecheck` and its lint task. It has no build step; consumers import `src/index.ts` directly.
- API package: `pnpm --filter @repo/api typecheck` and its lint task.
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm build` for cross-workspace changes. `.github/workflows/lint.yaml` runs `pnpm typecheck` and `pnpm lint` on `main` pushes and pull requests, passing `PUBLIC_VOICEVOX_ENGINE_API_ENABLED` from repository variables; locally that variable comes from `apps/web/.env` (see `apps/web/.env.example`). It is a `$env/static/public` variable, so type checking and building `apps/web` fail while it is unset. Its `pull_request_target` jobs are limited to same-repository head branches (`github.event.pull_request.head.repo.full_name == github.repository`) because the workflow checks out and executes the PR's code; keep that guard when you touch the trigger or the checkout.
- Browser behavior involving dialogs, selection, scrolling, IndexedDB, PWA/offline, or speech still needs an interactive check because static commands do not cover it.

## Release

Releases are managed by Release Please (`.github/workflows/release-please.yaml`, `release-please-config.json`, `.release-please-manifest.json`) from conventional commits pushed to `main`. Each configured package (`apps/web`, `packages/api`, `packages/assets`, `packages/novel-parser`, `packages/tts`) gets its own release PR, `CHANGELOG.md`, and `<component>-v<version>` tag (`separate-pull-requests`), so packages can be released independently. The component is the package name with the npm scope stripped, so `@repo/tts` tags as `tts-v<version>`.

- The node strategy writes the version into each package's own `package.json`, so the version shown in the settings page of `apps/web` follows releases with no extra wiring.
- The `node-workspace` plugin releases dependents when a local dependency is released. `workspace:*` ranges are left untouched, because release-please skips dependency ranges that start with a protocol (`workspace:`).
- Only `feat` (minor), `fix`/`perf`/`revert` (patch), and breaking changes (major) are releasable units. `chore`, `docs`, `style`, `refactor`, `test`, `build`, and `ci` are hidden from the changelog, so a package whose commits are all of those types gets no release PR at all (`No user facing commits found ... - skipping`). Use a releasable type (`git commit --allow-empty -m "fix: ..."` works for a release-only commit) when a release is required.
- Commits are attributed to packages by path. Changes limited to the repository root or to the tooling packages (`packages/eslint-config`, `packages/tsconfig`) never trigger a release.
- Every release PR rewrites `.release-please-manifest.json`, so merge release PRs one at a time. `always-update` is enabled, so every run recreates the branch of each open release PR from the current `main` (release-please otherwise only updates a PR when its release notes change), which keeps the manifest edits mergeable.
- Do not edit `CHANGELOG.md` or `.release-please-manifest.json` by hand.
- `.github/workflows/release-please.yaml` authenticates with a GitHub App installation token (`actions/create-github-app-token` reading `vars.RELEASE_PLEASE_APP_CLIENT_ID` and `secrets.RELEASE_PLEASE_APP_PRIVATE_KEY`, narrowed to `contents`/`issues`/`pull-requests` write) rather than `GITHUB_TOKEN`, and passes it to the action through `token:`. `GITHUB_TOKEN` is what makes automation-created PRs unusable for CI: their `pull_request` runs stay in the approval-required state and their `pull_request_target` runs are never created, so `Commitlint` and `Lint` would never start on a release PR by themselves. Keep the job's `GITHUB_TOKEN` permissions read-only and do not add secrets or write permissions to the CI workflows — the App token is the only elevated credential in the workflows.

## Deployment

- The web app targets Cloudflare Workers via `@sveltejs/adapter-cloudflare`; runtime config is `apps/web/wrangler.jsonc` (`nodejs_als` plus `global_fetch_strictly_public`). The latter routes global `fetch()` as if the request came from the public Internet (looping back through Cloudflare's front door) instead of sending it to the zone origin or an internal Worker, which is what lets the app call another Worker on the same account instead of failing with 404 or error 1042.
- Build first (`pnpm --filter web build`), then run wrangler from `apps/web` (`pnpm --filter web exec wrangler deploy --dry-run` to validate, `... wrangler deploy` to publish). Wrangler must run after a build with the app directory as cwd.
- Do not name a script `deploy`: `pnpm deploy` is a pnpm built-in command, so `pnpm --filter web deploy` never reaches a script with that name and fails with `ERR_PNPM_INVALID_DEPLOY_TARGET` when no target directory is given. `apps/web` currently has neither a `deploy` nor a `preview:workers` script, so the root `deploy:web` and `preview:workers:web` helpers fail as well; invoke wrangler directly.

## Generated Files

- Do not edit `node_modules`, `.svelte-kit`, `dist`, or `.turbo` output directly.
- Update dependencies through pnpm so `pnpm-lock.yaml` changes are generated consistently.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
