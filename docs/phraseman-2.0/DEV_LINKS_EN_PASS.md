# DEV_LINKS_EN_PASS — ссылки «en-проход» (Дизайн, 12.10)

Решение владельца п.76: английский интерфейс входит в R1. Флаг `ENGLISH_UI_LOCALE_ENABLED` пока выключен; до его включения английский открывается dev-подменой `uiLang=en` (app/dev_ui_lang.ts): только память, на диск и в облако язык не пишется, в стор-сборке параметр отклоняется. Каждая ссылка — готовая из DEV_LINKS_R1.md с `uiLang=en` и `overlays=off`.

**Как проходить:** `adb shell am force-stop app.phraseman` → ссылка → «DEV-STATE OK». В журнале искать `[DEV-STATE] uiLang`, `[I18N-FALLBACK]` (строка без английского: подставился испанский), русский или испанский текст на экране = дыра. Шаги-тапы с текстовым селектором (`tap:Текст`) в английском не сработают — используйте `#testID`.

## Диалоги — хаб, брифинг, сессия

| id | экран · состояние | ссылка | перед кадром | тапы |
|---|---|---|---|---|
| dialogs-001 | A. Хаб «Диалоги» · Хаб — Free | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&coinRank=6&overlays=off&uiLang=en&next=/ai_dialog_home` | хаб «Диалоги», Free |  |
| dialogs-003 | A. Хаб «Диалоги» · Категория раскрыта — все виды строк | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&dialogsDone=3&coinRank=6&overlays=off&uiLang=en&next=/ai_dialog_home` | первая категория раскрыта, 3 первых диалога пройдены (dialogsDone=3: локальная запись, только гость; стереть: dialogsDone=reset) — «пройдено ✓» и счётчик «3 / всего» | tap:#dialogue-v2-world-toggle-* |
| dialogs-007 | B. Брифинг и вход · Брифинг — цель и задания | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&coinRank=6&overlays=off&uiLang=en&next=/ai_dialog_home` | брифинг первого диалога первой категории | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-* |
| dialogs-013 | C. Сессия диалога · Начало — приветствие баристы | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&coinRank=6&aiConsent=granted&overlays=off&uiLang=en&next=/ai_dialog_home` | начало сессии: приветствие собеседника (подставной старт dev_dialog_send=ok; какой диалог первый — зависит от каталога) | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000 |
| dialogs-014 | C. Сессия диалога · Разговор идёт | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&coinRank=6&aiConsent=granted&overlays=off&uiLang=en&next=/ai_dialog_home` | разговор идёт: после отправки сообщения ответ собеседника на месте (подставной ход, 1,5 с) | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500 |
| dialogs-017 | C. Сессия диалога · Подсказка — окно | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&dquota=reset&energy=5&dev_dialog_send=ok&coinRank=6&aiConsent=granted&overlays=off&uiLang=en&next=/ai_dialog_home` | внутри сессии: окно подсказки | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-hint |
| dialogs-018 | C. Сессия диалога · Задания — шторка | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&dquota=reset&energy=5&dev_dialog_send=ok&coinRank=6&aiConsent=granted&overlays=off&uiLang=en&next=/ai_dialog_home` | внутри сессии: шторка заданий | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-goals |
| dialogs-023 | C. Сессия диалога · Настроение собеседника упало | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_mood=sad&coinRank=6&aiConsent=granted&overlays=off&uiLang=en&next=/ai_dialog_home` | настроение собеседника упало (dev_dialog_mood=sad поверх подставного хода) | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500 |
| dialogs-035 | C. Лимиты, завершение и выход · Лимит закончился — «На этот месяц всё» | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=1&energy=5&dev_dialog_send=quota_exhausted&coinRank=6&aiConsent=granted&overlays=off&uiLang=en&next=/ai_dialog_home` | лимит исчерпан на отправке (dev_dialog_send=quota_exhausted) | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500 |
| dialogs-036 | C. Лимиты, завершение и выход · Выход из диалога — подтверждение | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&coinRank=6&aiConsent=granted&overlays=off&uiLang=en&next=/ai_dialog_home` | внутри сессии: системная «назад» → подтверждение выхода | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; back |
| dialogs-045 | F. Свободный разговор · Пустое состояние — «Что можно спросить» | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&dquota=reset&energy=5&overlays=off&uiLang=en&next=/dialogue_v2_freeform` | свободный разговор у Plus: пустое состояние «Что можно спросить» |  |
| dialogs-gap-002 | Диалоги · Память · Память диалогов — Plus, пока пусто | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&dquota=reset&overlays=off&uiLang=en&next=/dialogue_v2_memory` | память диалогов, Plus (кадр «пусто», если памяти нет) |  |

## Карточки — хаб, сохранённые, каталог

