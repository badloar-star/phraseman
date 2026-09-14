# Task Packet: Dependency Reachability Evidence

## Scope

- Reproduce root dependency paths for every open critical/high advisory in the dependency register.
- Classify paths as mobile/runtime, server/runtime, build/tooling, or unknown without claiming exploitability.
- Attach the generated evidence to the register and preserve remediation SLAs.

## Non-goals

- No `npm audit fix --force`, major Expo upgrade, native build, deploy, or advisory suppression.
- No claim that a package is safe solely because it is tooling-only; exploitability still needs owner review.

## Security and technical debt

- Unknown paths remain blockers and retain their due dates.
- A fixed version is accepted only through a separate package-change packet with focused regression evidence.

## Verification

- `node scripts/build_dependency_reachability.mjs`
- `node --test scripts/build_dependency_reachability.test.mjs`
- `node scripts/verify_dependency_risk_register.mjs --root . --as-of 2026-09-11`

## Evidence

- GREEN: `node scripts/build_dependency_reachability.mjs` → `packages=45 unknown=0`.
- GREEN: `node --test scripts/build_dependency_reachability.test.mjs` (1/1).
- GREEN: `node scripts/verify_dependency_risk_register.mjs --root . --as-of 2026-09-11`.
- The report remains evidence-only: it does not downgrade severity or close any advisory.

## Status

Reachability evidence complete locally; remediation and owner review remain open.
