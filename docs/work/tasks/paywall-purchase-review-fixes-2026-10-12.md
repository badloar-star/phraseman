# Task packet: исправления по независимому ревью покупки (деньги), R1_PAYWALL_UX

Governance-ID: TG-16DB41E086D8
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10, вечер), ревью Opus к коммиту 11a59a0c5
Related epic/enabler: docs/phraseman-2.0/R1_PAYWALL_UX.md

## Outcome

Ни один выход из покупки/восстановления после ВОЗМОЖНОГО списания не молчит и не зовёт заплатить повторно: stale вокруг purchasePackage, неприменённый результат, ветка онбординга, ложный диалог после успешной покупки, немые выходы получают лог и нужный диалог/тост; набор с ценой без обработчика покупки не добавляется бесплатно.

## Scope

In scope: app/paywall_purchase.ts, app/paywall_purchase_failure.ts, app/revenuecat_init.ts (только лог), app/community_packs/CommunityPackSocialBar.tsx, app/flashcards_collection.tsx (тост отказа гейта), тесты.
Out of scope: серверные платёжные функции, конфиг RevenueCat, вид онбординга (заморожен).

## Architecture

Флаг «purchasePackage вызван» ставится внутри обёртки операции в момент вызова; решения «что показать» — в чистом модуле paywall_purchase_failure.ts, покрыты поведенческими тестами.

## Security and privacy

Данных пользователя не добавляется; логи без персональных значений (категория, код, фаза).

## Technical debt

Pay now: тихие выходы после возможного списания; хрупкий тест порядка строк.

## Verification

Поведенческие тесты чистого модуля, тесты порядка веток, профильные наборы покупки/пейволов/карточек, синтаксис.

## Rollback

Откат коммита.
