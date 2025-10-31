import { registerPluginBundle } from '../osd_bundles';

const createPlugin = () => {
  return {
    setup() {
      return {
        forwardApp: () => {
          /* noop stub */
        },
      };
    },
    start() {
      return {
        navigateToDefaultApp: () => {
          /* noop stub */
        },
        navigateToLegacyOpenSearchDashboardsUrl: () => ({ navigated: false }),
        getForwards: () => [],
      };
    },
    stop() {},
  };
};

export const plugin = createPlugin;

registerPluginBundle('urlForwarding', { plugin } as unknown as Record<string, unknown>);

export default plugin;
