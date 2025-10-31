# Repository Guidelines

This guide helps contributors land changes in OpenSearch Dashboards quickly.

## Project Structure & Module Organization
Core application modules live in `src/` with feature plugins under `plugins/`. Shared build tooling and package helpers sit in `packages/`, `scripts/`, and `dev-tools/`. Browser assets compile to `built_assets/`; raw icons stay in `assets/`. Tests split across `test/` (Jest), `cypress/` (Cypress), and `baselines/` (Lighthouse). Reference docs in `docs/` when updating user-facing flows.

## Build, Test, and Development Commands
Run `yarn osd bootstrap` after cloning or pulling to install dependencies and link internal packages. Launch a secured dev server with `yarn start:security`; use `yarn start` for a faster loop without security plugins. Build distributable artifacts with `yarn build-platform --linux --skip-os-packages` or adjust flags for macOS and Windows. When iterating on backend APIs, `yarn test:ftr:server` starts the functional test server and `yarn test:ftr:runner` executes suites against it.

## Coding Style & Naming Conventions
The repo enforces two-space indentation via `.editorconfig`. TypeScript and modern React (hooks) are preferred; keep new modules under `src/<area>/` with a matching `index.ts`. Name files using kebab-case for directories and camelCase for exported symbols. Unit tests mirror implementation paths and end with `.test.ts|tsx`. Linting uses `yarn lint:es` (ESLint + TypeScript ESLint rules) and `yarn lint:style` (Stylelint for Sass); run both before opening a PR.

## Testing Guidelines
Use Jest for unit and integration coverage and maintain >=80% coverage on touched files. Write component tests with React Testing Library helpers rather than Enzyme. Cypress specs belong in `cypress/integration/` and should rely on `data-test-subj` selectors; run `yarn cypress:run-with-security` for CI parity or `yarn cypress open` while debugging. Backwards compatibility and API validations run through `yarn test:bwc`. Document any new mock utilities in `src/test_utils/` to keep suites deterministic.

## Commit & Pull Request Guidelines
Follow the existing Git history: start commit subjects with an imperative verb, optionally bracket the scope (for example `[Explore] Fix trace filters`) and reference the PR number at merge time. Each PR should include a concise summary, linked issues, screenshots or GIFs for UI changes, and notes about added tests. Ensure GitHub checks are green (lint, typecheck, Jest, Cypress where applicable) before requesting review, and add release-note entries when behavior changes users might notice.

## Security & Configuration Tips
The default config lives in `config/opensearch_dashboards.yml`; avoid committing secrets and prefer environment overrides. When working with security features, clone the `security-dashboards-plugin` into `plugins/` and run `yarn start:security`. Use `yarn opensearch` to launch a local OpenSearch cluster; stop it via `yarn opensearch stop` once finished. Report vulnerabilities privately via `SECURITY.md`.

## Misc 

### apply_patch — REQUIRED (important)

- Virtual tool: `apply_patch` is implemented inside the Codex executable (invoked via `--codex-run-as-apply-patch`). There is no standalone `apply_patch` binary on `PATH`.

- Preferred invocation (structured command array):
  - `["apply_patch", "*** Begin Patch\n*** Update File: path/to/file\n@@\n- old\n+ new\n*** End Patch\n"]`
  - Explanation: pass the full patch text as the second element (including `*** Begin Patch`/`*** End Patch`).

- If you must use a heredoc, wrap it with `bash -lc` so the runner interprets the heredoc as shell would:
  - `["bash","-lc","apply_patch <<'EOF'\n*** Begin Patch\n...\n*** End Patch\nEOF\n"]`
  - Avoid passing the heredoc markers as a literal argv string (e.g. `["apply_patch","<<'EOF'...EOF"]`) because that may be interpreted literally and is not reliably parsed.

- Command name variants: do not use `apply-patch` (with a hyphen) or other unapproved variants; detection expects `apply_patch` (and in limited cases `applypatch`).

- If you need to run a small script that includes `apply_patch` (for example `cd repo && apply_patch <<'EOF'...EOF`), prefer wrapping the entire script in `bash -lc`, or pass the patch text directly as the second argument.