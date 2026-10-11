# Список съёмки первого выпуска — Диалоги, Шпиль, пейволы, энергия, сообщество

Governance-ID: TG-A280B7BED1F1

Часть B: 164 строки реестра, группы G-D (Диалоги), G-S (Шпиль), G-P (пейвол Plus), G-E (режимы энергии), G-M (вкладка «Сообщество»: бывшие G-C01/G-C02 переименованы).

> Все пути выведены из КОДА (основное дерево, testID, dev_state, dev-переключатели); на устройстве не проверены — Сверка уточняет по ходу съёмки и пишет расхождения координатору.
> Индекс, порядок съёмки, общие правила и сводка «нет пути» — в `R1_SHOT_LIST.md`.

# Список съёмки · область B (Диалоги, Шпиль, вкладка Сообщества, режимы энергии, пейволы Plus)

Источник путей: основное дерево C:\appsprojects\phraseman (код). Всё ниже проверено чтением кода, на устройстве не запускалось.

## Условные обозначения (чтобы таблица была короче)
- **DS(параметры)** = `adb shell am start -a android.intent.action.VIEW -d "phraseman://dev_state?<параметры, & как \&>"`. Ждать testID `dev-state-done` (app/dev_state.tsx:47). Если задан `next=`, экран через 300 мс сам уходит туда.
- **DL(маршрут)** = `adb shell am start -a android.intent.action.VIEW -d "phraseman://<маршрут, & как \&>"` — прямая ссылка на экран. Для маршрутов с параметрами надёжнее двухшаговая схема: DS(...next=/(tabs)/home), затем DL(...). Тогда экран ложится поверх настоящей Главной, а не поверх тёмного экрана dev_state. Вложенный `next=/маршрут?a=b` в код не проверялся.
- **Г** = гость (pm clear, чистая установка). **№2 / №3** = тестовые Google-аккаунты (вход только выбором аккаунта в системном окне, пароли не вводить; шаги входа — docs/phraseman-2.0/AUTH_RELEASE1_TEST_SCENARIO_2026-10-11.md).
- **Т** = тёмная тема, насыщенность «Спокойно» (по умолчанию). Других тем в этой области не требуется. Светлые кадры energy-modes-states.html (вторая сетка страницы) не заказаны: номера кадров реестра 1–25 это первая, тёмная сетка.
- Нижняя панель: `tab-home`, `tab-lessons`, `tab-video`, `tab-community`, `tab-settings` (components/v2/V2TabBar.tsx:410, ключи — app/(tabs)/_layout.tsx:458–471). Касания ловит сама капсула, поэтому тапать по координатам центра элемента из uiautomator dump.
- Сбои сети: `adb shell cmd connectivity airplane-mode enable` / `disable`. Медленная сеть: `adb emu network delay gprs` (вернуть `none`).
- Права микрофона: `adb shell pm grant|revoke app.phraseman android.permission.RECORD_AUDIO`. Удержание кнопки: `adb shell input swipe X Y X Y 3000`.

---

## Группы маршрутов

### G-S01 · Шпиль — превью на моках (самая большая группа, ничего не сервер)
- **Подготовка:** Вход Г (аккаунт не нужен). `DS(energy=5&plus=off&free=on&spire=open&onboarding=done&next=/(tabs)/home)`. Затем `DL(dev_spire_preview?state=room&selector=1)`. Маршрут app/dev_spire_preview.tsx (только dev-сборка, `ENABLE_DEV_TOOLS && !IS_STORE_RELEASE`, строка 108). `selector=1` включает внизу полосу чипов с названиями состояний (строки 86–95): переключаться тапом по чипу по тексту, без перезапуска. Перед финальной съёмкой полосу убрать (перезайти без selector), иначе она попадёт в кадр. Состояние можно задать и параметром: `?state=<имя>`.
- **Путь (по состояниям из app/dev_spire_preview.tsx + components/spire/spire_preview_fixtures.ts:18):**
  1. `tour` (тур не виден): тур поднимается сам (SpireHomeScreen.tsx:285). Снять страницу 1, тап `spire-tour-next` (SpireTour.tsx:105) → страница 2 → тап → страница 3 (testID корня `spire-tour`, `spire-tour-skip` :92).
  2. `room`: главный экран (`spire-home`, башня `spire-tower`, карточка этажа `spire-floor-info`). Прокрутить вниз: `spire-friends`, `spire-podium`. Тап `spire-all-members` (SpirePodium.tsx:73) → `spire-all-screen`. Назад `spire-all-back`.
  3. `all` — то же «Все участники» сразу, 14 человек.
  4. `rules` — шторка правил `spire-rules-sheet` (SpireRulesSheet.tsx:38) открыта сама; промотать до конца (кадр «до конца»), закрыть `spire-rules-close`. В обычном `room` открывается кнопкой `spire-rules-open` (SpireHomeScreen.tsx:239).
  5. `win` (итог этажа, `spire-result-floor`), `summit` (`spire-result-summit`), `lose` (`spire-result-failed`, причина «сердца»), `save_failed` (`spire-result-save_failed`; testID строится как `spire-result-<outcome.kind>`, SpireResultPanel.tsx:98): панели итога стоят над башней, кнопки `spire-result-cta`, `spire-result-later` (SpireResultPanel.tsx:115,121).
  6. `weekresult` — карточка недели сверху (`spire-week-result`, SpireWeekResultCard.tsx:54); закрывается `spire-week-result-close`.
  7. `offline` — плашка `spire-offline` (SpireHomeScreen.tsx:246), чужие цифры приглушены.
  8. `empty` — комнаты нет: кнопка «Подняться» неактивна, пьедестал и «Все участники» без людей (SpirePodium: пустой список, кнопка disabled).
  9. `locked` — «Шпиль откроется чуть позже» (`spire-locked`, SpireLockedState.tsx:17).
  10. `step_choice`, `step_build`, `step_items`, `step_wrong`, `step_prep` — экран ступени (`spire-step`, кольцо `spire-step-ring`, задание `spire-task`, подсказка после ошибки `spire-step-hint`, «Дальше» `spire-step-continue`). Тексты заданий в превью — условные («She works every day»).
- **Кадры в группе:** spire-001, 002, 003, 004, 005, 006, 007, 008, 011, 013, 014, 017, community-002, community-003, community-004, community-005, spire-gap-003, 006, 009, 010, 011, 014, 015, 018, 019, 020; частично spire-010 и spire-012 (см. таблицу и «Нет пути»).
- **Оценка: 40 мин**

### G-S02 · Шпиль — «Нет энергии» (превью + энергия 0)
- **Подготовка:** Вход Г. `DS(energy=0&plus=off&free=on&spire=open&onboarding=done&next=/(tabs)/home)`, затем `DL(dev_spire_preview?state=room)`.
- **Путь:** кнопка «Подняться» заменяется серой пилюлей «Энергия через M:SS» (`spire-dock-no-energy`) и ссылкой «Поднимайся без ожидания с Plus ›» (`spire-dock-plus`, SpireClimbDock.tsx:45,56). Условие: `!premium && !isUnlimited && energyReady && energy+bonusEnergy<1` (:35) — если на свежей установке есть подарочная энергия (bonusEnergy>0), состояние не наступит: проверить значение в Dev Hub.
- **Кадры в группе:** spire-016.
- **Оценка: 4 мин**

### G-S03 · Шпиль — пилюля «бета» (язык изучения es/de/fr/it)
- **Подготовка:** Вход Г. DS(как в G-S01). Settings: `tab-settings` → `settings-study-language-row` (app/(tabs)/settings.tsx) → выбрать Español.
- **Путь:** `DL(dev_spire_preview?state=room)`. Пилюля `spire-beta-pill` рядом с заголовком (SpireHomeScreen.tsx:227). Условие: язык изучения в `['es','de','fr','it']` (:92,226) — мок-превью берёт язык из настроек, не из фикстуры.
- **Кадры в группе:** spire-gap-022. После съёмки вернуть English.
- **Оценка: 5 мин**

### G-S04 · Шпиль — настоящий (сервер, аккаунт №2)
- **Подготовка:** вход №2 (выбор аккаунта в окне Google). `DS(energy=5&plus=off&free=on&spire=open&onboarding=done&next=/(tabs)/community)`. Условие: на сервере `config/spire_v1.enabled=true` (второй замок, SpireHomeScreen.tsx:60–66), иначе вместо игры «откроется чуть позже» (это кадр spire-gap-011, но уже с настоящим экраном). Вкладка Шпиля может скрываться кэшем рубильников до 6 ч; при входе делается один принудительный перечит (community.tsx:84).
- **Путь:**
  1. Вкладка `tab-community` → сегменты `community-sections-spire` / `community-sections-friends` / `community-sections-packs` (app/(tabs)/community.tsx:~124). Кадр community-001: строка вкладок с «Шпиль» первым сегментом.
  2. Тап `community-sections-spire` → главный экран (комната недели грузится, 1 чтение).
  3. **spire-gap-007** (нет сети, пакет недели не скачался): дождаться, пока комната прогрузится онлайн, `airplane-mode enable`, тап `spire-climb` → над кнопкой строка причины, кнопка меняет подпись на «Повторить» (SpireClimbDock.tsx:61–76, `block==='pack_offline'`). Если в кэше уже лежит пакет недели — кадр не получится (чистить `pm clear`).
  4. Выключить авиарежим. Тап `spire-climb` → экран ступени `spire-step`. Энергия списывается при появлении первого задания.
  5. **spire-009** (выход): на ступени тап `spire-step-back` (SpireStepScreen.tsx:96) → шторка `spire-exit-sheet`; `spire-exit-continue`, `spire-exit-confirm`.
  6. **spire-gap-013** (ступень прервана): повторить п.4, на ступени `spire-step-back` → `spire-exit-confirm`. На главном экране панель `spire-result-failed` с причиной «backed_out».
  7. **spire-gap-012** (время вышло): стартовать ступень и ждать, пока кольцо `spire-step-ring` дойдёт до нуля (бюджет по умолчанию порядка 100 с, config.timer). Панель `spire-result-failed`, причина `timeout`.
  8. **spire-gap-021** (флажок жалобы): на активном задании красный флажок под заданием `spire-task-report-<номер>` (SpireStepScreen.tsx:189; виден только при языке изучения en/es/fr/de/it и пока можно отвечать). Только снять кадр, жалобу не отправлять.
- **Кадры в группе:** community-001, spire-009, spire-gap-007, 012, 013, 021.
- **Оценка: 30 мин**

