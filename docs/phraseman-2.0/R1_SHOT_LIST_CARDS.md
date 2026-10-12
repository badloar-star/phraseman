# Список съёмки первого выпуска — Карточки

Governance-ID: TG-A280B7BED1F1

Часть C: 221 строка реестра (cards-v2, cards-gaps, cards-states, cards-section, packs-simple), группы G-C01…G-C09.

> Все пути выведены из КОДА (основное дерево, testID, dev_state, dev-переключатели); на устройстве не проверены — Сверка уточняет по ходу съёмки и пишет расхождения координатору.
> Индекс, порядок съёмки, общие правила и сводка «нет пути» — в `R1_SHOT_LIST.md`.

# Список съёмки · Карточки 2.0 · кусок C (221 строка реестра)

Источник путей — код основного дерева `C:\appsprojects\phraseman` (файл:строка), макеты `docs/design/v2-app/`. Состав: Карточки — cards-v2 (кадры 4–52), cards-gaps-states, старые строки cards-states / cards-section (дубли сведены «то же, что …»), packs-simple. Хаб = вариант А (cards-section №1).

Общее для всех групп: Pixel_8 (emulator-5554), Metro :8081, `adb reverse tcp:8081 tcp:8081`, пакет `app.phraseman`; тема по умолчанию (тёмная, «Спокойно»); язык интерфейса ru, изучаемый en; гость; робот ходит по `uiautomator dump` и тест-идам; пароли не вводятся, аккаунт не удаляется.

Шаблон ссылки (в shell `&` экранировать как `\&`): `adb shell am start -a android.intent.action.VIEW -d "phraseman://dev_state?cards=demo\&plus=on\&mode=a\&energy=5\&onboarding=done\&next=/flashcards"` (параметры — app/dev_state_fixtures.ts:21-31; демо — app/dev_state_cards_demo.ts). Маршрут с запросом в `next` кодировать: `next=%2Fflashcards_blitz_session%3Fdeck%3Dsaved%26sec%3D90`.

**Ловушки (повторяются во всех группах):**
- Первый вход на экран показывает вводное окно и съедает тап: хаб `cards_hub_first_visit`, настройки Блица/Устно/Напиши `training_blitz_first_visit`, `training_speaking_first_visit`, `training_recall_first_visit` — закрывать `<id>-later` (components/FeatureIntroModal.tsx:244,263; app/feature_intro_registry.ts). У Правды/лжи вводного окна нет (flashcards_training_setup.tsx:672).
- Сессии в режиме А тратят 1 энергию на старт (при Plus on — нет) и держат 3 сердца: 3-я ошибка подряд открывает восстановление; для многих ошибок — `plus=on&mode=b` (ошибка бесплатна: hooks/useSessionAttempts.ts, outcome `free`).
- Free/Plus для карточек — флаг `plus=on|off` (dev_plus_controls.ts); `dev_as_free_flag` / `free=on` на карточки НЕ влияют (только доступ к урокам: dev_as_free_flag.ts:61-68, lessons.tsx). Если на «Сохранённых» при `plus=off` нет пилюли «50/50», значит пульт включил «Фри для всех» для `flashcards` (PremiumContext.tsx:110-125) — сообщить.
- НЕ жать на демо-данных: «Добавить себе» у демо-наборов сообщества (создаёт призрачный набор в «Мои наборы» и пишет в прод), тап по демо-роликам «Из видео» (откроет плеер), любые «Отправить…» / «Отправить жалобу» / отправку отклика — это запись в прод (список в разделе 3.3).

## Группы маршрутов

### G-C01 · Чистый гость · авиарежим (офлайн-состояния)

**Подготовка:**
- `adb shell pm clear app.phraseman`, запуск, онбординг гостем до Главной (docs/phraseman-2.0/AUTH_RELEASE1_TEST_SCENARIO_2026-10-11.md, шаги A1–A2: «Начать», вопросы, «Позже»). Изучаемый язык — English.
- Ссылка: `...dev_state?plus=off\&mode=a\&energy=5\&onboarding=done\&next=/flashcards`. Закрыть вводное окно `cards_hub_first_visit-later`.
- ПЕРЕД первым входом в «Сообщество» и «Из видео» (кэши каталога должны быть пусты): `adb shell cmd connectivity airplane-mode enable`. Проверка по логу: `[CATALOG-OFFLINE] probe offline=true`.

**Путь:**
1. Хаб в авиарежиме `fc-cards-hub-v2` — снимок (ближайший к cards-v2-043; кадра «Нет сети» у хаба А в коде нет).
2. Плитка `fc-cards-hub-tile-community` (app/flashcards/CardsHubV2.tsx:190) → `/flashcards_packs` → ~2 с → `flashcards-community-empty` с «Нет сети» и `flashcards-community-offline-retry` (app/flashcards/FlashcardsCategoryHub.tsx:960-1015). Снимок. Назад — `flashcards-header-back` (app/flashcards_packs.tsx:454).
3. Плитка `fc-cards-hub-tile-video` → `/flashcards_video_packs`: скелет, через ~12–15 с (3 тихих повтора 1/3/8 с, app/load_gate_config.ts) → `fc-video-packs-unavailable` («Сейчас недоступно», `fc-video-packs-try-again`; app/flashcards_video_packs.tsx:496-507). Снимок.
4. `adb shell cmd connectivity airplane-mode disable`.

**Кадры в группе:** cards-030, cards-section-029, cards-v2-043, cards-v2-044

**Оценка: 12 мин**

### G-C02 · Чистый гость · онлайн · Free: пустые состояния и свои карточки

**Подготовка:**
- Продолжение G-C01 (тот же гость, авиарежим выключен). Если G-C01 пропущена — pm clear + онбординг + ссылка из G-C01.

**Путь:**
1. Хаб-новичок: ссылка с `next=/flashcards`, подождать 1–2 с → `fc-cards-hub-fresh` «Начни с готового», кнопка `fc-cards-hub-train` = «Выбрать набор» (app/flashcards/CardsHubV2.tsx:152,174; FlashcardsHubScreen.tsx:667-674). Снимок.
2. `fc-cards-hub-tile-saved` → `fc-saved-empty` (SavedCollectionStates.tsx:108). Снимок. Назад `mp-back` (components/mistakes-panel/PanelKit.tsx:33).
3. `fc-cards-hub-tile-mine` → `fc-my-packs-empty` (MyPacksV2.tsx:188). Снимок. Назад `mp-back`.
4. `dev_state?next=%2Fflashcards_training_setup%3Fmode%3Dblitz` → закрыть `training_blitz_first_visit-later` → `fc-training-setup-empty` (TrainingSetupV2.tsx:200). Снимок.
5. Хаб → `fc-cards-hub-tile-video` (сеть есть, каталог реальный) → `fc-video-packs-menu` → `fc-video-packs-menu-search` → в `fc-video-packs-search` «zzzqq» → `fc-video-packs-empty`. Снимок.
6. Свои карточки: хаб → `fc-cards-hub-tile-saved` → `fc-collection-create` (CollectionHeaderV2.tsx:120) → редактор. (а) ввод «Layover» / «пересадка» в `fc-editor-en` / `fc-editor-tr` — снимок живого превью; (б) тап `fc-editor-description`, ввод «We have a two-hour layover.» — снимок; (в) `fc-editor-save` → тост «Карточка сохранена.» — снимок; (г) ещё `fc-collection-create`, в `fc-editor-en` снова «Layover» → `fc-editor-duplicate` — снимок, затем сменить на «Gate» / «выход», сохранить.
7. `dev_state?next=%2Fflashcards_training_setup%3Fmode%3Dblitz` → одна колода `fc-training-setup-deck-custom` (2 карточки) выбрана → подсказка про 4 карточки, `fc-training-setup-start` серая — снимок.

**Кадры в группе:** cards-009, cards-013, cards-021, cards-022, cards-026, cards-061, cards-064, cards-076, cards-081, cards-section-007, cards-section-011, cards-section-020, cards-section-038, packs-simple-003, cards-v2-002, cards-v2-011, cards-v2-013, cards-v2-024, cards-v2-029

**Оценка: 22 мин**

### G-C03 · Реальный набор сообщества и ролик (гость, онлайн, Free)

**Подготовка:**
- Продолжение G-C02, без фикстур. Условие: в проде есть ≥1 опубликованный чужой набор en и ≥1 ролик с набором; иначе кадры группы — «нет пути (нет данных на сервере)».
- Побочный эффект: добавление и лайк реального набора меняют его публичные счётчики (+1 добавление, +1 лайк) и пишутся в аккаунт гостя.

**Путь:**
**А. Набор сообщества.**
1. Хаб → `fc-cards-hub-tile-community` → первый чужой набор `flashcards-pack-card-<id>` → `/flashcards_collection?pack=<id>&preview=1` → `pack-preview` (app/flashcards/CommunityPackPreview.tsx:196). Снимок «до добавления».
2. `pack-like-<id>` до добавления → тост «лайк — после добавления» (app/community_packs/CommunityPackSocialBar.tsx:232-289). Снимок.
3. `pack-add-<id>` → экран набора «добавлен». Снимок. Тап по плитке карточки → `fc-expanded-card` (строка «чужой»). Снимок.
4. `pack-like-<id>` → сердце заполнено. Снимок.
5. `pack-comments-<id>` → `pack-comments-sheet` (app/community_packs/PackCommentsSheet.tsx:753). Снимок. Комментарии не писать.
6. Меню набора (`fc-pack-menu` на экране набора) → «Пожаловаться на набор» (`collection-report-pack`) → форма; снимок и «Отмена». Не отправлять.
7. `adb shell cmd connectivity airplane-mode enable` → `pack-like-<id>` → откат сердца + тост (CommunityPackSocialBar.tsx:259-283). Снимок.
8. В авиарежиме открыть другой чужой набор из каталога → тост «Набор ещё не скачан». Снимок. `airplane-mode disable`.
**Б. Ролик.**
9. Хаб → `fc-cards-hub-tile-video`, прочитать videoId из строки `video-pack-row-video:<videoId>`; `dev_state?next=%2Fflashcards_collection%3Fpack%3Dvideo_<videoId>%26preview%3D1` → `video-set-view` (app/flashcards/VideoSetView.tsx:97). Снимок «до добавления».
10. Тап строки ролика в «Из видео» → `lingman_video_watch` → «Добавить набор себе» (`lingman-video-watch-pack`, app/lingman_video_watch.tsx:201) → «Тренировать фразы ролика» → VideoSetView владельца («В моих наборах» + `video-set-train`). Снимок.
11. Для «ролик не открылся»: `adb shell pm disable-user --user 0 com.android.chrome` (и youtube, если есть) → тап `video-set-hero` → тост «Видео сейчас не открывается…» → снимок → `pm enable`.

**Кадры в группе:** cards-018, cards-019, cards-043, cards-050, cards-051, cards-052, cards-055, cards-057, cards-082, cards-section-013, cards-section-014, cards-section-018, cards-section-030, cards-section-031, packs-simple-004, cards-v2-015, cards-v2-016, cards-v2-019, cards-gap-032, cards-gap-033, cards-v2-053

Условность: проверить, что `pack=video_<videoId>` находит набор в каталоге роликов (app/flashcards_collection.tsx:1248 требует `currentMarketPack.videoId`); при неудаче кадры cards-043 / cards-section-030 / cards-v2-019 переходят в «нет пути».

**Оценка: 20 мин**

### G-C04 · Демо-аккаунт · Plus on: хаб А, Сохранённые, Мои наборы, редакторы, каталог

**Подготовка:**
- НОВЫЙ гость: `adb shell pm clear app.phraseman` + онбординг (чтобы реальный набор из G-C03 не попал в «Мои наборы»).
- Ссылка: `...dev_state?cards=demo\&plus=on\&mode=a\&energy=5\&onboarding=done\&next=/flashcards`. В логе `[DEV-STATE] cards demo` проверить `applied`: saved 64, own_packs 4, continue, videos 5, community 5; `skipped` не пуст — повторить ссылку.

