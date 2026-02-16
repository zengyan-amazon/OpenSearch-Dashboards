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

const { rspack } = require('@rspack/core');
const { simpleOpenSearchDashboardsPlatformPluginDiscovery } = require('@osd/dev-utils');
const { getMfeRemoteConfig } = require('@osd/mfe');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    watch: false,
    pluginId: null,
    dist: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--watch') {
      options.watch = true;
    } else if (arg === '--dist') {
      options.dist = true;
    } else if (arg.startsWith('--plugin-id=')) {
      options.pluginId = arg.split('=')[1];
    } else if (arg === '--plugin-id' && i + 1 < args.length) {
      options.pluginId = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node build_mfe.js [options]

Build Module Federation remote entries for MFE-enabled plugins.

Options:
  --watch           Enable watch mode for development
  --plugin-id=X     Build only the specified plugin
  --dist            Build for production (minified)
  --help, -h        Show this help message

Examples:
  # Build all MFE plugins
  node scripts/build_mfe.js

  # Build a specific plugin in watch mode
  node scripts/build_mfe.js --plugin-id=mfeExample --watch

  # Production build
  node scripts/build_mfe.js --dist
`);
      process.exit(0);
    }
  }

  return options;
}

// Find all MFE-enabled plugins
function findMfePlugins(repoRoot, specificPluginId = null) {
  const scanDirs = [
    path.resolve(repoRoot, 'src/plugins'),
    path.resolve(repoRoot, 'plugins'),
    path.resolve(repoRoot, 'examples'),
  ];

  const allPlugins = simpleOpenSearchDashboardsPlatformPluginDiscovery(scanDirs, []);
  const mfePlugins = [];

  for (const plugin of allPlugins) {
    // Check if plugin has MFE enabled in its manifest
    if (plugin.manifest.mfe === true) {
      // If specific plugin requested, only include that one
      if (!specificPluginId || plugin.manifest.id === specificPluginId) {
        mfePlugins.push({
          id: plugin.manifest.id,
          directory: plugin.directory,
          manifestPath: plugin.manifestPath,
        });
      }
    }
  }

  if (specificPluginId && mfePlugins.length === 0) {
    console.error(chalk.red(`Error: Plugin "${specificPluginId}" not found or not MFE-enabled`));
    console.error('Make sure the plugin has "mfe": true in its opensearch_dashboards.json');
    process.exit(1);
  }

  return mfePlugins;
}

// Build a single plugin
async function buildPlugin(plugin, repoRoot, options) {
  const { id, directory } = plugin;
  const { watch, dist } = options;

  console.log(chalk.blue(`\nBuilding MFE plugin: ${id}`));
  console.log(chalk.gray(`  Directory: ${directory}`));

  // Prepare output directory
  const outputDir = path.join(directory, 'target', 'public', 'mfe');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get Rspack configuration from @osd/mfe
  const config = getMfeRemoteConfig({
    pluginId: id,
    pluginDir: directory,
    repoRoot,
    outputDir,
    dist,
  });

  // Inject externals: core and cross-plugin imports resolve from __osdBundles__
  // at runtime. This is host-specific orchestration that doesn't belong in the
  // base config.
  config.externals = [
    function ({ request }, callback) {
      if (request === 'opensearch-dashboards/public') {
        return callback(null, '__osdBundles__.get("entry/core/public")');
      }
      callback();
    },
  ];

  // Add watch mode configuration if needed
  if (watch) {
    config.watch = true;
    config.watchOptions = {
      ignored: /node_modules/,
      aggregateTimeout: 300,
      poll: false,
    };
  }

  // Create compiler
  const compiler = rspack(config);

  return new Promise((resolve, reject) => {
    const callback = (err, stats) => {
      if (err) {
        console.error(chalk.red(`\nError building ${id}:`), err);
        if (!watch) reject(err);
        return;
      }

      if (stats.hasErrors()) {
        const info = stats.toJson();
        console.error(chalk.red(`\nBuild errors for ${id}:`));
        info.errors.forEach((error) => {
          console.error(error.message || error);
        });
        if (!watch) reject(new Error('Build failed with errors'));
        return;
      }

      if (stats.hasWarnings()) {
        const info = stats.toJson();
        console.warn(chalk.yellow(`\nBuild warnings for ${id}:`));
        info.warnings.forEach((warning) => {
          console.warn(warning.message || warning);
        });
      }

      // Log build success
      const time = stats.endTime - stats.startTime;
      console.log(chalk.green(`✓ Built ${id} in ${time}ms`));
      console.log(chalk.gray(`  Output: ${outputDir}/remoteEntry.js`));

      if (!watch) {
        resolve();
      }
    };

    if (watch) {
      console.log(chalk.cyan(`Watching ${id} for changes...`));
      compiler.watch(config.watchOptions, callback);
    } else {
      compiler.run(callback);
    }
  });
}

// Main build function
async function main() {
  const options = parseArgs();
  const repoRoot = path.resolve(__dirname, '..');

  console.log(chalk.bold('\nOpenSearch Dashboards MFE Builder'));
  console.log(chalk.bold('=================================='));

  // Find MFE plugins
  const plugins = findMfePlugins(repoRoot, options.pluginId);

  if (plugins.length === 0) {
    console.log(chalk.yellow('No MFE-enabled plugins found'));
    console.log('To enable MFE for a plugin, add "mfe": true to its opensearch_dashboards.json');
    process.exit(0);
  }

  console.log(chalk.cyan(`\nFound ${plugins.length} MFE plugin(s):`));
  plugins.forEach((plugin) => {
    console.log(`  - ${plugin.id}`);
  });

  // Build mode info
  if (options.watch) {
    console.log(chalk.cyan('\nWatch mode enabled - rebuilding on changes'));
  }
  if (options.dist) {
    console.log(chalk.cyan('\nProduction build - output will be minified'));
  }

  try {
    if (options.watch) {
      // In watch mode, build all plugins in parallel and keep watching
      await Promise.all(
        plugins.map((plugin) => buildPlugin(plugin, repoRoot, options))
      );
    } else {
      // In normal mode, build sequentially for clearer output
      for (const plugin of plugins) {
        await buildPlugin(plugin, repoRoot, options);
      }

      console.log(chalk.green('\n✓ All MFE plugins built successfully!'));
      console.log(chalk.gray('\nTo serve these plugins locally, run:'));
      console.log(chalk.gray('  yarn serve:mfe --plugin-id=<pluginId> --port=<port>'));
    }
  } catch (error) {
    console.error(chalk.red('\n✗ Build failed:'), error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown in watch mode
if (process.argv.includes('--watch')) {
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\nStopping watch mode...'));
    process.exit(0);
  });
}

// Run the build
main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});