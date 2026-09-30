# Task packet: D70 — удаление жемчуга (shards) из ядра и сервера

Governance-ID: TG-BCCA69A48E84
Status: In progress
Owner: исполнитель D70 (субагент координатора, 2026-09-30)
Related epic/enabler: D70 / D84 / D78 / D85 / D86 / PM-148-A2

## Outcome

Жемчуг (в коде shards/осколки) перестаёт существовать как валюта: нет трат и начислений
вне UI-файлов сессии «Дизайн» и вне read-only истории; локальный остаток обнуляется на
устройстве одной операцией журнала. Мерило — ратчет-проба `tests/d70_pearls_removed.probe.ts`
и инвентаризация `docs/phraseman-2.0/evidence/D70_pearl_removal_inventory.md`.

## Scope

In scope: биржа жемчуга (клиент + сервер), мёртвые серверные модули
(`shards_apply_delta`, `shard_reward_catalog`), клиентская миграция `[PEARL-RETIRE]`
(`app/pearl_retire_d70.ts` + ленивый запуск в `app/_layout.tsx`), тесты и пробы.

Out of scope: UI-файлы «Дизайна» (home, lessons, lesson_menu, components/home|lessons,
NoEnergyModal, SurveyRewardPanel, ReportErrorButton, экраны видео/диалогов); Арена;
dev*Grant; боевая база; деплой; RevenueCat-вебхук (ветка жемчуга — следующий заход);
конвертация admin_grant в монеты (канал доставки серверных монет — вопрос владельцу).

## Architecture

Баланс жемчуга — проекция неизменяемого клиентского журнала. Обнуление — одна дебетовая
операция с детерминированным id по состоянию журнала (ревизия+голова+баланс), идемпотентна;
синхронизируется существующим каналом PhoneState. Исторические открытия уроков
(`lessons_pearl_unlocked_v1`) не трогаются.

## Security and privacy

Новых данных не собирается; Firestore не читается и не пишется миграцией. Удаление
серверных callable уменьшает поверхность атаки. Политика конфиденциальности не меняется.

## Technical debt

- Contain: клиентское ядро shards_system/ledger остаётся, пока UI «Дизайна» его импортирует;
  выход — после снятия импортов из UI-файлов (список в инвентаризации).
- Accept temporarily: RevenueCat-ветка жемчуга, report/broadcast/referral начисления —
  владелец/координатор, следующий заход.

## Verification

Точечные jest по затронутым тестам, пробы server_remote_event_allowlist,
firestore_listener_allowlist, server_decision_atlas_contract, новая d70 проба.

## Rollback

Миграция необратима по смыслу (D70 без компенсации); отключить — убрать эффект в
`_layout.tsx`. Удалённые callable возвращаются из git до деплоя.