**Путь:**
1. Хаб А: `fc-cards-hub-v2`, закрыть `cards_hub_first_visit-later`. Снимок. `fc-cards-hub-train` → `fc-training-mode-sheet` — снимок.
2. Настройки режимов (каждый раз шторка заново): `fc-training-mode-blitz` (закрыть `training_blitz_first_visit-later`) — снимок, назад `mp-back`; `…-speaking` (закрыть `training_speaking_first_visit-later`); `…-truefalse`; `…-recall` (закрыть `training_recall_first_visit-later`).
3. Сохранённые (первый вход!): `fc-cards-hub-tile-saved` → СРАЗУ снимок плашки-подсказки, затем закрыть её крестиком. Шаг по умолчанию — 2 колонки (снимок), `fc-zoom-larger` — 1 колонка (снимок), `fc-zoom-smaller` ×1 — 3 колонки (снимок), ещё ×1 — 5 колонок (снимок), вернуть 2 колонки (шаги GALLERY_STEPS: 1 → 2 → 3 → 5 колонок; поправлено 12.10 по коду, раньше было «×2 — 3 колонки»).
4. ⋮ `fc-saved-actions` → снимок меню; закрыть. Лупа `fc-collection-search`: «lay» (снимок), «zzzqq» (снимок пустого результата `fc-saved-search-empty`), очистить `fc-search-clear`.
5. Тап по плитке «Layover» → `fc-expanded-card` (снимок лицо) → `fc-expanded-card-flip` (снимок оборот) → `fc-expanded-to-pack` (снимок списка) → `fc-expanded-pack-local_pack_dev_demo_work` (тост «Добавлено») → снова «В набор» → тот же набор (тост «уже в наборе»). Затем плитка → `fc-expanded-delete` → снимок `fc-deleted-notice`/`fc-undo-delete` → тап «Вернуть».
6. Долгое нажатие по плитке (`input swipe x y x y 700`) → снимок `fc-card-actions`; назад. ⋮ → `fc-menu-select` → тап 3 плиток → снимок (счётчик, панель, подсказка «выбери ещё»); `fc-delete-selected` → снимок окна → `fc-delete-selected-confirm-cancel`; `fc-saved-selection-cancel`.
7. ⋮ → `fc-saved-view-deck` → снимок стопки; тап `fc-deck-card` → снимок оборота; `fc-deck-exit`. ⋮ → `fc-saved-content-phrase` → ⋮ → `fc-menu-filter` → снимок списка фильтра.
8. Мои наборы: `mp-back`, `fc-cards-hub-tile-mine` → снимок списка. Долгое нажатие по «Работа» → `fc-my-packs-actions-sheet`: `fc-my-packs-action-share` → тост (отказ из-за пустого описания), снова долгое нажатие → `fc-my-packs-pack-delete-local_pack_dev_demo_work` → снимок окна → `fc-delete-pack-confirm-cancel`. `fc-my-packs-menu` → `fc-my-packs-menu-search` → «zzzqq» в `fc-my-packs-search` → снимок.
9. Экран набора: строка `fc-my-packs-pack-local_pack_dev_demo_travel` → снимок; назад (`fc-collection-back`); строка `…_b2` → снимок бейджа «Только ты» → `fc-pack-menu` → снимок шторки с названием (строки `fc-pack-publish`, `fc-pack-edit`) → `fc-pack-edit` → «Изменить набор» — снимок → `ugc-pack-add-card`: «Test» / «тест» → `ugc-pack-draft-save` → `ugc-pack-add-card` → снимок «Карточек уже 50» → закрыть, `ugc-pack-back` (без сохранения).
10. Каталог: хаб → `fc-cards-hub-tile-community` → снимок «Новые»; `pack-language-picker` → снимок; «Fam» в `flashcards-packs-search` → долгое нажатие по `flashcards-pack-card-dev_demo_community_1` → снимок меню → `flashcards-pack-report` → снимок формы → «Отмена»; «zzzqq» → снимок пустого результата; очистить; тап `flashcards-pack-card-dev_demo_community_2` → снимок тоста «Набор ещё не скачан».
11. «Из видео»: хаб → `fc-cards-hub-tile-video` → снимок списка 5 демо-роликов (по строкам не тапать).
12. Создание набора: хаб `fc-cards-hub-create-pack` → «Новый набор» (название «Путешествия», `ugc-pack-level-A2`, `ugc-pack-first-card` → шторка → 2 карточки через `ugc-pack-draft-save`/«Ещё одну») — снимки: форма, шторка «Новая карточка», «Только я», `ugc-pack-menu`, `ugc-pack-clear-draft` → окно, `ugc-pack-save` при 2 карточках (тост), при пустом названии (тост).
13. Новое слово и сохранение набора (в самом конце): Сохранённые → ⋮ → «Отметить несколько» → 10 плиток → `fc-create-pack-from-selection` → название → `ugc-pack-save` → тост «Набор сохранён.»; офлайн-вариант — то же с переключателем «Все» и `airplane-mode enable` перед сохранением (ТОЛЬКО без сети), затем `disable`.
14. Провал отправки (cards-gap-028): набор из шага 13 (описание = название, ≥10 карточек) → «Мои наборы» → долгое нажатие → `fc-my-packs-action-share` при ВКЛЮЧЁННОМ авиарежиме → тост «Не удалось отправить набор на публикацию.» → `airplane-mode disable`. Без авиарежима НЕ жать (уйдёт заявка).
15. Удаление набора (последним): «Фразовые глаголы» → `fc-delete-pack-confirm-confirm` → тост «Набор удалён.»
16. Пустой выбор набора для карточки (cards-gap-019): удалить остальные наборы («Работа», «B2 глаголы», «Путешествия», созданный в шаге 13) тем же способом → «Сохранённые» → тап по плитке → `fc-expanded-to-pack` → `fc-expanded-create-pack` — снимок. Затем восстановить ссылкой `cards=demo`.

**Кадры в группе:** cards-002, cards-005, cards-006, cards-007, cards-008, cards-011, cards-012, cards-014, cards-015, cards-016, cards-017, cards-020, cards-023, cards-024, cards-025, cards-027, cards-028, cards-032, cards-033, cards-034, cards-035, cards-036, cards-037, cards-038, cards-040, cards-044, cards-045, cards-046, cards-065, cards-066, cards-067, cards-068, cards-069, cards-070, cards-071, cards-072, cards-073, cards-section-005, cards-section-006, cards-section-008, cards-section-009, cards-section-010, cards-section-012, cards-section-015, cards-section-016, cards-section-017, cards-section-019, cards-section-021, cards-section-022, cards-section-023, cards-section-024, cards-section-028, cards-section-032, cards-section-033, cards-section-034, cards-section-035, cards-section-036, packs-simple-001, cards-v2-001, cards-v2-004, cards-v2-005, cards-v2-006, cards-v2-007, cards-v2-008, cards-v2-009, cards-v2-010, cards-v2-012, cards-v2-014, cards-v2-017, cards-v2-018, cards-v2-020, cards-v2-021, cards-v2-022, cards-v2-023, cards-v2-025, cards-v2-026, cards-v2-027, cards-v2-028, cards-v2-048, cards-gap-018, cards-gap-019, cards-gap-020, cards-gap-021, cards-gap-023, cards-gap-027, cards-gap-028, cards-gap-034

Восстановление после разрушающих шагов (13–16): повторить ссылку `cards=demo` (идемпотентна для демо-наборов; созданный в шаге 13 набор остаётся — при необходимости pm clear).

**Оценка: 65 мин**

### G-C05 · Демо · Plus on · сессии тренировок

**Подготовка:**
- Ссылка: `...dev_state?cards=demo\&plus=on\&mode=a\&energy=5\&next=/flashcards` (демо уже есть; повтор безопасен).
- Таблица «слово → перевод» для сверки ответов: app/dev_state_cards_demo.ts:23-38 (правильный вариант Блица = русский перевод слова из `fc-blitz-question`; в Правде/лжи сравнивать `true-false-translation`).

**Путь:**
1. Блиц: хаб → train → `fc-training-mode-blitz` → закрыть интро → в настройке выбрать `fc-training-setup-extra-30` (30 с) → `fc-training-setup-start`. Снимок №1 сразу (вопрос, 4 варианта, 3 сердца, таймер).
2. Тап верного варианта и в той же команде `screencap` (кадр «+10» держится 350 мс; `adb shell "input tap X Y; screencap -p /sdcard/a.png"`). Затем тап неверного варианта — снимок в окне 700 мс (сердца 2/3). Дальше ответы любые до 0:00 → `fc-blitz-result` — снимок итога Блица.
3. Правда/ложь: хаб → train → `fc-training-mode-truefalse` → `fc-training-setup-start`. Снимок карточки; ответ, противоположный истине → снимок `flashcards-truefalse-verdict`; выйти ✕.
4. Напиши: `fc-training-mode-recall` → закрыть интро → старт. Снимок карточки. Верный EN (`adb shell input text`) → `fc-recall-check` → снимок «Верно» → `fc-recall-continue`. Неверный → `fc-recall-check` → снимок «Пока нет…». Следующая карточка: тап `fc-recall-hint` → снимок. Следующая: тап `fc-recall-reveal` → снимок с «Не знал / Знал».
5. Устно (если плитка не серая «Распознавание речи не работает на этом устройстве»): `fc-training-mode-speaking` → закрыть интро → старт → снимок ожидания → тап `fc-speak-mic` (разрешить микрофон «Только в этот раз») → снимок записи → тап `fc-speak-mic` повторно.

**Кадры в группе:** cards-section-039, cards-section-040, cards-section-041, cards-section-042, cards-section-043, cards-section-044, cards-section-045, cards-section-049, cards-section-050, cards-section-052, cards-v2-031, cards-v2-032, cards-v2-033, cards-v2-034, cards-v2-035, cards-v2-036, cards-v2-038, cards-v2-039, cards-v2-040, cards-v2-049, cards-v2-050

**Оценка: 24 мин**

### G-C06 · Демо · Plus on · mode b · итоги тренировки (Блиц, 90 с)

**Подготовка:**
- Ссылка: `...dev_state?cards=demo\&plus=on\&mode=b\&energy=5\&next=%2Fflashcards_blitz_session%3Fdeck%3Dsaved%26sec%3D90`. Plus on + mode b = ошибки бесплатны и без лимита (hooks/useSessionAttempts.ts: outcome `free`); без этого шести-восьми ошибок не набрать.
- Итог «N из M» считается по числу ответов за раунд (Блиц), а в Правде/лжи и «Напиши» ошибочные карточки возвращаются в очередь (flashcards_swipe.tsx:3123-3150), поэтому ровно «из 20» даёт только Блиц.

**Путь:**
Правило раунда: дать РОВНО 20 ответов (счёт ведёт робот), затем ждать 0:00. Запуск — ссылкой заново или `fc-result-retry` («Ещё раз»). Верный вариант — по таблице (app/dev_state_cards_demo.ts:23-38).
1. Раунд 20 верно → `fc-blitz-result` «20 из 20 · Без единой ошибки». Снимок.
2. Раунд 18 верно / 2 неверно → «18 из 20 · Почти идеально» + секция «Ошибки 2». Снимок (кадры «Итог с ошибками» и «Итог Блица»).
3. Раунд 12 верно / 8 неверно → «12 из 20 · Хороший результат». Снимок.
4. Раунд 6 верно / 14 неверно → «6 из 20 · Есть куда расти». Снимок.

**Кадры в группе:** cards-section-053, cards-section-054, cards-section-055, cards-v2-041, cards-v2-042, cards-v2-051, cards-v2-052

Ускоренный вариант ТОЛЬКО для cards-v2-051 (12 из 20): `next=%2Fflashcards_blitz_session%3Fdeck%3Dsaved%26devJumpToFinale%3D1%26devRunesSeed%3D1` — экран итога сразу с 12 верных / 8 ошибок (seed 1 даёт tertiary=8; flashcards_blitz_session.tsx:1357-1358, dev_practice_runes_seed.ts), монеты случайные, секции «Ошибки» нет. Для кадра образца лучше честный раунд. Каждый раунд ≈ 3 мин (90 с таймер + чтение вопроса через dump ≈ 3–4 с на ответ). Если не успеть 20 ответов за 90 с — выбрать 90 с и торопить чтение (вопрос читать из `fc-blitz-question`, варианты из `fc-blitz-opt-0..3`).

**Оценка: 16 мин**

### G-C07 · Демо · Free (plus=off): лимиты и платные стены

**Подготовка:**
- Ссылка: `...dev_state?cards=demo\&plus=off\&mode=a\&energy=5\&next=/flashcards`.

