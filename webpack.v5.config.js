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

const Fs = require('fs');
const Path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const {
  container: { ModuleFederationPlugin },
} = require('webpack5');

const repoRoot = __dirname;
const outputDir = Path.resolve(repoRoot, 'build_v5');

const DEFAULT_ALLOWLIST = [
  {
    id: 'pilot',
    entry: Path.resolve(repoRoot, 'webpack5_pilot', 'demo_entry.tsx'),
  },
  {
    id: 'core',
    entry: Path.resolve(repoRoot, 'webpack5_pilot', 'core_host_entry.ts'),
  },
];

const SHARED_DEPS_ENTRIES = {
  'osd-ui-shared-deps': Path.resolve(repoRoot, 'packages/osd-ui-shared-deps/entry.js'),
  'osd-ui-shared-deps.v7.dark': [require.resolve('@elastic/eui/dist/eui_theme_dark.css')],
  'osd-ui-shared-deps.v7.light': [require.resolve('@elastic/eui/dist/eui_theme_light.css')],
  'osd-ui-shared-deps.v8.dark': [require.resolve('@elastic/eui/dist/eui_theme_next_dark.css')],
  'osd-ui-shared-deps.v8.light': [require.resolve('@elastic/eui/dist/eui_theme_next_light.css')],
  'osd-ui-shared-deps.v9.dark': [require.resolve('@elastic/eui/dist/eui_theme_v9_dark.css')],
  'osd-ui-shared-deps.v9.light': [require.resolve('@elastic/eui/dist/eui_theme_v9_light.css')],
};

const BASE_SHARED_LIBS = {
  react: { singleton: true, requiredVersion: false },
  'react-dom': { singleton: true, requiredVersion: false },
  'react-dom/server': { singleton: true, requiredVersion: false },
  '@osd/i18n': { singleton: true, requiredVersion: false },
  '@osd/i18n/react': { singleton: true, requiredVersion: false },
  '@osd/monaco': { singleton: true, requiredVersion: false },
  moment: { singleton: true, requiredVersion: false },
  'moment-timezone': { singleton: true, requiredVersion: false },
  rxjs: { singleton: true, requiredVersion: false },
  'rxjs/operators': { singleton: true, requiredVersion: false },
  '@elastic/numeral': { singleton: true, requiredVersion: false },
  '@elastic/charts': { singleton: true, requiredVersion: false },
  '@elastic/eui': { singleton: true, requiredVersion: false },
  '@elastic/eui/lib/services': { singleton: true, requiredVersion: false },
  '@elastic/eui/lib/services/format': { singleton: true, requiredVersion: false },
  '@elastic/eui/dist/eui_charts_theme': { singleton: true, requiredVersion: false },
  'styled-components': { singleton: true, requiredVersion: false },
  tslib: { singleton: true, requiredVersion: false },
  lodash: { singleton: true, requiredVersion: false },
  'lodash/fp': { singleton: true, requiredVersion: false },
  jquery: { singleton: true, requiredVersion: false },
};

const REMOTE_SHARED_LIBS = BASE_SHARED_LIBS;

const HOST_SHARED_LIBS = Object.fromEntries(
  Object.entries(BASE_SHARED_LIBS).map(([pkg, config]) => [
    pkg,
    { ...config, import: false },
  ])
);

const TYPE_ONLY_EXPORT_WARNING_REGEX = /export .* was not found in/;

const createJsRule = () => ({
  test: /\.[jt]sx?$/,
  exclude: /node_modules/,
  use: {
    loader: require.resolve('babel-loader'),
    options: {
      babelrc: false,
      presets: [require.resolve('@osd/babel-preset/webpack_preset')],
    },
  },
});

const createCssRule = (useMini) => ({
  test: /\.css$/i,
  use: [
    useMini ? MiniCssExtractPlugin.loader : 'style-loader',
    {
      loader: 'css-loader',
      options: {
        sourceMap: true,
      },
    },
  ],
});

const createScssRule = (useMini, additionalData = '') => ({
  test: /\.s[ac]ss$/i,
  use: [
    useMini ? MiniCssExtractPlugin.loader : 'style-loader',
    {
      loader: 'css-loader',
      options: {
        sourceMap: true,
      },
    },
    {
      loader: 'sass-loader',
      options: {
        sourceMap: true,
        implementation: require('sass-embedded'),
        sassOptions: {
          includePaths: [Path.resolve(repoRoot, 'node_modules'), repoRoot],
        },
        additionalData,
      },
    },
  ],
  sideEffects: true,
});

function readAllowlist(root) {
  const allowlistPath = Path.resolve(root, 'webpack5_pilot', 'entry_allowlist.json');
  if (!Fs.existsSync(allowlistPath)) {
    return DEFAULT_ALLOWLIST;
  }

  try {
    const content = Fs.readFileSync(allowlistPath, 'utf8');
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      throw new Error('Allowlist must be an array');
    }
    return parsed.map((item) => ({
      id: item.id,
      entry: Path.resolve(root, item.entry),
    }));
  } catch (error) {
    console.warn(
      `[build:v5] Failed to read entry allowlist; falling back to defaults.\n${error.message}`
    );
    return DEFAULT_ALLOWLIST;
  }
}

