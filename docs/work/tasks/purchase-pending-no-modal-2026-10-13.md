# Task packet: покупка «ждёт подтверждения» — без окна про родителей и банк, пейвол закрывается, тост

Governance-ID: TG-2EFD22E428C5
Status: Done
Owner: Ядро (сессия 1)
Related: слово владельца 13.10 (через координатора): «такого не должно быть ни при каких обстоятельствах, покупка осуществляется
сразу, никаких родителей или банков»; кадр paywalls-014 (_dev_state=pending).

## Outcome

showPurchasePendingAlert больше не показывает блокирующее окно «Покупка ждёт подтверждения — например, родителя или банка».
Вместо него — короткий тост на 9 языках «Оплата обрабатывается — Plus включится сам». Настоящий поток (PAYMENT_PENDING_ERROR и
«оплата прошла, доступ не подтверждён») закрывает пейвол по правилам postAccessFailureAction; кнопка не висит. Доступ до
подтверждения магазином не даётся (правила Google) — его включает слушатель customerInfo, как раньше. Журнал [PURCHASE] pending.

## Scope

In scope: app/paywall_purchase.ts, app/dev_paywall_state.ts (вид 'pending' без спиннера), сторожа
overlay_queue_and_pending_alert_contract / paywall_purchase_failure_ui_contract / dev_paywall_states_extra_contract.
Out of scope: логика начисления доступа, RevenueCat-слушатель, восстановление покупок.

## Architecture

No architecture change.

## Security and privacy

Не касается данных. Доступ без подтверждения магазина не выдаётся.

## Technical debt

- Тост показывается один раз на продукт за 30 минут (как прежнее окно) — повторный тап по покупке при ожидании не шумит.

## Verification

Точечные тесты пейвола; dev-ссылка paywalls-014 — тост, без окна и спиннера.

## Rollback

Откат коммита.
