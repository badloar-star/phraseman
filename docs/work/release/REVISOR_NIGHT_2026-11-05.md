# Ревизор: ночная репетиция заморозки 04→05.11.2026

Копия: чистая LF-копия коммита (git archive) + git-индекс (`git init; git add -A`), `node_modules` по ссылке. Клон ветки заблокирован хуком (создание веток), обход не использовался. Содержимое копии: ca22467a5 (метка REV в служебных файлах может показывать c156bfe5c: HEAD сдвинулся при старте).

## 1. Типы
| Проверка | Результат |
|---|---|
| tsc приложения | 0 ошибок (d550088b6 и ca22467a5) |
| tsc functions | 0 ошибок |

## 2. Сторожа сборки (правило координатора: все пять зелёные на закоммиченном HEAD до 02:30)
| Сторож | ca22467a5 / HEAD | Примечание |
|---|---|---|
| progress_preservation_owner_lock | зелёный | фикстуру не ослабляли |
| firestore_rules_security | зелёный | |
| pm230_firestore_rules_least_privilege | зелёный | 3 коллекции конкурса в allowlist (3fd4a0068) |
| energy_state_v2 | зелёный | |
| classic_courses_pack | зелёный на 76bab05a6 (59/59) | на ca22467a5 был красный: manifest + одна короткая правка перевода en:02.15 uk; закрыто |
| rank_gates_since_release_cut_guard | зелёный без RELEASE_CUT, красный с RELEASE_CUT=1 | ожидаемо до среза RANK_GATES_NEW_USERS_SINCE_MS |

## 3. Полный jest приложения (ca22467a5): 213 красных наборов из 3382; 273 теста из 27003
Из 213: 144 = gustav_fr_* (артефакт копии), ~69 остальных. Сравнение с рабочим деревом показало, что часть красных в копии зелёные в дереве (не закоммичена правка) или исправлена позже.

### Артефакты копии (не блокеры)
- gustav_fr_* (144 набора): данные `docs/gustav/*` в .gitignore, в git их нет.
- phone_state_native_config_contract, zz_button_measure, spire_oddity_prompt: нужны папки `android/` и др., не в git.
- owner_locks_announcements_2026_10_28: нет файла results.json макета (ENOENT).
- rune_balance_snapshot_preservation_contract: нужен git (в копии с индексом должен проходить).

### Красные и в рабочем дереве (настоящие, ни один не связан с потерей прогресса/монет/крашем)
| Тест | Зона | Суть | Кто чинит |
|---|---|---|---|
| spire_d190_client | Пик (Дизайн/Моменты) | тест ждёт старый текст тура, тексты владельца заменены (53af03065/b40d4694f) | обновить ожидание |
| lesson_exit_sheet_contract | уроки (Ядро) | ждёт строку `void AsyncStorage.setItem(LESSON_KEY, JSON.stringify(np))`; код теперь сохраняет через mergeLessonProgressForSave (58fddbadd), сохранение после каждого ответа на месте (lesson1.tsx:3549–3557). Тест устарел | Ядро: поправить ожидание |
| lesson_1_intro_screen_contract | уроки/курсы | порядок вступительных экранов 1,2,3 изменён данными курса | Теория/Ядро |
| learning_v2_locale_gate | Learning V2 | `isLearningV2OpenForUiLangV1(null)` возвращает true, тест ждёт false (fail-closed). Проверить, намеренно ли (заморозка V2 теперь через LEARNING_V2_HIDDEN/эксплицитную кнопку) | Learning V2/Ядро |
| i18n_missing_en_fallback, english_ui_enable_preflight | i18n | 3135 словарей ru+uk без `en` (V2 chapter_exam_v2_*), база была 0. Риск краша 27.08 при английском интерфейсе, если V2-экзамен откроется; V2 скрыт в релизе | Learning V2/Теория: добавить en или обновить базу осознанно |
| owner_locks_exam_episode_words (l23_c1) | V2 контент | незнакомые слова в экзамене главы | Теория |
| paywall_c_native_render | пейвол | «Cannot use import statement outside a module» (ESM-зависимость не трансформируется jest), набор не запускается | Вход/Paywall |
| flashcards_speaking_quota_unavailable_behavior, flashcards_recall_pending_start_behavior, flashcards_training_target_language_behavior | Карточки | падения мока RN (`Platform.OS`/`Value` undefined) до проверок логики | Карточки |

### Зелёные в рабочем дереве, красные в закоммиченной копии (нужен коммит)
- energy_state_v2, lesson1_energy_gate_close_contract, spire_no_energy_sheet_contract: правки тестов были незакоммичены; на HEAD энергия зелёная.
- lessons_tabs_memory, lesson_first_try_counts, lesson_was_perfect_first_try, flashcard_training_round_claim, flashcard_training_pending_grant_reuse_skips_quota: в дереве зелёные.

## 4. Известные замечания 🟡 (не блокеры сборки)
- contest_votes читает любой вошедший, в документе виден userId голосующего (a82a3b220, уже в бою). Осознанно, сузить read в следующем обновлении. Запись в KNOWN_ISSUES переносит Моменты.
- Кнопка комментариев в сцене набора — текстовая ссылка без значка; «Создать набор» во вкладке «Сообщество» (embedded) не возвращён на момент 20:20.
- Тур Пика: карточка могла закрывать подсвеченные строки на малых экранах (853c4e389 правит), проверить кадром 375×667, fontScale 1.3.
- Новичок мог пропустить приветствие, если время создания аккаунта ещё не известно (peekCurrentAccountCreatedAtMs null).
- Клиентские ключи прогресса es/de/it считаются серверными: до выкладки progressSubmitEvent и firestore.rules прогресс этих курсов в облако не уйдёт (деплой 02:00 до сборки).

## 5. Повторы
- 00:50: classic_courses_pack после финального коммита Теории.
- 01:30: заморозка (tsc app + functions, jest, node --test, функции jest).
- 02:10: пять сторожей на закоммиченном HEAD.
