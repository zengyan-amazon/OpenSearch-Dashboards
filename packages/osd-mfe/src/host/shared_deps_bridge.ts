/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

import * as UiSharedDeps from '@osd/ui-shared-deps';

/**
 * Builds the shared scope object for Module Federation from the @osd/ui-shared-deps externals.
 *
 * Each external in @osd/ui-shared-deps maps a module name to a global property like:
 * 'react' -> '__osdSharedDeps__.React'
 *
 * This function parses each external value to extract the property name (the part after the last dot)
 * and creates a shared scope entry with singleton configuration.
 */
export function buildSharedScope() {
  const shared: Record<string, any> = {};

  // Get the externals map from @osd/ui-shared-deps
  const externals = UiSharedDeps.externals;

  // Process each external entry
  for (const [moduleName, globalPath] of Object.entries(externals)) {
    if (typeof globalPath !== 'string') continue;

    // Extract the property name from the global path
    // e.g., '__osdSharedDeps__.React' -> 'React'
    const lastDotIndex = globalPath.lastIndexOf('.');
    if (lastDotIndex === -1) continue;

    const propName = globalPath.substring(lastDotIndex + 1);

    // Create the shared scope entry
    shared[moduleName] = {
      version: '0.0.0',
      lib: () => (window as any).__osdSharedDeps__[propName],
      shareConfig: {
        singleton: true,
        requiredVersion: false
      }
    };
  }

  return shared;
}