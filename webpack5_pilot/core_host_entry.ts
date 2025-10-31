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

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ensureOsdBundles } from './osd_bundles';

ensureOsdBundles();

declare const __webpack_init_sharing__:
  | ((scope: string | undefined) => Promise<void>)
  | undefined;

const SHARED_SCOPE = 'default';

if (typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: { NODE_ENV: 'development' },
  };
}

class SimpleSubject<T> {
  private listeners = new Set<(value: T) => void>();
  constructor(private value: T) {}

  next(value: T) {
    this.value = value;
    for (const listener of this.listeners) {
      try {
        listener(value);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[core_host_entry] Error in SimpleSubject listener:', error);
      }
    }
  }

  subscribe(listener: (value: T) => void) {
    listener(this.value);
    this.listeners.add(listener);
    return {
      unsubscribe: () => {
        this.listeners.delete(listener);
      },
    };
  }
}

async function ensureSharedDepsLoaded() {
  if (typeof __webpack_init_sharing__ === 'function') {
    await __webpack_init_sharing__(SHARED_SCOPE);
  }

  await import('osd_shared_deps/sharedDeps');
}

async function startCore() {
  try {
    await ensureSharedDepsLoaded();
    const module = await import('../src/core/public/osd_bootstrap');
    if (module && typeof module.__osdBootstrap__ === 'function') {
      (window as any).__osdBootstrap__ = module.__osdBootstrap__;
      await module.__osdBootstrap__();
    } else if (typeof (window as any).__osdBootstrap__ === 'function') {
      await (window as any).__osdBootstrap__();
    } else {
      throw new Error('__osdBootstrap__ is not available after loading core bundle.');
    }

    const bannerId = 'webpack5-pilot-banner';
    if (!document.getElementById(bannerId)) {
      const container = document.createElement('div');
      container.id = bannerId;
      container.style.position = 'fixed';
      container.style.bottom = '24px';
      container.style.right = '24px';
      container.style.zIndex = '2147483647';
      container.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
      container.style.borderRadius = '8px';
      container.style.background = '#1A2933';
      container.style.color = '#F5F7FA';
      container.style.padding = '12px 16px';
      container.style.fontSize = '14px';
      container.style.fontFamily = '"Helvetica Neue", Arial, sans-serif';
      container.innerText = 'Webpack 5 pilot successfully bootstrapped core (no server backend).';
      document.body.appendChild(container);
    }

    await mountHomeApp();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[core_host_entry] Failed to bootstrap core:', error);
  }
}

let startPromise: Promise<void> | null = null;

function schedulePilotStart() {
  if (!startPromise) {
    startPromise = startCore();
  }
  return startPromise;
}

(window as any).__osdV5HostStart = schedulePilotStart;

