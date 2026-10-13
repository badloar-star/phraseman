# EN-проход R1 — порядок для робота (13.10)

Английский интерфейс без глобального флага: **`dev_state?uiLang=en`** — только память, на диск и в облако не пишется, в стор-сборке
параметр отклоняется (8bae34fd7, `app/dev_ui_lang.ts`). Флаг `ENGLISH_UI_LOCALE_ENABLED` (`app/config.ts`) — решение владельца (вопрос 4).
Ссылки — из `DEV_LINKS_EN_PASS.md` (уже с `uiLang=en`) или из `DEV_LINKS_R1.md` с добавленным `uiLang=en` тем же правилом.
**Робот не запускался.** Сверка снимает после «да» владельца или в паузе между пачками (флаг dev-only, стор не затрагивает).

**На что смотреть на каждом кадре:** нет кириллицы; кнопки не переносятся по слову; текст не обрезан многоточием там, где в RU помещался; в журнале — `[I18N-FALLBACK]` (строка без английского, подставился испанский)
и `[DEV-STATE] uiLang`. Шаги `tap:Текст` по русскому тексту в английском не сработают — такие помечены ⚠️ (нужен `#testID`).

**`enStudyPrompt=off`** (3740a8eee, только память) — во всех ссылках, кроме кадра D164: иначе при «интерфейс en + изучаю en» выбор языка изучения перекрывает экран; изучаемый язык не меняется.

**Порядок:** force-stop перед каждой строкой (это не проверка смены языка «на лету» — та в `DEV_LINKS_LANG_SWITCH.md`).

## Онбординг — выбор языка и вход

| № | id | экран | ссылка | тапы | на что смотреть |
|---|---|---|---|---|---|
| 1 | onboarding-001 | Онбординг · Онбординг · Приветствие | `phraseman://dev_state?onboarding=done&intros=seen&onbstep=welcome&overlays=off&uiLang=en&enStudyPrompt=off&next=/(tabs)/home` | wait:1800 | выбор языка интерфейса: en отмечен; подписи и кнопка «Continue» — английские |
| 2 | onboarding-007 | Онбординг · Онбординг · Сейф: «Твои данные — только твои» | `phraseman://dev_state?onboarding=done&intros=seen&onbstep=privacy&overlays=off&uiLang=en&enStudyPrompt=off&next=/(tabs)/home` |  | шаг онбординга: длинные английские строки не обрезаны, кнопка внизу в одну строку |

## Главная и Уроки

| № | id | экран | ссылка | тапы | на что смотреть |
|---|---|---|---|---|---|
| 3 | en-home-001 | Главная | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&enStudyPrompt=off&next=/(tabs)/home` |  | приветствие, карточка урока, пилюли энергии и серии; числа с английскими единицами («29m») |
| 4 | en-lessons-001 | Уроки — карта | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&enStudyPrompt=off&next=/(tabs)/lessons` |  | список уроков: названия уроков, уровни, плашка экзамена |

## Карточки

