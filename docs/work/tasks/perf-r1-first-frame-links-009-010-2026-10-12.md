# Task packet: ссылки profile-009/010 (robot_no_cloud) и аудит первого кадра R1

Governance-ID: TG-2780F1EF08D4
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10, вечер)
Related epic/enabler: docs/work/tasks/perf-first-frame-audit-2026-10-12.md

## Outcome

Ссылки profile-009/010 дополнены robot_no_cloud=1 (без дубля шагов), DEV_LINKS_R1 перегенерирован. Документ R1_PERF_FIRST_FRAME.md по Главной, списку Уроков и хабу Карточек; дешёвые правки S — сразу с тестом.

## Scope

In scope: scripts/dev_links_r1_steps_links3.py и design3, DEV_LINKS_R1.md, чтение кода трёх экранов, журнал [PERF-R1], тесты, документ.
Out of scope: замеры на эмуляторе самостоятельно (очередь Сверки), серверная часть.

## Architecture

Архитектура не меняется.

## Security and privacy

Данных не касается: robot_no_cloud=1 — только память, без записи в облако.

## Technical debt

Pay now: дублирование определений ссылок; дешёвые утечки скорости.

## Verification

dev_links_r1_contract, parity_batch_shoot_dry_run; для скорости — perf_freeze/layout_stability и профильные тесты.

## Rollback

Откат коммитов.
