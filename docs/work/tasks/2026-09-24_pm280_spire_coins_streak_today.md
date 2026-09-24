# Task packet: PM-280 — монеты Шпиля, день серии и задача «Сегодня»

Governance-ID: TG-985F9DD39A9C
Governance-ID: TG-6296CF6D64EB
(второй ID выдан хуком посреди работы: состояние хука общее на сессию, его перевооружил параллельный субагент)
Status: Review
Owner: Claude Opus 5.5 (сессия «Башня», субагент PM-280)
Related epic/enabler: E25 (Шпиль), PM-276 (О-276-1), PM-259 (D49 «Сегодня»), PM-069 (руны → монеты)

## Outcome

Игрок Шпиля получает монеты по T35 (ступень 10, этаж 10×N, Страж ×2, вершина +200,
место недели 300/200/150, повышение +100) ровно один раз за каждый факт; пройденная
ступень засчитывает день серии; «Пройди N ступеней» есть в пуле типов задач «Сегодня».
Мера успеха: повтор пачки отчётов, ретрай транзакции и ретрай недельного крона не дают
второй выплаты (расписка журнала `already_applied`).

## Scope

In scope:
- `functions/src/stars_ledger.ts` — две новые причины: `spire_step` (earn), `spire_week_reward` (grant).
- `functions/src/spire_coins.ts` (+ тест) — чистый расчёт операций журнала.
- `functions/src/spire_progress.ts` — монеты за новые ступени в той же транзакции, что счётчик ступеней.
- `functions/src/spire_week_payout.ts`, `functions/src/spire_finalize_cron.ts` — выплата за место/повышение (О-276-1), `rewardStatus: pending_wallet → paid`, `retryCount: 3`.
- `app/spire_report_client.ts` — день серии за пройденную ступень (T38).
- `components/home/v2/home_v2_types.ts`, `HomeV2TodayCard.tsx` — тип задачи `spire_steps`.

Out of scope: хук `useTodayTasks` и выдача монет за задачи «Сегодня» (PM-259); экран Шпиля
и показ итога недели (PM-279); миграция рун в монеты (PM-069); файлы лиги.

## Architecture

Единственный писатель баланса — `stars_ledger.ts`; Шпиль платит через него
(`prepareStarOperations`/`commitStarOperations`), своего кошелька нет. Ключ операции —
`spire_step:{lang}_{week}_s{n}`, `spire_floor:{lang}_{week}_f{f}`, `spire_summit:{lang}_{week}`,
`spire_week:{lang}_{weekId}`: только из оплачиваемого факта, без времени и суммы.
Шаг: чтения (user, leaderboard, room, расписки) → записи одним `set` users/{uid}
(stars + progress.spire_week_v1) + расписки + строка комнаты. Крон: итоги → flush →
выплаты (транзакция на игрока) → `finalizedAt`; сбой выплаты → комната не отмечена,
прогон бросает ошибку, Cloud Scheduler повторяет.

## Security and privacy

Сумма считается на сервере из `config/spire_v1`, клиент её не присылает. Идентичность —
существующий `resolveStableUidForAuth`. Новых персональных данных нет; расписки журнала
уже существуют (TTL 400 дней). App Check не трогается (запломбирован). Privacy Policy —
без изменений (та же валюта, те же поля).

## Technical debt

- Accept temporarily: пропуск выплаты недели для аккаунта в переезде после 3 ретраев
  остаётся `pending_wallet` без автоматического дожима. Owner: PM-281/владелец, пересмотр
  при включении Шпиля. Потолок — единичные аккаунты, видны в логе `[SPIRE-PAYOUT]`.
- Contain: испорченный баланс (`star_ledger_inconsistent`) не блокирует синхронизацию
  ступеней, монеты этой пачки не пишутся — лог `coins_ledger_failed` с диапазоном.

## Verification

- Ручная сверка сигнатур журнала и транзакций (jest/проверка типов по заданию не запускались).
- Сторож `functions/src/spire_coins.test.ts`: границы этажей, 135 ступеней вершины, сумма
  недели 1350+1500+200, ключ не зависит от разбиения на пачки, повтор недели байт в байт.
- Evidence: `docs/phraseman-2.0/evidence/PM-280_coins_and_streak.md`.

## Rollback

Выключить Шпиль в админке (`config/spire_v1.enabled=false`) — отчёты и выплаты
прекращаются. Код: откат коммита; уже выданные монеты остаются у игроков (расписки
неизменяемы), повторной выдачи после возврата кода не будет — ключи те же.
