# Task packet: PM-278 — перенос 12 ступеней лиги в 12 шпилей-камней

Governance-ID: TG-38C55BA3DEA5
Governance-ID: TG-FB222BC83FF6
Status: In progress
Owner: Claude Opus 5.5 (субагент сессии «Башня»)
Related epic/enabler: E25 (Шпиль), PM-278, зависит от PM-277

## Outcome

При первом входе в Шпиль место человека в лиге (leagueId 0–11) переносится в
шпиль языка, который он учит сейчас, по прямому индексу (Медная=0 → Гранит=0 …
Высшая=11 → Алмаз=11). Остальные изучаемые языки — Гранит. Имена 12 камней есть
во всех 9 локалях интерфейса. Есть выключатель и откат (по одному человеку и
массово, с dryRun). Успех: тест чистой логики зелёный, миграцию на проде НЕ
запускаем (только код).

## Scope

In scope: functions/src/spire_league_migration_contract.ts (чистая логика),
functions/src/spire_league_migration.ts (транзакция), вызов из spireJoinRoom
(functions/src/spire_groups.ts), admin callables выключателя/отката
(functions/src/admin_spire_league_migration.ts), экспорт в functions/src/index.ts,
правило-запрет для новой коллекции в firestore.rules, имена камней
modules/spire/tier_names.ts, тесты, evidence и реестры docs/phraseman-2.0.

Out of scope: app/league_engine.ts (только чтение), экран Шпиля (PM-279),
клиентская передача currentStudyTarget в spireJoinRoom (PM-279), кнопки в
админке admin/v2/legacy.html (файл правит другая сессия), удаление Лиги.

## Architecture

Миграция ленивая: при первом spireJoinRoom, до подбора комнаты. Одна транзакция
читает leaderboard, users (progress.league_state_v3), league_week_results
прошлой недели, резервную копию и выключатель; пишет leaderboard.spireTiers +
leaderboard.spireMigration (отметка) и spire_league_migration/{uid} (полная копия
«как было»). Инвариант: поля и коллекции лиги не меняются (аддитивно). Уже
записанный шпиль не перезаписывается. Если итог прошлой недели лиги ещё
считается — отказ league_finalization_pending, как у лиги.

## Security and privacy

Запись только сервером. Резервная копия содержит сырой league_state_v3 — закрыта
от клиентов (новая коллекция, allow false). В leaderboard (читают все вошедшие)
пишутся только цифры (язык, tier, источник). Админ-функции — claim admin +
application.config.write, аудит в admin_log. App Check не используется (пломба).
Новых персональных данных не собирается — privacy policy не затронута.

## Technical debt

- Contain: язык «сейчас» известен только клиенту; до PM-279 сервер берёт язык
  комнаты (currentLangSource='room_lang' в копии) — видно в каждой записи.
- Accept temporarily: кнопок в админке нет, callables доступны; владелец —
  сессия «Башня», подключить в PM-283/PM-279.

## Verification

functions/src/spire_league_migration_contract.test.ts и tests/spire_tier_names.test.ts
(прогон — по светофору, в этой задаче jest/typecheck не запускаются по условию);
ручная сверка типов; python tools/validate.py для реестров.

## Rollback

config/spire_league_migration_v1 {mode:'paused'} останавливает перенос (вход в
Шпиль честно отказывает). adminSpireLeagueMigrationRollback снимает шпили по
копии (по языкам, не стирая изменённое итогами недели). Лига не тронута —
возвращаться в неё нечего восстанавливать. Код можно откатить git revert без
потери данных пользователей.
