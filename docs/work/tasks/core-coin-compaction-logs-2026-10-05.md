# Task packet: логи [COIN-COMPACTION] в уплотнении трат (только логи)

Governance-ID: TG-C370F4E6A0E6
Status: In progress (координатор 05.10: «ДА на логи — только логи, поведение не трогать»)
Owner: сессия 1 · ЯДРО

## Outcome

Уплотнение трат в recoverProjection (app/level_spin_star_grants.ts) удаляет старые траты, не внося их в базу, — монеты
«возвращаются» (диагноз +5000, C:\Temp\claude\core_coin_plus5000_diagnosis_2026-10-05.txt). Сейчас это пишется только в
DebugLogger.info и нигде не видно. Нужна строка console.warn [COIN-COMPACTION] с serverSeq, числом/суммой/id/kind
удаляемых трат, serverBalance и видимым балансом до/после; строка на каждом пропуске блока.

## Scope

app/level_spin_star_grants.ts — только логирование. Тест tests/coin_compaction_logs_contract.test.ts.
Починка (а)/(б)/(в) — НЕ в этом шаге (деньги, владелец утром).

## Architecture

Расчёт «после» — гипотетический, на копии списка операций; ничего не пишется. Подсчёт для лога в try/catch с причиной —
лог не может уронить восстановление.

## Security and privacy

Без uid и почты: только суммы, id записей трат и их вид.

## Technical debt

Сама утечка остаётся до решения владельца.

## Verification

Новый тест: баланс после восстановления тот же, что до правки (закрепляет текущее поведение), строка лога есть.
Тесты кошелька зелёные.

## Rollback

git revert коммита.
