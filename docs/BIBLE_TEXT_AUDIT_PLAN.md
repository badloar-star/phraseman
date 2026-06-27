# План аудита текстов Phraseman на соответствие «Библии Phraseman»

> Дата: 2026-06-27
> Эталон: [`PHRASEMAN_BIBLE.md`](../PHRASEMAN_BIBLE.md) — операционный стандарт текстов (словарь замен, 5 стилей, правила, запрещённые паттерны).
> Это **план проверки** (что и где проверять), а не сам аудит. Правки кода не вносились.

---

## 0. Как пользоваться этим документом

Для **каждой** строки текста, видимой пользователю, прогоняем 5 контрольных вопросов Библии (Часть VI):

1. **Глагол в кнопке?** Кнопка без глагола действия → нарушение (нет «Далее/ОК/Понятно»).
2. **Gain-framing?** Говорим о выгоде, не о потере (искл. — стрик 7+ дней).
3. **Запрещённые слова?** Нет «цена / купить / подписка / урок / ошибка / статистика / функция…» (полный список — Часть I).
4. **Предложение ≤ 10 слов?** Длинные → разбить.
5. **Звучит как живой человек?** Без корпоративного и технического тона.

Плюс сквозные правила:
- **Только «ты»**, нигде не «вы» (Запрещ. паттерн №8).
- **Никаких слов-паразитов**: «просто», «кстати», «также», «в принципе», «на самом деле».
- **Никаких технических кодов ошибок** в UI.
- **Цена всегда амортизирована** (в день/неделю), не «X руб/мес».
- **Один эмодзи максимум**, только смысловой (🔥 ⚡ ⭐), не смайлики.

**Легенда статусов:** `[ ]` не проверено · `[~]` проверено, есть замечания · `[x]` проверено, ОК.

---

## 1. ИСТОЧНИКИ ТЕКСТОВ (проверять В ПЕРВУЮ ОЧЕРЕДЬ)

Тексты в проекте **централизованы ~90%**. Сначала аудируем источники-словари — это покрывает большинство экранов сразу. Затем точечно — захардкоженный текст в компонентах.

| Статус | Файл | Что внутри | На что смотреть особо |
|---|---|---|---|
| [ ] | `constants/i18n.ts` | Главный словарь UI (~240+ ключей, 8 языков) | Кнопки (глаголы), общие лейблы, запрещённые слова |
| [ ] | `constants/arena_i18n.ts` | Тексты Арены + `arenaToasts` | Игровой стиль, тосты ошибок, «вы/ты» |
| [ ] | `app/paywall_copy.ts` | 26 контекстов paywall × 8 языков | Стиль ИНВЕСТОР, декаплинг цены, «купить/подписка» |
| [ ] | `app/compass/compass_copy.ts` | Голос «Компаса» (50+ строк) | Стиль ТРЕНЕР, длина фраз |
| [ ] | `app/boons/boon_copy.ts` | Недельные бонусы | Стиль ИГРА, gain-framing |
| [ ] | `app/onboarding_welcome/welcome_copy_overrides.ts` | Онбординг (горячее редактирование) | Структура онбординга (Правило 5), «ты» |
| [ ] | `app/app_messages.ts` | Серверные сообщения, пуши, опросы (8 языков) | Не запугиваем, gain-framing |
| [ ] | `app/notifications.ts` | Все локальные/пуш-уведомления | Запрет фальш-срочности, стрик-loss только 7+ |
| [ ] | `app/diagnosis_training_copy.ts` | Диагностический тренинг | Стиль ЭКСПЕРТ |
| [ ] | `app/personal_plan_task_reason_copy.ts` | Обоснования задач плана | Длина, «вы/ты» |
| [ ] | `app/celebration_share_messages.ts` | Тексты шаринга побед | Тон, эмодзи |
| [ ] | `app/friends_self_code_messages.ts` | Реферальный код / приглашение | Тон, «ты» |
| [ ] | `app/weekly_review_category_labels.ts` | Названия недельных результатов | «статистика» → «твои результаты» |
| [ ] | `functions/src/explain/explain_prompts.ts` | AI-объяснения (видимый результат) | «Объясни просто», без воды |
| [ ] | `app/ai_dialog_scenarios.ts` | Сценарии AI-диалога | Тон собеседника |
| [ ] | `components/ui/EmptyState.tsx` (+ все вызовы) | Пустые состояния (50+ мест) | Заготовки Библии (Часть IV) |

