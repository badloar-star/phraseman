# Task packet: пейвол — честный текст «оплата прошла, доступ не записался» на том же аккаунте и .catch у выбора в диалоге (третье ревью 0d76a9528, 🟡2/🟡3)

Governance-ID: TG-55D5FE66AEFF
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10; файл освобождён Ядром после 2cdc42fac)

## Outcome

- 🟡2: not_applied (магазин подтвердил доступ, локально не записан) на ТОМ ЖЕ аккаунте показывает не общее «неизвестно, прошла ли оплата»,
  а «Оплата прошла, но доступ не записался — нажми «Восстановить»» (9 языков). Кнопки диалога те же («Проверить статус / Восстановить»).
- 🟡3: выбор в диалоге «статус не подтверждён» (`.then`) получил `.catch` с логом — в покупке и в dev-показе.

## Scope

In scope: app/paywall_previous_account_copy.ts (новая чистая функция текста), app/paywall_purchase.ts (параметр certainty у
showUnverifiedPurchaseAlert, два .catch), тест. Не трогать: commitLease/refillToMax/finishOnboardingPaywallFlow (Ядро, 2cdc42fac), EnergyContext.

## Architecture

Текст — в чистом модуле (проверяется jest без React). showUnverifiedPurchaseAlert(lang, certainty = 'unknown'): прежние вызовы без
аргумента не меняются.

## Security and privacy

Деньги: текст «оплата прошла» показывается ТОЛЬКО при certainty=confirmed (магазин подтвердил доступ) — не обещаем того, чего не знаем.

## Technical debt

- Contain: нет.

## Verification

Таблица-тест текста (confirmed → «Оплата прошла…Восстановить», unknown → прежнее «Неизвестно…»), контракт вызова и .catch;
paywall_purchase_failure_ui_contract, paywall_refill_lock_reentry, paywall_purchase_activation_contract.

## Rollback

Откат коммита.

## Result

paywall_purchase_failure_ui_contract 40/40, paywall_refill_lock_reentry 3/3, paywall_purchase_activation_contract 8/8,
overlays_runtime_liquid_glass_source_contract 19/19, paywall_unverified_non_onboarding_copy 3/3.
Два сторожа падали ещё до правки (после рефакторинга Дизайна fa6648f02): счёт окон-уведомлений 3→4 и срез «catch» без presentUnverifiedDialog — обновлены с пояснением.
