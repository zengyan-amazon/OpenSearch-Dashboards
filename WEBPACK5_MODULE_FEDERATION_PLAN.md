# Webpack 5 Module Federation Roadmap

## Guiding Principles
- Keep the pilot self-contained so the Webpack 4 optimizer continues to power day-to-day development and releases.
- Grow the Webpack 5 path incrementally: add one capability, verify it in isolation (`yarn build:v5`/`--watch`), and only then move to the next item.
- Treat shared dependencies (React, EUI, Monaco, etc.) as first-class remotes so future plugins can load independently from CDNs.

## Phase 1 – Pilot Scaffolding (✅)
1. **Bootstrap command surface**: add `scripts/build_v5.js`, a `yarn build:v5` script, and a dedicated `webpack5` dependency alias.
2. **Create isolated output**: emit bundles into `build_v5/` without touching legacy artifacts; provide `yarn clean:v5` to reset the directory.
3. **Stand up base config**: introduce `webpack.v5.config.js` with a tiny demo entry and minimal loader chain (JS/CSS/assets).

## Phase 2 – Shared Dependencies & Core Host (✅)
1. **Shared deps remote**: package `packages/osd-ui-shared-deps` + theme CSS into `osd_shared_deps.remoteEntry.js`.
2. **Core host wrapper**: land `webpack5_pilot/core_host_entry.ts` that initializes the default MF share scope and then imports `src/core/public/osd_bootstrap`.
3. **MF wiring**: mark shared libraries as `import: false` on the host, expose `demo_module` on the pilot remote, and confirm the host resolves React/EUI from the remote.
4. **Warning hygiene**: filter the type-only re-export warnings that Babel surfaces so pilot builds are signal-rich.

## Phase 3 – Plugin Enablement (🛠️ next)
1. **Manual verification harness (✅):** `yarn start:v5` runs `webpack-dev-server`, rendering the standard OpenSearch Dashboards HTML template with the pilot bundles for quick runtime checks.
2. Expand the allowlist/entry discovery to include a sample plugin remote.
3. Prototype consuming that plugin from the host via dynamic `import('plugin/<id>')`.
4. Document required manifest metadata for plugins opting into Module Federation.
5. Verify with `yarn build:v5` and a lightweight runtime harness (HTML stub) that loads both host and remote bundles.

### Immediate Next Steps
1. **Wire core bootstrap through the pilot host** so the standard OSD shell mounts successfully once the MF share scope is initialized. *(Status: host now calls `__osdBootstrap__()` after loading shared deps and bundles.)*
2. **Integrate one real plugin entry** (e.g. `home`) via the allowlist + MF expose/remotes, providing the minimum start-deps shim required for it to render. *(Status: `src/plugins/home/public/index.ts` is now part of the allowlist, exposed as `osd_pilot/homePlugin`, and a stub mount renders the Home UI after core bootstrap.)*
3. **Revisit the pilot demo remote** and expose a rendering helper that the host can call after core + plugin boot to validate remote consumption in the finalized flow.

## Phase 4 – Developer Workflow
1. Add `yarn build:v5 --watch` support and hot reload-friendly configs.
2. Provide scaffolding docs for plugin authors (command snippets, required config flags).
3. Integrate lint/test hooks that validate remote manifests and shared dependency constraints.

## Phase 5 – Parity & Rollout
1. Compare bundle size, build time, and cache behavior vs. Webpack 4 optimizer.
2. Address parity gaps (i18n, theming, legacy loaders, SSR-specific shims).
3. Offer a gated “opt-in” flag for early adopters before considering a default switch.
4. Plan CI coverage (unit + functional suites) for the Webpack 5 path.

## Verification Checklist
- `yarn build:v5` succeeds with remote + host outputs and no unexpected warnings.
- Shared deps bundles remain stable even when adding new host entries.
- Pilot documentation stays in sync with each phase; change log captures every code update tied to roadmap steps.
