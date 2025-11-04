#!/usr/bin/env node

const webpack = require('webpack');
const { getWebpack5SharedDepsConfig } = require('./src/shared-deps-config');

console.log('🧪 Testing Webpack 5 shared dependencies build...');

const config = getWebpack5SharedDepsConfig({ dev: true });
console.log('📄 Config created, starting webpack...');

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
  console.log(`   Output: poc-microfrontend/dist/shared-deps/`);
});
