#!/usr/bin/env node

/*
 * Webpack 5 opensearchDashboardsLegacy plugin build script
 * Builds the plugin as a Module Federation container
 */

const webpack = require('webpack');
const { getPluginConfig } = require('./src/plugin-opensearchDashboardsLegacy-config.js');

// Parse arguments
const args = process.argv.slice(2);
const dev = args.includes('--dev');

console.log('🚀 Building opensearchDashboardsLegacy plugin via Module Federation...');
console.log(`   Mode: ${dev ? 'development' : 'production'}`);
console.log('📄 Config created, starting webpack...');

const config = getPluginConfig({ dev });
const compiler = webpack(config);

compiler.run((err, stats) => {
  if (err) {
    console.error('❌ Plugin build failed with error:', err);
    process.exit(1);
  }

  if (stats?.hasErrors()) {
    console.error('❌ Plugin build completed with errors:');
    console.error(stats.toString({ colors: true, errors: true, warnings: false }));
    process.exit(1);
  }

  if (stats?.hasWarnings()) {
    console.warn('⚠️ Plugin build completed with warnings:');
    console.warn(stats.toString({ colors: true, errors: false, warnings: true }));
  }

  console.log('✅ opensearchDashboardsLegacy plugin built successfully!');
  console.log(`   Built in: ${stats?.toJson()?.time}ms`);
  console.log('📊 Build stats:', stats.toString({ 
    colors: true, 
    modules: false, 
    chunks: false, 
    assets: true,
    hash: false,
    version: false,
    timings: true
  }));
  console.log('📁 Output directory:', config.output.path);
  
  compiler.close((closeErr) => {
    if (closeErr) {
      console.error('❌ Error closing compiler:', closeErr);
    } else {
      console.log('🎉 Plugin build completed!');
    }
  });
});
