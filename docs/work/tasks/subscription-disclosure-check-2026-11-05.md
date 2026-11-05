# Task packet: проверка раскрытия условий подписки на экранах покупки (риск отказа на ревью)

Governance-ID: TG-83703AB3DE37
Status: Planned
Owner: сессия «5 · Вход» по просьбе координатора
Related epic/enabler: Plus/Ultra (docs/work/tasks/subscription-tier-plus-ultra-2026-11-06.md), сборка 150

## Outcome

Список «чего не хватает по правилам App Store 3.1.2 и Google Play» для вкладки Plus и окон оплаты variant-3 + минимальное предложение для владельца. Успех: файл `docs/work/release/SUBSCRIPTION_DISCLOSURE_CHECK_2026-11-05.md` с таблицей по пяти требованиям (цена и период, автопродление, пробный период, Условия/Конфиденциальность, Восстановить).

## Scope

In scope: чтение кода экранов покупки, один документ с выводами.
Out of scope: любые правки кода и текстов одобренного макета; публикация политики (ведёт «Сайт»).

## Architecture

No architecture change: документ-отчёт, код не меняется.

## Security and privacy

Данные не собираются и не передаются; новых полей, сервисов и разрешений нет. Документ описывает только соответствие правилам сторов.

## Technical debt

Contain: найденные пробелы вынесены владельцу решением «вариант A / B» (см. документ); срок — до сборки 150.

## Verification

Сверка с кодом по файлам: `PlusTabScreen.tsx`, `PlusTabPlans.tsx`, `PaywallPlus.tsx`, `PaywallPlusCopy.ts`, `paywall_control_visibility.ts`. Кадров нет — требуется подтверждение Эмулятором при реализации.

## Rollback

Удалить файл отчёта; код не затронут.
