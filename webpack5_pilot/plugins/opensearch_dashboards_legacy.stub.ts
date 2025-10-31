import { registerPluginBundle } from '../osd_bundles';

const createPlugin = () => {
  return {
    setup() {
      return {};
    },
    start() {
      return {
        config: {
          defaultAppId: 'home',
        },
      };
    },
    stop() {},
  };
};

export const plugin = createPlugin;

registerPluginBundle('opensearchDashboardsLegacy', { plugin } as unknown as Record<string, unknown>);

export default plugin;
