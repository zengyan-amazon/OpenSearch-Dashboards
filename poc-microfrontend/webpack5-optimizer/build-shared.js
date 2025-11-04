#!/usr/bin/env node

/*
 * Webpack 5 shared dependencies build script
 * Based on working test-build.js pattern
 */

const webpack = require('webpack');
const { getWebpack5SharedDepsConfig } = require('./src/shared-deps-config');

// Parse arguments
const args = process.argv.slice(2);
const dev = args.includes('--dev');

console.log('🚀 Building Webpack 5 shared dependencies...');
console.log(`   Mode: ${dev ? 'development' : 'production'}`);
console.log('📄 Config created, starting webpack...');

const config = getWebpack5SharedDepsConfig({ dev });

webpack(config, (err, stats) => {
  if (err) {
    console.error('❌ Build failed with error:', err);
    process.exit(1);
  }
  
  if (stats?.hasErrors()) {
    console.error('❌ Build completed with errors:');
    console.error(stats.toString({ colors: true, errors: true }));
    process.exit(1);
  }
  
  if (stats?.hasWarnings()) {
    console.warn('⚠️  Build completed with warnings:');
    console.warn(stats.toString({ colors: true, warnings: true }));
  }
  
  console.log('✅ Webpack 5 shared dependencies build successful!');
  console.log(`   Built in: ${stats?.toJson()?.time}ms`);
  console.log('   Output: poc-microfrontend/dist/shared-deps/');
});
