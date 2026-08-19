# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An [OpenCode](https://opencode.ai) plugin (`opencode-antigravity-auth`) that lets OpenCode authenticate against **Google Antigravity** via OAuth, so users can access Gemini 3.x and Claude 4.6 models using their Google credentials. It is shipped as an npm package; `index.ts` is the package entry and `dist/` is the published artifact.

`AGENTS.MD` covers the same ground for general AI agents and has fuller code-style detail — read it for conventions. This file focuses on the build/test commands and the big-picture architecture that spans multiple files.

## Build & Test

```bash
npm install
npm run typecheck                 # tsc --noEmit  (CI gate — must pass)
npm run build                     # tsc -p tsconfig.build.json → dist/
npm test                          # vitest run (all unit tests)
npm run test:coverage             # vitest run --coverage

# Single test
npx vitest run src/plugin/auth.test.ts          # one file
npx vitest run -t "test name here"              # one test by name
npx vitest --watch src/plugin/auth.test.ts      # watch a file

# E2E (hit live APIs — require authenticated accounts on disk)
npm run test:e2e:models
npm run test:e2e:regression

# Regenerate the published JSON schema from the Zod config schema
npm run build:schema              # script/build-schema.ts → assets/antigravity.schema.json
```

CI (`.github/workflows/ci.yml`, Node 20) runs **typecheck → test → build** in that order on every push/PR to `main`. All three must pass. No linter/formatter is configured; style is by convention.

## TypeScript Conventions (Enforced — Not Obvious)

- **`zod` is v4, not v3.** APIs differ; do not copy v3 patterns.
- `verbatimModuleSyntax: true` → use `import type { ... }` for type-only imports (build fails otherwise).
- `allowImportingTsExtensions: true` → relative imports use `.ts` extensions: `import { foo } from "./bar.ts"`.
- **No path aliases** — all imports are relative.
- `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride` are on; never use `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Formatting: 2-space indent, double quotes, trailing commas, **no semicolons**.
- Files: `kebab-case.ts`; tests colocated as `*.test.ts`; named exports only (no default exports in `src/`).

## Architecture

### The plugin is a `fetch` interceptor

`src/plugin.ts` (~3500 lines) is the orchestration hub. `createAntigravityPlugin(providerId)` returns an OpenCode plugin whose `auth.loader` installs a custom `fetch`. That fetch:

1. **Gates** on `isGenerativeLanguageRequest(input)` (from `request.ts`) — non-Gemini-Library requests pass through untouched.
2. Runs a `while (true)` loop that handles **account selection → token refresh → endpoint fallback → rate-limit backoff → response transform**, returning only when a real response is ready or all accounts are exhausted.

`plugin.ts` owns all the *cross-request* state machines (rate-limit dedup, account failure tracking, capacity backoff, quota refresh, toast debouncing). The *per-request payload* work lives elsewhere.

### Request / response transformation — `src/plugin/`

| File | Responsibility |
|------|----------------|
| `request.ts` | `prepareAntigravityRequest()` (build the Antigravity envelope, set headers, strip/inject thinking) and `transformAntigravityResponse()` (SSE streaming, `thought`→`reasoning`, envelope unwrap) |
| `transform/` | Claude-specific (`claude.ts`) and Gemini-specific (`gemini.ts`) transforms + cross-model sanitization. Barrel at `transform/index.ts` |
| `request-helpers.ts` | `cleanJSONSchemaForAntigravity()` (allowlist schema sanitizer), `deepFilterThinkingBlocks()`, empty-response detection |
| `thinking-recovery.ts` | Turn-boundary detection; closes corrupted turns so Claude can regenerate thinking |
| `recovery.ts` | Session recovery — injects synthetic `tool_result` blocks when tool execution is interrupted |
| `accounts.ts` | `AccountManager` — in-memory account pool, selection strategies, rate-limit/health tracking, fingerprint regeneration |
| `storage.ts` | Zod schemas + disk persistence for the account pool (versioned) |
| `rotation.ts` | Health-score and token-bucket trackers for the `hybrid` selection strategy |
| `quota.ts` | Calls the API usage-stats endpoint to read remaining quota |
| `config/` | `schema.ts` (Zod config schema) + `loader.ts` (file + env-var merge) + `model-mapping.ts` (loads `assets/model-mapping.json`) |

### Two quota pools, one plugin

The plugin impersonates two different Google clients via header styles (`src/constants.ts`):

- **`antigravity`** — Electron-style User-Agent + per-account device fingerprint → uses the **Antigravity** quota (Claude models *always* use this).
- **`gemini-cli`** — `google-api-nodejs-client` UA → uses the **Gemini CLI** quota (production endpoint only).

Model quota pool assignment is **data-driven** via `assets/model-mapping.json` (`pool` field). Currently all 4 supported models use the `antigravity` pool; `hasBothQuotaPools()` checks the mapping for presence of both pool types. `request.ts` rewrites model names per target API based on the mapping (e.g. `antigravity-gemini-3.7-flash-high` → `gemini-3.7-flash-high`).

### Endpoint fallback order

`ANTIGRAVITY_ENDPOINT_FALLBACKS` (constants.ts): `daily` sandbox → `autopush` sandbox → `prod` (`cloudcode-pa.googleapis.com`). Gemini-CLI header style skips the sandbox endpoints (they only accept Antigravity quota).

### Claude thinking strategy (load-bearing)

ALL thinking blocks are stripped from outgoing requests for Claude — Claude regenerates fresh thinking each turn, which eliminates signature-validation errors. Signed thinking from responses is cached and re-injected *only before `tool_use` blocks on the first assistant message of a turn* (the API requires thinking before tool use). Touching this logic without reading `thinking-recovery.ts` + the Claude section of `docs/ARCHITECTURE.md` will break multi-turn tool use.

### Runtime files (user machine, not repo)

All under `~/.config/opencode/` on every platform (Windows included — `~` is the user home, **not** `%APPDATA%`; override with `OPENCODE_CONFIG_DIR`):

- `opencode.json` — OpenCode config; lists this plugin in `plugin` (singular) and defines models
- `antigravity-accounts.json` — account pool incl. OAuth refresh tokens (**sensitive**)
- `antigravity.json` — this plugin's optional config
- `antigravity-logs/` — debug logs (when `OPENCODE_ANTIGRAVITY_DEBUG=1|2`)

## Deeper Documentation

- `docs/ARCHITECTURE.md` — request/response flow, Claude handling, session recovery, schema cleaning
- `docs/ANTIGRAVITY_API_SPEC.md` — Antigravity API reference
- `docs/CONFIGURATION.md`, `docs/MULTI-ACCOUNT.md`, `docs/MODEL-MAPPING.md`, `docs/TROUBLESHOOTING.md`
- `README.md` — install/usage and the full copy-paste model config
- `CHANGELOG.md` — version history
