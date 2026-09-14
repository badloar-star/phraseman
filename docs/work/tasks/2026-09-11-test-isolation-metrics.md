# Task packet: Test isolation metrics

Governance-ID: MANUAL-2026-09-11-TEST-ISOLATION-METRICS  
Status: Complete baseline / no isolation change  
Owner: Codex session requested by product owner  
Related epic/enabler: E3 / EN-3.2

## Outcome

Create a deterministic normalizer for Jest JSON results and record one bounded auth-domain baseline before proposing any isolation change.

## Scope

In scope: `scripts/test_suite_metrics.mjs`, `docs/quality/TEST_ISOLATION_REGISTER.md`, focused test, and one ignored auth baseline artifact. Out of scope: changing Jest config, parallelism, test behavior, global mocks, or running the whole repository suite.

## Architecture

Jest remains the execution authority. The normalizer converts its JSON result into suite duration, test counts, retry indicators, memory fields when available, and an explicit `isolationChange: none` baseline. Metrics are evidence, not permission to alter test configuration.

## Security and privacy

Store only test paths, timings, counts and sanitized failure metadata; do not persist environment variables, tokens, user records or full logs. Artifacts remain in ignored `.codex-tmp`.

## Technical debt

Pay now: test coupling and resource cost are not measured consistently. Contain: baseline one stable auth pack before changes. Accept temporarily: module/global mutation and peak memory remain `unmeasured` unless the runner emits them; no guessed values.

## Verification

Completed with 2/2 focused normalizer tests. The selected Functions auth pack ran serially with 105/105 tests passing; normalized baseline is in ignored `.codex-tmp/platform-trust/auth-jest-metrics.json` (1 suite, 4,826 ms, peak memory/global mutation unmeasured). No Jest config, isolation or parallelism changed.

## Rollback

Remove the normalizer, register and ignored baseline. No test configuration or product runtime state changes.