**Путь:**
1. Хаб: пилюля `fc-cards-hub-limit` «30/30» и «Тренироваться · осталось 30 из 30» (FlashcardsHubScreen.tsx:623-633) — для справки.
2. `fc-cards-hub-tile-saved`: заголовок «Сохранённые 64», пилюля `fc-collection-limit` «50/50», внизу `fc-gallery-unlimited` («Безлимит с Plus») над плавающей «Тренировать» (CollectionGalleryView.tsx:274,282-288). Снимок. Плашка «+14 скрыто» в коде не показывается на «Сохранённых».
3. Свои наборы 3/3: «Мои наборы» → удалить «Фразовые глаголы» (`fc-my-packs-pack-delete-local_pack_dev_demo_phrasal` → `fc-delete-pack-confirm-confirm`) → хаб `fc-cards-hub-create-pack` → «Новый набор»: `ugc-pack-limit-pill` «3/3», кнопка `ugc-pack-save` = «Безлимит с Plus». Снимок. (При 4 наборах пилюля «4/3».)
4. Напиши в режиме энергии Б: ссылка `...dev_state?plus=off\&mode=b\&energy=3\&next=%2Fflashcards_recall_session%3Fdeck%3Dsaved%26size%3D20%26dir%3Dto_target` → шапка с пилюлей энергии вместо сердец. Снимок.
5. Восстановление: ссылка `cards=demo` вернёт удалённый демо-набор.

**Кадры в группе:** cards-010, cards-v2-045, cards-v2-047, cards-gap-040

**Оценка: 12 мин**

### G-C08 · Free · исчерпанный лимит тренировок (обход через хранилище)

**Подготовка:**
- Штатного переключателя нет. Счётчик — AsyncStorage `training_sessions:v1:<encodeURIComponent(stableId)>` = `{"version":1,"period":"2026-10","starts":["r01",…,"r30"]}` (app/monthly_training_sessions.ts:11,124-143); stableId — в том же хранилище под ключом `phraseman_stable_uid_cache` (app/stable_id.ts: ASYNC_KEY).
- Обход (не штатный, нужна debuggable dev-сборка): `adb shell am force-stop app.phraseman`; `adb exec-out run-as app.phraseman cat databases/RKStorage > RKStorage.db`; Python `sqlite3`: прочитать `phraseman_stable_uid_cache`, `INSERT OR REPLACE INTO catalystLocalStorage(key,value)` для ключа выше с 30 уникальными строками; `adb push` в `/data/local/tmp`, `run-as app.phraseman cp` обратно в `databases/RKStorage`; запуск. Не вышло — все строки группы = «нет пути».
- Затем: `...dev_state?plus=off\&mode=a\&energy=5\&next=/flashcards`.

**Путь:**
1. Хаб: пилюля «0/30», кнопка «Осталось 0 из 30 · до 1 ноября» (приглушена, замок), стопка «Лимит на этот месяц исчерпан / Обновится 1 ноября». Снимок.
2. `dev_state?next=%2Fflashcards_training_setup%3Fmode%3Dblitz`: пилюля `fc-training-setup-monthly-limit` «0/30», вместо «Начать» — `fc-training-setup-upgrade` («Безлимит с Plus»). Снимок. Кнопку не жать.

**Кадры в группе:** cards-section-056, cards-v2-030, cards-gap-013

**Оценка: 15 мин**

### G-C09 · Демо · Plus on · прямые маршруты (служебные состояния)

**Подготовка:**
- Каждая строка — ссылка `phraseman://dev_state?plus=on\&next=<маршрут>` (маршрут кодировать, см. шаблон выше); демо уже загружено (G-C04).

**Путь:**
1. `%2Fflashcards_card_editor%3Fid%3Dnope` → `fc-editor-not-found`. Снимок.
2. `%2Fcommunity_pack_create%3FpackId%3Ddev_missing_cloud_pack` → `ugc-pack-load-error`. Снимок.
3. `%2Fflashcards_training_setup%3Fmode%3Dzzz` → `fc-training-setup-error`. Снимок.
4. `%2Fflashcards_speaking_session%3Fdeck%3Dcustom%26size%3Dall` → `fc-speak-empty` → снимок; `fc-speak-pick-decks-empty` → `fc-deck-sheet` — снимок.
5. `%2Fflashcards_truefalse_session%3Fdeck%3Dcustom%26quick%3D1%26size%3Dall` → `flashcards-swipe-no-cards`. Снимок.
6. `%2Fflashcards_voice_picker` → список голосов, снимок; если список пустой/только «Системный (авто)» — снимок второго кадра.

**Кадры в группе:** cards-063, cards-074, cards-078, cards-079, cards-gap-004, cards-gap-010, cards-gap-036, cards-gap-038

**Оценка: 12 мин**

## Таблица строк

Колонки «вход» и «тема/насыщ.» одинаковы по группе: вход — см. строку группы ниже; тема — тёмная / «Спокойно» (если иное не указано). Категории в скобках: ok — путь есть; dup — дубль; cond — путь условный (см. примечание); bypass — только обходом; perm — путь есть, но пишет в прод (разд. 3.3); none — нет пути; nocode — в коде нет.

