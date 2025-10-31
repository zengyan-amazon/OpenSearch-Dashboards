import { registerPluginBundle } from '../osd_bundles';

type Trigger = { id: string };
type Action = { id: string; execute?: (context: unknown) => Promise<void> | void };

const createPlugin = () => {
  const triggers = new Map<string, Trigger>();
  const actions = new Map<string, Action>();
  const triggerToActions = new Map<string, Set<string>>();

  return {
    setup() {
      return {
        registerTrigger: (trigger: Trigger) => {
          triggers.set(trigger.id, trigger);
          if (!triggerToActions.has(trigger.id)) {
            triggerToActions.set(trigger.id, new Set());
          }
        },
        registerAction: (action: Action) => {
          actions.set(action.id, action);
        },
        attachAction: (triggerId: string, actionId: string) => {
          if (!triggerToActions.has(triggerId)) {
            triggerToActions.set(triggerId, new Set());
          }
          triggerToActions.get(triggerId)!.add(actionId);
        },
        addTriggerAction: (triggerId: string, actionId: string) => {
          if (!triggerToActions.has(triggerId)) {
            triggerToActions.set(triggerId, new Set());
          }
          triggerToActions.get(triggerId)!.add(actionId);
        },
        getTrigger: (triggerId: string) => triggers.get(triggerId),
      };
    },
    start() {
      return {
        executeTriggerActions: async (triggerId: string, context: unknown) => {
          const actionIds = triggerToActions.get(triggerId);
          if (!actionIds) {
            return;
          }

          for (const actionId of actionIds) {
            const action = actions.get(actionId);
            if (action?.execute) {
              await action.execute(context);
            }
          }
        },
      };
    },
    stop() {},
  };
};

export const plugin = createPlugin;

registerPluginBundle('uiActions', { plugin } as unknown as Record<string, unknown>);

export default plugin;
