# Сверка Ревизора: что доступно человеку в 14-дневной отсрочке удаления (25.10)

Повод: 713677ddd (Ядро, удаление вариант Б — пользователь Auth живёт 14 дней, сессии отозваны, но повторный вход возможен).
Вопрос координатора: какие callable / https берут authUid напрямую и НЕ проходят шлюз удаления — значит, доступны вошедшему снова в grace.
`accountDeleteStatusMine` / `accountDeleteRestoreMine` — открыты намеренно, вне сверки. Не блокер OTA (сервер не выложен).

## Шлюзы (проверено, что отказывают в grace)

`resolveStableUidForAuth` и `…InTransaction` (зовут `assertAccountDeletionNotPending`, functions/src/auth_identity.ts),
`ensureStableLinkForAuth` (auth_identity.ts:2221–2222), `assertAuthAccountUsable` / `assertStableAccountUsable` /
`assertStableGroupUsable` / `assertAccountUsable` (functions/src/account_gate.ts:200 — grace → `failed-precondition account_delete_pending`).

## Как проверено

1. Скрипт по TypeScript-AST: все экспорты functions/src/index.ts и functions-content/index.ts → объявление → callable/https
   (расписания и триггеры исключены). Итого 260 функций: шлюз в самом обработчике 29, в файле обработчика 22, через импорт 47, без
   шлюза 162 (из них 141 — admin*, за проверкой роли; 31 admin* — «через импорт»).
2. Каждую пользовательскую функцию без явного шлюза и «через импорт» проследили по ВЫЗОВАМ (не по импортам) — субагент + выборочная
   перепроверка Ревизором (referral_spin, referral_claim_spin, community_pack_rune_sale, daily_phrases, accounts_v2_adapter/callable —
   0 вызовов шлюза; `assertAuthStableLink` в referral.ts:561 — только сверка связи, не шлюз; friends_duel / premium_themes /
   friends_lesson_together / home_poll_v2_vote — каждый обработчик зовёт шлюз сам или через свой помощник).

## ✅ Закрыто 0750164ff (Ядро, 25.10, без выкладки)

referralSpin, referralClaimSpin, communitySyncPackRuneSale, dailyPhraseSetSaved — `assertAuthAccountUsableForCallable` первой строкой
(до сверки связи / транзакции); accountsV2SyncApply — после ворот флага, до применения пачки. Журнал `[ACCOUNT-GATE] reject` с причиной.
Тест functions/src/account_gate_grace_callables.test.ts. Проверено Ревизором по коду.

## Были открыты в grace (до 0750164ff)

| Функция | Файл | Что делает для человека | Риск |
|---|---|---|---|
| `referralSpin` | referral_spin.ts | тратит кредиты рулетки, начисляет VIP-дни / монеты на `users/{stableId}` через stars_ledger | 🔴 высокий |
| `referralClaimSpin` | referral_claim_spin.ts | превращает засчитанные приглашения в кредиты рулетки | 🔴 высокий |
| `communitySyncPackRuneSale` | community_pack_rune_sale.ts | начисляет руны автору набора, пишет чек продажи, `salesCount`, уведомление в `seller_inbox` автора | 🔴 высокий |
| `accountsV2SyncApply` | accounts_v2_adapter/callable.ts | пишет прогресс уроков / библиотеку в `accounts_v2/{uid}` | 🔴 высокий, если флаг `syncEnabled` включён (не проверено, на бою ли он) |
| `dailyPhraseSetSaved` | daily_phrases.ts | создаёт/удаляет сохранение «фразы дня», двигает публичные счётчики | 🟡 средний |
| `recordOnboardingFunnelEvent` | onboarding_funnel.ts | хеш-квитанции и агрегаты воронки, без `users` | низкий |
| `customCardMilestoneNotify` | custom_card_milestone.ts | одно событие владельцу по хешу uid+язык | низкий |
| `stripeWebhook` (продление) | web_checkout.ts:3086–3098 | продлевает VIP уже оплаченной подписки на `users/{redeemedBy}` без проверки удаления | низкий (сервер-сервер, деньги уплачены) |

Починка для первых трёх: `await assertAuthAccountUsable(db, authUid)` в начале обработчика (до `assertAuthStableLink` /
`userMatchesAuth`). Для `accountsV2SyncApply` — тот же шлюз до применения пачки.

## Закрыты своими проверками (не официальный шлюз)

`accountsV2MigrateMine` (migrate_mine.ts:285–287, :435), `accountsV2PullMine` (pull_mine.ts:197–205, :243–245),
`revenueCatShardsWebhook` (revenuecat_shards.ts:574–608, 634–640, ~951–988) — проверяют наличие маркера удаления / надгробия.
Grace блокируют, но не пойдут за будущими изменениями правил шлюза. 🟡 Перевести на `assert*Usable` при случае.
Следствие для webhook: оплата Plus во время grace даёт отказ (`account_deletion_pending_or_tombstoned`) — человек, продливший подписку
в отсрочке, Plus не получит до восстановления.

## Закрыты шлюзом (выборка проверенных по вызовам)

submitLearningV2ActivityReleasedCompletionV1, submitLearningV2CourseSessionCompletedV1, finalizeLearningV2DelayedCandidate,
finalizeLearningV2AccessPurchase (learning_v2/progress_event_callable.ts:227 → :244 `assertAccountUsable`), friendsNudge,
friendsDuelChallenge/Move/Decline, friendsLessonInvite/TogetherMark, premiumThemeEntitlementsGet/ConditionClaim/VideoWatchReport,
homePollV2Vote, learningV2*SessionGet* (фабрики обработчиков зовут `resolveStableUidForAuth`).

## Без данных аккаунта — шлюз не нужен

admin* (за ролью), openAi*Config / openAiBudgetDashboard (admin), emailUnsubscribe (HMAC-ссылка), submitWebsiteContact, siteStatsTrack,
webLeadCapture, webCheckoutCreate, paypalOrderCreate/Capture, webOrderStatus, webPrices, giftLinkInfo, giftCancel (анонимные / по
id заказа), globalBroadcastListActive, storyAnnouncementsGet (публичные списки), refreshVideoSaveCounts (общий счётчик),
accountsV2DeletionStatus (часть потока удаления).

## Не проверено

Включён ли `syncEnabled` у accountsV2 на бою; 31 admin* «через импорт» и 141 admin* без шлюза не трассировались (за ролью админа).
