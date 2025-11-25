# Plugin Federation Implementation Plan: opensearchDashboardsLegacy

## Overview

This document outlines the detailed plan to implement Module Federation for the `opensearchDashboardsLegacy` plugin, establishing the pattern for federating OSD plugins at runtime.

### Why opensearchDashboardsLegacy is Perfect for Federation

- **Zero Dependencies**: 
  - RequiredPlugins: `[]` (no runtime plugin dependencies)
  - RequiredBundles: `[]` (no webpack bundle dependencies)
- **Simple Structure**: Standard OSD plugin with setup() and start() methods
- **Self-contained**: Provides deprecated utilities without complex integrations
- **Low Risk**: Failure won't break core OSD functionality

### Current State

- ✅ **COMPLETE Module Federation Architecture**: Full 3-container MF implementation working
- ✅ **Shared Dependencies**: Pure Module Federation with automatic loading (`window.__osdSharedDeps__`)  
- ✅ **Core Services**: 6/6 services federated via Module Federation (`window.__osdBundles__`)
- ✅ **OSD Application**: "🎉 OSD Application bootstrapped via Module Federation!" achieved
- ✅ **Infrastructure Ready**: Complete foundation for plugin federation established
- 🚧 **Next Phase**: opensearchDashboardsLegacy plugin federation implementation

### Architecture Overview

**Actual 3-Container Module Federation Architecture:**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   OSD Shell     │    │ Core Services    │    │ Plugin Container│
│   Application   │◄───┤   Container      │◄───┤   (MF Remote)   │
│ (HTML Bootstrap)│    │ (Module Fed)     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         ▲                                              ▲
         │                                              │  
         ▼                                              │
┌─────────────────┐                                     │
│ Shared Deps     │◄────────────────────────────────────┘
│   Container     │
│ (Module Fed)    │  
└─────────────────┘
```

**Key Achievements:**
- ✅ **Pure Module Federation**: All containers use automatic dependency loading
- ✅ **Core Services Federation**: CoreServices, HTTP, Chrome, Application, SavedObjects, Notifications
- ✅ **Shared Dependencies**: React, EUI, Lodash, Monaco via Module Federation
- ✅ **Lazy Plugin Loading**: Infrastructure ready with `__osdBundles__` interface
- ✅ **Zero Code Changes**: Existing patterns maintained with MF backend

## Implementation Plan

### Step 1: Create Plugin Webpack Configuration

**File**: `poc-microfrontend/webpack5-optimizer/src/plugin-opensearchDashboardsLegacy-config.js`

**Implementation**:
```javascript
const path = require('path');
const { ModuleFederationPlugin } = require('@module-federation/webpack');

const PLUGIN_ROOT = path.resolve(__dirname, '../../../src/plugins/opensearch_dashboards_legacy');

module.exports = {
  mode: 'development',
  entry: path.join(PLUGIN_ROOT, 'public/index.ts'),
  
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  
  plugins: [
    new ModuleFederationPlugin({
      name: 'opensearchDashboardsLegacy_plugin',
      filename: 'remoteEntry.js',
      exposes: {
        './Plugin': path.join(PLUGIN_ROOT, 'public/index.ts'),
      },
      shared: {
        // Consume shared dependencies from existing containers
        react: { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
        '@elastic/eui': { singleton: true, requiredVersion: false },
        lodash: { singleton: true, requiredVersion: false },
        moment: { singleton: true, requiredVersion: false },
        rxjs: { singleton: true, requiredVersion: false },
      },
    }),
  ],
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      'opensearch-dashboards/public': path.resolve(__dirname, '../../../src/core/public'),
    },
  },
  
  output: {
    path: path.resolve(__dirname, '../dist/plugins/opensearchDashboardsLegacy'),
    publicPath: '/plugins/opensearchDashboardsLegacy/',
    clean: true,
  },
};
```

**Verification Steps**:
1. **Config Validation**:
   ```bash
   # Test webpack config syntax
   node -e "console.log('Config valid:', require('./poc-microfrontend/webpack5-optimizer/src/plugin-opensearchDashboardsLegacy-config.js'))"
   ```
   - Expected: `Config valid: [object Object]`

2. **Dry Run Test**:
   ```bash
   cd poc-microfrontend/webpack5-optimizer
   npx webpack --config src/plugin-opensearchDashboardsLegacy-config.js --dry-run
   ```
   - Expected: No syntax errors, webpack validates successfully

3. **Entry Point Check**:
   - Verify `src/plugins/opensearch_dashboards_legacy/public/index.ts` exists
   - Confirm it exports plugin factory function

---

### Step 2: Create Plugin Build Script

**File**: `poc-microfrontend/webpack5-optimizer/build-opensearchDashboardsLegacy.js`

**Implementation**:
```javascript
const webpack = require('webpack');
const config = require('./src/plugin-opensearchDashboardsLegacy-config.js');

