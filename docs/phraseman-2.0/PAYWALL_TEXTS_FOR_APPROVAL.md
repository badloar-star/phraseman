# Тексты пейвола Plus — на одобрение владельца

Собрано Ядром 11.10 по просьбе координатора (журнал владельца строки 11, 25). **Это текущие тексты, которые уже
лежат в `app/paywall_copy.ts`** (их показывали прежние пейволы A–G). С сегодняшнего коммита окно Plus показывает их
по месту входа: заголовок и подзаголовок в шапке, первая выгода — подсвеченной строкой над «Что входит».
Вход без своего текста (`generic`, например из «Настроек») оставляет прежнюю шапку пробного периода.

**Как править:** впишите новый текст прямо в таблицу (или «ок»). До вашего «одобрено» тексты в коде не меняются.
Остальные 7 языков переведём после одобрения ru + en.

## 0. Что Ядро заметило при сборке (нужно ваше решение)

- `theme` (ru): «12 тёмных оттенков Liquid Glass доступны с Plus… вернётся к стандартному графиту» — в 2.0 темы
  бесплатны (так написано в самом коде окна Plus). Текст врёт — предлагаю убрать контекст `theme` из продажи или переписать.
- `arena_limit` — Арена удалена в 2.0 (D54/D78), вход в окно с этим контекстом больше не существует; текст не нужен.
- `club` (ru) и (en) говорят разное: ru — «без ограничений», en — «practice with the community».
- Нет английских текстов: `mastery`, `avatar_aura` (на en окно покажет общий текст). Первой выгоды на en нет у
  большинства контекстов — на en подсвеченная строка просто не появляется.
- Подзаголовки длинные (150–220 знаков, 4–5 строк на телефоне). Если хотите короче — впишите свой вариант.

## 1. Тексты по контексту