| id | кадр образца (файл №N) | группа | как попасть именно в этот кадр | вход | тема/насыщ. |
|---|---|---|---|---|---|
| cards-002 | cards-v2.html №27 «Режим тренировки» | G-C04 | (ok) Хаб → `fc-cards-hub-train` → шторка `fc-training-mode-sheet` (FlashcardsTrainingModeSheet.tsx:228), 4 плитки `fc-training-mode-blitz/speaking/truefalse/recall`. Дубли: cards-section-032, cards-v2-027. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-004 | cards-states.html №2 «Сообщество недоступно» | — | (nocode) Блок «Лучшее у сообщества» (SavedTopCommunityPacks, тест-ид `saved-top-community-unavailable`) на хабе А не рисуется — компонент нигде не подключён (грепом: только `pickTopCommunityPacks` в training_setup). Ближайшее: каталог без сети (cards-section-029). | — | тёмная / Спокойно |
| cards-005 | cards-v2.html №5 «Сохранённые — 1 колонка» | G-C04 | (ok) Хаб → `fc-cards-hub-tile-saved` → `fc-zoom-larger` один раз (шаг 2 кол. → 1 кол.; ZoomBar.tsx:112). Дубли: cards-section-005, cards-v2-005. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-006 | cards-v2.html №10 «Удалено — вернуть» | G-C04 | (ok) «Сохранённые» → тап по плитке → `fc-expanded-card` → `fc-expanded-delete` → снекбар `fc-deleted-notice` + `fc-undo-delete` (CollectionListView.tsx:950-957); снимок ДО «Вернуть», затем тап `fc-undo-delete` (число остаётся 64). Свайпа-удаления в коде нет (образец: «удаление свайпом»). Дубли: cards-section-015, cards-v2-010. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-007 | cards-states.html №5 «Режим выделения» | G-C04 | (ok) «Сохранённые» → ⋮ `fc-saved-actions` → `fc-menu-select` → тап 3 плиток: `fc-saved-selection-count` «3 / 64», нижняя панель `fc-create-pack-from-selection` / `fc-delete-selected` (CollectionHeaderV2.tsx:97-100). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-008 | cards-states.html №79 «Стопка» | G-C04 | (ok) «Сохранённые» → ⋮ → `fc-saved-view-deck` («Показать стопкой») → `fc-deck-view` (CollectionDeckView.tsx:504). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-009 | cards-v2.html №11 «Сохранённые — пусто» | G-C02 | (ok) Чистый гость: хаб → `fc-cards-hub-tile-saved` → `fc-saved-empty` (SavedCollectionStates.tsx:108), кнопка `fc-saved-find-packs`; заголовок без числа. Дубли: cards-section-007, cards-v2-011. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-010 | cards-states.html №7 «Лимит free: первые 50» | G-C07 | (ok) Free (plus=off) + демо 64 карточки: «Сохранённые» → пилюля `fc-collection-limit` «50/50», внизу `fc-gallery-unlimited` («Безлимит с Plus»). В коде секции «+14 скрыто» (`flashcards-free-limit-section`) на «Сохранённых» уже нет — она скрыта при `limitCta` (CollectionGalleryView.tsx:236). Дубль: cards-v2-045. | гость + демо, Free (plus=off) | тёмная / Спокойно |
| cards-011 | cards-states.html №8 «Мои наборы» | G-C04 | (ok) Хаб → `fc-cards-hub-tile-mine` → список стопок (`fc-my-packs-title`, `fc-my-packs-section-created`), 4 демо-набора. Дубли: cards-section-009, cards-v2-012. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-012 | cards-states.html №9 «Удаление набора» | G-C04 | (ok) «Мои наборы» → долгое нажатие по строке `fc-my-packs-pack-local_pack_dev_demo_work` → `fc-my-packs-actions-sheet` → `fc-my-packs-pack-delete-local_pack_dev_demo_work` → `fc-delete-pack-confirm-modal` (flashcards_my_packs.tsx:796); снять и `fc-delete-pack-confirm-cancel`. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-013 | cards-v2.html №13 «Мои наборы — пусто» | G-C02 | (ok) Чистый гость: хаб → `fc-cards-hub-tile-mine` → `fc-my-packs-empty` («Наборов нет», кнопка `fc-my-packs-create`; MyPacksV2.tsx:188). Дубли: cards-section-011, cards-v2-013, packs-simple-003. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-014 | cards-states.html №11 «Каталог · «Новые»» | G-C04 | (ok) Хаб → `fc-cards-hub-tile-community` → `/flashcards_packs`: чип «Новые» (`flashcards-packs-chip-new`) активен, 5 демо-наборов `flashcards-pack-card-dev_demo_community_1…5`. Дубли: cards-section-022, -024, cards-v2-025. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-015 | cards-states.html №12 «Поиск · действия долгим нажатием» | G-C04 | (ok) Каталог → ввод «Fam» в `flashcards-packs-search` («Найдено 1» `flashcards-community-found`) → долгое нажатие по строке → `flashcards-pack-actions-menu` (`flashcards-pack-add/report/hide`). НЕ жать «Добавить себе» на демо-наборах. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-016 | cards-states.html №15 «Жалоба на набор» | G-C04 | (dup) Реестр: «Пока нет публикаций», образец №15 в файле = «Жалоба на набор» → то же, что cards-020. «Каталог пуст» = cards-048. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-017 | cards-v2.html №26 «Каталог — ничего не найдено» | G-C04 | (ok) Каталог → ввод «zzzqq» → `flashcards-community-empty` «Ничего не нашли» + «Попробуй другое слово» + `flashcards-community-reset-filters` (FlashcardsCategoryHub.tsx:960-999). Дубли: cards-section-023, -028, packs-simple-001, cards-v2-026. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-018 | cards-v2.html №15 «Чужой набор — до добавления» | G-C03 | (cond) Реальный чужой набор: каталог → `flashcards-pack-card-<id>` → `pack-preview` (CommunityPackPreview.tsx:196): `pack-preview-title`, `pack-add-<id>`, `pack-like-<id>`. Требует живой каталог на проде. Дубли: cards-section-013, cards-v2-015, packs-simple-004. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-019 | cards-v2.html №16 «Чужой набор — добавлен» | G-C03 | (cond) Из cards-018: тап `pack-add-<id>` → экран набора «добавлен» (бейдж, социальная строка). Меняет счётчик добавлений реального набора в проде (+1). Дубли: cards-section-014, cards-v2-016. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-020 | cards-states.html №15 «Жалоба на набор» | G-C04 | (ok) Каталог → долгое нажатие по демо-набору → `flashcards-pack-report` → окно жалобы `report-pack-modal-hybrid`; снять и «Отмена». «Отправить жалобу» не жать (cards-059). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-021 | cards-v2.html №24 «Новая карточка» | G-C02 | (ok) Чистый гость: «Сохранённые» → `fc-collection-create` → `/flashcards_card_editor?create=1`: ввод «Layover» в `fc-editor-en`, «пересадка» в `fc-editor-tr` (живое превью `fc-editor-preview`). Дубли: cards-section-020, cards-v2-024. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-022 | cards-states.html №17 «Правка · дубликат» | G-C02 | (ok) Вторая карточка: в `fc-editor-en` ввести слово, уже сохранённое (после cards-064 — «Layover») → плашка `fc-editor-duplicate` (flashcards_card_editor.tsx:701). | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-023 | cards-v2.html №22 «Новый набор» | G-C04 | (ok) Хаб → `fc-cards-hub-create-pack` → `/community_pack_create`: название «Путешествия», `ugc-pack-level-A2`, 2 карточки. Plus on (иначе пилюля лимита). Дубли: cards-section-019, cards-v2-022. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-024 | cards-states.html №19 «Новая карточка в наборе» | G-C04 | (ok) В «Новом наборе»: `ugc-pack-first-card` / `ugc-pack-add-card` → шторка «Новая карточка» (`ugc-pack-draft-front`, `ugc-pack-draft-back`, `ugc-pack-draft-save`). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-025 | cards-states.html №20 «Выбор наборов» | G-C04 | (ok) Хаб → train → любой режим → экран настройки: «Что повторяем» — плитки `fc-training-setup-deck-saved`, `…-deck-pack:local_pack_dev_demo_*` (в коде не шторка, а плитки; TrainingSetupV2.tsx:161-179). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-026 | cards-states.html №21 «Мало карточек для блица» | G-C02 | (ok) Чистый гость с 2 своими карточками (G-C02 п.7): `next=%2Fflashcards_training_setup%3Fmode%3Dblitz` → единственная колода `fc-training-setup-deck-custom` (2) выбрана → подсказка «Для блица нужно минимум 4 карточки.», `fc-training-setup-start` серая (flashcards_training_setup.tsx:557,663). | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-027 | cards-states.html №22 «Кнопка языка открыта» | G-C04 | (nocode) На экране настройки тренировки выбора языка набора нет (TrainingSetupV2.tsx). Кнопка `pack-language-picker` есть в шапке каталога сообщества: «Каталог» → тап `pack-language-picker` (PackLanguagePicker.tsx:105) — ближайший кадр. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-028 | cards-v2.html №12 «Мои наборы» | G-C04 | (ok) Образец №12 = «Мои наборы», а строка реестра про «Наборы из видео / Список»: список роликов = cards-v2-018. Путь: хаб → `fc-cards-hub-tile-video` → 5 демо-роликов (`video-pack-row-video:devDemoVid0…4`). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-030 | cards-v2.html №44 «Каталог без сети» | G-C01 | (ok) Авиарежим, чистый гость: хаб → `fc-cards-hub-tile-video` → скелет → ~12–15 с (3 тихих повтора 1/3/8 с) → `fc-video-packs-unavailable` («Сейчас недоступно», «Проверь интернет», `fc-video-packs-try-again`; flashcards_video_packs.tsx:496-507). Образец №44 нарисован для каталога сообщества — это кадр видео-раздела. | гость (pm clear + онбординг «Позже»), авиарежим | тёмная / Спокойно |
| cards-031 | cards-states.html №26 «Загрузка» | — | (none) Транзиент: скелет `fc-saved-loading` (SavedCollectionStates.tsx:32) держится, пока идёт `loadAll` (<0,5 с). Нужен dev-переключатель Н-1. | — | тёмная / Спокойно |
| cards-032 | cards-states.html №27 «Меню «⋯»» | G-C04 | (ok) «Сохранённые» → ⋮ `fc-saved-actions` → шторка `fc-saved-actions-menu` (строки `fc-saved-view-deck`, `fc-menu-select`, `fc-menu-community`, чипы `fc-saved-content-*`). Дубль: cards-v2-048. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-033 | cards-states.html №28 «Разовая подсказка» | G-C04 | (ok) ПЕРВОЕ открытие «Сохранённых» после ссылки: плашка «Зажми карточку, чтобы изменить или удалить её» (показывается, пока нет `flashcard_delete_hint_seen`; useCollectionData.ts:741). Снять ДО закрытия; закрыть крестиком (accessibilityLabel «Закрыть», testID нет). Делать первым в группе. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-034 | cards-states.html №29 «Долгое нажатие → «Удалить»» | G-C04 | (ok) «Сохранённые» → долгое нажатие по плитке (`adb shell input swipe x y x y 700`) → `fc-card-actions` → `fc-card-delete` (CollectionGalleryView.tsx:291-296). Не жать «Удалить», закрыть назад. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-035 | cards-states.html №30 «Подтверждение массового удаления» | G-C04 | (ok) Режим выделения (cards-007) → `fc-delete-selected` → `fc-delete-selected-confirm-modal` («Удалить N карточек?»; flashcards_collection.tsx:1726); снять, затем `fc-delete-selected-confirm-cancel`. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-036 | cards-states.html №31 «Мало для набора — «выбери ещё»» | G-C04 | (ok) Режим выделения с 3 выбранными: панель показывает «Выбери ещё N карточек, чтобы создать набор», `fc-create-pack-from-selection` серая (CollectionGalleryView.tsx:266). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-037 | cards-states.html №80 «Стопка — обратная сторона (переворот)» | G-C04 | (ok) Из cards-008: тап по `fc-deck-card` (переворот); выход `fc-deck-exit`. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-038 | cards-states.html №32 «Поиск — ничего не найдено» | G-C04 | (ok) «Сохранённые» → лупа → ввод «zzzqq» → `fc-saved-search-empty` («Ничего не найдено»; SavedCollectionStates.tsx:106). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-039 | cards-states.html №33 «Ошибка загрузки» | — | (none) `loadError` ставится только при исключении `loadAll` (useCollectionData.ts:650); авиарежим его не вызывает (каталог-заглушка loadMarketplacePacks=[] без сети). Нужен dev-переключатель Н-2. | — | тёмная / Спокойно |
| cards-040 | cards-states.html №34 «Мой набор — ещё не в сообществе» | G-C04 | (ok) Набор `local_pack_dev_demo_b2`: экран набора с бейджем «Только ты»; ⋮ `fc-pack-menu` → строка `fc-pack-publish` («Отправить в сообщество»; CollectionHeaderV2.tsx:246). Не жать «Отправить». | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-041 | cards-states.html №35 «Отправка в сообщество» | — | (perm) Состояние «идёт отправка» (publishBusy) видно только во время реального вызова `callCommunitySubmitPackForReview` — это заявка в модерацию прода. У демо-наборов описание пустое → отказ `invalid` без сети (gap-027). Реальную отправку — только с явным «да» владельца. | — | тёмная / Спокойно |
| cards-042 | cards-states.html №36 «Мой опубликованный — «Править набор»» | — | (none) Бейдж «В сообществе» и `showEditButton` — только у одобренного модерацией набора автора (flashcards_collection.tsx:1030-1039). Меню «Править набор» у локального набора есть (cards-065). Н-5. | — | тёмная / Спокойно |
| cards-043 | cards-states.html №37 «Набор из видео — превью ролика» | G-C03 | (cond) Реальный ролик: `phraseman://dev_state?next=%2Fflashcards_collection%3Fpack%3Dvideo_<videoId>%26preview%3D1` → `video-set-view`, `video-set-hero`, `video-set-title` (VideoSetView.tsx:97-120). videoId — из строки `video-pack-row-video:<videoId>`. Демо-ролики (`video:devDemoVid*`) открывают плеер, не VideoSetView. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-044 | cards-states.html №38 «Открытие набора · сеть упала» | G-C04 | (cond) Тост «Набор ещё не скачан» при открытии чужого набора без данных: демо-каталог → тап `flashcards-pack-card-dev_demo_community_2` (карточек в облаке нет). Для именно «сеть упала» — с авиарежимом (G-C03 п.9). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-045 | cards-states.html №39 «Набор удалён» | G-C04 | (cond) Тост «Набор удалён.» — «Мои наборы» → удалить набор → `fc-delete-pack-confirm-confirm` (flashcards_my_packs.tsx:809). Разрушающее: брать «Фразовые глаголы»; восстановить ссылкой `cards=demo`. Делать последним в группе. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-046 | cards-states.html №40 «Поиск — ничего не найдено» | G-C04 | (ok) «Мои наборы» → `fc-my-packs-menu` → `fc-my-packs-menu-search` → ввод «zzzqq» в `fc-my-packs-search` → «Ничего не найдено». | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-047 | cards-states.html №41 «Загрузка» | — | (none) Транзиент: скелет `flashcards-community-skeleton` (FlashcardsCategoryHub.tsx:953) только пока `communityLoaded=false`. Н-1. | — | тёмная / Спокойно |
| cards-048 | cards-states.html №42 «Каталог пуст» | — | (none) «Здесь появятся наборы после публикации.» — только если облачный каталог пуст при живой сети; в проде он не пуст. Н-7. | — | тёмная / Спокойно |
| cards-049 | cards-states.html №43 «Свой опубликованный — карандаш · «Топ»» | — | (none) Нужен свой ОПУБЛИКОВАННЫЙ набор в каталоге (карандаш + «Топ»). Н-5. | — | тёмная / Спокойно |
| cards-050 | cards-states.html №44 «Лайк после добавления» | G-C03 | (cond) После cards-019: тап `pack-like-<id>` → сердце заполнено, счётчик +1 (пишет лайк в прод). | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-051 | cards-states.html №45 «Отклик пуст» | G-C03 | (cond) Добавленный реальный набор → `pack-comments-<id>` → `pack-comments-sheet` (PackCommentsSheet.tsx:753): пустое состояние, если откликов нет. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-052 | cards-states.html №46 «Набор не добавлен — писать нельзя» | G-C03 | (cond) До добавления: счётчик откликов `pack-comments-<id>` есть, только если у набора уже есть отклики (CommunityPackPreview.tsx:234); открыть шторку — поле ввода заблокировано. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-053 | cards-states.html №47 «Меню автора: закрепить / скрыть» | — | (none) Меню автора (закрепить/скрыть) — только для автора набора с опубликованным набором и чужими откликами. Н-5. | — | тёмная / Спокойно |
| cards-054 | cards-states.html №48 «Меню своего: удалить» | — | (perm) Меню своего отклика (`pack-comment-more-<id>`) — сперва нужно отправить отклик (публичная запись в прод). Только с «да» владельца. | — | тёмная / Спокойно |
| cards-055 | cards-states.html №49 «Меню чужого: пожаловаться» | G-C03 | (cond) Если у реального набора есть чужие отклики: `pack-comment-more-<id>` → меню «Пожаловаться». | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-056 | cards-states.html №50 «Отправляется · не отправлено» | — | (perm) «Отправляется / не отправлено» — композер `pack-comment-send`: отправка публичного отклика (в авиарежиме — «не отправлено»). Только с «да» владельца. | — | тёмная / Спокойно |
| cards-057 | cards-states.html №51 «Жалоба на комментарий» | G-C03 | (cond) Из cards-055 → «Пожаловаться на отклик» → `report-comment-sheet`; снять и закрыть, не отправлять. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-058 | cards-states.html №52 «Жалоба на комментарий отправлена» | — | (perm) Отправка жалобы на отклик — реальная жалоба модераторам. Только с «да» владельца. | — | тёмная / Спокойно |
| cards-059 | cards-states.html №53 «Жалоба на набор отправлена» | — | (perm) Отправка жалобы на набор (`ReportPackModal` → «Отправить жалобу») — реальная жалоба. Только с «да» владельца. | — | тёмная / Спокойно |
| cards-060 | cards-states.html №54 «Проверка Plus — скелет» | — | (nocode) В коде нет: `shouldGateCreator` всегда false (creator_access.ts:31-36), `fc-editor-skeleton` показывается только на мгновенное чтение карточки при правке. | — | тёмная / Спокойно |
| cards-061 | cards-states.html №55 «Новая · заметка раскрыта» | G-C02 | (ok) Редактор → тап `fc-editor-description` и ввод примера → превью разворачивается на оборот с примером. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-062 | cards-states.html №56 «Не удалось сохранить» | — | (none) Тост «Не удалось сохранить» + «Повторить» — исключение в `upsertCustomCard`; без dev-сбоя не вызвать. Н-4. | — | тёмная / Спокойно |
| cards-063 | cards-states.html №57 «Карточка не найдена» | G-C09 | (ok) `dev_state?next=%2Fflashcards_card_editor%3Fid%3Dnope` → `fc-editor-not-found` («Карточка не найдена», flashcards_card_editor.tsx:596-610). | гость + демо, Plus on (прямые маршруты) | тёмная / Спокойно |
| cards-064 | cards-states.html №58 «Сохранено» | G-C02 | (ok) Редактор: заполнить `fc-editor-en`/`fc-editor-tr` → `fc-editor-save` → тост «Карточка сохранена.» (flashcards_card_editor.tsx:469-476) → экран `cat=custom`. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-065 | cards-states.html №59 «Правка своего набора» | G-C04 | (ok) «Мои наборы» → долгое нажатие → `fc-my-packs-pack-edit-local_pack_dev_demo_b2` (или экран набора → `fc-pack-edit`) → `/community_pack_create?packId=…` «Изменить набор», карточки с корзинами. Дубли: cards-section-021, cards-v2-023. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-066 | cards-states.html №60 «Только для меня» | G-C04 | (ok) Новый набор: переключатель `ugc-pack-public-toggle` на «Только я» (по умолчанию). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-067 | cards-states.html №62 «Меню: черновик / ошибка» | G-C04 | (ok) Новый набор: ⋮ `ugc-pack-menu` → меню: `ugc-pack-menu-description`, «Язык набора», при непустом черновике `ugc-pack-clear-draft`, «Сообщить об ошибке». | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-068 | cards-states.html №63 «Очистить черновик?» | G-C04 | (ok) Ввести название → ⋮ → `ugc-pack-clear-draft` → окно «Очистить черновик?»; снять и «Отмена». | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-069 | cards-states.html №64 «Минимум 10 карточек» | G-C04 | (ok) Название + 2 карточки → `ugc-pack-save` → тост «Минимум 10 карточек.» (community_pack_create.tsx:194-209). В образце «Минимум 10 карточек» без точки. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-070 | cards-states.html №65 «Проверь поля» | G-C04 | (ok) Пустое название + любые карточки → `ugc-pack-save` → тост «Укажи название и описание набора.» (в образце «Проверь поля» — текст в коде другой). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-071 | cards-states.html №66 «Лимит 50 карточек» | G-C04 | (ok) Набор «B2 глаголы» (49) → «Изменить набор» → `ugc-pack-add-card` → слово/перевод → `ugc-pack-draft-save` (стало 50) → `ugc-pack-add-card` снова → окно «Карточек уже 50» (community_pack_create.tsx:1454). Выйти `ugc-pack-back` без сохранения. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-072 | cards-states.html №67 «Офлайн — сохранено на устройстве» | G-C04 | (cond) Plus on: набор с ≥10 карточек (через «Отметить несколько» → `fc-create-pack-from-selection`), переключатель «Все», включить авиарежим → `ugc-pack-save` → тост «Набор сохранён на устройстве. Публикация не завершена…» (community_pack_create.tsx:933-939). НЕ делать с сетью: уйдёт реальная заявка. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-073 | cards-states.html №68 «Набор сохранён» | G-C04 | (ok) Plus on: набор ≥10 карточек, «Только я» → `ugc-pack-save` → тост «Набор сохранён.» → хаб (Мои наборы = 5). Делать в самом конце группы. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-074 | cards-states.html №69 «Недоступен для правки» | G-C09 | (ok) `dev_state?next=%2Fcommunity_pack_create%3FpackId%3Ddev_missing_cloud_pack` → `ugc-pack-load-error` «Набор недоступен для редактирования» (community_pack_create.tsx:497, 1028-1041). | гость + демо, Plus on (прямые маршруты) | тёмная / Спокойно |
| cards-075 | cards-states.html №70 «Загрузка наборов» | — | (none) Транзиент: `fc-training-setup-loading` гасится тёплым снимком/мгновенной загрузкой. Н-1. | — | тёмная / Спокойно |
| cards-076 | cards-states.html №71 «Нет наборов» | G-C02 | (ok) Чистый гость: `next=%2Fflashcards_training_setup%3Fmode%3Dblitz` (закрыть интро `training_blitz_first_visit-later`) → `fc-training-setup-empty` «Нет карточек» + «Открыть каталог». Дубли: cards-section-038, cards-v2-029. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-077 | cards-states.html №72 «Ошибка сети» | — | (none) `unavailable` ставится при отказе `loadDecks` или сторожа 12 с; источники колод глотают ошибки (deck_options.ts:339-351), авиарежим не вызывает. Н-2. | — | тёмная / Спокойно |
| cards-078 | cards-states.html №73 «Режим недоступен» | G-C09 | (ok) `dev_state?next=%2Fflashcards_training_setup%3Fmode%3Dzzz` → `fc-training-setup-error` (текст «Этот режим сейчас недоступен…»). | гость + демо, Plus on (прямые маршруты) | тёмная / Спокойно |
| cards-079 | cards-states.html №74 «Шторка выбора наборов (Устно)» | G-C09 | (cond) `next=%2Fflashcards_speaking_session%3Fdeck%3Dcustom%26size%3Dall` (custom пуст на демо) → `fc-speak-empty` → `fc-speak-pick-decks-empty` → `fc-deck-sheet` (DeckPickerSheet.tsx:316). Нужен доступный распознаватель речи и Plus on. | гость + демо, Plus on (прямые маршруты) | тёмная / Спокойно |
| cards-080 | cards-states.html №75 «Пока пусто» | — | (nocode) «Пока пусто» у «Из видео» нет: пустой каталог → скелет → «Сейчас недоступно» (flashcards_video_packs.tsx:433-466). Ближайший: cards-030. | — | тёмная / Спокойно |
| cards-081 | cards-states.html №76 «Ничего не нашли» | G-C02 | (ok) «Из видео» (чистый гость, онлайн) → `fc-video-packs-menu` → `fc-video-packs-menu-search` → ввод «zzzqq» в `fc-video-packs-search` → `fc-video-packs-empty` (flashcards_video_packs.tsx:525-535). | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-082 | cards-states.html №77 «Открытие ролика · не открылся» | G-C03 | (bypass) Тап `video-set-hero` вызывает `Linking.openURL` (VideoPackRow.tsx:75-99): на эмуляторе откроется браузер. Обход: `adb shell pm disable-user --user 0 com.android.chrome` (и youtube) → тост «Видео сейчас не открывается…»; вернуть `pm enable`. Нужен экран VideoSetView (G-C03 п. Б). | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-083 | cards-states.html №78 «Лучшее у сообщества грузится» | — | (nocode) То же, что cards-004: «Лучшее у сообщества грузится» (`saved-top-pack-loading-*`) на хабе А нет. | — | тёмная / Спокойно |
| cards-section-005 | cards-v2.html №5 «Сохранённые — 1 колонка» | G-C04 | (dup) То же, что cards-005. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-006 | cards-v2.html №9 «Сохранённые — поиск» | G-C04 | (ok) «Сохранённые» → лупа `fc-collection-search` → ввод «lay» в `fc-search-input` (во время поиска сетка = 2 колонки, совпадение подчёркнуто; CollectionGalleryView.tsx:143-160). Дубль: cards-v2-009. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-007 | cards-v2.html №11 «Сохранённые — пусто» | G-C02 | (dup) То же, что cards-009. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-section-008 | cards-v2.html №6 «Сохранённые — 2 колонки» | G-C04 | (ok) «Сохранённые», шаг по умолчанию = 2 колонки (cardsGalleryLayout.ts:25); если шаг запомнен иным — `fc-zoom-larger`/`fc-zoom-smaller` до 2 кол. Дубль: cards-v2-006. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-009 | cards-v2.html №12 «Мои наборы» | G-C04 | (dup) То же, что cards-011. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-010 | cards-v2.html №17 «Действия с набором» | G-C04 | (ok) Экран набора (открыть строку `fc-my-packs-pack-local_pack_dev_demo_b2`) → `fc-pack-menu` → шторка `fc-saved-actions-menu` с названием набора наверху. Дубль: cards-v2-017. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-011 | cards-v2.html №13 «Мои наборы — пусто» | G-C02 | (dup) То же, что cards-013. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-section-012 | cards-v2.html №14 «Свой набор» | G-C04 | (ok) «Мои наборы» → строка `fc-my-packs-pack-local_pack_dev_demo_travel` («Путешествия», 40, A2) → экран набора (`fc-collection-title`, `fc-pack-train`, галерея). Дубль: cards-v2-014. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-013 | cards-v2.html №15 «Чужой набор — до добавления» | G-C03 | (dup) То же, что cards-018. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-section-014 | cards-v2.html №16 «Чужой набор — добавлен» | G-C03 | (dup) То же, что cards-019. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-section-015 | cards-v2.html №10 «Удалено — вернуть» | G-C04 | (dup) То же, что cards-006. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-016 | cards-v2.html №20 «Карточка — лицевая сторона» | G-C04 | (ok) «Сохранённые» → тап по плитке «Layover» → `fc-expanded-card` (лицевая сторона). Дубль: cards-v2-020. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-017 | cards-v2.html №21 «Карточка — оборот» | G-C04 | (ok) Из cards-section-016: тап `fc-expanded-card-flip` → оборот. Дубль: cards-v2-021. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-018 | cards-v2.html №20 «Карточка — лицевая сторона» | G-C03 | (cond) После «Добавить себе» реального набора: тап по плитке карточки → `fc-expanded-card` с нижней строкой «чужой» (`fc-expanded-save`, `fc-expanded-to-pack`; ExpandedCardV2.tsx:162-164). Требует реальный набор G-C03. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-section-019 | cards-v2.html №22 «Новый набор» | G-C04 | (dup) То же, что cards-023. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-020 | cards-v2.html №24 «Новая карточка» | G-C02 | (dup) То же, что cards-021. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-section-021 | cards-v2.html №23 «Изменить набор» | G-C04 | (dup) То же, что cards-065. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-022 | cards-v2.html №25 «Каталог сообщества» | G-C04 | (dup) То же, что cards-014. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-023 | cards-v2.html №26 «Каталог — ничего не найдено» | G-C04 | (dup) То же, что cards-017. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-024 | cards-v2.html №25 «Каталог сообщества» | G-C04 | (dup) То же, что cards-014. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-028 | cards-v2.html №25 «Каталог» | G-C04 | (dup) То же, что cards-017 (образец №25 = список, но состояние «Ничего не нашли» = №26). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-029 | cards-v2.html №44 «Каталог без сети» | G-C01 | (ok) Чистый гость, авиарежим ДО первого входа в каталог: хаб → `fc-cards-hub-tile-community` → ~2 с → `flashcards-community-empty` «Нет сети» + `flashcards-community-offline-retry` (useCatalogOffline.ts). В коде нет подписи «Проверь подключение» и нет «Сейчас недоступно» (образец) — расхождение. Дубль: cards-v2-044. | гость (pm clear + онбординг «Позже»), авиарежим | тёмная / Спокойно |
| cards-section-030 | cards-v2.html №19 «Набор из видео» | G-C03 | (dup) То же, что cards-043. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-section-031 | cards-v2.html №19 «Набор из видео» | G-C03 | (cond) Реальный ролик → `lingman_video_watch` → «Добавить набор себе» (`lingman-video-watch-pack`) → «Тренировать фразы ролика» → VideoSetView владельца: «В моих наборах» + `video-set-train`. Дубль: cards-v2-053. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-section-032 | cards-v2.html №27 «Режим тренировки» | G-C04 | (dup) То же, что cards-002. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-033 | cards-v2.html №28 «Настройка тренировки» | G-C04 | (ok) Шторка режимов → `fc-training-mode-blitz` (закрыть интро `training_blitz_first_visit-later`) → «Блиц»: колоды, «Время» `fc-training-setup-extra-30/60/90`, `fc-training-setup-start`. Дубль: cards-v2-028. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-034 | cards-v2.html №28 «Настройка тренировки» | G-C04 | (ok) Шторка → `fc-training-mode-speaking` → настройка «Устно»: колоды, «Сколько» `fc-training-setup-size-10/20/all`. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-035 | cards-v2.html №28 «Настройка тренировки» | G-C04 | (ok) Шторка → `fc-training-mode-truefalse` → настройка «Правда / ложь» (интро нет). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-036 | cards-v2.html №28 «Настройка тренировки» | G-C04 | (ok) Шторка → `fc-training-mode-recall` → настройка «Напиши»: «Сколько», «Показывать» `fc-training-setup-extra-to_source/to_target` («EN → RU»). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-section-038 | cards-v2.html №29 «Настройка — пусто» | G-C02 | (dup) То же, что cards-076. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-section-039 | cards-v2.html №31 «Блиц» | G-C05 | (ok) Шторка → Блиц → настройка → `fc-training-setup-start` → вопрос `fc-blitz-question`, варианты `fc-blitz-opt-0..3`, сердца `fc-blitz-attempts`, таймер `fc-blitz-timer`; снять сразу. Дубль: cards-v2-031. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-section-040 | cards-v2.html №32 «Устно» | G-C05 | (cond) Шторка → Устно (плитка активна только если распознавание речи есть) → старт → ожидание: карточка, микрофон `fc-speak-mic`, `fc-speak-task-recall/repeat`, `fc-speak-skip`, `fc-speak-listen`. Дубль: cards-v2-032. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-section-041 | cards-v2.html №32 «Устно» | G-C05 | (cond) Из cards-section-040: тап `fc-speak-mic` (запись идёт, панель слушает) — снять в этот момент; остановить повторным тапом. Нужно разрешение на микрофон (его системное окно: «Только в этот раз»). | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-section-042 | cards-v2.html №33 «Правда / ложь» | G-C05 | (ok) Шторка → `fc-training-mode-truefalse` → старт: `flashcards-truefalse-prompt` (`true-false-word`, `true-false-translation`), кнопки `flashcards-truefalse-answer-false/true`, полоса `flashcards-truefalse-progress`. Дубль: cards-v2-033. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-section-043 | cards-v2.html №34 «Вспомни и напиши» | G-C05 | (ok) Шторка → `fc-training-mode-recall` → старт: карточка, поле `fc-recall-input`, `fc-recall-check`, `fc-recall-hint`, `fc-recall-reveal`. Дубль: cards-v2-034. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-section-044 | cards-v2.html №35 «Блиц — верно» | G-C05 | (ok) Блиц: тап верного варианта (по таблице слов app/dev_state_cards_demo.ts:23-38); кадр `fc-blitz-award` «+10» держится 350 мс (blitz_logic.ts:33) — тап и `screencap` в одной команде. Дубль: cards-v2-035. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-section-045 | cards-v2.html №36 «Блиц — неверно» | G-C05 | (ok) Блиц: тап заведомо неверного варианта: сердца 3→2, красный вариант; кадр держится 700 мс. Дубль: cards-v2-036. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-section-046 | cards-v2.html №37 «Устно — верно» | — | (none) «Устно — верно» требует распознанной речи; микрофона эмулятора у робота нет. Н-9: dev-переключатель `speech_dev_transcript` (подставляет транскрипт). | — | тёмная / Спокойно |
| cards-section-049 | cards-v2.html №38 «Правда / ложь — неверно» | G-C05 | (ok) Правда/ложь: ответ, противоположный истине (сверка по таблице слов) → `flashcards-truefalse-verdict` «Неверно» + «Дальше» `flashcards-truefalse-continue`. Дубль: cards-v2-038. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-section-050 | cards-v2.html №39 «Напиши — верно» | G-C05 | (ok) Напиши: ввод верного EN (`adb shell input text`) → `fc-recall-check` → `fc-recall-feedback` «Верно» (+10) → `fc-recall-continue`. Дубль: cards-v2-039. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-section-052 | cards-v2.html №40 «Напиши — неверно» | G-C05 | (ok) Напиши: ввод неверного → `fc-recall-check` → «Пока нет. Правильно: …». Дубль: cards-v2-040. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-section-053 | cards-v2.html №41 «Итог с ошибками» | G-C06 | (ok) Блиц 90 с, ровно 20 ответов: 18 верно / 2 неверно → `fc-blitz-result` «18 из 20 · Почти идеально», секция «Ошибки 2» (`fc-result-mistake-*`), «Готово» `fc-result-done` + «Ещё раз» `fc-result-retry`. Дубли: cards-section-054, cards-v2-041. | гость + демо, Plus on, mode b | тёмная / Спокойно |
| cards-section-054 | cards-v2.html №41 «Итог с ошибками» | G-C06 | (dup) То же, что cards-section-053 (итог Блица). | гость + демо, Plus on, mode b | тёмная / Спокойно |
| cards-section-055 | cards-v2.html №42 «Итог без ошибок» | G-C06 | (ok) Блиц 90 с, 20 верных из 20 → «20 из 20 · Без единой ошибки», без секции ошибок. Дубль: cards-v2-042. | гость + демо, Plus on, mode b | тёмная / Спокойно |
| cards-section-056 | cards-v2.html №30 «Лимит Free — тренировки» | G-C08 | (dup) То же, что cards-v2-030. | гость + демо, Free, счётчик 30/30 (обход) | тёмная / Спокойно |
| packs-simple-001 | cards-v2.html №26 «Ничего не найдено» | G-C04 | (dup) То же, что cards-017. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| packs-simple-003 | cards-v2.html №13 «Мои наборы — пусто» | G-C02 | (dup) То же, что cards-013. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| packs-simple-004 | cards-v2.html №15 «Чужой набор — до добавления» | G-C03 | (dup) То же, что cards-018. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-v2-001 | cards-section.html №1 «Хаб — вариант А» | G-C04 | (ok) Хаб А: ссылка G-C04 `next=/flashcards` → `fc-cards-hub-v2`; плитки `fc-cards-hub-tile-saved/mine/video/community` (64 · 4 · «5 наборов» · 5); закрыть интро `cards_hub_first_visit-later`. Число в кнопке «осталось N из 30» не равно образцу 24 (зависит от стартов Free). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-002 | cards-section.html №3 «Хаб — новичок, своих карточек нет» | G-C02 | (ok) Чистый гость: ссылка G-C02 `next=/flashcards` → ждать 1–2 с, пока оба числа известны → `fc-cards-hub-fresh` («Начни с готового»), кнопка `fc-cards-hub-train` = «Выбрать набор» (FlashcardsHubScreen.tsx:667-674). | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-v2-003 | cards-section.html №2 «Хаб — загрузка сообщества» | — | (none) Транзиент: пустые счётчики плиток живут только пока грузится каталог (FlashcardsHubScreen.tsx:635 `fmt(null)`), окно <1 с. Нужен dev-переключатель (ниже, Н-1). | — | тёмная / Спокойно |
| cards-v2-004 | cards-section.html №1 «Хаб — вариант А (поиска в варианте А нет)» | G-C04 | (nocode) В хабе А поиска нет (CardsHubV2.tsx — лупы нет). Поиск живёт в «Сохранённых» (`fc-collection-search`) и каталоге (`flashcards-packs-search`) — снять их кадры (cards-section-006, cards-017). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-005 | cards-v2.html №5 «1 колонка» | G-C04 | (dup) То же, что cards-005. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-006 | cards-v2.html №6 «2 колонки» | G-C04 | (dup) То же, что cards-section-008. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-007 | cards-v2.html №7 «3 колонки» | G-C04 | (ok) «Сохранённые»: из 2 кол. `fc-zoom-smaller` ×1 → 3 колонки. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-008 | cards-v2.html №8 «5 колонок» | G-C04 | (ok) «Сохранённые»: из 2 кол. `fc-zoom-smaller` ×2 → 5 колонок. После — вернуть 2 кол. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-009 | cards-v2.html №9 «Поиск» | G-C04 | (dup) То же, что cards-section-006. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-010 | cards-v2.html №10 «Удалено — вернуть» | G-C04 | (dup) То же, что cards-006. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-011 | cards-v2.html №11 «Пусто» | G-C02 | (dup) То же, что cards-009. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-v2-012 | cards-v2.html №12 «Мои наборы» | G-C04 | (dup) То же, что cards-011. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-013 | cards-v2.html №13 «Пусто» | G-C02 | (dup) То же, что cards-013. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-v2-014 | cards-v2.html №14 «Свой набор» | G-C04 | (dup) То же, что cards-section-012. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-015 | cards-v2.html №15 «Чужой — до добавления» | G-C03 | (dup) То же, что cards-018. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-v2-016 | cards-v2.html №16 «Чужой — добавлен» | G-C03 | (dup) То же, что cards-019. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-v2-017 | cards-v2.html №17 «Действия с набором» | G-C04 | (dup) То же, что cards-section-010. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-018 | cards-v2.html №18 «Все ролики» | G-C04 | (dup) То же, что cards-028 (список «Из видео»; `fc-video-packs-title`). Тап по строке НЕ делать — откроет плеер. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-019 | cards-v2.html №19 «Набор из видео» | G-C03 | (dup) То же, что cards-043. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-v2-020 | cards-v2.html №20 «Лицевая сторона» | G-C04 | (dup) То же, что cards-section-016. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-021 | cards-v2.html №21 «Оборот» | G-C04 | (dup) То же, что cards-section-017. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-022 | cards-v2.html №22 «Новый набор» | G-C04 | (dup) То же, что cards-023. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-023 | cards-v2.html №23 «Изменить набор» | G-C04 | (dup) То же, что cards-065. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-024 | cards-v2.html №24 «Новая карточка — превью живое» | G-C02 | (dup) То же, что cards-021. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-v2-025 | cards-v2.html №25 «Каталог» | G-C04 | (dup) То же, что cards-014. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-026 | cards-v2.html №26 «Ничего не найдено» | G-C04 | (dup) То же, что cards-017. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-027 | cards-v2.html №27 «Режим» | G-C04 | (dup) То же, что cards-002. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-028 | cards-v2.html №28 «Настройка» | G-C04 | (dup) То же, что cards-section-033. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-029 | cards-v2.html №29 «Настройка — пусто» | G-C02 | (dup) То же, что cards-076. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-v2-030 | cards-v2.html №30 «Лимит Free — тренировки 30/30 в месяц» | G-C08 | (bypass) Лимит 30/30: dev-переключателя нет (счётчик в AsyncStorage `training_sessions:v1:<stableId>`); обход — запись через `run-as` (G-C08) или 30 реальных стартов Free. Экран: настройка с `fc-training-setup-upgrade` «Безлимит с Plus». Дубль: cards-section-056. | гость + демо, Free, счётчик 30/30 (обход) | тёмная / Спокойно |
| cards-v2-031 | cards-v2.html №31 «Блиц» | G-C05 | (dup) То же, что cards-section-039. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-v2-032 | cards-v2.html №32 «Устно» | G-C05 | (dup) То же, что cards-section-040. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-v2-033 | cards-v2.html №33 «Правда / ложь» | G-C05 | (dup) То же, что cards-section-042. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-v2-034 | cards-v2.html №34 «Вспомни и напиши» | G-C05 | (dup) То же, что cards-section-043. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-v2-035 | cards-v2.html №35 «Блиц — верно» | G-C05 | (dup) То же, что cards-section-044. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-v2-036 | cards-v2.html №36 «Блиц — неверно» | G-C05 | (dup) То же, что cards-section-045. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-v2-037 | cards-v2.html №37 «Устно — верно» | — | (none) То же, что cards-section-046. | — | тёмная / Спокойно |
| cards-v2-038 | cards-v2.html №38 «Правда / ложь — неверно» | G-C05 | (dup) То же, что cards-section-049. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-v2-039 | cards-v2.html №39 «Напиши — верно» | G-C05 | (dup) То же, что cards-section-050. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-v2-040 | cards-v2.html №40 «Напиши — неверно» | G-C05 | (dup) То же, что cards-section-052. | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-v2-041 | cards-v2.html №41 «Итог с ошибками» | G-C06 | (dup) То же, что cards-section-053. | гость + демо, Plus on, mode b | тёмная / Спокойно |
| cards-v2-042 | cards-v2.html №42 «Без ошибок» | G-C06 | (dup) То же, что cards-section-055. | гость + демо, Plus on, mode b | тёмная / Спокойно |
| cards-v2-043 | cards-section.html №1 «Хаб — вариант А (кадра «без сети» в варианте А нет)» | G-C01 | (nocode) Кадра «Нет сети» у хаба А в коде нет — при авиарежиме хаб рисуется как обычно (локальные данные). Снять хаб в авиарежиме как «ближайший» (G-C01 п.1). | гость (pm clear + онбординг «Позже»), авиарежим | тёмная / Спокойно |
| cards-v2-044 | cards-v2.html №44 «Каталог без сети» | G-C01 | (dup) То же, что cards-section-029. | гость (pm clear + онбординг «Позже»), авиарежим | тёмная / Спокойно |
| cards-v2-045 | cards-v2.html №45 «Лимит — сохранённые 50/50» | G-C07 | (dup) То же, что cards-010. | гость + демо, Free (plus=off) | тёмная / Спокойно |
| cards-v2-046 | cards-v2.html №46 «Лимит — свои карточки 50/50» | — | (none) Пилюля `fc-editor-limit-pill` «50/50» и «Безлимит с Plus» требуют 50 своих карточек (cardLimitReached; flashcards_card_editor.tsx:165). Вручную ≈35 мин. Н-8: `dev_state?cards=custom50`. | — | тёмная / Спокойно |
| cards-v2-047 | cards-v2.html №47 «Лимит — свои наборы 3/3» | G-C07 | (ok) Free + демо: удалить один из 4 наборов (Мои наборы → долгое нажатие → удалить → `fc-delete-pack-confirm-confirm`) → хаб `fc-cards-hub-create-pack` → `ugc-pack-limit-pill` «3/3» и кнопка `ugc-pack-save` «Безлимит с Plus» (community_pack_create.tsx:1147,1284). При 4 наборах пилюля покажет «4/3». | гость + демо, Free (plus=off) | тёмная / Спокойно |
| cards-v2-048 | cards-v2.html №48 «Сохранённые — меню «⋯» («Показать стопкой»)» | G-C04 | (dup) То же, что cards-032. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-v2-049 | cards-v2.html №49 «Вспомни и напиши — подсказка» | G-C05 | (ok) Напиши: на новой карточке тап `fc-recall-hint` → подсказка с началом ответа (flashcards_recall_session.tsx:1125). | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-v2-050 | cards-v2.html №50 «Вспомни и напиши — ответ показан («Знал / Не знал»)» | G-C05 | (ok) Напиши: на новой карточке тап `fc-recall-reveal` («Показать ответ») → ответ + `fc-recall-self-grade-wrong/correct` («Не знал / Знал»). | гость + демо, Plus on, mode a | тёмная / Спокойно |
| cards-v2-051 | cards-v2.html №51 «Итог — «Хороший результат» (12 из 20), плашка баланса монет» | G-C06 | (ok) Блиц 90 с, `plus=on&mode=b` (ошибки бесплатны), 12 верно / 8 неверно → «12 из 20 · Хороший результат» (≥50 %); плашка баланса слева сверху. | гость + демо, Plus on, mode b | тёмная / Спокойно |
| cards-v2-052 | cards-v2.html №52 «Итог — «Есть куда расти» (6 из 20), плашка баланса монет» | G-C06 | (ok) Блиц 90 с, `plus=on&mode=b`, 6 верно / 14 неверно → «6 из 20 · Есть куда расти» (<50 %). | гость + демо, Plus on, mode b | тёмная / Спокойно |
| cards-gap-001 | cards-gaps-states.html №1 «Блиц — «Тренировка не открылась»» | — | (none) `fc-blitz-quota-unavailable` — отказ слоя отложенной выдачи/квоты (flashcards_blitz_session.tsx:1268, 733-753); у слоя fail-open, штатно не воспроизводится. Н-10: `dev_state?train_gate=fail`. | — | тёмная / Спокойно |
| cards-gap-002 | cards-gaps-states.html №2 «Устно — «Тренировка не открылась»» | — | (none) То же для «Устно» (`fc-speak-quota-unavailable`). Н-10. | — | тёмная / Спокойно |
| cards-gap-003 | cards-gaps-states.html №3 «Правда / ложь — быстрый старт: «Готовим тренировку…»» | — | (none) Транзиент «Готовим тренировку…» (`flashcards-swipe-quickstart`, flashcards_swipe.tsx:4205): держится, пока идёт старт (<1 с). Н-1. | — | тёмная / Спокойно |
| cards-gap-004 | cards-gaps-states.html №4 «Правда / ложь — быстрый старт: нет карточек» | G-C09 | (cond) `next=%2Fflashcards_truefalse_session%3Fdeck%3Dcustom%26quick%3D1%26size%3Dall` (custom пуст) → `flashcards-swipe-no-cards` + `flashcards-swipe-reload` (flashcards_swipe.tsx:4237). Условно: зависит от того, оставляет ли пустая колода источник в `selectedSources`. | гость + демо, Plus on (прямые маршруты) | тёмная / Спокойно |
| cards-gap-005 | cards-gaps-states.html №5 «Правда / ложь — «Не удалось подготовить тренировку. Энергия возвращена.»» | — | (none) Сообщение «Не удалось подготовить тренировку. Энергия возвращена.» — catch старта без fail-open у Правды/лжи (flashcards_swipe.tsx:2635). Н-10. | — | тёмная / Спокойно |
| cards-gap-006 | cards-gaps-states.html №6 «Правда / ложь — «Не удалось проверить лимит тренировки»» | — | (none) Сообщение про лимит — `quotaResult.status` не allowed и не exhausted (flashcards_swipe.tsx:2540). Н-10. | — | тёмная / Спокойно |
| cards-gap-007 | cards-gaps-states.html №7 «Правда / ложь — нет карточек с переводом» | — | (none) Нужны карточки без перевода: `answerFor(card)` пуст (flashcards_swipe.tsx:2260); редактор требует перевод, демо переводы даёт. Н-11: карточки без перевода в фикстуре. | — | тёмная / Спокойно |
| cards-gap-008 | cards-gaps-states.html №8 «Напиши — нет карточек с переводом» | — | (none) То же для «Напиши» (flashcards_recall_session.tsx:793). Н-11. | — | тёмная / Спокойно |
| cards-gap-009 | cards-gaps-states.html №9 «Напиши — «Сейчас недоступно»» | — | (none) `fc-recall-unavailable` — только после ошибки загрузки карточек колод (`loadError`); локальные колоды не падают. Н-2. | — | тёмная / Спокойно |
| cards-gap-010 | cards-gaps-states.html №10 «Устно — «Здесь пока нечего говорить»» | G-C09 | (cond) `next=%2Fflashcards_speaking_session%3Fdeck%3Dcustom%26size%3Dall` (custom пуст) → `fc-speak-empty` «Здесь пока нечего говорить — выбери наборы» (flashcards_speaking_session.tsx:1334, 1540). Нужен доступный распознаватель речи. | гость + демо, Plus on (прямые маршруты) | тёмная / Спокойно |
| cards-gap-011 | cards-gaps-states.html №11 «Шторка режима — «Готовим тренировку…»» | — | (none) Шторка «Готовим тренировку…» показывается, пока квота читается (мс; FlashcardsHubScreen.tsx:582-593). Н-1: `dev_state?quota=waiting`. | — | тёмная / Спокойно |
| cards-gap-012 | cards-gaps-states.html №12 «Шторка режима — «Не получилось подготовить тренировку»» | — | (none) «Не получилось подготовить тренировку» — после 15 с ожидания квоты (EARLY_TAP_CEILING_MS); квота читается мгновенно. Н-1. | — | тёмная / Спокойно |
| cards-gap-013 | cards-section.html №4 «Хаб — лимит исчерпан (Free)» | G-C08 | (bypass) Хаб при исчерпанном лимите: пилюля «0/30», кнопка «Осталось 0 из 30 · до 1 ноября» (приглушена, замок), стопка «Лимит на этот месяц исчерпан / Обновится 1 ноября» (FlashcardsHubScreen.tsx:625-663). Нужен тот же обход, что cards-v2-030. | гость + демо, Free, счётчик 30/30 (обход) | тёмная / Спокойно |
| cards-gap-014 | cards-gaps-states.html №14 «Твой набор одобрен» | — | (none) Окно решения модерации приходит с сервера (`callCommunityListSellerInbox`; communityModerationAlerts.ts). Н-12: `dev_state?moderation=approved\|rejected\|revision\|removed`. | — | тёмная / Спокойно |
| cards-gap-015 | cards-gaps-states.html №15 «Твой набор отклонён (с комментарием)» | — | (none) То же (результат `rejected` с комментарием). Н-12. | — | тёмная / Спокойно |
| cards-gap-016 | cards-gaps-states.html №16 «Нужна доработка» | — | (none) То же (`revision_requested`). Н-12. | — | тёмная / Спокойно |
| cards-gap-017 | cards-gaps-states.html №17 «Набор снят с продажи» | — | (none) То же (`pack_removed`). Н-12. | — | тёмная / Спокойно |
| cards-gap-018 | cards-gaps-states.html №18 «Шторка «В какой набор?» — список» | G-C04 | (ok) Тап по плитке → `fc-expanded-to-pack` → `fc-expanded-pack-picker` со списком своих наборов (`fc-expanded-pack-local_pack_dev_demo_*`). Брать «Работа» (не «B2», чтобы 49 не стало 50). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-gap-019 | cards-gaps-states.html №19 «Шторка «В какой набор?» — своих наборов пока нет» | G-C04 | (ok) В самом конце G-C04 (после удаления всех 4 демо-наборов): «Сохранённые» → тап по плитке → `fc-expanded-to-pack` → пусто: `fc-expanded-create-pack` (ExpandedCardV2.tsx:209-213). Своя «Мои карточки» в галерею «Сохранённых» не попадает, поэтому на чистом госте без сохранённых кадр не снять. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-gap-020 | cards-gaps-states.html №20 «Шторка «В какой набор?» — добавлено» | G-C04 | (ok) Из gap-018: тап `fc-expanded-pack-local_pack_dev_demo_work` → тост «Добавлено», шторка закрылась. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-gap-021 | cards-gaps-states.html №21 «Тост — эта карточка уже в наборе» | G-C04 | (ok) Повторить gap-020 с той же карточкой и тем же набором → тост «Эта карточка уже в наборе». | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-gap-022 | cards-gaps-states.html №22 «Тост — не удалось добавить карточку» | — | (none) Тост «Не удалось добавить» — исход `addCardToLocalPack` ≠ added/duplicate (запись в хранилище упала); без dev-сбоя не вызвать. Н-4. | — | тёмная / Спокойно |
| cards-gap-023 | cards-gaps-states.html №23 «Фильтр — выбрано «Все»» | G-C04 | (cond) «Сохранённые» → ⋮ → чип `fc-saved-content-phrase` («Фразы») → ⋮ → `fc-menu-filter` → список с выбранным «Все» (FlashcardsFilterDropdown). На демо в списке будет группа «Прочее: Слова», групп «Уроки» нет. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-gap-024 | cards-gaps-states.html №24 «Фильтр — выбран «Урок 3»» | — | (none) Фильтр «Урок 3» нужен источник карточек `source=lesson, sourceId=3` (selectors.ts:98-106); у демо-карточек источник `word`. Н-3: фикстура `cards=demo` с карточками из уроков (lesson 3). | — | тёмная / Спокойно |
| cards-gap-025 | cards-gaps-states.html №25 «Публикация — отправлено» | — | dev-ссылка DEV_LINKS_R1 (c35e491dd): `cards=demo&plus=on&publish=ok`, демо-набор `local_pack_dev_demo_work` → `fc-pack-menu` → `fc-pack-publish` → «Набор отправлен на публикацию.» Ответ подставляется в памяти, без сети и без записи (publishLocalPack.ts, `isDevPublishOk`). Заявка в прод НЕ уходит. | — | тёмная / Спокойно |
| cards-gap-026 | cards-gaps-states.html №26 «Публикация — суточный лимит» | — | (none) Суточный лимит (3 заявки/сутки) отдаёт сервер после 3 реальных заявок. Н-6. | — | тёмная / Спокойно |
| cards-gap-027 | cards-gaps-states.html №27 «Публикация — не хватает данных» | G-C04 | (ok) «Мои наборы» → долгое нажатие по демо-набору → `fc-my-packs-action-share` («Открыть сообществу») → тост «Для публикации нужны название, описание и достаточное число карточек.» (описание демо пустое → `invalid`, сервер не вызывается; publish_pack_flow.ts:44). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-gap-028 | cards-gaps-states.html №28 «Публикация — не удалось отправить» | G-C04 | (cond) Набор из UI (описание = название, ≥10 карточек) + авиарежим → «Открыть сообществу» → тост «Не удалось отправить набор на публикацию.» (сеть падает до сервера; publishLocalPack.ts:238-243). Сервер не затрагивается. | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-gap-029 | cards-gaps-states.html №29 «Свой набор — минимум 10 карточек» | — | (none) Текст «минимум 10 карточек» — отказ удаления карточки из ОПУБЛИКОВАННОГО набора (packCardRemovalRefusalText); нужен опубликованный набор автора. Н-5. | — | тёмная / Спокойно |
| cards-gap-030 | cards-gaps-states.html №30 «Свой набор — набор на проверке» | — | (none) «Набор на проверке» — отказ того же пути (опубликованный набор). Н-5. | — | тёмная / Спокойно |
| cards-gap-031 | cards-gaps-states.html №31 «Свой набор — нет связи» | — | (none) «Нет связи» — отказ того же пути (опубликованный набор). Н-5. | — | тёмная / Спокойно |
| cards-gap-032 | cards-gaps-states.html №32 «Чужой набор — лайк до добавления» | G-C03 | (cond) До добавления (cards-018): тап `pack-like-<id>` → тост «лайк — после добавления» (CommunityPackSocialBar.tsx:232-289). | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-gap-033 | cards-gaps-states.html №33 «Чужой набор — лайк не прошёл» | G-C03 | (cond) После добавления: авиарежим → тап `pack-like-<id>` → откат сердца + тост «Не получилось поставить лайк» (CommunityPackSocialBar.tsx:259-283); авиарежим выключить. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-gap-034 | cards-gaps-states.html №34 «Каталог — набор ещё не скачан» | G-C04 | (ok) Каталог (демо-кэш) → тап `flashcards-pack-card-dev_demo_community_2` → тост «Набор ещё не скачан» (карточек такого id в облаке нет; emitPackNotDownloadedToast). | гость (новый pm clear) + `cards=demo`, Plus on | тёмная / Спокойно |
| cards-gap-035 | cards-gaps-states.html №35 «Каталог — не сохранился на телефоне» | — | (none) Нужен отказ записи в хранилище (`addCommunityPackToLibrary` ≠ added/already_added; packQuickAdd.ts:27). Н-4. | — | тёмная / Спокойно |
| cards-gap-036 | cards-gaps-states.html №36 «Голос озвучки — выбор» | G-C09 | (cond) `dev_state?next=%2Fflashcards_voice_picker` → список голосов `fc-voice-row-*` (Настройки → «Обучение» → голос). На Android имена голосов свои (образец — iOS «Samantha»). | гость + демо, Plus on (прямые маршруты) | тёмная / Спокойно |
| cards-gap-037 | cards-gaps-states.html №37 «Голос озвучки — загрузка» | — | (none) Транзиент: скелет, пока `getVoicesOnce` читает движок (flashcards_voice_picker.tsx). Н-1. | — | тёмная / Спокойно |
| cards-gap-038 | cards-gaps-states.html №38 «Голос озвучки — список пуст» | G-C09 | (cond) «Только системный (авто)» — если на эмуляторе нет английских TTS-голосов (зависит от образа; проверить в cards-gap-036). | гость + демо, Plus on (прямые маршруты) | тёмная / Спокойно |
| cards-gap-039 | cards-gaps-states.html №39 «В какой набор? — нет наборов, куда можно добавить» | — | (none) Нужны только опубликованные собственные наборы (`onlyPublished`; ExpandedCardV2.tsx:120): публикация идёт через модерацию сервера. Н-5. | — | тёмная / Спокойно |
| cards-v2-053 | cards-v2.html №53 «Набор из видео — добавлен: «В моих наборах» + «Тренировать»» | G-C03 | (dup) То же, что cards-section-031. | гость (тот же), онлайн, Free | тёмная / Спокойно |
| cards-gap-040 | cards-gaps-states.html №40 «Напиши — под флагом energy_mistake_charge (выкл.): пилюля энергии вместо сердец» | G-C07 | (ok) Free + `mode=b`, энергия 3: `next=%2Fflashcards_recall_session%3Fdeck%3Dsaved%26size%3D20%26dir%3Dto_target` → в шапке «Напиши» пилюля энергии вместо сердец (`fc-recall-session-attempts`; EnergyAttemptsHud). | гость + демо, Free (plus=off) | тёмная / Спокойно |