console.log('🚀 Building opensearchDashboardsLegacy plugin via Module Federation...');

const compiler = webpack(config);

compiler.run((err, stats) => {
  if (err) {
    console.error('❌ Plugin build failed:', err);
    process.exit(1);
  }

  if (stats.hasErrors()) {
    console.error('❌ Plugin build errors:', stats.toString({ errors: true, warnings: false }));
    process.exit(1);
  }

  if (stats.hasWarnings()) {
    console.warn('⚠️ Plugin build warnings:', stats.toString({ errors: false, warnings: true }));
  }

  console.log('✅ opensearchDashboardsLegacy plugin built successfully!');
  console.log('📊 Build stats:', stats.toString({ colors: true, modules: false }));
  console.log('📁 Output directory:', config.output.path);
  
  compiler.close((closeErr) => {
    if (closeErr) {
      console.error('❌ Error closing compiler:', closeErr);
    } else {
      console.log('🎉 Plugin build completed!');
    }
  });
});
```

**Verification Steps**:
1. **Build Execution**:
   ```bash
   cd poc-microfrontend/webpack5-optimizer
   node build-opensearchDashboardsLegacy.js
   ```
   - Expected: `✅ opensearchDashboardsLegacy plugin built successfully!`

2. **Output Verification**:
   ```bash
   ls -la poc-microfrontend/dist/plugins/opensearchDashboardsLegacy/
   ```
   - Expected files: `remoteEntry.js`, plugin bundle files

3. **RemoteEntry Validation**:
   ```bash
   # Check remoteEntry.js is valid JavaScript
   node -e "console.log('RemoteEntry size:', require('fs').statSync('poc-microfrontend/dist/plugins/opensearchDashboardsLegacy/remoteEntry.js').size, 'bytes')"
   ```
   - Expected: File size > 0 bytes, no syntax errors

4. **Container Loading Test**:
   ```javascript
   // Test in browser console after serving files
   console.log('Plugin container:', window.opensearchDashboardsLegacy_plugin);
   ```
   - Expected: Container object with get(), init() methods

---

### Step 3: Update Development Server

**File**: `poc-microfrontend/scripts/webpack5-dev-server.js`

**Modifications** (add to existing routes):
```javascript
// Add after existing routes
app.use('/plugins/opensearchDashboardsLegacy', express.static(
  path.join(__dirname, '../dist/plugins/opensearchDashboardsLegacy'),
  {
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
  }
));

// Update endpoint logging
console.log('📊 Available endpoints:');
console.log('   - http://localhost:5602/                     (Module testing page)');
console.log('   - http://localhost:5602/app                  (🚀 OSD Shell Application)');
console.log('   - http://localhost:5602/plugins/opensearchDashboardsLegacy/remoteEntry.js (Plugin container)');
console.log('   - http://localhost:5602/shared-deps/osd-ui-shared-deps.js    (Main bundle)');
```

**Verification Steps**:
1. **Server Start**:
   ```bash
   yarn dev:microfrontend
   ```
   - Expected: Server starts with plugin endpoint listed

2. **Plugin Route Test**:
   ```bash
   curl -I http://localhost:5602/plugins/opensearchDashboardsLegacy/remoteEntry.js
   ```
   - Expected: `HTTP/1.1 200 OK`, proper CORS headers

3. **File Serving Test**:
   ```bash
   curl http://localhost:5602/plugins/opensearchDashboardsLegacy/remoteEntry.js | head -5
   ```
   - Expected: Valid JavaScript content starts

4. **CORS Verification**:
   ```bash
   curl -H "Origin: http://localhost:5602" -I http://localhost:5602/plugins/opensearchDashboardsLegacy/remoteEntry.js
   ```
   - Expected: `Access-Control-Allow-Origin: *` header present

---

### Step 4: Add Plugin Build Command

**File**: `package.json`

**Modification** (add to scripts section):
```json
{
  "scripts": {
    "build:webpack5:plugin:opensearchDashboardsLegacy": "cd poc-microfrontend/webpack5-optimizer && node build-opensearchDashboardsLegacy.js"
  }
}
```

**Verification Steps**:
1. **Command Execution**:
   ```bash
   yarn build:webpack5:plugin:opensearchDashboardsLegacy
   ```
   - Expected: Successful build completion

2. **Build Integration**:
   ```bash
   # Test full build sequence  
   yarn build:webpack5:shared && yarn build:webpack5:core && yarn build:webpack5:plugin:opensearchDashboardsLegacy
   ```
   - Expected: All builds complete successfully
   - Note: `build:webpack5:core` builds Core Services as Module Federation container

---

### Step 5: Test Plugin Container Loading

**File**: `poc-microfrontend/dev-server/src/plugin-test.html` (temporary test file)

**Implementation**:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Plugin Container Test</title>
</head>
<body>
    <h1>Plugin Container Loading Test</h1>
    <div id="results"></div>
    
    <script src="/plugins/opensearchDashboardsLegacy/remoteEntry.js"></script>
    <script>
        async function testPluginContainer() {
            const results = document.getElementById('results');
            
            try {
                // Test 1: Container exists
                if (window.opensearchDashboardsLegacy_plugin) {
                    results.innerHTML += '<p>✅ Plugin container loaded</p>';
                } else {
                    results.innerHTML += '<p>❌ Plugin container not found</p>';
                    return;
                }
                
                // Test 2: Container has required methods
                const container = window.opensearchDashboardsLegacy_plugin;
                if (container.get && container.init) {
                    results.innerHTML += '<p>✅ Container has required methods</p>';
                } else {
                    results.innerHTML += '<p>❌ Container missing methods</p>';
                }
                
                // Test 3: Plugin can be imported
                const pluginModule = await container.get('./Plugin');
                if (pluginModule) {
                    results.innerHTML += '<p>✅ Plugin module imported successfully</p>';
                    
                    // Test 4: Plugin factory function
                    const pluginFactory = pluginModule();
                    if (typeof pluginFactory.plugin === 'function') {
                        results.innerHTML += '<p>✅ Plugin factory function available</p>';
                    } else {
                        results.innerHTML += '<p>❌ Plugin factory function not found</p>';
                    }
                } else {
                    results.innerHTML += '<p>❌ Plugin module import failed</p>';
                }
                
            } catch (error) {
                results.innerHTML += `<p>❌ Error: ${error.message}</p>`;
            }
        }
        
        window.addEventListener('load', testPluginContainer);
    </script>
</body>
</html>
```

