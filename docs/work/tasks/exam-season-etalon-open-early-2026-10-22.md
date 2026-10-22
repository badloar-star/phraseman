# Task packet: chapter exam in the Season etalon can be taken before the episodes end (owner decision №10)

Governance-ID: TG-B3C692A461F7
Status: Done
Owner: 3 · МАКЕТЫ (coordinator 22.10)
Related epic/enabler: chapter-exam-season.html (locked 21.10), chapter-exam-flow.html (owner decision №10), approved-2026-10-21.lock.json

## Outcome

In chapter-exam-season.html the chapter exam card is no longer drawn as locked at 3 of 8 episodes: like chapter-exam-flow.html it can be taken before the episodes end, with the line «Сдашь — откроется глава N». The lock hash is recomputed on the owner's word and the change is recorded in the lock journal. The Home 1:1 table records the chip glass 14 % as the coordinator's contrast decision.

## Scope

In scope: docs/design/v2-app/chapter-exam-season.html, APPROVED_2026-10-21_LOCKED.md, approved-2026-10-21.lock.json, docs/work/tasks/home-1to1-2026-10-22.md.
Out of scope: application code (the Season screen belongs to 2 · ДИЗАЙН), chapter-exam-flow.html (already the reference).

## Architecture

No architecture change: a static mockup page and its hash lock.

## Security and privacy

No data, permissions or services: design reference pages only.

## Technical debt

- Pay now: the Season etalon and the exam flow etalon agree on early exam access.

## Verification

Headless capture of the changed exam card; lock test tests/approved_2026_10_21_locked.test.mjs green after the recompute; only the edited page changes hash.

## Result

Found: at 3 of 8 the exam card was already drawn as available (trophy seal, «можно сдать заранее», «Сдать экзамен», the zoomed card
says «Сдашь от 10 из 12, и откроется глава 3»). Missing versus chapter-exam-flow.html was only the note under the button. The shown
caption (state «Экзамен доступен») now reads «Сдашь — откроется глава 3 · 12 вопросов, сдать от 10» — one line at 390 dp (headless
capture). The unused h2Exam builder already had «Сдашь, и откроется глава 3» and is untouched. Lock recomputed: only
chapter-exam-season.html changed hash; tests/approved_2026_10_21_locked.test.mjs 9/9. Journal entry added.

## Rollback

Revert the commit; the lock returns to the previous hash together with the page.