## Нет пути

### 3.1 Нет пути по коду (37)

Идентификаторы: cards-031, cards-039, cards-042, cards-047, cards-048, cards-049, cards-053, cards-062, cards-075, cards-077, cards-section-046, cards-v2-003, cards-v2-037, cards-v2-046, cards-gap-001, cards-gap-002, cards-gap-003, cards-gap-005, cards-gap-006, cards-gap-007, cards-gap-008, cards-gap-009, cards-gap-011, cards-gap-012, cards-gap-014, cards-gap-015, cards-gap-016, cards-gap-017, cards-gap-022, cards-gap-024, cards-gap-026, cards-gap-029, cards-gap-030, cards-gap-031, cards-gap-035, cards-gap-037, cards-gap-039.

Что нужно («Ядро добавит»):

- **Н-1 · транзиентные состояния** (cards-v2-003, cards-031, cards-047, cards-075, cards-gap-003, cards-gap-011, cards-gap-012, cards-gap-037): dev-ссылка `dev_state?hold=hub_loading|saved_loading|catalog_loading|setup_loading|quota_waiting|quota_failed|voices_loading`, которая удерживает состояние загрузки до снятия.
- **Н-2 · ошибки загрузки** (cards-039, cards-077, cards-gap-009): `dev_state?fail=saved_load|setup_decks|recall_load` — искусственный сбой чтения (иначе локальные источники не падают, а авиарежим не помогает).
- **Н-3 · карточки из уроков** (cards-gap-024): в `cards=demo` добавить карточки `source=lesson` с `sourceId` 1–3.
- **Н-4 · отказ записи** (cards-gap-022, cards-gap-035, cards-062): `dev_state?fail=card_write|pack_write`.
- **Н-5 · опубликованный набор автора** (cards-042, cards-049, cards-053, cards-gap-029, -030, -031, cards-gap-039): `dev_state?cards=demo_published` — локальный набор с `listingStatus=published` и чужими откликами (без вызова сервера).
- **Н-6 · суточный лимит публикаций** (cards-gap-026): `dev_state?fail=publish_daily_limit`.
- **Н-7 · пустой каталог при живой сети** (cards-048): `dev_state?catalog=empty`.
- **Н-8 · 50 своих карточек** (cards-v2-046): `dev_state?cards=custom50`.
- **Н-9 · голосовой транскрипт** (cards-section-046, cards-v2-037): `dev_state?speech=correct|wrong` — подстановка распознанного текста.
- **Н-10 · отказ слоя отложенной выдачи** (cards-gap-001, -002, -005, -006): `dev_state?train_gate=fail_blitz|fail_speaking|fail_swipe_prepare|fail_swipe_quota`.
- **Н-11 · карточки без перевода** (cards-gap-007, -008): добавить в фикстуру колоду, где `answerFor` пуст для языка интерфейса.
- **Н-12 · решения модерации** (cards-gap-014…017): `dev_state?moderation=approved|rejected|revision|removed` — локальная постановка окна без чтения почтового ящика продавца.