> ⚠️ Тексты пушей частично хранятся на сервере (Firestore `app_messages`). Их проверять **через админ-панель / Firestore**, не только в коде.

---

## 2. ОНБОРДИНГ И ПРИВЕТСТВИЕ

Эталон: Библия, Правило 5 (структура: Приветствие → Цель → Привычка), Часть IV «Онбординг — полные тексты», стиль ТРЕНЕР.

| Статус | Экран / файл | Проверить |
|---|---|---|
| [ ] | `app/onboarding_welcome/WelcomeHost.tsx` | Порядок шагов = Правило 5 |
| [ ] | `app/onboarding_welcome/WelcomeSlides.tsx` | Заголовки ≤ 5–6 слов, «ты», тёплый тон |
| [ ] | `app/onboarding_welcome/welcome_copy_overrides.ts` | Приветствие / язык / имя / цель / темп / уровень |
| [ ] | `app/compass/compass_briefing_modal.tsx` | Голос Компаса = ТРЕНЕР, не запугивает |
| [ ] | Онбординг-paywall (см. §6) | gain-framing, CTA с глаголом |

**Особое внимание:** варианты цели и темпа должны совпадать по духу с Частью IV Библии (gain-формулировки: «лёгкий старт / хороший темп / быстрый прогресс»).

---

## 3. ЭКРАНЫ (SCREENS) — по категориям

### 3.1 Уроки и обучение
Стиль: ЭКСПЕРТ (подсказки) + ТРЕНЕР (поощрения). Запрет слова **«урок»** → «сессия/раунд/вызов», **«ошибка»** → «почти/попытка».

| Статус | Файл | Заметки |
|---|---|---|
| [ ] | `app/lesson1.tsx` | Текст упражнений, фидбэк на ответ |
| [ ] | `app/lesson_menu.tsx` | Кнопки-глаголы, тост энергии |
| [ ] | `app/lesson_complete.tsx` | Поощрение (Тренер+Игра) |
| [ ] | `app/lesson_help.tsx` / `app/hint.tsx` | Подсказки = Эксперт, без воды |
| [ ] | `app/lesson_intro_screens.tsx` | Вводные слайды |
| [ ] | `app/lesson_irregular_verbs.tsx`, `app/lesson_verbs.tsx`, `app/lesson_words.tsx` | Лейблы, кнопки |
| [ ] | `app/preposition_drill.tsx`, `app/problem_coach.tsx` | Тон, длина |
| [ ] | `app/diagnostic_test.tsx`, `app/level_exam.tsx` | Нейтральность, без «провал/ошибка» |
| [ ] | `app/review.tsx` | Недельный обзор: «статистика»→«результаты» |

### 3.2 Личный план (Personal Plan)
| Статус | Файл |
|---|---|
| [ ] | `app/personal_plan.tsx` |
| [ ] | `app/personal_plan_setup.tsx` |
| [ ] | `app/personal_plan_exercise.tsx` / `app/personal_plan_exercise_transition.tsx` |
| [ ] | `app/personal_plan_theory.tsx` |
| [ ] | `app/personal_plan_complete.tsx` / `app/personal_plan_thank_you.tsx` / `app/personal_plan_task_done.tsx` |
| [ ] | `app/personal_plan_stats_screen.tsx` |

### 3.3 Словарь / карточки (Flashcards)
Запрет слова **«слово»** → «фраза/выражение». Пустые состояния = Часть IV.

| Статус | Файл |
|---|---|
| [ ] | `app/flashcards.tsx` |
| [ ] | `app/flashcards/FlashcardsCategoryHub.tsx` (+ CategoryBar/Tiles/FilterDropdown) |
| [ ] | `app/flashcards_swipe.tsx` / `app/flashcards_audio.tsx` |
| [ ] | `app/flashcards_collection.tsx` |
| [ ] | `app/flashcards/FlashcardDetailsBody.tsx` / `FlashcardListItem.tsx` |
| [ ] | `app/collectibles_screen.tsx` (Сокровищница) |

### 3.4 Викторины и тесты
| Статус | Файл |
|---|---|
| [ ] | `app/quizzes.tsx` / `app/quizzes_screen.tsx` |
| [ ] | `app/quizzes/ui.tsx` / `app/quizzes/result_view.tsx` |

