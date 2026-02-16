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

export interface MfeRemoteConfig {
  pluginId: string;
  remoteEntryUrl: string;
}

export interface MfeHostConfig {
  name: string;
  remotes: MfeRemoteConfig[];
}

export interface MfeRemoteBuildOptions {
  pluginId: string;
  pluginDir: string;       // absolute path to plugin root
  repoRoot: string;
  outputDir: string;       // e.g., {pluginDir}/target/public/mfe/
  dist: boolean;           // production mode
}