# Task packet: вырезать маршрут /dev_cards_result_preview из стор-сборки (как dev_state)

Governance-ID: TG-78C685834FFE
Governance-ID: TG-2293C2744A1E
Governance-ID: TG-55D5FE66AEFF
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10)

## Outcome

Маршрут app/dev_cards_result_preview.tsx (e96b0d647) не попадает в стор-сборку: router.ctx.js исключает его тем же списком, что
dev_state и dev_spire_preview. Внутри маршрута остаётся вторая защита (ENABLE_DEV_TOOLS && !IS_STORE_RELEASE → Главная).
Сторож — строка в tests/aa_r1_switches_cards_friends.test.ts.

## Scope

In scope: router.ctx.js (одно имя в регэкспе стор-ветки), тест. Out of scope: metro.config.js, гейт заглушек (маршрут — не модуль-заглушка:
его не импортирует боевой код, поэтому store_release_stubs_gate его не касается).

## Architecture

expo-router берёт маршруты через require.context; стор-ветка отрицательным просмотром выкидывает dev-маршруты из графа бандла.

## Security and privacy

Dev-экран без сети физически отсутствует в стор-бандле.

## Technical debt

- Contain: нет.

## Verification

store_route_reachability, spire_dev_preview_release_guard, dev_state_fixtures, store_release_gate_levers, aa_r1_switches_cards_friends.

## Rollback

Откат коммита.
