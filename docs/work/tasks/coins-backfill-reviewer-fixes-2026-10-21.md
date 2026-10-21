# Task packet: бэкфилл монет Learning V2 — правки Ревизора к b3ac3348d

Governance-ID: TG-B459D4D75E67
Status: В работе
Owner: 5 · ВХОД И АККАУНТ; проверка — 11 · Ревизор

## Outcome

Вердикт Ревизора к b3ac3348d: 🟢 можно --apply после двух правок.
1) Сухой режим должен проверять серверную подготовку операций (prepareStarOperations: validate, meta, отпечаток,
   конфликт квитанции), а не только считать.
2) «Суперворскресенье»: курс начисляет applySuperSundayRuneMultiplier(totalRunes, earnedAtMs) — бэкфилл обязан тот же.
Плюс запись в пакет: кошелёк курса у этих людей остаётся с теми же монетами — если его когда-нибудь включат в счётчик,
854 монеты посчитаются дважды.

## Scope

- scripts/coins_backfill_lv2_sessions_2026_10_21.ts:
  - prepareStarOperations зовётся и в сухом режиме (только чтения); проверка outcomes (все applied, сумма сходится)
    до решения «писать/не писать»; commitStarOperations — только с --apply;
  - сумма занятия = applySuperSundayRuneMultiplier(база, время записи завершения) из modules/economy/super_sunday_runes.
- docs/work/tasks/coins-backfill-lv2-sessions-2026-10-21.md — строки про воскресенье и кошелёк курса.

## Architecture

prepareStarOperations только читает (записи — tx.set/tx.create в commitStarOperations), транзакция без записей ничего
не меняет. Удвоение — та же функция, что у курса (учитывает отмену удвоения D147).

## Security and privacy

Без изменений: только агрегаты в выводе, запись — только с --apply и по «да» владельца в чате запуска.

## Technical debt

См. основной пакет.

## Verification

Повторный сухой прогон с настоящими outcomes журнала → Ревизору и координатору; --apply только по «да» владельца.

## Rollback

`git revert <hash>` (скрипт); записи в прод до --apply нет.
