# Task packet: registry — mark states of deleted features removed_by_owner; owner questions file

Governance-ID: TG-5F0EDE5F46E2
Status: In progress
Owner: 3 · МАКЕТЫ session (coordinator decision ~07:00)
Related epic/enabler: re-measure of pending mockup states

## Outcome
visual_parity.json rows whose mockup state belonged to a feature deleted by commit (Founder Pass modal 31c521702; cards zoom ZoomBar 3b60cfdf4) become removed_by_owner with removed_reason; the other 3 deleted files were already removed_by_owner. UX conveniences open questions go to OWNER_QUESTIONS_2026-11-05.md.

## Scope
In scope: 5 registry rows, one questions section. Out of scope: rows whose state still exists in the app (own set/other set, search, empty, deleted-undo) even though their code path lists ZoomBar — flagged, not changed.

## Architecture
No architecture change; registry data only, schema fields already used (status, removed_reason, prev_status).

## Security and privacy
Docs/data only.

## Technical debt
Contain: stale ZoomBar code paths remain in ~16 live rows; Сверка registry-vs-code rebuild will fix; exit: gate run.

## Verification
node scripts/visual_parity_gate.mjs counts total unchanged (1234) and no removed_reason_missing violation; JSON roundtrip identical except patched rows.

## Rollback
git revert of the commit.