### G-D01 · Диалоги — хаб, Free (выполнять ПОСЛЕ G-D05 на том же аккаунте)
- **Подготовка:** вход №2. `DS(energy=5&plus=off&free=on&onboarding=done&next=/(tabs)/home)`. Язык изучения English. Пилюля «N/30» рисуется только когда на телефоне есть зеркало квоты (`ai_dialog_monthly_quota:v3:*`, app/ai_dialog_daily_quota.ts:147), а оно появляется после первого ответа сервера в диалоге; до этого пилюли нет — поэтому сначала сыграть ход в G-D05.
- **Путь:** Главная → плитка `home-quick-dialogs` (app/(tabs)/home.tsx:2120) или `DL(ai_dialog_home)` → экран с шапкой «Диалоги», справа энергия и пилюля `ai-dialog-home-quota` (app/ai_dialog_home.tsx:67–80). Каталог: `dialogue-v2-catalogue-section`; карточка категории `dialogue-v2-world-<id>`; раскрытие — тап `dialogue-v2-world-toggle-<id>` (DialogueV2CatalogueSection.tsx:119), счётчик `dialogue-v2-world-count-<id>`; строка сценария `dialogue-v2-catalogue-row-<scenarioId>`; плитка «Свободный разговор» `dialogue-v2-plus-tool-freeform` (с замком у Free). Заметка «Входит в Plus» `dialogue-v2-hub-locked-note`. Идентификаторы категорий и сценариев берутся из uiautomator dump.
  - Тот же хаб есть и как страница «Диалоги» на вкладке «Уроки» (`tab-lessons` → подчёркнутая вкладка «Диалоги», lessons.tsx:5187): там пилюли в шапке нет (`showQuotaRow`).
- **Кадры в группе:** dialogs-001, dialogs-003, dialogs-006 (запись видео при тапе по `dialogue-v2-world-toggle-*`, берём кадр середины раскрытия).
- **Оценка: 10 мин**

### G-D02 · Диалоги — хаб, язык не поддержан
- **Подготовка:** вход Г. DS(как G-D01). `tab-settings` → `settings-study-language-row` → язык вне en/es/fr/de (например Italiano, если в списке). Вернуть English после съёмки.
- **Путь:** `DL(ai_dialog_home)`. Показывается карточка-замок `dialogue-v2-hub-language-gate` с кнопкой `dialogue-v2-hub-language-gate-cta` (DialogueV2HubNotices.tsx:121,128; условие в DialogueV2CatalogueContainer.tsx:266). То же при пустом каталоге (проекция без сценариев).
- **Кадры в группе:** dialogs-005.
- **Оценка: 6 мин**

### G-D03 · Диалоги — хаб, Plus
- **Подготовка:** вход Г или №2. `DS(energy=5&plus=on&free=off&onboarding=done&next=/(tabs)/home)` — это локальный override Plus (app/dev_plus_controls.ts). Серверные Plus-функции (память, свободный разговор) его могут не принять — см. допущения.
- **Путь:** `DL(ai_dialog_home)`. У Plus нет пилюли квоты, плитка «Свободный разговор» без замка.
- **Кадры в группе:** dialogs-002.
- **Оценка: 4 мин**

### G-D04 · Диалоги — брифинг, согласие на ИИ, окно «нет энергии»
- **Подготовка:** вход Г, `pm clear` (чтобы согласие на ИИ не было принято: ключ `ai_dialog_consent_v1`, app/ai_dialog_consent.ts:19). `DS(energy=5&plus=off&free=on&onboarding=done&next=/(tabs)/home)`.
- **Путь:**
  1. Хаб (G-D01). Тап по доступной строке `dialogue-v2-catalogue-row-<id>` → брифинг (`dialogue-v2-briefing-screen`, сцена `dialogue-v2-briefing-scene`, задания `dialogue-v2-briefing-tasks`, кнопка `dialogue-v2-briefing-start`; components/dialogs/DialogueV2BriefingScreen.tsx:68–110).
  2. **dialogs-008** закрыт по рангу: тап по строке с замком (status locked) → тот же экран с подписью «Откроется на ранге N», кнопка неактивна (app/dialogue_v2_briefing.tsx, `model.unlocked`). У гостя ранг низкий, закрытые строки есть.
  3. **dialogs-009** согласие: на брифинге тап `dialogue-v2-briefing-start` (спишет 1 энергию, затем откроется сессия, и поверх неё шторка согласия: `ai-dialog-consent-sheet`, `ai-dialog-consent-accept`, `ai-dialog-consent-decline`; components/AiConsentSheetModalHybrid.tsx:127–150, префикс AiDialogConsentModal.tsx:82). Снять шторку.
  4. **dialogs-010** гейт: тап `ai-dialog-consent-decline` → полноэкранное «AI-диалоги выключены» (app/ai_dialog_consent_gate.tsx:~100, кнопки по accessibilityLabel «Включить AI-диалоги» / «Открыть настройки приватности»; testID нет). Вернуть согласие: либо эта кнопка, либо `tab-settings` → `settings-privacy-row` → `privacy-ai-dialog-consent` (app/privacy_settings.tsx:318).
  5. **dialogs-011** нет энергии: назад на хаб, `DS(energy=0&plus=off&free=on)` без next, вернуться, брифинг → `dialogue-v2-briefing-start` → окно `NoEnergyModal variant=dialogs` (components/NoEnergyModal.tsx:490,503: `no-energy-modal-later`, `no-energy-modal-plus`; в режиме Б вместо него шторка `energy-needed-sheet`). Закрытие окна уводит с экрана диалога (briefing.tsx:289).
  6. **dialogs-007** брифинг «цель и задания» — кадр п.1.
- **Кадры в группе:** dialogs-007, 008, 009, 010, 011.
- **Оценка: 20 мин**

### G-D05 · Диалоги — сессия (настоящий ИИ, Free, аккаунт №2)
- **Подготовка:** вход №2. `DS(energy=5&plus=off&free=on&mode=a&onboarding=done&next=/ai_dialog_home)`; согласие на ИИ принято. Реальный ответ ИИ идёт через сервер: нужна сеть, расходуется месячный лимит Free (30 ответов).
- **Путь (общие testID, DialogueV2SessionScreen.tsx):** экран `dialogue-v2-session-screen`; шапка `dialogue-v2-session-header`; настроение `dialogue-v2-session-mood`; пилюля квоты `dialogue-v2-session-quota` (:329); меню «⋯» `dialogue-v2-session-more` (:338), в нём `dialogue-v2-session-menu`, `dialogue-v2-session-menu-tasks`, `dialogue-v2-session-menu-complete` (glass/DialogueGlassMenuSheet.tsx:46,67,86); карточка цели `dialogue-v2-session-goal` и её кнопка подсказки `dialogue-v2-session-goal-hint` (glass/DialogueGlassSessionParts.tsx:108); на пузырях: `dialogue-v2-translate-<id>`, `dialogue-v2-why-<id>`, `dialogue-v2-better-<id>`, `dialogue-v2-prepared-bot-voice-<id>`, `dialogue-v2-translation-<id>`, `dialogue-v2-message-<id>`; шторки `dialogue-v2-session-goals`, `dialogue-v2-session-hint`, `dialogue-v2-session-why`; поле ввода и кнопка ↑ БЕЗ testID — искать по accessibilityLabel (placeholder «Напиши или зажми микрофон», кнопка «Отправить»); индикатор набора `dialogue-v2-session-typing`.
  1. Брифинг → `dialogue-v2-briefing-start`. **dialogs-012:** первый кадр сессии, энергия 4 (пилюля `EnergyBar` в шапке, у Plus её нет).
  2. **dialogs-013** приветствие баристы — первый ответ собеседника на экране.
  3. Тап по полю ввода, ввести реплику, тап «Отправить». **dialogs-022** — кадр с клавиатурой до отправки. **dialogs-029** — «ИИ печатает» (кадр в момент `dialogue-v2-session-typing`; удобнее при `adb emu network delay gprs`). **dialogs-030** — ответ пришёл. **dialogs-014** — разговор идёт (2–3 хода).
  4. **dialogs-015** перевод: тап `dialogue-v2-translate-<id>` на пузыре собеседника → текст пузыря заменяется переводом, кнопка меняется на «Скрыть перевод».
  5. **dialogs-016** озвучка играет: тап `dialogue-v2-prepared-bot-voice-<id>` (кнопка есть только если для реплики есть готовая озвучка бота; иначе — «в коде нет» для этой реплики, брать другую).
  6. **dialogs-017** подсказка: тап `dialogue-v2-session-goal-hint` → окно `dialogue-v2-session-hint` (появляется, если есть текст подсказки).
  7. **dialogs-018** задания: тап по карточке цели `dialogue-v2-session-goal` или `dialogue-v2-session-more` → `dialogue-v2-session-menu-tasks` → шторка `dialogue-v2-session-goals`.
  8. **dialogs-019** и **dialogs-020** «Почему так»: тап `dialogue-v2-why-<id>` на пузыре собеседника → шторка `dialogue-v2-session-why`. Для Free есть счётчик разборов в день (DialogWhySheet.tsx, `dialogue-v2-why-exhausted` на :223, `dialogue-v2-why-open-plus` на :235; `ai-dialog-why-unlock` на :181; счётчик app/dialogue_v2_why_allowance.ts). Кадр 020 («разборы закончились») получается, если открыть «Почему так» больше раз, чем даёт дневной лимит.
  9. **dialogs-021** «Лучше так»: на реплике ученика после ответа с поправкой кнопка `dialogue-v2-better-<id>` → раскрывается вариант (DialogHowToSaySheet.tsx).
  10. **dialogs-036** выход: тап «Назад» в шапке (accessibilityLabel «Назад») после первой реплики → `dialogue-v2-session-exit` (кнопки `-cancel`, `-confirm`, glass/DialogueGlassExitSheet.tsx:41,64,72). Нажать `-cancel`.
  11. **dialogue-v2-session-more → dialogs-gap-015:** меню «⋯» открыто (`dialogue-v2-session-menu`).
- **Кадры в группе:** dialogs-012, 013, 014, 015, 016, 017, 018, 019, 020, 021, 022, 029, 030, 036, dialogs-gap-015.
- **Оценка: 40 мин**

