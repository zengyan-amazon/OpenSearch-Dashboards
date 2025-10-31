#!/usr/bin/env node

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

const Path = require('path');
const Fs = require('fs');
const { exit } = require('process');
const mime = require('mime');
const express = require('express');

if (typeof mime.lookup !== 'function') {
  mime.lookup = mime.getType.bind(mime);
}

if (!mime.charsets) {
  mime.charsets = {};
}

if (typeof mime.charsets.lookup !== 'function') {
  mime.charsets.lookup = () => 'utf-8';
}

const CWD = process.cwd();
const OUTPUT_DIR = Path.resolve(CWD, 'build_v5');
const CONFIG_PATH = Path.resolve(CWD, 'webpack.v5.config.js');

require('@babel/register')({
  extensions: ['.js', '.ts', '.tsx'],
  cwd: CWD,
  root: CWD,
  ignore: [/node_modules/],
  presets: [require.resolve('@osd/babel-preset/node_preset')],
});

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Template } = require(Path.resolve(CWD, 'src/core/server/rendering/views'));
const { i18n } = require('@osd/i18n');
const pkg = require(Path.resolve(CWD, 'package.json'));
const { getCoreSettings } = require(Path.resolve(
  CWD,
  'src/core/server/ui_settings/settings'
));

const rawUiSettings = getCoreSettings();
const coreUiSettingsDefaults = Object.fromEntries(
  Object.entries(rawUiSettings).map(([key, value]) => {
    const { schema, ...rest } = value;
    return [key, rest];
  })
);

const stubPluginUiSettings = {
  'home:useNewHomePage': {
    value: false,
    requiresPageReload: true,
  },
};

const PILOT_UI_PLUGINS = [
  {
    id: 'uiActions',
    plugin: {
      id: 'uiActions',
      configPath: 'ui_actions',
      requiredPlugins: [],
      optionalPlugins: [],
      requiredEnginePlugins: {},
      requiredBundles: [],
    },
    config: {},
  },
  {
    id: 'opensearchDashboardsLegacy',
    plugin: {
      id: 'opensearchDashboardsLegacy',
      configPath: 'opensearch_dashboards_legacy',
      requiredPlugins: [],
      optionalPlugins: [],
      requiredEnginePlugins: {},
      requiredBundles: [],
    },
    config: {},
  },
  {
    id: 'urlForwarding',
    plugin: {
      id: 'urlForwarding',
      configPath: 'url_forwarding',
      requiredPlugins: ['opensearchDashboardsLegacy'],
      optionalPlugins: [],
      requiredEnginePlugins: {},
      requiredBundles: [],
    },
    config: {},
  },
  {
    id: 'managementOverview',
    plugin: {
      id: 'managementOverview',
      configPath: 'management_overview',
      requiredPlugins: [],
      optionalPlugins: [],
      requiredEnginePlugins: {},
      requiredBundles: [],
    },
    config: {},
  },
  {
    id: 'devTools',
    plugin: {
      id: 'devTools',
      configPath: 'dev_tools',
      requiredPlugins: ['urlForwarding', 'uiActions'],
      optionalPlugins: ['managementOverview'],
      requiredEnginePlugins: {},
      requiredBundles: [],
    },
    config: {},
  },
  {
    id: 'console',
    plugin: {
      id: 'console',
      configPath: 'console',
      requiredPlugins: ['devTools'],
      optionalPlugins: [],
      requiredEnginePlugins: {},
      requiredBundles: [],
    },
    config: {},
  },
];

function createStatusResponse() {
  const version = pkg.version || '0.0.0';
  return {
    name: pkg.name || 'opensearch-dashboards',
    uuid: '00000000-0000-0000-0000-000000000000',
    version: {
      number: version,
      build_hash: pkg.build?.sha ?? '',
      build_number: String(pkg.build?.number ?? 0),
      build_snapshot: String(pkg.build?.snapshot ?? false),
    },
    status: {
      overall: {
        id: 'overall',
        title: 'All systems operational',
        message: 'OpenSearch Dashboards (webpack5 pilot) is running.',
        state: 'green',
        uiColor: 'success',
      },
      statuses: [],
    },
    metrics: {
      collection_interval_in_millis: 5000,
      process: {
        memory: {
          heap: {
            size_limit: 17179869184,
            used_in_bytes: 2147483648,
          },
        },
      },
      os: {
        load: {
          '1m': 0.01,
          '5m': 0.01,
          '15m': 0.01,
        },
      },
      response_times: {
        avg_in_millis: 1,
        max_in_millis: 5,
      },
      requests: {
        total: 1,
        disconnects: 0,
      },
    },
  };
}

const WEBPACK_ALIAS = 'webpack5';
const DEV_SERVER_ALIAS = 'webpack5-dev-server';
const TYPE_ONLY_EXPORT_WARNING = /export .* was not found in/;

function resolvePackage(alias) {
  try {
    return require.resolve(alias, { paths: [CWD] });
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error;
    }
    return undefined;
  }
}

