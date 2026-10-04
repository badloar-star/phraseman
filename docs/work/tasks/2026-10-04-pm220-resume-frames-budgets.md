# Task packet: PM-220 — numeric budgets for cold/warm start, re-entry and frame timing

Governance-ID: TG-2500740B58E1
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: PM-220 regression performance gates (A2: start, resume, navigation, scroll measured, not only average FPS)

## Outcome

config/perf-budgets.json gains measured budgets for the cold start (am start -W), the warm start, the re-entry from background and frame timing during scrolling, taken from the 2026-10-04 weak-profile baseline (INBOX 141, evidence PM-010). The storage-call ceiling is lowered from 520 to a value that fits the measured 122-159 calls so a return to the old numbers is caught. scripts/pm220_perf_gates.mjs gets two commands that evaluate these budgets and tests cover them.

## Scope

In scope: config/perf-budgets.json, scripts/pm220_perf_gates.mjs, tests/pm220_perf_gate_tools.test.mjs.
Out of scope: config/performance-gates.json thresholds (its probe requires a two-device baseline with an iPhone, which does not exist), navigation and training scenarios without a measurement method.

## Architecture

Same pattern as the existing home-paint and cold-IO budgets: a pure parser, a pure evaluator returning ok and problems, a command that exits 0, 1 or 2.

## Security and privacy

The tool reads only local measurement logs on the developer machine and reports numbers; no user data, network access or secrets are involved.

## Technical debt

- Contain: budgets come from one emulator weak profile (decision Q111); the real low-end phone and iPhone baseline stays an owner step.

## Verification

Node test suite for the tool and the PM-220 probe pass; the tool run against the saved measurement logs reports OK.

## Rollback

Revert the commit.
