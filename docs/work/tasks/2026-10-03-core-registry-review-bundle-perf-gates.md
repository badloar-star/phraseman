# Task packet: registry revision of planned PM tasks, release-bundle measurement (PM-216), regression performance gates (PM-220)

Governance-ID: TG-42CD7A0AFFED
Status: Done
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-03, after the server-noise deploy)
Related epic/enabler: E21 performance (PM-216, PM-220), registry hygiene (E24 PM-252 process)

## Outcome

1. Registry: the 67 planned tasks in docs/phraseman-2.0/registries/tasks.json are checked against commits, tests and decisions. Only tasks whose every acceptance criterion has evidence move to review (never done — a reviewer does that). The rest stay planned with an honest note about what is missing. A "moved / why not" list goes to the INBOX.
2. PM-216: the release bundle is measured before/after on both platforms (JS hermes bytes, gzip, assets). Unreachable code is removed only where it really affects the bundle; the report states plainly what is bundled and what is not.
3. PM-220: executable regression gates for [COLD-START-IO], [HOME-PAINT] and bundle size, with budgets in config/perf-budgets.json derived from measurements (Q111: local release build, 2 cores / 2 GB), plus a unit test of the tool.

## Scope

In scope: docs/phraseman-2.0/registries/tasks.json and worklog.jsonl via tools/mark.py (+ render_views/validate), docs/phraseman-2.0/INBOX_COORDINATOR_FROM_CORE.md, scripts/pm220_perf_gates.mjs, config/perf-budgets.json, tests/pm220_perf_gate_tools.test.mjs, docs/phraseman-2.0/docs/RUNTIME.md and evidence notes, bundle measurement on throwaway copies of a commit (git archive, outside the repo).
Out of scope: marking anything done, device measurements on physical phones, deleting design-session screens, App Check/Account V2 zone files, deploy.

## Architecture

The gate tool is a pure module (parse + evaluate functions) with a thin CLI; budgets live in data, not in code. Bundle numbers come from the existing summarizeExport of PM-216. No change to the app runtime, only measurement and verification.

## Security and privacy

No new data collected. Logs parsed locally from adb output; nothing is sent anywhere. Throwaway export copies stay in the session scratch folder and are deleted afterwards.

## Technical debt

- Pay now: budgets are real numbers instead of null; the gate cannot silently pass (exit 2 when data is missing).
- Contain: cold-start I/O budget is a CEILING from the pre-fix measurement and must be tightened after a post-fix release measurement (owner of the emulator slot).

## Verification

Unit test with synthetic logcat lines and bundle summaries (budget hit and miss); static assertion that the [COLD-START-IO] summary and [HOME-PAINT] first_frame emit points and the babel keep-warn rule still exist; the probe tests/pm220_performance_gates.probe.ts stays green; registry tools validate.py passes; before/after bundle report attached.

## Rollback

git revert the commits; the registry change is a pure status/evidence edit.
