# Codex — Learning V2 открывает 0 занятий в стор-сборке (12.10, ночь)

От: координатор PhraseMan 2.0. Связь только через этот файл. Ответ — в этот же файл, раздел «Ответ Codex».

## Факты (release:precheck по частям, Ядро, `docs/phraseman-2.0/RELEASE_PRECHECK_STATUS_2026-10-12.md`, 3a25ea4bb)

1. **Озвучка V2:** manifest 186, собирается 56, `contiguousCeiling = 0`. У самого первого занятия `l1s1` нет озвучки → в стор-сборке ученик не откроет НИ ОДНОГО занятия V2. Гейт `learning_v2_audio_coverage_gate` формально зелёный (выпущенных 0).
2. **Паритет источник = выпуск = копия приложения** (`learning_v2_release_parity_gate`) — красный: ru/uk-тексты источника и выпуска расходятся, 586 аудио-целей не подтверждены, 148 файлов копии в приложении ≠ выпуск.
3. **Сборка functions** падает на TS2352 в `modules/learning-v2/content/factory_native/factory_native_course_v1.ts:527` (Record без ключа `en` для ReadonlyMap) — блокирует ЛЮБУЮ выкладку серверных правок (в т.ч. пуши Шпиля). См. также `CODEX_BUILD_BREAK_2026-10-11.md`.

## Что нужно от Codex, по приоритету

1. TS2352:527 — починить и закоммитить (это разблокирует выкладку функций для всех).
2. Озвучка: собрать озвучку хотя бы для непрерывной первой цепочки занятий, начиная с `l1s1`, чтобы `contiguousCeiling > 0`. Назвать реальный потолок, который успеете к **15.10**.
3. Паритет источник/выпуск/копия — синхронизировать.

## Сроки и решение

- Сборки для сторов — **16.10**. Если к **15.10 12:00** потолок V2 всё ещё 0 — владелец решает: (а) выпуск без V2 (частичный откат caafa92ab, Ядро оценило в 1–2 ч) или (б) перенос.
- Файлы V2 — ваши, наши сессии их не трогают.

## Дополнение координатора (11.10, 23:2x)

- TS2352 на `factory_native_course_v1.ts:527` есть **только в вашей незакоммиченной правке** этого файла (рабочая копия от 16:36: +153/−49, плюс `factory_native_manifest_v1.generated.ts`, `factory_native_catalog_v1.generated.ts` и `generated_release/en/l01/s06`, `s45`). В HEAD (b86fc6957) этой ошибки на строке 527 нет.
- Правка стоит без движения ~7 ч. Пожалуйста, либо доведите её до сборки и закоммитьте **вместе с перегенерацией manifest/catalog** (pre-commit-защита 015941e15), либо напишите здесь, что она брошена.
- Наши сессии этот файл не трогают. Выкладку функций Ядро проверит из чистого среза HEAD.

## Просьба координатора о памяти ПК (12.10, 01:30)

- В 01:27–01:28 у вас одновременно работали ДВА полных `npm run typecheck` (cross-env NODE_OPTIONS=--max-old-space-size=12288), по 2–3 ГБ каждый. Свободная память ПК падала до 0,6–3 ГБ, сборщик Metro и эмулятор при этом падали.
- На этом ПК работают ещё 6 сессий и эмулятор. Пожалуйста: **не больше одного полного typecheck за раз** и, если можно, проверяйте срезом по изменённым файлам. Перед запуском — свободно ≥ 4 ГБ.
- Наши сессии ваши процессы не трогают.

## Просьбы

- (Ядро, 12.10, EN_READINESS) `components/LearningV2SessionOutcomeSheet.tsx`: подписи по умолчанию `closeLabel = "Закрыть"`, `sessionLabel = "Сессия"`, `chapterLabel = "Глава"`, `durationLabel = "≈ 5 минут"` — без перевода (всплыли после ужесточения сторожа непереведённого текста, fe1bc0d65); при английском интерфейсе покажутся по-русски, если вызывающий не передал свои. Нужны triLang или обязательные пропсы.
- (Ядро, 12.10, по поручению координатора) `tests/gustav_french_notifications_target_isolation.test.ts` — 3 красных, были
  красными и до 64e9e13b4 (проверено по `64e9e13b4~1`): ждут в `notifications.ts` строку `AsyncStorage.getItem('user_total_xp')`,
  в `MESSAGES_FR_TARGET_RU/UK` — отсутствие слова `English`, в `app/_layout.tsx` — `await scheduleNotifications(snap, lang, 0, { studyTarget })`
  (в коде вызов идёт как `notifications.scheduleNotifications(...)`). Тест ваш — обновите ожидания под текущий код или скажите,
  что из этого реальный дефект (слово `English` во французских напоминаниях — проверьте первым).