| № | id | экран | ссылка | тапы | на что смотреть |
|---|---|---|---|---|---|
| 5 | cards-v2-001 | Хаб · Хаб | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=off&animations=off&overlays=off&studyTarget=en&uiLang=en&enStudyPrompt=off&next=/flashcards` |  | хаб Карточек: вкладки, счётчики, кнопка «Train» |
| 6 | cards-002 | Хаб и выбор режима · Выбор режима · окно по центру | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=off&animations=off&quota=reset&overlays=off&studyTarget=en&uiLang=en&enStudyPrompt=off&next=/flashcards` | wait:2500; tap:#fc-cards-hub-train; wait:800 | пустое состояние: текст и кнопка |
| 7 | cards-005 | Сохранённые · Список | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&uiLang=en&enStudyPrompt=off&next=/flashcards_collection?cat=saved` | tap:#fc-zoom-larger; wait:500; scroll:up | «Saved» — заголовок и счётчик, подсказки |
| 8 | cards-009 | Сохранённые · Пусто | `phraseman://dev_state?onboarding=done&intros=seen&cards=empty&plus=off&overlays=off&uiLang=en&enStudyPrompt=off&next=/flashcards_collection?cat=saved` |  | меню набора / действия: пункты меню не обрезаны |
| 9 | cards-014 | Наборы сообщества · Каталог · «Новые» | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&catalog=demo&overlays=off&studyTarget=en&uiLang=en&enStudyPrompt=off&next=/flashcards_packs` |  | каталог сообщества: вкладки «New/Popular», плашки наборов |
| 10 | cards-021 | Редактор карточки и создание набора · Новая карточка | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&uiLang=en&enStudyPrompt=off&next=/flashcards_card_editor?create=1%26cat=custom` |  | редактор карточки: подписи полей и кнопка сохранения |
| 11 | cards-v2-029 | Тренировка · Настройка — пусто | `phraseman://dev_state?onboarding=done&intros=seen&cards=empty&plus=on&studyTarget=es&overlays=off&uiLang=en&enStudyPrompt=off&next=/flashcards_training_setup?mode=blitz` |  | настройка тренировки: режимы, переключатели, «Start» |
| 12 | cards-v2-033 | Сессии · Правда / ложь | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&uiLang=en&enStudyPrompt=off&next=/flashcards_truefalse_session?deck=saved%26quick=1%26size=all` | wait:4000 | тренировка: кнопки ответа, прогресс |

## Диалоги

| № | id | экран | ссылка | тапы | на что смотреть |
|---|---|---|---|---|---|
| 13 | dialogs-001 | A. Хаб «Диалоги» · Хаб — Free | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=30&coinRank=6&overlays=off&uiLang=en&enStudyPrompt=off&next=/ai_dialog_home` |  | хаб Диалогов: пилюля лимита, категории |
| 14 | dialogs-003 | A. Хаб «Диалоги» · Категория раскрыта — все виды строк | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=30&dialogsDone=3&coinRank=6&overlays=off&uiLang=en&enStudyPrompt=off&next=/ai_dialog_home` | tap:#dialogue-v2-world-toggle-* | раскрытая категория: названия сценариев (длинные) не обрезаны |
| 15 | dialogs-007 | B. Брифинг и вход · Брифинг — цель и задания | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&coinRank=6&overlays=off&uiLang=en&enStudyPrompt=off&next=/ai_dialog_home` | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-* | брифинг: цель, кнопка «Start» |
| 16 | dialogs-013 | C. Сессия диалога · Начало — приветствие баристы | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&coinRank=6&aiConsent=granted&overlays=off&uiLang=en&enStudyPrompt=off&next=/ai_dialog_home` | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000 | сессия: поле ввода, подсказки, кнопки «Translate/Why» |
| 17 | dialogs-017 | C. Сессия диалога · Подсказка — окно | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&dquota=reset&energy=5&dev_dialog_send=ok&coinRank=6&aiConsent=granted&overlays=off&uiLang=en&enStudyPrompt=off&next=/ai_dialog_home` | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; hidekb; tap:#dialogue-v2-session-goal-hint; wait:500 | шторка в сессии: заголовок и действия |
| 18 | en-dialog-completion-001 | Итог диалога (завершён вручную) | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&coinRank=6&aiConsent=granted&studyTarget=en&dev_dialog_completion=clean&overlays=off&uiLang=en&enStudyPrompt=off&next=/ai_dialog_home` | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; tap:#dialogue-v2-session-more; tap:#dialogue-v2-session-menu-complete; wait:3000 | итог диалога: заголовок, разбор ошибок |

## Шпиль — вход

| № | id | экран | ссылка | тапы | на что смотреть |
|---|---|---|---|---|---|
| 19 | community-001 | Вкладка и Шпиль · вкладка сообщества | `phraseman://dev_state?onboarding=done&intros=seen&spire=open&plus=off&free=on&cards=demo&overlays=off&studyTarget=en&uiLang=en&enStudyPrompt=off&next=/(tabs)/community` | tap:#community-sections-spire; wait:800 | вкладка Сообщества → Шпиль: при uiLang=en Шпиль закрыт для языка (п.76) — экран «закрыто», без русского |

## Пейволы

