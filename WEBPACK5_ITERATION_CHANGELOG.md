# Webpack 5 Pilot – Change Log

The notes below capture the concrete updates that landed before the new iteration plan. File paths are workspace-relative.

## Plugin Runtime Coverage (Plan Step 1 / former #2)
- `webpack5_pilot/entry_allowlist.json` now includes `src/plugins/home/public/index.ts` so the Home plugin builds under webpack 5.
- `webpack.v5.config.js` exposes the Home entry through `osd_pilot.remoteEntry.js` alongside the demo module and wires shared React/EUI/Monaco deps.
- `webpack5_pilot/core_host_entry.ts` primes the Module Federation share scope, forces the `#/` hash route, and supplies stubbed start contracts (uiSettings, chrome, saved objects, tutorial catalogue) so Home mounts without a backend. It now keeps the legacy Home route active (`home:useNewHomePage=false`) until the content-management stubs can supply richer data, sets services before loading the Home application bundle to avoid `getServices()` races, registers `window.__osdV5HostStart` so the dev server can trigger the bootstrap without depending on `window.__osdBootstrap__` being global, swaps the eager `BehaviorSubject` dependency with a minimal in-file subject to avoid MF consumption errors, and expands the application capability stub (navLinks, advanced settings, getUrlForApp, currentAppId$) to satisfy the Home header actions.
- `webpack5_pilot/entry_allowlist.json` now lists the Navigation, Console, and Dev Tools plugin entries, and `webpack.v5.config.js` exposes them from the `osd_pilot` remote so these core-first plugins compile under the pilot and can be consumed by Module Federation experiments. The application navigation stubs now drive `window.location` so app switches actually update the URL.
- `webpack5_pilot/osd_bundles.ts` plus a set of new wrapper entries register Navigation, Dev Tools, Console, and supporting stub plugins (`uiActions`, `urlForwarding`, `opensearchDashboardsLegacy`, `managementOverview`) with `__osdBundles__`, and `webpack5_pilot/entry_allowlist.json`/`webpack.v5.config.js` were expanded so those bundles build alongside the pilot host. The host now initializes `__osdBundles__` on load and defers calling `__osdBootstrap__` until the bootstrap script completes so plugin lookups succeed.

## Host/Remote Dev Harness (Plan Step 2 / former #3)
- `scripts/serve_v5.js` serves bundled assets via `webpack-dev-server`, reuses the production HTML template, and stubs `/api` + translation endpoints for browser bootstrap. The bootstrap helper now prefers the new `__osdV5HostStart` entry point, sets the theme tag, and preloads `osd-ui-shared-deps.v9.light.css` so the pilot renders with the standard EUI/OSD styling even when the shared remote is loaded lazily, `/app/*` routes now render the same HTML shell to keep browser-side routing working, and the injected metadata now lists the stub/manifests for the pilot plugins so CoreSystem loads them during bootstrap. The startup script also preloads the navigation/Dev Tools/Console/stub bundles before the host runs so plugin definitions are ready when `__osdBootstrap__` initializes.
- Added startup wiring (`/bootstrap.v5.js`, `/startup.v5.js`) so the host loads shared deps, then imports the pilot remote and calls `__osdBootstrap__()`.
- Patched the hoisted `mime` dependency at server start to restore `charsets.lookup`, preventing Express crashes on Node 20.

## Core Bootstrap Hardening (Plan Step 3 / former #1)
- `scripts/build_v5.js` orchestrates single-run and watch builds, filters noisy Babel warnings, and prints loader diagnostics behind `BUILD_V5_DEBUG`.
- `webpack.v5.config.js` layers Babel/TS/CSS/SVG loaders, emits assets to `build_v5/`, and provides `osd_shared_deps.remoteEntry.js` plus theme CSS bundles.
- `package.json` scripts add `build:v5`, `clean:v5`, and `start:v5`; `scripts/clean_v5.js` removes the pilot output folder.
- `webpack5_pilot/dev_server` helpers define translations, uiSettings defaults, nav links, and other shims required for the shell to boot.

## Auxiliary Updates
- `WEBPACK5_MODULE_FEDERATION_PLAN.md` and `WEBPACK5_MODULE_FEDERATION_PROGRESS.md` stay up to date with roadmap milestones and runtime observations.
- Documentation across `README.md` family references the new commands where relevant.