| Контекст | Язык | Заголовок | Подзаголовок | Первая выгода |
|---|---|---|---|---|
| `no_energy` | ru | Занимайся без ожидания | С подпиской энергия не тратится вообще: закончил урок — сразу берёшься за следующий. А ещё открывается весь курс, разговорная практика, тренировки без счётчика и статистика. | Свободные занятия без таймера |
| `no_energy` | en | Study without waiting | With a subscription energy is never spent: finish a lesson and go straight to the next one. Plus the whole course, speaking practice, training without a counter and statistics. | — нет текста |
| `onboarding_plan` | ru | Начни говорить, а не зубрить | Курс из живых фраз, разговоры вслух и повторы ровно того, что забывается — всё открыто с первого дня. | Весь курс целиком |
| `onboarding_plan` | en | Start speaking, not cramming | A course of real phrases, speaking out loud and repeats of exactly what you forget — all open from day one. | The whole course |
| `course_after_lesson3` | ru | Продолжим курс? | Впереди ещё двадцать девять уроков — от простых фраз до свободного разговора. А вместе с ними открывается и всё остальное: разговоры вслух, тренировки без счётчика, своя коллекция фраз и статистика. | Весь курс целиком |
| `course_after_lesson3` | en | Ready for the rest of the course? | Twenty-nine more lessons ahead — from simple phrases to free conversation. And everything else opens up with them: speaking out loud, training without a daily counter, your own phrase collection and statistics. | The whole course |
| `lesson_b1` | ru | Продолжим курс? | Впереди ещё двадцать девять уроков — от простых фраз до свободного разговора. А вместе с ними открывается и всё остальное: разговоры вслух, тренировки без счётчика, своя коллекция фраз и статистика. | Весь курс целиком |
| `lesson_b1` | en | Ready for the rest of the course? | Twenty-nine more lessons ahead — from simple phrases to free conversation. And everything else opens up with them: speaking out loud, training without a daily counter, your own phrase collection and statistics. | The whole course |
| `flashcard_limit` | ru | Сохраняй всё, что нравится | Бесплатно помещается двадцать фраз, с подпиской — сколько угодно. Плюс тренировки без счётчика, весь курс и разговорная практика. | Безлимит на личную базу карточек |
| `flashcard_limit` | en | Save everything you like | Twenty phrases fit for free, with a subscription — as many as you want. Plus training without a counter, the whole course and speaking practice. | — нет текста |
| `flashcard_training` | ru | Тренируйся сколько хочется | Бесплатно — 30 тренировок в месяц на все режимы. С подпиской счётчика нет, а слабые фразы возвращаются чаще, пока не закрепятся. Вместе с этим открывается весь курс, разговоры вслух и статистика. | Игровая тренировка сохранённых фраз |
| `flashcard_training` | en | Train as much as you want | 30 trainings a month across all modes for free. With a subscription there is no counter, and weak phrases come back more often until they stick. The whole course, speaking practice and statistics open up with it. | — нет текста |
| `flashcard_create` | ru | Добавь свою фразу | Услышал что-то в сериале или на работе — сохрани, и приложение будет тренировать это вместе с остальным. В подписке ещё весь курс, разговоры вслух и статистика. | Свои фразы с переводом и озвучкой |
| `flashcard_create` | en | Add a phrase of your own | Heard something in a series or at work — save it, and the app will train it along with everything else. The subscription also includes the whole course, speaking practice and statistics. | — нет текста |
| `pack_create` | ru | Собери набор под свою задачу | Фразы для поездки, собеседования или сериала — в одном месте. Учи набор целиком и делись им с друзьями. А с подпиской открывается и весь курс с разговорной практикой. | Своя колода под поездку, работу или сериал |
| `pack_create` | en | Build a set for what you need | Phrases for a trip, an interview or a series — all in one place. Study the whole set and share it with friends. And a subscription also opens the entire course with speaking practice. | — нет текста |
| `streak` | ru | Держи серию каждый день | Занятия без ожидания энергии — заниматься каждый день проще, когда ничто не останавливает. Вместе с этим открывается весь курс, разговоры вслух и тренировки. | Защита серии даже при пропуске |
| `streak` | en | Keep your streak going | Study without waiting for energy — practising every day is easier when nothing stops you. The whole course, speaking practice and training open up with it. | — нет текста |
| `theme` | ru | Выбери, как будет выглядеть | 12 тёмных оттенков Liquid Glass доступны с Plus. Если Plus закончится, интерфейс вернётся к стандартному графиту. | Меняет приложение целиком |
| `theme` | en | Choose how it will look | Dark, warm, high-contrast — a theme changes the whole app and stays with you for good. It comes with the subscription along with the course, dialogues and training. | — нет текста |
| `club` | ru | Занимайся без ограничений | Подписка открывает весь курс, разговоры и тренировки без дневных ограничений. | Дополнительные возможности сообщества |
| `club` | en | Practice with the community | Practice with community features and keep your learning moving. | — нет текста |
| `dialog_limit` | ru | Разговаривай сколько хочется | Без подписки — 30 ответов в месяц, с подпиской счётчика нет. Открываются все сценарии: кафе, собеседование, врач. И не только диалоги — весь курс, тренировки и статистика тоже. | Ответы в диалогах без месячного лимита |
| `dialog_limit` | en | Talk as much as you want | 30 replies a month for free, with a subscription there is no counter. Every scenario opens: a café, a job interview, the doctor. And not only dialogues — the whole course, training and statistics too. | Dialogue replies with no monthly limit |
| `dialog_locked_level` | ru | Сценарий откроется на ранге монеты | Диалоги открываются рангом монеты — монеты копятся на уроках. Plus снимает месячный лимит ответов и открывает весь курс, тренировки и разбор ошибок. | Ответы в диалогах без месячного лимита |
| `dialog_locked_level` | en | The scenario opens with your coin rank | Dialogues open with your coin rank — you earn coins in lessons. Plus removes the monthly reply limit and opens the whole course, training and mistake review. | Dialogue replies with no monthly limit |
| `dialog_analysis` | ru | Посмотри, как звучала твоя речь | После разговора видно, где фраза прозвучала неестественно, как её поправить и что сказать живее в следующий раз. Открывается вместе со всеми диалогами, курсом и тренировками. | Разбор появляется на экране завершения |
| `dialog_analysis` | en | See how your speech sounded | After a conversation you can see where a phrase sounded unnatural, how to fix it and what to say more naturally next time. It opens together with all the dialogues, the course and training. | — нет текста |
| `ai_voice_input` | ru | Отвечай голосом | Бесплатно — 3 реплики голосом в день. С подпиской говори весь диалог вслух, приложение само переведёт речь в текст. И всё остальное тоже открывается: курс, тренировки, статистика. | Микрофон прямо в поле ответа |
| `ai_voice_input` | en | Answer with your voice | 3 spoken replies a day for free. With a subscription say the whole dialogue out loud and the app turns your speech into text. And everything else opens up too: the course, training, statistics. | — нет текста |
| `speaking` | ru | Говори вслух сколько нужно | Бесплатно — 3 попытки в день, а произношение ставится повторами. С подпиской повторяй, пока не зазвучит правильно: приложение слушает каждую фразу и показывает, где звук ушёл. Плюс весь курс, диалоги и тренировки. | Произноси фразы вслух — приложение слушает |
| `speaking` | en | Speak out loud as much as you need | 3 attempts a day for free, and pronunciation comes from repetition. With a subscription repeat until it sounds right: the app listens to every phrase and shows where the sound went off. Plus the whole course, dialogues and training. | — нет текста |
| `mistake_practice` | ru | Разбирай ошибки когда удобно | Бесплатно — 1 подход в день. С подпиской возвращайся к ним сколько нужно, и к каждому ответу будет объяснение, что было не так. Вместе с этим открывается весь курс, разговоры и тренировки. | Все ошибки из уроков и карточек в одном месте |
| `mistake_practice` | en | Go over your mistakes whenever you like | One round a day for free. With a subscription come back to them as often as you need, and every answer comes with an explanation of what went wrong. The whole course, dialogues and training open up with it. | — нет текста |
| `mastery` | ru | Повторяй раунды без ограничений | Plus открывает повтор любого пройденного раунда. Закрепляй сложные фразы без списания монет. | Безлимит повторов любого урока |
| `mastery` | en | The whole app | The whole course, speaking out loud, training with no daily counter, your own phrase collection, statistics and app themes. | — нет текста |
| `stats` | ru | Посмотри, как идут дела | Год занятий на одном экране: где шло легко, где буксовало и что стоит подтянуть. И это часть подписки, в которую входит весь курс, разговоры вслух и тренировки без счётчика. | Карта активности: все 365 дней |
| `stats` | en | See how you are doing | A year of study on one screen: where it went easily, where you got stuck and what is worth catching up on. It is part of the subscription, which includes the whole course, speaking practice and training without a counter. | — нет текста |
| `heatmap` | ru | Весь год занятий на одном экране | Видно каждый день: когда шло каждый день подряд, а когда был перерыв. Открывается вместе со всей статистикой, курсом и разговорной практикой. | 365 дней активности — увидишь своё постоянство |
| `heatmap` | en | A whole year of study on one screen | Every day is visible: when you kept going day after day and when there was a break. It opens together with all the statistics, the course and speaking practice. | — нет текста |
| `patterns` | ru | Что забывается чаще всего | Приложение помнит каждую ошибку и покажет темы, которые не закрепились — а потом соберёт из них тренировку. Плюс весь курс, разговоры и остальная статистика. | Точки роста: что чаще всего проседает |
| `patterns` | en | What you forget most often | The app remembers every mistake and shows the topics that did not stick — then builds a training session out of them. Plus the whole course, dialogues and the rest of the statistics. | — нет текста |
| `percentiles` | ru | Ты идёшь лучше, чем думаешь | Твоя серия и темп на фоне остальных учеников — показываем то, в чём ты впереди. Входит в подписку вместе с курсом, разговорами и тренировками. | Увидишь свой ранг среди всех учеников |
| `percentiles` | en | You are doing better than you think | Your streak and pace next to other learners — we show what you are ahead in. Included in the subscription along with the course, dialogues and training. | — нет текста |
| `intro_ended` | ru | Бесплатный доступ закончился | Понравилось, как идёт без ограничений? Подписка возвращает всё то же самое: курс целиком, разговоры без счётчика, тренировки и статистику. | Полный доступ возвращается целиком |
| `intro_ended` | en | The free access has ended | Liked how it goes without limits? A subscription brings back exactly the same: the whole course, dialogues with no counter, training and statistics. | — нет текста |
| `level_up` | ru | Продолжим курс? | Впереди ещё двадцать девять уроков — от простых фраз до свободного разговора. А вместе с ними открывается и всё остальное: разговоры вслух, тренировки без счётчика, своя коллекция фраз и статистика. | Весь курс целиком |
| `level_up` | en | Ready for the rest of the course? | Twenty-nine more lessons ahead — from simple phrases to free conversation. And everything else opens up with them: speaking out loud, training without a daily counter, your own phrase collection and statistics. | The whole course |
| `premium_expired` | ru | Всё на месте — продолжим? | Подписка закончилась, но серия, сохранённые фразы и пройденные уроки никуда не делись. Подключай — и продолжай с той же страницы. | Продолжаешь ровно с того места, где остановился |
| `premium_expired` | en | Everything is still here — shall we go on? | The subscription has ended, but your streak, saved phrases and completed lessons are all still there. Reactivate and carry on from the same page. | — нет текста |
| `vip_expired` | ru | Всё выученное осталось с тобой | Бесплатный доступ закончился. Подписка возвращает его целиком: курс, разговоры без счётчика, тренировки и статистику. | Весь курс и практика снова открыты |
| `vip_expired` | en | Everything you learned stayed with you | The free access has ended. A subscription brings it back in full: the course, dialogues with no counter, training and statistics. | — нет текста |
| `notification_upsell` | ru | Продолжим курс? | Впереди ещё двадцать девять уроков — от простых фраз до свободного разговора. А вместе с ними открывается и всё остальное: разговоры вслух, тренировки без счётчика, своя коллекция фраз и статистика. | Весь курс целиком |
| `notification_upsell` | en | Ready for the rest of the course? | Twenty-nine more lessons ahead — from simple phrases to free conversation. And everything else opens up with them: speaking out loud, training without a daily counter, your own phrase collection and statistics. | The whole course |
| `language_add` | ru | Учи несколько языков сразу | Бесплатно — один язык. С подпиской у каждого свой план, свой прогресс и свои достижения, ничего не смешивается. И весь курс, разговоры и тренировки — для каждого языка. | Несколько языков в одном аккаунте |
| `language_add` | en | Learn several languages at once | One language for free. With a subscription each has its own plan, progress and achievements, nothing mixes. And the whole course, dialogues and training — for every language. | — нет текста |
| `ai_explain` | ru | Спрашивай почему сколько нужно | Бесплатно — несколько разборов в день. С подпиской ИИ объяснит каждую ошибку: что не так, почему и как сказать правильно. Плюс весь курс, разговоры и тренировки. | Разбор каждой ошибки сразу после ответа |
| `ai_explain` | en | Ask why as often as you need | A few explanations a day for free. With a subscription the AI explains every mistake: what went wrong, why and how to say it correctly. Plus the whole course, dialogues and training. | — нет текста |
| `weekly_review` | ru | Итог недели на одной странице | Что укрепилось, где проседает и с чего начать следующую неделю — с подсказками и подходящими уроками. Открывается вместе со всей статистикой, курсом и разговорной практикой. | Личный итог недели: сильные места и пробелы |
| `weekly_review` | en | Your week summed up on one page | What got stronger, where things slip and where to start the next week — with tips and matching lessons. It opens together with all the statistics, the course and speaking practice. | — нет текста |
| `avatar_aura` | ru | Добавь аватару свечение | Аура подсвечивает твой аватар у друзей и в списках — тебя видно сразу. Входит в подписку вместе с курсом, разговорами и тренировками. | Аура вокруг аватара — виден у друзей и в списках |
| `avatar_aura` | en | The whole app | The whole course, speaking out loud, training with no daily counter, your own phrase collection, statistics and app themes. | — нет текста |
| `free_lessons_complete` | ru | Продолжим курс? | Впереди ещё двадцать девять уроков — от простых фраз до свободного разговора. А вместе с ними открывается и всё остальное: разговоры вслух, тренировки без счётчика, своя коллекция фраз и статистика. | Весь курс целиком |
| `free_lessons_complete` | en | Ready for the rest of the course? | Twenty-nine more lessons ahead — from simple phrases to free conversation. And everything else opens up with them: speaking out loud, training without a daily counter, your own phrase collection and statistics. | The whole course |
| `winback` | ru | С возвращением | Мы ничего не стёрли — выученное на месте. Начни с короткого урока, дальше пойдёт само. А с подпиской открыт весь курс сразу, без ожидания энергии. | Всё открыто с первого дня |
| `winback` | en | Welcome back | We did not erase anything — what you learned is still here. Start with a short lesson and the rest will follow. And with a subscription the whole course is open right away, with no waiting for energy. | — нет текста |
| `referral_ended` | ru | Бесплатный доступ закончился | Понравилось, как идёт без ограничений? Подписка возвращает всё то же самое: курс целиком, разговоры без счётчика, тренировки и статистику. | Всё, чем ты пользовался, снова открыто |
| `referral_ended` | en | The free access has ended | Liked how it goes without limits? A subscription brings back exactly the same: the whole course, dialogues with no counter, training and statistics. | — нет текста |
| `arena_limit` | ru | Матч на сегодня сыгран | С Plus следующий соперник ждёт сразу — без паузы до завтра. | Матчи один за другим, без дневного потолка |
| `arena_limit` | en | The whole app | The whole course, speaking out loud, training with no daily counter, your own phrase collection, statistics and app themes. | — нет текста |
| `combined_lesson` | ru | Несколько тем в одном уроке | Выбираешь темы сам, а урок собирается из них — и старое не забывается, потому что темы возвращаются вперемешку. Вместе с этим открывается весь курс, разговоры вслух и тренировки. | Темы на выбор — урок собирается под тебя |
| `combined_lesson` | en | Several topics in one lesson | You pick the topics yourself and the lesson is built from them — and the older material is not forgotten, because topics come back mixed in. The whole course, speaking practice and training open up with it. | — нет текста |
| `home_discount_badge` | ru | Твоя цена на подписку | Та же подписка — весь курс, разговоры вслух, тренировки без счётчика и статистика — по сниженной цене. Скидка действует ограниченное время. | Та же подписка, цена ниже обычной |
| `home_discount_badge` | en | Your price for the subscription | The same subscription — the whole course, speaking practice, training with no counter and statistics — at a reduced price. The discount is available for a limited time. | — нет текста |
| `generic` | ru | Всё приложение целиком | Весь курс, разговоры вслух, тренировки без дневного счётчика, своя коллекция фраз, статистика и темы оформления. | Говоришь вслух с первого дня |
| `generic` | en | The whole app | The whole course, speaking out loud, training with no daily counter, your own phrase collection, statistics and app themes. | — нет текста |

