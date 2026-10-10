# Task packet: очередь координатора 23:38/23:50 — сторож маршрутов в предрелизной проверке, «Диалоги», каталог аналитики

Governance-ID: TG-994F6638F6E7
Status: In progress
Owner: 1 · ЯДРО
Related epic/enabler: store-route-reachability-audit (6b9ede64d), [DIALOGS-OPEN] (53a0e6d87, 46838de7c), red-sweep

## Outcome

1. `scripts/store_route_reachability.mjs` запускается в `release:precheck` и на сервере EAS после установки
   (`eas-build-post-install`) — новая ссылка на вырезанный маршрут роняет сборку до магазина.
2. Холодный вход в «Диалоги» без лишних перерисовок по фактам Сверки (cold5a/b): стабильный `onPressItem`, приход
   эквивалентного каталога не перерисовывает хаб, приём каталога из сети не блокирует первые секунды, Главная
   «Диалогов» не перерисовывается без причины. Временная трассировка убрана, логи ранних выходов/catch остаются.
3. `tests/product_analytics_event_catalog.test.ts` зелёный под 2.0 (Арена удалена D83 — её события ушли из каталога).

## Scope

In scope: `package.json` (одна строка post-install — патч от HEAD под замком, чужие строки не трогаем),
`scripts/release_precheck.mjs` (одна запись GATES), `.easignore` (одна строка whitelist);
`components/dialogs/DialogueV2CatalogueContainer.tsx`, `app/ai_dialog_home.tsx`, вызывающие `onPressItem`
(`components/DialogsTabContent.tsx` и т. п.); `tests/product_analytics_event_catalog.test.ts`; сторож стабильности.

Out of scope: регулярка стор-режима, клиент каталога диалогов (сеть, кэш 12 ч), каталог аналитики на сервере.

## Architecture

1 — без изменений архитектуры: ещё один шаг в существующих списках ворот. 2 — без смены границ: мемоизация
колбэков/компонентов и сравнение конверта по выпуску вместо ссылки в существующем эффекте контейнера; приём
сетевого конверта откладывается до конца взаимодействий (InteractionManager/после первого кадра). 3 — каталог
событий: Арена удалена (D83), соответствие запросу склада — по фактическому каталогу.

## Security and privacy

Нет новых данных и сервисов. Аналитика: проверка, что из каталога не ушли поля личности — только удалены события
снятой Арены.

## Technical debt

Pay now: временная трассировка [DIALOGS-OPEN] снимается. Contain: сторож стабильности ссылки `onPressItem`.
Accept temporarily: SQL склада, читающий события Арены, — владелец аналитики (если такой запрос есть).

## Verification

Ворота: прогон `node scripts/store_route_reachability.mjs`, сторож `store_release_gate_levers`. Диалоги: babel,
точечная проверка типов, сторожа диалогов, новый тест стабильности; повтор холодного входа — Сверка.
Аналитика: сторож каталога.

## Rollback

`git revert` каждого коммита отдельно; данных пользователей не касается.
