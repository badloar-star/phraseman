# Task packet: dev_state `onboarding=done` закрывает уже открытый онбординг (EN_EXTRA2, en-home-001 / paywalls-023)

Governance-ID: TG-35918FA1A83C
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10 ~05:12)

## Outcome

Журнал paywalls-023 04:58: dev_state применился полностью (`onboarding=done`, `next=/manage_subscription`), но на кадре — шаг
онбординга «Your data stays yours», открытый предыдущей строкой onboarding-007 (`onbstep=privacy` → `dev_onboarding_restart` →
`setShow(true)` в app/_layout.tsx, состояние в памяти). Ветка `onboarding=done` писала только ключи хранилища и оверлей не закрывала —
без force-stop между строками онбординг переживал следующую ссылку. Теперь `onboarding=done` шлёт `dev_onboarding_done`, корневой макет
закрывает оверлей онбординга, лог `[DEV-STATE] onboarding overlay` с прежним значением видимости.

## Scope

In scope: app/events.ts (тип события), app/dev_state_fixtures.ts (только своя строка; там чужие незакоммиченные правки inbox/reminderTime —
коммит своим хунком), app/_layout.tsx (обработчик). Out of scope: боевой онбординг (событие шлёт только dev_state; в сторе dev_state нет).

## Architecture

Зеркально `dev_onboarding_restart`: событие → setShow(false) + сброс флага пейвола онбординга.

## Security and privacy

Только dev-путь; данных не касается.

## Technical debt

- Contain: нет.

## Verification

Контракт-тест: done-ветка шлёт событие, макет закрывает оверлей; тесты dev_state; перегон EN_EXTRA2 (Сверка).

## Rollback

git revert коммита.
