# Список съёмки первого выпуска — вход/аккаунт, онбординг, язык, Настройки, Plus-группа

Governance-ID: TG-A280B7BED1F1

Часть A: 148 строк реестра, группы G-A01…G-A13.

> Все пути выведены из КОДА (основное дерево, testID, dev_state, dev-переключатели); на устройстве не проверены — Сверка уточняет по ходу съёмки и пишет расхождения координатору.
> Индекс, порядок съёмки, общие правила и сводка «нет пути» — в `R1_SHOT_LIST.md`.

# Список съёмки · область A (вход/аккаунт, онбординг, язык, настройки, Plus-группа настроек)

Источник путей: только код основного дерева `C:\appsprojects\phraseman` (строки `файл:строка` — по состоянию на сейчас). Макеты — `docs/design/v2-app/`. Реестр: 148 строк (`shots_in_A.tsv`).
Условные обозначения: «ДС» = dev_state-ссылка `adb shell am start -a android.intent.action.VIEW -d "phraseman://dev_state?...\&next=/(tabs)/home"`; тап по testID/тексту — через `uiautomator dump`. Тема везде по умолчанию (тёмная, «Спокойно») — отдельно оговорено только для `profile-008`.
Пометки: **НЕТ ПУТИ** — состояния нельзя вызвать на устройстве; **В КОДЕ НЕТ** — макет рисует то, чего в коде нет/недостижимо (дефект образца/кода); **УСЛОВНО** — путь есть, но нужна подготовка вне приложения (коды в админке, сбой сети, разрешение владельца) или вызов не гарантирован.

## Что полезно знать до начала (находки по коду, влияют на съёмку)

1. **Плюс-переключатель dev_state неполный.** `plus=on|off` пишет только локальный override (`app/dev_plus_controls.ts:16-31`): `isVip=false`, `isPro=false`, `isIntroFullAccess=false`. Значит им нельзя получить плашки «Промокод / Plus за приглашения / Выданный Pro» и значение «Год/Месяц» в строке Plus (оно берётся из `premium_plan`, `settings.tsx:743-747`; пишет его только покупка в сторе). Вернуть override в «не задано» нельзя (в `setDevLocalPlusOverride` только `granted|removed`) — только `pm clear`.
2. **После онбординга новичку автоматически выдаётся «3 дня полного доступа»** (`app/_layout.tsx:2985-2994`) — поэтому у чистого гостя Plus-строка «Активна» и в Настройках есть плашка «Полный доступ на 3 дня» (`settings.tsx:718-725`). Для кадра «Plus не активна» обязательно `plus=off`. Кадр с плашкой снимать ДО любого `plus=`.
3. **Выход из аккаунта мгновенный** (решение владельца 31.08/12.10): кнопка `account-logout-button` сразу ставит стадию `wiping` (`account_details.tsx:347`), окно подтверждения «Выйти из аккаунта?» в приложении недостижимо (стадия `confirm` нигде не ставится). Сценарий `AUTH_RELEASE1_TEST_SCENARIO` шаги C1–C3 (окно «Выйти/Отмена») **устарели**.
4. **Окно «Сменить аккаунт?» (Настройки)** открывается только двумя способами: кнопка `auth-switch-account` в окне входа после отказа (`RegistrationPromptModal.tsx:1696-1700`) или параметр `switchAccount=1` у вкладки Настроек (`account_switch_copy.ts:144`, `settings.tsx:482-492`). Отдельного пункта «Сменить аккаунт» в Настройках нет.
5. **Цены в онбординге в dev-сборке — только справочные «≈»**: `DEV_IAP_BYPASS` не даёт грузить магазин (`paywall_purchase.ts:617`), порядок выбора цены «магазин → кэш → справочная → демо» (`paywall_reference_prices.ts:90-98`). «Настоящая цена» и «загрузка» недостижимы.
6. **Насыщенность темы — ползунок**, а не три кнопки «Спокойно/Акцент/Максимум» (`settings_themes.tsx:225`, `ThemeIntensitySlider.tsx:164`, `testID=theme-intensity-slider`).
7. **Экран «Уровень» в онбординге выключен** (`CleanOnboarding.tsx:217`, `SHOW_ONBOARDING_LEVEL_STEP=false`); порядок шагов в коде: welcome → privacy(сейф) → niceToMeet → promise → improve → source → language → notifications → name(«Почти готово») → trialReminder → onboardingPaywall (`CleanOnboarding.tsx:231-244`). В макете «Прогресс» стоит после «Знакомства» — совпадает; «Какой язык учим?» после «Как ты узнал» — совпадает.
8. **Слот сообщений/опрос в Настройках — полностью серверный** (Firestore `app_messages`, `settings_message_slots.ts:62-80`), dev-подмены нет. Без кампаний в админке кадры слота не снять.
9. **В экране «Управление подпиской» есть кнопки, уводящие в Google Play** (`openStoreCancel`, `manage_subscription.tsx:608-630`): «Продолжить» при причине «Другое» (шаг удержания = `none`) и `manage-subscription-offer-decline`. НЕ жать — приложение уйдёт во внешний магазин. Для кадров достаточно открыть шит и снять до нажатия.
10. **Нет testID на переключателях** «Уведомления» (`settings_notifications.tsx:162-181`), «Приватность» (`privacy_settings.tsx:56-76`), «Настройки обучения» (`settings_edu.tsx:56-97`, кроме `fc-sfx-toggle`/`fc-autospeak-toggle`) — искать по content-desc = подпись; на окне времени кнопка «OK» без testID (`settings_notifications.tsx:143-145`). Предложение «Ядру»: добавить testID.
11. **Dev-сборка показывает в «Язык интерфейса» 9 строк** (8 + выключенная, `constants/i18n.ts:111-118`); макет рисует 8 (стор). Лишняя строка с замком — не ошибка.

## Группы маршрутов

Рекомендуемый порядок: **G-A01 → G-A02 → G-A03 → G-A04 → G-A05 → G-A09 → G-A06 → G-A07 → G-A13 → G-A10 → G-A08 → G-A11 → G-A12**. Причина: G-A01–G-A09 идут под гостём (без входа), `plus=` включаем только после кадра «3 дня» (G-A01), после G-A09 язык обучения возвращается на English, вход тестовым Google-аккаунтом C делаем один раз в G-A10.

---

### G-A01 · Онбординг как гость (чистая установка) + плашка «3 дня полного доступа»
**Подготовка.** `adb shell pm clear app.phraseman` → запуск dev-клиента (Metro :8081, `adb reverse tcp:8081 tcp:8081`). Онбординг стартует сам (повторно — ДС `onboarding=pending\&next=/(tabs)/home`, `dev_state_fixtures.ts:108-115`). Вход: гость. Тема по умолчанию. Режим сети меняется командой `adb shell cmd connectivity airplane-mode enable|disable` (запасной вариант: `adb shell svc wifi disable; adb shell svc data disable`). Перед `onboarding-004` и `onboarding-008` — авиарежим ВКЛ, сразу после кадра ВЫКЛ.
**Путь.**
1. Первый экран: `onboarding-welcome-screen` (CleanOnboarding.tsx:3393) → кадр **onboarding-001**.
2. Тап `onboarding-existing-account` (:3499) → экран входа → кадр **onboarding-002** (кнопки «Войти через Google»; Apple на Android — если заданы `EXPO_PUBLIC_APPLE_ANDROID_*`).
3. Авиарежим ВКЛ → тап по кнопке с текстом «Войти через Google» (testID у неё нет) → красная строка ошибки → кадр **onboarding-004** (текст зависит от кода: «Связь пропала. Попробуй ещё раз.» только при `network-request-failed`, `CleanOnboarding.tsx:460`; иначе «Не получилось войти…» — УСЛОВНО). Авиарежим ВЫКЛ; `onboarding-auth-back` (:3473).
4. Тап `onboarding-start` (:3496) → сейф `onboarding-privacy-screen` → кадр **onboarding-007**.
5. Авиарежим ВКЛ → тап «Продолжить с Google» → ошибка под кнопками → кадр **onboarding-008** (тот же УСЛОВНО-оговорка про текст); авиарежим ВЫКЛ.
6. Тап `onboarding-privacy-later` (:3569) («Позже») → `onboarding-niceToMeet-screen` → кадр **onboarding-009** (без имени: «Приятно познакомиться!»; вариант с именем — G-A10). Тап `onboarding-nice-continue` (:3593).
7. `onboarding-promise-screen` → кадр **onboarding-011**; `onboarding-promise-continue` (:3682).
8. `onboarding-improve-screen` → кадр **onboarding-012**; `onboarding-improve-continue` (:3695).
9. `onboarding-source-screen` → кадр **onboarding-013** (кнопка «Продолжить» неактивна); тап `onboarding-source-tiktok` (:3621) → кадр **onboarding-014**; `onboarding-source-continue` (:3613).
10. `onboarding-language-screen` → кадр **onboarding-015** (карточки `onboarding-language-<fr|es|en|de|it>`, :945); оставить English; `onboarding-language-continue` (:3636).
11. `onboarding-notifications-screen` → кадр **onboarding-018**; тап `onboarding-notifications-skip` (:3715) («Не сейчас» — системное окно разрешения не возникает; разрешение выдаём/отзываем позже в G-A04).
12. `onboarding-name-screen` («Почти готово») → кадр **onboarding-019** (кнопка «Продолжить» неактивна). Тап `onboarding-age-no` (:4129) → кадр **onboarding-021**; тап `onboarding-age-yes` (:4119) → кадр **onboarding-020**; `onboarding-finish` (:4074).
13. `onboarding-trialReminder-screen` → кадр **onboarding-022**; `onboarding-trial-reminder-continue` (:3763).
14. `onboarding-onboardingPaywall-screen` → кадр **onboarding-024** (= **onboarding-paywall-002**: цены с «≈», disclosure «цена в магазине», `CleanOnboarding.tsx:3819-3860`). Закрыть крестиком `onboarding-paywall-close` (:606) — «Продолжить бесплатно».
15. После закрытия через ~2 с — приветственная модалка «3 дня полного доступа» (`_layout.tsx:2994`, `IntroFullAccessModal`) — закрыть. Затем Настройки (`tab-settings`) → прокрутить до группы «PHRASEMAN PLUS» → плашки `settings-plus-access-details` (settings.tsx:815) → кадр **settings-gap-005** (ЧАСТИЧНО: плашка «Полный доступ на 3 дня» есть, плашки «Plus за приглашения» нет; ДС с `plus=` не вызывать до этого кадра).
**Кадры в группе.** onboarding-001, 002, 004, 007, 008, 009, 011, 012, 013, 014, 015, 018, 019, 020, 021, 022, 024, onboarding-paywall-002, settings-gap-005 (частично).
**Оценка: 30 мин** (подготовка 4 + ~20 кадров × 1,3).