### 3.5 Голосовой тренер / AI
| Статус | Файл |
|---|---|
| [ ] | `app/trainer.tsx` (+ `trainer_*_session.tsx`, `trainer_session_report.tsx`) |
| [ ] | `app/ai_companion_session.tsx` / `app/ai_dialog_home.tsx` / `app/ai_dialog_session.tsx` |
| [ ] | `app/voice_equalizer.tsx` / `app/spike_voice.tsx` |

### 3.6 Главная / навигация
| Статус | Файл |
|---|---|
| [ ] | `app/(tabs)/home.tsx` (приветствия, объявления) |
| [ ] | `app/(tabs)/lessons.tsx` (плашки уровней, закрытые тайлы) |
| [ ] | `app/(tabs)/_layout.tsx` (подписи табов) |
| [ ] | `app/daily_tasks_screen.tsx` (задачи: «задание»→«вызов/миссия») |
| [ ] | `app/streak_stats.tsx` (стрик: loss-framing только 7+) |

---

## 4. МОДАЛЬНЫЕ ОКНА (≈48 шт.)

Самая «текстоёмкая» зона. Группировка по категориям + ключевые правила.

### 4.1 Геймификация (лиги / арена / достижения)
Стиль ИГРА. Числа, короткие строки, язык владения («твоё/открыто»).

| Статус | Файл |
|---|---|
| [ ] | `app/LeagueResultModal.tsx` |
| [ ] | `components/LeagueChestOpenModal.tsx` |
| [ ] | `components/LeagueBonusAvailableModal.tsx` |
| [ ] | `components/SeasonResultModal.tsx` |
| [ ] | `components/ArenaLimitModal.tsx` |
| [ ] | `app/components/RankChangeModal.tsx` (+ `RankChangeTestModal.tsx`) |
| [ ] | `components/ThroneRewardModal.tsx` |

### 4.2 Награды и подарки
| Статус | Файл |
|---|---|
| [ ] | `components/LevelGiftModal.tsx` / `components/LevelGiftDualModal.tsx` |
| [ ] | `components/ShardsEarnedModal.tsx` / `components/ShardRewardModal.tsx` |
| [ ] | `components/BoonChestModal.tsx` / `components/BoonActivatedModal.tsx` / `components/WeeklyBoonDetailModal.tsx` |
| [ ] | `components/CollectibleDropModal.tsx` |
| [ ] | `components/LoyaltyGiftModal.tsx` |

### 4.3 Подписка / премиум (см. также §6)
Стиль ИНВЕСТОР. **Главная зона риска** по словарю («купить/цена/подписка»).

| Статус | Файл |
|---|---|
| [ ] | `components/PremiumCelebrationModal.tsx` / `components/VipCelebrationModal.tsx` |
| [ ] | `components/NoEnergyModal.tsx` / `components/EnergyRefillShardModal.tsx` |
| [ ] | `components/IntroFullAccessModal.tsx` |
| [ ] | `app/flashcards/CardPackShardPaywallModal.tsx` |

### 4.4 Стрик / события
| Статус | Файл |
|---|---|
| [ ] | `components/StreakReviveModal.tsx` (loss-framing допустим только 7+ дней) |
| [ ] | `components/QuizTimeoutModal.tsx` |
| [ ] | `components/ReleaseWaveBonusModal.tsx` / `components/ReleaseNotesModal.tsx` |

### 4.5 Онбординг / аккаунт / разрешения
| Статус | Файл |
|---|---|
| [ ] | `components/RegistrationPromptModal.tsx` |
| [ ] | `components/NotificationPermissionModal.tsx` |
| [ ] | `components/DeleteAccountConfirmModal.tsx` («удалить»→«убрать») |
| [ ] | `components/DailyTasksFirstVisitModal.tsx` |

### 4.6 Опросы / жалобы / broadcast
| Статус | Файл |
|---|---|
| [ ] | `components/VipSurveyModal.tsx` / `components/VipSurveyReviewPromptModal.tsx` |
| [ ] | `components/ReportUserModal.tsx` / `components/ReportPackModal.tsx` |
| [ ] | `components/GlobalBroadcastModal.tsx` |

### 4.7 Профиль / сертификат
| Статус | Файл |
|---|---|
| [ ] | `components/PlayerProfileModal.tsx` |
| [ ] | `components/CertificateNameModal.tsx` |

