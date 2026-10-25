# Task packet: инвентарь пейволов и точек входа в Plus (шаг 1 контекстных пейволов)

Governance-ID: TG-FB152A664964
Status: Done
Owner: 3 · МАКЕТЫ (новая главная задача владельца через координатора 25.10)

## Outcome

Владелец 25.10: «разработай дизайны новых пейволов, которые точно будут продавать… с КОНТЕКСТНЫМИ пейволами». Шаг 1 — инвентарь:
все пейволы и входы в Plus в коде, что видит человек сейчас, какие планы / цены / пробный / скидки, путь оплаты из России.
Итог — docs/work/paywall-inventory-2026-10-25.md (таблица «контекст → что видит человек → файл»).

## Scope

In scope: этот пакет, docs/work/paywall-inventory-2026-10-25.md. Out of scope: код (баги контракта переданы координатору), макеты (шаг 2).

## Architecture

No architecture change. Чтение кода основного дерева (app/, components/, hooks/), тексты контекстов — app/paywall_context_texts.ts.

## Security and privacy

Только чтение кода; данных пользователей нет.

## Technical debt

- Accept temporarily: точки, помеченные «не проверено», подтвердить снимками Сверки до макетов на них.

## Verification

52 точки входа выписаны по литералам вызовов (агент-исследователь) + выборочная ручная проверка: 3 бага контракта подтверждены
grep по PAYWALL_SOURCE_VALUES / PREMIUM_CONTEXT_VALUES и по коду вызова (AiLimitUpsellCard → /premium_modal source=ai_explain_limit_card).

## Rollback

Удалить документ — код не меняется.
