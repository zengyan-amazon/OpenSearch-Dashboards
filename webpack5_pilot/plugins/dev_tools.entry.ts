import * as devToolsModule from '../../src/plugins/dev_tools/public';
import { registerPluginBundle } from '../osd_bundles';

registerPluginBundle('devTools', devToolsModule as unknown as Record<string, unknown>);

export default devToolsModule;