| id | экран · состояние | ссылка | перед кадром | тапы |
|---|---|---|---|---|
| cards-v2-001 | Хаб · Хаб | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=off&animations=off&overlays=off&uiLang=en&next=/flashcards` | хаб Карточек (демо-аккаунт, Free) · **только гость (pm clear + онбординг)** |  |
| cards-002 | Хаб и выбор режима · Выбор режима · окно по центру | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=off&animations=off&overlays=off&uiLang=en&next=/flashcards?train=1` | шторка выбора режима тренировки (хаб открывает её сам по ?train=1) · **только гость (pm clear + онбординг)** |  |
| cards-005 | Сохранённые · Список | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&uiLang=en&next=/flashcards_collection?cat=saved` | 1 колонка (привязка образца: «Сохранённые — 1 колонка») · **только гость (pm clear + онбординг)** | tap:#fc-zoom-larger |
| cards-007 | Сохранённые · Режим выделения | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&uiLang=en&next=/flashcards_collection?cat=saved` | режим выделения · **только гость (pm clear + онбординг)** | tap:#fc-saved-actions; tap:#fc-menu-select |
| cards-009 | Сохранённые · Пусто | `phraseman://dev_state?onboarding=done&intros=seen&cards=empty&plus=off&overlays=off&uiLang=en&next=/flashcards_collection?cat=saved` | пустые «Сохранённые» (cards=empty очищает данные прошлого кадра) · **только гость (pm clear + онбординг)** |  |
| cards-010 | Сохранённые · Лимит free: первые 50 | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=off&overlays=off&uiLang=en&next=/flashcards_collection?cat=saved` | Free: список из 64 сохранённых, лимит 50/50 и блок «+14 скрыто» (cards=demo&plus=off; cards=custom50 тут не годится — свои карточки в «Сохранённых» не видны) · **только гость (pm clear + онбординг)** |  |
| cards-014 | Наборы сообщества · Каталог · «Новые» | `phraseman://dev_state?onboarding=done&intros=seen&catalog=demo&overlays=off&uiLang=en&next=/flashcards_packs` | каталог сообщества, «Новые» |  |
| cards-015 | Наборы сообщества · Поиск · действия долгим нажатием | `phraseman://dev_state?onboarding=done&intros=seen&catalog=demo&overlays=off&uiLang=en&next=/flashcards_packs` | каталог (привязка образца cards-v2 №25 «Каталог»; по названию строки — поиск и меню по долгому нажатию) |  |
| cards-017 | Наборы сообщества · Поиск без совпадений | `phraseman://dev_state?onboarding=done&intros=seen&catalog=demo&overlays=off&uiLang=en&next=/flashcards_packs` | поиск по каталогу без совпадений («Ничего не найдено») | tap:#flashcards-packs-search; type:zzzqq |
| cards-020 | Набор · Жалоба на набор | `phraseman://dev_state?onboarding=done&intros=seen&catalog=demo&overlays=off&uiLang=en&next=/flashcards_packs` | жалоба на набор сообщества (долгое нажатие → «Пожаловаться») | long:#flashcards-pack-card-dev_demo_community_1; tap:#flashcards-pack-report |
| cards-021 | Редактор карточки и создание набора · Новая карточка | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&uiLang=en&next=/flashcards_card_editor?create=1%26cat=custom` | новая карточка (редактор) · **только гость (pm clear + онбординг)** |  |
| cards-023 | Редактор карточки и создание набора · Новый набор | `phraseman://dev_state?onboarding=done&intros=seen&cards=empty&plus=on&overlays=off&uiLang=en&next=/community_pack_create` | новый набор, пустая форма (черновик сбрасывается фикстурой) · **только гость (pm clear + онбординг)** |  |
| cards-028 | Наборы из видео · Список | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&uiLang=en&next=/flashcards_video_packs` | «Из видео»: 5 демо-роликов (по строкам не тапать) · **только гость (pm clear + онбординг)** |  |

## Карточки — тренировки

| id | экран · состояние | ссылка | перед кадром | тапы |
|---|---|---|---|---|
| cards-v2-029 | Тренировка · Настройка — пусто | `phraseman://dev_state?onboarding=done&intros=seen&cards=empty&plus=on&overlays=off&uiLang=en&next=/flashcards_training_setup?mode=blitz` | настройка тренировки без карточек (cards=empty): пусто / нет наборов · **только гость (pm clear + онбординг)** |  |
| cards-v2-031 | Сессии · Блиц | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&uiLang=en&next=/flashcards_blitz_session?deck=saved%26sec=60` | «Блиц»: сессия, первый вопрос · **только гость (pm clear + онбординг)** |  |
| cards-v2-033 | Сессии · Правда / ложь | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&uiLang=en&next=/flashcards_truefalse_session?deck=saved%26quick=1%26size=all` | «Правда / ложь»: сессия, первая карточка · **только гость (pm clear + онбординг)** |  |
| cards-v2-034 | Сессии · Вспомни и напиши | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&uiLang=en&next=/flashcards_recall_session?deck=saved%26size=all%26dir=to_target` | «Вспомни и напиши»: сессия, первая карточка · **только гость (pm clear + онбординг)** |  |
| cards-section-046 | Устно — верно · Устно — верно | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&speech=correct&overlays=off&uiLang=en&next=/flashcards_speaking_session?deck=saved%26size=all` | «Устно — верно»: удержание микрофона подменено верным ответом (speech=correct; только русский интерфейс) · **только гость (pm clear + онбординг)** | tap:#fc-speak-mic; wait:900; tap:#fc-speak-mic; wait:1200 |
| cards-gap-010 | Карточки · Устно — «Здесь пока нечего говорить» | `phraseman://dev_state?onboarding=done&intros=seen&cards=empty&plus=on&overlays=off&uiLang=en&next=/flashcards_speaking_session?deck=saved%26size=all` | «Устно»: нечего говорить — нет карточек (cards=empty) · **только гость (pm clear + онбординг)** |  |