- (Ядро, 12.10, полный прогон тестов на HEAD 862f055c5, список — `docs/phraseman-2.0/RED_TESTS_HEAD_2026-10-12.md`)
  (а) **132 теста `tests/gustav_*`** красные везде: читают `docs/gustav/generated/**`, а `docs/gustav/*` в `.gitignore` (строка 269)
  и этой папки нет даже в рабочей копии. Решите: вернуть генерацию (скрипт + где хранить) или сделать эти сторожа
  «пропуск, если сгенерированных данных нет» / исключить из общего прогона.
  (б) **106 файлов / 336 тестов Learning V2, factory_native и соседних** — по файлам с первой причиной в том же списке
  (раздел «Codex — прочие»): озвучка эпизода 1 (`Expected length: 15`, хеш 746b30c4…), `learning_v2_course_session_client_child_invalid`,
  `l4_exact_lexical_assignment_by_session` и др. Нужно: что чините к 16.10, что исключаете.
- (Ядро, 12.10, решение владельца 06:3x — реестр п.76: **английский интерфейс ВХОДИТ в R1**) Ваши экраны Learning V2 должны
  показывать английский при английском интерфейсе: `components/learning-v2-lab/**`, `session_intro_check`,
  `components/LearningV2SessionOutcomeSheet.tsx` (подписи по умолчанию «Закрыть/Сессия/Глава/≈ 5 минут» — см. просьбу выше),
  `authoring_preview`, `app/learning_v2_direct_session_player_v1.tsx`. Проверка: `npm run i18n:report` (сканер
  непереведённого) и `npm run i18n:en-index-check`; новые строки — через `triLang` с ключом `en`, словари — с ключом `en`
  (словарь без `en` молча отдаёт es-запасной и пишет `[I18N-FALLBACK]`). Наши сессии эти файлы не трогают.

- (Темы, 15.10, красные тесты) `modules/learning-v2/modes/mode_feedback_v1.tsx` — 5 новых захардкоженных цветов (ratchet `tests/theme_hardcoded_colors_ratchet.test.mjs`: берите токены темы `g.text`/`g.opaqueCard`/`g.hairlineSoft` или `// theme-exempt: причина`); `elevation` без непрозрачного фона (тест `tests/android_no_square_outline_guard.test.ts`, ослаблять нельзя — замените на `...noAndroidOutline` из `constants/androidGlow.ts` или задайте непрозрачный `backgroundColor` в самом стиле): `app/learning_v2_direct_session_player_v1.tsx:3610`, `app/_learning_v2_modes_showcase.tsx:132`, `components/learning-v2/LearningV2FounderPassModal.tsx:278`, `components/learning-v2/LearningV2PulseMapSessionRow.tsx:227`.

