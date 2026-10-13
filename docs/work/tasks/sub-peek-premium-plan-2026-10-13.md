# Task packet: «Подписка Plus» — первый кадр из памяти, когда план не пришёл маршрутом (PM-214, координатор 13.10 ~17:20)

Governance-ID: TG-814996F1867E
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

`manage_subscription.tsx` рисует контент с первого кадра только при `?plan=` в маршруте (из Настроек). Без него (dev-хаб, `manage=1` без плана, ранний тап до гидрации Настроек) — скелет из трёх блоков, пока не прочитается AsyncStorage и RevenueCat.

Снимок приложения (`app_snapshot_bootstrap`) план не держит надёжно: Главная пересобирает `profile` без `premiumPlan` (`home.tsx` patchAppSnapshot).

Делаем синхронную память плана: `app/premium_plan_peek.ts`.
- Пишут её места, где план и так пишется или читается из хранилища:
  - `persistStorePremiumLocally` — синхронизация магазина;
  - `premium_guard` — проверка Plus при старте у платных;
  - собственное локальное чтение экрана подписки.
- Экран берёт план из памяти на первом кадре, если маршрут его не дал. Пусто — прежний скелет.
- Лог `[SUB-PEEK] источник=route|peek:<source>|none значение=…`.

Только отображение: покупка, смена плана, восстановление и отмена не трогаются.

## Scope

In scope:
- новый `app/premium_plan_peek.ts`;
- одна строка записи в `app/premium_revenuecat_state.ts` и в `app/premium_guard.ts`;
- `app/manage_subscription.tsx`: начальные `fallbackPlan` / `loading` и запись после локального чтения.

Out of scope: логика покупок, RevenueCat, облако.

## Architecture

- Память: `{ plan, productId, source, generation, at }`, привязана к `captureAccountGeneration().generation`. Смена аккаунта → поколение другое → `peek` вернёт null (чужой план не покажем).
- `rememberPremiumPlan(plan, productId, source)` — только непустой план. `peekPremiumPlan()` — при совпадении поколения.
- Экран: `peeked = routeParamPlan ? null : peekPremiumPlan()`; `fallbackPlan = routeParamPlan ?? localPremiumPlan(peeked.productId, peeked.plan)`; `loading = (routeParamPlan === null && !peekPlan) || devHold`. RevenueCat по-прежнему догоняет и уточняет дату и цену.

## Security and privacy

Только память процесса: план и так лежит в AsyncStorage. Ничего нового не собирается и не уходит.

## Technical debt

- После смены плана в этой сессии память обновит `persistStorePremiumLocally` — путь записи тот же. Снятие Plus (multiRemove в revenuecat_init/cloud_sync) память не чистит, но экран подписки без Plus недостижим, а RevenueCat уточнит за секунду.

## Verification

- Новый тест `tests/premium_plan_peek.test.ts`: запомнить → прочитать; другое поколение → null; пустой план не пишется.
- Сторожа экрана подписки: `manage_subscription_liquid_glass_source_contract` (хэши) — перепин по diff, если затронут хэшируемый участок; `premium_guard_cloud_refresh_ttl`.

## Rollback

`git revert` коммита.
