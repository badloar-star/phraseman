# Task packet: английские тексты — «Open conversation», «Unlimited energy», цены с точкой в EN

Governance-ID: TG-84419CD529F0
Status: Done
Owner: Ядро (сессия 1)
Related: координатор 13.10; Авторизация ac166bf42 (EN_PASS_RESULT_R1_2026-10-13.md, раздел «Авторизация»)

## Outcome

(а) «Free conversation» по-английски читается как «бесплатный разговор» — во всех 6 местах приложения единый термин
«Open conversation» (подпись «Practice without a scenario» остаётся); «Energy is not consumed» → «Unlimited energy».
(б) Справочные цены-страховки «€39,99» в английском интерфейсе показываются с точкой («€39.99»), в остальных 8 языках —
с запятой, как и было.

## Scope

In scope: app/manage_subscription.tsx, app/ai_companion_session.tsx, app/dialogue_v2_freeform.tsx,
components/dialogs/DialogueV2PlusTools.tsx, components/DialogsTabContent.tsx (только строки en), app/paywall_reference_prices.ts
(параметр языка), app/paywall_purchase.ts (передать язык), 2 теста-сторожа текстов, тест цен.
Out of scope: русские и прочие тексты, живые цены магазина (их формат даёт магазин).

## Architecture

No architecture change.

## Security and privacy

Не касается данных.

## Technical debt

- Цены из рубильника (remote) тоже проходят ту же замену для en — формат в админке остаётся «€39,99».

## Verification

Тесты цен (en → точка, ru → запятая) и сторожи текстов Plus/Диалогов.

## Rollback

Откат коммита.
