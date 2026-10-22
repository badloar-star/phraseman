# Task packet: approved etalons follow the owner's streak chip decision (no "Сегодня ещё нет" caption)

Governance-ID: TG-961117FDB709
Status: Done
Owner: 3 · МАКЕТЫ (coordinator 22.10)
Related epic/enabler: code commit 6fdcd15dd (streak chip without the pending caption); approved etalons lock approved-2026-10-21.lock.json

## Outcome

The four locked etalons that draw the Home header streak chip (home-new-concepts.html section A, home-scene-states.html, today-scene-concepts.html, peak-scene-v2.html) show the chip caption "Серия" always; a day not yet counted is shown only by the empty flame, exactly like the app after 6fdcd15dd. The lock hashes are recomputed on the owner's word and the change is recorded in the lock journal.

## Scope

In scope: the four etalon pages above, APPROVED_2026-10-21_LOCKED.md journal, approved-2026-10-21.lock.json.

Out of scope: application code (already done in 6fdcd15dd), the unapproved variant B card in home-new-concepts.html and the older concept pages (history), screen-reader texts.

## Architecture

No architecture change: static mockup pages and their hash lock.

## Security and privacy

No user data, permissions, services or network: design reference pages only.

## Technical debt

- Pay now: etalons and code agree on the streak chip again.

## Verification

Lock test tests/approved_2026_10_21_locked.test.mjs green after the recompute; only the four edited pages changed hash; no "Сегодня ещё нет" left in the chip code of the four pages.

## Rollback

Revert the commit; the lock returns to the previous hashes together with the pages.
