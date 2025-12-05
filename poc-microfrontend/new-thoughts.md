# OpenSearch Dashboards Webpack 5 + Module Federation Discussion
## 1. Background & Goals

The overall objective is to **upgrade the OpenSearch Dashboards (OSD) browser build from Webpack 4 to Webpack 5**, with a new architecture based on **Module Federation (MF)** to enable:

* Micro-frontend loading for the core application and plugins.
* Deployment of browser assets to a CDN.
* A minimal server that only serves:

  * A shell HTML file,
  * REST/AJAX APIs,
  * and static plugin manifests.
* Shared heavy dependencies (React, RxJS, lodash, EUI, etc.) to be delivered only once and consumed by all micro-frontends.
* Minimize code changes to OSD’s large codebase by maintaining backward compatibility (via global shims such as `window.__osdSharedDeps__`).

This requires rethinking how **shared dependencies**, **core**, and **plugin bundles** are loaded and executed.

---

## 2. Core Challenge

OSD currently:

* Builds **one giant shared dependency bundle** (`osdSharedDeps`) containing React/RxJS/etc.
* Loads this shared bundle in the HTML shell.
* Places shared libs into global variables (e.g., `window.React`, `window.__osdSharedDeps__`).
* Core and plugins import libraries normally (`import React from 'react'`), relying on Webpack externals and globals.

When moving to Module Federation:

* Shared deps must be provided by a **remote MF container**.
* Core and plugins must consume these deps via MF **share scopes**, not from local bundles.
* Legacy compatibility requires preserving `window.__osdSharedDeps__`.
* There must be *one* consistent bootstrap process that loads everything in the right order.

---

## 3. Issues Found in Initial Implementation

### 3.1 Missing MF share-scope initialization

Your HTML bootstrap directly accessed:

```js
sharedContainer.get('./SharedBundle');
coreContainer.get('./CoreServices');
```

But never invoked **required MF initialization**:

```js
await __webpack_init_sharing__('default');
await sharedContainer.init(__webpack_share_scopes__.default);
await coreContainer.init(__webpack_share_scopes__.default);
```

Without this, MF shared libs are not registered and consumers with `import:false` cannot resolve React, RxJS, lodash, etc.

### 3.2 Plugin containers also not initialized

Lazy plugin loading code did:

```js
container.get('./Plugin');
```

…but again did **not**:

```js
await container.init(__webpack_share_scopes__.default);
```

Thus plugins could not consume shared deps properly.

### 3.3 Bootstrap logic spread across HTML

Your HTML shell contained a large inline script:

* CSS injection
* Loading MF remoteEntry scripts
* Polling for containers
* Loading shared bundle
* Creating `__osdSharedDeps__`
* Loading core services
* Managing plugin remotes
* Calling `__osdBootstrap__()`

This is unmaintainable long-term and incompatible with CSP (no inline scripts).

### 3.4 Confusing separation of responsibilities

It was unclear:

* Whether bootstrap should be part of the core bundle,
* Whether bootstrap should be its own MF container,
* Whether it should be built separately.

This created circular dependencies and build/runtime confusion.

---

## 4. Final Recommended Architecture

### 4.1 Use a dedicated **bootstrap5.ts** entry point

Bootstrap5 is the main loader for the browser application:

* Lives inside the **core webpack build**.
* Built as a normal JS bundle: `/core/bootstrap5.js`.
* No need to be its own MF container.
* The HTML shell only loads this one script.

### 4.2 Core Webpack build outputs:

```
/core/bootstrap5.js         ← bootstrap/loader script
/core/remoteEntry.js        ← MF container exposing CoreServices
/core/*.js                  ← other chunks
```

### 4.3 Shared Deps Webpack build outputs:

```
/shared-deps/remoteEntry.js ← MF container providing React/RxJS/etc.
/shared-deps/main.js
/shared-deps/*.css
```

### 4.4 Core MF configuration uses `shared + import:false`

Core and plugins declare:

```js
shared: {
  react: {
    singleton: true,
    requiredVersion: deps.react,
    import: false,               // do not bundle locally
  },
  'react-dom': { singleton: true, requiredVersion: deps['react-dom'], import: false },
  ...
}
```

This forces consumption from the MF share scope.

### 4.5 Shared Deps MF configuration defines shared libs (provider)

Shared deps build uses:

```js
shared: {
  react: { singleton: true, eager: true, requiredVersion: deps.react },
  ...
}
```

**Important:** The shared deps build does *not* use `import:false`.

### 4.6 bootstrap5.js performs all runtime orchestration

bootstrap5:

1. Loads `/shared-deps/remoteEntry.js`

2. Calls:

   ```ts
   await __webpack_init_sharing__('default');
   await shared_deps.init(__webpack_share_scopes__.default);
   ```

3. Builds global compatibility shim:

   ```ts
   window.__osdSharedDeps__ = sharedBundle;
   window.React = sharedBundle.React;
   window._ = sharedBundle.Lodash;
   // etc.
   ```

4. Dynamically imports:

   ```ts
   const { __osdBootstrap__ } = await import('./osd_bootstrap');
   await __osdBootstrap__();
   ```

5. (Optional) Sets up `__osdBundles__` for lazy plugin loading

6. Replaces the legacy inline bootstrap.js functionality.

### 4.7 Shell HTML becomes extremely simple

```html
<script>
  window.__OSD_ASSETS_BASE_URL__ = '';       // CDN or base path
  window.__OSD_SHARED_DEPS_URL__ = '/shared-deps/remoteEntry.js';
</script>
<script src="/core/bootstrap5.js"></script>
```

No inline MF logic — CSP-friendly and clean.

---

## 5. Benefits of the Final Design

### ✔ Full compatibility with existing OSD code

Because:

* Core/plugins import libs normally (`import React from 'react'`)
* Legacy global APIs still exist (`window.__osdSharedDeps__`)

### ✔ Clean, maintainable MF initialization

bootstrap5 handles:

* MF share-scope,
* loading remote containers,
* global shims,
* plugin lazy-loading,
* calling `__osdBootstrap__()`.

### ✔ Browser app is fully CDN-deployable

The server now only needs to serve:

* `/core/bootstrap5.js`
* `/shared-deps/remoteEntry.js`
* plugin remoteEntry files
* static metadata and translations

### ✔ CSP compliant (no inline scripts required)

bootstrap5 is a static JS file, not inline HTML.

### ✔ Future-proof micro-frontend foundation

Plugins can be upgraded to MF at any time without changing bootstrap5.

---

# Final Diagram

```
             ┌──────────────────────┐
             │      HTML Shell      │
             │ (only loads 1 script)│
             │  bootstrap5.js       │
             └──────────┬───────────┘
                        │
                        ▼
              bootstrap5.js (core build)
        ┌─────────────────────────────────────────┐
        │ - load shared-deps/remoteEntry.js       │
        │ - __webpack_init_sharing__              │
        │ - shared_deps.init(share_scope)         │
        │ - build window.__osdSharedDeps__ shim   │
        │ - dynamically import __osdBootstrap__   │
        │ - optional plugin loader (__osdBundles__) │
        └────────────────────┬────────────────────┘
                             │
                             ▼
        ┌─────────────────────────────────────────┐
        │   shared_deps (MF container provider)   │
        │   provides React, RxJS, lodash, etc.    │
        └─────────────────────────────────────────┘
                             │
                             ▼
        ┌─────────────────────────────────────────┐
        │     core_services (MF container)        │
        │ exposes: CoreServices, Http, etc.       │
        │ consumes shared deps via share scope    │
        └─────────────────────────────────────────┘
                             │
                             ▼
        ┌─────────────────────────────────────────┐
        │  Plugins (MF containers, on demand)     │
        │  join share scope                       │
        │  consume shared deps + core services    │
        └─────────────────────────────────────────┘
```
