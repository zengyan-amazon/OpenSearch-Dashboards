// Individual @elastic/eui expose - returns only ElasticEui from shared bundle
const sharedBundle = require('../../../packages/osd-ui-shared-deps/entry');
module.exports = () => ({ ElasticEui: sharedBundle.ElasticEui });
