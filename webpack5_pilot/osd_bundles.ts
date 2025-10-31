/*
 * SPDX-License-Identifier: Apache-2.0
 */

type BundleEntry =
  | {
      evaluated: true;
      exports: Record<string, unknown>;
    }
  | {
      evaluated: false;
      bundleRequire: (moduleKey: string | undefined) => Record<string, unknown>;
      bundleModuleKey: string | undefined;
      exports?: Record<string, unknown>;
    };

interface OsdBundles {
  has: (key: string) => boolean;
  define: (
    key: string,
    bundleRequire: (moduleKey: string | undefined) => Record<string, unknown>,
    bundleModuleKey: string | undefined
  ) => void;
  get: (key: string) => Record<string, unknown>;
}

export const ensureOsdBundles = (): OsdBundles => {
  const coreWindow = window as unknown as {
    __osdBundles__?: OsdBundles;
  };

  if (coreWindow.__osdBundles__) {
    return coreWindow.__osdBundles__;
  }

  const modules = new Map<string, BundleEntry>();

  const osdBundles: OsdBundles = {
    has: (key: string) => modules.has(key),
    define: (key, bundleRequire, bundleModuleKey) => {
      if (modules.has(key)) {
        return;
      }

      if (bundleModuleKey !== undefined) {
        modules.set(key, {
          evaluated: false,
          bundleRequire,
          bundleModuleKey,
        });
      } else {
        modules.set(key, {
          evaluated: true,
          exports: bundleRequire(bundleModuleKey),
        });
      }
    },
    get: (key: string) => {
      const entry = modules.get(key);
      if (!entry) {
        throw new Error(`__osdBundles__ does not have a module defined for "${key}"`);
      }

      if (entry.evaluated) {
        return entry.exports;
      }

      const exports = entry.bundleRequire(entry.bundleModuleKey);
      entry.exports = exports;
      entry.evaluated = true;
      return exports;
    },
  };

  coreWindow.__osdBundles__ = osdBundles;
  return osdBundles;
};

export const registerPluginBundle = (id: string, exports: Record<string, unknown>) => {
  const bundles = ensureOsdBundles();
  const exportId = `plugin/${id}/public`;
  if (!bundles.has(exportId)) {
    bundles.define(exportId, () => exports, undefined);
  }
};
