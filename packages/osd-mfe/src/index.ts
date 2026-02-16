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

// Export types
export * from './types';

// Export host functionality
export { initMfeHost } from './host/init_host';
export { buildSharedScope } from './host/shared_deps_bridge';
export { loadMfePlugin } from './host/remote_loader';

// Export remote functionality
export { getMfeRemoteConfig } from './remote/rspack_remote_config';