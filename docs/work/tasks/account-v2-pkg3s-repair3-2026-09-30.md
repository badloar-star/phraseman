# Task packet: Account V2 — Пакет 3S, ремонт №3 (бюджет коммита + решения владельца)

Governance-ID: TG-1822D463F043
Status: In progress
Owner: Claude session (Account V2)

## Outcome

Закрыть последний HOLD и внедрить ответы владельца 2026-09-30: (1) бюджет одной транзакции ≤ 10 МиБ — снизить предел состояния сущности (~180 000 байт) + тест-инвариант суммы; (2) SRS: при расхождении побеждает самый свежий (last-writer-wins) — снять `srs_policy_hold`; (3) удаление набора из библиотеки с защитой от воскрешения (tombstone членства); (4) P3 обоих ревью. Успех: RED→GREEN, гейты, повторное ревью APPROVE (spec+security).

## Scope

In scope: functions/src/accounts_v2_*.ts и их тесты. Out of scope: клиент modules/account-session-v2/*, index.ts, firestore.rules, эмулятор, deploy, commit.

## Architecture

LWW для SRS-полей: значение с большей (ревизия операции/clientSequence, затем времени) побеждает без вариантов; удаление из библиотеки — операция `{removeItemIds}` с tombstone-набором: добавление после удаления того же id требует свежего baseRevision (иначе остаётся удалённым). Предел состояния считается так, чтобы 50 × (состояние + op-запись + накладные) + id < 9,5 МиБ.

## Security and privacy

Без новых данных; удаление из библиотеки не трогает права/покупки.

## Technical debt

Pay now: P1 коммит, SRS, удаление библиотеки, P3 (отпечаток-тесты, ревизия поля ≤ ревизии сущности, TTL-заметка, индексы всех *Json полей, export поимённо, двойное чтение revision).

## Verification

RED→GREEN, jest по тестам accounts_v2 (functions), strict tsc, eslint, grep, ≤800 строк исходников; повторные ревью.

## Rollback

Копия до ремонта №3: `.tmp_3s_backup3/`.