### 4.8 Системные / универсальные
| Статус | Файл |
|---|---|
| [ ] | `components/UpdateModal.tsx` |
| [ ] | `components/UserWarningModal.tsx` |
| [ ] | `components/ThemedConfirmModal.tsx` / `components/ThemedChoiceModal.tsx` (универсальные — проверить все вызовы) |

### 4.9 Обучающие шиты
| Статус | Файл |
|---|---|
| [ ] | `components/ExplainSheet.tsx` (объяснение ошибки) |
| [ ] | `components/MistakeEli5Modal.tsx` («объясни просто», без воды) |

> Admin/DEV-модалки (`CertificatePreviewAdminModal`, `ExamResultPreviewAdminModal`) — **вне области аудита** (не видны пользователю).

---

## 5. ТОСТЫ, ПУШИ, ОШИБКИ, ПУСТЫЕ СОСТОЯНИЯ

### 5.1 Тосты (стиль ЧЕЛОВЕК + ЭКСПЕРТ)
Проверить тон ошибок: «не получилось… попробуй снова», без техкодов.

| Статус | Файл (примеры строк) |
|---|---|
| [ ] | `app/arena_results.tsx` (~15 тостов: реванш, разбор, оценка) |
| [ ] | `app/arena_room.tsx` / `app/arena_join.tsx` / `app/arena_rating.tsx` |
| [ ] | `app/shards_shop.tsx` (платежи, покупки) |
| [ ] | `app/daily_tasks_screen.tsx` (награды, осколки) |
| [ ] | `app/(tabs)/friends.tsx` (подарки) |
| [ ] | `app/(tabs)/quizzes.tsx`, `app/lesson_menu.tsx` (энергия) |
| [ ] | `app/avatar_select.tsx`, `app/streak_stats.tsx` |
| [ ] | `app/energy_shard_refill.ts`, `app/flashcards/cardPackShardPurchase.ts` |
| [ ] | `app/_layout.tsx` (синхронизация) |
| [ ] | `constants/arena_i18n.ts` → `arenaToasts` |

### 5.2 Пуш / локальные уведомления
Эталон: Часть IV «Уведомления». **Не запугивать**, стрик-warning допустим, фальш-срочность запрещена.

| Статус | Что |
|---|---|
| [ ] | `app/notifications.ts` — ежедневные напоминания (6 вариантов) |
| [ ] | `app/notifications.ts` — D+1 персональное |
| [ ] | `app/notifications.ts` — streak warning (тон «защити», не «потеряешь») |
| [ ] | `app/notifications.ts` — Premium активирован |
| [ ] | `app/notifications.ts` — intro/trial истекает (срочность — реальный дедлайн, ок) |
| [ ] | `app/notifications.ts` — upsell D+4 / D+7 / D+14 (gain-framing) |
| [ ] | Серверные пуши в Firestore `app_messages` (через админку) |

### 5.3 Сообщения об ошибках (Alert / баннеры)
| Статус | Файл |
|---|---|
| [ ] | `app/paywall_purchase.ts` (5× Alert.alert) |
| [ ] | Все `Alert.alert(...)` по проекту — пройти grep’ом, убрать техтон |
| [ ] | Сетевые ошибки → шаблон Библии «Что-то пошло не так. …» |

### 5.4 Пустые состояния
| Статус | Что |
|---|---|
| [ ] | `components/ui/EmptyState.tsx` + все ~50 вызовов | сверить с заготовками Части IV |

---

## 6. ПОДПИСКА / PAYWALL (отдельный приоритет)

Самая чувствительная зона по словарю и психологии. Эталон: стиль ИНВЕСТОР, Правила 2 и 3.

| Статус | Файл | Главное |
|---|---|---|
| [ ] | `app/paywall_a.tsx` / `app/paywall_b.tsx` / `app/paywall_c.tsx` | CTA с глаголом «Открыть полный доступ», нет «Купить» |
| [ ] | `app/paywall_copy.ts` | 26 контекстов: декаплинг цены, «всё включено» |
| [ ] | `app/paywall_purchase.ts` | тексты ошибок покупки |
| [ ] | `app/premium_modal.tsx` / `app/premium_modal_v2.tsx` | gain-framing, накопленный прогресс |
| [ ] | `app/manage_subscription.tsx` | «подписка/оплата» → «полный доступ» |
| [ ] | `app/promo_code_entry.tsx` / `app/shards_shop.tsx` | тон, цена |
| [ ] | `app/profile_card_upgrade.tsx` | «прокачать», не «купить» |

