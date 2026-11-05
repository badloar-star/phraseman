# Task packet: re-measure 765 pending mockup states (priority, frames order, dead paths, UX-list)

Governance-ID: TG-A3E5E18392E5
Status: In progress
Owner: 3 · МАКЕТЫ session
Related epic/enabler: coordinator request after matrix 25e3155ff

## Outcome
(1) priority order of 765 pending states; (2) docs/work/release/FRAMES_ORDER_2026-11-05.md — order for Сверка/Эмулятор for the first ~150 states with route/steps/sizes/themes; (3) explanation of 27 registry code paths missing on HEAD; (4) accepted/not-accepted list for ux-conveniences/ux-delight reconstructed from history. Success: coordinator can hand frames order to 6/7 and one question to the owner.

## Scope
In scope: new docs under docs/work/release/ and docs/work/tasks/, read-only scripts. Out of scope: app code; editing visual_parity.json by hand (verdicts go there only with evidence via the existing build script — proposed to Сверка).

## Architecture
No architecture change. Registry remains the source of truth; I only read it.

## Security and privacy
Docs only; no secrets, no personal data.

## Technical debt
Contain: registry verdict write is left to the gate's own tooling (evidence hash rules) — owner Сверка; exit: frames delivered and gate re-run.

## Verification
Counts equal registry (765 pending); each dead path backed by git log delete/rename evidence; ux list items cite source file/commit.

## Rollback
Delete generated docs; nothing else changed.
