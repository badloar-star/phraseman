# Task packet: 7 красных тестов зоны Дизайна (перепрогон Ядра 12.10 вечер)

Governance-ID: TG-3DAF03697072
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по сообщению Ядра (RED_TESTS_HEAD_2026-10-12.md)
Related epic/enabler: docs/phraseman-2.0/RED_TESTS_HEAD_2026-10-12.md

## Outcome

Каждый из 7 красных тестов разобран: либо код вернулся к контракту (регрессия), либо контракт обновлён там, где экран осознанно изменён. По каждому — причина и решение.

## Scope

In scope: tests/flashcards_blitz_access_behavior.test.ts, scroll_inertia_contract, ai_dialog_home_compact_header_contract.mjs, paywall_store_promo_price_contract, premium_modal_locale, premium_modal_admin_grant_contract, support_report_liquid_glass_source_contract.mjs и код, который они сторожат.
Out of scope: покупки/RevenueCat по существу (меняется только то, что доказано регрессией).

## Architecture

Архитектура не меняется.

## Security and privacy

Платёжный путь (initRevenueCat, цены) трогаю только возвратом утерянного вызова; данных пользователя не касается.

## Technical debt

Pay now: красные сторожа скрывают реальные регрессии.

## Verification

test:one по каждому файлу, срез типов по тронутым файлам.

## Rollback

Откат коммитов.