## 2. Откуда человек попадает в окно (точка входа → контекст)

| Место в коде | Контекст | Источник (для воронки) |
|---|---|---|
| `app/(tabs)/lessons.tsx:4374` | `(переменная)` | `direct` |
| `app/community_pack_create.tsx:364` | `(переменная)` | `pack_create` |
| `app/flashcards_card_editor.tsx:160` | `(переменная)` | `card_editor_create` |
| `app/flashcards/FlashcardsHubScreen.tsx:464` | `(переменная)` | `(переменная)` |
| `app/lesson_complete.tsx:1106` | `(переменная)` | `lesson_complete_soft_upsell` |
| `app/lesson_complete.tsx:1533` | `(переменная)` | `lesson_complete_soft_upsell` |
| `app/lesson_menu.tsx:432` | `(переменная)` | `lesson_menu` |
| `app/lesson_premium_gate.ts:70` | `(переменная)` | `direct` |
| `app/level_exam.tsx:1007` | `(переменная)` | `level_exam` |
| `components/AiLimitUpsellCard.tsx:107` | `(переменная)` | `(переменная)` |
| `components/DialogsTabContent.tsx:858` | `(переменная)` | `dialogs_catalogue` |
| `components/EntitlementExpiredHost.tsx:351` | `(переменная)` | `entitlement_expired` |
| `components/NoEnergyModal.tsx:132` | `(переменная)` | `no_energy_modal` |
| `components/StatsPremiumBlur.tsx:239` | `(переменная)` | `stats_locked_card` |
| `hooks/useSpeakingAttemptGate.ts:52` | `(переменная)` | `(переменная)` |
| `app/(tabs)/lessons.tsx:3856` | `ai_dialog → dialog_limit` | `direct` |
| `app/(tabs)/lessons.tsx:4316` | `combined_lesson` | `direct` |
| `app/ai_dialog_session.tsx:3523` | `dialog_analysis` | `dialog_analysis` |
| `app/ai_companion_session.tsx:183` | `dialog_limit` | `ai_companion_direct_entry` |
| `app/ai_companion_session.tsx:88` | `dialog_limit` | `ai_companion_direct_entry` |
| `app/ai_dialog_session.tsx:438` | `dialog_limit` | `ai_dialog_daily_limit` |
| `app/dialogue_v2_briefing.tsx:245` | `dialog_limit` | `ai_dialog_briefing_direct` |
| `app/dialogue_v2_freeform.tsx:275` | `dialog_limit` | `dialogue_v2_freeform` |
| `app/dialogue_v2_memory.tsx:308` | `dialog_limit` | `dialogue_v2_memory` |
| `app/dialogue_v2_session.tsx:556` | `dialog_limit` | `dialogue_v2_session` |
| `components/dialogs/DialogueV2CatalogueContainer.tsx:138` | `dialog_limit` | `dialogue_v2_hub` |
| `components/dialogs/DialogueV2CatalogueContainer.tsx:149` | `dialog_limit` | `dialogue_v2_freeform` |
| `components/DialogsTabContent.tsx:373` | `dialog_limit` | `dialogs_catalogue` |
| `components/DialogsTabContent.tsx:410` | `dialog_limit` | `dialogs_catalogue` |
| `components/DialogsTabContent.tsx:713` | `dialog_limit` | `dialogs_companion` |
| `app/flashcards_collection.tsx:860` | `flashcard_limit` | `flashcards_collection` |
| `components/AddToFlashcard.tsx:234` | `flashcard_limit` | `add_to_flashcard` |
| `app/lesson_complete.tsx:667` | `free_lessons_complete` | `lesson_complete_soft_upsell` |
| `app/(tabs)/settings.tsx:966` | `generic` | `settings_premium` |
| `app/_layout.tsx:2799` | `intro_ended` | `intro_ended` |
| `app/_layout.tsx:831` | `level_up` | `afterwin_levelup` |
| `hooks/useMistakePracticeStartGate.ts:43` | `mistake_practice` | `(переменная)` |
| `components/spire/SpireClimbDock.tsx:40` | `no_energy` | `spire_no_energy` |
| `app/notification_tap_handler.ts:110` | `notification_upsell` | `notification_upsell` |
| `app/notifications.ts:2383` | `notification_upsell` | `notification_upsell` |
| `app/(tabs)/friends.tsx:2306` | `referral_ended` | `referral_ended` |
| `app/(tabs)/home.tsx:1830` | `streak` | `direct` |
| `app/streak_stats.tsx:2177` | `streak` | `stats_streak` |
| `app/notification_tap_handler.ts:31` | `vip_expired` | `notification_premium_expiry` |
| `app/_layout.tsx:2860` | `winback` | `winback` |