**Verification Steps**:
1. **Access Test Page**:
   ```
   http://localhost:5602/plugin-test.html
   ```
   - Expected: All green checkmarks ✅

2. **Browser Console Check**:
   ```javascript
   console.log('Container:', window.opensearchDashboardsLegacy_plugin);
   window.opensearchDashboardsLegacy_plugin.get('./Plugin').then(console.log);
   ```
   - Expected: Container object logged, plugin module returned

---

### Step 6: Modify OSD Shell Bootstrap

**File**: `poc-microfrontend/dev-server/src/osd-shell.html`

**Modifications** (update bootstrap script):

Add plugin container loading:
```html
<!-- Load Module Federation entry points -->
<script src="/shared-deps/remoteEntry.js"></script>
<!-- Note: CoreSystem is bundled directly in the shell application, no separate container needed -->
<script src="/plugins/opensearchDashboardsLegacy/remoteEntry.js"></script>
```

Update bootstrap logic:
```javascript
// Step 6: Load plugin containers (CoreSystem already bundled in shell)
const pluginContainers = {
    opensearchDashboardsLegacy: window.opensearchDashboardsLegacy_plugin
};

// Step 7: Setup enhanced __osdBundles__ global interface (compatibility)
// Note: CoreSystem services are directly available in shell, no container needed
window.__osdBundles__ = {
    get: function(bundleName) {
        // Handle plugin bundles
        if (bundleName === 'plugins/opensearchDashboardsLegacy/public') {
            return pluginContainers.opensearchDashboardsLegacy?.get('./Plugin');
        }
        
        return null;
    },
    has: function(bundleName) {
        const supportedBundles = [
            'plugins/opensearchDashboardsLegacy/public'
        ];
        return supportedBundles.includes(bundleName);
    },
    getIds: function() {
        return [
            'plugins/opensearchDashboardsLegacy/public'
        ];
    }
};

console.log('✅ Plugin containers loaded via Module Federation');
```

**Verification Steps**:
1. **OSD Shell Loading**:
   ```
   http://localhost:5602/app
   ```
   - Expected: No "opensearchDashboardsLegacy not found" error

2. **Console Verification**:
   ```javascript
   console.log('Bundles:', window.__osdBundles__.getIds());
   console.log('Has plugin:', window.__osdBundles__.has('plugins/opensearchDashboardsLegacy/public'));
   ```
   - Expected: Plugin bundle listed, has() returns true

3. **Plugin Loading Check**:
   - Browser console should show: `✅ Plugin containers loaded via Module Federation`
   - No federation errors in console

---

### Step 7: Test Complete Plugin Integration

**Verification Steps**:

1. **Plugin Lifecycle Test**:
   ```javascript
   // In browser console
   window.__osdBundles__.get('plugins/opensearchDashboardsLegacy/public')
     .then(module => {
       console.log('Plugin module:', module);
       const plugin = module.plugin();
       console.log('Plugin instance:', plugin);
     });
   ```
   - Expected: Plugin instance with setup/start methods

