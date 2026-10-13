# Task packet: образцы пейвола под код по ответам Ядра (paywalls-011, paywall-gap-004), учёт исправлений Ядра в разборе

Governance-ID: TG-B2C98C5363B7
Status: In progress
Owner: сессия «3 · Макеты»
Related epic/enabler: MACETS_DIFF_TRIAGE_R1_2026-10-13.md, ответ Ядра 13.10

## Outcome

1. paywall-price-states №1 (загрузка условий): «Восстановить» активна, как в коде (R1_PAYWALL_UX, 303ec6392).
2. Пейвол-лента пробного периода (paywall-gap-004): выбранный план — приподнят тенью без мятной заливки и кромки (стиль «Тень», 4edcf536c); строка «🎁 3 дня бесплатно» не срезается доком.
3. Разбор: paywalls-013, learn-014, spire-gap-001 — исправлено Ядром (пересъёмка); paywalls-011, paywall-gap-004 — образец к коду; spire-gap-021 — снимать Free-аккаунтом.

## Scope

In scope: docs/design/v2-app/paywall-price-states.html, docs/design/v2-app/paywall-gaps-states.html (только кадры этих строк), registries/visual_parity.json (строки по id), MACETS_DIFF_TRIAGE_R1_2026-10-13.md.

Out of scope: код.

## Architecture

No architecture change: образцы, реестр, документация.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: стиль выбранной карточки в остальных кадрах пейвола — проверить по мере сверки.

## Verification

Кадры сняты playwright и проверены глазами; число строк реестра прежнее.

## Rollback

Откат коммита.
