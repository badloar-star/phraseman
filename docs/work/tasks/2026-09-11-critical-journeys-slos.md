# Task Packet: Critical Journey Contracts and SLO Baseline

## Scope

- Define Tier 0/Tier 1 user journeys and the evidence fields required before numeric SLO adoption.
- Record proposed targets separately from measured baselines; do not present aspirations as operating data.
- Add a machine gate for owners, success events, latency, error budgets, offline/retry, privacy and runbook links.

## Non-goals

- No instrumentation or production data collection in this packet.
- No SLO alerting, deploy, or owner assignment invented by Codex.

## Technical debt

- Missing telemetry is a visible blocker per journey, with a follow-up packet required before targets become enforced.
- Journey IDs are stable contract keys for future dashboards and incident runbooks.

## Verification

- `node --test scripts/verify_critical_journeys.test.mjs`
- `node scripts/verify_critical_journeys.mjs`

## Evidence

- GREEN: `node scripts/verify_critical_journeys.mjs` → `journeys=8 status=baseline_pending`.
- GREEN: `node --test scripts/verify_critical_journeys.test.mjs` (1/1).
- GREEN: `node --check scripts/verify_critical_journeys.mjs`.

## Status

Contract baseline complete; owner assignment, privacy-reviewed signals, runbooks and measured SLO adoption remain pending.