### 3.2 Нет в коде (дефект образца или кода): 7

Идентификаторы: cards-004, cards-027, cards-060, cards-080, cards-083, cards-v2-004, cards-v2-043.

- cards-004: Блок «Лучшее у сообщества» (SavedTopCommunityPacks, тест-ид `saved-top-community-unavailable`) на хабе А не рисуется — компонент нигде не подключён (грепом: только `pickTopCommunityPacks` в training_setup). Ближайшее: каталог без сети (cards-section-029).
- cards-027: На экране настройки тренировки выбора языка набора нет (TrainingSetupV2.tsx). Кнопка `pack-language-picker` есть в шапке каталога сообщества: «Каталог» → тап `pack-language-picker` (PackLanguagePicker.tsx:105) — ближайший кадр.
- cards-060: В коде нет: `shouldGateCreator` всегда false (creator_access.ts:31-36), `fc-editor-skeleton` показывается только на мгновенное чтение карточки при правке.
- cards-080: «Пока пусто» у «Из видео» нет: пустой каталог → скелет → «Сейчас недоступно» (flashcards_video_packs.tsx:433-466). Ближайший: cards-030.
- cards-083: То же, что cards-004: «Лучшее у сообщества грузится» (`saved-top-pack-loading-*`) на хабе А нет.
- cards-v2-004: В хабе А поиска нет (CardsHubV2.tsx — лупы нет). Поиск живёт в «Сохранённых» (`fc-collection-search`) и каталоге (`flashcards-packs-search`) — снять их кадры (cards-section-006, cards-017).
- cards-v2-043: Кадра «Нет сети» у хаба А в коде нет — при авиарежиме хаб рисуется как обычно (локальные данные). Снять хаб в авиарежиме как «ближайший» (G-C01 п.1).

