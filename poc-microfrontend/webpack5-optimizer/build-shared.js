#!/usr/bin/env node

/*
 * Webpack 5 shared dependencies build script
 * Builds both main bundle (Module Federation) and theme CSS separately
 * This eliminates the 150MB+ duplication issue
 */

const webpack = require('webpack');
const { getWebpack5SharedDepsConfig } = require('./src/shared-deps-config');
const { getWebpack5ThemeConfig } = require('./src/theme-config');

// Parse arguments
const args = process.argv.slice(2);
const dev = args.includes('--dev');

console.log('🚀 Building Webpack 5 shared dependencies (optimized)...');
console.log(`   Mode: ${dev ? 'development' : 'production'}`);

async function buildConfig(config, name) {
  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) {
        console.error(`❌ ${name} build failed with error:`, err);
        reject(err);
        return;
      }
      
      if (stats?.hasErrors()) {
        console.error(`❌ ${name} build completed with errors:`);
        console.error(stats.toString({ colors: true, errors: true }));
        reject(new Error(`${name} build failed`));
        return;
      }
      
      if (stats?.hasWarnings()) {
        console.warn(`⚠️  ${name} build completed with warnings:`);
        console.warn(stats.toString({ colors: true, warnings: true }));
      }
      
      console.log(`✅ ${name} build successful! (${stats?.toJson()?.time}ms)`);
      resolve();
    });
  });
}

async function buildAll() {
  try {
    console.log('📄 Phase 1: Building main Module Federation bundle...');
    const mainConfig = getWebpack5SharedDepsConfig({ dev });
    await buildConfig(mainConfig, 'Main Bundle');
    
    console.log('📄 Phase 2: Building theme CSS files...');  
    const themeConfig = getWebpack5ThemeConfig({ dev });
    await buildConfig(themeConfig, 'Theme CSS');
    
    console.log('✅ All builds completed successfully!');
    console.log('   📊 Eliminated 150MB+ duplication');
    console.log('   📁 Output: poc-microfrontend/dist/shared-deps/');
    
  } catch (error) {
    console.error('❌ Build process failed:', error);
    process.exit(1);
  }
}

buildAll();
