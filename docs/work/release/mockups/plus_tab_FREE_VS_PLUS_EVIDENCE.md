# Free vs Plus/Ultra — что реально отличается (по коду, 05.11.2026)

Репозиторий `C:\appsprojects\phraseman`, ветка `feature/referral-roulette`. Код не менялся.
Ultra = годовая подписка с теми же правами, что Plus; отличается только цветом и значком
(`app/subscription_tier.ts:4-6` — «Права доступа не меняются: Ultra = все права Plus»).

## В макет (подтверждено кодом)

| # | Раздел | Что | Free | Plus / Ultra | Где в коде |
|---|---|---|---|---|---|
| 1 | Уроки | Уроки курса | Уроки 1–3 | Все 32 сразу, без звёзд за предыдущий | `app/monetization_policy.ts:18` (`FREE_LESSON_LIMIT = 3`), `:84`; `app/plus_lessons_rule.ts:11,14` (`PLUS_OPENS_ALL_LESSONS = true`) |
| 2 | Уроки | Энергия | Запас 5, +1 каждые 30 мин | Не тратится | `app/energy_contract.ts:16` (`ENERGY_BASE_CAPACITY = 5`), `:30-38` (30 мин); `components/EnergyContext.tsx:133,265` (`isUnlimited` — premium, ранний выход в `spendOne`) |
| 3 | Уроки | Говорить вслух (устно в уроке, голос в диалоге, говорение в карточках — общий счётчик) | 3 попытки в день | Без лимита | `app/revenue_daily_limits.ts:27` (`speaking_attempts: 3`); `components/paywall/m/paywall_m_model.ts:26,120` |
| 4 | Уроки | Работа над ошибками | 1 подход в день | Без лимита | `app/revenue_daily_limits.ts:49` (`mistake_practice_starts: 1`); контекст `mistake_practice` |
| 5 | Уроки | ИИ-разбор ошибки | 3 в день | Каждая ошибка | `app/ai_mistake_explain_flags.ts:1`; `app/mistake_explain_plus_gate.ts` (шапка: сервер пускает Plus без лимита); `paywall_m_model.ts:122` |
| 6 | Уроки | Урок из нескольких тем | Нет | Есть | `app/combo_gate_decision.ts:11` (только Plus = allow); вход `app/(tabs)/lessons.tsx:4389` |
| 7 | Диалоги | Ответы ИИ в диалогах | 30 в месяц | Без лимита | `app/revenue_daily_limits.ts:18` (`ai_dialog_replies: 30`); `components/DialogsTabContent.tsx:342` |
| 8 | Диалоги | Раздел и сценарии | Раздел с ранга 1, сценарии выше — по рангу | Всё сразу | `shared/rank_access_contract.ts:32-37` (`dialogues: 1`), `:66-67` (plus → allowed); `components/DialogsTabContent.tsx:349` (`dialog_locked_level`) |
| 9 | Карточки | Сохранённые фразы (свои, из уроков, из видео) | 50 | Без лимита | `app/flashcards/free_limit.ts:6` (`FREE_SAVED_CARD_LIMIT = 50`); `app/flashcards/use_video_card_save.ts:141` |
| 10 | Карточки | Создать свой набор | Нет (свои старые наборы редактируются) | Есть | `app/community_pack_create.tsx:370-381` |
| 11 | Карточки | Раздел «Карточки» | С ранга 3 | Сразу | `shared/rank_access_contract.ts:36` (`cards_hub: 3`) |
| 12 | Прогресс | Защита серии | Бесплатных заморозок нет | 3 заморозки в месяц | `app/premium_freeze_allowance.ts:20` (`PREMIUM_FREE_FREEZES_PER_MONTH = 3`); `paywall_m_model.ts:125` |
| 13 | Прогресс | Статистика | Часть под размытием | Вся (советы, все показатели, место среди учеников, график пути) | `app/streak_stats.tsx:1603,2308,2340,2600,2706` (`StatsPremiumBlur`) |
| 14 | Оформление | Тема «Керамика» | Закрыта | Открывается покупкой | `app/premium_theme_catalog.ts:42` (`condition: 'plus_purchase'`); `app/premium_theme_copy.ts:11-12` |
| 15 | Статус | Кольцо у аватара и значок | Нет | ◆ Plus (месяц) / ✦ Ultra (год) | `components/plus/PlusAvatarRing.tsx:1-8`; `app/(tabs)/settings.tsx:1152`; `app/account_details.tsx:318` |
| 16 | Статус | Пик | С ранга 2 | Сразу | `shared/rank_access_contract.ts:35` (`peak: 2`) |

Ранговые замки (строки 8, 11, 16) действуют для НОВЫХ аккаунтов (после среза 2.1.0, `app/rank_gates_new_user.ts:22`);
у старых по умолчанию всё открыто (`app/remote_flags.ts:300`, `app/rank_gate_decision.ts:17`). Вкладка Plus видна при 4 иконках
внизу — это как раз новые аккаунты с невысоким рангом, поэтому строки в макете уместны.

## Одинаково у всех (в макете — как «у всех», не как платное)

| Что | Где |
|---|---|
| Видео и фразы из них — смотреть и сохранять (сохранение входит в лимит 50 карточек) | слово владельца 05.11; `use_video_card_save.ts:141` |
| Тренировки карточек — отдельного лимита нет, ограничивает только энергия | `app/monthly_training_sessions.ts:9-11` (`MONTHLY_TRAINING_SESSION_LIMIT = 0`) |
| Реклама — в приложении её нет, поэтому «без рекламы» в макет НЕ пишем | поиск admob/interstitial/rewardedAd — 0 совпадений |

## Проверить (в макет НЕ вошло)

1. **Второй язык курса.** Код запирает дополнительный язык (кроме первого, выбранного при онбординге) для НОВЫХ аккаунтов, включая уроки 1–3:
   `app/lesson_premium_gate.ts:33-43`, `app/course_language_access.ts:1-15`, `:67-73`; пейвол `language_add` (`lesson_premium_gate.ts:131-133`).
   Все 5 языков видны в выборе (`app/courses_gate.ts:20-26`). Владелец: «все языки доступны» — расходится с кодом. Нужно решение: снять замок или оставить.
2. **Ползунки цвета приложения** («Оформление»): в коде Plus-only (`app/settings_appearance.tsx:63,133`), но флаг выключен —
   `constants/theme_sliders_flag.ts:4` (`THEME_SLIDERS_V1_ENABLED = false`). Пока флаг выключен, обещать нельзя.
3. **Видео у новых аккаунтов** — раздел «video» открывается с ранга 1 (`shared/rank_access_contract.ts:33`), Plus — сразу. Владелец считает видео бесплатным; в макете показано как «у всех».
4. **Разбор речи после диалога** (`dialog_analysis`, `app/ai_dialog_session.tsx:3531`) — кнопка ведёт в Plus, но что именно скрыто у Free, не подтверждено.
5. **Повтор раунда без монет** (`mastery`) — гейт объявлен (`app/feature_gates.ts`), мест вызова нет.
6. **Мастерская фраз** (`phrase_workshop`, `app/combo_lesson_gate.tsx:76`) — часть Learning V2, который заморожен.
7. **Итог недели** (`weekly_review`, `app/soft_upsell_core.ts:79`) — не проверено, что скрыто.
8. **Уроки за жемчужины у Free** — «pearl grants» открывают уроки без Plus (`app/lesson_premium_gate.ts:51`); в макете не упоминаем.
9. **Заморозка серии у Free за осколки** — комментарий «дефолт 10» в `app/remote_flags.ts:734`, геттера рядом нет; в макете у Free «—».
