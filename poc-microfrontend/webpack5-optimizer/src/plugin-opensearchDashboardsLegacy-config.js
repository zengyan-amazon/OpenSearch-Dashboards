const path = require('path');
const { ModuleFederationPlugin } = require('webpack').container;
const { REPO_ROOT } = require('@osd/utils');

const PLUGIN_ROOT = path.resolve(__dirname, '../../../src/plugins/opensearch_dashboards_legacy');

module.exports = {
  mode: 'development',
  entry: path.join(PLUGIN_ROOT, 'public/index.ts'),
  
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [require.resolve('@osd/babel-preset/webpack_preset')],
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  
  plugins: [
    new ModuleFederationPlugin({
      name: 'opensearchDashboardsLegacy_plugin',
      filename: 'remoteEntry.js',
      exposes: {
        './Plugin': path.join(PLUGIN_ROOT, 'public/index.ts'),
      },
      shared: {
        // Consume from shared-deps container (flexible versioning)
        'react': { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
        'react-dom/server': { singleton: true, requiredVersion: false },
        'react-router': { singleton: true, requiredVersion: false },
        'react-router-dom': { singleton: true, requiredVersion: false },
        'styled-components': { singleton: true, requiredVersion: false },
        '@elastic/eui': { singleton: true, requiredVersion: false },
        '@elastic/charts': { singleton: true, requiredVersion: false },
        '@elastic/numeral': { singleton: true, requiredVersion: false },
        'lodash': { singleton: true, requiredVersion: false },
        'lodash/fp': { singleton: true, requiredVersion: false },
        'moment': { singleton: true, requiredVersion: false },
        'moment-timezone': { singleton: true, requiredVersion: false },
        'rxjs': { singleton: true, requiredVersion: false },
        'rxjs/operators': { singleton: true, requiredVersion: false },
        'jquery': { singleton: true, requiredVersion: false },
        '@osd/i18n': { singleton: true, requiredVersion: false },
        '@osd/i18n/react': { singleton: true, requiredVersion: false },
        '@osd/monaco': { singleton: true, requiredVersion: false },
        'tslib': { singleton: true, requiredVersion: false },
      },
    }),
  ],
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      'opensearch-dashboards/public': path.resolve(__dirname, '../../../src/core/public'),
    },
  },

  // Module Federation shared config replaces externals - automatic dependency resolution
  // externals: {}, // No longer needed - MF shared handles all import patterns automatically
  
  output: {
    path: path.resolve(REPO_ROOT, 'poc-microfrontend/dist/plugins/opensearchDashboardsLegacy'),
    publicPath: '/plugins/opensearchDashboardsLegacy/',
    clean: true,
  },
  
  // Disable performance hints for plugin development
  performance: {
    hints: false,
  },
  
  // Basic optimization for development
  optimization: {
    minimize: false,
  },
};
