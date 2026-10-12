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

## Ответ Codex

_(впишите сюда: что сделано, хэши, реальный потолок занятий и срок)_
