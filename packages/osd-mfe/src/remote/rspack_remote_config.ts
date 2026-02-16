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

import Path from 'path';
import { rspack, Configuration } from '@rspack/core';
import CompressionPlugin from 'compression-webpack-plugin';
import { getSwcLoaderConfig } from '@osd/utils';
import * as UiSharedDeps from '@osd/ui-shared-deps';
import browserslist from 'browserslist';
import { MfeRemoteBuildOptions } from '../types';

/**
 * Generates an Rspack configuration for building a plugin as a Module Federation remote.
 *
 * @param options Build options for the MFE remote
 * @returns Rspack configuration
 */
export function getMfeRemoteConfig(options: MfeRemoteBuildOptions): Configuration {
  const { pluginId, pluginDir, repoRoot, outputDir, dist } = options;
  const targets = browserslist.loadConfig({ path: repoRoot });

  // Build the shared dependencies configuration from @osd/ui-shared-deps
  // Exclude @module-federation/* packages — the MF plugin handles its own runtime
  // internally. Marking them as import:false would create a chicken-and-egg problem:
  // the remote needs the MF runtime to self-initialize and connect to the host's
  // shared scope.
  const shared: Record<string, any> = {};
  for (const moduleName of Object.keys(UiSharedDeps.externals)) {
    if (moduleName.startsWith('@module-federation/')) continue;
    shared[moduleName] = {
      singleton: true,
      import: false, // Consume from host, never bundle
      requiredVersion: false
    };
  }

  const config: Configuration = {
    mode: dist ? 'production' : 'development',
    context: pluginDir,
    devtool: dist ? false : 'cheap-module-source-map',

    entry: {}, // No entry point - Module Federation will handle this

    output: {
      path: outputDir,
      publicPath: 'auto',
      filename: '[name].js',
      chunkFilename: '[name].[contenthash:8].js',
      uniqueName: `mfe_${pluginId}`,
      clean: true,
      hashFunction: 'xxhash64',
    },

    optimization: {
      emitOnErrors: false,
      chunkIds: 'natural',
      minimizer: dist ? [
        new rspack.SwcJsMinimizerRspackPlugin({
          extractComments: false,
          minimizerOptions: {
            compress: true,
            mangle: true,
          },
        }),
        new rspack.LightningCssMinimizerRspackPlugin(),
      ] : [],
    },

    plugins: [
      // Module Federation Plugin configuration
      new rspack.container.ModuleFederationPlugin({
        name: pluginId,
        filename: 'remoteEntry.js',
        exposes: {
          './plugin': Path.join(pluginDir, 'public/index.ts'),
        },
        shared,
      }),

      // Define plugin for environment variables
      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(dist ? 'production' : 'development'),
        'process.env.IS_OPENSEARCH_DASHBOARDS_DISTRIBUTABLE': JSON.stringify(dist ? 'true' : 'false'),
      }),

      // Compression plugins for production builds
      ...(dist ? [
        new CompressionPlugin({
          algorithm: 'brotliCompress',
          filename: '[path][base].br',
          test: /\.(js|css)$/,
        }),
        new CompressionPlugin({
          algorithm: 'gzip',
          filename: '[path][base].gz',
          test: /\.(js|css)$/,
        }),
      ] : []),
    ],

    module: {
      rules: [
        // TypeScript/JavaScript files
        {
          test: /\.(j|t)sx?$/,
          exclude: /node_modules/,
          use: getSwcLoaderConfig({ syntax: 'typescript', jsx: true, targets }),
        },

        // SCSS files
        {
          test: /\.scss$/,
          exclude: /node_modules/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                sourceMap: !dist,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: !dist,
                postcssOptions: {
                  config: require.resolve('@osd/optimizer/postcss.config.js'),
                },
              },
            },
            {
              loader: 'sass-loader',
              options: {
                api: 'modern-compiler',
                implementation: require.resolve('sass-embedded'),
                sassOptions: {
                  sourceMap: !dist,
                  style: dist ? 'compressed' : 'expanded',
                  quietDeps: true,
                  loadPaths: [
                    Path.resolve(repoRoot, 'node_modules'),
                    Path.resolve(repoRoot, 'src/core/public/styles'),
                    Path.resolve(repoRoot, 'src/core/public'),
                    Path.resolve(repoRoot),
                  ],
                  silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
                },
                additionalData: `
                  @import '@elastic/eui/src/global_styling/functions/index';
                  @import '@elastic/eui/src/global_styling/variables/index';
                  @import '@elastic/eui/src/global_styling/mixins/index';
                  @import 'src/core/public/variables';
                `,
              },
            },
          ],
        },

        // CSS files from node_modules
        {
          test: /\.css$/,
          include: /node_modules/,
          type: 'javascript/auto',
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                sourceMap: !dist,
              },
            },
          ],
        },

        // Asset files
        {
          test: /\.(woff|woff2|ttf|eot|svg|ico|png|jpg|gif|jpeg)(\?|$)/,
          type: 'asset',
        },

        // Raw text files
        {
          test: /\.(html|md|txt|tmpl)$/,
          type: 'asset/source',
        },

        // Handle ES modules properly
        {
          test: /\.m?js$/,
          resolve: {
            fullySpecified: false,
          },
        },
      ],
    },

    resolve: {
      extensions: ['.js', '.ts', '.tsx', '.json'],
      mainFields: ['browser', 'module', 'main'],
      alias: {},
      fallback: {
        // Node.js built-ins that browser doesn't have
        path: require.resolve('path-browserify'),
        fs: false,
        net: false,
        tls: false,
        process: false,
      },
    },

    performance: {
      // Disable performance hints as they are more tailored for final bundles
      hints: false,
    },
  };

  return config;
}