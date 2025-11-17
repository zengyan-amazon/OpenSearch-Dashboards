// Individual Lodash expose - returns only Lodash from shared bundle
const sharedBundle = require('../../../packages/osd-ui-shared-deps/entry');
module.exports = () => ({ Lodash: sharedBundle.Lodash });
