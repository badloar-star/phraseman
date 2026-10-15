# Карточка «Продолжить» V2: вид «готовим», пока занятие готовится (Ревизор по R09, 🟡; просьба Моментов 15.10)

Governance-ID: TG-88B9E65C8D56

## Outcome
Подготовка занятия V2 из карточки «Продолжить» идёт до 12 с без реакции. Карточка показывает занятость: приглушение 0.72 и accessibilityState.busy; тапы во время подготовки уже гасит запуск.

## Scope
`app/(tabs)/home.tsx` (хук useHomeContinueV2Launching, проп busy), `components/home/v2/HomeV2ContinueCard.tsx` (проп busy, стиль), тест `home_continue_busy_contract`.

## Architecture
Состояние запуска живёт в `app/learning_v2_home_continue_route.ts` (useSyncExternalStore, две перерисовки на запуск). Карточка не меняет геометрию — это не скелет pending.

## Security and privacy
Данные не затрагиваются.

## Technical debt
Нет.

## Verification
Юнит-тест по исходникам; кадр «карточка приглушена» — Макеты.

## Rollback
Откат коммита.
