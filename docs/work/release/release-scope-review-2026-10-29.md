# Релиз 29.10 — сверка скоупа Ревизором (вердикт по коду и паритету с боем)

HEAD на момент сверки: aa29d5f29. Боевой коммит функций: da0a435e3. Мой ✅ — вердикт по коду и паритету; выкладка — кнопкой владельца через Ядро.

## Функции (адресная выкладка)
| Выкладка | Замыкание | Отличия от боя | Бой новее HEAD | Вердикт |
|---|---:|---|---:|---|
| telegramPremiumWebhook | 55 | access_projection (f1395a92a), telegram_premium_bot + invoice_payload (8bd618314) | 0 | ✅ |
| communityMonthGetRanking / Finalize / GetRewards / ClaimReward / StandingsRefresh | 34 | access_projection, community_month_contest, community_month_tally, plus_grant, shared/community_month_contest (6aa10cc1c, 58f38b4d6, f1395a92a) | 0 | ✅ |
| Лесенка C (referral*) | — | — | — | вне релиза |

Деньги и Plus: повторного начисления нет (ledger plus_grant_ledger в той же транзакции, tx.create); продление от max(конец любого Plus, сейчас); бессрочному — noop. Бот: счёт v2 без ника ≤ 128 байт, совместимость с v1, Telegram id в журнале только хэшем.

**Исключение — не выкладывать никакие другие функции из HEAD:** 12 файлов, где бой (a82a3b220) новее HEAD и рабочее дерево == бою, но не закоммичены (inventory, admin_analytics, admin_analytics_core, admin_arena_content, admin_compliance, admin_diagnostics_overview, admin_product_analytics, v2_activity_session_projection, dialogue_v2_latency_trace, openai_budget_dashboard, activity_session_package_v2, activity_released_session_package_v1). Выкладка функций, которые их импортируют, откатит бой.

## Клиент (коммиты 28.10 22:03 — 29.10 10:15, код)
✅ проверено по коду: cb30a91d6, 0024b874e, 04c670748, cb992aad5, 2a9f1c2e1 (Plus 32 — проверка Plus стоит до доверия списку), 1097057bd, ae0261b1b + 54edeadd3 (кнопка «Открыть Plus» — источник в контракте, тест 9/9), 9c34c1092 + c7144f2f3 (экзамен, поблажка сужена), 158cb41a1, b52c76442, fe25422d7, 571dbd8e3, e87c9fb7a, d34cd132f, 8d206b561, 1dbd9466c, 5af990c3a, 0477f76f9, 6445c1287, 23f9de5c8, ac9573883, 8dca4887e, 9fd9db9fb, 54f5d1fad, 4dc58c8c3, 0d1ac3452 + 4d0e53f9b (анонс конкурса), 1e1613865, d4dab76b3, b28217fe7 (проба призрака, флаг ВЫКЛ), 5781370d8 + bddf57c36 (Plus только в облаке; без аккаунта — обычное окно), c2bc33c7b + 7aa263526, bb52ebd23, 5f04a4f03 + b81363b66 (сторож triLang), 5de36ea7e, f9bbab166 (вход в тест уровня — доступ не открывает), ea13fc51c, e12db00ac, f79bf3785, c474f64c9 (испанский прогресс в облако — без новых чтений), 5c6c23070, b1ba13dea, 1215592ed, 4c2e4611d + 022e700c1 + 483082175 (лесенка — флаг referral_ladder_enabled ВЫКЛ), 0423cf666 (удаление аккаунта стирает рекорды Пика, тест), 68fa2660b (окно победителя).
Политика/хостинг: 3e9bb3eb8, 6aa721e13 — текст ✅. 291734bb8 (админка = бой) — паритет подтверждал Сайт по sha256, я с боем не сверял — **не проверено мной**.

## Не проверено / замечания
- Пересборка курса Learning V2 (en) — ещё не закоммичена; уроки 17/18/20 в выпускной копии не сверены.
- Флаги ВЫКЛ (ghost_friend_ab, referral_ladder_enabled) — включать только кнопкой владельца после выхода версии.
- Опросы в объявлениях — POLL_PUBLISH_ENABLED = false, storyPollVote не выложена.
