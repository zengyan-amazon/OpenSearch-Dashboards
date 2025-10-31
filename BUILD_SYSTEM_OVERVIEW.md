# OpenSearch Dashboards Build System

This note traces what happens when you run `yarn build`, highlighting the exact code that launches browser bundling and server transpilation.

## Command Entry and CLI
- `package.json` maps `build` to `scripts/use_node scripts/build --all-platforms`. The `scripts/use_node` wrapper selects/boots a Node runtime and runs `scripts/build.js`.
- `scripts/build.js` loads `src/setup_node_env` (registering `@osd/optimizer` hooks) and executes `src/dev/build/cli.ts`.
- `src/dev/build/cli.ts` parses flags via `src/dev/build/args.ts` and calls `buildDistributables(log, buildOptions)`.

## Configuration Bootstrap
- `src/dev/build/build_distributables.ts` creates a `Config` (`src/dev/build/lib/config.ts`) that reads version metadata and target platforms, and sets up a `Build` context rooted at `build/opensearch-dashboards`.
- `createRunner` (`src/dev/build/lib/runner.ts`) walks the ordered task list exported from `src/dev/build/tasks`, passing each task the config, log, and build instance.

## Task Pipeline Overview
1. **Environment prep**
   - `VerifyEnv` (`src/dev/build/tasks/verify_env_task.ts`) checks the local Node version.
   - `Clean` (`src/dev/build/tasks/clean_tasks.ts`) clears previous `build/`, `target/`, `.node_binaries` directories.
   - Node binaries are downloaded or verified via tasks in `src/dev/build/tasks/nodejs/` (`DownloadNodeBuilds`, `VerifyExistingNodeBuilds`, `ExtractNodeBuilds`).

2. **Generic build assembly**
   - `CopySource` (`src/dev/build/tasks/copy_source_task.ts`) copies production-ready source into `build/opensearch-dashboards`, stripping tests/mocks and normalizing `yarn.lock` paths.
   - Optional internationalization is bundled by `CopyTranslations` (`src/dev/build/tasks/copy_translations_task.ts`).
   - `CopyBinScripts`, `CreateEmptyDirsAndFiles`, `CreateReadme` prepare runtime scaffolding.
   - `BuildPackages` (`src/dev/build/tasks/build_packages_task.ts`) runs `@osd/pm` to build workspace packages into the staging tree; `InstallDependencies` (`src/dev/build/tasks/install_dependencies_task.ts`) installs production dependencies with Yarn.

   ### Browser bundling entry point
   - **Task:** `BuildOpenSearchDashboardsPlatformPlugins` (`src/dev/build/tasks/build_opensearch_dashboards_platform_plugins.ts`)
   - **Trigger:** Calls `runOptimizer(config)` at line 57. The optimizer orchestrates webpack compilations defined in `packages/osd-optimizer/src/worker/webpack.config.ts`, generating JS/CSS bundles for every core and plugin `public/` entry. Outputs are written under `build/opensearch-dashboards/built_assets/` and `plugins/<id>/target/`.
   - **Supporting code:** Optimizer configuration lives in `packages/osd-optimizer/src/optimizer/optimizer_config.ts`; custom webpack plugins/loaders (e.g., `bundle_refs_plugin.ts`, `theme_loader.ts`) enforce manifest requirements and theming.

   ### Server transpilation entry point
   - **Task:** `TranspileBabel` (`src/dev/build/tasks/transpile_babel_task.ts`)
   - **Trigger:** Two calls to `transpileWithBabel`:
     - Lines 74-81 transpile server/runtime code (`!**/public/**`) using the Node preset (`@osd/babel-preset/node_preset`). This converts TypeScript/modern JS under `src/**` into CommonJS ready for Node.
     - Lines 86-90 pre-transpile TypeScript inside `public/` folders, using the webpack preset to align with optimizer expectations.
   - Outputs replace the copied sources directly in `build/opensearch-dashboards`, so the packaged Node runtime executes these transpiled files without further compilation.

   - After compilation, cleanup tasks (`RemoveWorkspaces`, `CleanPackages`, `CleanTypescript`, `CleanExtraFilesFromModules`) prune workspace metadata, duplicate sources, and unused artifacts. Compliance tasks (`CreateNoticeFile`, `UpdateLicenseFile`) generate NOTICE and LICENSE files, and `CleanEmptyFolders` removes empty directories.

3. **Platform-specific staging**
   - `CreateArchivesSources` clones the generic build into per-platform directories and copies Node runtimes (`src/dev/build/tasks/create_archives_sources_task.ts`).
   - `PatchNativeModules` swaps in prebuilt native binaries (`src/dev/build/tasks/patch_native_modules_task.ts`), and auxiliary tasks (`CleanExtraBinScripts`, `CleanNodeBuilds`, `PathLength`, `UuidVerification`) finalize the tree.

4. **Artifact packaging & publishing**
   - `CreateArchives` (`src/dev/build/tasks/create_archives_task.ts`) compresses platform trees into `.tar.gz` or `.zip` archives under `target/`.
   - OS package tasks (`CreateDebPackage`, `CreateRpmPackage`, etc.) reside in `src/dev/build/tasks/os_packages/`; Docker images are built via `CreateDockerPackage` and `CreateDockerUbiPackage`.
   - `WriteShaSums` (`src/dev/build/tasks/write_sha_sums_task.ts`) produces SHA1 checksums for release artifacts.

## Browser vs Server Outputs (with pointers)
- **Browser bundles**
  - Triggered by `BuildOpenSearchDashboardsPlatformPlugins` → `runOptimizer(config)`.
  - Webpack config: `packages/osd-optimizer/src/worker/webpack.config.ts` (entry creation, loaders, output naming).
  - Resulting assets: `build/opensearch-dashboards/built_assets/*`, plugin-specific `plugins/<id>/target/public/` directories.

- **Server code**
  - Transpiled by `TranspileBabel` (Node preset) and `BuildPackages` outputs.
  - Babel presets: `@osd/babel-preset/node_preset` and `@osd/babel-preset/webpack_preset` (see `src/dev/build/tasks/transpile_babel_task.ts`).
  - Runtime tree: `build/opensearch-dashboards/**` (after Babel), with third-party deps under `build/opensearch-dashboards/node_modules/` installed by `InstallDependencies`.

## Key Outputs
- `build/opensearch-dashboards/` – staging tree containing transpiled server JS, optimizer-generated browser bundles, configs, and scripts.
- `build/opensearch-dashboards-<version>-<platform>/` – per-platform tree with bundled Node binaries and patched natives.
- `target/` – final distributables (archives, optional OS packages, Docker contexts) plus SHA sums.

Use these pointers to trace exactly where each piece of the build is initiated and which files control it.
