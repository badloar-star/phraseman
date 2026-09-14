# Task Packet: Admin Command Registry

## Scope

- Inventory callable references from the single live admin surface `admin/v2/legacy.html`.
- Cross-check names against exported Functions source text where possible.
- Emit a registry whose safety fields are explicit and remain `blocked` until proven by source/tests.

## Non-goals

- No admin UI edits, callable behavior changes, App Check changes, IAM changes, or deploy.
- No inference that a name implies authorization, idempotency, auditability, rollback, or confirmation.

## Security/privacy/debt

- Registry is read-only evidence for future decomposition; missing proof is a blocker.
- Keep the registry generated and rerunnable so new admin commands cannot disappear silently.
- Sensitive commands require a separately reviewed packet before extraction.

## Verification

- `node --test tests/admin_command_registry_contract.test.mjs`
- `node scripts/build_admin_command_registry.mjs`
- `node --check scripts/build_admin_command_registry.mjs`

## Evidence

- RED captured before implementation: generator and registry artifact were absent.
- GREEN: `node scripts/build_admin_command_registry.mjs` → `commands=82`.
- GREEN: `node --check scripts/build_admin_command_registry.mjs`.
- GREEN: `node --test tests/admin_command_registry_contract.test.mjs` (2/2).
- The cross-codebase inventory now matches all 82 callable names against the configured Functions source roots; this proves presence only, not safety.

The registry deliberately marks all safety fields as blocked until evidence is linked; it does not infer guarantees from callable names.

## Status

Local inventory complete; operational review and any mutation changes remain deferred.
