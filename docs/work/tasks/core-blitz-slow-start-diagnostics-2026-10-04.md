# Task packet: Блиц/старт — диагностика минут ожидания (только логи)

Governance-ID: TG-9F51F1458056
Status: Done (логи); починка — после логов с эмулятора
Owner: сессия 1 · ЯДРО (координатор 04.10; правило «сперва логи, потом починка»)
Related epic/enabler: PM-220 (мгновенное открытие), Блиц 868ef2e96

## Outcome

Следующий прогон на эмуляторе покажет по логам, ЧТО держит accessResolved (~94 с), prepare (~33 с) и
энергию (~39 с): гипотезы H1 (облачная проверка доступа без потолка), H2 (RevenueCat identity без
потолка), H3/H4 (очередь за замками account-transition/storage). Чинить — только после подтверждения.

## Scope

In scope (только логи, поведение не меняется): app/premium_guard.ts (длительность шагов
getVerifiedPremiumAccessStatus), app/revenuecat_init.ts (длительность нативных вызовов identity),
app/account_generation.ts (ожидание и держатель withAccountTransitionLock), app/storage_mutex.ts
(долгое удержание замка). Out of scope: починка, таймауты, PremiumContext логика.

## Architecture

Без изменений: только console.warn/log с префиксами [PREMIUM-GUARD-STEP], [RC-IDENTITY],
[ACCOUNT-LOCK], [STORAGE-MUTEX] hold_exceeded; пороги, чтобы не шуметь.

## Security and privacy

В логах нет PII: только длительности, теги шагов, усечённые id не выводятся.

## Technical debt

Accept temporarily: логи-трассировка; после починки — оставить только пороговые предупреждения.

## Verification

Точечные тесты затронутых модулей (по одному jest на ПК); проверка типов — по команде координатора.

## Rollback

git revert — логи исчезнут, поведение то же.
