/*
 * Webpack 5 + Module Federation version of packages/osd-ui-shared-deps/webpack.config.js
 * 
 * Original copied from: packages/osd-ui-shared-deps/webpack.config.js
 * Modified to support webpack 5 and Module Federation
 */

const Path = require('path');
// Re-enable Module Federation for shared dependencies federation
const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin;
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { REPO_ROOT } = require('@osd/utils');
const webpack = require('webpack');

// Import existing shared deps structure
const UiSharedDeps = require('../../../packages/osd-ui-shared-deps');

const MOMENT_SRC = require.resolve('moment/min/moment-with-locales.js');

exports.getWebpack5SharedDepsConfig = ({ dev = false } = {}) => ({
  mode: dev ? 'development' : 'production',
  
  // Single entry point for Module Federation (eliminates duplication)
  entry: {
    main: Path.resolve(REPO_ROOT, 'packages/osd-ui-shared-deps/entry.js'),
  },
  
  context: Path.resolve(REPO_ROOT, 'packages/osd-ui-shared-deps'),
  devtool: dev ? 'cheap-source-map' : false,
  
  output: {
    path: Path.resolve(REPO_ROOT, 'poc-microfrontend/dist/shared-deps'),
    filename: '[name].js',
    sourceMapFilename: '[file].map',
    devtoolModuleFilenameTemplate: (info) =>
      `osd-ui-shared-deps/${Path.relative(REPO_ROOT, info.absoluteResourcePath)}`,
    publicPath: '/',
    // Pure Module Federation - no legacy library output
    uniqueName: 'shared_deps',
  },

  plugins: [
    // Module Federation Plugin - Shared dependency provider + exposer
    new ModuleFederationPlugin({
      name: 'shared_deps',
      filename: 'remoteEntry.js',
      
      // ADD: Expose the shared bundle for consumption by shell and other containers
      exposes: {
        './SharedBundle': Path.resolve(REPO_ROOT, 'packages/osd-ui-shared-deps/entry.js'),
      },
      
      shared: {
        // Core React ecosystem - all 23 OSD shared dependencies  
        'react': { singleton: true, eager: true },
        'react-dom': { singleton: true, eager: true },
        'react-dom/server': { singleton: true, eager: true },
        'react-router': { singleton: true, eager: true },
        'react-router-dom': { singleton: true, eager: true },
        'styled-components': { singleton: true, eager: true },
        
        // Elastic ecosystem
        '@elastic/eui': { singleton: true, eager: true },
        '@elastic/charts': { singleton: true, eager: true },
        '@elastic/numeral': { singleton: true, eager: true },
        
        // Utility libraries
        'lodash': { singleton: true, eager: true },
        'lodash/fp': { singleton: true, eager: true },
        'moment': { singleton: true, eager: true },
        'moment-timezone': { singleton: true, eager: true },
        'rxjs': { singleton: true, eager: true },
        'rxjs/operators': { singleton: true, eager: true },
        'jquery': { singleton: true, eager: true },
        
        // OSD-specific packages
        '@osd/i18n': { singleton: true, eager: true },
        '@osd/i18n/react': { singleton: true, eager: true },
        '@osd/monaco': { singleton: true, eager: true },
        
        // Runtime dependencies
        'tslib': { singleton: true, eager: true },
        
        // Core JS polyfills (ensure they load first)
        'core-js': { singleton: true, eager: true },
        'regenerator-runtime': { singleton: true, eager: true },
        'whatwg-fetch': { singleton: true, eager: true },
        'symbol-observable': { singleton: true, eager: true },
      },
    }),
    
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': dev ? '"development"' : '"production"',
    }),
    
    // Compression plugins for production - fix filename template for webpack 5
    ...(dev ? [] : [
      new CompressionPlugin({
        algorithm: 'brotliCompress',
        filename: '[file].br',
        test: /\.(js|css)$/,
      }),
      new CompressionPlugin({
        algorithm: 'gzip', 
        filename: '[file].gz',
        test: /\.(js|css)$/,
      }),
    ]),
  ],

  module: {
    noParse: [MOMENT_SRC],
    rules: [
      // Entry.js loader (restored for webpack 5 compatibility)
      {
        include: [Path.resolve(REPO_ROOT, 'packages/osd-ui-shared-deps/entry.js')],
        use: [
          {
            loader: UiSharedDeps.publicPathLoader,
            options: {
              key: 'osd-ui-shared-deps',
            },
          },
        ],
      },
      
      // CSS handling
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
        ],
        // Exclude Monaco's codicon CSS which needs special handling
        exclude: /[\/\\]node_modules[\/\\]monaco-editor[\/\\].*codicon.*\.css$/,
      },
      
      // Special handling for Monaco's codicon CSS
      {
        test: /[\/\\]node_modules[\/\\]monaco-editor[\/\\].*codicon.*\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      
      // Monaco font files - use file-loader for webpack 4/5 compatibility
      {
        test: /[\/\\]node_modules[\/\\]monaco-editor[\/\\].*\.ttf$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts/',
            },
          },
        ],
      },
      
      // SCSS handling
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader',
        ],
      },
      
      // Theme.ts handling
      {
        include: [Path.resolve(REPO_ROOT, 'packages/osd-ui-shared-deps/theme.ts')],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [require.resolve('@osd/babel-preset/webpack_preset')],
            },
          },
        ],
      },
      
      // EUI production optimization (copied from existing)
      {
        test: !dev ? /[\\\/]@elastic[\\\/]eui[\\\/].*\.js$/ : () => false,
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: [
                [
                  require.resolve('babel-plugin-transform-react-remove-prop-types'),
                  {
                    mode: 'remove',
                    removeImport: true,
                  },
                ],
              ],
            },
          },
        ],
      },
      
      // Monaco editor JS files (adapted for webpack 5)
      {
        test: /[\/\\]node_modules[\/\\]monaco-editor[\/\\].*\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            presets: [require.resolve('@osd/babel-preset/webpack_preset')],
            plugins: [
              require.resolve('@babel/plugin-transform-class-static-block'),
              require.resolve('@babel/plugin-transform-nullish-coalescing-operator'),
              require.resolve('@babel/plugin-transform-optional-chaining'),
              require.resolve('@babel/plugin-transform-numeric-separator'),
            ],
          },
        },
      },
      
      // ANTLR-generated files (copied from existing)
      {
        test: /[\/\\]osd-antlr-grammar[\/\\]target[\/\\].*\.generated[\/\\].*\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            presets: [require.resolve('@osd/babel-preset/webpack_preset')],
            plugins: [
              require.resolve('@babel/plugin-transform-class-static-block'),
              require.resolve('@babel/plugin-transform-nullish-coalescing-operator'),
              require.resolve('@babel/plugin-transform-optional-chaining'),
              require.resolve('@babel/plugin-transform-numeric-separator'),
            ],
          },
        },
      }
    ],
  },

  resolve: {
    alias: {
      moment: MOMENT_SRC,
    },
    extensions: ['.js', '.ts'],
  },

  optimization: {
    noEmitOnErrors: true,
    // Disable splitChunks for Module Federation - shared modules must be in main bundle for eager sharing
    splitChunks: false,
  },

  performance: {
    hints: false,
  },
});