async function mountHomeApp() {
  try {
    const [reactModule, historyModule] = await Promise.all([import('react'), import('history')]);
    const ReactLib = (reactModule as any).default ?? reactModule;
    const { createHashHistory } = historyModule as typeof import('history');

    const homeServicesModule = await import(
      '../src/plugins/home/public/application/opensearch_dashboards_services'
    );
    const { setServices } = homeServicesModule as {
      setServices: typeof import('../src/plugins/home/public/application/opensearch_dashboards_services').setServices;
    };

    const existingRoot = document.getElementById('home-plugin-root');
    const mountElement =
      existingRoot ??
      (() => {
        const el = document.createElement('div');
        el.id = 'home-plugin-root';
        el.style.margin = '64px auto';
        el.style.maxWidth = '1100px';
        el.style.padding = '0 24px 120px';
        document.body.appendChild(el);
        return el;
      })();

    const directories = [
      {
        id: 'pilot_tutorials',
        title: 'Sample data & tutorials',
        subtitle: 'Jump into example experiences',
        description:
          'Browse curated sample data sets and tutorials included with the Webpack 5 pilot build.',
        icon: 'logoOpenSearch',
        path: '#/tutorial_directory/sampleData',
        showOnHomePage: true,
        category: 'data',
        order: 100,
        solutionId: 'pilot_solution',
      },
      {
        id: 'pilot_admin_tools',
        title: 'Manage data',
        description: 'Discover the management tools available in this pilot environment.',
        icon: 'gear',
        path: '#/feature_directory',
        showOnHomePage: true,
        category: 'admin',
        order: 200,
        solutionId: 'pilot_solution',
      },
    ];

    const solutions = [
      {
        id: 'pilot_solution',
        title: 'Pilot Workspace',
        subtitle: 'Prototype solution entry',
        description: 'This static card is rendered entirely from the Webpack 5 pilot.',
        appDescriptions: ['Tour the new build pipeline', 'Inspect Module Federation output'],
        icon: 'logoOpenSearch',
        path: '#/tutorial_directory/sampleData',
        order: 1,
      },
    ];

    const featureCatalogue = {
      get: () => directories,
      getSolutions: () => solutions,
      removeFeature: () => {},
    } as any;

    const environmentService = {
      getEnvironment: () => ({ cloud: false, apmUi: false, ml: false }),
    } as any;

    const tutorialService = {
      getVariables: () => ({}),
      getDirectoryNotices: () => [],
      getDirectoryHeaderLinks: () => [],
      getModuleNotices: () => [],
    } as any;

    const sectionTypes = {
      getHomepage: () => ({
        heroes$: {
          subscribe: (handler: (value: unknown) => void) => {
            handler([]);
            return { unsubscribe: () => {} };
          },
        },
        sections$: {
          subscribe: (handler: (value: unknown) => void) => {
            handler([]);
            return { unsubscribe: () => {} };
          },
        },
        error$: {
          subscribe: (handler: (value: unknown) => void) => {
            handler(undefined);
            return { unsubscribe: () => {} };
          },
        },
        saveHomepage: () => {},
        cleanup: () => {},
      }),
    } as any;

    const savedObjectsClient = {
      get: async () => ({ error: { statusCode: 404 }, attributes: undefined }),
      create: async () => ({ id: 'config', error: undefined }),
      bulkCreate: async () => ({ savedObjects: [] }),
      find: async () => ({ savedObjects: [], total: 0 }),
    } as any;

    const toastNotifications = {
      addSuccess: (message: unknown) => console.log('[home-toast:success]', message),
      addDanger: (message: unknown) => console.error('[home-toast:error]', message),
      addWarning: (message: unknown) => console.warn('[home-toast:warning]', message),
      remove: () => {},
    } as any;

    const uiSettings = {
      get: (key: string, defaultValue?: unknown) => {
        if (key === 'home:useNewHomePage') {
          return false;
        }
        if (key === 'accessibility:disableAnimations') {
          return false;
        }
        if (key === 'dateFormat:tz') {
          return 'Browser';
        }
        return defaultValue ?? false;
      },
      get$: (key: string) => ({
        subscribe: (handler: (value: unknown) => void) => {
          handler((uiSettings as any).get(key));
          return { unsubscribe: () => {} };
        },
      }),
      set: async () => {},
    };

    const http = {
      basePath: {
        prepend: (url: string) => url,
        get: () => '',
      },
      get: async () => ({}),
      fetch: async () => ({}),
    } as any;

    const chrome = {
      navLinks: {
        getAll: () => [
          {
            category: { id: 'pilot_solution' },
            hidden: false,
          },
        ],
      },
      setBreadcrumbs: () => {},
      docTitle: {
        change: () => {},
      },
      logos: {
        Application: { url: '', type: 'svg', light: { url: '', type: 'svg' }, dark: { url: '', type: 'svg' } },
        Mark: { url: '', type: 'svg', light: { url: '', type: 'svg' }, dark: { url: '', type: 'svg' } },
        AnimatedMark: { url: '', type: 'svg', light: { url: '', type: 'svg' }, dark: { url: '', type: 'svg' } },
        OpenSearch: { url: '', type: 'svg', light: { url: '', type: 'svg' }, dark: { url: '', type: 'svg' } },
        CenterMark: { url: '', type: 'svg', light: { url: '', type: 'svg' }, dark: { url: '', type: 'svg' } },
        colorScheme: 'light',
      },
    } as any;

    const currentAppId$ = new SimpleSubject<string>('home');

    const application = {
      navigateToApp: async (appId: string, options?: { path?: string; deepLinkId?: string }) => {
        const path = options?.path ? `/${options.path.replace(/^\/?/, '')}` : '';
        const target = `/app/${appId}${path}`;
        window.location.href = target;
        return { appId, status: 'redirected' } as any;
      },
      navigateToUrl: async (url: string) => {
        window.location.href = url;
      },
      getUrlForApp: (appId: string, options?: { path?: string }) => {
        const path = options?.path ? `/${options.path.replace(/^\/?/, '')}` : '';
        return `/app/${appId}${path}`;
      },
      capabilities: {
        navLinks: {
          home: true,
          management: true,
          dev_tools: true,
          console: true,
        },
        catalogue: { pilot_tutorials: true, pilot_solution: true },
        advancedSettings: { show: true, save: true },
        management: {
          opensearchDashboards: {
            settings: true,
          },
        },
        workspaces: { enabled: false },
      },
      currentAppId$,
    } as any;

    const docLinks = { links: {} };
    const overlays = { banners: { add: () => '', remove: () => {} } };
    const injectedMetadata = {
      getInjectedVar: () => undefined,
      getBranding: () => ({
        applicationTitle: 'OpenSearch Dashboards',
      }),
    };

    setServices({
      trackUiMetric: () => {},
      opensearchDashboardsVersion: '3.3.0',
      http: http as any,
      savedObjectsClient: savedObjectsClient as any,
      toastNotifications,
      banners: overlays.banners,
      chrome: chrome as any,
      application: application as any,
      uiSettings: uiSettings as any,
      urlForwarding: { navigateToDefaultApp: () => {} },
      homeConfig: { disableExperienceModal: true, disableWelcomeScreen: true } as any,
      featureCatalogue: featureCatalogue as any,
      tutorialService: tutorialService as any,
      environmentService: environmentService as any,
      docLinks: docLinks as any,
      addBasePath: (url: string) => url,
      getBasePath: () => '',
      telemetry: undefined,
      injectedMetadata: injectedMetadata as any,
      dataSource: undefined,
      sectionTypes: sectionTypes as any,
      contentManagement: {
        registerContentProvider: () => {},
        updatePageSection: () => {},
        getPage: () => undefined,
        renderPage: () =>
          ReactLib.createElement(
            'div',
            {
              style: {
                padding: '32px',
                background: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
              },
            },
            ReactLib.createElement('h1', { style: { marginBottom: '12px' } }, 'Home plugin (pilot demo)'),
            ReactLib.createElement(
              'p',
              { style: { margin: 0, color: '#434a54' } },
              'This view is rendered using the real Home plugin entry with minimal stubbed services.'
            )
          ),
      } as any,
      workspaces: undefined,
    });

    if (!window.location.hash) {
      window.location.hash = '#/';
    }
    const history = createHashHistory();

    const navigation = {
      registerMenuItem: () => {},
      ui: {},
    } as any;

    const startServices = {
      http,
      chrome,
      application,
      overlays,
      docLinks,
      notifications: { toasts: toastNotifications },
      savedObjects: { client: savedObjectsClient },
      injectedMetadata,
      uiSettings,
    };

    const homeAppModule = await import('../src/plugins/home/public/application');
    const { renderApp } = homeAppModule as {
      renderApp: typeof import('../src/plugins/home/public/application').renderApp;
    };

    console.log('[core_host_entry] Invoking renderApp for Home plugin');
    await renderApp(
      mountElement,
      {
        ...startServices,
        navigation,
        setHeaderActionMenu: () => {},
      } as any,
      history as any
    );
    console.log('[core_host_entry] Home plugin renderApp completed');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[core_host_entry] Failed to mount home plugin:', error);
  }
}
