# Webpack 5 Module Federation Progress Log

## Phase 1 – Pilot Scaffolding
- `scripts/build_v5.js` now resolves the `webpack5` alias, short-circuits when the package is missing, and orchestrates single-run or watch builds with shared stat handling.
- `package.json` includes `build:v5`/`clean:v5` scripts and the `webpack5` dependency alias so the pilot toolchain coexists with Webpack 4.
- Initial loader wiring (JS, CSS, assets) in `webpack.v5.config.js` emits bundles into `build_v5/`, keeping legacy outputs untouched.

## Phase 2 – Shared Dependencies & Core Host
- The shared-config half of `webpack.v5.config.js` exposes `packages/osd-ui-shared-deps/entry.js` plus theme CSS through `osd_shared_deps.remoteEntry.js`.
- The host config consumes those remotes, marks shared libraries with `import: false`, and surfaces the pilot demo as an exposed module.
- `webpack5_pilot/core_host_entry.ts` initializes Module Federation’s default scope, imports the shared-deps remote, and then loads `src/core/public/osd_bootstrap`.
- `webpack5_pilot/entry_allowlist.json` ensures the wrapper entry is discovered alongside the demo bundle.
- `scripts/build_v5.js` filters the noisy type-only re-export warnings while preserving real diagnostics, producing clean stats by default.

## Phase 3 – Plugin Enablement
- `yarn start:v5` now runs `webpack-dev-server` on port 9500, reusing the core rendering template (`src/core/server/rendering/views/template.tsx`) to host the pilot bundles and serving `/ui` assets from `src/core/server/core_app/assets`, so the browser experience mirrors the main app shell.
- Added `/startup.v5.js` and `/bootstrap.v5.js` endpoints so the dev server loads the MF remote/host bundles sequentially and invokes `__osdBootstrap__`, plus a stub `/translations/en.json` response to satisfy the i18n loader during bootstrap. `webpack5_pilot/core_host_entry.ts` now ensures the MF share scope is primed and calls the exported `__osdBootstrap__()` (with error logging) once the bundles are ready. Core UI settings defaults are sourced via `getCoreSettings()` (with minimal plugin defaults like `home:useNewHomePage`) so `uiSettings.get()` calls succeed during startup, and the dev server now stubs `/api/opensearch-dashboards/settings`, `/api/core/capabilities`, and `/api/status` to unblock the shell without a running backend.
- `webpack5_pilot/entry_allowlist.json` now lists `src/plugins/home/public/index.ts`, producing a `home.bundle.js` artifact in `build_v5/` for upcoming Module Federation plugin shims.
- `webpack.v5.config.js` exposes the Home plugin entry (`./homePlugin`) via the existing `osd_pilot.remoteEntry.js`, enabling the host to import the plugin initializer through Module Federation. `webpack5_pilot/core_host_entry.ts` now stub-mounts the Home plugin UI after core bootstrap using minimal service shims, normalises `process.env` on `window`, and forces a `#/` hash so the plugin router activates—resulting in visible Home content without a backend.
- `scripts/serve_v5.js` patches the hoisted `mime` package to restore the legacy `charsets.lookup` helper so Express middleware used by `webpack-dev-server` continues to emit headers without crashing under Node 20.
- Upcoming: extend entry discovery to cover plugin remotes, wire dynamic imports in the host, and document opt-in manifests.

## Upcoming Work (Phases 4–5)
- Add watch-mode ergonomics, plugin author docs, and CI coverage before evaluating a broader rollout.
