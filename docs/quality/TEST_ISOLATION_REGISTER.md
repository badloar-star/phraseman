# Test isolation register

Status: baseline only. No Jest configuration or parallelism has been changed.

| Pack | Scope | Baseline artifact | Isolation change | Peak memory | Global/module mutation | Next decision |
|---|---|---|---|---|---|---|
| Auth identity | `functions/src/auth_identity.test.ts`, account identity contracts | `.codex-tmp/platform-trust/auth-jest-metrics.json` | none | unmeasured unless runner emits it | unmeasured | compare serial old/new only after a scoped packet |

Metrics are sanitized and ignored. A future isolation proposal must preserve deterministic results in serial old/new runs and include a rollback path. This register does not imply that the full repository suite is isolated or fast.