2. **Plugin Services Test**:
   ```javascript
   // After plugin loads, test services
   // This would be done through OSD's plugin system
   console.log('Testing plugin services...');
   ```
   - Expected: dashboardConfig, loadFontAwesome, config available

3. **Error Handling Test**:
   ```javascript
   // Test graceful failure
   window.__osdBundles__.get('nonexistent/plugin')
   ```
   - Expected: null returned, no errors thrown

---

### Step 8: Final End-to-End Verification

**Complete System Test**:

1. **Clean Build Sequence**:
   ```bash
   # Clean previous builds
   rm -rf poc-microfrontend/dist/
   
   # Full build sequence (3-container Module Federation)
   yarn build:webpack5:shared
   yarn build:webpack5:core
   yarn build:webpack5:plugin:opensearchDashboardsLegacy
   
   # Start server
   yarn dev:microfrontend
   ```

2. **Loading Performance Test**:
   ```bash
   # Measure loading times
   curl -w "%{time_total}\n" -o /dev/null -s http://localhost:5602/app
   ```
   - Expected: Reasonable loading time (< 5 seconds)

3. **Functionality Verification**:
   - Load OSD shell: `http://localhost:5602/app`
   - Verify no plugin errors in console
   - Confirm OSD bootstrap completes
   - Test that plugin services are available

## Success Criteria

### Primary Goals ✅
- [ ] opensearchDashboardsLegacy plugin loads via Module Federation
- [ ] No "plugin not found" errors in browser console
- [ ] OSD shell continues to bootstrap successfully
- [ ] Plugin provides expected services (dashboardConfig, loadFontAwesome, config)

### Secondary Goals ✅  
- [ ] Build process is automated and repeatable
- [ ] Development server serves plugin files correctly
- [ ] Plugin integration follows OSD's standard lifecycle
- [ ] Performance impact is minimal (< 500ms additional load time)

### Technical Validation ✅
- [ ] All verification steps pass without errors
- [ ] Browser console shows successful Module Federation messages
- [ ] Network requests return HTTP 200 for all plugin resources
- [ ] JavaScript execution completes without exceptions

## Troubleshooting Guide

### Common Issues

**Issue**: `ModuleFederationPlugin is not a constructor`
- **Solution**: Ensure `@module-federation/webpack` is installed
- **Command**: `yarn add @module-federation/webpack`

**Issue**: Plugin container not found (`window.opensearchDashboardsLegacy_plugin` undefined)
- **Solution**: Verify remoteEntry.js loads before bootstrap script
- **Check**: Network tab shows successful load of remoteEntry.js

**Issue**: CORS errors when loading plugin files
- **Solution**: Verify development server CORS headers
- **Check**: Response headers include `Access-Control-Allow-Origin: *`

**Issue**: Plugin module import fails
- **Solution**: Check webpack config exposes correct entry point
- **Verify**: Plugin exports match expected interface

### Debug Commands

```bash
# Check if plugin builds correctly
node poc-microfrontend/webpack5-optimizer/build-opensearchDashboardsLegacy.js

# Verify plugin files exist
ls -la poc-microfrontend/dist/plugins/opensearchDashboardsLegacy/

# Test plugin route accessibility  
curl -I http://localhost:5602/plugins/opensearchDashboardsLegacy/remoteEntry.js

# Check webpack bundle analysis
npx webpack-bundle-analyzer poc-microfrontend/dist/plugins/opensearchDashboardsLegacy/
```

## Next Steps

Once opensearchDashboardsLegacy federation is successful:

1. **Extend to More Plugins**:
   - Target plugins with minimal dependencies next
   - Use this as template for plugin federation configs

2. **Optimize Bundle Splitting**:
   - Analyze shared dependencies across plugins
   - Optimize for minimal bundle duplication

3. **Production Readiness**:
   - Add error boundaries for plugin failures
   - Implement plugin lazy loading
   - Add plugin versioning support

4. **Developer Experience**:
   - Create plugin federation generator
   - Add debugging tools for federation issues
   - Document plugin development guidelines

## Implementation Timeline

- **Step 1-2**: Webpack config and build script (~1 hour)
- **Step 3-4**: Server updates and build integration (~30 minutes)  
- **Step 5-6**: Container testing and OSD integration (~1 hour)
- **Step 7-8**: Complete testing and verification (~1 hour)

**Total Estimated Time**: ~3.5 hours with verification steps

---

*This plan provides a comprehensive, step-by-step approach to implementing plugin federation with built-in verification at each stage. Each step builds on the previous one, ensuring we maintain a working system throughout the process.*
