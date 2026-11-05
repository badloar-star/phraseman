# Task packet: video reward mockup update (70 percent threshold, replay gives no reward)

Governance-ID: TG-10032D85D9CC
Governance-ID: TG-9E39AD799413
Status: In progress
Owner: 3 · МАКЕТЫ (coordinator relay of owner clarification)
Related epic/enabler: MASTER row 35 (Q)

## Outcome
Same Artifact URL updated: progress bar marker at 70 percent with rank coin, hint, reward chip and counter at the moment 70 percent is reached (video keeps playing), states below 70, reached, replay (muted coin with check), story after close/end.

## Scope
Docs/mockup only; no app code.

## Architecture
No architecture change; static mockup on real frames.

## Security and privacy
Test-account frames only; anti-abuse (once per video, server-side) stays an open question.

## Technical debt
Contain: does seeking forward count toward 70 percent (open question).

## Verification
Headless run 0 errors; states viewed by eye; artifact republished to the same URL.

## Rollback
git revert; previous Artifact version stays in history.
