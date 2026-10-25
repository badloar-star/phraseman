# Task packet: сторожа входов пейвола распознают помощник dialogLimitPaywallParams

Governance-ID: TG-BF380340A7BF
Governance-ID: TG-3866BB916946
Governance-ID: TG-05AE9ED50887
Status: В работе
Owner: «5 · ВХОД»

## Outcome

Дизайн/координатор 26.10: от faf515267 красные `tests/paywall_entry_callsite_registry_contract.test.ts` и
`tests/paywall_entry_points_whitelist_contract.test.ts` — 15 входов dialog_limit строят params помощником
`dialogLimitPaywallParams('<source>')`, сторожа видят «динамику» / не находят context. Научить сторожей помощнику, не ослабляя:
аргумент — литерал из PAYWALL_SOURCE_VALUES, context — литерал 'dialog_limit' внутри помощника.

## Scope

Только два файла тестов; помощник и входы не меняются.

## Architecture

Реестр (AST): вызов помощника вместо объекта params → проверка единственного аргумента как source (литерал из списка, иначе
dynamic/unknown), context 'dialog_limit' сверяется с PREMIUM_CONTEXT_SET; исходник помощника — только context 'dialog_limit'.
Белый список (текст): `params: dialogLimitPaywallParams('<x>')` → `{ context: 'dialog_limit', source: '<x>' }`; не литерал —
нет context → красный. Самопроверки на неизвестный литерал, переменную, выражение, пустой вызов.

## Security and privacy

Защита контракта пейвола (неизвестный source/context в стор-сборке молча закрывал окно). Данные не затрагиваются.

## Technical debt

Распознаётся один помощник по имени; новый помощник того же рода придётся добавить в сторожа явно (намеренно — без
«доверия по шаблону»).

## Verification

Оба сторожа зелёные на текущем коде; самопроверки краснеют на плохих вызовах.

## Rollback

Откат коммита вернёт красные сторожа (входы не трогаются).
