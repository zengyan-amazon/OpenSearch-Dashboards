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
  
  // No entry point needed - Module Federation will handle loading
  // The exposes section will create the necessary chunks
  entry: {},
  
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
    // Module Federation Plugin - Exposes all shared dependencies
    new ModuleFederationPlugin({
      name: 'shared_deps',
      filename: 'remoteEntry.js',
      
      // Expose all shared dependencies for consumption by other containers
      exposes: {
        // Core React ecosystem
        './react': 'react',
        './react-dom': 'react-dom',
        './react-dom/server': 'react-dom/server',
        './react-router': 'react-router',
        './react-router-dom': 'react-router-dom',
        './styled-components': 'styled-components',
        
        // Elastic ecosystem
        './@elastic/eui': '@elastic/eui',
        './@elastic/charts': '@elastic/charts',
        './@elastic/numeral': '@elastic/numeral',
        
        // Utility libraries
        './lodash': 'lodash',
        './lodash/fp': 'lodash/fp',
        './moment': 'moment',
        './moment-timezone': 'moment-timezone',
        './rxjs': 'rxjs',
        './rxjs/operators': 'rxjs/operators',
        './jquery': 'jquery',
        
        // OSD-specific packages
        './@osd/i18n': '@osd/i18n',
        './@osd/i18n/react': '@osd/i18n/react',
        './@osd/monaco': '@osd/monaco',
        
        // Runtime dependencies
        './tslib': 'tslib',
        
        // Core JS polyfills
        './core-js': 'core-js',
        './regenerator-runtime': 'regenerator-runtime',
        './whatwg-fetch': 'whatwg-fetch',
        './symbol-observable': 'symbol-observable',
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
    // Enable splitChunks with 'all' to split both sync and async chunks
    // This creates separate chunks for each library
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 0,
      cacheGroups: {
        // Create separate chunks for each major library
        react: {
          test: /[\\/]node_modules[\\/]react[\\/]/,
          name: 'vendor-react',
          priority: 40,
        },
        reactDom: {
          test: /[\\/]node_modules[\\/]react-dom[\\/]/,
          name: 'vendor-react-dom',
          priority: 40,
        },
        eui: {
          test: /[\\/]node_modules[\\/]@elastic[\\/]eui[\\/]/,
          name: 'vendor-eui',
          priority: 40,
        },
        elasticCharts: {
          test: /[\\/]node_modules[\\/]@elastic[\\/]charts[\\/]/,
          name: 'vendor-elastic-charts',
          priority: 40,
        },
        lodash: {
          test: /[\\/]node_modules[\\/]lodash[\\/]/,
          name: 'vendor-lodash',
          priority: 40,
        },
        moment: {
          test: /[\\/]node_modules[\\/]moment[\\/]/,
          name: 'vendor-moment',
          priority: 40,
        },
        rxjs: {
          test: /[\\/]node_modules[\\/]rxjs[\\/]/,
          name: 'vendor-rxjs',
          priority: 40,
        },
        monaco: {
          test: /[\\/]node_modules[\\/]monaco-editor[\\/]/,
          name: 'vendor-monaco',
          priority: 40,
        },
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor-others',
          priority: -10,
          reuseExistingChunk: true,
        },
      },
    },
  },

  performance: {
    hints: false,
  },
});
