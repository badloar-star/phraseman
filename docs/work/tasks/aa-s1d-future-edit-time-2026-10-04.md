# Task packet: Account Authority 2.0 — этап S1d: время правки «из будущего» (часы устройства спешат)

Governance-ID: TG-4AC6243A1836
Status: Planned
Owner: Claude session (Account Authority 2.0)

## Outcome

Решение координатора (§121: «S1d разрешён по рекомендации»). Сейчас (S1c, 0c8d05b6f) общее правило времени правки карточки `app/card_edit_time.ts` (`cardTimestamp`/`cardEditTime`/`compareCardEditTimes`, запас `ACCOUNTS_V2_DELETION_CLOCK_MARGIN_MS` = 1 ч) принимает любое время > 0. Устройство, у которого часы ушли вперёд больше чем на час, побеждает во всех конфликтах (8E `decideCardConflict` и S1b `pickCardVersion`, оба режима), пока остальные не догонят.

Правило: время правки, которое больше `now + запас`, считается **неизвестным** (`time_unknown`): в 8E → `keep_local` (как сейчас при отсутствии времени), в S1b active → локальная, в S1b restore → облачная. `now` — передаётся параметром (чистая функция; по умолчанию `Date.now()` в точке вызова, не внутри общего правила), чтобы тесты были детерминированы.

## Scope
`app/card_edit_time.ts`, его потребители `app/accounts_v2_hydration_conflicts.ts` (8E) и `app/flashcard_pages_read_result.ts` (S1b/S1c) — только передача `now`; тесты `tests/card_edit_time.test.ts`, `tests/account_v2_stale_local_8e.test.ts`, `tests/flashcard_pages_read_result.test.ts`, `tests/flashcard_pages_pre_write_merge.test.ts`. Чужие хунки не трогать.

## Architecture
Одна чистая функция времени правки + сравнение с запасом и верхней границей `now + запас`; 8E и S1b — её потребители.

## Security and privacy
Нет новых данных; логи — только коды причин.

## Technical debt
Нет. Это закрывает последний открытый вопрос по часам (S1c).

## Verification
RED→GREEN: время из будущего (> now + 1 ч) у одной стороны → `time_unknown` в обоих потребителях; ровно на границе; обе стороны из будущего; 8E — прежние решения для нормальных времён без изменений (его старые тесты зелёные без правки, кроме явно добавленных кейсов «будущее»). Мутации ≥3, тайпчек, независимое ревью до APPROVE.

## Rollback
git revert.