### 3.3 Путь есть, но реально пишет или шлёт в прод — только с явным «да» владельца: 6

- cards-041: Состояние «идёт отправка» (publishBusy) видно только во время реального вызова `callCommunitySubmitPackForReview` — это заявка в модерацию прода. У демо-наборов описание пустое → отказ `invalid` без сети (gap-027). Реальную отправку — только с явным «да» владельца.
- cards-054: Меню своего отклика (`pack-comment-more-<id>`) — сперва нужно отправить отклик (публичная запись в прод). Только с «да» владельца.
- cards-056: «Отправляется / не отправлено» — композер `pack-comment-send`: отправка публичного отклика (в авиарежиме — «не отправлено»). Только с «да» владельца.
- cards-058: Отправка жалобы на отклик — реальная жалоба модераторам. Только с «да» владельца.
- cards-059: Отправка жалобы на набор (`ReportPackModal` → «Отправить жалобу») — реальная жалоба. Только с «да» владельца.
- cards-gap-025: снимается dev-ссылкой из DEV_LINKS_R1 (`publish=ok` — «отправлено» из памяти, без сети и записи); настоящую заявку в прод для кадра не отправлять.

### 3.4 Только обходом (3)

- cards-082: Тап `video-set-hero` вызывает `Linking.openURL` (VideoPackRow.tsx:75-99): на эмуляторе откроется браузер. Обход: `adb shell pm disable-user --user 0 com.android.chrome` (и youtube) → тост «Видео сейчас не открывается…»; вернуть `pm enable`. Нужен экран VideoSetView (G-C03 п. Б).
- cards-v2-030: Лимит 30/30: dev-переключателя нет (счётчик в AsyncStorage `training_sessions:v1:<stableId>`); обход — запись через `run-as` (G-C08) или 30 реальных стартов Free. Экран: настройка с `fc-training-setup-upgrade` «Безлимит с Plus». Дубль: cards-section-056.
- cards-gap-013: Хаб при исчерпанном лимите: пилюля «0/30», кнопка «Осталось 0 из 30 · до 1 ноября» (приглушена, замок), стопка «Лимит на этот месяц исчерпан / Обновится 1 ноября» (FlashcardsHubScreen.tsx:625-663). Нужен тот же обход, что cards-v2-030.

