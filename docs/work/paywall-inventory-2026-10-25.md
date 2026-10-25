# Пейволы PhraseMan: инвентарь точек входа в Plus — 25.10

Шаг 1 задачи владельца «контекстные пейволы, которые продают» (через координатора).
Пакет: `docs/work/tasks/paywall-inventory-2026-10-25.md`, Governance-ID TG-FB152A664964.

Разбор сделан по коду основного дерева. Точки входа выписаны по литералам вызовов, три поломки контракта проверены вручную. Номера строк могут сдвинуться: файлы правят другие сессии.

**Как пользоваться.** Раздел 3 — полная таблица «контекст → что видит человек → файл». Раздел 4 — что из этого берём в макеты по приоритетам владельца.

## 1. Как устроено сейчас

- **Окно Plus одно.** Это нижняя шторка `PaywallPlusScreen` (`components/paywall/PaywallPlusScreen.tsx`), её открывает `/premium_modal`.
  - Пейволы A–G удалены 30.09 (D78).
  - `premium_modal_v2` и старые адреса `/paywall_a…g` только перенаправляют на `/premium_modal`.
  - У кого уже есть Plus или VIP, у того окно молча закрывается.
- **Шапка уже контекстная.** Владелец 11.10: «все пейволы должны быть контекстными». Заголовок, подзаголовок, первая выгода и пилюля «что закончилось» зависят от `context`.
  - Тексты на 9 языках — `app/paywall_context_texts.ts`, сборка — `app/paywall_context_headline.ts`.
  - Утверждённая таблица текстов — `docs/design/v2-app/paywall-context-texts.md`.
  - Без своего текста (`generic`, снятые `theme` и `arena_limit`) показывается старая шапка пробного периода.
- **Контракт входа** `app/paywall_entry_contract.ts`:
  - `context` проверяется по `PREMIUM_CONTEXT_VALUES`, `source` — по `PAYWALL_SOURCE_VALUES`;
  - неизвестное значение в dev даёт красный экран, в релизе окно **молча закрывается** (`[PAYWALL-ENTRY] reject`). См. раздел 2.
- **Планы.** Год и месяц, плюс «навсегда», если этот продукт заведён в RevenueCat.
  - Пакеты выбирает `app/revenuecat_init.ts` (по типу `ANNUAL` / `MONTHLY` или по id продукта).
  - Плашка «Выгоднее всего» стоит на годе.
  - Цена в день считается из годовой цены (`computePerDayString`).
- **Цены.** Только из магазина.
  - Магазин недоступен — справочные цены со знаком «≈» из рубильника. По умолчанию €39,99 в год, €7,99 в месяц, €3,33 в месяц при оплате за год (`app/paywall_reference_prices.ts`); владелец меняет их без релиза.
  - Цен нет совсем — тихая строка «Цена уточнится в магазине», кнопка «Оформить Plus».
- **Пробный период** — как сейчас, его длина в коде не задана.
  - Длина приходит из магазина: introPrice / freePhase и право на него (eligibility).
  - Показывается на карточке года при любом выбранном плане (владелец 30.09).
  - При пробном: лента «Сегодня → напоминание → списание» и строка «Напомним за 2 дня до списания. Отмена в один тап.». Подпись кнопки — «Начать N дней бесплатно», мелко под ней — «Затем X в год · Отмена в любой момент».
  - Перед покупкой с пробным — экран согласия на напоминание `PaywallTrialReminderPrompt`.
- **Скидки** — только настоящие предложения магазина: iOS introductory с подтверждённым правом или Android defaultOption (`app/paywall_purchase.ts`, `storePromo`).
  - Нет подтверждения — скидку не показываем (fail closed).
  - При скидке над тарифами плашка «Скидка действует сейчас»: цена со скидкой, обычная цена и что будет после.
  - Фальшивых таймеров в коде нет.
- **Россия.** Покупки в магазине из России нет.
  - Человек платит на сайте knowlyapps.com/start (Stripe / PayPal) или Telegram Stars в боте.
  - Получает одноразовый код `WEB-…` и вводит его в приложении: Настройки → Промокоды (`content/marketing/PAYMENTS_SETUP.md`).
  - Внутри приложения ссылки на этот путь нет.
- **Онбординг** идёт мимо `/premium_modal`: свой шаг `onboardingPaywall` в `components/CleanOnboarding.tsx`, та же логика покупки `usePaywallPurchase`.

## 2. 🔴 Поломки контракта: кнопка Plus молча закрывает окно

