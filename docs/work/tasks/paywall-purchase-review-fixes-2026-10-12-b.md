# Task packet: исправления по ревью покупки — продолжение (ответ Макетам принят)

Governance-ID: TG-917B515BB66C
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10, вечер); продолжение пакета TG-16DB41E086D8
Related epic/enabler: docs/phraseman-2.0/R1_PAYWALL_UX.md

## Outcome

То же, что в пакете TG-16DB41E086D8: ни один выход из покупки/восстановления после возможного списания не молчит и не зовёт заплатить повторно. Сообщение Макетов (образец под код для окон смены аккаунта) действий в коде не требует.

## Scope

In scope: app/paywall_purchase.ts, app/paywall_purchase_failure.ts, app/revenuecat_init.ts (только лог), app/community_packs/CommunityPackSocialBar.tsx, app/flashcards_collection.tsx, тесты.
Out of scope: серверные платёжные функции, конфиг RevenueCat, вид онбординга.

## Architecture

Не меняется: чистый модуль решений + вызовы из хука.

## Security and privacy

Данных пользователя не добавляется.

## Technical debt

Pay now: тихие выходы после возможного списания.

## Verification

Поведенческие тесты, профильные наборы, синтаксис.

## Rollback

Откат коммита.
