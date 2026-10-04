# Task packet: §142 — прогрев цен окна Plus после первого кадра + уборка флага gate_mistake_practice_premium

Governance-ID: TG-CC55A80B9290
Status: Done
Owner: Ядро (поручение координатора 04.10; правило владельца «каждый раздел открывается мгновенно»)

## Outcome
1) Окно Plus открывается сразу (02a922192), но цены читались с диска уже после показа. Теперь кэш цен (`hydratePaywallPriceCache`) читается в память фоном после первого кадра Главной — окно открывается сразу с ценами. Только диск, без сети; лог [PAYWALL] «цены прогреты: из кэша N / нет кэша».
2) Флаг `gate_mistake_practice_premium` — убрать, если нет живых читателей (app / functions / admin).

## Scope
- app/_layout.tsx: одна регистрация `runAfterHomeFirstFrame('paywall_price_cache_warmup', …)` рядом с прочими отложенными прогревами; модуль цен — динамическим импортом (не в критическом пути старта).
- Флаг НЕ убран: читателей в app/functions нет, но он — один из 8 переключателей раздела «Премиум/Фри» Пульта (admin/v2/legacy.html, CP_PREMIUM_FEATURES). С 30.09 (efe19ae9d, D66 local-first) доступ решает локальный PREMIUM_GATED, поэтому мёртв весь раздел, а не один флаг. Убирать один из восьми бессмысленно; снос раздела админки — на решение (INBOX §142).

## Architecture
Тот же механизм, что у `achievements_coins_boot_check`: ждёт `app_home_screen_ready` (потолок 2,5 с) и конец взаимодействий. `hydratePaywallPriceCache` дедуплицирует параллельные вызовы и не трогает сеть.

## Security and privacy
Цены магазина из локального кэша; новых данных нет.

## Technical debt
Нет.

## Verification
Сторожа старта/первого кадра и пейвола; проверка типов по файлу.

## Rollback
Откат коммита.
