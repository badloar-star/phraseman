# Task packet: «наши старые» красные, мешающие выпуску — оплата, вход, Android-падения

Governance-ID: TG-16008D171220
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: поручение координатора 15.10 — из 15 «наших старых» красных отобрать мешающие выпуску и разобрать `paywall_purchase_activation_contract`, `premium_modal_admin_grant_contract`, `android_clipping_crash_guard`; итог к 08:30

## Outcome

- Два теста оплаты (`paywall_purchase_activation_contract`, `premium_modal_admin_grant_contract`) снова зелёные: после коммита d6e5470c9 («Восстановить покупки» не зависает) инициализация и сверка личности в `handleRestore` идут под потолком `awaitWithinInitCap`, а сторожа ждали прежние строки. Тесты обновлены под новую форму, смысл защиты сохранён (магазин не вызывается без подтверждённой личности, по таймауту — повторная попытка без вызова магазина).
- `android_clipping_crash_guard`: список `FlatList` в `components/learning-v2/horizons/LearningV2Horizons.tsx` без `removeClippedSubviews={false}` (риск падения Android в ReactClippingViewManager) — исправляется добавлением пропса после окна №7 (08:20).

## Scope

In scope: `tests/paywall_purchase_activation_contract.test.ts`, `tests/premium_modal_admin_grant_contract.test.ts`, один пропс в `LearningV2Horizons.tsx` (после 08:20, в окне :00/:30).

Out of scope: сам код оплаты и входа (зона Авторизации), остальные красные — списком в отчёт.

## Architecture

No architecture change.

## Security and privacy

Оплата: тесты по-прежнему требуют, чтобы покупка и восстановление не вызывали магазин без подтверждённой личности; ничего не ослаблено.

## Technical debt

Pay now: два устаревших сторожа и один пропущенный пропс. Остальное — список.

## Verification

`npm run test:one` по слоту: три набора — «N passed».

## Rollback

git revert коммитов.
