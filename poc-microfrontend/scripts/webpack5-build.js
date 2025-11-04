#!/usr/bin/env node

/*
 * Main build script for webpack 5 + Module Federation PoC
 * 
 * Usage:
 *   node webpack5-build.js                    # Build all (shared, core, plugins)
 *   node webpack5-build.js --shared           # Build shared dependencies only
 *   node webpack5-build.js --core             # Build core bundle only  
 *   node webpack5-build.js --plugins          # Build plugins only
 *   node webpack5-build.js --filter=dashboard # Build specific plugin
 */

const Path = require('path');
const webpack = require('webpack');
const { REPO_ROOT } = require('@osd/utils');

// Import our webpack 5 configurations
const { getWebpack5SharedDepsConfig } = require('../webpack5-optimizer/src/shared-deps-config');

// Parse command line arguments
const args = process.argv.slice(2);
const buildShared = args.includes('--shared') || args.length === 0;
const buildCore = args.includes('--core') || args.length === 0;
const buildPlugins = args.includes('--plugins') || args.length === 0;
const dev = args.includes('--dev');
const filter = args.find(arg => arg.startsWith('--filter='))?.replace('--filter=', '');

console.log(`🚀 Starting Webpack 5 + Module Federation build...`);
console.log(`   Repository: ${REPO_ROOT}`);
console.log(`   Mode: ${dev ? 'development' : 'production'}`);
console.log(`   Components: ${[buildShared && 'shared', buildCore && 'core', buildPlugins && 'plugins'].filter(Boolean).join(', ')}`);

if (filter) {
  console.log(`   Filter: ${filter}`);
}

async function runWebpackBuild(config, name) {
  return new Promise((resolve, reject) => {
    console.log(`\n📦 Building ${name}...`);
    const startTime = Date.now();
    
    webpack(config, (err, stats) => {
      if (err) {
        console.error(`❌ ${name} build failed:`, err);
        reject(err);
        return;
      }
      
      if (stats?.hasErrors()) {
        console.error(`❌ ${name} build errors:`, stats.toString({ colors: true, errors: true }));
        reject(new Error(`${name} build has errors`));
        return;
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${name} build completed in ${duration}ms`);
      
      if (stats?.hasWarnings()) {
        console.warn(`⚠️  ${name} build warnings:`, stats.toString({ colors: true, warnings: true }));
      }
      
      resolve(stats);
    });
  });
}

async function main() {
  try {
    const builds = [];
    
    // Build shared dependencies with webpack 5 + Module Federation
    if (buildShared) {
      const sharedConfig = getWebpack5SharedDepsConfig({ dev });
      builds.push(() => runWebpackBuild(sharedConfig, 'Shared Dependencies'));
    }
    
    // Build core bundle with webpack 5 + Module Federation  
    if (buildCore) {
      // TODO: Implement core config
      console.log('📋 Core bundle build - TODO: implement core-config.js');
    }
    
    // Build plugins with webpack 5 + Module Federation
    if (buildPlugins) {
      // TODO: Implement plugin configs
      console.log('📋 Plugin builds - TODO: implement plugin-config.js');
    }
    
    // Run builds sequentially for now (can be parallelized later)
    for (const buildFn of builds) {
      await buildFn();
    }
    
    console.log('\n🎉 All webpack 5 builds completed successfully!');
    console.log(`   Output directory: ${REPO_ROOT}/poc-microfrontend/dist/`);
    
  } catch (error) {
    console.error('\n💥 Build failed:', error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main();
