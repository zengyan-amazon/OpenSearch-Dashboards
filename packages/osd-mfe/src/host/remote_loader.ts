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

import { loadRemote } from '@module-federation/runtime';

/**
 * Default timeout for loading remote plugins (10 seconds)
 */
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Load a Module Federation remote plugin with timeout and error handling.
 *
 * @param pluginId The ID of the plugin to load
 * @param timeout Optional timeout in milliseconds (default: 10s)
 * @returns Promise resolving to the plugin module with a `plugin` export
 */
export async function loadMfePlugin(
  pluginId: string,
  timeout: number = DEFAULT_TIMEOUT_MS
): Promise<{ plugin: Function }> {
  return new Promise((resolve, reject) => {
    // Set up timeout
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout loading MFE plugin: ${pluginId} (${timeout}ms)`));
    }, timeout);

    // Load the remote module
    loadRemote(`${pluginId}/plugin`)
      .then((module) => {
        clearTimeout(timeoutId);

        // Validate that the module has a plugin export
        if (!module || typeof (module as any).plugin !== 'function') {
          reject(new Error(`Invalid MFE plugin module: ${pluginId} - missing 'plugin' export`));
          return;
        }

        resolve(module as { plugin: Function });
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to load MFE plugin: ${pluginId} - ${error.message}`));
      });
  });
}