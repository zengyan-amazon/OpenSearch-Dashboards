/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

// src/core/public/bootstrap5.ts
// Lightweight Module Federation orchestrator - NO HEAVY IMPORTS

// Type declarations for webpack's MF runtime and globals
declare global {
  interface Window {
    __OSD_ASSETS_BASE_URL__?: string;
    __OSD_SHARED_DEPS_URL__?: string;

    shared_deps?: any;        // MF container: name: 'shared_deps'
    core_services?: any;      // MF container: name: 'core_services'
    __osdSharedDeps__?: any;  // legacy shim
  }
}

// Webpack Module Federation runtime globals (injected by webpack)
declare const __webpack_init_sharing__: (scope: string) => Promise<void>;
declare const __webpack_share_scopes__: Record<string, any>;

// Export to make this a module file (required for global declarations)
export {};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.head.appendChild(script);
  });
}

async function loadSharedDepsRemote() {
  const base = window.__OSD_ASSETS_BASE_URL__ ?? '';
  const url =
    window.__OSD_SHARED_DEPS_URL__ ?? `${base}/shared-deps/remoteEntry.js`;

  await loadScript(url);
}

async function initShareScopeAndSharedDeps() {
  // 1) Init global share scope
  await __webpack_init_sharing__('default');

  // 2) Get shared_deps container
  const shared = window.shared_deps;
  if (!shared) {
    throw new Error('shared_deps container not found on window');
  }

  // 3) Register its shared modules into the share scope
  await shared.init(__webpack_share_scopes__.default);

  return shared;
}

async function initGlobalShimFromShared(shared: any) {
  // This calls your entry.js exposed as ./SharedBundle
  const factory = await shared.get('./SharedBundle');
  const exportsObj = factory();

  // Simple approach: just mirror the exports object
  window.__osdSharedDeps__ = exportsObj;

  // Optional legacy globals if needed
  (window as any).React = exportsObj.React;
  (window as any).ReactDOM = exportsObj.ReactDom;
  (window as any)._ = exportsObj.Lodash;
  (window as any).Rx = exportsObj.Rxjs;
  (window as any).$ = exportsObj.Jquery;
  (window as any).jQuery = exportsObj.Jquery;
}

// If you want to lazy-load MF plugins too, you can build __osdBundles__ here
function initLegacyBundleShim() {
  const loadedPluginContainers = new Map<string, any>();
  const availablePlugins = ['opensearchDashboardsLegacy']; // example

  async function loadPluginContainerOnDemand(pluginName: string) {
    if (loadedPluginContainers.has(pluginName)) {
      return loadedPluginContainers.get(pluginName);
    }

    const scriptUrl = `/plugins/${pluginName}/remoteEntry.js`;

    await loadScript(scriptUrl);

    const containerName = `${pluginName}_plugin`;
    const container = (window as any)[containerName];

    if (!container) {
      console.error(`Plugin container not found: ${containerName}`);
      return null;
    }

    // Join the existing share scope so plugin can use shared_deps
    await container.init(__webpack_share_scopes__.default);

    loadedPluginContainers.set(pluginName, container);
    return container;
  }

  (window as any).__osdBundles__ = {
    get(bundleName: string) {
      if (bundleName === 'entry/core/public') {
        // The core entry is local; we'll just import it directly in bootstrap, so
        // this path may not need to be used for MF; keep if your legacy code expects it.
        return import('./osd_bootstrap').then((mod) => ({
          __osdBootstrap__: mod.__osdBootstrap__,
        }));
      }

      const pluginMatch = bundleName.match(/^plugins\/(.+)\/public$/);
      if (pluginMatch) {
        const pluginName = pluginMatch[1];
        if (availablePlugins.includes(pluginName)) {
          return loadPluginContainerOnDemand(pluginName).then((container) => {
            if (!container) return null;
            return container.get('./Plugin').then((factory: any) => {
              const mod = factory();
              return { plugin: mod.default || mod };
            });
          });
        }
      }

      return null;
    },

    has(bundleName: string) {
      if (bundleName === 'entry/core/public') return true;

      const pluginMatch = bundleName.match(/^plugins\/(.+)\/public$/);
      if (pluginMatch) {
        return availablePlugins.includes(pluginMatch[1]);
      }
      return false;
    },

    getIds() {
      const pluginIds = availablePlugins.map(
        (name) => `plugins/${name}/public`
      );
      return ['entry/core/public', ...pluginIds];
    },
  };
}

async function bootstrap() {
  console.log('🚀 Starting OSD Module Federation Bootstrap...');

  try {
    // 1) Load shared_deps remote entry
    console.log('🔧 Loading shared dependencies...');
    await loadSharedDepsRemote();

    // 2) Init share scope & shared_deps provider
    console.log('🔧 Initializing Module Federation sharing...');
    const shared = await initShareScopeAndSharedDeps();

    // 3) Build global shim from shared (for legacy code)
    console.log('🔧 Setting up legacy compatibility globals...');
    await initGlobalShimFromShared(shared);

    // 4) Optionally, setup __osdBundles__ shim
    console.log('🔧 Setting up plugin loading interface...');
    initLegacyBundleShim();

    // 5) Load bootstrap function directly (Module Federation provides shared deps)
    console.log('🔧 Loading OSD bootstrap...');
    
    // Direct import of bootstrap - Module Federation provides all the shared deps
    const { __osdBootstrap__ } = await import('./osd_bootstrap');
    
    console.log('✅ Starting OSD Application...');
    await __osdBootstrap__();
    
    console.log('🎉 OSD Application bootstrapped via Module Federation!');
  } catch (e) {
    console.error('❌ OSD Module Federation bootstrap failed:', e);
    // TODO: surface error in UI instead of just console
    throw e;
  }
}

// Start the bootstrap process
bootstrap().catch((e) => {
  console.error('💥 Critical bootstrap failure:', e);
});
