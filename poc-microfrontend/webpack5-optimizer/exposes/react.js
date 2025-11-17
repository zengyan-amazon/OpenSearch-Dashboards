// Individual React expose - returns only React from shared bundle
const sharedBundle = require('../../../packages/osd-ui-shared-deps/entry');
module.exports = () => ({ React: sharedBundle.React });
