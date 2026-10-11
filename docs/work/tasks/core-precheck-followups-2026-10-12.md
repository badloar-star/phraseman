# Task packet: хвосты release:precheck — сторож классификации, «Утром решить», 🟡 Шпиля

Governance-ID: TG-6E64942F3FAD
Previous-Governance-ID: TG-E4F380695F2B
Previous-Governance-ID: TG-3698EA6BB282
Previous-Governance-ID: TG-37A3E6009C45
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10 после 22767e6f4).

## Outcome
1. `tests/release_precheck_learning_v2_failure_classification.test.mjs` красный не по делу: во временной копии нет
   заглушки гейта `store_route_reachability.mjs` (появился 10.10) → «гейтов — 2» вместо 1. Добавить заглушку.
2. В `docs/phraseman-2.0/RELEASE_PRECHECK_STATUS_2026-10-12.md` — раздел «Утром решить» для владельца: вырез V2 (факт и
   оценка), визуальная сверка только по строкам release:"r1" (531), ключи RevenueCat в секретах EAS.
3. (после выпуска, только код и тесты) 🟡 Шпиля из симуляции: D61 — вошедший в последние 10 минут не понижается;
   воскресный пуш «зона» в 20:00 по поясу пользователя.

## Scope
In: тест-сторож (заглушка), отчёт, `functions/src/spire_finalize_core.ts` / `spire_zone_warning_push.ts` и их тесты.
Out: выкладка функций (после Codex), визуальный гейт, вырез V2.

## Architecture
Сторож — список заглушек. Шпиль: понижение гасится, если человек вошёл в комнату позже, чем за N минут до конца
недели (поле времени входа уже в members или добавляется при входе); пуш — по поясу из pushTokenTimezone.

## Security and privacy
Без новых данных наружу (пояс уже пишется клиентом в users).

## Technical debt
Решения по Шпилю — после выпуска; сейчас только код и тесты за флагом/без выкладки.

## Verification
node --test сторожа; jest/fn тесты Шпиля; симуляция Шпиля.

## Rollback
`git revert`.