---

### G-A02 · Гость: «Аккаунт», смена имени, окно удаления
**Подготовка.** Продолжение G-A01 (гость, без `plus=`). Для 025/026 нужна сеть. Имя, которое придумываем для сохранения: `Сверка Тест` (его же используем в G-A11 для кадра «занято»; сохранение вешает на аккаунт кулдаун 14 дней).
**Путь.**
1. `tab-settings` → `settings-account-row` (settings.tsx:956) → экран «Аккаунт»: кадр **auth-gap-001** (виден `account-link-row`, account_details.tsx:310; нет `account-email-row`/«Способ входа»/`account-logout-button`) и **profile-002** (гостевой вариант; с Google — G-A10).
2. Тап `account-change-name` (account_details.tsx:243) → шторка: кадр **profile-003** (поле `nickname-input`, NicknameEditModal.tsx:445, текущее имя).
3. Очистить поле → тап `nickname-save` (:520) → inline-окно «Введи имя» (`GlassInlineAlert`) → кадр **settings-gap-032**.
4. Ввести `A` → `nickname-save` → «Минимум 2 символа» → кадр **settings-gap-033**.
5. Ввести `Sverka7421` (уникальное) и ждать ответ проверки (600 мс задержка + сеть, NicknameEditModal.tsx:71,156-173):
   - серия скриншотов каждые 0,3 с сразу после ввода → «Проверяем имя…» (`nickname-availability`, :485) — кадр **settings-gap-024** (УСЛОВНО: окно короткое; для удержания `adb emu network delay gprs`/`umts` перед вводом, потом `adb emu network delay none`);
   - после ответа «Имя свободно» → кадр **settings-gap-025**.
6. Авиарежим ВКЛ → ввести другое уникальное имя → после неудачи проверки «Проверим при сохранении» + «Сохранить» активна → кадр **settings-gap-031** (УСЛОВНО: должен прийти статус `error`, :161); авиарежим ВЫКЛ.
7. Ввести `Сверка Тест` → `nickname-save` (имя сохраняется, кулдаун запущен) — подготовка для G-A11.
8. Тап `account-delete-button` (:352) → окно «Удалить аккаунт?» для гостя («Прогресс удалится безвозвратно…», без «14 дней», DeleteAccountConfirmModal.tsx:79) → кадр **auth-gap-010**. НЕ вводить «УДАЛИТЬ»; `delete-account-cancel` (:477).
**Кадры в группе.** auth-gap-001, profile-002, profile-003, settings-gap-024, 025, 031, 032, 033, auth-gap-010.
**Оценка: 12 мин.**

---

### G-A03 · Настройки: главная, Plus-статусы (dev), темы, язык интерфейса, кеш, опрос-заглушка
**Подготовка.** Гость. ДС: `plus=off` (для «не активна») и затем `plus=on` (для «активна»): `phraseman://dev_state?plus=off\&next=/(tabs)/home` → `dev-state-done`. Слот сообщений серверный (см. нет пути).
**Путь.**
1. ДС `plus=off` → `tab-settings` (V2TabBar.tsx:410) → `screen-settings` (settings.tsx:886) → кадр **profile-001** (верх: заголовок + монета, `settings-profile-card` :916, группы «ПРОФИЛЬ/ОБУЧЕНИЕ/PHRASEMAN PLUS/ПОМОЩЬ», подвал «Версия … · Dev Hub»).
2. Прокрутка к `settings-plus-row` (:1126): «Подписка Plus · Не активна», `settings-promo-code-row`, `settings-invite-banner` → кадр **settings-gap-002**.
3. ДС `plus=on` → Plus-строка «Подписка Plus · Активна» (значения «Год/Месяц» недостижимы) → кадр **settings-gap-003** (ЧАСТИЧНО: значение «Активна» вместо «Год»).
4. `settings-language-row` (:964) → `settings-language-screen` (settings_language.tsx:55) → кадр **profile-004** и **settings-gap-018** (8 живых строк + лишняя выключенная; внизу блок «Язык изучения» `settings-language-study-row`, :118). Назад `settings-language-back`. Язык интерфейса НЕ менять (если менять — вернуть русский).
5. `settings-themes-row` (:1016) → `/settings_themes`: кадр **profile-008** — снять: (а) тёмная/Спокойно (по умолчанию), (б) тап `theme-appearance-light` (settings_themes.tsx:96) → светлая, (в) перетащить `theme-intensity-slider` вправо до упора → «Максимум», (г) прокрутка до блока градиентных тем (10). Вернуть: `theme-appearance-dark`, ползунок влево.
6. «Очистить кеш» (`settings-clear-cache-row`, :1229) → окно «Очистить кеш?» → «Очистить»: сразу серия скриншотов (`adb exec-out screencap` каждые ≈0,3 с) → подпись «Чистим…» (кадр **settings-gap-007** по части кеш-статуса), затем «Готово» ≈2,2 с (settings.tsx:441, кадр **settings-gap-008** по части статуса). Слот-опрос на этих кадрах серверный (НЕТ ПУТИ без кампании); «Не удалось» (**settings-gap-009**) — НЕТ ПУТИ (`clearAppCaches` возвращает `ok:false` только при сбое AsyncStorage, `cache_reset.ts:109-114`).
7. ДС `next=/survey_screen` (без параметров) → экран «Сейчас опрос недоступен» (`survey-fallback-empty`, survey_screen.tsx:319; выход `survey-fallback-ok` :372) → кадр **profile-025**.
**Кадры в группе.** profile-001, 004, 008, 025, settings-gap-002, 003 (частично), 007/008 (только статус кеша), 018.
**Оценка: 18 мин.**

---

### G-A04 · Настройки → Уведомления
**Подготовка.** Гость, `plus=on` не обязателен. Состояние разрешения: после G-A01 разрешение Android НЕ запрашивалось → мастер выкл (миграция, `notifications.ts:1284`). Android 13+ (API 33+) — окно разрешения; на более старом API кадр **settings-gap-012** недостижим.
**Путь.** `settings-notifications-row` (settings.tsx:1006) → `/settings_notifications` (переключатели без testID — искать по content-desc: «Разрешить уведомления» :473, «Ежедневное напоминание» :480, «Время» :481).
1. Мастер выключен (исходно): строки приглушены (opacity .45) → кадр **settings-gap-013**.
2. Включить «Разрешить уведомления» → системное окно → «Не разрешать» → красная плашка `notif-permission-denied-label` (:456) → кадр **settings-gap-012** (путь без `pm revoke`; альтернатива: `adb shell pm revoke app.phraseman android.permission.POST_NOTIFICATIONS` при включённом мастере и переход на экран заново).
3. Выдать разрешение: `adb shell pm grant app.phraseman android.permission.POST_NOTIFICATIONS`, перезайти на экран (плашка исчезает) и убедиться, что мастер включён.
4. Прокрутка вниз → «Итоги месяца», блок «Ещё» → кадр **settings-gap-011** (`sectionMore` :359, `offersLabel` :364).
5. Выключить «Ежедневное напоминание» → строка «Время» приглушена и не нажимается → кадр **settings-gap-027**; включить обратно.
6. Тап «Время» → окно с барабанами (`TimeModal`, :106-150; «Отмена» и «OK» по тексту) → кадр **settings-gap-028**.
7. Прокрутить часы на +1 (с 19 до 20) → «OK» → сразу (≤1,4 с, `flashSaved` :269) снять: «Сохранено» + «Время 20:00» → кадры **settings-gap-010** и **profile-006** (общий вид экрана).
**Кадры в группе.** profile-006, settings-gap-010, 011, 012, 013, 027, 028.
**Оценка: 12 мин.**

---

### G-A05 · Настройки → Обучение, Приватность, документы, Поддержка
**Подготовка.** Гость. Для голоса — на эмуляторе должен быть установлен хотя бы один английский голос TTS. Для кадра «диагностика раскрыта» нужны события в журнале (после предыдущих групп они есть). Сеть нужна для отправки.
**Путь — Обучение.** `settings-edu-row` (settings.tsx:997) → `/settings_edu`:
1. Верх экрана (блоки «ОТВЕТ», «ЗВУК», тумблеры `fc-sfx-toggle`, `fc-autospeak-toggle`, settings_edu.tsx:273,281) → кадры **profile-007** и **settings-gap-014**.
2. Прокрутка вниз: ползунок скорости и строка `fc-voice-picker-row` («Голос озвучки (EN) … Системный», :388) → кадр **settings-gap-015**.
3. Тап `fc-voice-picker-row` → `/flashcards_voice_picker`: выбрать голос `fc-voice-row-<id>` (flashcards_voice_picker.tsx:189) → назад → в строке имя голоса → кадр **settings-gap-034** (имя — как отдаёт TTS эмулятора; в макете «Samantha» — iOS, на Android имя другое).
**Путь — Приватность.** `settings-privacy-row` (:1220) → `/privacy_settings`. Тумблеры — по content-desc («Отправлять данные об использовании» :205, «AI-разбор ошибок» :207, «AI-диалоги» :208). Записать исходное состояние и вернуть его.
4. «Данные об использовании» выкл, ИИ выкл → кадр **profile-009**; включить аналитику → заметка под тумблером меняется → кадр **profile-010**.
5. Аналитика ВКЛ, оба ИИ-тумблера ВЫКЛ → кадр **settings-gap-016**.
6. Аналитика ВЫКЛ, ИИ-тумблеры ВКЛ + прокрутка до «Документы»/«Аккаунт» (`privacy-delete-account`, :398; НЕ нажимать) → кадр **settings-gap-017**.
7. `privacy-policy-row` (:369) → `/privacy_screen` → прокрутка `legal-document-scroll` (LegalDocumentSheet.tsx:147) → кадр **profile-011**; назад → `privacy-terms-row` (:381) → кадр **profile-012**.
**Путь — Поддержка.** `settings-support-report-row` (:1210) → `/support_report`:
8. Пусто → кадр **profile-013**.
9. Ввести `Нет звука` (9 символов; порог 10, `error_report.ts:40`) → «Отправить» неактивна, диагностика свёрнута → кадр **settings-gap-035**.
10. Ввести `ТЕСТ СВЕРКИ — игнорировать` → тап `support-diagnostics-preview-toggle` (:192; есть только если в журнале есть события) → кадры **profile-014** и **settings-gap-022**.
11. Тап `support-report-submit` (:238) → экран «Обращение отправлено» (`support-report-done` :132) → кадры **profile-015** и **settings-gap-023**. **ВНИМАНИЕ: реальная отправка в поддержку** — нужно «да» координатора; текст помечен как тест.
12. «Не отправилось / Повторить» (**settings-gap-036**) — НЕТ ПУТИ: без сети обращение уходит в очередь и экран всё равно показывает успех (`support_report_outbox.ts:353-404`); `failed` только когда не работает ни очередь, ни прямая отправка.
**Кадры в группе.** profile-007, 009, 010, 011, 012, 013, 014, 015, settings-gap-014, 015, 016, 017, 022, 023, 034, 035.
**Оценка: 25 мин.**

