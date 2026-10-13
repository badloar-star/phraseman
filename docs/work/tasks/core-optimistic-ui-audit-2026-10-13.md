# Task packet: аудит Optimistic UI ядра R1 + починка своих дыр

Governance-ID: TG-270B6F0F50A1
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: правило владельца №10; заказ координатора 13.10

## Outcome

Таблица `docs/phraseman-2.0/OPTIMISTIC_UI_CORE_R1_2026-10-13.md` по действиям ядра (энергия, монеты/руны, серия, Диалоги,
сохранение фразы, «Получить»). Свои дыры закрыты: (1) отказ списания энергии больше не закрывает занятие молча — тост;
(2) сбой сохранения серии больше не выдаётся за «день засчитан»; немые catch ядра пишут причину.

## Scope

In scope: `hooks/useFirstQuestionEnergyGate.ts`, `app/hall_of_fame_utils.ts` (+ `app/spire_report_client.ts` — тот же
контракт результата), немые catch в `app/energy_session_operation_ledger.ts`, `app/runes_system.ts`, `app/streak_*`; тесты.
Out of scope: экраны (UI) — списком координатору.

## Architecture

No architecture change: сигнал провала серии — `-1` (уже принятый в корне знак «нет серии»), отказ гейта — `action_toast`.

## Security and privacy

Не касается.

## Technical debt

- Pay now: немые catch ядра.
- Accept temporarily: UI-дыры (порция глаголов, двойной тап «Получить», старая награда +1) — владельцам экранов.

## Verification

Тесты серии (streak_day_rule_137, streak_local_date_migration, streak_journal_continuity), новый тест провала; тест гейта.

## Rollback

Откат коммитов.
