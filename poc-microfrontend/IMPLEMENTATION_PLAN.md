# OpenSearch Dashboards Microfrontend POC - Implementation Plan

**Goal**: Complete a working proof-of-concept demonstrating OpenSearch Dashboards running as a microfrontend architecture using Webpack 5 + Module Federation.

**Success Criteria**: Entire OSD application loads and functions via Module Federation, matching the behavior of the existing webpack 4 build.

---

## 🎯 Phase 1: Fix Foundation (CURRENT - Week 1)

### Task 1.1: Fix Shared Dependencies Module Federation ⭐ CRITICAL

**Problem**: Shared deps not exposing modules via Module Federation

**Solution**: Update `poc-microfrontend/webpack5-optimizer/src/shared-deps-config.js`

**Implementation**:

```javascript
// Add exposes section to ModuleFederationPlugin
new ModuleFederationPlugin({
  name: 'shared_deps',
  filename: 'remoteEntry.js',
  
  // Expose all shared dependencies
  exposes: {
    // React ecosystem
    './react': 'react',
    './react-dom': 'react-dom',
    './react-dom/server': 'react-dom/server',
    './react-router': 'react-router',
    './react-router-dom': 'react-router-dom',
    './styled-components': 'styled-components',
    
    // Elastic ecosystem
    './@elastic/eui': '@elastic/eui',
    './@elastic/charts': '@elastic/charts',
    './@elastic/numeral': '@elastic/numeral',
    
    // Utilities
    './lodash': 'lodash',
    './lodash/fp': 'lodash/fp',
    './moment': 'moment',
    './moment-timezone': 'moment-timezone',
    './rxjs': 'rxjs',
    './rxjs/operators': 'rxjs/operators',
    './jquery': 'jquery',
    
    // OSD packages
    './@osd/i18n': '@osd/i18n',
    './@osd/i18n/react': '@osd/i18n/react',
    './@osd/monaco': '@osd/monaco',
    './tslib': 'tslib',
    
    // Polyfills
    './core-js': 'core-js',
    './regenerator-runtime': 'regenerator-runtime',
    './whatwg-fetch': 'whatwg-fetch',
    './symbol-observable': 'symbol-observable',
  },
  
  shared: {
    // Keep existing shared configuration
    'react': { singleton: true, eager: true },
    'react-dom': { singleton: true, eager: true },
    // ... rest of shared config
  },
})
```

**Verification Steps**:
1. Rebuild: `yarn build:webpack5:shared:dev`
2. Check output: `ls -lh poc-microfrontend/dist/shared-deps/remoteEntry.js`
3. Expected: remoteEntry.js exists (~20-50KB)
4. Test in browser: `window.shared_deps.get('./react')`

**Success Criteria**:
- ✅ remoteEntry.js created
- ✅ Can load React via Module Federation
- ✅ No build errors

---

### Task 1.2: Verify Core Consumes Shared Dependencies

**Problem**: Core bundles duplicate dependencies

**Solution**: Ensure core's Module Federation config properly references shared_deps

**Verification**:
1. Rebuild core: `yarn build:webpack5:core:dev`
2. Check for vendors: `ls poc-microfrontend/dist/core/vendors-* | wc -l`
3. Expected: 0 or minimal (only core-specific deps like @osd/std, classnames)

**If Still Duplicating**:
- Check `remotes` configuration in core-system.js
- Verify shared_deps remoteEntry.js is accessible
- Check browser console for Module Federation errors

**Success Criteria**:
- ✅ No React/EUI/lodash vendor bundles in core
- ✅ Core bundle size reduced significantly
- ✅ Core can load shared dependencies at runtime

---

### Task 1.3: Test Module Federation Loading

**Goal**: Verify all containers load and communicate

**Test Script** (create as `poc-microfrontend/dev-server/src/test-mf-loading.html`):