**Чек цены:** нигде не должно быть «X руб/мес» без амортизации в день/неделю.

---

## 7. ПРОФИЛЬ / НАСТРОЙКИ / СОЦИУМ

| Статус | Файл |
|---|---|
| [ ] | `app/(tabs)/settings.tsx` + `app/settings_*.tsx` (language/themes/notifications/invite/edu) |
| [ ] | `app/avatar_select.tsx` |
| [ ] | `app/(tabs)/friends.tsx` / `app/friends.tsx` / `app/referrals.tsx` |
| [ ] | `app/referral_code_entry.tsx` + `referral_access_*_modal.tsx` |
| [ ] | `app/settings_invite_friend.tsx` / `app/friends_self_code_messages.ts` |
| [ ] | `app/club_screen.tsx` / `app/league_screen.tsx` |
| [ ] | `app/ideas_submit.tsx` (форма обратной связи) |

---

## 8. ПРАВОВЫЕ / ИНФО (низкий приоритет)

Юридические тексты Библии **не подчиняются** (формальный язык обязателен). Проверить только подводящие подписи/кнопки вокруг них.

| Статус | Файл |
|---|---|
| [ ] | `app/privacy_screen.tsx` / `app/terms_screen.tsx` (только обёртка-UI) |
| [ ] | `app/legal/*.json` (контент — вне аудита) |
| [ ] | `app/lingman_videos.tsx` / `app/lingman_video_player.tsx` |

---

## 9. СКВОЗНЫЕ ПРОВЕРКИ (запустить grep’ом по всему `app/`, `components/`, `constants/`)

Быстрые автоматизируемые проверки запрещённых паттернов:

| Статус | Паттерн поиска | Правило Библии |
|---|---|---|
| [ ] | « вы », «Вы», «ваш», «вам», «вас» | Только «ты» (Запрещ. №8) |
| [ ] | «купить», «Купить», «оплат», «подписк», «цена», «стоимост» | Словарь / стиль Инвестор |
| [ ] | «ошибка», «Ошибка», «неправильно», «провал» | «почти/попытка» (Запрещ. №6) |
| [ ] | «урок» (как ярлык кнопки/заголовка) | «сессия/раунд/вызов» |
| [ ] | «статистика» | «твои результаты» |
| [ ] | «просто», «кстати», «также», «в принципе», «на самом деле» | Слова-паразиты (Запрещ. №4) |
| [ ] | «Далее», «ОК», «Понятно», «Retry», «Готово?»(без глагола), «Подтвердить» | Глагол в кнопке (Правило 1) |
| [ ] | «руб/мес», «₽/мес», «в месяц» | Декаплинг цены (Правило 3) |
| [ ] | «только сегодня», «осталось N часов», «истекает» (без реал. дедлайна) | Фальш-срочность (Запрещ. №5) |
| [ ] | коды ошибок (`code`, `503`, `error:`) в видимом тексте | Без техкодов (Запрещ. №3) |
| [ ] | 2+ эмодзи подряд / смайлики 😀 | Один смысловой эмодзи (стиль Игра) |

> ⚠️ Учитывать 8 языков: ru, uk, es, pt-BR, vi, id, tr, pl. Библия писана под русский; для остальных локалей — проверять смысловую эквивалентность, а не дословно.

---

## 10. ПОРЯДОК ВЫПОЛНЕНИЯ (рекомендация)

1. **§9 сквозные grep-проверки** — быстро ловит грубые нарушения по всему коду.
2. **§1 источники-словари** — даёт максимум покрытия за раз.
3. **§6 paywall** + **§2 онбординг** — самые чувствительные зоны для конверсии.
4. **§4 модалки** — большой объём текста.
5. **§5 тосты/пуши/ошибки** — тон «Человек».
6. **§3 экраны** — добиваем остальное.
7. **§7–§8** — в конце, низкий приоритет.

---

## Сводка объёма

- Экраны: **~110**
- Модальные окна: **~48**
- Системные тексты (тосты/пуши/ошибки): **~120+**
- Файлы-источники текста: **~16 ключевых** (+ ~196 файлов содержат русский UI-текст всего)
- Языков: **8**
