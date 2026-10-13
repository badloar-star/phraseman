# Task packet: перепин сторожа manage_subscription_liquid_glass_source_contract после трёх намеренных правок 13.10 (координатор ~14:10)

Governance-ID: TG-EAA36615EB37
Status: Done — 8/8 зелёные
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Сторож `tests/manage_subscription_liquid_glass_source_contract.test.mjs` зелёный. До перепина было 4 красных проверки. С последнего пина (7dfc4c86e) файл экрана меняли ровно три коммита, все намеренные:

| Коммит | Что изменилось | Влияние на сторож |
|---|---|---|
| 92c6d2206 (Ядро) | у причин отмены появился `en` (тип `ManageSubscriptionReasonCopy` = `Omit<…,'en'>` заменён полным `ManageSubscriptionCopy`, вызов `LP(r.ru, …, r.ru, …)` → `r.en`) | хэш `CANCEL_REASONS` |
| 92c6d2206 (Ядро) | dev-эффект `saveOffer=progress\|support` (шаг удержания сразу, в сторе `takeDevSaveOfferOpen` = null) | третий хэш в `effects`; заглушка харнесса без `takeDevSaveOfferOpen` роняла 2 поведенческих теста |
| b7cd4304c (Авторизация) | только текст заголовка на 8 языках | — |
| e225091d5 (Авторизация) | `metadata`: dev-план с датой важнее пустого ответа RevenueCat (в сторе `getDevPlanOverride` = null) | хэш `metadata` |

Посторонней логики оплаты, отмены и восстановления в diff нет.

## Scope

In scope: только файл сторожа — хэши `CANCEL_REASONS`, `metadata`, третий эффект; заглушка `./dev_save_offer_progress`; тест 2 под новое правило «у причин отмены обязателен `en`» (плюс проверка, что пропуск `en` у причины ловится).
Out of scope: код экрана.

## Architecture

Хэши — фактические после осмотра diff. Рядом с каждым — комментарий-обоснование, как у прежних перепинов.

## Security and privacy

Сторож платёжного экрана остаётся строгим: перепин только после построчной сверки diff.

## Technical debt

- Пусто: правило «причины с en» теперь защищено сильнее, чем прежнее «без en».

## Verification

`node --test` сторожа — все проверки зелёные.

## Rollback

`git revert` коммита.