| № | id | экран | ссылка | тапы | на что смотреть |
|---|---|---|---|---|---|
| 20 | paywall-gap-001 | Пейвол Plus · Вход «Plus» из Настроек — верх (что входит) | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&energy=5&overlays=off&uiLang=en&enStudyPrompt=off&next=/premium_modal?context=no_energy%26source=no_energy_modal` |  | пейвол «You’re out of energy»: заголовок, преимущества, цены из стора |
| 21 | paywall-gap-005 | Пейвол Plus · Выбран «Месяц» | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&energy=5&overlays=off&uiLang=en&enStudyPrompt=off&next=/premium_modal?context=no_energy%26source=no_energy_modal` | tap:#paywall-plan-monthly | выбран месяц: кнопка «Subscribe for … per month» в одну-две строки |
| 22 | paywalls-011 | Цена и покупка · Загрузка условий | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&energy=5&overlays=off&uiLang=en&enStudyPrompt=off&next=/premium_modal?context=no_energy%26source=no_energy_modal%26_dev_state=loading` |  | загрузка условий |
| 23 | paywalls-019 | Управление действующим Plus · Управление подпиской | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&plan=yearly&overlays=off&uiLang=en&enStudyPrompt=off&next=/manage_subscription` |  | управление подпиской: годовая |
| 24 | paywalls-023 | Управление действующим Plus · Причина отмены | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&plan=yearly&overlays=off&uiLang=en&enStudyPrompt=off&next=/manage_subscription` | tap:#manage-subscription-cancel | причины отмены: пункты списка |

## Профиль и Настройки

| № | id | экран | ссылка | тапы | на что смотреть |
|---|---|---|---|---|---|
| 25 | settings-gap-002 | Настройки · Главная — Plus не активна | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&enStudyPrompt=off&next=/(tabs)/settings` | wait:1200; see:#settings-plus-row; scroll:down; scroll:down; wait:500 | главная Настроек: группы, «PHRASEMAN PLUS», версия |
| 26 | profile-004 | Профиль и основные настройки · языки | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&enStudyPrompt=off&next=/settings_language` |  | профиль: карточка, ранги |
| 27 | profile-006 | Обучение и внешний вид · уведомления | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&enStudyPrompt=off&next=/settings_notifications` |  | профиль: визитка |
| 28 | profile-011 | Обучение и внешний вид · Privacy Policy · прокручиваемый документ | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&enStudyPrompt=off&next=/privacy_settings` | tap:#privacy-policy-row | профиль: раздел |
| 29 | profile-003 | Профиль и основные настройки · смена имени · шторка | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&namecheck=none&overlays=off&uiLang=en&enStudyPrompt=off&next=/account_details` | tap:#account-change-name | смена имени: шторка над клавиатурой, подсказки |
| 30 | settings-gap-024 | Настройки · Имя — проверяем | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&namecheck=checking&overlays=off&uiLang=en&enStudyPrompt=off&next=/account_details` | tap:#account-change-name; tap:#nickname-input; key:MOVE_END; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; key:DEL; type:Alexey | смена имени: «checking…» |

## Уведомления

| № | id | экран | ссылка | тапы | на что смотреть |
|---|---|---|---|---|---|
| 31 | settings-gap-028 | Настройки · Уведомления — окно выбора времени | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&robot_no_cloud=1&overlays=off&uiLang=en&enStudyPrompt=off&next=/settings_notifications` | tap:#notif-master-switch; wait:500; tap:#notif-daily-switch; wait:500; tap:#notif-time-label; wait:700 | окно выбора времени напоминания |
| 32 | system-015 | Сообщения · Входящие — пусто | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&enStudyPrompt=off&next=/(tabs)/home` | scroll:up; wait:400; wait:1500; tap:#home-notification-center-button; await:#notification-center-screen; wait:600 | входящие (пусто): заголовок, пустое состояние |

## Выбор языка изучения D164 (единственный кадр БЕЗ enStudyPrompt=off)

| № | id | экран | ссылка | тапы | на что смотреть |
|---|---|---|---|---|---|
| 33 | en-d164-lang-choice-001 | Хаб «Диалоги» — выбор языка изучения (интерфейс en + изучаю en) | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=30&coinRank=6&overlays=off&uiLang=en&next=/ai_dialog_home` |  | хаб Диалогов при паре «интерфейс en + изучаю en»: окно выбора языка изучения — английские подписи, кнопки не обрезаны |

## Вход, аккаунт, удаление

| № | id | экран | ссылка | тапы | на что смотреть |
|---|---|---|---|---|---|
| 34 | auth-gap-001 | Аккаунт · Аккаунт — гость | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&enStudyPrompt=off&next=/account_details` |  | «Аккаунт» гостя: «Link account», «Sign out» |
| 35 | auth-gap-003 | Вход · Окно входа — телефон уже связан с другим аккаунтом | `phraseman://dev_state?onboarding=done&intros=seen&switch=required&overlays=off&uiLang=en&enStudyPrompt=off&next=/account_details` | tap:#account-link-row; tap:#auth-google-button; wait:1500 | окно входа: нужна смена аккаунта |
| 36 | auth-gap-008 | Вход · Аккаунт удалён | `phraseman://dev_state?onboarding=done&intros=seen&restore=retired&overlays=off&uiLang=en&enStudyPrompt=off&next=/account_details` | tap:#account-link-row; tap:#auth-google-button; wait:1500 | «Account deleted» |
| 37 | settings-gap-016 | Настройки · Приватность — ИИ выключен | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&enStudyPrompt=off&next=/privacy_settings` |  | приватность: заголовки согласий |
| 38 | profile-012 | Обучение и внешний вид · Terms · прокручиваемый документ | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&uiLang=en&enStudyPrompt=off&next=/privacy_settings` | tap:#privacy-terms-row | Terms of Use — прокручиваемый документ (удаление снимают auth-gap-009/010) |
| 39 | auth-gap-009 | Аккаунт · Удалить аккаунт? — с входом (14 дней) | `phraseman://dev_state?onboarding=done&intros=seen&delete=fail&account=linked&overlays=off&uiLang=en&enStudyPrompt=off&next=/account_details` | see:#account-delete-button; tap:#account-delete-button | «Delete account?» с «14 days» — НЕ подтверждать |
| 40 | auth-gap-010 | Аккаунт · Удалить аккаунт? — гость | `phraseman://dev_state?guest=required&onboarding=done&intros=seen&delete=fail&overlays=off&uiLang=en&enStudyPrompt=off&next=/account_details` | see:#account-delete-button; tap:#account-delete-button | гость: «Progress will be deleted» — НЕ подтверждать |

## Итог

Строк: 40. Не нашлось ссылки: нет.
