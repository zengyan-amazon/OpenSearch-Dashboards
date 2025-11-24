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
        // Consume shared dependencies from shared_deps container
        react: { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
        '@elastic/eui': { singleton: true, requiredVersion: false },
        lodash: { singleton: true, requiredVersion: false },
        moment: { singleton: true, requiredVersion: false },
        rxjs: { singleton: true, requiredVersion: false },
      },
    }),
  ],
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      'opensearch-dashboards/public': path.resolve(__dirname, '../../../src/core/public'),
    },
  },

  externals: {
    // Treat shared dependencies as external - they'll be provided by Module Federation
    'react': 'react',
    'react-dom': 'react-dom', 
    '@elastic/eui': '@elastic/eui',
    'lodash': 'lodash',
    'moment': 'moment',
    'rxjs': 'rxjs',
    // Intl libraries that come from core OSD (transitive dependencies)
    'intl-format-cache': 'intl-format-cache',
    'intl-relativeformat': 'intl-relativeformat',
    'intl-messageformat': 'intl-messageformat',
  },
  
  output: {
    path: path.resolve(__dirname, '../dist/plugins/opensearchDashboardsLegacy'),
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
