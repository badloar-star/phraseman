# Task packet: потолок ожидания у «Восстановить покупки» (аудит покупки, координатор 14.10)

Governance-ID: TG-DF1D6FEC41F3
Status: Патч подготовлен, НЕ применён — ждёт «да» владельца (правило по платёжному коду)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

В `handleRestore` (`app/paywall_purchase.ts`) шаги ДО обращения к магазину — `initRevenueCat` и
`syncRevenueCatIdentity` — ждались без потолка. При этом пока `restoring`, окно Plus нельзя закрыть
(крестик/свайп/фон/«назад»). Зависший RevenueCat = вечное «Восстанавливаем…» и запертый человек.

Правка: оба шага через `awaitWithinInitCap(..., LOAD_GATE_TOTAL_MS, ...)` — как у покупки.
По таймауту: лог `[PAYWALL-RESTORE]`, код причины `releaseReason('restore_purchase','load_timeout')`,
тост `restoreRetryToast()` («Не удалось восстановить. Попробуй ещё раз.»), `finally` освобождает кнопку и закрытие.
Ошибка шага — прежнее поведение (уходит в общий catch → тост restore_failed / status_check_failed).
Сам `restorePurchases` / `getCustomerInfo` — БЕЗ потолка (поздний результат магазина нужно применить).

## Scope

In scope: `app/paywall_purchase.ts` (handleRestore), новый тест `tests/paywall_restore_cap_contract.test.ts`.
Сдача — патчем `docs/phraseman-2.0/handoff/PAYWALL_RESTORE_CAP.patch`; в app/ не коммитится до «да» владельца.
Out of scope: покупка, цены, entitlement, вид экрана.

## Architecture

Переиспользуется существующий `app/paywall_init_cap.ts` (исход ok/timeout/error вместо исключения).

## Security and privacy

Деньги не затрагиваются: потолок стоит только ДО вызова магазина. Новых данных нет.

Брошенный по таймауту шаг живёт фоном — повторный тап безопасен (проверено по `app/revenuecat_init.ts`, вопрос координатора 14.10):
- `initRevenueCat` идемпотентен: модульный `configurePromise` — `_doInit()` создаётся один раз, повторные вызовы ждут тот же промис;
  `Purchases.configure` зовётся только при `!isConfigured()` и без appUserID (личность ставит logIn). Двойной настройки нет.
- `syncRevenueCatIdentity` дедуплицирован (D158, M4): `identitySyncInFlight` по ключу `generation|stableId|phase` — тот же аккаунт
  присоединяется к идущему промису, второго `Purchases.logIn` нет. Другой аккаунт (смена поколения) — отдельный промис, но старый
  проверяет `isCurrentAccountGeneration` перед `logIn` и после него и сверяет `getAppUserID() === canonicalUserId`, иначе false.
  Своё `callerIsCurrent` каждый вызывающий проверяет сам после await (`awaitSharedIdentitySync`).
- Тот же приём уже работает в покупке (`awaitWithinInitCap` / `withLoadTimeout` с 12.10) — патч ничего нового в этом смысле не вводит.
- Предел: если `_doInit` повис навсегда, каждый новый тап снова ждёт тот же промис и через 12 с получает тост — не запирает, но
  восстановление заработает только после перезапуска приложения.

## Technical debt

- Поведенческий тест handleRestore (рендер хука) не пишется — контракт исходника + существующий тест `awaitWithinInitCap`.

## Verification

- `tests/paywall_restore_cap_contract.test.ts` и `tests/paywall_init_cap_contract.test.ts` — N passed, N>0, на копии с применённым патчем.
- babel-парс изменённого файла.

## Rollback

`git apply -R` патча / `git revert`.