```html
<!DOCTYPE html>
<html>
<head>
    <title>Module Federation Loading Test</title>
</head>
<body>
    <h1>Module Federation Loading Test</h1>
    <div id="results"></div>
    
    <!-- Load all remoteEntry files -->
    <script src="/shared-deps/remoteEntry.js"></script>
    <script src="/core/remoteEntry.js"></script>
    <script src="/plugins/opensearchDashboardsLegacy/remoteEntry.js"></script>
    
    <script>
        async function testModuleFederation() {
            const results = document.getElementById('results');
            
            // Test 1: Containers exist
            console.log('=== Test 1: Container Existence ===');
            const containers = {
                'shared_deps': window.shared_deps,
                'core_services': window.core_services,
                'opensearchDashboardsLegacy_plugin': window.opensearchDashboardsLegacy_plugin
            };
            
            for (const [name, container] of Object.entries(containers)) {
                if (container) {
                    results.innerHTML += `<p>✅ ${name} container exists</p>`;
                    console.log(`✅ ${name}:`, container);
                } else {
                    results.innerHTML += `<p>❌ ${name} container missing</p>`;
                    console.error(`❌ ${name} not found`);
                }
            }
            
            // Test 2: Load React from shared deps
            console.log('=== Test 2: Load React ===');
            try {
                const reactModule = await window.shared_deps.get('./react');
                const React = reactModule();
                results.innerHTML += `<p>✅ React loaded: ${React.version}</p>`;
                console.log('✅ React:', React);
            } catch (error) {
                results.innerHTML += `<p>❌ React load failed: ${error.message}</p>`;
                console.error('❌ React error:', error);
            }
            
            // Test 3: Load Core Services
            console.log('=== Test 3: Load Core Services ===');
            try {
                const coreModule = await window.core_services.get('./CoreServices');
                const core = coreModule();
                results.innerHTML += `<p>✅ Core services loaded</p>`;
                console.log('✅ Core:', core);
            } catch (error) {
                results.innerHTML += `<p>❌ Core load failed: ${error.message}</p>`;
                console.error('❌ Core error:', error);
            }
            
            // Test 4: Load Plugin
            console.log('=== Test 4: Load Plugin ===');
            try {
                const pluginModule = await window.opensearchDashboardsLegacy_plugin.get('./Plugin');
                const plugin = pluginModule();
                results.innerHTML += `<p>✅ Plugin loaded</p>`;
                console.log('✅ Plugin:', plugin);
            } catch (error) {
                results.innerHTML += `<p>❌ Plugin load failed: ${error.message}</p>`;
                console.error('❌ Plugin error:', error);
            }
            
            // Test 5: Verify singleton React
            console.log('=== Test 5: Singleton Verification ===');
            try {
                const react1 = await window.shared_deps.get('./react');
                const react2 = await window.core_services.get('react'); // If core exposes it
                if (react1 === react2) {
                    results.innerHTML += `<p>✅ React is singleton (same instance)</p>`;
                    console.log('✅ React singleton verified');
                } else {
                    results.innerHTML += `<p>⚠️ React instances differ (check config)</p>`;
                    console.warn('⚠️ React not singleton');
                }
            } catch (error) {
                results.innerHTML += `<p>ℹ️ Singleton test skipped: ${error.message}</p>`;
            }
        }
        
        window.addEventListener('load', testModuleFederation);
    </script>
</body>
</html>
```

**Test URL**: http://localhost:5605/test-mf-loading.html

**Success Criteria**:
- ✅ All 3 containers exist
- ✅ React loads from shared_deps
- ✅ Core services load
- ✅ Plugin loads
- ✅ React is singleton

---

## 🎯 Phase 2: OSD Shell Integration (Week 2)

### Task 2.1: Update OSD Shell HTML

**Goal**: Make the shell properly load and initialize all containers

**File**: `poc-microfrontend/dev-server/src/osd-shell.html`

**Updates Needed**:
1. Load remoteEntry files in correct order
2. Initialize Module Federation containers
3. Create compatibility bridges (window.__osdSharedDeps__, window.__osdBundles__)
4. Bootstrap OSD application

**Implementation**:

```html
<!-- Load Module Federation containers -->
<script src="/shared-deps/remoteEntry.js"></script>
<script src="/core/remoteEntry.js"></script>
<script src="/plugins/opensearchDashboardsLegacy/remoteEntry.js"></script>

<script>
async function bootstrapOSD() {
    console.log('🚀 Starting OSD Bootstrap via Module Federation...');
    
    // Step 1: Initialize containers
    await window.shared_deps.init(__webpack_share_scopes__.default);
    await window.core_services.init(__webpack_share_scopes__.default);
    await window.opensearchDashboardsLegacy_plugin.init(__webpack_share_scopes__.default);
    
    // Step 2: Create compatibility bridge for existing code
    window.__osdSharedDeps__ = {};
    
    // Load all shared deps and expose via traditional global
    const deps = [
        'react', 'react-dom', '@elastic/eui', 'lodash', 
        'moment', 'rxjs', '@osd/i18n', '@osd/monaco'
    ];
    
    for (const dep of deps) {
        const module = await window.shared_deps.get(`./${dep}`);
        const key = dep.replace(/[@\/]/g, '_').replace(/-/g, '_');
        window.__osdSharedDeps__[key] = module();
    }
    
    // Step 3: Load core services
    const coreModule = await window.core_services.get('./CoreServices');
    const core = coreModule();
    
    // Step 4: Create bundle interface for plugins
    window.__osdBundles__ = {
        get: async function(bundleName) {
            if (bundleName === 'plugins/opensearchDashboardsLegacy/public') {
                return await window.opensearchDashboardsLegacy_plugin.get('./Plugin');
            }
            return null;
        },
        has: function(bundleName) {
            return bundleName === 'plugins/opensearchDashboardsLegacy/public';
        },
        getIds: function() {
            return ['plugins/opensearchDashboardsLegacy/public'];
        }
    };
    
    // Step 5: Bootstrap OSD
    console.log('✅ Module Federation setup complete');
    console.log('✅ Starting OSD application...');
    
    // Initialize OSD core
    await core.bootstrap();
    
    console.log('🎉 OSD Application bootstrapped via Module Federation!');
}

window.addEventListener('load', bootstrapOSD);
</script>
```

**Success Criteria**:
- ✅ No console errors
- ✅ "OSD Application bootstrapped" message appears
- ✅ Core services initialize
- ✅ Plugin system starts

---

### Task 2.2: Test Plugin Loading

**Goal**: Verify plugin loads and initializes correctly

**Test Steps**:
1. Open http://localhost:5605/app
2. Check browser console for plugin loading messages
3. Verify plugin setup() and start() methods are called
4. Check for any errors

**Expected Console Output**:
```
🚀 Starting OSD Bootstrap via Module Federation...
✅ Container shared_deps ready
✅ Container core_services ready
✅ Container opensearchDashboardsLegacy_plugin ready
✅ Module Federation setup complete
✅ Starting OSD application...
✅ Core services initialized
✅ Loading plugin: opensearchDashboardsLegacy
✅ Plugin setup complete
✅ Plugin start complete
🎉 OSD Application bootstrapped via Module Federation!
```

**Success Criteria**:
- ✅ Plugin loads without errors
- ✅ Plugin lifecycle methods execute
- ✅ Plugin services available

---

## 🎯 Phase 3: Validation & Optimization (Week 3)

### Task 3.1: Performance Benchmarking

**Metrics to Collect**:

1. **Build Performance**:
   ```bash
   time yarn build:webpack5:shared:dev
   time yarn build:webpack5:core:dev
   time yarn build:webpack5:plugin:opensearchDashboardsLegacy
   ```

2. **Bundle Sizes**:
   ```bash
   du -sh poc-microfrontend/dist/shared-deps/
   du -sh poc-microfrontend/dist/core/
   du -sh poc-microfrontend/dist/plugins/
   ```

3. **Runtime Performance**:
   - Initial load time (Performance API)
   - Time to interactive
   - Memory usage (Chrome DevTools)
   - Number of HTTP requests

**Comparison**: Document webpack 4 vs webpack 5 + MF

---

### Task 3.2: Add Second Plugin

**Goal**: Validate pattern works for multiple plugins

**Target**: opensearchDashboardsUtils (zero dependencies)