---

### G-A06 · Plus: «Управление подпиской» и отмена
**Подготовка.** Гость, ДС `plus=on\&next=/(tabs)/home`. Вход в экран: Настройки → `settings-plus-row` (settings.tsx:1126) при активном Plus открывает `/manage_subscription?source=settings` (:756-763). Альтернатива без Plus-строки: Dev Hub (`settings-dev-hub-button`, :1276) → раздел «Отписка» (`dev-hub-section-cancel-flow`) → «Живой экран подписки» `dev-open-manage-subscription` (devToolRegistry.ts:510) или «Сценарии удержания» `dev-open-cancel-flow` (:500). Экран `manage-subscription-title` (manage_subscription.tsx:727).
**Путь.**
1. Сразу после открытия — серия скриншотов 0,3 с: скелетон `manage-subscription-loading` (:757) → кадры **profile-019 / paywalls-020** (УСЛОВНО: виден, пока нет сохранённого плана и идёт `initRevenueCat`/`getCustomerInfo`, :345-388; в dev может быть мгновенным; авиарежим ВКЛ перед открытием продлевает).
2. Загруженный экран: «Plus активирован · Подписка Plus» (без «Годовая/Месячная», без «Следующее списание») + «Что включено», `manage-subscription-restore` (:820), `manage-subscription-cancel` (:843). Это ближайшее к **profile-016 / paywalls-019** (годовая), **profile-017** (месячная, нужна ещё `manage-subscription-change-plan`) и **profile-018 / paywalls-021** (разовая) — сами варианты НЕТ ПУТИ.
3. Тап `manage-subscription-cancel` → шит «Почему уходишь?» → кадр **profile-020 / paywalls-023** (причины `manage-subscription-reason-<ключ>`, :882).
4. Тап `manage-subscription-reason-other` → поле `manage-subscription-reason-other-input` (:898) → ввести текст → кадр **profile-021**. НЕ жать `manage-subscription-reasons-continue` (:908) — для «Другое» уйдёт в Google Play.
5. Выбрать причину «Слишком дорого/Не пользуюсь/Временно» + `manage-subscription-reasons-continue` → шаг «Сохранить доступ или отменить» с прогрессом → кадры **profile-022 / paywalls-024**. Прогресс берётся из прогретой Главной (`manage_subscription.tsx:650-656`): у чистого гостя прогресса нет → предложение `none` → УХОД В МАГАЗИН. Надёжный путь: Dev Hub → «Отписка» → «Сценарии удержания» (`app/_dev_cancel_flow_preview.tsx`, пресеты «ПРОГРЕСС: обычный/новичок/рекордный/пусто», сценарии «Слишком дорого …») — это и есть «демо».
6. Причина «Не хватает функций/Технические проблемы» + «Продолжить» → шаг «Поддержка или отмена» → кадры **profile-023 / paywalls-025** (кнопка `manage-subscription-offer-accept` ведёт в `/support_report`; `manage-subscription-offer-decline` — в Google Play, НЕ жать).
7. `manage-subscription-restore` → оверлей «Покупок не найдено» (`manage-subscription-restore-support`/`-close`, :1029,1042) → **profile-024 / paywalls-022**. УСЛОВНО/вероятно НЕТ ПУТИ: оверлей показывается, только когда `Purchases.restorePurchases()` отработал без покупок (`manage_subscription.tsx:526-530`); на эмуляторе без Google Play вместо него будет тост «Сейчас не удалось проверить покупки» (:559-585).
**Кадры в группе.** profile-016…024, paywalls-019…025 (дубли: 019=016, 020=019, 021=018, 022=024, 023=020, 024=022, 025=023).
**Оценка: 15 мин.**

---

### G-A07 · Plus: промокод (+ плашка «Промокод» в Настройках)
**Подготовка.** Гость, сеть включена. Серверные коды заводит владелец/админка (коллекция `promo_codes`, поля `rewardDays`, `rewardKind`, `enabled`, `maxRedemptions`, `expiresAtMs`; `functions/src/promo_codes.ts:80-116`). Нужны: **D30** (30 дней), **LIFE** (rewardKind=lifetime), **EXP** (expiresAtMs в прошлом), **LIM** (maxRedemptions=1, usedCount=1). Формат кода `[A-Z0-9_-]{3,32}`. Без этих кодов снимаются только кадры 004, 005, 009, 015.
**Путь.** Настройки → `settings-promo-code-row` (settings.tsx:1137) → `/promo_code_entry?source=settings` (`screen-promo-code-entry`, promo_code_entry.tsx:321); поле `promo-code-input` (:362), кнопка `promo-code-submit` (:381), плашка `promo-code-feedback` (:409).
1. Пусто → кадр **overlays-campaigns-004**.
2. Ввести `PHRASE20` (формат верный, кнопка активна, рамка поля подсвечена) → кадр **overlays-campaigns-005**.
3. Тап «Активировать» с несуществующим `ZZZ99999` → «Такой код не найден…» → кадр **overlays-campaigns-009** (серия скриншотов 0,3 с до ответа даст «Активируем…» → **overlays-campaigns-006**, УСЛОВНО: окно короткое; `adb emu network delay umts` продлевает).
4. Авиарежим ВКЛ → ввести любой валидный код → «Сейчас не получилось активировать код…» → кадр **overlays-campaigns-015**; авиарежим ВЫКЛ.
5. Код `EXP` → «Срок действия кода истёк.» → **overlays-campaigns-010**. Код `LIM` → «Лимит активаций исчерпан.» → **overlays-campaigns-011**.
6. Код `D30` → «Готово! Plus … на 30 дн.» + праздничная модалка → кадр **overlays-campaigns-007**; повторить `D30` → «Ты уже активировал этот код.» → **overlays-campaigns-012**. Закрыть модалку (`VipCelebrationModal`) → Настройки: плашка «Промокод · Действует до …» (`settings-vip-card`, settings.tsx:713) → кадр **settings-gap-004**.
7. Код `LIFE` → «…активирована навсегда» → **overlays-campaigns-008** (плашка «Промокод · Plus без срока окончания»).
8. «Неверный формат» (**overlays-campaigns-013**) — В КОДЕ НЕТ: при неверном формате кнопка просто выключена, сообщения нет (`promo_code_entry.tsx:236-240`; `bad_code` приходит только с сервера). «Отключён» (**overlays-campaigns-014**, `promo_disabled` — глобальный рубильник, :102-113) — НЕТ ПУТИ без смены remote-config (код с `enabled:false` показывает текст «не найден»).
9. Вариант онбординга (макеты называются «Промокод онбординга»): меню `onboarding-paywall-menu` → `onboarding-paywall-menu-promo` (CleanOnboarding.tsx:3872, 2186) → окно `onboarding-code-input`/`onboarding-code-submit` (:4011,4038) — отдельная вёрстка, в реестре привязана к `promo_code_entry.tsx`; снимать при сомнении ЭКРАН `promo_code_entry`.
**Кадры в группе.** overlays-campaigns-004…015 (013, 014 — нет), settings-gap-004.
**Оценка: 15 мин** (с кодами; без них 6 мин).

---

### G-A08 · Plus: код друга / приглашения
**Подготовка.** Гость (без входа), сеть. Нужен **код приглашения другого аккаунта** (виден на `/referrals` под ним: `referrals-my-code-value`, referrals.tsx:807) — взять у координатора/владельца или считать в G-A11 под аккаунтом №2. Раздел должен быть включён рубильником (иначе нет и строки `settings-invite-banner`). Вход на экран: Настройки → `settings-invite-banner` (settings.tsx:1149) → `/referrals` (`screen-referrals`) → `referrals-enter-code` (referrals.tsx:742) или сразу ДС `next=/referrals%3Fenter%3D1` (шит откроется, :241).
**Путь** (шит `referral-code-sheet`, поле `referral-code-sheet-input`, кнопка `referral-code-sheet-submit`, плашка `referral-code-sheet-feedback`; referral_code_sheet.tsx:239,262,284,314).
1. Пусто → **overlays-campaigns-016**.
2. Ввести ≥4 символа → кнопка «Применить код» активна → **overlays-campaigns-017**.
3. Серия скриншотов после тапа → «Применяем…» → **overlays-campaigns-018** (УСЛОВНО, окно короткое).
4. Чужой код на НОВОМ аккаунте → «Код принят…» → **overlays-campaigns-019**; повторить тот же код → «Код уже привязан…» → **overlays-campaigns-020** (УСЛОВНО: решение «аккаунт новый» принимает сервер, `referral_bootstrap.ts:221`).
5. Несуществующий `ZZZZ9999` → «Такой код не найден…» → **overlays-campaigns-022**.
6. Свой код (`referrals-my-code-value`) → «Это твой код…» → **overlays-campaigns-023**.
7. Старый аккаунт (с активностью) + чужой код → «Этот код можно ввести только на новом аккаунте» → **overlays-campaigns-024** (УСЛОВНО, вердикт сервера).
8. Авиарежим ВКЛ → «Не получилось применить код…» (или «Код сохранён…», если ушёл в очередь — `needs_link`) → **overlays-campaigns-026** (УСЛОВНО).
9. «Неверный формат» (**overlays-campaigns-021**) — В КОДЕ НЕТ: до 4 символов кнопка выключена, статус `invalid` недостижим (`referral_code_sheet.tsx:191`). «Отключён» (**overlays-campaigns-025**) — НЕТ ПУТИ (рубильник приглашений; при нём и строки в Настройках нет).
10. Кадр **profile-026**: сам экран `/referrals` (`referrals-roulette-hero`, `referrals-my-code-card`) — в коде это «Награда за друга» с рулеткой, а не макетный «Пригласить друга / Твой код ALEX-42» (расхождение образца и кода).
**Кадры в группе.** overlays-campaigns-016…026 (021, 025 — нет), profile-026.
**Оценка: 10 мин** (при наличии кода).