## Пейволы

| id | экран · состояние | ссылка | перед кадром | тапы |
|---|---|---|---|---|
| paywall-gap-001 | Пейвол Plus · Вход «Plus» из Настроек — верх (что входит) | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&energy=5&overlays=off&uiLang=en&next=/premium_modal?context=generic%26source=settings_premium` | пейвол из Настроек — верх шторки |  |
| paywall-gap-004 | Пейвол Plus · Лента пробного периода | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&energy=5&overlays=off&uiLang=en&next=/premium_modal?context=generic%26source=settings_premium%26_force_trial_ui=1%26_force_trial_days=3` | лента пробного периода (образец N=3; срок в проде — из магазина) |  |
| paywall-gap-005 | Пейвол Plus · Выбран «Месяц» | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&energy=5&overlays=off&uiLang=en&next=/premium_modal?context=generic%26source=settings_premium` | выбран план «Месяц» | tap:#paywall-plan-monthly |
| paywall-gap-009 | Пейвол Plus · Карточки — добавь свою фразу | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&energy=5&overlays=off&uiLang=en&next=/premium_modal?context=flashcard_create%26source=card_editor_create` | Карточки — добавь свою фразу |  |
| paywalls-011 | Цена и покупка · Загрузка условий | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&energy=5&overlays=off&uiLang=en&next=/premium_modal?context=generic%26source=settings_premium%26_dev_state=loading` | покупка: загрузка условий |  |
| paywalls-012 | Цена и покупка · Ошибка до checkout | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&energy=5&overlays=off&uiLang=en&next=/premium_modal?context=generic%26source=settings_premium%26_dev_state=store_unreachable` | покупка: ошибка до checkout (тост через 0,7 с) |  |
| paywalls-018 | Цена и покупка · Промо от магазина | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&energy=5&overlays=off&uiLang=en&next=/premium_modal?context=generic%26source=settings_premium%26_dev_state=store_promo` | покупка: промо от магазина |  |
| paywalls-019 | Управление действующим Plus · Управление подпиской | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&plan=yearly&overlays=off&uiLang=en&next=/manage_subscription` | управление подпиской, годовая |  |
| paywalls-023 | Управление действующим Plus · Причина отмены | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&plan=yearly&overlays=off&uiLang=en&next=/manage_subscription` | причины отмены, ничего не выбрано | tap:#manage-subscription-cancel |

## Настройки и профиль

| id | экран · состояние | ссылка | перед кадром | тапы |
|---|---|---|---|---|
| settings-gap-002 | Настройки · Главная — Plus не активна | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&next=/(tabs)/settings` | главная Настроек, Plus не активна |  |
| profile-004 | Профиль и основные настройки · языки | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&next=/settings_language` | язык интерфейса — список языков |  |
| profile-006 | Обучение и внешний вид · уведомления | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&next=/settings_notifications` | уведомления — верх |  |
| profile-007 | Обучение и внешний вид · обучение и озвучка | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&next=/settings_edu` | обучение и озвучка — верх |  |
| profile-008 | Обучение и внешний вид · темы · 13 + 10 градиентных, светлое/тёмное, насыщенность | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&next=/settings_themes` | темы |  |
| profile-011 | Обучение и внешний вид · Privacy Policy · прокручиваемый документ | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&next=/privacy_settings` | Privacy Policy (документ) | tap:#privacy-policy-row |
| profile-013 | Помощь и подписка · форма поддержки · пусто | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&next=/support_report` | форма поддержки — пусто |  |
| profile-016 | Помощь и подписка · статический пример · годовая подписка | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&plan=yearly&overlays=off&uiLang=en&next=/manage_subscription` | управление подпиской, годовая |  |

## Главная и Уроки

| id | экран · состояние | ссылка | перед кадром | тапы |
|---|---|---|---|---|
| en-home | Главная | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&next=/(tabs)/home` |  |  |
| en-lessons | Уроки — карта | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&next=/(tabs)/lessons` |  |  |

## Диалоги — итог

| id | экран · состояние | ссылка | перед кадром | тапы |
|---|---|---|---|---|
| en-dialog-completion | Итог диалога | см. dialogs-013 (сессия) |  | в сессии отправить реплику и открыть «Итоги»/«Завершить» (кнопки по testID, не по тексту) |

## Итог

Ссылок: 51. Не найдено в DEV_LINKS_R1.md: нет.
