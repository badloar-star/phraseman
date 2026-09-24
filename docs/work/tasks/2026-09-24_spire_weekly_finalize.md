# Task packet: недельный итог Шпиля (PM-276)

Governance-ID: TG-38C55BA3DEA5
Status: Review
Owner: Claude Opus 5.5 (сессия «Башня», субагент)
Related epic/enabler: E25, PM-276

## Outcome
Каждый понедельник комнаты Шпиля прошлой недели подводят итог: место по пройденным ступеням (ничья — кто раньше добрался, затем меньшее время), повышение/понижение только живых (D59: зона от комнаты с ботами, ранги среди живых), переход в соседний шпиль, сумма монет за 1/2/3 место и за повышение. Игрок видит итог фактом при первом заходе (экран — PM-279).

## Scope
In scope: `functions/src/spire_finalize_core.ts` (+ тест), `functions/src/spire_finalize_cron.ts`, экспорт в `functions/src/index.ts`, `firestore.rules` (`users/{uid}/spire_week_results`), `functions/src/admin_diagnostics_overview.ts` (недельный крон), D59 в `spireLiveZoneSize` (оба зеркала + тест), документы 2.0.
Out of scope: файлы лиги (`league_finalize_cron.ts`, `app/league_engine.ts`) — не трогаются; начисление монет в кошелёк (PM-280/PM-069); перенос мест лиги (PM-278); экран и клиентское зеркало итога (PM-279); пуши (PM-281).

## Architecture
Отдельный недельный крон по коллекции `spire_groups` (PM-277), чистая функция итога комнаты, та же функция зон и та же формула ботов, что на экране. Итог — `users/{uid}/spire_week_results/{weekId}_{lang}`; новый шпиль — `leaderboard/{uid}.spireTiers.{lang}` (читает `spireJoinRoom`). Идемпотентность — `spire_groups/{id}.finalizedAt`.

## Security and privacy
Новых персональных данных нет: место, ступени, шпиль. Писать итог может только сервер (правило `allow write: if false`), читать — владелец. App Check не трогается.

## Technical debt
Accept temporarily: монеты посчитаны, но не выплачены — владелец PM-280, выход — выплата по id документа итога. Contain: сторож `spire_finalize_core.test.ts`.

## Verification
Точечно: `npm run test:one -- functions/src/spire_finalize_core.test.ts` и `functions/src/spire_residents.test.ts`, `tests/spire_residents_mirror_contract.test.ts`; проверка типов functions/. В этой сессии НЕ прогонялось (щадящий режим). Evidence: `docs/phraseman-2.0/evidence/PM-276_weekly_finalize.md`.

## Rollback
Снять экспорт `spireFinalizeCron` из `functions/src/index.ts` и задеплоить: крон удаляется, уже записанные итоги остаются (данные игрока не теряются). D59 откатывается одной функцией `spireLiveZoneSize` в обоих зеркалах.
