# Task packet: Peak B — full discrepancy list vs approved mockup (P1 red), owner lock

Governance-ID: TG-E85F6D15A20F
Status: In progress
Owner: 3 · МАКЕТЫ session (coordinator urgent request ~06:10)
Related epic/enabler: owner words on TestFlight 149 screens: "Макеты как были одобрены!", "цифры этажей слева — убрать"

## Outcome
PEAK_B_DISCREPANCIES_2026-11-05.md lists every difference between approved mockup B (+ "Все участники") and app frames, with owner session; Peak marked P1 red in MASTER_TASKS and signoff table; owner's words recorded in OWNER_LOCKS.

## Scope
In scope: docs only. Out of scope: app code (Дизайн/Моменты), registry rows (Peak B has no registry id; tracked in MASTER_TASKS row 25).

## Architecture
No architecture change.

## Security and privacy
Docs only.

## Technical debt
Contain: guard test for the lock must be created by the code owner in the same commit as the fix (OWNER_LOCKS rule 1/5); exit: row updated with test path.

## Verification
Each discrepancy cites mockup file and app frame; mockup = docs/work/mockups/peak-variants-2026-11-04/variant_B_graphite_dark.png and variant_A_all.png; app = frames_2026-11-05/peak-b-dark__default.png (01:01), peak-all__default.png, e2e_pre/peak-b_live_counter_0174c4989_OK.png. Owner's TestFlight screens were NOT available to me.

## Rollback
git revert of docs commit.