---

### G-A09 · Язык изучения: шторка, мини-онбординг нового языка, тосты
**Подготовка.** Гость, активный английский. ДС с закодированным адресом: `phraseman://dev_state?next=%2Flanguage_welcome%3Ftarget%3Des` (путь `next=` не проверялся на эмуляторе; запасной — не существует, шторка не открывает новые языки: `StudyLanguageSheet.tsx:37` `STUDY_LANGUAGE_SHEET_OPENS_NEW_LANGUAGES=false`).
**Путь.**
1. `language-welcome-primary` (language_welcome.tsx:272) на шаге приветствия → кадр **onboarding-026** (флаг, «Давай начнём…»).
2. Тап `language-welcome-primary` → «Зачем тебе…» (карточки `language-welcome-option-series|everyday|travel|words|mind`, :252) → кадр **onboarding-027**; выбрать `language-welcome-option-everyday`, «Продолжить».
3. Шаг «Уровень» → кадр **onboarding-028** (`language-welcome-option-a0…b2`); выбрать `…-a1`, кнопка «Начать …».
4. Экран-подтверждение (`language-welcome-done-start`, :452) → кадр **onboarding-029**; тап → Главная (язык теперь es).
5. Настройки → `settings-study-language-row` (settings.tsx:974) → шторка `study-language-sheet` (StudyLanguageSheet.tsx:67): «Учу · выбран» у Español, «Учу» у English, у остальных замок «Новый язык · доступ уточняется» → кадры **profile-005** и **settings-gap-019**.
6. В шторке тап `study-language-option-en` → тост «Готово · Теперь учишь English»; затем снова шторка → `study-language-option-es` → тост «Теперь учишь Español» (снимать тост ≈2–3 с) → кадр **settings-gap-020**. Закончить на English (`study-language-option-en`), чтобы дальше уроки шли на английском.
7. «Не получилось сменить язык» (**settings-gap-021**) — НЕТ ПУТИ: сбой `applyStudyLanguageSelection` (StudyLanguagePicker.tsx:188-203) воспроизвести нечем.
**Кадры в группе.** onboarding-026, 027, 028, 029, profile-005, settings-gap-019, 020 (021 — нет).
**Оценка: 12 мин.**

---

### G-A10 · Вход Google новым аккаунтом C, профиль привязан
**Подготовка.** Тестовый Google-аккаунт C (№3), добавленный в Android, **которого ещё нет в Phraseman** (для кадра «Аккаунта нет» — одноразово; если C уже зарегистрирован, вход завершит онбординг сразу и кадра не будет). Пароли не вводить; вход — только выбором из системного списка. Гость из G-A01–G-A09 (английский, сеть есть). Сценарий: `AUTH_RELEASE1_TEST_SCENARIO` D1–D4, B1–B4.
**Путь.**
1. ДС `onboarding=pending\&next=/(tabs)/home` → welcome → `onboarding-existing-account` → кнопка «Войти через Google».
2. Перед тапом: `adb emu network speed gsm` (и/или `adb emu network delay gprs`). Тап → выбрать аккаунт C в системном окне → ждать >8 с (`ONBOARDING_AUTH_UI_TIMEOUT_MS`, CleanOnboarding.tsx:179) → строка «Вход всё ещё выполняется…» (:3459) → кадр **onboarding-003** (УСЛОВНО: нужна реально медленная сеть; сценарий D3). Затем `adb emu network speed full`, `adb emu network delay none`.
3. Вход завершается → аккаунта нет → экран «Аккаунта нет» с почтой (`onboarding-unknown-account-create`/`-retry`, :3426,3431) → кадр **onboarding-005**.
4. Тап `onboarding-unknown-account-create` → `onboarding-niceToMeet-screen` с именем из Google («Приятно познакомиться, <имя>!», `firstNameOf` — первое слово ≤24 символов, CleanOnboarding.tsx:339) → кадр **onboarding-009** (вариант с именем); длинное имя (**onboarding-010**) получится, только если владелец заранее задаст тестовому Google-аккаунту имя одним словом ≥20 букв — иначе НЕТ ПУТИ.
5. Быстро довести онбординг: `onboarding-skip` (CleanOnboarding.tsx:997) → `onboarding-age-yes` → `onboarding-finish` → `onboarding-trial-reminder-continue` → `onboarding-paywall-close`. Закрыть модалку «3 дня» (если есть).
6. Настройки (`tab-settings`): карточка профиля «… · аккаунт привязан», строка «Аккаунт · Google», без кнопки «Войти» → кадр **settings-gap-001**.
7. `settings-account-row` → экран «Аккаунт»: Email (`account-email-row`), «Способ входа · Google», «С нами с …», кнопки `account-logout-button`, `account-delete-button` → кадр **profile-002** (макетный вид). Тап `account-email-copy` (account_details.tsx:294) → подпись «Скопировано» ≈1,4 с → кадр **auth-gap-002**.
8. Тап `account-delete-button` → окно «Удалить аккаунт?» с «14 дней» (DeleteAccountConfirmModal.tsx:79) → кадры **auth-gap-009** и **profile-030**. НЕ вводить «УДАЛИТЬ»; `delete-account-cancel`.
**Кадры в группе.** onboarding-003, 005, 009 (с именем), 010 (условно), settings-gap-001, profile-002 (повтор), auth-gap-002, auth-gap-009, profile-030.
**Оценка: 12 мин.**

---

### G-A11 · Выход, вход, смена аккаунта, отказы окна входа
**Подготовка.** Аккаунт C из G-A10 (имя «Сверка Тест»), аккаунт B (№2) уже существует в Phraseman (есть прогресс/имя) — допущение. Только выбор аккаунта в системном окне. Кнопки трат не жать.
**Путь.**
1. Под C: Настройки → «Аккаунт» → `account-logout-button` (account_details.tsx:339) → выход стартует СРАЗУ. Для кадра прогресса: авиарежим ВКЛ ДО тапа (синхронизация упадёт/задержится), тап и серия скриншотов 0,3 с → «Выходим из аккаунта … Локальные изменения остаются привязаны к этому аккаунту.» (AccountLogoutFlow.tsx:283-296) → кадры **profile-028** и **overlays-runtime-018** (УСЛОВНО: окно короткое; при онлайн-выходе длится <1–2 с). Авиарежим ВЫКЛ.
2. Окно «Выйти из аккаунта?» (**profile-027**, **overlays-runtime-017**) — В КОДЕ НЕТ: стадия `confirm` не вызывается (`account_details.tsx:347`); тексты есть в `AccountLogoutFlow.tsx:300-357` (testID `account-logout-confirm`/`-cancel` недостижимы). «Выход не доказан» (**profile-029**) — НЕТ ПУТИ (нужен сбой стирания локальных данных, `forced.ok=false`, :129-168).
3. После выхода открывается окно входа (`account_details.tsx:377-382`, `authPromptVisible`) — гость, чистый. Пройти урок 1 (прогресс гостя, `localClean=false`).
4. Настройки → Аккаунт → `account-link-row` → окно входа → «Войти через Google» → выбрать **B** (существующий) → отказ «Телефон уже связан с другим аккаунтом / Твой прогресс на месте. Чтобы войти в другой аккаунт, сначала смени аккаунт.» + кнопка `auth-switch-account` (RegistrationPromptModal.tsx:1209-1217, 1696) → кадр **auth-gap-003** (сценарий E2–E3).
5. Тап `auth-switch-account` → Настройки с окном «Сменить аккаунт?» (текст + «Отмена/Продолжить», settings.tsx:1323-1380) → кадр **auth-gap-012** БЕЗ строки про Plus (строка «У тебя активен Plus…» появляется только при свежем store-Plus, `plus_transfer_hold.ts:69-73` — НЕТ ПУТИ на dev; кадр с Plus помечен как нет пути). Запасной вход в окно: ДС `next=%2F(tabs)%2Fsettings%3FswitchAccount%3D1` (не проверялся, `phraseman://settings` как ссылка запрещён).
6. Авиарежим ВКЛ → «Продолжить» → «Прогресс не сохранён / Смена аккаунта отменена, всё на месте. Попробуй ещё раз.» (кнопки «Остаться здесь», «Сменить без сохранения», settings.tsx:1645-1675) → кадр **auth-gap-016** (УСЛОВНО: нужен именно сбой `forceSyncToCloud`). Нажать «Остаться здесь»; авиарежим ВЫКЛ.
7. Окна 013 (несохранённые карточки), 014 (покупка синхронизируется), 015 (проверка монет), 017 (отменена защитной проверкой), 018 (смена ещё идёт) — НЕТ ПУТИ (см. раздел «Нет пути»).
8. Продолжить смену → выбрать B → профиль B. Под B открыть `account-change-name` и ввести `Сверка Тест` (имя, занятое C из G-A02) → «Имя уже занято» (красный) → кадр **settings-gap-026**. Закрыть, не сохраняя.
9. Отказы окна входа: «Прогресс на месте / вход отменён» (**auth-gap-004**) и «На телефоне ждёт прогресс другого аккаунта» (**auth-gap-005**) — НЕТ ПУТИ (нужны сбой выгрузки при живом Google-токене и аварийная копия чужого аккаунта на телефоне).
**Кадры в группе.** profile-027 (нет), 028, 029 (нет), overlays-runtime-017 (нет), 018, auth-gap-003, 012 (без Plus), 013–015 (нет), 016, 017 (нет), 018 (нет), 004, 005 (нет), settings-gap-026.
**Оценка: 22 мин.**

---

