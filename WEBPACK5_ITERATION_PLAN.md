# Webpack 5 Pilot – Iteration Plan

## Context
- Keep the webpack v4 optimizer untouched while we validate a webpack v5 + Module Federation path.
- Focus on the pilot dev server and build scripts that already live under `scripts/` and `webpack5_pilot/`.
- Prioritise browser runtime feedback so we can see real plugins running before investing in broader tooling.

## Execution Order (Requested: 2 → 3 → 1)
1. **Plugin Runtime Coverage** *(former item #2)*
   - Finish wiring the Home plugin through Module Federation, including any missing start services (saved objects stubs, catalogue data, tutorials, navigation links).
   - Add lightweight fixtures so the Home UI renders deterministically without a backend.
   - Update docs to explain how a plugin opts in and how the pilot dev server loads it.
   - *Success signal:* `yarn start:v5` shows the Home landing experience without runtime errors.
2. **Host/Remote Dev Harness** *(former item #3)*
   - Expose a reusable render helper from the pilot remote so additional MF consumers can mount safely.
   - Extend the dev server to load that helper after the core bootstrap and shared-deps remote resolve.
   - Document how to point future plugin experiments at the helper (manual import or HTML stub).
   - *Success signal:* A second remote (demo or future plugin) can be registered and rendered via the helper with minimal wiring.
3. **Core Bootstrap Hardening** *(former item #1)*
   - Replace temporary shims (`window.process`, stubbed APIs) with structured helpers, and capture any gaps that still require backend integration.
   - Ensure the pilot host respects the same routing, locale, and uiSettings defaults as the production shell.
   - Track remaining parity gaps (i18n loading, nav, capabilities) in the progress log for follow-up.
   - *Success signal:* `yarn build:v5` + `yarn start:v5` run without console warnings, and the bootstrap path matches production ordering.

## Verification Checklist
- Pilot build commands succeed locally (`yarn clean:v5 && yarn build:v5`).
- Dev server renders at least one real plugin (“Home”) and one demo remote without crashing.
- Documentation stays in sync: plan reflects completed steps, and the change log lists every code update tied to the pilot.
