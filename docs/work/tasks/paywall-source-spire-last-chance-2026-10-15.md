# Task packet: источник пейвола spire_last_chance в белый список (полный прогон Тем 15.10)

Governance-ID: TG-4E769D41151E
Governance-ID: TG-AC757FFA9A13
Status: Готово к применению после 08:20 (идёт №7), окно 08:30
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Окно «Последний шанс» Пика (моменты v3, 9c86f065d) открывает пейвол с `source: 'spire_last_chance'`
(components/spire/moments/SpirePositionMomentsHost.tsx:90). Значения нет в `PAYWALL_SOURCE_VALUES` (app/paywall_entry_contract.ts) —
сторожа paywall_entry_callsite_registry_contract и paywall_entry_points_whitelist_contract красные, а покупка из окна теряла атрибуцию.
Решение координатора — вариант (а): добавить значение в белый список.

## Scope

In scope: одна строка + комментарий в `app/paywall_entry_contract.ts`.
Проверено: жёстких списков источников больше нет — админка (admin/v2/legacy.html) и функции (functions/src) их не держат,
тесты импортируют список из контракта; scripts/dev_links_* используют значения только в ссылках.
Out of scope: SpirePositionMomentsHost (код моментов), контекст `no_energy` (уже в PREMIUM_CONTEXT_SET — сторожа на него не жалуются).

## Architecture

Белый список ограничивает измерение «источник» в аналитике пейвола; тип PaywallSource выводится из массива.

## Security and privacy

Новых данных нет — новое значение уже существующего поля; политика не меняется.

## Technical debt

- Новый источник пейвола добавляется в двух местах (вызов + белый список); сторожа ловят расхождение только на прогоне тестов — подсказка в комментарии рядом с массивом.

## Verification

paywall_entry_callsite_registry_contract, paywall_entry_points_whitelist_contract, speaking_daily_quota_wiring_contract — N passed (slot.sh run).

## Rollback

`git revert`.