Проверено вручную: значения нет в `PAYWALL_SOURCE_VALUES` / `PREMIUM_CONTEXT_VALUES`, вызов идёт в `/premium_modal`.

| # | Значение | Где | Состояние |
|---|---|---|---|
| 1 | source `ai_explain_limit_card` | `components/AiMistakeCard.tsx:154` → `AiLimitUpsellCard.tsx:107` | **живое**: кнопка «Посмотреть Plus» на карточке «разбор на сегодня закончился» в разборе промаха урока не продаёт |
| 2 | source `dialogue_v2_freeform_server` | `app/dialogue_v2_freeform.tsx:321` (не закоммичено) | сработает, когда сервер ответит `plus_required`; нужен вариант с «Восстановить покупки» (Ревизор) |
| 3 | context и source `phrase_workshop` | `app/combo_lesson_gate.tsx:76`, `components/learning-v2/LearningV2AllLessonsList.tsx:148` | скрыто флагом `PHRASE_WORKSHOP_ENABLED_IN_RELEASE=false`; при включении замок Мастерской молча закроется; нужен и текст контекста |

Передано координатору 25.10. Код не трогали.

## 3. Все точки входа

Сокращения:
- «Окно Plus» — шторка `PaywallPlusScreen` с шапкой своего контекста; тексты — в разделе 5.
- `—` в столбце source — значение не передаётся (по умолчанию `direct`).

### Энергия

| Контекст / source | Что делает человек → что видит | Файл |
|---|---|---|
| `no_energy` / `no_energy_modal` | энергии не хватило на занятие → окно «Недостаточно энергии» / «Энергия закончилась»: «+1 ⚡ вернётся через …», «В Plus энергия безлимитная», кнопки «Позже» и «Получить Plus» (подпись зависит от варианта learn / dialogs / course) → Окно Plus | `components/NoEnergyModal.tsx:144` (+ резервный push `:166`) |
| `no_energy` / `energy_stop_sheet` | режим энергии Б (флаг `energy_mistake_charge`, по умолчанию выключен): шторка «Энергия закончилась — занятие остановлено, а не потеряно», кнопки «Продолжить с Plus» / «Выйти из занятия» | `components/energy/EnergyStopSheet.tsx:133` |
| `no_energy` / `spire_no_energy` | Пик без энергии: «Играй без ожидания с Plus ›» → шторка «Следующая — через … С Plus — без ожидания», «Попробовать Plus» | `components/spire/SpireClimbDock.tsx:82` |
| `no_energy` / `spire_last_chance` | Пик, воскресенье: окно «Последний шанс» («До топ-5 — …, энергия вернётся через …»), «Играй без ожидания с Plus» | `components/spire/moments/SpirePositionMomentsHost.tsx:101` (условия показа не разобраны) |

### ИИ-диалоги

| Контекст / source | Что делает человек → что видит | Файл |
|---|---|---|
| `dialog_limit` / `dialogue_v2_freeform` | плашка «Свободный разговор PLUS» в хабе → Окно Plus | `components/dialogs/DialogueV2CatalogueContainer.tsx:184` |
| `dialog_limit` / `dialogue_v2_freeform` | экран свободного разговора у Free: «Свободный разговор доступен в Plus», «Открыть Plus» | `app/dialogue_v2_freeform.tsx:619` |
| `dialog_limit` / `dialogue_v2_freeform_server` | сервер ответил `plus_required` → replace на пейвол (**поломка №2**) | `app/dialogue_v2_freeform.tsx:321` |
| `dialog_limit` / `dialogue_v2_hub` | хаб, ответы месяца на нуле: карточка «Plus снимает лимит ответов» («осталось 0 из 30») | `DialogueV2CatalogueContainer.tsx:173` |
| `dialog_limit` / `dialogue_v2_hub_scene` | сцена хаба: «Ответы месяца закончились — продолжи с Plus», алмаз | `components/dialogs/scene/DialogsSceneHub.tsx:50` |
| `dialog_limit` / `ai_dialog_briefing_direct` | брифинг: «Начать» при месячном лимите | `app/dialogue_v2_briefing.tsx:424` |
| `dialog_limit` / `dialogue_v2_session` | стена лимита в диалоге: «На этот месяц всё», кнопки «Итоги» и «Plus» | `app/dialogue_v2_session.tsx:904` |
| `dialog_limit` / `dialogue_v2_memory` | «Память диалогов доступна в Plus», «Посмотреть Plus» | `app/dialogue_v2_memory.tsx:333` |
| `dialog_limit` / `ai_companion_direct_entry` | компаньон без Plus → сразу пейвол | `app/ai_companion_session.tsx:90, :186` |
| `dialog_limit` / `ai_dialog_daily_limit` | старый экран ИИ-диалога, стена лимита | `app/ai_dialog_session.tsx:446` (жив ли путь — не проверено) |
| `dialog_analysis` / `dialog_analysis` | итог диалога: заглушка разбора, кнопка «Plus» | `app/ai_dialog_session.tsx:3531`, `DialogVerdictScreen` |
| `ai_voice_input` / по поверхности | микрофон после 3 голосовых за день → Окно Plus (урок, карточки, ошибки, диалоги, курс V2) | `hooks/use_voice_attempt_gate.ts:72` |
| `ai_voice_input` / `learning_v2_course_voice` | курс V2: шторка «Голоса на весь эпизод не хватит» — «Попробовать Plus» / «Начать всё равно» | `app/learning_v2_direct_session_player_v1.tsx:2085` |

