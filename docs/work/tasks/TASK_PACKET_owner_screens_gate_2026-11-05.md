# Task packet: owner TestFlight screens (Friends, Sets, Cards) diffs, release gate table, visual-only registry

Governance-ID: TG-09378EB8B491
Status: In progress
Owner: 3 · МАКЕТЫ session (coordinator: release gate, owner word "1 в 1, проверены перед релизом")
Related epic/enabler: owner screens in docs/work/release/owner_screens_2026-11-05/

## Outcome
(1) Diffs for owner screens 06-09 vs approved mockups sent to executors; (2) RELEASE_GATE_SCREENS table: screen -> reference -> executor -> status -> frame "after"; (3) visual_parity.json: no "match" without a looked-at composite in frames_2026-11-05 (honest count "visually confirmed N of 1201").

## Scope
Docs and registry data only. No app code.

## Architecture
No architecture change; registry statuses only (status/prev_status).

## Security and privacy
Docs only; owner screens contain a friend code and avatar names from a test account — already in repo by coordinator commit 3accd1637.

## Technical debt
Contain: executors own file split (Дизайн: Главная/Уроки/Карточки/Настройки/Статистика; Темы: Сообщество/пейвол/Друзья; Моменты: Пик).

## Verification
Mockup renders copied to owner_screens_2026-11-05/ref_*.png; diffs cite owner screen number and mockup phone; counts computed by script.

## Rollback
git revert.
