# Webpack 5 Pilot Build Plan

## Goals
- Prototype a Webpack 5-based build that coexists with the current Webpack 4 optimizer.
- Keep the entry point simple (e.g. a new CLI script + config) so experiments don’t disturb existing release builds.
- Produce isolated artifacts for inspection and Module Federation trials.

## Phase 1: Minimal Pipeline
1. Scaffold the command: create `scripts/build_v5.js` that shells out through `scripts/use_node` and, for now, checks prerequisites (webpack ≥5 present, output folder).
   - **Verify:** Run `yarn build:v5` and confirm the scaffold executes (even if it only prints a readiness message).
2. Add a Yarn command (`yarn build:v5`) that runs the script via `scripts/use_node`.
3. Declare a dedicated dependency alias (`webpack5`: `npm:webpack@^5.x`) so the pilot can coexist with the legacy `webpack` v4 dependency.
   - **Verify:** `yarn build:v5` should now report the missing `webpack5` install rather than falling back to `webpack` v4.
4. Author a standalone config (`webpack.v5.config.ts|js`) targeting a tiny bundle (demo entry) and emitting to `build_v5/`.
5. Update the script to invoke Webpack with that config.
   - **Verify:** Run `yarn build:v5` and confirm the pilot bundle lands in `build_v5/` without touching existing assets.
6. Ensure shared deps are treated as externals or bundled minimally; wire in Module Federation settings only for the chosen pilot entry as follow-up micro-steps, verifying each change with a targeted build run.
   - **Verify:** After adding Module Federation wiring or externals, rerun `yarn build:v5` and confirm the new assets (e.g. `*.remoteEntry.js`) appear while the legacy build artifacts remain untouched.

## Phase 2: Bundle Expansion
1. Teach the config to discover entries from plugin manifests or an allowlist, mirroring the current optimizer’s scanning logic but in a simplified form.
   - **Status:** Allowlist-based entry resolution implemented (`webpack5_pilot/entry_allowlist.json`); future work can extend this to plugin manifests.
2. Add support for generating CSS, assets, and public path handling (reuse loaders from `packages/osd-optimizer` where possible).
   - **Status:** CSS bundling, asset modules (SVG/fonts/images), and TS/TSX transpilation via `babel-loader` + `@osd/babel-preset/webpack_preset` are now wired up.
3. Wire the host to consume `osd_shared_deps` so core boots against shared React/EUI instances and suppress noisy type-only export warnings while we rely on Babel.
   - **Status:** `webpack5_pilot/core_host_entry.ts` now preloads the remote container, the host configuration marks the shared packages as `import: false`, and `scripts/build_v5.js` strips the TS re-export warnings from the stats output; `yarn build:v5` emits lean `core.bundle.js` and `pilot.bundle.js` alongside `osd_shared_deps.remoteEntry.js`.
4. Document how to run both builds -> compare output structure, bundle size, and runtime behavior.
5. **Verify:** Execute the expanded build on a larger bundle set and spot-check assets, ensuring legacy Webpack 4 output remains unchanged.

## Phase 3: Developer Workflow
1. Introduce watch mode (`yarn build:v5 --watch`) to mimic the existing dev loop.
2. Provide guidance for plugin authors to opt in (e.g. sample Module Federation remote/host config).
3. Integrate optional lint/tests to verify bundle integrity (dynamic import checks, shared dep validation).
4. **Verify:** Exercise watch mode on a sample plugin and validate that the new developer guidance produces a working remote/host pairing.

## Phase 4: Evaluation & Rollout
1. Track key metrics (build time, bundle size, module split) vs. the Webpack 4 optimizer.
2. Iterate on configuration gaps (alias handling, theming, i18n, legacy loaders).
3. Once feature parity is acceptable, decide whether to:
   - Replace the default optimizer with Webpack 5, or
   - Maintain both paths behind flags while phasing plugins over.
4. **Verify:** Before any rollout decision, run full CI or a curated regression suite covering both build paths.

This roadmap keeps the Webpack 5 pilot self-contained, enabling rapid experimentation without persisting complex TypeScript orchestration until it’s proven necessary.
