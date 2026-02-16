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

import {
  CoreSetup,
  Plugin,
  AppMountParameters,
  DEFAULT_APP_CATEGORIES,
} from 'opensearch-dashboards/public';

export interface MfeExampleSetup {}

export class MfeExamplePlugin implements Plugin<MfeExampleSetup, void> {
  public setup(core: CoreSetup) {
    // Register an application that will be loaded as a microfrontend
    core.application.register({
      id: 'mfe-example',
      title: 'MFE Example',
      order: 8000,
      category: DEFAULT_APP_CATEGORIES.opensearchDashboards,
      async mount(params: AppMountParameters) {
        // Import the app component
        const { renderApp } = await import('./app');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params.element);
      },
    });

    const api: MfeExampleSetup = {};
    return api;
  }

  public start() {
    // Plugin startup logic
  }

  public stop() {
    // Plugin cleanup logic
  }
}