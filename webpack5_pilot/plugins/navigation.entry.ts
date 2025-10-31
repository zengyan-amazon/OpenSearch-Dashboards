import * as navigationModule from '../../src/plugins/navigation/public';
import { registerPluginBundle } from '../osd_bundles';

registerPluginBundle('navigation', navigationModule as unknown as Record<string, unknown>);

export default navigationModule;