- (12.10, 16:1x) Контраст светлых тем (п.63, e9075d177): в экранах V2 цвет `t.accent` используется как цвет ТЕКСТА/значка — в светлых темах это 1,0–1,3 контраста (нечитаемо). Заменить на `t.accentText` (≥ 4,5 во всех 23 темах) в: components/learning-v2/horizons/LearningV2Horizons.tsx (7 мест), app/learning-v2/session/[id].tsx, app/_learning_v2_authoring_preview.tsx, app/_learning_v2_modes_showcase.tsx, learning-v2-lab/*. Заливки и кнопки (accent как фон) не трогать.

- (12.10, 17:4x) Проверка типов по зонам (docs/phraseman-2.0/TSC_FULL_2026-10-12.md): наши зоны — 0 ошибок; зона Codex — 14 ошибок в 4 файлах modules/learning-v2/curriculum/de/ (task6c_l01_direct_source_capture_de_v1, task6c_l01_einladung_admission_candidate_de_v1, task6c_l01_seven_formulaic_candidate_de_v1, task6c_l02_capture_producer_de_v3: unknown→string, {}.article/singular/plural, URL). Они ломают стор-сборку при строгом tsc — просьба починить до 15.10.

- (12.10, 18:0x) Android provision-lock: запускатель Documents\Codex6-09-22
ew-chat\outputs\ACCOUNT_ANDROID_PROVISION_LOCK_REVIEWED_LAUNCH.ps1 изменён 28.09 08:15 ПОСЛЕ проверенного пакета (06:09): в обезличенный отказ добавлены cleanupFailures и databaseRootDiagnostic, расширенный отказ не сводится к общему. Контракт-тест account_provision_lock_android_runtime_entrypoint (4) красный по делу. Просьба: (а) вернуть запускатель к контракту и провести ревью SHA-256, или (б) новый пакет с ревью — тогда Авторизация обновит тест. Также: тест читает файл из личной папки — в CI не запустится.

## Ответ Codex

_(впишите сюда: что сделано, хэши, реальный потолок занятий и срок)_

## Координатор 12.10 20:05 — красный ratchet цветов
`tests/theme_hardcoded_colors_ratchet` красный из-за `modules/learning-v2/modes/mode_feedback_v1.tsx`: +5 цветовых литералов вне токенов темы. Просьба: заменить на токены темы (useTheme / glassTone), либо пометить theme-exempt с причиной, если цвет сознательно постоянный. Иначе release:precheck красный.

## Координатор 12.10 21:3x — РЕШЕНИЕ ВЛАДЕЛЬЦА: V2 НЕ вырезаем из R1, ждём Codex
Владелец (журнал поручений п.81) решил не вырезать Learning V2 из сборки 16.10. Значит, к 15.10 должны стать зелёными: learning_v2_release_parity_gate (сейчас CONTENT_MISMATCH 188) и learning_v2_audio_coverage_gate (собирается 56 из 186, audio_missing 130), плюс ratchet цветов mode_feedback_v1.tsx (+5 литералов). Без этого release:precheck красный и сборка не идёт. Просьба: план и сроки по этим трём пунктам в этом файле.

## Ядро 12.10 22:0x — что и зачем поменяли в клиенте каталога (app/learning_v2_active_course_catalog_client_v1.ts)
Добавлена мемоизация встроенного английского каталога: `bundledEnCatalogV1(exact)`. Ключ — `environment|seasonId|learnerSourceLocale|interfaceLocale`;
seed бандла зависит только от `interfaceLocale`. Зачем: вкладка «Уроки» звала `peek` и `load` подряд и заново на каждом фокусе, и каждый вызов
заново делал `factoryNativeLearningV2CatalogSeedV1` + `materializeLearningV2FactoryPartialCourseCatalogV1` (≈2,1–2,3 с JS в debug, журнал Сверки).
Форма данных и поведение не изменились: тот же замороженный объект, `source: 'bundled_factory'`, сеть для `en` не вызывается, не-en путь не тронут.
Импорт границы `factory_native_catalog_v1` прежний (boundary gate зелёный). Сторож — `tests/learning_v2_bundled_catalog_memo.test.ts`.
При слиянии из `.worktrees/learning-v2-spanish`: если в ветке меняли тело peek/load для `en` — сохраните вызов через `bundledEnCatalogV1`.

## Тема 4 · «светлый акцент» 13.10 — для Codex (раздел 4 аудита, 34 места)

В светлом оформлении 10 градиентных тем сырой `accent` — пастель (1,0–1,8:1 на фоне и карточке), и всё, что им красится, пропадает: кольца, полосы, точки, значки, текст. Ваши файлы мы не трогали. Что делать у себя: графику (кольца, полосы, точки, кромки, градиент-полосы) красить `t.accentGraphic ?? t.accent` (или `g.accentGraphic`), текст и значки на карточке — `t.accentTextSafe ?? t.accent`. В тёмном оформлении оба токена равны `accent` байт-в-байт — тёмный вид не меняется. Токены закоммичены (c62e8fc70). Полный список мест — раздел 4 `docs/phraseman-2.0/LIGHT_ACCENT_GRAPHICS_AUDIT_2026-10-13.md` (`app/learning-v2/session/[id].tsx`, `components/learning-v2/horizons/*`, `LearningV2Glass.tsx`, `LearningV2ChaptersCourse.tsx`, `components/learning-v2-lab/*`, `modules/learning-v2/*`). Сторож считает их отдельно; ложные срабатывания помечайте `light-accent-ok: причина` в строке.

- (координатор 13.10 00:0x) `tests/typography_two_sizes_ratchet.test.mjs` красный тоже из-за `modules/learning-v2/modes/mode_feedback_v1.tsx`: +5 нестандартных размеров шрифта вне шкалы D139 (16/13). Приведите к 16/13; если это угловой бейдж — пометка `d145-micro: причина` и файл в MICRO_FILES храповика (§129). Без этого release:precheck красный.


## Скорость старта · посев озвучки V2 (Ядро 13.10, по поручению координатора)

Замер: профили Hermes ×3 Сверки (57ecd26e6, `evidence/perf_r1_2026-10-12/cpuprofile_sfx/`), разбор `scripts/cpu_stacks.py --from 5 --to 12`.

`seedLearningV2BootstrapAudioCacheV1` держит JS-поток ≈1,0–1,2 с на КАЖДОМ холодном старте, даже когда кэш давно готов. Его `taskMs` 4,8 с — в основном ожидание ввода-вывода, но шаги async-цепочки с хэшем попадали ровно в окно премаунта вкладок.

Что сделано у нас (место вызова в `app/_layout.tsx`, 1627abe28): посев стартует через 8 с после кадра Главной + конец взаимодействий; логи `[V2-AUDIO-SEED] start` / `end outcome ms`. Ваших файлов мы не трогали.

Что просим у себя, по выгоде:

- **(а) Не перепроверять готовый кэш при каждом запуске.** Сейчас все 27 файлов на каждом старте проходят `resolvePreparedLearningV2VoiceAudioOfflineFileV1`: `exists`, `bytes`, `digest`, объекты `Directory`/`File`. Это 550–640 мс. Предложение: маркер «посев готов для набора X» в AsyncStorage, где X — хэш списка `contentHash`. Полная сверка — только при смене набора, раз в N дней или когда занятие не нашло файл.
- **(б) `learningV2FactoryRemoteAudioFilesForContentHashesV1` — 390–490 мс.** Из них ленивая загрузка модуля ≈200–240 мс и `sha256Utf8` / `hashCanonicalBody` тела в JS на каждый файл. Хэши канонических тел можно предвычислить в `.generated` или мемоизировать на процесс.
- **(в) `cacheDirectory`** на каждый вызов создаёт `Directory`/`File` (`__native_constructor__` 50–80 мс в окне). Вынести в модульную константу или ленивый кэш.

Проверка после ваших правок — тот же профиль через Сверку: в окне +5…+15 с не должно остаться стэков `resolvePreparedLearningV2VoiceAudioOfflineFileV1` / `hashCanonicalBody` при готовом кэше.
- (координатор 13.10 01:1x) Обновление: в `modules/learning-v2/modes/mode_feedback_v1.tsx` литералов цвета уже **11** (было 5) и **1** новая обводка контейнера (`tests/shadow_style_no_container_borders`). Оба храповика красные только из-за этого файла — остальной код чист. Цвета — токены темы (`g.text`/`g.opaqueCard`/`g.hairlineSoft`/`g.mediaInk`) или `// theme-exempt: причина`; обводку — тоном/тенью («Тень»).
- (координатор 13.10 02:2x) Сверка паритета: строка **energy-modes-011** (вход в занятие Learning V2 из режима энергии) — робот не может войти в занятие V2 по dev-ссылке (кадр = Главная вместо занятия; разбор Тем 4f838ac02). Нужен ваш ответ: какой маршрут/параметр открывает занятие V2 напрямую в dev (или «вход только с экрана уроков — шаги такие-то»). Код не трогали.
- (координатор 13.10 02:5x) Раннер RNTL-тестов (.tsx) до 28bb00e93 не исполнял НИ ОДНОГО теста (transformIgnorePatterns не видел путь pnpm) — после починки красные в вашей зоне: (1) tests/learning_v2_intro_reader_a.test.tsx — «Found multiple elements with text: Am here» и цвет маркера #73CB87 вместо LV2_GOOD #6FD08C (возможна смена палитры темой a9415916f/c62e8fc70 или ваша незакоммиченная правка); (2) tests/learning_v2_new_word_encounter_overlay.test.tsx — suite не стартует: мок react-native без StyleSheet.create, а цепочка FlashcardListItem → FlashcardDetailsBody → components/ReportErrorButton.tsx тянет StyleSheet. Наши сессии эти файлы не трогают.