**Steps**:
1. Copy plugin config template
2. Update for opensearchDashboardsUtils
3. Build: `yarn build:webpack5:plugin:opensearchDashboardsUtils`
4. Update shell HTML to include both plugins
5. Test both plugins load together

**Success Criteria**:
- ✅ Both plugins load
- ✅ No conflicts
- ✅ Shared dependencies still singleton

---

### Task 3.3: Documentation

**Documents to Create**:

1. **ARCHITECTURE.md**: Detailed architecture explanation
2. **DEVELOPER_GUIDE.md**: How to create federated plugins
3. **PERFORMANCE_REPORT.md**: Benchmarking results
4. **MIGRATION_GUIDE.md**: Path to production (if recommended)

---

## 🎯 Phase 4: Production Readiness (Week 4)

### Task 4.1: Production Builds

**Goal**: Create optimized production builds

**Changes**:
- Remove source maps
- Enable minification
- Enable compression (gzip/brotli)
- Optimize chunk splitting

**Commands**:
```bash
yarn build:webpack5:shared      # Production mode
yarn build:webpack5:core
yarn build:webpack5:plugin:opensearchDashboardsLegacy
```

**Target Sizes**:
- Shared deps: < 5MB (compressed)
- Core: < 500KB (compressed)
- Plugin: < 100KB (compressed)

---

### Task 4.2: Error Handling

**Implement**:
- Error boundaries for plugin failures
- Graceful degradation
- Retry logic for failed loads
- User-friendly error messages

---

### Task 4.3: Testing Suite

**Create**:
- Unit tests for Module Federation loading
- Integration tests for plugin lifecycle
- E2E tests for full application
- Performance regression tests

---

## 📊 Success Metrics

### Technical Metrics
- [ ] Build time < 60s (all components)
- [ ] Initial load time < 3s
- [ ] Bundle size reduction > 20%
- [ ] Memory usage increase < 10%
- [ ] Zero duplicate dependencies

### Functional Metrics
- [ ] All plugins load successfully
- [ ] No console errors
- [ ] Full OSD functionality works
- [ ] Theme switching works
- [ ] i18n works across boundaries

### Developer Experience
- [ ] Clear documentation
- [ ] Easy plugin creation
- [ ] Good debugging experience
- [ ] Fast rebuild times

---

## 🚧 Known Challenges

### Challenge 1: Complex Plugin Dependencies
**Issue**: Some plugins have circular dependencies
**Mitigation**: Careful dependency graph analysis, lazy loading

### Challenge 2: Legacy Code Compatibility
**Issue**: Existing code expects traditional globals
**Mitigation**: Compatibility bridges (window.__osdSharedDeps__, etc.)

### Challenge 3: Build Complexity
**Issue**: Managing multiple webpack configs
**Mitigation**: Shared configuration utilities, clear documentation

### Challenge 4: Performance Overhead
**Issue**: Module Federation has runtime overhead
**Mitigation**: Careful chunk optimization, caching strategies

---

## 📅 Timeline

**Week 1**: Fix foundation (Tasks 1.1-1.3)
**Week 2**: OSD shell integration (Tasks 2.1-2.2)
**Week 3**: Validation & optimization (Tasks 3.1-3.3)
**Week 4**: Production readiness (Tasks 4.1-4.3)

**Total**: 4 weeks to complete POC

---

## 🎯 Decision Points

### After Week 1
**Question**: Is Module Federation working correctly?
- **Yes**: Proceed to Week 2
- **No**: Debug and fix foundation issues

### After Week 2
**Question**: Does OSD shell work with federated plugins?
- **Yes**: Proceed to Week 3
- **No**: Revisit integration approach

### After Week 3
**Question**: Are performance metrics acceptable?
- **Yes**: Proceed to Week 4
- **No**: Optimize or reconsider approach

### After Week 4
**Question**: Should OSD adopt this architecture?
- **Yes**: Plan full migration
- **No**: Document findings and archive POC

---

**Current Status**: Week 1, Task 1.1 (Fix Shared Dependencies)
**Next Action**: Update shared-deps-config.js to expose modules via Module Federation
