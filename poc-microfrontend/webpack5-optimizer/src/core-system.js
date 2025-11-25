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
    
    // Core entry point
    entry: {
      'core': Path.resolve(REPO_ROOT, 'src/core/public/index.ts'),
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
      // Module Federation Plugin - Expose core services with automatic dependency sharing
      new ModuleFederationPlugin({
        name: 'core_services',
        filename: 'remoteEntry.js',
        exposes: {
          // Expose main core bundle
          './CoreServices': Path.resolve(REPO_ROOT, 'src/core/public/index.ts'),
          // Expose individual services for granular consumption
          './Http': Path.resolve(REPO_ROOT, 'src/core/public/http/index.ts'),
          './Chrome': Path.resolve(REPO_ROOT, 'src/core/public/chrome/index.ts'),
          './Application': Path.resolve(REPO_ROOT, 'src/core/public/application/index.ts'),
          './SavedObjects': Path.resolve(REPO_ROOT, 'src/core/public/saved_objects/index.ts'),
          './Notifications': Path.resolve(REPO_ROOT, 'src/core/public/notifications/index.ts'),
        },
        
        // Generic shared config - automatically handles all import patterns (lodash/*, rxjs/*, etc.)
        shared: {
          'react': { singleton: true, requiredVersion: '^16.14.0' },
          'react-dom': { singleton: true, requiredVersion: '^16.12.0' },
          '@elastic/eui': { singleton: true },
          'lodash': { singleton: true },
          'moment': { singleton: true },
          'rxjs': { singleton: true },
          '@osd/i18n': { singleton: true },
          '@osd/monaco': { singleton: true },
          '@osd/std': { singleton: true },
          'styled-components': { singleton: true },
          'classnames': { singleton: true },
          'react-intl': { singleton: true },
          'react-use': { singleton: true },
          // Fix missing json11 dependency
          'json11': { singleton: true },
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
      // Core bundle optimization
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Group core services for better loading
          coreServices: {
            name: 'core.services',
            test: /[\\\/]src[\\\/]core[\\\/]public[\\\/](http|chrome|application|saved_objects|notifications)/,
            chunks: 'all',
            enforce: true,
          },
        },
      },
    },
    
    performance: {
      hints: false,
    },
  };
}

module.exports = { getWebpack5CoreConfig };