### 3.5 Условные пути (24)

Идентификаторы: cards-018, cards-019, cards-043, cards-044, cards-045, cards-050, cards-051, cards-052, cards-055, cards-057, cards-072, cards-079, cards-section-018, cards-section-031, cards-section-040, cards-section-041, cards-gap-004, cards-gap-010, cards-gap-023, cards-gap-028, cards-gap-032, cards-gap-033, cards-gap-036, cards-gap-038. Условия — в строке таблицы и в примечаниях групп (реальные данные на проде, распознаватель речи, форма пустой колоды).

## Допущения и вопросы

- Эмулятор — Pixel_8 с сервисами Google (NetInfo/Chrome/TTS/распознаватель); dev-сборка debuggable (нужно для обхода G-C08 через `run-as`). Проверить `adb shell run-as app.phraseman id` до начала.
- Изучаемый язык en, интерфейс ru, тема по умолчанию; в онбординге выбрать English. Если выбран иной язык, демо (`TARGET = en`) не совпадёт с контуром «Сохранённых».
- Free/Plus держим флагом `plus=`; пульт «Фри для всех» по `flashcards` не должен быть включён (иначе лимиты 50/3 пропадут).
- Доступ к проду из эмулятора: каталоги сообщества и роликов реальные (G-C02/G-C03). Если прод пуст, строки G-C03 → «нет пути (нет данных)».
- Вопрос владельцу: можно ли в G-C03 менять публичные счётчики реального набора (+1 добавление, +1 лайк) ради кадров cards-019, cards-050?
- Вопрос владельцу: разрешены ли реальные отправки (заявка набора, отклик, жалобы; разд. 3.3) на тестовом госте — иначе эти 9 строк остаются без кадров.
- Registry-несоответствия, замеченные при сверке: cards-016 (образец №15 — «Жалоба на набор», а не «Пока нет публикаций»), cards-028 (образец №12 — «Мои наборы», список роликов — №18), cards-section-028 (образец №25 — список, состояние «Ничего не нашли» — №26), cards-030 и cards-section-029 (образец №44 нарисован для каталога сообщества, а строка cards-030 — про «Из видео»), cards-027 (в экране настройки тренировки выбора языка набора нет).
- Тексты в коде, расходящиеся с образцами: «Минимум 10 карточек» (в коде с точкой), «Проверь поля» (в коде «Укажи название и описание набора.»), каталог без сети (в коде «Нет сети» без строки «Проверь подключение»).
- Тайминги съёмки: кадр «Блиц — верно» держится 350 мс, «неверно» 700 мс (blitz_logic.ts:33-34) — снимать связкой «тап + screencap» в одной команде; «Правда/ложь», «Напиши» ждут «Дальше» — без гонки.
- Общее время: см. оценки групп (сумма в сообщении).
