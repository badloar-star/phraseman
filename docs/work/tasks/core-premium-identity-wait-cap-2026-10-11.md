# Task packet: расчёт доступа Plus не ждёт синхронизацию RevenueCat дольше 3 с

Governance-ID: TG-6F9C54143294
Status: In progress
Owner: 1 · ЯДРО
Related epic/enabler: [HOME-COLD] / [RC-IDENTITY] (Сверка ~23:30 п.4), [PREMIUM-RESOLVE] (Блиц 04.10), координатор 00:56

## Outcome

После смены поколения аккаунта (`resetForAccountTransition` → Plus сброшен, `accessResolved = false`) расчёт доступа
в `components/PremiumContext.tsx` ждал `syncRevenueCatIdentity` без потолка. При `[RC-IDENTITY] sync:slow 53 467 мс`
(нет Play Billing / плохая сеть) подписчик 53 с видел замки и предложения Plus. Теперь ожидание ограничено 3 с: дальше
расчёт идёт по локальному/облачному статусу — так же, как уже идёт при НЕУДАЧЕ синхронизации (fail-open, 2026-08-25);
синхронизация продолжается фоном, и её поздний успех один раз запускает пересчёт.

Отдельно: видео/скелетоны Главной от RevenueCat не зависят (по коду `accessResolved` на Главной не читается; лента
ждёт `homeRuntimeActive` ← флаг онбординга из хранилища, сеть ленты с потолком 10 с и встроенным запасом) — для них
нужна полная цепочка строк `[HOME-COLD]` от Сверки, а не догадка.

## Scope

In scope: `app/premium_identity_wait.ts` (новый, чистый помощник), `components/PremiumContext.tsx` (ожидание в
`runReload`), тесты: поведенческий для помощника + контракт `premium_context_vip_events_contract`.
Out of scope: сама синхронизация RevenueCat (`revenuecat_init.ts`), покупка (там уже `withLoadTimeout`), Главная.

## Architecture

No architecture change: тот же fail-open, что при неудаче синхронизации; добавлен потолок ожидания и повторный расчёт
по позднему успеху через ссылку на актуальный `reload` (эпоха аккаунта проверяется — поздний успех чужой эпохи
ничего не делает).

## Security and privacy

Денежная логика доступа: решение «есть Plus» по-прежнему из проверенного кэша/облака (`getVerifiedRealPremiumStatus`,
`getVerifiedVipStatus`), не из клиента; потолок не выдаёт доступ, а лишь не держит экран. Новых данных нет.

## Technical debt

Contain: лог `[RC-IDENTITY] premium_reload:wait_capped` / `late_sync` — постоянные (ранние выходы и фоновые ветки
по правилу «сперва логи»).

## Verification

Поведенческий тест помощника (быстрый успех, тайм-аут и поздний успех/неудача), контракт PremiumContext, точечная
проверка типов, ревью агентом (денежный код).

## Rollback

`git revert` — расчёт снова ждёт синхронизацию без потолка.
