# Task packet: inlineRequires default off, stale energy contract, test files the runner never executes

Governance-ID: TG-DBB73599072D
Governance-ID: TG-866AE88CC658
Governance-ID: TG-9BE2F9210F0D
Status: Done
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-03)
Related epic/enabler: startup safety (inlineRequires rollback), test infrastructure hygiene (a dead guard is worse than no guard)

## Outcome

1. inlineRequires is OFF by default again (opt-in with PHRASEMAN_INLINE_REQUIRES=1) because of an unexplained Fabric addViewAt crash pair seen only with it on; the early imports in index.js stay.
2. The energy start-confirmation contract stops reading the deleted app/personal_plan_exercise.tsx: the stale part goes with a `// зачем:` note, the live part keeps guarding what still exists.
3. Every test-like .tsx file is either picked up by the runner (and fixed if red) or deleted with a recorded reason; a guard fails when a test-like file is outside every runner.

## Scope

In scope: the bundler config switch, tests/energy_start_confirmation_contract*, tests/fc_blitz_attempts_integration.tsx, tests/fc_speaking_attempts_integration.tsx, runner patterns (package.json test block, the rntl config), a scan and a guard test.
Out of scope: product code, Account V2 zone, design-session screens.

## Architecture

The runner configuration is the single source of what runs. A small contract test enumerates test-like files and asserts each matches at least one runner pattern or sits on an explicit, reasoned allow-list for manual probes.

## Security and privacy

Test and build-config only. No data, no permissions.

## Technical debt

- Pay now: guards that silently never run.
- Contain: files that never ran may be red; fix when cheap, otherwise delete with the reason (git keeps history).

## Verification

Scan before/after; previously unrun files executed once and the result recorded; new contract test green; the stale energy contract green; config diff is the single inverted flag.

## Rollback

git revert.
