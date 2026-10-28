# Task packet: [PLUS-SOURCE] — откуда приложение берёт Plus (жалоба №8)

Governance-ID: TG-BBA04C4CEE11
Status: В работе
Owner: «5 · ВХОД»

## Outcome

Жалоба №8 (2.0.0): в отчёте Plus=true, а в цепочке lesson1 → lessons_list → course → premium_modal → feature_action
`purchase:no_entitlement` (blocked) → manage_subscription. Координатор 28.10: выяснить расхождение (RevenueCat / облако /
Telegram-оплата), записать лог [PLUS-SOURCE] событием feature_action (источник статуса и решение), при 🔴 для Telegram — чинить с тестом.

Разбор по коду (до правки):
- Telegram-оплата (@PhrasemanPremiumBot) → промокод → `buildPromoVipPatch` (functions/src/promo_codes.ts): `vip_active:'true'`,
  `vip_plan:'promo'|'promo_lifetime'`, `vip_until`, `vip_admin_override:'true'`; продление Stars — тот же патч.
- Клиент: `getVerifiedPremiumStatus` → `getVerifiedPremiumAccessStatus` = store ИЛИ VIP ИЛИ intro ИЛИ подарок; VIP из
  `getVipProgressState` — такой патч даёт active=true. Окно покупки при Plus закрывается диспетчером (`resolvePremiumModalEntry` → dismiss).
- `purchase:no_entitlement` пишет НЕ общая проверка, а сама покупка в магазине (app/paywall_purchase.ts): магазин вернул «ок», а
  RevenueCat не подтвердил право на ЭТОТ товар (отложенная оплата Google Play / задержка синхронизации) → тост «оплата обрабатывается».

## Scope

- НОВЫЙ `app/plus_source_diagnostics.ts` — код события `plus:src:<источник>:p<0|1>` и `plus:paywall:<решение>:<откуда>:p<0|1>:c<кэш>`,
  дедуп по смене, console.warn [PLUS-SOURCE] (переживает прод-сборку) + recordSupportDiagnostic(feature_action).
- `app/premium_guard.ts` — источник решения в `getVerifiedPremiumAccessStatusTraced` (без изменения логики доступа).
- `app/premium_modal.tsx` — решение окна покупки (show/dismiss/wait) в журнал обращений.
- Тест `tests/plus_source_diagnostics.test.ts`: формат проходит схему журнала; патч Telegram-промокода → VIP активен.
- `app/paywall_purchase.ts` (грязный у Codex) НЕ трогаю.

## Architecture

Тот же путь, что `lessons_access_diagnostics.ts`: закрытые значения, без id/текста; белый список сервера `^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$`.

## Security and privacy

Новых данных нет: журнал обращений уже описан в политике (§10), пишутся только закрытые коды источника и 0/1.

## Technical debt

Связка «no_entitlement → какие источники Plus в этот момент» внутри paywall_purchase.ts — патчем через Ревизора, если понадобится.

## Verification

jest точечно через слот: tests/plus_source_diagnostics.test.ts + соседние premium_guard-тесты.

## Rollback

Удалить модуль и вызовы (логика доступа не менялась).
