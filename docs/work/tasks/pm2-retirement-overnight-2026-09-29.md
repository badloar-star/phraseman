# Task packet: PhraseMan 2.0 — довести retirement XP/лиг/Season Pass/MAX до проверенного состояния

Governance-ID: TG-D10EF08A31EE
Status: In progress
Owner: Claude session (продолжение handover Codex 2026-09-29)
Related epic/enabler: E05, E07, E17, E21, E22, E25 (docs/phraseman-2.0/registries)

## Outcome

Владелец спит и просит закрыть цель PhraseMan 2.0 к утру. Наблюдаемый результат: в рабочем дереве нет активных путей XP / лиг / Season Pass / MAX-клиента; все source-пробы и точечные Jest-тесты по retirement зелёные с реальными числами; PROGRESS.md содержит только фактические результаты; итоговый аудит честно перечисляет, что закрыто и что нет (planned/review/device/E2E). Успех = проверяемые команды, а не заявление «готово».

## Scope

In scope: `tests/*retire*`/`*probe*`, активные ссылки на XP/league/season в app/ и functions/src, точечные Jest-тесты, `docs/phraseman-2.0/PROGRESS.md`, `registries/tasks.json` (только там, где есть команда-доказательство).

Out of scope: deploy, production-миграции, удаление облачных данных, платные API, новая Главная, coin-rank ассеты, approved Free/Plus лимиты, полный сюит, device/E2E, задачи needs_decision (фиксируются как blocker).

## Architecture

Граница сервера не меняется: подписки/контент/уведомления/sync/покупки. Legacy compatibility parsing и account-delete cleanup сохраняются. Инвариант: старые пути fail-closed, а не «тихо работают». Архитектурных решений не принимается; спорное — advisor (Opus) и запись в PROGRESS как blocker.

## Security and privacy

Новых данных/разрешений/сервисов нет. Удаляемое не расширяет доступ. App Check не трогать (запломбирован). MAX пломба не снимается. Privacy: сбор данных не добавляется.

## Technical debt

Contain: stale-тесты под удалённые модули (admin_league_controls и др.) помечаются NOT_RUN/blocked в PROGRESS с владельцем «следующая сессия», не удаляются молча. Пробы, молчащие при успехе — Contain (добавить PASS-строку при касании).

## Verification

`npm run test:one -- <файл>` точечно (со слотом светофора), `npx tsx tests/<probe>.ts`, `git diff --check`. Каждый PASS = фактическая команда. Пересчёт registry после правок. Итоговый requirement-by-requirement аудит.

## Rollback

Правки локальные и не закоммичены; откат — обратная правка конкретного файла (без reset/checkout). Данные пользователей не затрагиваются.
