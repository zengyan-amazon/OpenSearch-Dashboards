import * as consoleModule from '../../src/plugins/console/public';
import { registerPluginBundle } from '../osd_bundles';

registerPluginBundle('console', consoleModule as unknown as Record<string, unknown>);

export default consoleModule;