### G-D06 · Диалоги — голосовой ввод (устройство)
- **Подготовка:** вход №2, сессия как в G-D05, до отправки первой реплики. `pm grant app.phraseman android.permission.RECORD_AUDIO` для кадров записи; `pm revoke` для кадра «нет доступа».
- **Путь:** кнопка микрофона `dialogue-v2-voice-input` (DialogueV2SessionScreen.tsx:523): нажатие и удержание = запись (onPressIn/onPressOut). Подсказка под полем `dialogue-v2-session-voice-hint` меняется: «Готовлю микрофон…» (starting) → «Говори…» (recording) → результат. Действие ошибки `dialogue-v2-session-voice-action`. Статусы голоса — app/dialogue_v2_session.tsx:543–558.
  - **dialogs-024:** удерживать микрофон, снимать кадр в первые ~1 с (status `starting`).
  - **dialogs-025:** продолжать удерживать (status `recording`, кнопка заполнена).
  - **dialogs-026:** распознанный текст встаёт в поле (нужно, чтобы на эмуляторе работало распознавание речи для en-US; если распознавателя нет, получится не «распознано», а dialogs-gap-013).
  - **dialogs-027:** ошибка «не расслышал» (`voice.failure==='not_heard'`): удержать микрофон в тишине.
  - **dialogs-028:** `pm revoke RECORD_AUDIO`, затем удерживать → `permission_denied`. Вариант «попытки кончились + бейдж PLUS» — серверный счётчик голосовых попыток, детерминированного пути нет.
  - **dialogs-gap-013:** распознавание не работает на устройстве: микрофон показывается с зачёркнутым значком (`mic-off-outline`) и текстом `speechUnavailableOnDeviceText` (voice.unavailableOnDevice). На Pixel_8-эмуляторе без Google Speech это может быть состоянием по умолчанию — проверить в первую очередь.
  - **dialogs-gap-014:** голосовое сообщение в ленте: после записи и отправки пузырь с `dialogue-v2-voice-message-<id>` (DialogueV2SessionScreen.tsx:461). Нужно рабочее распознавание.
- **Кадры в группе:** dialogs-024, 025, 026, 027, 028, dialogs-gap-013, dialogs-gap-014.
- **Оценка: 25 мин** (сильно зависит от микрофона эмулятора; если его нет — только 024, 028, gap-013)

### G-D07 · Диалоги — сбой сети во время хода
- **Подготовка:** сессия G-D05, ввести реплику, НЕ отправлять.
- **Путь:** `adb shell cmd connectivity airplane-mode enable` → тап «Отправить». Появляется плашка `dialogue-v2-session-turn-error` с кнопкой «Повторить» (DialogueV2SessionScreen.tsx:485). Причина `network` (app/dialogue_v2_session.tsx:360). Отключить авиарежим → «Повторить» отправит ход.
- **Кадры в группе:** dialogs-031.
- **Оценка: 6 мин**

### G-D08 · Диалоги — завершение и итог (настоящий ИИ)
- **Подготовка:** вход №2. Два прохода: A) без ошибок (простые верные реплики), B) с намеренными ошибками (кривая грамматика). Закончить диалог можно двумя способами: сценарий сам завершается ботом после выполнения целей, либо вручную: `dialogue-v2-session-more` → `dialogue-v2-session-menu-complete`.
- **Путь:**
  1. Бот завершил: внизу `dialogue-v2-session-end-veil` («финальная реплика», ввод скрыт) — **dialogs-037**; тап по ленте/пелене открывает итог.
  2. Итог: `dialogue-v2-completion-screen` (app/dialogue_v2_completion.tsx:~248), `…-header`, `…-stats`, `…-goals`, `…-errors` (только если есть ошибки), `…-mood`, `…-assessment`, `…-feedback` (карточка отзыва — только если пройдёт троттлинг `shouldPromptFeedback('dialogue')`), `…-done`, `…-again`. Заголовок «Диалог пройден» при endedBy=bot, «Разговор завершён» при ручном.
     - **dialogs-040** проход A (нет блока ошибок). **dialogs-041** проход B (блок `…-errors` «было → стало»).
     - **dialogs-043** ручное завершение (меню «⋯» → завершить).
     - **dialogs-042** карточка оценки раскрыта с полем комментария (`…-feedback`); **dialogs-044** после отправки «Спасибо! Отзыв отправлен». Отправка отзыва пишет в Firestore — тестовый аккаунт, один раз.
  3. **dialogs-038** «переписка после итога»: назад из итога на сессию → внизу пилюля `dialogue-v2-session-summary-pill` «Итоги».
  4. **dialogs-gap-007** «собеседник готовит итог…» (`dialogue-v2-completion-loading`): кратковременное состояние пока идёт вызов; удобно при `adb emu network delay gprs`.
  5. **dialogs-gap-008** «итог недоступен» (`dialogue-v2-completion-retry`): либо авиарежим на момент открытия итога, либо прямая ссылка с фальшивой сессией `DL(dialogue_v2_completion?sessionId=d2s_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA&scenarioId=<реальный id из каталога>&endedBy=manual&learnerTurns=2)` (формат id: `^d2s_[A-Za-z0-9_-]{32,96}$`, scenarioId — `^[a-z0-9]+(_[a-z0-9]+)*$`; сервер не найдёт сессию → `unavailable`).
- **Кадры в группе:** dialogs-037, 038, 040, 041, 042, 043, 044, dialogs-gap-007, dialogs-gap-008.
- **Оценка: 35 мин**

### G-D09 · Диалоги — память и свободный разговор (Plus/Free)
- **Подготовка:** вход №2. Память доступна из `tab-settings` → `settings-privacy-row` → `privacy-dialogue-memory` (privacy_settings.tsx:332) или `DL(dialogue_v2_memory)`. Свободный разговор: `DL(dialogue_v2_freeform)` либо плитка `dialogue-v2-plus-tool-freeform` в хабе (у Free она ведёт на `premium_modal?context=dialog_limit&source=dialogue_v2_freeform`, а не на экран).
- **Путь:**
  1. `DS(plus=off&free=on&…next=/(tabs)/home)`, `DL(dialogue_v2_memory)` → **dialogs-gap-003**: «без Plus, только удаление» (`dialogue-v2-memory-delete-only`, app/dialogue_v2_memory.tsx:317). Тап кнопки «Очистить» (`dialogue-v2-memory-clear-confirm`, :268) → стеклянное окно подтверждения (префикс `dialogue-v2-memory-clear`, :294) — **dialogs-gap-004** (подтверждать не нужно, нажать «Отмена»).
  2. **dialogs-gap-006** «не удалось очистить» (`dialogue-v2-memory-clear-failed`, :283): `airplane-mode enable`, подтвердить очистку. Очистка — на тестовом аккаунте с пустой памятью, ничего не потеряется.
  3. **dialogs-gap-005** «очищаем…» — подпись кнопки на время вызова (`clearing`, :269): ловится при `adb emu network delay gprs`.
  4. `DS(plus=on&free=off&…)`, `DL(dialogue_v2_memory)` → экран `dialogue-v2-memory-screen` (:332). **dialogs-gap-002** «Plus, пока пусто» — аккаунт без завершённых диалогов; **dialogs-gap-001** «Plus, со сводкой» — после G-D08 (память пишется при завершении диалога на сервере).
  5. `plus=on`, `DL(dialogue_v2_freeform)` → экран `dialogue-v2-freeform-screen`; **dialogs-045** пустое состояние `dialogue-v2-freeform-empty` («Что можно спросить»); ввести реплику → **dialogs-046** «разговор идёт» (индикатор `dialogue-v2-freeform-typing`).
  6. **dialogs-gap-010** «доступен в Plus»: `DS(plus=off…)`, `DL(dialogue_v2_freeform)` → `dialogue-v2-freeform-plus` (app/dialogue_v2_freeform.tsx:270, кнопка «Открыть Plus» ведёт в `premium_modal`).
  7. **dialogs-gap-011** «не удалось продолжить» (`dialogue-v2-freeform-unavailable`, :284): `plus=on`, `airplane-mode enable`, `DL(dialogue_v2_freeform)` (старт сессии падает).
- **Кадры в группе:** dialogs-gap-001, 002, 003, 004, 005, 006, 010, 011, dialogs-045, 046.
- **Оценка: 30 мин**

### G-D10 · Диалоги — сессия Plus
- **Подготовка:** вход №2. `DS(energy=5&plus=on&free=off&onboarding=done&next=/ai_dialog_home)`.
- **Путь:** хаб → строка сценария → брифинг → «Начать диалог» (энергия не списывается: confirmSpendOne вернёт `unlimited`, app/dialogue_v2_briefing.tsx) → сессия без пилюли квоты и без пилюли энергии. Кадр с первым ответом собеседника. Примечание: в реестре у dialogs-039 указан код freeform, но по описанию макета («нет пилюли квоты, нет стены лимита») это обычная сессия сценария у Plus.
- **Кадры в группе:** dialogs-039.
- **Оценка: 8 мин**

### G-E01 · Режим энергии Б — классический урок (кадры «Урок»)
- **Подготовка:** вход Г. `DS(energy=5&plus=off&free=on&mode=b&onboarding=done&next=/lesson_menu%3Fid%3D3)` — либо два шага: `next=/(tabs)/home`, затем `DL(lesson_menu?id=3)`. На меню урока тап `lesson-menu-primary` (app/lesson_menu.tsx:825) → `/lesson1` (шапка с HUD `lesson1-session-attempts`, app/lesson1.tsx:1069). Режим Б: старт бесплатный, каждая ошибка −1 энергия, сердечек нет (app/energy_mode.ts:1–15; режим действует на activity classic_lesson, lesson_words, irregular_verbs, learning_v2_session, flashcards).
- **Путь:**
  1. **energy-modes-001:** энергия 5, урок открыт, в HUD пилюля с числом без сердечек (`energy-mistake-hud`, `energy-mistake-hud-value`; EnergyMistakeHud.tsx:74,204,224).
  2. **energy-modes-002:** ошибиться в ответе → пилюля трясётся, вылетает «−1» (`energy-mistake-hud-loss`, :232).
  3. **energy-modes-003:** остаться с 1 энергией (`DS(energy=1&mode=b)` до входа в урок или ошибаться): при последней энергии тост `last_energy` (components/energy/energy_toasts.ts:42, вызывается в EnergyAttemptsHud.tsx:61).
  4. **energy-modes-004:** с `energy=1` ошибиться → шторка остановки `energy-stop-sheet` (заголовок `energy-stop-title`, текст `energy-stop-body`; components/energy/EnergyStopSheet.tsx:122–134).
  5. **energy-modes-005:** на шторке тап `energy-stop-plus` (:139) → `premium_modal` с source `energy_stop_sheet` (шторка Plus поверх урока).
  6. **energy-modes-006 (гипотеза):** с открытой шторкой остановки выполнить `DS(plus=on)` БЕЗ next, дождаться `dev-state-done`, вернуться «Назад»: в EnergyStopSheet.tsx:63–68 при `isUnlimited` занятие продолжается само, показывается тост `plus_resumed`. Не проверено: нужно ли, чтобы локальный Plus-override давал `isUnlimited`, и не закроет ли возврат из dev_state сессию.
  7. **energy-modes-007:** `energy=0&mode=b` до входа → попытка начать занятие даёт не окно, а шторку «Нужна энергия» (`energy-needed-sheet`, `energy-needed-title`, таймер `energy-needed-timer`, кнопки `energy-needed-plus`, `energy-needed-wait`; EnergyNeededSheet.tsx:143–180; ветка `neededSheetMode` в NoEnergyModal.tsx:630). Либо выйти из остановленного занятия кнопкой `energy-stop-exit`.
  8. **energy-modes-008 (гипотеза):** при открытой шторке «Нужна энергия» выполнить `DS(energy=1)` без next и вернуться: EnergyNeededSheet.tsx:90–99 при `missing===0` показывает тост `energy_restored` и закрывает шторку. Иначе — ждать естественного восстановления (интервал `recoveryIntervalMs`, десятки минут), не вариант.