### G-A12 · Удаление и восстановление аккаунта (условно, только по «да» владельца)
**Подготовка.** Только тестовый Google-аккаунт, ЯВНО названный владельцем (раздел F сценария, правило 5; `badloar@gmail.com` нельзя). Гость-удаление (G1/G2) допустимо всегда. Этот набор в первый выпуск съёмки включать только с разрешением координатора — иначе пропустить.
**Путь.**
1. Под названным аккаунтом: Аккаунт → `account-delete-button` → ввести «УДАЛИТЬ» в `delete-account-confirm-input` → `delete-account-confirm` (DeleteAccountConfirmModal.tsx:439,512) → первый экран (сценарий F2; уведомления об удалении нет — это правильно).
2. «У меня уже есть аккаунт» → Google тот же → системное окно **Android Alert** «Восстановить аккаунт? Этот аккаунт помечен на удаление. Осталось N дн. …» (`account_delete_restore_prompt.ts:72-97`, нативный `Alert.alert`, кнопки «Не восстанавливать/Восстановить») → кадр **auth-gap-007**.
3. «Восстановить» → строка «Аккаунт восстановлен · Войди ещё раз — весь прогресс на месте» (в окне входа из Настроек — inline + «Повторить», RegistrationPromptModal.tsx:1257-1267; в онбординге — красная строка под кнопками, CleanOnboarding.tsx:2706-2718) → кадр **auth-gap-006**.
4. «Аккаунт удалён… безвозвратно» (**auth-gap-008**, `noticeAccountDeletedForever`, :44-62) — НЕТ ПУТИ: нужен аккаунт старше 14 дней после удаления (`identity_retired`).
5. «Удаление не завершилось» (**auth-gap-011**) — НЕТ ПУТИ: ошибка показывается только при броске внутри `beginAccountDeletion` (сбой локального замка/хранилища, DeleteAccountConfirmModal.tsx:326-357); без сети удаление проходит локально, дочищается позже. Шаги F6/G2 сценария про «без интернета → не завершилось» не совпадают с кодом.
**Кадры в группе.** auth-gap-006, 007 (условно), 008, 011 (нет).
**Оценка: 15 мин** (только при разрешении).

---

### G-A13 · Встроенные Plus-карточки: итог урока и лимит ИИ
**Подготовка.** Чистый free-аккаунт без Plus: после `pm clear` + онбординг (G-A01) — или ДС `plus=off` (отключает и «3 дня»). Сеть нужна. Рубильники мягких допродаж включены по умолчанию (`remote_flags.ts:602-609`: first_lesson, free_lessons_complete).
**Путь.**
1. Вкладка уроков → пройти «Урок 1» до конца (первый зачёт, `candidateAfterLessonGrant`, lesson_complete_soft_upsell.ts:29-45) → экран результата `lesson_complete`, карточка `soft-upsell-card` (SoftContextualUpsellCard.tsx:68) → кадр **paywalls-009**.
2. Пройти «Урок 3» (`FREE_LESSON_LIMIT=3`, monetization_policy.ts:17) → карточка с копирайтом `FREE_LIMIT_SOFT_UPSELL_COPY` → кадр **paywalls-010**. УСЛОВНО: карточка появляется один раз на этап (`consumedMilestones`) и только при первом зачёте урока; нужен ровно «чистый» аккаунт, глобальный кулдаун между показами может скрыть вторую.
3. Лимит ИИ: Настройки → Приватность → включить «AI-разбор ошибок» (согласие) → в уроке сделать ошибки и каждый раз тапнуть «объясни» (3 бесплатных разбора в день, `FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT=3`, `ai_mistake_explain_flags.ts:1`) → на 4-й карточка `ai-mistake-limit-card` с кнопкой `ai-mistake-limit-card-full-access-button` (AiMistakeCard.tsx:150-157, AiLimitUpsellCard.tsx:96) → кадр **paywalls-008**. УСЛОВНО: каждый разбор — настоящий вызов ИИ на сервере (стоимость малая, но не нулевая); сервер должен ответить.
**Кадры в группе.** paywalls-008, 009, 010 (все УСЛОВНО).
**Оценка: 15 мин.**

---

## Таблица строк

Колонки: id | кадр образца (файл №N) | группа | как попасть именно в этот кадр | вход | тема/насыщ.

