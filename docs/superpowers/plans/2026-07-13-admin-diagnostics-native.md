# Admin v2 native diagnostics implementation plan

1. Add red contracts for server projection, RBAC/masking, filters/caps, App Health status preview/apply, legacy cutover, static changelog integrity, v2 wiring, and 39/20 migration totals.
2. Implement `functions/src/admin_diagnostics.ts` and focused unit/transaction tests; export only the three targeted callables.
3. Add diagnostics state/view/controller modules and callable wrappers; wire capability selection into the existing diagnostics route without changing the overview panels.
4. Extract the exact 8 June archive into a static same-origin page and add responsive, accessible diagnostics styles.
5. Install the legacy redirect/read-only archive guard for App Health, Archive, and the static changelog.
6. Update capability status and migration documentation, then run focused root tests, focused Functions tests, TypeScript, diff checks, and local Admin v2 smoke.
7. Submit the final diff and evidence to the advisor. Apply any required changes until `DECISION: APPROVED`.
8. Deploy only the three diagnostics callables and Admin Hosting. Run live smoke, static asset checks, and unauthenticated callable probes.

The package is complete only when production verification passes and the worktree is clean. The global admin-migration goal remains active because 20 fallback capabilities will still remain.
