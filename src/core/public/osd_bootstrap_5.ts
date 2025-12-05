// Type declarations for webpack's MF runtime and globals
declare global {
  interface Window {
    __OSD_SHARED_DEPS_URL__?: string;
    shared_deps?: any;         // MF container for shared deps
    __osdSharedDeps__?: any;   // legacy shim for OSD
  }

  // Injected by webpack runtime
  // eslint-disable-next-line no-var
  var __webpack_init_sharing__: (scope: string) => Promise<void>;
  // eslint-disable-next-line no-var
  var __webpack_share_scopes__: Record<string, any>;
}

async function loadSharedDepsRemote(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const url = window.__OSD_SHARED_DEPS_URL__;
    if (!url) {
      reject(new Error('__OSD_SHARED_DEPS_URL__ is not set'));
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.type = 'text/javascript';
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error(`Failed to load shared_deps remote from ${url}`));

    document.head.appendChild(script);
  });
}

async function initShareScopeAndContainer(): Promise<any> {
  // 1) Init global share scope
  await __webpack_init_sharing__('default');

  // 2) Get the MF container instance
  const container = window.shared_deps;
  if (!container) {
    throw new Error('shared_deps container not found on window');
  }

  // 3) Register its shared modules into the share scope
  await container.init(__webpack_share_scopes__.default);

  return container;
}

// Optional: build legacy global shim from SharedBundle exports
async function initGlobalShim(container: any): Promise<void> {
  const factory = await container.get('./SharedBundle');
  const exportsObj = factory() as {
    Jquery: any;
    OsdI18n: any;
    OsdI18nReact: any;
    Moment: any;
    MomentTimezone: any;
    OsdMonaco: any;
    MonacoBarePluginApi: any;
    React: any;
    ReactDom: any;
    ReactDomServer: any;
    ReactRouter: any;
    ReactRouterDom: any;
    StyledComponents: any;
    Rxjs: any;
    RxjsOperators: any;
    ElasticNumeral: any;
    ElasticCharts: any;
    ElasticEui: any;
    ElasticEuiLibServices: any;
    ElasticEuiLibServicesFormat: any;
    ElasticEuiChartsTheme: any;
    Theme: any;
    Lodash: any;
    LodashFp: any;
    TsLib: any;
  };

  // Shim object for OSD
  window.__osdSharedDeps__ = {
    Jquery: exportsObj.Jquery,
    OsdI18n: exportsObj.OsdI18n,
    OsdI18nReact: exportsObj.OsdI18nReact,
    Moment: exportsObj.Moment,
    MomentTimezone: exportsObj.MomentTimezone,
    OsdMonaco: exportsObj.OsdMonaco,
    MonacoBarePluginApi: exportsObj.MonacoBarePluginApi,
    React: exportsObj.React,
    ReactDOM: exportsObj.ReactDom,
    ReactDOMServer: exportsObj.ReactDomServer,
    ReactRouter: exportsObj.ReactRouter,
    ReactRouterDom: exportsObj.ReactRouterDom,
    StyledComponents: exportsObj.StyledComponents,
    Rxjs: exportsObj.Rxjs,
    RxjsOperators: exportsObj.RxjsOperators,
    ElasticNumeral: exportsObj.ElasticNumeral,
    ElasticCharts: exportsObj.ElasticCharts,
    ElasticEui: exportsObj.ElasticEui,
    ElasticEuiLibServices: exportsObj.ElasticEuiLibServices,
    ElasticEuiLibServicesFormat: exportsObj.ElasticEuiLibServicesFormat,
    ElasticEuiChartsTheme: exportsObj.ElasticEuiChartsTheme,
    Theme: exportsObj.Theme,
    Lodash: exportsObj.Lodash,
    LodashFp: exportsObj.LodashFp,
    TsLib: exportsObj.TsLib,
  };

  // Optional legacy aliases for really old code
  (window as any).React = exportsObj.React;
  (window as any).ReactDOM = exportsObj.ReactDom;
  (window as any)._ = exportsObj.Lodash;
  (window as any).Rx = exportsObj.Rxjs;
  // jQuery globals (entry.js already sets $. / jQuery, but we can be explicit)
  (window as any).$ = exportsObj.Jquery;
  (window as any).jQuery = exportsObj.Jquery;
}

async function bootstrapCore() {
  try {
    // 1) Load shared_deps remote (remoteEntry)
    await loadSharedDepsRemote();

    // 2) Initialize MF sharing and shared_deps container
    const container = await initShareScopeAndContainer();

    // 3) Optional: setup global shim for legacy code
    await initGlobalShim(container);

    // 4) Now that share scope is ready, dynamically import the real core entry
    await import('./index'); // your existing src/core/public/index.ts
  } catch (e) {
    // Consider a nicer UX here
    console.error('Failed to bootstrap core with shared deps', e);
  }
}

bootstrapCore();