### Курс и уроки

| Контекст / source | Что делает человек → что видит | Файл |
|---|---|---|
| `course_after_lesson3` / `direct` + `lessons_done` | тап по закрытому уроку («Входит в Plus») или экзамену → сразу Окно Plus | `app/(tabs)/lessons.tsx:4349` |
| `course_after_lesson3` / `lesson_menu` | открыл меню закрытого урока → замена на пейвол | `app/lesson_menu.tsx:470` |
| `course_after_lesson3` / `direct` | страж внутри урока → замена на пейвол | `app/lesson_premium_gate.ts:85` |
| `course_after_lesson3` / `level_exam` | экзамен уровня закрыт: «Получить Plus» | `app/level_exam.tsx:1013` |
| `course_after_lesson3` / `lesson_complete_soft_upsell` | итог урока: «Открыть Plus» вместо «Следующий урок» + «Первые три урока открыты бесплатно. Дальше — с Plus.» | `app/lesson_complete.tsx:1346` |
| `free_lessons_complete` / `lesson_complete_soft_upsell` | карточка на итоге урока: «Первый урок — готово» / «Три урока — отличный старт», «Посмотреть Plus» и «Не сейчас» | `components/SoftContextualUpsellCard.tsx`, `lesson_complete.tsx:1553` |
| `combined_lesson` / `direct` | комбинированный урок у Free | `lessons.tsx:4291`, `combined_lesson_pick.tsx:90`, `combo_lesson_gate.tsx:76` |
| `phrase_workshop` | замок «Мастерской фраз» у пройденного урока (**поломка №3**, режим за флагом) | `LearningV2AllLessonsList.tsx:148` |
| `speaking` / `lesson_speaking` | «Устно» после 3 попыток за день | `hooks/useSpeakingAttemptGate.ts:52` (жив ли путь — не проверено) |
| `mistake_practice` / `mistakes_hub_start` и др. | «Работа над ошибками» после 1 сессии в день; значок PLUS на кнопке заранее | `hooks/useMistakePracticeStartGate.ts:71` |
| `ai_explain` / `ai_explain_limit_card` | разбор промаха: карточка «Учитель устал» и т. п., «Посмотреть Plus» (**поломка №1**) | `components/AiLimitUpsellCard.tsx:107` |

### Серия, статистика, «после успеха»

| Контекст / source | Что делает человек → что видит | Файл |
|---|---|---|
| `streak` / — + `streak=N` | Главная, серия под угрозой у Free, не чаще раза в день → Окно Plus «Не потеряй серию» (пилюля «Серия N дней») | `app/(tabs)/home.tsx:800` |
| `streak` / `stats_streak` | статистика серии: «Защитить серию» у Free | `app/streak_stats.tsx:2229` |
| `stats`, `percentiles` / `stats_locked_card` | статистика: замок поверх блока, «Открыть с Plus» | `components/StatsPremiumBlur.tsx:244` |
| `level_up` / `afterwin_levelup` | после повышения уровня, когда слот окон свободен (кулдаун) | `app/_layout.tsx:1052` |

После рекорда, после рубежа серии и после сданного экзамена главы предложений Plus в живом коде **нет**. Триггер `streak_milestone` в `useSoftUpsellOpportunity` объявлен, но не подключён.

### Карточки и наборы