| id | кадр образца | группа | как попасть | вход | тема/насыщ. |
|---|---|---|---|---|---|
| profile-001 | redesign-round-1.html №1 | G-A03 | Таб `tab-settings` → `screen-settings` (settings.tsx:886); верх списка; Plus-строка после ДС `plus=off` | гость | тёмная/Спокойно |
| profile-002 | profile.html №2 | G-A02 (повтор G-A10) | Настройки → `settings-account-row` → «Аккаунт»; гость: `account-link-row`; макетный вид Google+email — после входа C (G-A10) | гость, затем C | тёмная/Спокойно |
| profile-003 | profile.html №3 | G-A02 | «Аккаунт» → `account-change-name` → шторка (`nickname-input`) | гость | тёмная/Спокойно |
| profile-004 | profile.html №4 | G-A03 | `settings-language-row` → `settings-language-screen`; в dev 9 строк (одна выключена) | гость | тёмная/Спокойно |
| profile-005 | profile.html №5 | G-A09 | `settings-study-language-row` → `study-language-sheet`; снимать после мини-онбординга es («Учу» у второго языка) | гость | тёмная/Спокойно |
| profile-006 | profile.html №6 | G-A04 | `settings-notifications-row` → общий вид экрана при включённом мастере и выданном разрешении | гость | тёмная/Спокойно |
| profile-007 | profile.html №7 | G-A05 | `settings-edu-row` → `/settings_edu`, верх | гость | тёмная/Спокойно |
| profile-008 | profile.html №8 | G-A03 | `settings-themes-row` → `/settings_themes`: тёмная/светлая (`theme-appearance-*`), ползунок `theme-intensity-slider`, прокрутка к 10 градиентным | гость | тёмная и светлая; Спокойно и Максимум |
| profile-009 | profile.html №9 | G-A05 | `settings-privacy-row`; «Отправлять данные об использовании» выкл, ИИ выкл | гость | тёмная/Спокойно |
| profile-010 | profile.html №9 | G-A05 | то же, аналитика ВКЛ (меняется заметка под тумблером) | гость | тёмная/Спокойно |
| profile-011 | profile.html №10 | G-A05 | `privacy-policy-row` → `/privacy_screen`, прокрутка `legal-document-scroll` | гость | тёмная/Спокойно |
| profile-012 | profile.html №11 | G-A05 | `privacy-terms-row` → `/terms_screen`, прокрутка | гость | тёмная/Спокойно |
| profile-013 | profile.html №12 | G-A05 | `settings-support-report-row` → `/support_report`, пустое поле | гость | тёмная/Спокойно |
| profile-014 | profile.html №12 | G-A05 | текст ≥10 символов + `support-diagnostics-preview-toggle` («Посмотреть» → «Скрыть»); тоггл виден только при непустом журнале | гость | тёмная/Спокойно |
| profile-015 | profile.html №12 | G-A05 | `support-report-submit` → «Обращение отправлено» (`support-report-done`); РЕАЛЬНАЯ отправка — нужно «да» | гость | тёмная/Спокойно |
| profile-016 | manage-subscription-states.html №1 | G-A06 | НЕТ ПУТИ для «Годовая подписка»; ближайшее: ДС `plus=on` → `settings-plus-row` → «Подписка Plus» без даты списания | гость + `plus=on` | тёмная/Спокойно |
| profile-017 | manage-subscription-states.html №3 | G-A06 | НЕТ ПУТИ («Месячная» + `manage-subscription-change-plan`: нужен `premium_plan=monthly` и пакет магазина) | — | — |
| profile-018 | manage-subscription-states.html №5 | G-A06 | НЕТ ПУТИ («Phraseman Pro · разовая покупка»: нужен `premium_plan=lifetime`) | — | — |
| profile-019 | manage-subscription-states.html №4 | G-A06 | `plus=on` → `settings-plus-row`; серия скриншотов 0,3 с: `manage-subscription-loading` (УСЛОВНО) | гость + `plus=on` | тёмная/Спокойно |
| profile-020 | manage-subscription-states.html №8 | G-A06 | `manage-subscription-cancel` → шит «Почему уходишь?», причина не выбрана | гость + `plus=on` | тёмная/Спокойно |
| profile-021 | manage-subscription-states.html №10 | G-A06 | `manage-subscription-reason-other` → `manage-subscription-reason-other-input`, ввести текст; «Продолжить» НЕ жать (уход в Play) | гость + `plus=on` | тёмная/Спокойно |
| profile-022 | manage-subscription-states.html №11 | G-A06 | причина «Слишком дорого/Не пользуюсь/Временно» + «Продолжить»; надёжно — Dev Hub → «Отписка» → `dev-open-cancel-flow` (пресет прогресса) | гость + `plus=on` | тёмная/Спокойно |
| profile-023 | manage-subscription-states.html №12 | G-A06 | причина «Не хватает функций/Технические» + «Продолжить»; `offer-decline` НЕ жать | гость + `plus=on` | тёмная/Спокойно |
| profile-024 | manage-subscription-states.html №7 | G-A06 | `manage-subscription-restore` → оверлей «Покупок не найдено»; УСЛОВНО/вероятно НЕТ ПУТИ (без Play вместо него тост ошибки) | гость + `plus=on` | тёмная/Спокойно |
| profile-025 | profile.html №25 | G-A03 | ДС `next=/survey_screen` (без параметров) → `survey-fallback-empty`, `survey-fallback-ok` | гость | тёмная/Спокойно |
| profile-026 | profile.html №14 | G-A08 | `settings-invite-banner` → `/referrals`; в коде экран «Награда за друга» (рулетка), не макетный «Пригласить друга / ALEX-42» — расхождение; зависит от рубильника | гость | тёмная/Спокойно |
| profile-027 | profile.html №16 | G-A11 | В КОДЕ НЕТ: окно «Выйти из аккаунта?» недостижимо (`account_details.tsx:347`), тексты только в `AccountLogoutFlow.tsx:300-357` | — | — |
| profile-028 | profile.html №17 | G-A11 | `account-logout-button` при авиарежиме, серия скриншотов 0,3 с: «Выходим из аккаунта» (УСЛОВНО) | C | тёмная/Спокойно |
| profile-029 | profile.html №18 | G-A11 | НЕТ ПУТИ («Не удалось выйти» только при сбое стирания данных) | — | — |
| profile-030 | profile.html №19 | G-A10 | `account-delete-button` → окно с «14 дней»; НЕ подтверждать (`delete-account-cancel`) | C | тёмная/Спокойно |
| paywalls-008 | embedded-plus-states.html №1 | G-A13 | 4-й разбор ошибки за день при включённом согласии «AI-разбор ошибок» → `ai-mistake-limit-card` (УСЛОВНО, реальный вызов ИИ) | гость, free | тёмная/Спокойно |
| paywalls-009 | embedded-plus-states.html №2 | G-A13 | первый зачёт «Урока 1» → `lesson_complete` → `soft-upsell-card` (УСЛОВНО) | гость, free | тёмная/Спокойно |
| paywalls-010 | embedded-plus-states.html №3 | G-A13 | первый зачёт «Урока 3» → `soft-upsell-card` (копирайт free-limit) (УСЛОВНО) | гость, free | тёмная/Спокойно |
| paywalls-019 | manage-subscription-states.html №1 | G-A06 | то же, что profile-016 (НЕТ ПУТИ для «Годовая») | — | — |
| paywalls-020 | manage-subscription-states.html №4 | G-A06 | то же, что profile-019 | гость + `plus=on` | тёмная/Спокойно |
| paywalls-021 | manage-subscription-states.html №5 | G-A06 | то же, что profile-018 (НЕТ ПУТИ) | — | — |
| paywalls-022 | manage-subscription-states.html №7 | G-A06 | то же, что profile-024 (УСЛОВНО/вероятно НЕТ ПУТИ) | гость + `plus=on` | тёмная/Спокойно |
| paywalls-023 | manage-subscription-states.html №8 | G-A06 | то же, что profile-020 | гость + `plus=on` | тёмная/Спокойно |
| paywalls-024 | manage-subscription-states.html №11 | G-A06 | то же, что profile-022 | гость + `plus=on` | тёмная/Спокойно |
| paywalls-025 | manage-subscription-states.html №12 | G-A06 | то же, что profile-023 | гость + `plus=on` | тёмная/Спокойно |
| overlays-runtime-017 | profile.html №16 | G-A11 | то же, что profile-027 (В КОДЕ НЕТ); ближайшее достижимое «подтверждение смены» — окно «Сменить аккаунта?» (см. auth-gap-012) | — | — |
| overlays-runtime-018 | profile.html №17 | G-A11 | то же, что profile-028; вариант Настроек (`settings.tsx:1329-1349`, «Аккаунт · Не закрывай приложение») — после «Продолжить» в окне смены | C | тёмная/Спокойно |
| overlays-campaigns-004 | promo-code-states.html №1 | G-A07 | Настройки → `settings-promo-code-row` → `screen-promo-code-entry`, пусто | гость | тёмная/Спокойно |
| overlays-campaigns-005 | promo-code-states.html №2 | G-A07 | ввести `PHRASE20` в `promo-code-input` (кнопка `promo-code-submit` активна) | гость | тёмная/Спокойно |
| overlays-campaigns-006 | promo-code-states.html №3 | G-A07 | тап «Активировать» + серия скриншотов 0,3 с: «Активируем…» (УСЛОВНО; `adb emu network delay umts`) | гость | тёмная/Спокойно |
| overlays-campaigns-007 | promo-code-states.html №4 | G-A07 | валидный код с днями (D30, заводит владелец) → `promo-code-feedback` «…на 30 дн.» (УСЛОВНО) | гость | тёмная/Спокойно |
| overlays-campaigns-008 | promo-code-states.html №5 | G-A07 | код rewardKind=lifetime (LIFE) → «…навсегда» (УСЛОВНО) | гость | тёмная/Спокойно |
| overlays-campaigns-009 | promo-code-states.html №6 | G-A07 | несуществующий `ZZZ99999` → «Такой код не найден…» | гость | тёмная/Спокойно |
| overlays-campaigns-010 | promo-code-states.html №7 | G-A07 | код EXP (срок в прошлом) → «Срок действия кода истёк.» (УСЛОВНО) | гость | тёмная/Спокойно |
| overlays-campaigns-011 | promo-code-states.html №8 | G-A07 | код LIM (лимит исчерпан) → «Лимит активаций…» (УСЛОВНО) | гость | тёмная/Спокойно |
| overlays-campaigns-012 | promo-code-states.html №9 | G-A07 | повторный ввод уже активированного D30 → «Ты уже активировал этот код.» (УСЛОВНО) | гость | тёмная/Спокойно |
| overlays-campaigns-013 | promo-code-states.html №10 | G-A07 | В КОДЕ НЕТ: при неверном формате кнопка выключена, сообщения нет (`promo_code_entry.tsx:236-240`) | — | — |
| overlays-campaigns-014 | promo-code-states.html №11 | G-A07 | НЕТ ПУТИ: «Промокоды временно выключены» — глобальный рубильник `promo_disabled` | — | — |
| overlays-campaigns-015 | promo-code-states.html №12 | G-A07 | авиарежим ВКЛ → валидный код → «Сейчас не получилось активировать код…» | гость | тёмная/Спокойно |
| overlays-campaigns-016 | referral-code-states.html №1 | G-A08 | `referrals-enter-code` (или ДС `next=/referrals%3Fenter%3D1`) → `referral-code-sheet`, пусто | гость | тёмная/Спокойно |
| overlays-campaigns-017 | referral-code-states.html №2 | G-A08 | ввести ≥4 символов в `referral-code-sheet-input` | гость | тёмная/Спокойно |
| overlays-campaigns-018 | referral-code-states.html №3 | G-A08 | тап `referral-code-sheet-submit` + серия скриншотов: «Применяем…» (УСЛОВНО) | гость | тёмная/Спокойно |
| overlays-campaigns-019 | referral-code-states.html №4 | G-A08 | чужой код на новом аккаунте → «Код принят…» (УСЛОВНО: нужен код и вердикт «новый») | гость (новый) | тёмная/Спокойно |
| overlays-campaigns-020 | referral-code-states.html №5 | G-A08 | тот же код повторно → «Код уже привязан…» (УСЛОВНО) | гость (новый) | тёмная/Спокойно |
| overlays-campaigns-021 | referral-code-states.html №6 | G-A08 | В КОДЕ НЕТ: до 4 символов кнопка выключена, статус `invalid` недостижим (`referral_code_sheet.tsx:191`) | — | — |
| overlays-campaigns-022 | referral-code-states.html №7 | G-A08 | код `ZZZZ9999` → «Такой код не найден…» | гость | тёмная/Спокойно |
| overlays-campaigns-023 | referral-code-states.html №8 | G-A08 | собственный код (`referrals-my-code-value`) → «Это твой код…» | гость | тёмная/Спокойно |
| overlays-campaigns-024 | referral-code-states.html №9 | G-A08 | старый аккаунт + чужой код → «…только на новом аккаунте» (УСЛОВНО, вердикт сервера) | C/B | тёмная/Спокойно |
| overlays-campaigns-025 | referral-code-states.html №10 | G-A08 | НЕТ ПУТИ: рубильник приглашений выключен (тогда нет и входа в шит) | — | — |
| overlays-campaigns-026 | referral-code-states.html №11 | G-A08 | авиарежим ВКЛ → применить код → «Не получилось применить код…» либо «Код сохранён…» (УСЛОВНО) | гость | тёмная/Спокойно |
| onboarding-paywall-001 | onboarding-states.html №23 | — | НЕТ ПУТИ в dev: «настоящая цена» нужна от магазина (`paywall_purchase.ts:617`) | — | — |
| onboarding-paywall-002 | onboarding-states.html №24 | G-A01 | шаг цены `onboarding-onboardingPaywall-screen`; в dev всегда справочные цены «≈» (то же, что onboarding-024) | гость | светлый онбординг* |
| onboarding-001 | onboarding-states.html №1 | G-A01 | `pm clear` → `onboarding-welcome-screen` | гость | светлый онбординг* |
| onboarding-002 | onboarding-states.html №2 | G-A01 | тап `onboarding-existing-account` | гость | светлый онбординг* |
| onboarding-003 | onboarding-states.html №3 | G-A10 | тап «Войти через Google» при `adb emu network speed gsm`, ждать >8 с (УСЛОВНО) | гость → C | светлый онбординг* |
| onboarding-004 | onboarding-states.html №4 | G-A01 | авиарежим ВКЛ → тап «Войти через Google» (текст ошибки зависит от кода — УСЛОВНО) | гость | светлый онбординг* |
| onboarding-005 | onboarding-states.html №5 | G-A10 | «Войти через Google» аккаунтом C, которого нет в Phraseman → `onboarding-unknown-account-create` | гость → C | светлый онбординг* |
| onboarding-006 | onboarding-states.html №6 | — | НЕТ ПУТИ: «Вход недоступен» = `!googleAvailable && appleAvailable===false` (CleanOnboarding.tsx:3456), переключателя нет | — | — |
| onboarding-007 | onboarding-states.html №7 | G-A01 | `onboarding-start` → `onboarding-privacy-screen` | гость | светлый онбординг* |
| onboarding-008 | onboarding-states.html №8 | G-A01 | на сейфе авиарежим ВКЛ → «Продолжить с Google» (УСЛОВНО, текст по коду) | гость | светлый онбординг* |
| onboarding-009 | onboarding-states.html №9 | G-A01 (+G-A10 с именем) | `onboarding-privacy-later` → `onboarding-niceToMeet-screen`; с именем — после входа в G-A10 | гость / C | светлый онбординг* |
| onboarding-010 | onboarding-states.html №10 | G-A10 | УСЛОВНО/НЕТ ПУТИ: имя = первое слово Google-имени ≤24 символов; нужен тестовый аккаунт с длинным одним словом | C | светлый онбординг* |
| onboarding-011 | onboarding-states.html №11 | G-A01 | `onboarding-nice-continue` → `onboarding-promise-screen` | гость | светлый онбординг* |
| onboarding-012 | onboarding-states.html №12 | G-A01 | `onboarding-promise-continue` → `onboarding-improve-screen` | гость | светлый онбординг* |
| onboarding-013 | onboarding-states.html №13 | G-A01 | `onboarding-improve-continue` → `onboarding-source-screen` (кнопка выключена) | гость | светлый онбординг* |
| onboarding-014 | onboarding-states.html №14 | G-A01 | тап `onboarding-source-tiktok` | гость | светлый онбординг* |
| onboarding-015 | onboarding-states.html №15 | G-A01 | `onboarding-source-continue` → `onboarding-language-screen` | гость | светлый онбординг* |
| onboarding-016 | onboarding-states.html №16 | — | В КОДЕ НЕТ: шаг «Уровень» выключен (`SHOW_ONBOARDING_LEVEL_STEP=false`, CleanOnboarding.tsx:217) | — | — |
| onboarding-017 | onboarding-states.html №17 | — | В КОДЕ НЕТ (как onboarding-016) | — | — |
| onboarding-018 | onboarding-states.html №18 | G-A01 | `onboarding-language-continue` → `onboarding-notifications-screen` | гость | светлый онбординг* |
| onboarding-019 | onboarding-states.html №19 | G-A01 | `onboarding-notifications-skip` → `onboarding-name-screen` | гость | светлый онбординг* |
| onboarding-020 | onboarding-states.html №20 | G-A01 | тап `onboarding-age-yes` | гость | светлый онбординг* |
| onboarding-021 | onboarding-states.html №21 | G-A01 | тап `onboarding-age-no` (плашка «Тебе есть …» с текстом отказа) | гость | светлый онбординг* |
| onboarding-022 | onboarding-states.html №22 | G-A01 | `onboarding-finish` → `onboarding-trialReminder-screen` | гость | светлый онбординг* |
| onboarding-025 | onboarding-states.html №25 | — | НЕТ ПУТИ в dev: «Цена: загрузка» (`paywallLoading`) — в dev магазин не опрашивается (`paywall_purchase.ts:617`) | — | — |
| onboarding-026 | onboarding-states.html №26 | G-A09 | ДС `next=%2Flanguage_welcome%3Ftarget%3Des` → шаг приветствия | гость | тёмная/Спокойно |
| onboarding-027 | onboarding-states.html №27 | G-A09 | `language-welcome-primary` → «Зачем тебе…» | гость | тёмная/Спокойно |
| onboarding-028 | onboarding-states.html №28 | G-A09 | выбрать `language-welcome-option-everyday` → «Продолжить» → «Уровень» | гость | тёмная/Спокойно |
| onboarding-029 | onboarding-states.html №29 | G-A09 | выбрать уровень → «Начать …» → экран-подтверждение (`language-welcome-done-start`) | гость | тёмная/Спокойно |
| auth-gap-001 | accounts-gaps-states.html №1 | G-A02 | Настройки → `settings-account-row`; виден `account-link-row`, нет Email/«Способ входа»/`account-logout-button` | гость | тёмная/Спокойно |
| auth-gap-002 | accounts-gaps-states.html №2 | G-A10 | вход C → «Аккаунт» → тап `account-email-copy` → «Скопировано» ≈1,4 с | C | тёмная/Спокойно |
| auth-gap-003 | accounts-gaps-states.html №3 | G-A11 | гость с пройденным уроком → `account-link-row` → Google → выбрать существующий B → отказ + `auth-switch-account` (сценарий E2–E3) | гость → B | тёмная/Спокойно |
| auth-gap-004 | accounts-gaps-states.html №4 | G-A11 | НЕТ ПУТИ: `local_progress_not_uploaded` — сбой выгрузки при живом токене Google | — | — |
| auth-gap-005 | accounts-gaps-states.html №5 | G-A11 | НЕТ ПУТИ: `local_progress_backup_blocked` — аварийная копия чужого аккаунта на телефоне | — | — |
| auth-gap-006 | accounts-gaps-states.html №6 | G-A12 | УСЛОВНО: после «Восстановить» в окне 007 (нужен удалённый тестовый аккаунт, раздел F) | тестовый аккаунт | тёмная/Спокойно |
| auth-gap-007 | accounts-gaps-states.html №7 | G-A12 | УСЛОВНО: вход в аккаунт с пометкой «на удалении» → нативный Android-Alert | тестовый аккаунт | системное окно |
| auth-gap-008 | accounts-gaps-states.html №8 | G-A12 | НЕТ ПУТИ: `identity_retired` (14 дней после удаления) | — | — |
| auth-gap-009 | accounts-gaps-states.html №9 | G-A10 | под C: `account-delete-button` → окно с «14 дней»; не подтверждать | C | тёмная/Спокойно |
| auth-gap-010 | accounts-gaps-states.html №10 | G-A02 | гость: `account-delete-button` → окно «Прогресс удалится безвозвратно» | гость | тёмная/Спокойно |
| auth-gap-011 | accounts-gaps-states.html №11 | G-A12 | НЕТ ПУТИ: отказ только при сбое локального замка/хранилища (DeleteAccountConfirmModal.tsx:255-293, 326-357) | — | — |
| auth-gap-012 | accounts-gaps-states.html №12 | G-A11 | `auth-switch-account` → окно «Сменить аккаунт?» (без строки про Plus — она требует свежее store-Plus, НЕТ ПУТИ на dev) | гость → B | тёмная/Спокойно |
| auth-gap-013 | accounts-gaps-states.html №13 | G-A11 | НЕТ ПУТИ: нужны запертые ключи карточек/сбой выгрузки страниц (`account_switch_unsaved_cards.ts:42-52`) | — | — |
| auth-gap-014 | accounts-gaps-states.html №14 | G-A11 | НЕТ ПУТИ: нужен незавершённый спенд осколков в очереди (`pending_shard_spend`) | — | — |
| auth-gap-015 | accounts-gaps-states.html №15 | G-A11 | НЕТ ПУТИ: нужна повреждённая очередь монет (`shard_queue_quarantined`) | — | — |
| auth-gap-016 | accounts-gaps-states.html №16 | G-A11 | в окне смены авиарежим ВКЛ → «Продолжить» → «Прогресс не сохранён» (УСЛОВНО) | гость → B | тёмная/Спокойно |
| auth-gap-017 | accounts-gaps-states.html №17 | G-A11 | НЕТ ПУТИ: принудительная смена отклонена защитной проверкой (`settings.tsx:1485-1511`) | — | — |
| auth-gap-018 | accounts-gaps-states.html №18 | G-A11 | НЕТ ПУТИ: смена должна идти дольше 45 с (`ACCOUNT_SWITCH_UI_DEADLINE_MS`); `network speed gsm` может помочь, не гарантировано | — | — |
| settings-gap-001 | settings-gaps-states.html №1 | G-A10 | под C: Настройки, карточка профиля «… · аккаунт привязан», «Аккаунт · Google», нет «Войти» | C | тёмная/Спокойно |
| settings-gap-002 | settings-gaps-states.html №2 | G-A03 | ДС `plus=off` → прокрутка к группе Plus | гость | тёмная/Спокойно |
| settings-gap-003 | settings-gaps-states.html №3 | G-A03 | ЧАСТИЧНО: ДС `plus=on` даёт «Активна»; значение «Год» (из `premium_plan`) — НЕТ ПУТИ | гость | тёмная/Спокойно |
| settings-gap-004 | settings-gaps-states.html №4 | G-A07 | ввести реальный код D30 → плашка `settings-vip-card` «Промокод · Действует до …» (УСЛОВНО, коды заводит владелец) | гость | тёмная/Спокойно |
| settings-gap-005 | settings-gaps-states.html №5 | G-A01 | ЧАСТИЧНО: сразу после онбординга плашка «Полный доступ на 3 дня» (без `plus=`); плашка «Plus за приглашения» — НЕТ ПУТИ | гость | тёмная/Спокойно |
| settings-gap-006 | settings-gaps-states.html №6 | — | НЕТ ПУТИ: «Подписка Pro · Активна / Выданный Pro / Pro без срока» — нужен `isPro` + `vip_plan=admin_vip` без даты | — | — |
| settings-gap-007 | settings-gaps-states.html №7 | G-A03 | «Очистить кеш» → «Очистить» + серия скриншотов: «Чистим…»; слот-опрос — НЕТ ПУТИ без кампании | гость | тёмная/Спокойно |
| settings-gap-008 | settings-gaps-states.html №8 | G-A03 | та же последовательность, кадр «Готово» ≈2,2 с; слот-опрос после голосования — НЕТ ПУТИ без кампании | гость | тёмная/Спокойно |
| settings-gap-009 | settings-gaps-states.html №9 | G-A03 | НЕТ ПУТИ: «Не удалось» только при сбое AsyncStorage (`cache_reset.ts:109`); слот-сообщение — нужна кампания | — | — |
| settings-gap-010 | settings-gaps-states.html №10 | G-A04 | выставить время 20:00 в окне «Время» → «OK»; снять в течение 1,4 с («Сохранено») | гость | тёмная/Спокойно |
| settings-gap-011 | settings-gaps-states.html №11 | G-A04 | прокрутка в конец: «Итоги месяца», «Ещё» | гость | тёмная/Спокойно |
| settings-gap-012 | settings-gaps-states.html №12 | G-A04 | мастер ВКЛ → системное «Не разрешать» (или `pm revoke POST_NOTIFICATIONS`) → красная плашка (API 33+) | гость | тёмная/Спокойно |
| settings-gap-013 | settings-gaps-states.html №13 | G-A04 | мастер выключен (исходно после G-A01): строки приглушены | гость | тёмная/Спокойно |
| settings-gap-014 | settings-gaps-states.html №14 | G-A05 | `settings-edu-row`, верх | гость | тёмная/Спокойно |
| settings-gap-015 | settings-gaps-states.html №15 | G-A05 | прокрутка вниз: скорость + `fc-voice-picker-row` | гость | тёмная/Спокойно |
| settings-gap-016 | settings-gaps-states.html №16 | G-A05 | `settings-privacy-row`: аналитика ВКЛ, ИИ-тумблеры ВЫКЛ | гость | тёмная/Спокойно |
| settings-gap-017 | settings-gaps-states.html №17 | G-A05 | аналитика ВЫКЛ, ИИ-тумблеры ВКЛ, прокрутка до «Документы/Аккаунт» | гость | тёмная/Спокойно |
| settings-gap-018 | settings-gaps-states.html №18 | G-A03 | `settings-language-row`: 8 рабочих строк + 1 выключенная в dev | гость | тёмная/Спокойно |
| settings-gap-019 | settings-gaps-states.html №19 | G-A09 | `settings-study-language-row` → шторка (после мини-онбординга es: «Учу» + замки) | гость | тёмная/Спокойно |
| settings-gap-020 | settings-gaps-states.html №20 | G-A09 | в шторке переключить en↔es → тост «Теперь учишь …» | гость | тёмная/Спокойно |
| settings-gap-021 | settings-gaps-states.html №21 | G-A09 | НЕТ ПУТИ: тост сбоя смены языка | — | — |
| settings-gap-022 | settings-gaps-states.html №22 | G-A05 | то же, что profile-014 (диагностика раскрыта) | гость | тёмная/Спокойно |
| settings-gap-023 | settings-gaps-states.html №23 | G-A05 | то же, что profile-015 (реальная отправка) | гость | тёмная/Спокойно |
| settings-gap-024 | settings-gaps-states.html №24 | G-A02 | ввести новое имя, снять в течение ≈0,6–1,5 с → «Проверяем имя…» (УСЛОВНО) | гость | тёмная/Спокойно |
| settings-gap-025 | settings-gaps-states.html №25 | G-A02 | уникальное имя `Sverka7421` → «Имя свободно» | гость | тёмная/Спокойно |
| settings-gap-026 | settings-gaps-states.html №26 | G-A11 | под B ввести `Сверка Тест` (имя C из G-A02) → «Имя уже занято» | B | тёмная/Спокойно |
| settings-gap-027 | settings-gaps-states.html №27 | G-A04 | мастер ВКЛ, «Ежедневное напоминание» выкл → «Время» приглушено | гость | тёмная/Спокойно |
| settings-gap-028 | settings-gaps-states.html №28 | G-A04 | тап «Время» (content-desc «Время») → окно с барабанами | гость | тёмная/Спокойно |
| settings-gap-029 | settings-gaps-states.html №29 | G-A03 | НЕТ ПУТИ: верхний слот `settings-message-slot-top` — серверная кампания | — | — |
| settings-gap-030 | settings-gaps-states.html №30 | G-A03 | НЕТ ПУТИ: строка `settings-invite-banner` скрыта рубильником приглашений | — | — |
| settings-gap-031 | settings-gaps-states.html №31 | G-A02 | авиарежим ВКЛ → ввод имени → «Проверим при сохранении» (УСЛОВНО) | гость | тёмная/Спокойно |
| settings-gap-032 | settings-gaps-states.html №32 | G-A02 | пустое поле → `nickname-save` → окно «Введи имя» | гость | тёмная/Спокойно |
| settings-gap-033 | settings-gaps-states.html №33 | G-A02 | `A` → `nickname-save` → «Минимум 2 символа» | гость | тёмная/Спокойно |
| settings-gap-034 | settings-gaps-states.html №34 | G-A05 | `fc-voice-picker-row` → выбрать голос → назад; название голоса зависит от TTS эмулятора | гость | тёмная/Спокойно |
| settings-gap-035 | settings-gaps-states.html №35 | G-A05 | текст `Нет звука` (<10 символов): «Отправить» неактивна | гость | тёмная/Спокойно |
| settings-gap-036 | settings-gaps-states.html №36 | G-A05 | НЕТ ПУТИ: «Не отправилось / Повторить» (очередь принимает отправку и без сети) | — | — |