- **Кадры в группе:** energy-modes-001, 002, 003, 004, 005, 006, 007, 008.
- **Оценка: 25 мин**

### G-E02 · Режим Б — «Слова» (кадр 009)
- **Подготовка:** `DS(energy=5&plus=off&free=on&mode=b&next=/(tabs)/home)`, `DL(lesson_menu?id=3)`.
- **Путь:** тап `lesson-menu-words` (lesson_menu.tsx:890 → `/lesson_words?id=3&tab=train`, HUD `lesson-words-session-attempts`, app/lesson_words.tsx:3236; корень `lesson-words-training`). Кадр: тренировка слов с пилюлей без сердечек.
- **Кадры в группе:** energy-modes-009. **Оценка: 6 мин**

### G-E03 · Режим Б — «Неправильные глаголы» (кадр 010)
- **Подготовка:** как G-E02, режим b.
- **Путь:** `lesson-menu-irregular-verbs` (lesson_menu.tsx:965 → `/lesson_irregular_verbs?id=3`, HUD `irregular-verbs-session-attempts`, app/lesson_irregular_verbs.tsx:790).
- **Кадры в группе:** energy-modes-010. **Оценка: 6 мин**

### G-E04 · Режим Б — Learning V2 (кадр 011)
- **Подготовка:** `DS(…mode=b…next=/(tabs)/lessons)`.
- **Путь:** вкладка уроков → переключатель «V2» (TabUnderlineButton label "V2", lessons.tsx:5210; виден, если `LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY`) → карта → занятие → «Начать» → `/learning-v2/session/[id]` (HUD `learning-v2-route-intro-attempts`, app/learning-v2/session/[id].tsx:1415 на вводном экране; на самом занятии HUD в строках 1465 и далее). Прямую ссылку без handoff не строить (в lessons.tsx:3592 экран открывается с параметрами `runtimeMode=direct_v1`, `sessionRunId`).
- **Кадры в группе:** energy-modes-011. **Оценка: 8 мин**

### G-E05 · Режим Б — Карточки: тренировка (кадр 012)
- **Подготовка:** `DS(energy=5&plus=off&free=on&mode=b&cards=demo&next=/(tabs)/home)` (cards=demo даёт наполненный аккаунт; запускать на тестовом госте).
- **Путь:** Главная → `home-quick-flashcards` (home.tsx:2134) → хаб карточек → «Тренировка» → режим «Блиц» → «Начать» (экран app/flashcards_training_setup.tsx, у кнопки testID нет — искать по тексту «Начать», :209). HUD: Блиц `fc-blitz-attempts-*` (app/flashcards_blitz_session.tsx:1462), «Вспомнить» `fc-recall-session-attempts`, «Свайп» `flashcards-truefalse-attempts-hud`. Макет показывает «Блиц · 2 набора».
- **Кадры в группе:** energy-modes-012. **Оценка: 8 мин**

### G-E06 · Режим Б — Диалоги и Фраза дня (энергия за ошибки не снимается)
- **Подготовка:** вход №2, `DS(energy=5&plus=off&free=on&mode=b&…)`.
- **Путь:**
  - **energy-modes-013:** сессия диалога (G-D05) — старт тратит 1 энергию как раньше (режим Б на диалоги не действует: app/energy_mode.ts, список MISTAKE_CHARGE_ACTIVITIES); сделать ошибочную реплику, показать, что пилюля энергии не меняется. Кадр: шапка сессии с энергией.
  - **energy-modes-014:** Главная → карточка `home-v2-phrase-of-day` (components/DailyPhraseCard.tsx:639) → открыть фразу дня; «Фраза дня» энергию не тратит вовсе. Кадр: экран фразы без пилюли энергии/с неизменной.
- **Кадры в группе:** energy-modes-013, 014. **Оценка: 10 мин**

### G-E07 · Режим А (первый выпуск)
- **Подготовка:** вход Г. `DS(energy=5&plus=off&free=on&mode=a&onboarding=done&next=/(tabs)/home)`.
- **Путь:** `DL(lesson_menu?id=3)` → `lesson-menu-primary` (или любое занятие).
  - **energy-modes-015:** старт занятия: энергия 5 → 4 в пилюле (`LessonEnergyPill` в шапке lesson1, lesson1.tsx:1067, показывается только в режиме А).
  - **energy-modes-016:** ошибиться: сердечки (`lesson1-session-attempts`), серия монет по сердцам (HUD SessionAttemptsHud).
  - **energy-modes-017:** `DS(energy=0&mode=a)` без next, вернуться на меню → тап `lesson-menu-primary` → окно `NoEnergyModal` (`no-energy-modal-plus`, `no-energy-modal-later`; в режиме А это окно, а не шторка).
- **Кадры в группе:** energy-modes-015, 016, 017. **Оценка: 12 мин**

### G-P01 · Пейвол Plus — контекстные входы (dev-сборка, цены-заглушки)
- **Подготовка:** вход Г. `DS(plus=off&free=on&energy=5&onboarding=done&next=/(tabs)/home)`. Ссылки: `DL(premium_modal?context=<ctx>&source=<src>)` — маршрут /premium_modal, параметры разбирает app/paywall_entry_contract.ts:215 (`context` из PremiumContext, `source` из PAYWALL_SOURCE_VALUES, неизвестные в dev бросают ошибку). Пейвол не открывается при активном Plus (`decision: dismiss`, :234) — проверить `plus=off`. Dev-сборка: `DEV_MODE=true` ⇒ `DEV_IAP_BYPASS` (app/config.ts:49,125): магазин не опрашивается, цены берутся из заглушек €39,99 в год / €7,99 в месяц (app/paywall_dev_preview.ts, paywall_purchase.ts:668–695). Тап по кнопке покупки показывает только dev-предупреждение (:871–875), не жать.
- **Путь (testID — components/paywall/PaywallPlus.tsx, PaywallPlusScreen.tsx):** шторка `paywall-sheet`; заголовок `paywall-title`; пилюля `paywall-context-pill`; плитки `paywall-plan-yearly`, `paywall-plan-monthly`; лента пробного `paywall-trial-timeline`; сравнение «Free и Plus» `paywall-compare-toggle` (PaywallBenefitComparison.tsx:148); кнопка `paywall-cta`; закрыть `paywall-close`.
  1. **paywall-gap-001:** `DL(premium_modal?context=generic&source=settings_premium)` или `tab-settings` → `settings-plus-row` (settings.tsx:1126; он ведёт ровно на эти параметры, :769–772). Верх шторки.
  2. **paywall-gap-002:** прокрутить вниз к блоку «Free и Plus», свёрнут.
  3. **paywall-gap-003:** тап `paywall-compare-toggle` → развёрнут.
  4. **paywall-gap-004:** `DL(premium_modal?context=generic&source=settings_premium&_force_trial_ui=1)` — в dev параметр форсит пробный период 3 дня (`devForceTrial`, paywall_purchase.ts:810–821), появляется `paywall-trial-timeline` перед плитками.
  5. **paywall-gap-005:** на любом входе тап `paywall-plan-monthly` — плитка «Месяц» выбрана, подпись `paywall-cta` меняется.
  6. **paywall-gap-007:** `DL(premium_modal?context=flashcard_limit&source=flashcards_collection)` — «Место для карточек закончилось», пилюля «50 из 50» (paywall_context_texts.ts:194,535).
  7. **paywall-gap-008:** `context=flashcard_training&source=flashcards_training_setup` (:205).
  8. **paywall-gap-009:** `context=flashcard_create&source=card_editor_create` (:216).
  9. **paywall-gap-010:** `context=pack_create&source=pack_create` (pack_create в списке источников, entry_contract.ts:10).
  - Если эти же экраны хочется снять «вживую»: лимит 50 карточек — `card_editor_limit`, лимит тренировок — `flashcards_training_setup`; это требует наполненного аккаунта Free, прямая ссылка проще.
- **Кадры в группе:** paywall-gap-001, 002, 003, 004, 005, 007, 008, 009, 010.
- **Оценка: 14 мин**

### G-M01 · Сообщество — вкладки, наборы, пустой список друзей
- **Подготовка:** вход Г. `DS(spire=open&plus=off&free=on&cards=demo&onboarding=done&next=/(tabs)/community)`.
- **Путь:** `tab-community` → `community-sections-friends` (по умолчанию) — свежий гость без друзей: **community-020** `friends-list-empty` с кнопкой `friends-empty-add` (components/friends/FriendsEmptyState.tsx:75,91). Тап `community-sections-packs` → **community-025**: каталог наборов (app/flashcards_packs.tsx, `flashcards-packs-title-embedded` :491, поиск, чипы `flashcards-packs-chip-*`, карточки `flashcards-pack-card-<id>`; `cards=demo` кладёт 5 наборов сообщества, app/dev_state_cards_demo.ts).
- **Кадры в группе:** community-020, community-025 (community-001 снимается в G-S04).
- **Оценка: 8 мин**