function ensureDependency(alias, installHint) {
  const resolved = resolvePackage(`${alias}/package.json`) || resolvePackage(alias);
  if (!resolved) {
    console.error(
      `[start:v5] Missing ${alias}. Install it via "${installHint}" before running the dev server.`
    );
    exit(1);
  }
}

function ensureOutputDir() {
  if (!Fs.existsSync(OUTPUT_DIR)) {
    Fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function createRenderingMetadata() {
  const version = pkg.version || '0.0.0';
  const buildNumber = pkg.build?.number ?? 0;
  const buildSha = pkg.build?.sha ?? '';
  const branch = pkg.branch || 'main';
  const applicationTitle =
    pkg.opensearchDashboards?.branding?.applicationTitle ||
    'OpenSearch Dashboards (Webpack 5 Pilot)';

  return {
    strictCsp: false,
    uiPublicUrl: '/ui',
    startupScriptUrl: '/startup.v5.js',
    bootstrapScriptUrl: '/bootstrap.v5.js',
    i18n: i18n.translate,
    locale: 'en',
    injectedMetadata: {
      version,
      buildNumber,
      branch,
      basePath: '',
      serverBasePath: '',
      env: {
        mode: {
          name: 'development',
          dev: true,
          prod: false,
        },
        packageInfo: {
          version,
          branch,
          buildNum: buildNumber,
          buildSha,
          dist: false,
        },
      },
      anonymousStatusPage: false,
      i18n: {
        translationsUrl: '/translations/en.json',
      },
      csp: {
        warnLegacyBrowsers: false,
      },
      vars: {},
      uiPlugins: PILOT_UI_PLUGINS,
      legacyMetadata: {
        uiSettings: {
          defaults: coreUiSettingsDefaults,
          user: {},
        },
      },
      branding: {
        applicationTitle,
        faviconUrl: undefined,
        logo: {},
        mark: {},
        loadingLogo: {},
        useExpandedHeader: true,
      },
      keyboardShortcuts: {
        enabled: true,
      },
    },
  };
}

function renderPilotDocument() {
const metadata = createRenderingMetadata();
metadata.injectedMetadata.legacyMetadata.uiSettings.defaults = {
  ...metadata.injectedMetadata.legacyMetadata.uiSettings.defaults,
  ...stubPluginUiSettings,
};

const html =
  '<!DOCTYPE html>' +
  renderToStaticMarkup(React.createElement(Template, { metadata }));

  return html;
}

async function start() {
  ensureDependency(`${WEBPACK_ALIAS}/package.json`, 'yarn add -D webpack5@npm:webpack@^5');
  ensureDependency(
    `${DEV_SERVER_ALIAS}/package.json`,
    'yarn add -D webpack5-dev-server@npm:webpack-dev-server@^4'
  );

  ensureOutputDir();

  if (!Fs.existsSync(CONFIG_PATH)) {
    console.error(
      `[start:v5] Unable to find ${Path.relative(CWD, CONFIG_PATH)}. Run this command from the repo root.`
    );
    exit(1);
  }

  const webpack = require(require.resolve(WEBPACK_ALIAS, { paths: [CWD] }));
  const WebpackDevServer = require(require.resolve(DEV_SERVER_ALIAS, { paths: [CWD] }));

  let configs;
  try {
    // eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-var-requires
    const loaded = require(CONFIG_PATH);
    configs = Array.isArray(loaded) ? loaded : [loaded];
  } catch (error) {
    console.error(`[start:v5] Failed to load ${Path.relative(CWD, CONFIG_PATH)}.`);
    console.error(error);
    exit(1);
  }

  const compiler = webpack(configs);

  compiler.hooks.done.tap('filterTypeOnlyExportWarnings', (stats) => {
    const statList = Array.isArray(stats.stats) ? stats.stats : [stats];
    for (const stat of statList) {
      if (Array.isArray(stat.compilation?.warnings)) {
        stat.compilation.warnings = stat.compilation.warnings.filter((warning) => {
          const message =
            typeof warning === 'string'
              ? warning
              : warning && typeof warning.message === 'string'
              ? warning.message
              : '';
          return !TYPE_ONLY_EXPORT_WARNING.test(message);
        });
      }
    }
  });

  const port = Number(process.env.WEBPACK_V5_PORT) || 9500;
  const host = process.env.WEBPACK_V5_HOST || 'localhost';

  const server = new WebpackDevServer(
    {
      port,
      host,
      hot: false,
      compress: false,
      historyApiFallback: false,
      client: {
        overlay: true,
        logging: 'info',
      },
      static: [
        {
          directory: OUTPUT_DIR,
          publicPath: '/',
          watch: true,
        },
        {
          directory: Path.resolve(CWD, 'src/core/server/core_app/assets'),
          publicPath: '/ui',
          watch: false,
        },
      ],
      devMiddleware: {
        writeToDisk: true,
        publicPath: '/',
        stats: {
          colors: true,
          assets: true,
          chunks: false,
          modules: false,
          warnings: false,
        },
      },
      setupMiddlewares: (middlewares, devServer) => {
        if (!devServer) {
          return middlewares;
        }

        devServer.app.use(express.json());
        devServer.app.use(express.urlencoded({ extended: true }));

        devServer.app.use((req, _res, next) => {
          if (req.path.startsWith('/api') || req.path.startsWith('/internal')) {
            console.log(`[start:v5] API ${req.method} ${req.path}`);
          }
          next();
        });

        const servePilotHtml = (_req, res) => {
          try {
            const html = renderPilotDocument();
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end(`[start:v5] Failed to render pilot template: ${error.message}`);
          }
        };

        devServer.app.get('/', servePilotHtml);
        devServer.app.get('/index.html', servePilotHtml);
        devServer.app.get(/^\/app\/.*/, servePilotHtml);

        const startupScript = `
(function () {
  var urls = [
    '/osd_shared_deps.remoteEntry.js',
    '/core.bundle.js',
    '/navigation.bundle.js',
    '/ui_actions.bundle.js',
    '/url_forwarding.bundle.js',
    '/opensearch_dashboards_legacy.bundle.js',
    '/management_overview.bundle.js',
    '/dev_tools.bundle.js',
    '/console.bundle.js',
    '/pilot.bundle.js'
  ];

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error('[start:v5] Failed to load ' + url));
      };
      (document.head || document.body).appendChild(script);
    });
  }

  window.__osdV5StartupPromise = urls.reduce(function (promise, url) {
    return promise.then(function () {
      return loadScript(url);
    });
  }, Promise.resolve());

  window.__osdV5StartupPromise.catch(function (error) {
    console.error(error);
  });
})();`;

        const bootstrapScript = `
(function () {
  var THEME_TAG = 'v9light';
  var THEME_STYLES = ['/osd-ui-shared-deps.v9.light.css'];

  function ensureStylesheet(href) {
    var existing = document.querySelector('link[data-webpack5-theme="' + href + '"]');
    if (existing) {
      return Promise.resolve();
    }

    return new Promise(function (resolve, reject) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.webpack5Theme = href;
      link.onload = function () {
        resolve();
      };
      link.onerror = function () {
        reject(new Error('[start:v5] Failed to load stylesheet ' + href));
      };

      var target = document.querySelector('head meta[name="add-styles-here"]');
      if (target && target.parentNode) {
        target.parentNode.insertBefore(link, target);
      } else {
        (document.head || document.documentElement).appendChild(link);
      }
    });
  }

  function startCore() {
    if (typeof window.__osdV5HostStart === 'function') {
      try {
        window.__osdV5HostStart();
      } catch (error) {
        console.error('[start:v5] Failed to start pilot host via __osdV5HostStart:', error);
      }
      return;
    }

    if (typeof window.__osdBootstrap__ === 'function') {
      try {
        window.__osdBootstrap__();
      } catch (error) {
        console.error('[start:v5] __osdBootstrap__ threw an error:', error);
      }
      return;
    }

    console.warn('[start:v5] Pilot start function not yet available.');
  }

  if (THEME_TAG) {
    window.__osdThemeTag__ = THEME_TAG;
  }

  var stylesheetPromise = Promise.all(THEME_STYLES.map(ensureStylesheet));

  if (window.__osdV5StartupPromise && typeof window.__osdV5StartupPromise.then === 'function') {
    Promise.all([window.__osdV5StartupPromise, stylesheetPromise])
      .then(startCore)
      .catch(function (error) {
        console.error(error);
      });
  } else {
    stylesheetPromise.then(startCore).catch(function (error) {
      console.error(error);
    });
  }
})();`;

        devServer.app.get('/startup.v5.js', (_req, res) => {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.end(startupScript);
        });

        devServer.app.get('/bootstrap.v5.js', (_req, res) => {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.end(bootstrapScript);
        });

        devServer.app.get('/translations/en.json', (_req, res) => {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              translations: {
                locale: 'en',
                messages: {},
              },
            })
          );
        });

        devServer.app.get('/api/opensearch-dashboards/settings', (_req, res) => {
          res.status(200).json({ settings: {} });
        });

        devServer.app.post('/api/opensearch-dashboards/settings', (_req, res) => {
          res.status(200).json({ settings: {} });
        });

        devServer.app.post('/api/core/capabilities', (req, res) => {
          const applications = Array.isArray(req.body?.applications) ? req.body.applications : [];
          const navLinks = applications.reduce((acc, appId) => {
            acc[appId] = true;
            return acc;
          }, {});
          const capabilities = {
            navLinks,
            management: {},
            catalogue: {},
            workspaces: {
              view: true,
              create: true,
            },
          };
          applications.forEach((appId) => {
            if (!capabilities[appId]) {
              capabilities[appId] = {};
            }
          });
          res.status(200).json(capabilities);
        });

        devServer.app.get('/api/status', (_req, res) => {
          res.status(200).json(createStatusResponse());
        });

        return middlewares;
      },
    },
    compiler
  );

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      server.stop().finally(() => exit(0));
    });
  });

  await server.start();

  console.log(
    `[start:v5] Webpack 5 dev server listening at http://${host}:${port}. Open /index.html to load the pilot host.`
  );
}

start().catch((error) => {
  console.error('[start:v5] Failed to start dev server.');
  console.error(error);
  exit(1);
});
