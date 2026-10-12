# Task packet: ссылки Шпиля на данных образца — «Гранит · этаж 4» вместо «Нефрит · этаж 7»

Governance-ID: TG-1CD026DCB8EB
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (просьба Ядра по поручению координатора; Макеты d39cb4db3; подмена tier/floor — Темы f8c38da27, a2827054b)

## Outcome

Строки, где в кадре видны лига или этаж, открывают превью Шпиля с `tier=0&floor=4` (Гранит, этаж 4 — как в образцах):
spire-006, spire-016, spire-017, spire-008, spire-009 (`exit=1&tier=0&floor=4`), spire-010, spire-012, spire-013, spire-gap-001…014,
spire-gap-019, spire-gap-020, spire-gap-022. spire-gap-017 («спускаешься») — по образцу spire-gaps-states.html №17: «спускаешься в Гранит,
27 место · 5 ступеней, новая неделя с 1 этажа» → `tier=0&floor=1&steps=5`. spire-004 / spire-005 / spire-gap-016 в модуле есть (вопрос Ядра снят).

## Scope

In scope: scripts/dev_links_r1_steps_spire.py, scripts/dev_links_r1_steps_dialogs3.py (spire-gap-022), перегенерация DEV_LINKS_R1.
Out of scope: подмена превью (Темы), строки «остаёшься»/«поднимаешься» без просьбы.

## Architecture

Второй аргумент preview(state, extra); маршрут /dev_spire_preview — только моки в памяти, нет в стор-сборке.

## Security and privacy

Firestore не трогается (сторож spire_dev_preview_release_guard).

## Technical debt

- Contain: нет.

## Verification

Генератор; дифф DEV_LINKS_R1 только по строкам Шпиля; prod_write_guard.

## Rollback

Откат коммита.
