/*
 * Webpack 5 + Module Federation configuration for src/core/public
 *
 * Based on: packages/osd-optimizer core bundle configuration
 * Modified to support webpack 5 and Module Federation
 */
const Path = require('path');
const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin;
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { REPO_ROOT } = require('@osd/utils');
const webpack = require('webpack');

function getWebpack5CoreConfig({ dev = false } = {}) {
  return {
    mode: dev ? 'development' : 'production',
    
    // Bootstrap5 entry point - lightweight Module Federation orchestrator
    entry: {
      'bootstrap5': Path.resolve(REPO_ROOT, 'src/core/public/osd_bootstrap_5.ts'),
    },
    
    context: Path.resolve(REPO_ROOT, 'src/core'),
    devtool: dev ? 'cheap-source-map' : false,
    
    output: {
      path: Path.resolve(REPO_ROOT, 'poc-microfrontend/dist/core'),
      filename: '[name].js',
      sourceMapFilename: '[file].map',
      devtoolModuleFilenameTemplate: (info) =>
        `core/${Path.relative(REPO_ROOT, info.absoluteResourcePath)}`,
      
      // Core bundle as global for traditional loading
      library: '__osdCore__',
      libraryTarget: 'var',
      publicPath: '/core/',
      
      // Module Federation specific - ensure remoteEntry creates window.core
      uniqueName: 'core',
    },
    
    plugins: [
      // Module Federation Plugin - Consumer of shared-deps + service exposer
      new ModuleFederationPlugin({
        name: 'core_services',
        filename: 'remoteEntry.js',
        
        // Consume from shared-deps container
        remotes: {
          'shared_deps': 'shared_deps@/shared-deps/remoteEntry.js',
        },
        
        exposes: {
          // Expose main core bundle
          './CoreServices': Path.resolve(REPO_ROOT, 'src/core/public/index.ts'),
          // Expose bootstrap function for dynamic loading
          './Bootstrap': Path.resolve(REPO_ROOT, 'src/core/public/osd_bootstrap.ts'),
          // Expose individual services for granular consumption
          './Http': Path.resolve(REPO_ROOT, 'src/core/public/http/index.ts'),
          './Chrome': Path.resolve(REPO_ROOT, 'src/core/public/chrome/index.ts'),
          './Application': Path.resolve(REPO_ROOT, 'src/core/public/application/index.ts'),
          './SavedObjects': Path.resolve(REPO_ROOT, 'src/core/public/saved_objects/index.ts'),
          './Notifications': Path.resolve(REPO_ROOT, 'src/core/public/notifications/index.ts'),
        },
        
        // Consume shared dependencies from shared-deps container
        shared: {
          // React ecosystem - consume from shared-deps
          'react': { singleton: true, requiredVersion: false, import: false },
          'react-dom': { singleton: true, requiredVersion: false, import: false },
          'react-dom/server': { singleton: true, requiredVersion: false, import: false },
          'react-router': { singleton: true, requiredVersion: false, import: false },
          'react-router-dom': { singleton: true, requiredVersion: false, import: false },
          'styled-components': { singleton: true, requiredVersion: false, import: false },
          
          // Elastic ecosystem - consume from shared-deps
          '@elastic/eui': { singleton: true, requiredVersion: false, import: false },
          '@elastic/charts': { singleton: true, requiredVersion: false, import: false },
          '@elastic/numeral': { singleton: true, requiredVersion: false, import: false },
          
          // Utilities - consume from shared-deps
          'lodash': { singleton: true, requiredVersion: false, import: false },
          'lodash/fp': { singleton: true, requiredVersion: false, import: false },
          'moment': { singleton: true, requiredVersion: false, import: false },
          'moment-timezone': { singleton: true, requiredVersion: false, import: false },
          'rxjs': { singleton: true, requiredVersion: false, import: false },
          'rxjs/operators': { singleton: true, requiredVersion: false, import: false },
          'jquery': { singleton: true, requiredVersion: false, import: false },
          
          // OSD packages - consume from shared-deps
          '@osd/i18n': { singleton: true, requiredVersion: false, import: false },
          '@osd/i18n/react': { singleton: true, requiredVersion: false, import: false },
          '@osd/monaco': { singleton: true, requiredVersion: false, import: false },
          'tslib': { singleton: true, requiredVersion: false, import: false },
          
          // Polyfills - consume from shared-deps
          'core-js': { singleton: true, requiredVersion: false, import: false },
          'regenerator-runtime': { singleton: true, requiredVersion: false, import: false },
          'whatwg-fetch': { singleton: true, requiredVersion: false, import: false },
          'symbol-observable': { singleton: true, requiredVersion: false, import: false },
          
          // Core-specific dependencies (NOT in shared-deps, bundle locally)
          '@osd/std': { singleton: true, requiredVersion: false, import: false },
          'classnames': { singleton: true, requiredVersion: false, import: false },
          'react-intl': { singleton: true, requiredVersion: false, import: false },
          'react-use': { singleton: true, requiredVersion: false, import: false },
          'json11': { singleton: true, requiredVersion: false, import: false },
        }
      }),
      
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
      
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': dev ? '"development"' : '"production"',
      }),
      
      // Compression plugins for production
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
      rules: [
        // TypeScript handling
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [require.resolve('@osd/babel-preset/webpack_preset')],
              },
            },
          ],
          exclude: /node_modules/,
        },
        
        // SCSS handling with theme variables (like shared-deps-config.js)
        {
          test: /\.scss$/,
          exclude: /node_modules/,
          oneOf: [
            // Add theme-specific SCSS processing for development (use v8 light theme)
            {
              use: [
                {
                  loader: 'style-loader',
                },
                {
                  loader: 'css-loader',
                  options: {
                    sourceMap: dev,
                  },
                },
                {
                  loader: 'postcss-loader',
                  options: {
                    sourceMap: dev,
                    postcssOptions: {
                      config: require.resolve('@osd/optimizer/postcss.config.js'),
                    },
                  },
                },
                {
                  loader: 'sass-loader',
                  options: {
                    additionalData(content, loaderContext) {
                      return `@import ${JSON.stringify(
                        Path.resolve(REPO_ROOT, 'src/core/public/core_app/styles/_globals_v8light.scss')
                      )};\n${content}`;
                    },
                    webpackImporter: false,
                    implementation: require('sass-embedded'),
                    sassOptions: {
                      outputStyle: 'compressed',
                      includePaths: [Path.resolve(REPO_ROOT, 'node_modules')],
                      sourceMapRoot: `/core`,
                    },
                  },
                },
              ],
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
        },
        
        // Asset handling
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]',
                outputPath: 'assets/',
              },
            },
          ],
        },
      ],
    },
    
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        // Core app image assets alias (from existing config)
        core_app_image_assets: Path.resolve(REPO_ROOT, 'src/core/public/core_app/images'),
        // Alias for opensearch-dashboards public API (from existing core config)
        'opensearch-dashboards/public': Path.resolve(REPO_ROOT, 'src/core/public'),
      },
      
      // Webpack 5 polyfills for Node.js modules (fix for path module errors)
      fallback: {
        "path": require.resolve("path-browserify"),
        "url": require.resolve("url/"),
        "fs": false,
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "buffer": require.resolve("buffer"),
      },
    },
    
    // Module Federation shared config replaces externals for automatic deduplication
    // No manual externals needed - MF shared handles all import patterns automatically
    
    optimization: {
      noEmitOnErrors: true,
      // ⚠️ CRITICAL: Disable splitChunks for Module Federation
      // bootstrap5.js must be self-contained and lightweight
      splitChunks: false,
    },
    
    performance: {
      hints: false,
    },
  };
}

module.exports = { getWebpack5CoreConfig };