| Контекст / source | Что делает человек → что видит | Файл |
|---|---|---|
| `flashcard_limit` / `add_to_flashcard`, `video_card_save`, `flashcards_collection` | лимит 50 своих фраз | `AddToFlashcard.tsx:247`, `use_video_card_save.ts:143`, `flashcards_collection.tsx:947` |
| `flashcard_training` / `flashcards_hub_train`, `video_watch_train`, `flashcards_training_setup` | 30 тренировок в месяц исчерпаны | `FlashcardsHubScreen.tsx:605`, `use_deck_train_sheet.tsx:55`, `flashcards_training_setup.tsx:785` |
| `pack_create` / `pack_create`, `pack_create_limit` | Free открыл «Новый набор» / 3 из 3 своих наборов | `community_pack_create.tsx:378, :1155, :1025` |
| `flashcard_create` / `card_editor_create`, `card_editor_limit` | редактор своей карточки у Free / лимит 50 | `flashcards_card_editor.tsx:200, :190` |

### Подписка, возврат, напоминания, онбординг

| Контекст / source | Что делает человек → что видит | Файл |
|---|---|---|
| `generic` / `settings_premium` | Настройки → «Подписка Plus · Не активна» | `app/(tabs)/settings.tsx:942` |
| `generic` / `plus_launch_splash` | заставка при запуске: «Больше практики — без стопов», «Получить Plus» / «Не сейчас»; раз в 14 дней, с 3-го дня | `components/plus-splash/PlusLaunchSplashHost.tsx:124` |
| `premium_expired`, `vip_expired` / `entitlement_expired` | шторка «Plus закончился · прогресс сохранён», «Продлить Plus» / «Позже» | `components/EntitlementExpiredHost.tsx:361` |
| `referral_ended` / `referral_ended` | «Доступ можно открыть снова» | `app/(tabs)/friends.tsx:2889` |
| `vip_expired`, `notification_upsell` / `notification_*` | тап по пушам (VIP истекает, интро кончается, upsell d4 / d7 / d14) | `app/notification_tap_handler.ts:33, :125` |
| `premium_expired` / `notification_premium_expiry` | «Управление подпиской» без подписки → пейвол | `app/manage_subscription_access.ts:38` |
| `onboarding_plan` / `onboarding_plan` | шаг онбординга «Открой полный доступ Phraseman Plus», «Продолжить на обычном аккаунте» (мимо `/premium_modal`) | `components/CleanOnboarding.tsx:2714` |

### Чего нет

- **Пауза пересдачи экзамена главы.** Пути через Plus нет: «Пересдать через N мин» без предложения. Строка «С Plus экзамен бесплатный» в шторке экзамена — пометка для владельцев Plus.
- **Заморозка серии для Free.** Отдельного предложения нет, есть только общий `streak`. У Plus единственная бесплатная заморозка тратится по кнопке «Защитить серию».
- **Снятые входы.** Тексты для `lesson_b1`, `language_add`, `weekly_review`, `avatar_aura`, `club`, `mastery`, `winback`, `intro_ended`, `home_discount_badge` остались, а вызовов в коде нет.
- **Мёртвый код.** `components/DialogsTabContent.tsx` (4 входа) нигде не рендерится. Старый баннер `lesson_complete.tsx:1834` закрыт флагом `legacyCompletionSurfacesEnabled=false`. Не используется и `components/stats/AiBlockNote.tsx`.
- **Только dev.** Dev Hub, превью сцены диалогов, словарь Learning V2.

## 4. Под макеты: приоритеты владельца → что есть сейчас

Решения владельца:
- планы месяц + год, год главный, с ценой в месяц и выгодой;
- пробный период — как сейчас;
- скидки только настоящие предложения магазина;
- в первую очередь — энергия, ИИ-диалог, «после успеха».

