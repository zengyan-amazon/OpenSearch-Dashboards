import { registerPluginBundle } from '../osd_bundles';

const createPlugin = () => {
  return {
    setup() {
      return {
        register: () => {
          /* noop stub */
        },
      };
    },
    start() {
      return {};
    },
    stop() {},
  };
};

export const plugin = createPlugin;

registerPluginBundle('managementOverview', { plugin } as unknown as Record<string, unknown>);

export default plugin;