function buildEntryMap(root) {
  const allowlist = readAllowlist(root);
  const entries = {};

  for (const item of allowlist) {
    if (!item || !item.id || !item.entry) {
      console.warn('[build:v5] Skipping malformed allowlist entry:', item);
      continue;
    }

    const absoluteEntry = Path.resolve(root, item.entry);
    if (!Fs.existsSync(absoluteEntry)) {
      console.warn('[build:v5] Allowlisted entry not found:', absoluteEntry);
      continue;
    }

    entries[item.id] = absoluteEntry;
  }

  if (Object.keys(entries).length === 0) {
    console.warn('[build:v5] No entries resolved from allowlist, defaulting to pilot demo.');
    entries.pilot = DEFAULT_ALLOWLIST[0].entry;
  }

  return entries;
}

const entryMap = buildEntryMap(repoRoot);

const sharedConfig = {
  name: 'osd-shared-deps',
  mode: 'development',
  context: repoRoot,
  entry: SHARED_DEPS_ENTRIES,
  output: {
    path: outputDir,
    filename: '[name].js',
    publicPath: '/',
    clean: false,
  },
  target: 'web',
  devtool: 'source-map',
  optimization: {
    splitChunks: false,
    runtimeChunk: false,
    moduleIds: 'named',
    chunkIds: 'named',
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.cjs', '.json'],
    alias: {
      json11: require.resolve('json11'),
    },
    fallback: {
      path: require.resolve('path-browserify'),
      fs: false,
    },
  },
  module: {
    rules: [
      createJsRule(),
      createCssRule(true),
      createScssRule(true),
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][hash][ext][query]',
        },
      },
      {
        test: /\.(woff2?|ttf|eot)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][hash][ext][query]',
        },
      },
    ],
  },
  stats: {
    warningsFilter: TYPE_ONLY_EXPORT_WARNING_REGEX,
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new ModuleFederationPlugin({
      name: 'osd_shared_deps',
      filename: 'osd_shared_deps.remoteEntry.js',
      exposes: {
        './sharedDeps': Path.resolve(repoRoot, 'packages/osd-ui-shared-deps/entry.js'),
      },
      shared: REMOTE_SHARED_LIBS,
    }),
  ],
  ignoreWarnings: [TYPE_ONLY_EXPORT_WARNING_REGEX],
};

const hostConfig = {
  mode: 'development',
  context: repoRoot,
  entry: entryMap,
  output: {
    path: outputDir,
    filename: '[name].bundle.js',
    chunkFilename: '[name].chunk.js',
    publicPath: '/',
    clean: false,
    environment: {
      arrowFunction: true,
      const: true,
      destructuring: true,
      dynamicImport: true,
      module: false,
    },
  },
  target: 'web',
  devtool: 'source-map',
  optimization: {
    splitChunks: false,
    runtimeChunk: false,
    moduleIds: 'named',
    chunkIds: 'named',
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.cjs', '.json'],
    alias: {
      core_app_image_assets: Path.resolve(repoRoot, 'src/core/public/core_app/images'),
      'opensearch-dashboards/public': Path.resolve(repoRoot, 'src/core/public'),
      json11: require.resolve('json11'),
    },
    fallback: {
      path: require.resolve('path-browserify'),
      fs: false,
    },
  },
  module: {
    rules: [
      createJsRule(),
      createCssRule(false),
      createScssRule(false, '@import "src/core/public/core_app/styles/_globals_v9light.scss";\n'),
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][hash][ext][query]',
        },
      },
      {
        test: /\.(woff2?|ttf|eot)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][hash][ext][query]',
        },
      },
    ],
  },
  stats: {
    colors: true,
    assets: true,
    chunks: false,
    modules: false,
    warningsFilter: TYPE_ONLY_EXPORT_WARNING_REGEX,
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'osd_pilot',
      filename: 'osd_pilot.remoteEntry.js',
      remotes: {
        osd_shared_deps: 'osd_shared_deps@./osd_shared_deps.remoteEntry.js',
      },
      exposes: {
        './demo': Path.resolve(repoRoot, 'webpack5_pilot', 'demo_module.js'),
        './homePlugin': Path.resolve(repoRoot, 'src/plugins/home/public/index.ts'),
        './navigationPlugin': Path.resolve(repoRoot, 'src/plugins/navigation/public/index.ts'),
        './consolePlugin': Path.resolve(repoRoot, 'src/plugins/console/public/index.ts'),
        './devToolsPlugin': Path.resolve(repoRoot, 'src/plugins/dev_tools/public/index.ts'),
        './uiActionsPlugin': Path.resolve(repoRoot, 'webpack5_pilot/plugins/ui_actions.stub.ts'),
        './urlForwardingPlugin': Path.resolve(
          repoRoot,
          'webpack5_pilot/plugins/url_forwarding.stub.ts'
        ),
        './osdLegacyPlugin': Path.resolve(
          repoRoot,
          'webpack5_pilot/plugins/opensearch_dashboards_legacy.stub.ts'
        ),
        './managementOverviewPlugin': Path.resolve(
          repoRoot,
          'webpack5_pilot/plugins/management_overview.stub.ts'
        ),
      },
      shared: HOST_SHARED_LIBS,
    }),
  ],
  ignoreWarnings: [TYPE_ONLY_EXPORT_WARNING_REGEX],
};
module.exports = [sharedConfig, hostConfig];