### G-M02 · Друзья — два аккаунта
- **Подготовка:** аккаунты №2 и №3, поочерёдно (смена аккаунта: сценарий AUTH §смена). На каждом `DS(onboarding=done&plus=off&free=on&next=/(tabs)/community)`. Разворачивать `community-sections-friends` (app/(tabs)/friends.tsx).
- **Путь (testID — friends.tsx, components/friends/*):** открыть шторку добавления `friends-open-add` (:2175) → `friends-add-sheet` (:670): поле `friends-code-input` (:691), кнопка поиска `friends-search` (:714), результат — карточка `friends-found-user-card` с кнопкой `friends-add-found` и скрытием `friends-found-hide` (FriendsFoundCard.tsx:41–65), строка ошибки поиска `friends-search-error` (:725), строка итога `friends-add-feedback` (:754), «Поделиться кодом» `friends-share-code` (:760). Свой дружеский код — там же в шторке/на экране (искать текст кода uiautomator dump).
  1. **community-007:** тап `friends-open-add` → шторка (в реестре подпись «центрированное окно», в коде — нижняя шторка `FriendsAddSheetShell`: расхождение образца и кода).
  2. **community-008:** ввести любой существующий код/ник, тап `friends-search` при `adb emu network delay gprs` → скелетон `friends-search-skeleton` (:730) на время запроса.
  3. **community-012:** ввести заведомо несуществующий код (например `ZZZZZZ`) → «Пользователь не найден».
  4. **community-013:** ввести СВОЙ код → случайная шутка про свой код (`randomSelfFriendCodeMessage`, friends.tsx:1579).
  5. **community-009:** на №2 ввести код №3 → карточка `friends-found-user-card`, профиль найден.
  6. **community-017:** тап `friends-add-found` → «Заявка отправлена!» (`friends-add-feedback`, :1693, :1704).
  7. **community-019:** повторить п.5–6 для того же адресата → «Заявка уже отправлена» (:1708).
  8. **community-006:** переключиться на №3: в списке карточка заявки `friend-request-row-<uid>` с кнопками `friend-request-accept-<uid>`, `friend-request-decline-<uid>` (FriendsRequestCard.tsx:45–74), заголовок «Активные заявки». Принять (`…accept`) — они друзья; снять кадр «список и заявки» ДО принятия.
  9. **community-018:** после принятия на №2 снова найти код №3 → тап `friends-add-found` → «Уже друзья» (:1705).
  10. **community-015:** `airplane-mode enable`, ввод кода, `friends-search` → строка `friends-search-error`: «Связь пропала … Проверь интернет» (catch, транзиентный, :1650).
  11. **community-021:** «ошибка обновления / офлайн» — на гостевом аккаунте без друзей, `airplane-mode enable`, перезапуск вкладки (кэш списка пуст): пустое состояние превращается в `friends-list-offline` с кнопкой `friends-offline-retry` (FriendsEmptyState.tsx:75,91; условие `friendsListError`, friends.tsx:2216). Если у аккаунта уже есть кэш друзей, ошибка не показывается.
  12. **community-024:** подтверждение удаления друга: нажать на друга в списке (`friend-row-body-<uid>` / `friend-row-avatar-<uid>`, FriendListRow.tsx:94,105) → карточка игрока → действие «Удалить из друзей» → окно `friends-delete-confirm` (friends.tsx:2442). Только снять кадр и нажать «Отмена».
- **Кадры в группе:** community-006, 007, 008, 009, 012, 013, 015, 017, 018, 019, 021, 024.
- **Оценка: 40 мин**

---

## Таблица строк

| id | кадр образца (файл №N) | группа | как попасть именно в этот кадр | вход | тема/насыщ. |
|---|---|---|---|---|---|
| spire-001 | spire.html №1 | G-S01 | `dev_spire_preview?state=tour`, страница 1 тура (`spire-tour`) | Г | Т |
| spire-002 | spire.html №2 | G-S01 | то же, тап `spire-tour-next` → страница 2 | Г | Т |
| spire-003 | spire.html №3 | G-S01 | то же, ещё тап `spire-tour-next` → страница 3 | Г | Т |
| spire-004 | spire.html №4 | G-S01 | `state=room`: башня (`spire-tower`); в превью маркер на 7 этаже, в макете на 4 (данные мока) | Г | Т |
| spire-005 | spire.html №5 | G-S01 | `state=room`, прокрутка вниз: `spire-friends`, `spire-podium` | Г | Т |
| spire-006 | spire.html №6 | G-S01 | `state=all` или `spire-all-members` на room → `spire-all-screen` | Г | Т |
| spire-007 | spire.html №7 | G-S01 | `state=step_choice` (`spire-step`, `spire-task`) | Г | Т |
| spire-008 | spire.html №8 | G-S01 | `state=step_wrong` (`spire-step-hint`, «Дальше» `spire-step-continue`) | Г | Т |
| spire-009 | spire.html №9 | G-S04 | настоящая ступень: `spire-step-back` → `spire-exit-sheet`. В превью exitSlot=null, шторки нет | №2 | Т |
| spire-010 | spire.html №10 | G-S01 (частично) | в превью НЕТ состояния «passed» (`spire-result-passed`); ближайшее `win` показывает итог этажа. Точный кадр — настоящая игра: пройти ступень в G-S04 | Г / №2 | Т |
| spire-011 | spire.html №11 | G-S01 | `state=lose` (`spire-result-failed`, причина «сердца») | Г | Т |
| spire-012 | spire.html №12 | G-S01 (частично) | `state=win` (`spire-result-floor`): в превью этаж 7→8, не страж. В макете «Этаж 4 → Страж» (этаж 5, `spireIsGuard` каждые 5). Точный кадр — нет пути | Г | Т |
| spire-013 | spire.html №13 | G-S01 | `state=summit` (`spire-result-summit`, 15 этаж) | Г | Т |
| spire-014 | spire.html №14 | G-S01 | `state=weekresult` (`spire-week-result`): promoted=true. В превью новый ранг 3, в макете «Базальт» — расхождение данных мока | Г | Т |
| spire-015 | spire.html №15 | — | НЕТ ПУТИ: в `weekresult` зашито promoted=true; состояния «остаёшься» нет | — | Т |
| spire-016 | spire.html №16 | G-S02 | `energy=0`, `state=room`: `spire-dock-no-energy`, `spire-dock-plus` | Г | Т |
| spire-017 | spire.html №17 | G-S01 | `state=offline`: плашка `spire-offline`, приглушённые чужие данные | Г | Т |
| dialogs-001 | dialogs.html №1 | G-D01 | `ai_dialog_home` (плитка `home-quick-dialogs`), Free; пилюля `ai-dialog-home-quota` только после первого ответа сервера | №2 | Т |
| dialogs-002 | dialogs.html №2 | G-D03 | то же при `plus=on`: без пилюли квоты, плитка свободного разговора без замка | Г/№2 | Т |
| dialogs-003 | dialogs.html №4 | G-D01 | тап `dialogue-v2-world-toggle-<id>` → строки всех видов (done / available / locked, `dialogue-v2-catalogue-row-*`, `dialogue-v2-hub-locked-note`) | №2 | Т |
| dialogs-004 | dialogs.html №5 | — | НЕТ ПУТИ: лимит 0/30 берётся из зеркала квоты (`ai_dialog_monthly_quota:v3:*`), записать его нечем. Нужно: `dev_state?dialogs_quota=0` (запись зеркала через `recordAiDialogMonthlyQuotaFromServer`, app/ai_dialog_daily_quota.ts:185). Карточка `dialogue-v2-hub-exhausted` | №2 | Т |
| dialogs-005 | dialogs.html №6 | G-D02 | язык изучения вне en/es/fr/de → `dialogue-v2-hub-language-gate` | Г | Т |
| dialogs-006 | dialogs.html №7 | G-D01 | запись при тапе `dialogue-v2-world-toggle-<id>`, кадр середины каскада | №2 | Т |
| dialogs-007 | dialogs.html №8 | G-D04 | тап доступной строки → `dialogue-v2-briefing-screen`, `…-tasks` | Г | Т |
| dialogs-008 | dialogs.html №9 | G-D04 | тап строки с замком → брифинг «Откроется на ранге N» | Г | Т |
| dialogs-009 | dialogs.html №10 | G-D04 | первое «Начать диалог» без согласия → `ai-dialog-consent-sheet`; энергия к этому моменту уже списана | Г | Т |
| dialogs-010 | dialogs.html №11 | G-D04 | `ai-dialog-consent-decline` → экран «AI-диалоги выключены» | Г | Т |
| dialogs-011 | dialogs.html №12 | G-D04 | `energy=0`, брифинг → `dialogue-v2-briefing-start` → `NoEnergyModal` (`no-energy-modal-plus`) | Г | Т |
| dialogs-012 | dialogs.html №13 | G-D05 | `energy=5`, старт диалога: первый кадр сессии, энергия 4 | №2 | Т |
| dialogs-013 | dialogs.html №14 | G-D05 | первый ответ собеседника на экране сессии | №2 | Т |
| dialogs-014 | dialogs.html №15 | G-D05 | 2–3 хода переписки | №2 | Т |
| dialogs-015 | dialogs.html №16 | G-D05 | тап `dialogue-v2-translate-<id>` на пузыре собеседника | №2 | Т |
| dialogs-016 | dialogs.html №17 | G-D05 | тап `dialogue-v2-prepared-bot-voice-<id>` (только у реплик с готовой озвучкой) | №2 | Т |
| dialogs-017 | dialogs.html №18 | G-D05 | `dialogue-v2-session-goal-hint` → `dialogue-v2-session-hint` | №2 | Т |
| dialogs-018 | dialogs.html №19 | G-D05 | `dialogue-v2-session-goal` или меню → `dialogue-v2-session-menu-tasks` → `dialogue-v2-session-goals` | №2 | Т |
| dialogs-019 | dialogs.html №19 | G-D05 | в реестре метка кадра №19 «Задания», экран «Почему так»: тап `dialogue-v2-why-<id>` → `dialogue-v2-session-why` | №2 | Т |
| dialogs-020 | dialogs.html №20 | G-D05 | «Почему так» открыть после исчерпания дневных разборов → `dialogue-v2-why-exhausted`, `dialogue-v2-why-open-plus` | №2 | Т |
| dialogs-021 | dialogs.html №22 | G-D05 | `dialogue-v2-better-<id>` на реплике ученика с поправкой | №2 | Т |
| dialogs-022 | dialogs.html №23 | G-D05 | тап по полю ввода (по accessibilityLabel placeholder) — клавиатура открыта | №2 | Т |
| dialogs-023 | dialogs.html №24 | — | НЕТ ПУТИ: настроение собеседника («упало», `dialogue-v2-session-mood`) определяет ИИ-ответ сервера. Нужно: `dev_dialog_mood=sad` в фикстуре | №2 | Т |
| dialogs-024 | dialogs.html №25 | G-D06 | удержание `dialogue-v2-voice-input`, первая секунда: «Готовлю микрофон…» | №2 | Т |
| dialogs-025 | dialogs.html №26 | G-D06 | продолжать удержание: «Говори…» | №2 | Т |
| dialogs-026 | dialogs.html №27 | G-D06 | отпустить: текст встаёт в поле (нужно распознавание речи на эмуляторе) | №2 | Т |
| dialogs-027 | dialogs.html №28 | G-D06 | удержание в тишине → «не расслышал» + `dialogue-v2-session-voice-action` | №2 | Т |
| dialogs-028 | dialogs.html №29 | G-D06 | `pm revoke RECORD_AUDIO` + удержание → `permission_denied`. «Попытки кончились + PLUS» — нет детерминированного пути | №2 | Т |
| dialogs-029 | dialogs.html №30 | G-D05 | `dialogue-v2-session-typing` после отправки (медленная сеть) | №2 | Т |
| dialogs-030 | dialogs.html №31 | G-D05 | ответ пришёл | №2 | Т |
| dialogs-031 | dialogs.html №32 | G-D07 | авиарежим, «Отправить» → `dialogue-v2-session-turn-error` + «Повторить» | №2 | Т |
| dialogs-032 | dialogs.html №33 | — | НЕТ ПУТИ: «сервис недоступен / слишком много сообщений» — коды сервера `service`/`rate_limited` (app/dialogue_v2_session.tsx:360–380). Нужно: `dev_dialog_fail=service|rate_limited` | №2 | Т |
| dialogs-033 | dialogs.html №34 | — | НЕТ ПУТИ: kill-switch раздела (`reason==='paused'`, :375) задаётся сервером. Нужно: `dev_state?dialogs_paused=1` | №2 | Т |
| dialogs-034 | dialogs.html №35 | — | НЕТ ПУТИ: «последний ответ 1/30» — значение из зеркала квоты. Нужно: `dev_state?dialogs_quota=1` | №2 | Т |
| dialogs-035 | dialogs.html №36 | — | НЕТ ПУТИ: стена лимита `dialogue-v2-session-limit-wall` — по зеркалу/ответу `quota_exhausted`. Нужно: `dev_state?dialogs_quota=0` | №2 | Т |
| dialogs-036 | dialogs.html №37 | G-D05 | «Назад» после первой реплики → `dialogue-v2-session-exit` | №2 | Т |
| dialogs-037 | dialogs.html №38 | G-D08 | бот завершил диалог → `dialogue-v2-session-end-veil`, ввод скрыт. Зависит от того, как ИИ ведёт сценарий; вручную только «Завершить» (даёт кадр dialogs-043) | №2 | Т |
| dialogs-038 | dialogs.html №39 | G-D08 | возврат из итога на сессию → `dialogue-v2-session-summary-pill` | №2 | Т |
| dialogs-039 | dialogs.html №40 | G-D10 | `plus=on`, сессия сценария: нет `dialogue-v2-session-quota`, нет стены (в реестре указан код freeform — он относится к соседнему экрану) | №2 | Т |
| dialogs-040 | dialogs.html №41 | G-D08 | итог при диалоге без ошибок (`dialogue-v2-completion-screen`, нет `…-errors`) | №2 | Т |
| dialogs-041 | dialogs.html №41 | G-D08 | итог с ошибками: в реплики намеренно вставить ошибки → `dialogue-v2-completion-errors` | №2 | Т |
| dialogs-042 | dialogs.html №43 | G-D08 | `dialogue-v2-completion-feedback` раскрыт (только если пройдёт троттлинг отзыва) | №2 | Т |
| dialogs-043 | dialogs.html №44 | G-D08 | ручное завершение: меню → `dialogue-v2-session-menu-complete`, заголовок «Разговор завершён» | №2 | Т |
| dialogs-044 | dialogs.html №45 | G-D08 | отправка отзыва → «Спасибо! Отзыв отправлен» | №2 | Т |
| dialogs-045 | dialogs.html №53 | G-D09 | `plus=on`, `dialogue_v2_freeform`: `dialogue-v2-freeform-empty` | №2 | Т |
| dialogs-046 | dialogs.html №54 | G-D09 | реплика в свободном разговоре; `dialogue-v2-freeform-typing`, ответ | №2 | Т |
| community-001 | community.html №1 | G-S04 | `tab-community`: сегменты `community-sections-spire / -friends / -packs` | №2 | Т |
| community-002 | community.html №2 | G-S01 | `state=room`, фрагмент: пьедестал топ-3 `spire-podium` | Г | Т |
| community-003 | community.html №3 | G-S01 | `state=all`: «Все участники» `spire-all-screen` | Г | Т |
| community-004 | community.html №4 | G-S01 | `state=rules`: `spire-rules-sheet` (8 правил) | Г | Т |
| community-005 | community.html №5 | G-S01 | `state=weekresult`: карточка `spire-week-result` на главном | Г | Т |
| community-006 | community.html №6 | G-M02 | аккаунт №3 с входящей заявкой: `friend-request-row-<uid>` + список | №3 | Т |
| community-007 | community.html №7 | G-M02 | `friends-open-add` → `friends-add-sheet`. В коде это нижняя шторка, а не окно по центру | №2 | Т |
| community-008 | community.html №8 | G-M02 | поиск при `adb emu network delay gprs` → `friends-search-skeleton` | №2 | Т |
| community-009 | community.html №9 | G-M02 | код №3 в поле, `friends-search` → `friends-found-user-card` | №2 | Т |
| community-010 | community.html №9 | — | НЕТ ПУТИ (детерминированно): состояние «отправка заявки» (`isAdding`) живёт доли секунды, карточка сразу скрывается оптимистично (friends.tsx:1680–1685). Нужно: задержка сети `adb emu network delay gprs` на `friends-add-found` — кадр возможен, но с первой секунды очень короткий | №2 | Т |
| community-011 | community.html №9 | — | НЕТ ПУТИ: «заявку не удалось отправить» (результат `error`, не `network`) — ответ сервера. Авиарежим даёт другой текст «Связь пропала» | №2 | Т |
| community-012 | community.html №9 | G-M02 | несуществующий код `ZZZZZZ` → `friends-search-error` «Пользователь не найден» | №2 | Т |
| community-013 | community.html №9 | G-M02 | свой код → `friends-search-error` (шутка про свой код) | №2 | Т |
| community-014 | community.html №9 | — | НЕТ ПУТИ: «профиль найден, но не синхронизирован» (friends.tsx:1595) — нужен пользователь, найденный в индексе кодов, но без публичного профиля. Нужно: dev-код `DEVUNSYNCED` в `lookupUserByFriendCode` | №2 | Т |
| community-015 | community.html №9 | G-M02 | авиарежим + поиск → `friends-search-error` «Связь пропала» | №2 | Т |
| community-016 | community.html №9 | — | НЕТ ПУТИ: «другая ошибка» — нетранзиентное исключение поиска (friends.tsx:1650, ветка «Сейчас не получилось»). Нужно: `dev_friends_fail=search` | №2 | Т |
| community-017 | community.html №17 | G-M02 | `friends-add-found` → `friends-add-feedback` «Заявка отправлена!» | №2 | Т |
| community-018 | community.html №18 | G-M02 | после принятия заявки повторно найти код и `friends-add-found` → «Уже друзья» | №2 | Т |
| community-019 | community.html №19 | G-M02 | повторная заявка тому же адресату → «Заявка уже отправлена» | №2 | Т |
| community-020 | community.html №20 | G-M01 | гость без друзей: `friends-list-empty`, `friends-empty-add` | Г | Т |
| community-021 | community.html №11 | G-M02 | авиарежим на аккаунте с пустым кэшем друзей → `friends-list-offline`, `friends-offline-retry` | Г | Т |
| community-022 | community.html №13 | — | НЕТ ПУТИ: окно «приглашение на занятие» (`friend-study-invite-modal`, FriendStudyInviteModal.tsx:28) открывается из социального события `study_invite` (friends.tsx:2030), которое создаёт сервер от друга. Нужно: `dev_state?friend_event=study_invite` (событие в `friendEvents`). «Вместе» в релизе выключено (`friendsTogetherUiEnabled=false`, :810) | №2 | Т |
| community-023 | community.html №14 | G-M02 (частично) | опрос дня `daily-poll-card` (components/friends/DailyPollCard.tsx:130) виден над списком, только если сервер отдал опрос дня; активность друзей рядом — без друзей пусто. Проверить на аккаунте с друзьями | №2/№3 | Т |
| community-024 | community.html №15 | G-M02 | профиль друга → «Удалить» → окно `friends-delete-confirm`, нажать «Отмена» | №2 | Т |
| community-025 | community.html №16 | G-M01 | `community-sections-packs`, `cards=demo`: каталог наборов | Г | Т |
| paywalls-011 | paywall-price-states.html №1 | — | НЕТ ПУТИ: «загрузка условий» (скелетон `paywall-plans-skeleton`) невозможна в dev: `loadOfferings` выходит при `DEV_IAP_BYPASS` (paywall_purchase.ts:459), цены сразу заглушки. Нужно: `premium_modal?…&_dev_state=loading` | Г | Т |
| paywalls-012 | paywall-price-states.html №2 | — | НЕТ ПУТИ: «ошибка до checkout / цен нет / магазин недоступен / справочная цена ≈» — состояния `error` и `priceSource='reference'` в dev не достижимы. Нужно: `_dev_state=error_no_prices | billing_unavailable | reference` | Г | Т |
| paywalls-013 | paywall-price-states.html №4 | — | НЕТ ПУТИ: «проверяем покупку, идёт оплата» (`purchasing`) требует настоящую покупку; в dev тап даёт только предупреждение. Нужно: `_dev_state=purchasing` | Г | Т |
| paywalls-014 | paywall-price-states.html №6 | — | НЕТ ПУТИ: диалог «ожидание банка или родителя» (app/paywall_purchase.ts:172) — ответ магазина `pending`. Нужно: `_dev_state=pending` | Г | Т |
| paywalls-015 | paywall-price-states.html №7 | — | НЕТ ПУТИ: «результат покупки неизвестен» — ветка ошибки после оплаты. Нужно: `_dev_state=unknown_outcome` | Г | Т |
| paywalls-016 | paywall-price-states.html №8 | — | НЕТ ПУТИ: «статус неизвестен (после проверки)» — результат `handleRestore('check')`, в dev сразу выходит (:1266). Нужно: `_dev_state=status_unknown` | Г | Т |
| paywalls-018 | paywall-price-states.html №9 | — | НЕТ ПУТИ: «промо от магазина» — `storePromo` приходит из RevenueCat (PaywallPlus.tsx:180, 212). Нужно: `_dev_state=store_promo` | Г | Т |
| energy-modes-001 | energy-modes-states.html №1 | G-E01 | `mode=b&energy=5`, урок открыт: `energy-mistake-hud` без сердечек | Г | Т |
| energy-modes-002 | energy-modes-states.html №2 | G-E01 | ошибка в ответе: `energy-mistake-hud-loss` «−1», тряска | Г | Т |
| energy-modes-003 | energy-modes-states.html №3 | G-E01 | `energy=1`: осталась 1 энергия, тост `last_energy` | Г | Т |
| energy-modes-004 | energy-modes-states.html №4 | G-E01 | ошибка при 1 энергии → `energy-stop-sheet` | Г | Т |
| energy-modes-005 | energy-modes-states.html №5 | G-E01 | `energy-stop-plus` → `premium_modal` (source `energy_stop_sheet`) | Г | Т |
| energy-modes-006 | energy-modes-states.html №6 | G-E01 (гипотеза) | при открытой шторке `DS(plus=on)` без next и «Назад»: `plus_resumed`. Не проверено на устройстве | Г | Т |
| energy-modes-007 | energy-modes-states.html №7 | G-E01 | `energy=0&mode=b`, вход в занятие → `energy-needed-sheet` | Г | Т |
| energy-modes-008 | energy-modes-states.html №8 | G-E01 (гипотеза) | при открытой `energy-needed-sheet` `DS(energy=1)` без next → тост `energy_restored`. Не проверено на устройстве | Г | Т |
| energy-modes-009 | energy-modes-states.html №9 | G-E02 | `lesson_menu?id=3` → `lesson-menu-words`, HUD `lesson-words-session-attempts` | Г | Т |
| energy-modes-010 | energy-modes-states.html №12 | G-E03 | `lesson-menu-irregular-verbs`, HUD `irregular-verbs-session-attempts` | Г | Т |
| energy-modes-011 | energy-modes-states.html №15 | G-E04 | вкладка «V2» на `tab-lessons` → занятие → сессия | Г | Т |
| energy-modes-012 | energy-modes-states.html №18 | G-E05 | `cards=demo`, Блиц из тренировки карточек, HUD `fc-blitz-attempts-*` | Г | Т |
| energy-modes-013 | energy-modes-states.html №21 | G-E06 | `mode=b`, сессия диалога: ошибка не меняет пилюлю энергии | №2 | Т |
| energy-modes-014 | energy-modes-states.html №22 | G-E06 | Главная → `home-v2-phrase-of-day`: энергия не тратится | Г | Т |
| energy-modes-015 | energy-modes-states.html №23 | G-E07 | `mode=a&energy=5`, старт занятия: пилюля 5→4 (`LessonEnergyPill`) | Г | Т |
| energy-modes-016 | energy-modes-states.html №24 | G-E07 | ошибка: сердечки `lesson1-session-attempts`, серия монет | Г | Т |
| energy-modes-017 | energy-modes-states.html №25 | G-E07 | `energy=0&mode=a`, старт → `NoEnergyModal` | Г | Т |
| dialogs-gap-001 | dialogs-gaps-states.html №1 | G-D09 | `plus=on`, `dialogue_v2_memory` после завершённого диалога: сводка | №2 | Т |
| dialogs-gap-002 | dialogs-gaps-states.html №2 | G-D09 | `plus=on`, аккаунт без завершённых диалогов: пусто | №2 | Т |
| dialogs-gap-003 | dialogs-gaps-states.html №3 | G-D09 | `plus=off`, `dialogue_v2_memory`: `dialogue-v2-memory-delete-only` | №2 | Т |
| dialogs-gap-004 | dialogs-gaps-states.html №4 | G-D09 | `dialogue-v2-memory-clear-confirm` → окно подтверждения | №2 | Т |
| dialogs-gap-005 | dialogs-gaps-states.html №5 | G-D09 | подпись «Очищаем…» на кнопке при медленной сети | №2 | Т |
| dialogs-gap-006 | dialogs-gaps-states.html №6 | G-D09 | авиарежим + подтвердить очистку → `dialogue-v2-memory-clear-failed` | №2 | Т |
| dialogs-gap-007 | dialogs-gaps-states.html №7 | G-D08 | `dialogue-v2-completion-loading` (медленная сеть) | №2 | Т |
| dialogs-gap-008 | dialogs-gaps-states.html №8 | G-D08 | фальшивый sessionId в `dialogue_v2_completion` или авиарежим → `dialogue-v2-completion-retry` | №2 | Т |
| dialogs-gap-009 | dialogs-gaps-states.html №9 | — | НЕТ ПУТИ: «готовим разговор» — `dialogue-v2-freeform-loading`, пока `accessResolved=false` (app/dialogue_v2_freeform.tsx:264), в штатном запуске доли секунды. Нужно: `dev_state?hold=freeform_loading` | №2 | Т |
| dialogs-gap-010 | dialogs-gaps-states.html №10 | G-D09 | `plus=off`, `dialogue_v2_freeform` → `dialogue-v2-freeform-plus` | №2 | Т |
| dialogs-gap-011 | dialogs-gaps-states.html №11 | G-D09 | `plus=on` + авиарежим + `dialogue_v2_freeform` → `dialogue-v2-freeform-unavailable` | №2 | Т |
| dialogs-gap-012 | dialogs-gaps-states.html №12 | — | НЕТ ПУТИ: «Plus, потолок на сегодня» (`plus_daily_cap`) — ответ сервера. Нужно: `dev_dialog_fail=plus_daily_cap` | №2 | Т |
| dialogs-gap-013 | dialogs-gaps-states.html №13 | G-D06 | микрофон с `mic-off-outline` и подписью «речь не работает на устройстве» (`unavailableOnDevice`) | №2 | Т |
| dialogs-gap-014 | dialogs-gaps-states.html №14 | G-D06 | запись и отправка голосом → `dialogue-v2-voice-message-<id>` | №2 | Т |
| dialogs-gap-015 | dialogs-gaps-states.html №15 | G-D05 | `dialogue-v2-session-more` → `dialogue-v2-session-menu` | №2 | Т |
| dialogs-gap-016 | dialogs-gaps-states.html №16 | — | НЕТ ПУТИ: тост «Энергия возвращена» — при отказе сервиса на первом ходе (`settleEnergy('refund')`, dialogue_v2_session.tsx:380). Нужно: `dev_dialog_fail=service` | №2 | Т |
| dialogs-gap-017 | dialogs-gaps-states.html №17 | — | НЕТ ПУТИ: тост «Не получилось начать диалог» — `confirmSpendOne` вернул `cancelled` или бросил (dialogue_v2_briefing.tsx:~257). Нужно: `dev_energy_fail=1` | №2 | Т |
| spire-gap-001 | spire-gaps-states.html №1 | — | НЕТ ПУТИ: «вставь слово» (`fill_gap`) — в превью нет такого состояния (только choice/build/items); в настоящей игре тип приходит случайно из пакета. Нужно: `state=step_gap` | Г | Т |
| spire-gap-002 | spire-gaps-states.html №2 | — | НЕТ ПУТИ: «найди лишнее» (`find_oddity`) — то же. Нужно: `state=step_odd` | Г | Т |
| spire-gap-003 | spire-gaps-states.html №3 | G-S01 | `state=step_build` («собери перевод») | Г | Т |
| spire-gap-004 | spire-gaps-states.html №4 | — | НЕТ ПУТИ: «послушай и выбери» (`listen_choose`, кнопка `spire-task-listen`). Нужно: `state=step_listen_choose` | Г | Т |
| spire-gap-005 | spire-gaps-states.html №5 | — | НЕТ ПУТИ: «послушай и собери» (`listen_build`). Нужно: `state=step_listen_build` | Г | Т |
| spire-gap-006 | spire-gaps-states.html №6 | G-S01 | `state=step_items` («найди пары») | Г | Т |
| spire-gap-007 | spire-gaps-states.html №7 | G-S04 | комната загружена, авиарежим, тап `spire-climb` → строка причины + «Повторить» | №2 | Т |
| spire-gap-008 | spire-gaps-states.html №8 | — | НЕТ ПУТИ: «задания недели ещё готовятся» (`pack_missing`) — сервер не отдал пакет; в превью `startBlock` всегда null. Нужно: `state=block_missing` | Г | Т |
| spire-gap-009 | spire-gaps-states.html №9 | G-S01 | `state=empty`: «Подняться» неактивна (`spire-climb`, disabled) | Г | Т |
| spire-gap-010 | spire-gaps-states.html №10 | G-S01 | `state=empty`, прокрутка вниз: пьедестал без людей, `spire-all-members` неактивна | Г | Т |
| spire-gap-011 | spire-gaps-states.html №11 | G-S01 | `state=locked` (`spire-locked`) | Г | Т |
| spire-gap-012 | spire-gaps-states.html №12 | G-S04 | настоящая ступень, ждать истечения кольца → `spire-result-failed`, «время вышло». В превью `lose` = причина «сердца» | №2 | Т |
| spire-gap-013 | spire-gaps-states.html №13 | G-S04 | на ступени `spire-step-back` → `spire-exit-confirm` → причина «прервана» | №2 | Т |
| spire-gap-014 | spire-gaps-states.html №14 | G-S01 | `state=save_failed` (панель «Ступень не сохранилась», кнопка «Повторить», testID `spire-result-save_failed`) | Г | Т |
| spire-gap-015 | spire-gaps-states.html №15 | G-S01 | `state=weekresult` (promoted) | Г | Т |
| spire-gap-016 | spire-gaps-states.html №16 | — | НЕТ ПУТИ: «остаёшься» — в мока зашито promoted=true. Нужно: `state=weekresult_stay` | Г | Т |
| spire-gap-017 | spire-gaps-states.html №17 | — | НЕТ ПУТИ: «спускаешься» (demoted). Нужно: `state=weekresult_down` | Г | Т |
| spire-gap-018 | spire-gaps-states.html №18 | G-S01 | `state=rules`, начало списка | Г | Т |
| spire-gap-019 | spire-gaps-states.html №19 | G-S01 | `state=rules`, прокрутить шторку до конца | Г | Т |
| spire-gap-020 | spire-gaps-states.html №20 | G-S01 | `state=step_prep`: «Готовим ступень…», кольцо на паузе | Г | Т |
| spire-gap-021 | spire-gaps-states.html №21 | G-S04 | настоящая ступень, флажок `spire-task-report-<n>`. В превью `reportSlot=null` | №2 | Т |
| spire-gap-022 | spire-gaps-states.html №22 | G-S03 | язык изучения Español + `state=room`: `spire-beta-pill` | Г | Т |
| paywall-gap-001 | paywall-gaps-states.html №1 | G-P01 | `settings-plus-row` или `premium_modal?context=generic&source=settings_premium` | Г | Т |
| paywall-gap-002 | paywall-gaps-states.html №2 | G-P01 | то же, прокрутка к блоку «Free и Plus», свёрнут | Г | Т |
| paywall-gap-003 | paywall-gaps-states.html №3 | G-P01 | тап `paywall-compare-toggle` | Г | Т |
| paywall-gap-004 | paywall-gaps-states.html №4 | G-P01 | `…&_force_trial_ui=1` → `paywall-trial-timeline` | Г | Т |
| paywall-gap-005 | paywall-gaps-states.html №5 | G-P01 | тап `paywall-plan-monthly` | Г | Т |
| paywall-gap-006 | paywall-gaps-states.html №6 | — | НЕТ ПУТИ: экран «Plus твой. Напомнить…» (`paywall-trial-reminder-prompt`) ставится после успешной покупки (`setTrialReminderPrompt`, paywall_purchase.ts:442), а в dev покупка заменена предупреждением. Нужно: `premium_modal?…&_dev_state=reminder_prompt` | Г | Т |
| paywall-gap-007 | paywall-gaps-states.html №7 | G-P01 | `premium_modal?context=flashcard_limit&source=flashcards_collection` | Г | Т |
| paywall-gap-008 | paywall-gaps-states.html №8 | G-P01 | `context=flashcard_training&source=flashcards_training_setup` | Г | Т |
| paywall-gap-009 | paywall-gaps-states.html №9 | G-P01 | `context=flashcard_create&source=card_editor_create` | Г | Т |
| paywall-gap-010 | paywall-gaps-states.html №10 | G-P01 | `context=pack_create&source=pack_create` | Г | Т |
| paywall-gap-011 | paywall-gaps-states.html №11 | — | НЕТ ПУТИ: тост «Покупка подтверждена» — после `handleRestore('check')` (paywall_purchase.ts:1334), в dev метод выходит сразу (:1266). Нужно: `dev_state?toast=purchase_confirmed` | Г | Т |
| paywall-gap-012 | paywall-gaps-states.html №12 | — | НЕТ ПУТИ: тост «Покупки восстановлены» — то же. Нужно: `dev_state?toast=restored` | Г | Т |
| paywall-gap-013 | paywall-gaps-states.html №13 | — | НЕТ ПУТИ: тост «не удалось восстановить» (:1370, :1400). Нужно: `dev_state?toast=restore_failed` | Г | Т |

---

## Нет пути

Каждая строка — id, причина, что нужно от Ядра. Группы «сбой сети» сюда не входят (описаны в группах).

**Шпиль (dev_spire_preview).** Все пункты — добавить состояния в components/spire/spire_preview_fixtures.ts (SPIRE_PREVIEW_STATES) и в моки; маршрут и компоненты те же, что в бою.
- spire-015, spire-gap-016, spire-gap-017 — итог недели «остаёшься» / «спускаешься»: у `weekresult` зашито promoted=true. Добавить `weekresult_stay`, `weekresult_down`.
- spire-010 (частично) — нет итога ступени вида «passed» (`spire-result-passed`). Добавить `state=passed`. Сейчас только `win`/`summit`/`lose`/`save_failed`.
- spire-012 (частично) — `win` показывает этаж 7→8, а в макете этаж 4→5 «впереди Страж». Добавить `state=guard` (floor 5, `spireIsGuard`).
- spire-gap-001/002/004/005 — виды заданий «вставь слово», «найди лишнее», «послушай и выбери/собери». Добавить `step_gap`, `step_odd`, `step_listen_choose`, `step_listen_build`.
- spire-gap-008 — `startBlock` в мока всегда null. Добавить `block_missing` (и для удобства `block_offline`, чтобы не включать авиарежим).
- Шторка выхода и флажок жалобы (spire-009, spire-gap-021) в превью не рисуются (`exitSlot=null`, `reportSlot=null`); сняты только в настоящей игре. Желательно `&exit=1`, `&report=1`.

**Диалоги.** Нужны фикстуры сессии (рядом с app/dialogue_v2_visual_fixture.tsx, он статичный и не покрывает эти состояния) и поля в `dev_state`.
- dialogs-004, 034, 035 — лимит 0/30, 1/30, стена лимита: зеркало квоты. `dev_state?dialogs_quota=N` (запись через `recordAiDialogMonthlyQuotaFromServer`).
- dialogs-023 — настроение собеседника «упало». `dev_dialog_mood=sad`.
- dialogs-032, dialogs-gap-012, dialogs-gap-016 — отказ сервера (`service`, `rate_limited`, `plus_daily_cap`) и возврат энергии. `dev_dialog_fail=service|rate_limited|plus_daily_cap`.
- dialogs-033 — рубильник раздела диалогов (`paused`). `dev_state?dialogs_paused=1`.
- dialogs-gap-009 — загрузочный экран свободного разговора. `dev_state?hold=freeform_loading`.
- dialogs-gap-017 — тост «Не получилось начать диалог». `dev_energy_fail=1` (отказ `confirmSpendOne`).

**Пейвол Plus.** В dev-сборке `DEV_IAP_BYPASS=true` отключает магазин (app/config.ts:125, app/paywall_purchase.ts:459,871,1266), поэтому состояния цен и покупки не достижимы. Нужен единый dev-вход `premium_modal?context=…&source=…&_dev_state=<имя>`, который подменяет результат `usePaywallPurchase` без вызова магазина.
- paywalls-011 (`loading`), paywalls-012 (`error_no_prices`, `billing_unavailable`, `reference` — четыре подкадра), paywalls-013 (`purchasing`), paywalls-014 (`pending`), paywalls-015 (`unknown_outcome`), paywalls-016 (`status_unknown`), paywalls-018 (`store_promo`), paywall-gap-006 (`reminder_prompt`).
- paywall-gap-011/012/013 — три тоста покупки/восстановления: `dev_state?toast=purchase_confirmed|restored|restore_failed` (через `emitAppEvent('action_toast', …)` теми же строками).
- Либо проверять эти кадры на стор-подобной сборке с песочницей RevenueCat, но тогда `dev_state` недоступен (вырезан из стор-сборки).

**Сообщество.**
- community-010 — «отправка заявки» живёт доли секунды (оптимистично скрывается). Полноценный кадр: `dev_friends_hold=add_request`.
- community-011, community-016 — ошибки `error` (отправка) и «другая ошибка» (поиск). `dev_friends_fail=add|search`.
- community-014 — «профиль ещё не синхронизирован». Нужен служебный код-заглушка в `lookupUserByFriendCode`.
- community-022 — окно приглашения на занятие; социальное событие `study_invite` создаёт сервер. `dev_state?friend_event=study_invite`. Замечание: «Вместе» в релизе выключено (`friendsTogetherUiEnabled=false`, friends.tsx:810), т.е. образец community-022 может быть вне первого выпуска — уточнить у координатора.

**Частично (путь есть, но не гарантирован):** dialogs-037 (зависит, когда ИИ сам завершит диалог), dialogs-042 (карточка отзыва показывается только если сработал троттлинг), dialogs-026/dialogs-gap-014 (нужно распознавание речи на эмуляторе), dialogs-028 (вариант «попытки кончились + PLUS»), community-023 (опрос дня зависит от сервера), energy-modes-006/008 (гипотезы с `DS` без `next`), spire-010, spire-012.

---

## Допущения и вопросы
- Все `testID` взяты из кода (путь:строка выше), не из запуска. Где testID нет (поле ввода и кнопка «Отправить» в диалоге, кнопки согласия-гейта, кнопка «Начать» в настройке тренировки), указан accessibilityLabel/текст.
- Идентификаторы категорий (`dialogue-v2-world-<id>`), сценариев и друзей берутся из `uiautomator dump` на месте.
- Серверные зависимости: Шпиль в бою (G-S04) требует `config/spire_v1.enabled=true` и удачного перечита рубильников; диалоги (G-D05..G-D10) требуют живого вызова ИИ и тратят месячный лимит Free тестового аккаунта (30 ответов); свободный разговор и память требуют Plus на сервере — локальный override `plus=on` может сервером не приниматься, тогда gap-001/002 и dialogs-045/046 надо снимать на аккаунте с настоящим Plus (владелец уже выдавал тестовые Plus-аккаунты).
- Согласие на ИИ: в коде «Начать диалог» сначала списывает 1 энергию (app/dialogue_v2_briefing.tsx), и только потом сессия открывает шторку согласия. То есть при отказе энергия уже потрачена — вынести как замечание владельцу.
- Режим Б: HUD, шторки остановки и «Нужна энергия» показываются только на activity из списка (classic_lesson, lesson_words, irregular_verbs, learning_v2_session, flashcards, app/energy_mode.ts). Если в первом выпуске режим А, кадры energy-modes-001..014 снимаются со «флагом» только для будущего, но заказаны реестром.
- Пилюля «N/30» в хабе зависит от зеркала квоты, которое появляется после первого ответа сервера; на новом аккаунте её нет (не баг).
- Шпиль в превью: язык, имена, цифры мока отличаются от макета (этаж 7 вместо 4, имена выдуманные). Пиксельное совпадение данных не достигается; сверять нужно раскладку.
- Вопрос: энергия на свежей установке — есть ли подарочная (bonusEnergy) и не мешает ли она кадрам «нет энергии» (spire-016, dialogs-011, energy-modes-007/017)? Проверить в Dev Hub, при необходимости обнулить.
- Вопрос: светлые варианты energy-modes-states.html и «Аврора» (тёмная) против «Спокойно» — в реестре указана только первая сетка, снимаем «Спокойно».
- Вопрос: двухшаговая схема DS → DL предпочтительна вложенному `next=/маршрут?параметры` (его разбор в dev_state не проверялся).