\* Онбординг рисуется светлой темой (стили `CleanOnboarding.tsx`, фон `#F5F6FA`), от темы приложения не зависит.

## Нет пути

**А. Нет пути вообще (нужен dev-переключатель — «Ядро добавит»).**
- `onboarding-006` — «Вход недоступен»: `googleAvailable` берётся из `isGoogleSignInAvailableSync`, `appleAvailable` из платформы; переключателя нет. Предложение: параметр `dev_state?auth=none`.
- `onboarding-025`, `onboarding-paywall-001` (и `onboarding-023`) — «Цена: загрузка» / «настоящая цена»: в dev магазин не опрашивается (`DEV_IAP_BYPASS`). Предложение: `dev_state?paywall=loading|live|reference|failed` (подставляет состояние `usePaywallPurchase` для онбординга).
- `profile-016`, `profile-017`, `profile-018` (= `paywalls-019`, `paywalls-021`) — варианты «Годовая / Месячная / Разовая» в «Управлении подпиской» и значение «Год» в Настройках (`settings-gap-003`): нужен `premium_plan`/`premium_rc_product_id` (пишет только покупка). Предложение: `dev_state?plan=yearly|monthly|lifetime` (пишет `premium_plan`, `premium_rc_product_id` + срок).
- `settings-gap-005` (плашка «Plus за приглашения»), `settings-gap-006` (Pro без срока), часть `settings-gap-004` без реального кода — нужен `isVip`/`isPro` и `vip_plan`: предложение `dev_state?vip=promo|referral|survey|idea|tester|admin|admin_pro_lifetime\&until=<ms>` (локальный VIP-снимок через `writeVipSnapshotForAccount`, `promo_code_entry.tsx:161-185`).
- `settings-gap-007…009`, `settings-gap-029` — слот сообщений/опрос Настроек: нужна кампания в `app_messages`. Предложение: `dev_state?slot=poll|poll_voted|message|top` (подмена `selectSettingsMessageSlots`); для `settings-gap-009` ещё `cache=failed`.
- `settings-gap-030`, `overlays-campaigns-025` — рубильник приглашений выключен: предложение `dev_state?referral=off`.
- `overlays-campaigns-014` — глобальный `promo_disabled`: предложение `dev_state?promo=off`.
- `settings-gap-021` — сбой смены языка изучения: предложение `dev_state?studyfail=on`.
- `settings-gap-036` — «Не отправилось»: предложение `dev_state?support=fail`.
- `profile-029` — «Не удалось выйти»: предложение `dev_state?logout=fail|precommit`.
- `auth-gap-004`, `auth-gap-005`, `auth-gap-013`, `auth-gap-014`, `auth-gap-015`, `auth-gap-017`, `auth-gap-018` — отказы смены/входа: предложение `dev_state?switch=not_uploaded|backup_blocked|unsaved_cards|pending_spend|quarantine|guard|slow`.
- `auth-gap-012` с Plus-строкой — нужно свежее store-Plus (`hasFreshStorePlusEvidenceFor`): предложение `dev_state?plustransfer=on`.
- `auth-gap-008` — `identity_retired`: предложение `dev_state?restore=retired`.
- `auth-gap-011` — «Удаление не завершилось»: предложение `dev_state?delete=fail`.
- `onboarding-010` — длинное имя: предложение `dev_state?greet=<строка>` (подставляет `greetName`).

