# Module Federation (MFE) in OpenSearch Dashboards

OpenSearch Dashboards supports **Module Federation** (MFE) for loading plugins as independently built and deployed microfrontend modules. This allows plugins to be compiled separately using [Rspack](https://rspack.dev/) and loaded dynamically at runtime, rather than being bundled monolithically by the OSD optimizer.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Building MFE Plugins](#building-mfe-plugins)
- [Developing MFE Plugins](#developing-mfe-plugins)
- [Creating a New MFE Plugin](#creating-a-new-mfe-plugin)
- [How It Works](#how-it-works)
- [Shared Dependencies](#shared-dependencies)
- [Fallback Behavior](#fallback-behavior)
- [Troubleshooting](#troubleshooting)

## Overview

In **traditional mode** (default), all UI plugins are compiled into a single bundle by the OSD optimizer and loaded together when the page boots. This works well but means every code change requires the optimizer to rebuild, and all plugins ship as one monolithic payload.

In **MFE mode**, plugins marked with `"mfe": true` in their manifest are built as Module Federation _remotes_. At runtime, the OSD host application initializes the Module Federation runtime and loads each remote plugin's `remoteEntry.js` independently. This enables:

- **Independent builds** -- each MFE plugin is compiled with Rspack in seconds, not minutes
- **Independent deployment** -- plugins can be updated without rebuilding the entire application
- **Shared dependencies** -- React, EUI, lodash, and other core libraries are shared between host and remotes to avoid duplication
- **Graceful fallback** -- if a remote fails to load, OSD automatically falls back to the traditional `.plugin.js` bundle

## Architecture

```
                        ┌──────────────────────────────┐
                        │   opensearch_dashboards.yml   │
                        │   mfe.enabled: true           │
                        └──────────────┬───────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
          ▼                            ▼                            ▼
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  Server-Side     │     │  Bootstrap Template   │     │  Build System    │
│                  │     │                       │     │                  │
│  plugin_manifest │     │  bootstrap_mfe.js.hbs │     │  build_mfe.js    │
│  _parser.ts      │     │                       │     │  @osd/mfe        │
│  rendering_      │     │  - initMfeHost()      │     │  rspack config   │
│  service.tsx     │     │  - loadMfeRemotes()   │     │                  │
│  ui_render_      │     │  - fallback logic     │     │  Output:         │
│  mixin.js        │     │                       │     │  remoteEntry.js  │
└──────────────────┘     └──────────────────────┘     └──────────────────┘
          │                            │                            │
          │         ┌──────────────────┘                            │
          │         │                                               │
          ▼         ▼                                               │
┌─────────────────────────────┐                                    │
│       Browser Runtime        │◄───────────────────────────────────┘
│                              │
│  1. Load shared deps         │
│  2. Load core.entry.js       │
│  3. Init MF runtime          │
│  4. loadRemote() per plugin  │
│  5. Register on __osdBundles │
│  6. Bootstrap core           │
└──────────────────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `@osd/mfe` package | `packages/osd-mfe/` | Core MFE library: host init, shared deps bridge, remote loader, Rspack config generator |
| MFE config schema | `src/core/server/mfe/mfe_config.ts` | Defines `mfe.enabled`, `mfe.fallback`, `mfe.timeout`, `mfe.remotes` settings |
| Plugin manifest parser | `src/core/server/plugins/discovery/plugin_manifest_parser.ts` | Recognizes `"mfe": true` in plugin manifests |
| Rendering service | `src/core/server/rendering/rendering_service.tsx` | Injects `mfePlugins` metadata into page when MFE is enabled |
| UI render mixin | `src/legacy/ui/ui_render/ui_render_mixin.js` | Selects MFE or traditional bootstrap template, collects remote entries |
| MFE bootstrap template | `src/legacy/ui/ui_render/bootstrap/bootstrap_mfe.js.hbs` | Browser-side MFE initialization and remote loading with fallback |
| Build script | `scripts/build_mfe.js` | Discovers and builds MFE-enabled plugins using Rspack |
| Dev server | `scripts/serve_mfe.js` | Serves MFE bundles locally for development |
| Shared deps | `packages/osd-ui-shared-deps/` | Exports shared libraries including `@module-federation/runtime` |

## Configuration

MFE is configured in `config/opensearch_dashboards.yml`:

```yaml
# Enable Module Federation mode
mfe.enabled: true
```

### Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `mfe.enabled` | `boolean` | `false` | Enable or disable Module Federation plugin loading |
| `mfe.fallback` | `boolean` | `true` | Fall back to traditional bundles if MFE loading fails |
| `mfe.timeout` | `number` | `10000` | Timeout in milliseconds for loading remote plugins |
| `mfe.remotes` | `object` | `{}` | Override remote entry URLs for specific plugins (for external hosting) |

### Example: Full Configuration

```yaml
# Enable MFE mode
mfe.enabled: true

# Fall back to traditional loading on failure (default)
mfe.fallback: true

# 15-second timeout for remote loading
mfe.timeout: 15000

# Override remote entry URLs (optional, for external hosting)
mfe.remotes:
  myPlugin:
    url: https://cdn.example.com/plugins/myPlugin/remoteEntry.js
```

When `mfe.enabled` is `false` (default), OSD operates in traditional mode and all MFE-related code paths are skipped entirely.

## Building MFE Plugins

### Prerequisites

The `@osd/mfe` package must be built before running the MFE build script:

```bash
# Bootstrap builds all packages including @osd/mfe
yarn osd bootstrap
```

### Build Commands

```bash
# Build all MFE-enabled plugins
node scripts/build_mfe.js

# Build a specific plugin
node scripts/build_mfe.js --plugin-id=mfeExample

# Production build (minified, with Brotli and gzip compression)
node scripts/build_mfe.js --dist

# Watch mode (rebuilds on file changes)
node scripts/build_mfe.js --watch

# Watch a specific plugin
node scripts/build_mfe.js --plugin-id=mfeExample --watch
```

### Build Output

For each MFE-enabled plugin, the build produces:

```
{pluginDir}/target/public/mfe/
  remoteEntry.js          # Module Federation entry point
  remoteEntry.js.map      # Source map
  0.a1b2c3d4.js          # Code-split chunks (content-hashed)
  0.a1b2c3d4.js.map
  ...
```

In production mode (`--dist`), the output also includes `.br` (Brotli) and `.gz` (gzip) compressed variants.

### Important: Build Order

The OSD optimizer cleans `target/public/` when it starts. If you are running in dev mode, build the MFE bundles **after** the optimizer has finished its initial compilation:

```bash
# 1. Start OSD (which triggers the optimizer)
yarn start --run-examples

# 2. Wait for the optimizer to finish, then build MFE bundles
node scripts/build_mfe.js --plugin-id=mfeExample
```

Alternatively, use watch mode to automatically rebuild when the optimizer cleans the directory.

## Developing MFE Plugins

### Local Development Workflow

1. **Build the MFE plugin:**

   ```bash
   node scripts/build_mfe.js --plugin-id=mfeExample --watch
   ```

2. **Start OSD with MFE enabled:**

   In `config/opensearch_dashboards.yml`:
   ```yaml
   mfe.enabled: true
   ```

   ```bash
   yarn start --run-examples
   ```

3. **Navigate to the plugin** in the browser at `http://localhost:5601/app/<app-id>`.

### Serving MFE Bundles Externally

For development scenarios where the MFE bundle is served from a separate server:

1. **Build the plugin:**

   ```bash
   node scripts/build_mfe.js --plugin-id=mfeExample
   ```

2. **Start the dev server:**

   ```bash
   node scripts/serve_mfe.js --plugin-id=mfeExample --port=9001
   ```

   This serves the MFE bundle at `http://localhost:9001/remoteEntry.js` with CORS enabled.

3. **Configure OSD to use the external URL:**

   ```yaml
   mfe.enabled: true
   mfe.remotes:
     mfeExample:
       url: http://localhost:9001/remoteEntry.js
   ```

## Creating a New MFE Plugin

### 1. Add `"mfe": true` to the Plugin Manifest

In your plugin's `opensearch_dashboards.json`:

```json
{
  "id": "myPlugin",
  "version": "1.0.0",
  "opensearchDashboardsVersion": "opensearchDashboards",
  "server": false,
  "ui": true,
  "mfe": true,
  "requiredPlugins": [],
  "optionalPlugins": []
}
```

The `"mfe": true` field tells OSD to:
- Build a Module Federation remote entry for this plugin
- Load it via the MF runtime instead of the traditional bundle loader (when MFE is enabled)
- Include a fallback URL to the traditional `.plugin.js` bundle

### 2. Export a `plugin` Factory Function

Your plugin's `public/index.ts` must export a `plugin` factory function (this is the standard OSD plugin pattern):

```typescript
import { MyPlugin } from './plugin';

// This is what Module Federation exposes as ./plugin
export const plugin = () => new MyPlugin();
```

### 3. Implement the Plugin Class

```typescript
import { CoreSetup, Plugin, AppMountParameters } from 'opensearch-dashboards/public';

export class MyPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'my-app',
      title: 'My MFE App',
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./app');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params.element);
      },
    });
    return {};
  }

  public start() {}
  public stop() {}
}
```

### 4. Build and Test

```bash
# Build the MFE bundle
node scripts/build_mfe.js --plugin-id=myPlugin

# Verify the output
ls my_plugin/target/public/mfe/
# Should contain: remoteEntry.js and chunk files
```

### Example Plugin

See `examples/mfe_example/` for a complete working example with:
- Plugin manifest with `"mfe": true`
- Standard plugin class with app registration
- React component rendered in the app
- Full development workflow

## How It Works

### Server-Side Flow

1. **Config loading**: The `mfe` config path is registered in `src/core/server/server.ts` and parsed by the schema in `src/core/server/mfe/mfe_config.ts`.

2. **Plugin discovery**: When a plugin manifest is parsed (`plugin_manifest_parser.ts`), the `mfe` boolean field is extracted and stored in `PluginManifest.mfe`.

3. **Plugin info propagation**: The `mfe` flag is carried through to `InternalPluginInfo` (in `src/core/server/plugins/types.ts`), making it available to the rendering and bootstrap systems.

4. **Rendering metadata**: The `RenderingService` (`rendering_service.tsx`) checks if `mfe.enabled` is `true`. If so, it filters `uiPlugins.internal` for plugins with `mfe === true` and constructs an `mfePlugins` array with each plugin's `pluginId` and `remoteEntryUrl`. This metadata is injected into the page.

5. **Bootstrap template selection**: The `ui_render_mixin.js` handler for `/bootstrap.js` reads the MFE config, partitions UI plugins into MFE remotes and traditional bundles, sorts MFE remotes in dependency order, and selects either `bootstrap_mfe.js.hbs` or `bootstrap.js.hbs`.

### Client-Side Flow

When using the MFE bootstrap template (`bootstrap_mfe.js.hbs`):

1. **Traditional scripts load first**: Shared deps (`osd-ui-shared-deps.js`, which includes `@module-federation/runtime`), core (`core.entry.js`), and any non-MFE plugin bundles are loaded via `<script>` tags.

2. **MFE host initialization** (`initMfeHost()`):
   - Locates the Module Federation runtime (from `__osdSharedDeps__.ModuleFederationRuntime`, `window.__FEDERATION__.runtime`, or `window.ModuleFederationRuntime`)
   - Builds a shared scope mapping each dependency name (e.g., `react`, `@elastic/eui`) to its global instance on `window.__osdSharedDeps__`
   - Calls `MFRuntime.init()` with the host name `osd_host`, the list of remotes, and the shared scope

3. **Remote loading** (`loadMfeRemotes()`):
   - Loads MFE plugins **sequentially** in topological dependency order
   - For each remote, calls `MFRuntime.loadRemote('{pluginId}/plugin')`
   - On success, registers the module on `window.__osdBundles__` so the core plugin system can find it
   - On failure, falls back to loading the traditional `.plugin.js` bundle via `<script>` tag

4. **Core bootstrap**: After all remotes are loaded (or failed with fallback), calls `__osdBundles__.get('entry/core/public').__osdBootstrap__()` to start the application.

5. **Stylesheets**: Theme CSS, EUI styles, and legacy styles are loaded last.

### Build-Time Flow

The `scripts/build_mfe.js` script:

1. **Discovers MFE plugins**: Scans `src/plugins/`, `plugins/`, and `examples/` for plugins with `"mfe": true` in their `opensearch_dashboards.json`.

2. **Generates Rspack config**: Calls `getMfeRemoteConfig()` from `@osd/mfe` for each plugin, which produces a full Rspack configuration with:
   - Module Federation Plugin exposing `./plugin` from `public/index.ts`
   - Shared dependency configuration (all `@osd/ui-shared-deps` externals as singletons with `import: false`)
   - SWC loader for TypeScript/JSX
   - SCSS/CSS/asset loaders matching the OSD optimizer's configuration
   - Production optimizations (SWC minifier, LightningCSS, Brotli/gzip compression)

3. **Injects externals**: Adds a resolver for `opensearch-dashboards/public` that maps to `__osdBundles__.get("entry/core/public")` at runtime.

4. **Runs Rspack**: Compiles the plugin and writes output to `{pluginDir}/target/public/mfe/`.

## Shared Dependencies

MFE relies on the host and remotes sharing the same instances of core libraries. The shared dependency bridge works as follows:

### How Dependencies Are Shared

1. **`@osd/ui-shared-deps`** bundles all shared libraries (React, EUI, lodash, rxjs, etc.) and exports them on `window.__osdSharedDeps__`.

2. **The host** (bootstrap template) builds a Module Federation shared scope that maps each dependency name to its `window.__osdSharedDeps__` instance.

3. **Remote plugins** are configured with `import: false` for all shared dependencies, meaning they never bundle their own copies -- they always consume from the host's shared scope.

### Shared Dependency List

The following libraries are shared between host and MFE remotes:

| Module | Global Property |
|--------|----------------|
| `react` | `__osdSharedDeps__.React` |
| `react-dom` | `__osdSharedDeps__.ReactDom` |
| `react-dom/server` | `__osdSharedDeps__.ReactDomServer` |
| `react-router` | `__osdSharedDeps__.ReactRouter` |
| `react-router-dom` | `__osdSharedDeps__.ReactRouterDom` |
| `rxjs` | `__osdSharedDeps__.Rxjs` |
| `rxjs/operators` | `__osdSharedDeps__.RxjsOperators` |
| `@osd/i18n` | `__osdSharedDeps__.OsdI18n` |
| `@elastic/eui` | `__osdSharedDeps__.ElasticEui` |
| `@elastic/charts` | `__osdSharedDeps__.ElasticCharts` |
| `moment` | `__osdSharedDeps__.Moment` |
| `lodash` | `__osdSharedDeps__.Lodash` |
| `styled-components` | `__osdSharedDeps__.StyledComponents` |
| `jquery` | `__osdSharedDeps__.Jquery` |
| `@osd/monaco` | `__osdSharedDeps__.OsdMonaco` |
| `tslib` | `__osdSharedDeps__.TsLib` |
| `@module-federation/runtime` | `__osdSharedDeps__.ModuleFederationRuntime` |

The full list is defined in `packages/osd-ui-shared-deps/index.js`.

### `@module-federation/*` Exclusion

Packages under `@module-federation/*` are explicitly excluded from the shared deps configuration in remote builds. This avoids a chicken-and-egg problem: the Module Federation runtime must be available _before_ the remote can connect to the host's shared scope, so the remote must either bundle its own MF runtime or rely on it being globally available (which OSD ensures via the shared deps bundle).

## Fallback Behavior

MFE mode includes robust fallback handling at multiple levels:

### Runtime Fallback

If a remote plugin fails to load via Module Federation (network error, timeout, invalid module), the bootstrap template automatically falls back to loading the plugin's traditional `.plugin.js` bundle:

```
[MFE] Loading remote: myPlugin
[MFE] ✗ Failed myPlugin, falling back  <error details>
[MFE] Loaded myPlugin via fallback
```

### Host Initialization Fallback

If the Module Federation runtime itself is unavailable, all MFE plugins are loaded as traditional bundles:

```
[MFE] Module Federation runtime not available, falling back to traditional loading
```

### Complete Fallback

Setting `mfe.enabled: false` bypasses all MFE code paths entirely, using the traditional `bootstrap.js.hbs` template.

## Troubleshooting

### MFE build output is missing after starting OSD

The OSD optimizer cleans `target/public/` on startup. Rebuild MFE bundles after the optimizer finishes:

```bash
node scripts/build_mfe.js --plugin-id=<pluginId>
```

Or use watch mode (`--watch`) to automatically rebuild.

### "Module Federation runtime not available" in browser console

The `@module-federation/runtime` package must be included in the shared deps bundle. Verify:
- `packages/osd-ui-shared-deps/entry.js` exports `ModuleFederationRuntime`
- `packages/osd-ui-shared-deps/index.js` has `@module-federation/runtime` in `externals`
- The shared deps bundle loaded successfully (check Network tab)

### Plugin loads via fallback instead of MFE

Check the browser console for `[MFE]` log messages. Common causes:
- `remoteEntry.js` not found (build output missing or wrong path)
- Timeout exceeded (`mfe.timeout` too low)
- Shared dependency version mismatch

### "Invalid MFE plugin module: missing 'plugin' export"

The plugin's `public/index.ts` must export a `plugin` factory function:

```typescript
export const plugin = () => new MyPlugin();
```

### Build fails with "Plugin not found or not MFE-enabled"

Ensure the plugin's `opensearch_dashboards.json` contains `"mfe": true` and the plugin is located in one of the scanned directories (`src/plugins/`, `plugins/`, `examples/`).

### SCSS compilation errors in MFE build

The MFE Rspack config includes the same SCSS setup as the OSD optimizer. If you encounter SCSS errors:
- Verify your SCSS imports use the correct paths
- EUI global variables and mixins are automatically injected via `additionalData`
- The `node_modules/`, `src/core/public/styles/`, and `src/core/public/` directories are in the SCSS load path