| Контекст для макета | Сейчас | Что меняем (по исследованию, раздел 7) |
|---|---|---|
| Энергия | окно `NoEnergyModal` → полный пейвол | компактная панель с равными «Подождать (таймер возврата)» / «Plus», без полного экрана |
| ИИ-диалог (лимит / свободный разговор) | плашки и стены по всему хабу → полный пейвол | предложение после первого бесплатного опыта: «ты поговорил N минут», твои фразы из разбора |
| `plus_required` (сервер не видит Plus) | поломка №2 — пустой отказ | «Восстановить покупки» рядом с «Купить» и честное «проверяем подписку» |
| После успеха (рекорд, рубеж серии, сданный экзамен) | нет | мягкая карточка после праздника: «Позже» видно, без блокировки |
| Серия под угрозой / заморозка | общий пейвол `streak` | карточка серии с числом дней, «Защитить серию» |
| Мастерская фраз | поломка №3, текста нет | замок как «другое место»: превью твоих фраз урока |
| Пауза пересдачи экзамена | пути через Plus нет | равные «Подождать» / «Plus» + «потренируйся в паузе»; показ раз за паузу |
| Пик (ступени недели) | `spire_no_energy`, `spire_last_chance` | как «энергия»: панель, недельный контекст (ступени, место в комнате) |
| Онбординг | свой шаг онбординга | двухшаговый: план → цена; год предвыбран, лента пробного |
| Общий экран Plus | шторка `PaywallPlusScreen` | 2 плана, год выбран заранее, сумма списания самая заметная, лента пробного, «Не сейчас» видно |

Россия: отдельный вариант пейвола по стране магазина. Нужен юридический разбор (исследование, 5.3); в макетах — отдельной строкой, без ссылки на бот для всех на iOS.

## 5. Тексты шапки по контекстам (ru, утверждены 11.10)

| context | Заголовок | Подзаголовок | Пилюля |
|---|---|---|---|
| `no_energy` | Энергия закончилась | С Plus она не тратится — занимайся дальше сразу. | Энергия 0 |
| `ai_explain` | Разбор на сегодня закончился | С Plus ИИ объяснит каждую ошибку… | Разбор на сегодня: 0 |
| `course_after_lesson3` | Дальше — в Plus | Впереди ещё 29 уроков… | Урок N закрыт |
| `free_lessons_complete` | Бесплатные уроки пройдены | Дальше 29 уроков — открой их с Plus. | = заголовок |
| `dialog_limit` | Ответы в диалогах закончились | Бесплатно — 30 ответов в месяц. С Plus счётчика нет. | = подзаголовок |
| `dialog_locked_level` | Сценарий откроется позже | Он открывается рангом монеты. Plus откроет все сразу. | Сценарий закрыт |
| `dialog_analysis` | Разбор твоей речи | Увидишь, где фраза звучала неестественно… | — |
| `ai_voice_input` | Отвечай голосом | Бесплатно — 3 реплики голосом в день… | = подзаголовок |
| `speaking` | Говори вслух сколько нужно | Бесплатно — 3 попытки в день… | = подзаголовок |
| `mistake_practice` | Ошибки — без лимита | Бесплатно — 1 подход в день… | = подзаголовок |
| `streak` | Не потеряй серию | Plus защитит её, если пропустишь день. | Серия N дней |
| `flashcard_limit` | Место для карточек закончилось | Бесплатно — 50 фраз… | использовано из лимита |
| `flashcard_training` | Тренировки на месяц закончились | Бесплатно — 30 тренировок в месяц… | = подзаголовок |
| `flashcard_create` | Добавь свою фразу | Услышал в сериале или на работе — сохрани… | — |
| `pack_create` | Собери свой набор | Фразы для поездки, работы или сериала… | — |
| `stats` | Посмотри, как идут дела | Год занятий на одном экране… | — |
| `percentiles` | Ты идёшь лучше, чем думаешь | Твоя серия и темп на фоне других учеников. | — |
| `combined_lesson` | Несколько тем в одном уроке | Выбирай темы сам… | — |
| `level_up` | Новый уровень! Идём дальше? | Plus открывает весь курс… | — |
| `notification_upsell` | Продолжим курс? | Впереди 29 уроков… | — |
| `premium_expired` | Всё на месте — продолжим? | Серия, фразы и уроки никуда не делись… | Plus закончился |
| `vip_expired`, `referral_ended` | Бонусный доступ закончился | Plus вернёт… | = заголовок |
| `onboarding_plan` | Начни говорить, а не зубрить | Живые фразы, разговоры вслух… | — |
| `generic` | Всё приложение целиком (или шапка пробного) | Весь курс, разговоры вслух, тренировки… | — |

## 6. Не проверено

- Точные условия показа моментов Пика (`SpireMomentsLayer`).
- Жив ли путь `SpeakingButton` / `SpeakHoldButton`, старые `ai_dialog_session` / `ai_dialog_briefing`, источник `dialogue_v2_finish_mistakes`.
- Текст `blockedText` на `level_exam.tsx`.
- Как выглядит каждая точка вживую. Сверка снимает главные: общий экран Plus, «энергия закончилась», свободный диалог (`C:/Temp/claude/png/real/paywall/`).
