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
  
  // Multiple entry points for shared deps and themes
  entry: {
    'osd-ui-shared-deps': Path.resolve(REPO_ROOT, 'packages/osd-ui-shared-deps/entry.js'),
    'osd-ui-shared-deps.v7.dark': ['@elastic/eui/dist/eui_theme_dark.css'],
    'osd-ui-shared-deps.v7.light': ['@elastic/eui/dist/eui_theme_light.css'],
    'osd-ui-shared-deps.v8.dark': ['@elastic/eui/dist/eui_theme_next_dark.css'],
    'osd-ui-shared-deps.v8.light': ['@elastic/eui/dist/eui_theme_next_light.css'],
    'osd-ui-shared-deps.v9.dark': ['@elastic/eui/dist/eui_theme_v9_dark.css'],
    'osd-ui-shared-deps.v9.light': ['@elastic/eui/dist/eui_theme_v9_light.css'],
  },
  
  context: Path.resolve(REPO_ROOT, 'packages/osd-ui-shared-deps'),
  devtool: dev ? 'cheap-source-map' : false,
  
  output: {
    path: Path.resolve(REPO_ROOT, 'poc-microfrontend/dist/shared-deps'),
    filename: '[name].js',
    sourceMapFilename: '[file].map',
    devtoolModuleFilenameTemplate: (info) =>
      `osd-ui-shared-deps/${Path.relative(REPO_ROOT, info.absoluteResourcePath)}`,
    // Use webpack 4 compatible library syntax for now
    library: '__osdSharedDeps__',
    libraryTarget: 'var',
    publicPath: '/',
    // Remove custom hash function, use webpack default
  },

  plugins: [
    // Module Federation Plugin - Dual approach: traditional + federated in different namespaces
    new ModuleFederationPlugin({
      name: 'shared_deps',
      filename: 'remoteEntry.js',
      exposes: {
        // Single expose for Module Federation (working approach for Option B)
        './SharedBundle': Path.resolve(REPO_ROOT, 'packages/osd-ui-shared-deps/entry.js'),
      },
      // No shared config - this bundle PROVIDES dependencies but doesn't consume them
      // Traditional bundling for __osdSharedDeps__ global + MF expose for federated access
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
      // Entry.js loader (adapted from existing - removing public path loader for PoC)
      // TODO: Re-enable public path loader when integrating with OSD server
      // {
      //   include: [Path.resolve(REPO_ROOT, 'packages/osd-ui-shared-deps/entry.js')],
      //   use: [
      //     {
      //       loader: UiSharedDeps.publicPathLoader,
      //       options: {
      //         key: 'osd-ui-shared-deps',
      //       },
      //     },
      //   ],
      // },
      
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
    // Restore original splitChunks optimization - this creates the @elastic bundle
    splitChunks: {
      cacheGroups: {
        'osd-ui-shared-deps.@elastic': {
          name: 'osd-ui-shared-deps.@elastic',
          test: (m) => m.resource && m.resource.includes('@elastic'),
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },

  performance: {
    hints: false,
  },
});