**Б. В КОДЕ НЕТ (дефект образца/кода, не «нет пути»).**
- `onboarding-016`, `onboarding-017` — «Уровень» выключен в сборке (`CleanOnboarding.tsx:217`); макет отмечает это в названии. Решение за владельцем: убрать кадры или включить шаг.
- `profile-027`, `overlays-runtime-017` — окно «Выйти из аккаунта?»: выход мгновенный, `stage='confirm'` недостижим (`account_details.tsx:347`); сценарий AUTH C1–C3 устарел. Решение за владельцем: убрать кадр или вернуть окно.
- `overlays-campaigns-013` — «Неверный формат» промокода: кнопка выключена, сообщения нет.
- `overlays-campaigns-021` — «Неверный формат» кода друга: кнопка выключена до 4 символов, статус `invalid` недостижим.
- `profile-026` — вместо макетного «Пригласить друга / Твой код ALEX-42» в коде экран «Награда за друга» с рулеткой.

**В. УСЛОВНО (путь есть, но нужна подготовка вне приложения или воспроизведение не гарантировано).**
- Коды промокода на сервере (D30, LIFE, EXP, LIM): `overlays-campaigns-007, 008, 010, 011, 012`, `settings-gap-004`. Подготовка: владелец/админка.
- Чужой код приглашения и «новый аккаунт»: `overlays-campaigns-019, 020, 024, 026`.
- Сбои сети: `onboarding-003` (медленная сеть), `onboarding-004`, `onboarding-008` (текст по коду ошибки), `settings-gap-024, 031` (проверка имени), `overlays-campaigns-006, 015, 018` (`adb emu network speed|delay`, авиарежим), `profile-028` (окно короткое), `auth-gap-016`, `profile-019` (скелетон).
- `profile-024` / `paywalls-022` — «покупок не найдено»: вместо оверлея на эмуляторе, скорее всего, тост ошибки.
- Раздел F сценария (удаление, восстановление): `auth-gap-006, 007` — только на аккаунте, названном владельцем.
- `paywalls-008, 009, 010` — зависят от мягких допродаж и серверного ИИ; один показ на этап.
- `settings-gap-012` — только Android 13+ (системное окно разрешения).

## Допущения и вопросы

1. Эмулятор Pixel_8 на API ≥33 (нужно для окна разрешения уведомлений); версия не проверялась.
2. Аккаунт B (№2) уже есть в Phraseman (с именем/прогрессом), аккаунт C (№3) — нет. Если C уже зарегистрирован, `onboarding-005` не снять. Подтвердить у координатора.
3. `dev_state` с `next=` содержащим `?` и `=`: адрес лучше кодировать (`%2F`, `%3F`, `%3D`); в этой среде не проверялся. Дочерние экраны Настроек можно открывать и прямым `next=/settings_notifications` и т. п., но по правилам контекста безопаснее тапами.
4. Тап по «Войти через Google» в онбординге — без testID, искать по тексту «Войти через Google» / «Продолжить с Google» (`clean_onboarding_copy_core.ts:37,70`); просьба «Ядру»: добавить testID.
5. Кадры «Plus не активна» и всё, что идёт после `plus=on|off`, нельзя вернуть к «естественному» состоянию без `pm clear`; снимать естественные состояния (3 дня полного доступа) первыми.
6. Отправка реального обращения в поддержку (`profile-015`/`settings-gap-023`), реальные вызовы ИИ (`paywalls-008`), ввод кодов в боевую базу — нужны разрешения координатора.
7. Вопрос владельцу: нужны ли кадры `profile-027`/`overlays-runtime-017`, если окно подтверждения выхода снято решением 12.10; нужны ли `onboarding-016/017`.
8. Вопрос владельцу: можно ли переименовать тестовый Google-аккаунт на длинное имя (для `onboarding-010`) и завести 4 тестовых промокода (D30, LIFE, EXP, LIM).
