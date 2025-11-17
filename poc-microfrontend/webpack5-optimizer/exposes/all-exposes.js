// All individual dependency exposes for pure Module Federation approach
const sharedBundle = require('../../../packages/osd-ui-shared-deps/entry');

// ReactDOM expose
exports.ReactDOM = () => ({ ReactDOM: sharedBundle.ReactDom });

// Moment expose  
exports.Moment = () => ({ Moment: sharedBundle.Moment });

// RxJS expose
exports.RxJS = () => ({ RxJS: sharedBundle.Rxjs });

// OSD I18n expose
exports.OsdI18n = () => ({ OsdI18n: sharedBundle.OsdI18n });

// OSD Monaco expose
exports.OsdMonaco = () => ({ OsdMonaco: sharedBundle.OsdMonaco });
