# Task packet: other TestFlight-visible screens vs approved mockups

Governance-ID: TG-E85F6D15A20F
Status: In progress
Owner: 3 · МАКЕТЫ session
Related epic/enabler: coordinator point 4 of the urgent Peak request (Главная, Урок, Сообщество, пейвол by visibility)

## Outcome
SCREENS_VS_APPROVED_2026-11-05.md: per screen (Главная, Урок, Сообщество, пейвол) discrepancies with approved mockups, or an explicit "no reference / no frame" with who must provide it.

## Scope
Docs only; no app code; no registry edits.

## Architecture
No architecture change.

## Security and privacy
Docs only.

## Technical debt
Accept temporarily: Урок and пейвол have no tracked reference in the repo (Codex approved-rev8 files are outside git) — owner: Сверка/координатор, exit: files provided.

## Verification
Home compared by eye: golden/rendered/home-free-0_light.png vs frames_2026-11-05/home-r0-free__default.png.

## Rollback
git revert.
