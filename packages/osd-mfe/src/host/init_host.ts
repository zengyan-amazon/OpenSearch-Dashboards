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

import { init } from '@module-federation/runtime';
import { buildSharedScope } from './shared_deps_bridge';
import { MfeRemoteConfig } from '../types';

/**
 * Initialize the Module Federation host with the provided remote configurations.
 *
 * This sets up the MF runtime with the shared dependencies from @osd/ui-shared-deps
 * and registers all remote plugins.
 */
export async function initMfeHost(remotes: MfeRemoteConfig[]) {
  const shared = buildSharedScope();

  init({
    name: 'osdHost',
    remotes: remotes.map(r => ({
      name: r.pluginId,
      entry: r.remoteEntryUrl
    })),
    shared,
  });
}