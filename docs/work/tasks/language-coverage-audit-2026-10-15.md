# Аудит покрытия языков — все списки, выборы и фильтры языка в приложении (только чтение)

Governance-ID: TG-D38559DE52FC
Status: Done (аудит); правки — у владельцев экранов
Owner: сессия «Специалист по переводам» (координатор 15.10, СРОЧНО, слово владельца «ВСЕ ЯЗЫКИ ДОЛЖНЫ БЫТЬ И ДОЛЖНЫ БЫТЬ ДОСТУПНЫ»)
Related epic/enabler: D188 (5 языков обучения открыты), D129/D130/D132/D163 (таблица готовности разделов)

## Outcome

Полная карта мест, где показывается список/выбор/фильтр языка: какие языки реально видны, откуда список, чего не хватает,
просачивается ли чужой язык. Отдельно — запрещённые владельцем фильтры «только языки, где есть данные».

## Scope

In scope: клиент (app/, components/, modules/, constants/, hooks/). Только чтение кода. Out of scope: данные Firestore
(нужен взгляд в базу — п. 2 «итальянский набор при FR»), сервер, правки (раздаёт координатор).

## Architecture

Аудит, без изменений кода. Канон: `app/learning_language_contour.ts:3` LEARNING_LANGUAGE_TARGETS = en, es, fr, de, it;
`app/flashcards/pack_languages.ts` PACK_LANGUAGES = en, fr, de, es, it; интерфейс — 9 языков (`constants/i18n.ts`).

## Security and privacy

Не применимо.

## Technical debt

- Список языков диалогов (en/es/fr/de) скопирован ~15 раз — Contain: свести к `app/dialogue_language_registry.ts` / таблице готовности; владелец — Ядро.
- Циклы миграций/счётчиков только по en/fr — Accept temporarily: не видны человеку, но пропускают es/de/it; владелец — Ядро, после выпуска.

## Verification

Grep по массивам/константам языков + чтение файлов карточек, сообщества, видео, диалогов, фразы дня, Пика, онбординга, настроек;
ключевые находки (1, 3, 4) перепроверены вручную по строкам кода.

## Rollback

Не применимо (документ).

---

## 🔴 Топ проблем (по важности)

| # | Где | Что видит человек | Почему | Кто чинит |
|---|---|---|---|---|
| 1 | `app/flashcards_packs.tsx:415–447` (Сообщество → Наборы, чип языка) | Только языки, на которых уже есть наборы (сейчас EN/FR/ES); при < 2 языков чип исчезает | `catalogLanguages = PACK_LANGUAGES.filter(code => present.has(code))`, `languageChipVisible = length >= 2` — ЗАПРЕЩЁННЫЙ фильтр «только с данными» | Темы (в работе; файл сейчас изменён в рабочем дереве) — передать в `PackLanguagePicker` все `PACK_LANGUAGES` и показывать чип всегда |
| 2 | Набор «Думай на итальянском» при выбранном FR | Итальянский набор в французской ленте | В коде набора нет — это данные. Фильтр `communityCatalogFilter.ts:21` пропускает при любом языке наборы `packLanguage = 'none'` (D127). Причины по убыванию: у набора `packLanguage='none'`; или `'fr'` (ошибка данных); или поля нет и `studyTarget='fr'` (`communityFirestore.ts:72`) | Ядро/админка — посмотреть документ набора; поправить поле |
| 3 | `hooks/use-flashcards.ts:268` `loadAllSavedFlashcards`, также циклы `:356`, `:382` | **Сохранённые карточки ES/DE/IT не видны** в «Сохранённых», тренировке, поиске | Сохранение пишет в хранилище своего языка (`cacheTarget` → es/de/it, `:539`), а чтение — только `['en','fr']` | Ядро/Карточки — читать все `STUDY_TARGETS`; починка/слияние — по всем 5 |
| 4 | `app/flashcards/SavedTopCommunityPacks.tsx:48–63`, вызов `app/flashcards_training_setup.tsx:233, 430` | В пустом состоянии тренировки предлагаются наборы ЧУЖОГО языка (итальянский при FR) | `pickTopCommunityPacks(catalog)` без фильтра по языку | Дизайн/Карточки — `filterPacksByLanguage(catalog, язык тренировки)` |
| 5 | `app/daily_phrase_quest.ts:40–52` | Квест «фраза дня» для итальянского молчит (null) | switch только en/es/fr/de; таблица готовности открывает фразу дня для it (D163) | Ядро — добавить `it` |
| 6 | `app/flashcards/tts_voices.ts:45–56`; `app/flashcards_voice_picker.tsx:67, 99` | Для fr/de/it может звучать английский голос; выбор голоса — только английские | В цепочках голосов только en/ru/uk/es; `ttsLangFromLocale` сводит fr/de/it к en | Ядро/Карточки — цепочки fr/de/it, выбор голоса по языку набора |
| 7 | `app/config.ts:249` + `constants/i18n.ts:64, 115` | В сторе 8 языков интерфейса — без English | `ENGLISH_UI_LOCALE_ENABLED = false` (после падения 27.08) | Решение владельца — включать ли en к выпуску |
| 8 | `app/spire/spire_ui_lang_gate.ts:9`; `app/notifications.ts:459–466` | Пик виден только при интерфейсе ru/uk; пуши без en | Жёсткие списки «первый выпуск» | Решение владельца |
| 9 | `app/flashcards/fc_lang_filter.ts:107–124` (чип языка тренировки) | Раньше — только языки с колодами | **Уже исправляется** (в рабочем дереве: «все готовые языки, count 0 — честное пусто») | Проверить, что закоммичено |

## Таблица всех мест

| # | Место | Какие языки | Откуда список | Вердикт |
|---|---|---|---|---|
| 1 | Настройки — язык обучения: `components/settings/StudyLanguagePicker.tsx`, `StudyLanguageSheet.tsx`, `study_language_sheet_order.ts:7`, `app/settings_language.tsx:24` | en, es, fr, de, it | константа | ✅ (тот же выбор — в пилюле Видео `app/lingman_videos.tsx:780`) |
| 2 | Онбординг — язык обучения: `components/CleanOnboarding.tsx:306–312`, фильтр `:3956` | fr, es, en, de, it | константа, фильтр `isStudyTargetAllowedForUi` пропускает все 5 (D188) | ✅ |
| 3 | Язык интерфейса: `constants/i18n.ts:29–39, 115` | стор: 8 (без en); dev: 9 | флаг `ENGLISH_UI_LOCALE_ENABLED` | ⚠️ топ-7 |
| 4 | Сообщество → Наборы, чип: `app/flashcards_packs.tsx:415–447` | только языки с наборами | фильтр по данным | 🔴 топ-1 |
| 5 | Тренировка карточек, чип: `TrainingSetupV2.tsx:134–160`, `flashcards_training_setup.tsx:470`, `fc_lang_filter.ts:107` | все готовые (после правки в рабочем дереве) | таблица готовности | ⏳ топ-9 |
| 6 | «Из видео» — наборы: `app/flashcards_video_packs.tsx:641` | все 5 | `PACK_LANGUAGES` | ✅ |
| 7 | Мои наборы `MyPacksV2.tsx:223`, шапки коллекций `CollectionHeader.tsx:338`, `CollectionHeaderV2.tsx:280` | все 5 | `PACK_LANGUAGES` | ✅ |
| 8 | Создание набора `app/community_pack_create.tsx:1419` | 5 + «Без языка» | `PACK_LANGUAGE_CHOICES` | ✅ |
| 9 | Лента видео по языку обучения: `app/video_language_contour.ts:15–26`, `home_video_rail_source.ts:109`, `lingman_youtube.ts:446` | канал языка обучения; нет канала — раздел скрыт / «готовим» | данные манифеста YouTube (D132) | ⚠️ не выбор, но язык «пропадает» без канала |
| 10 | Диалоги: `app/dialogue_language_registry.ts:9` + ~15 копий | en, es, fr, de | жёсткие Set, дублируют таблицу готовности (it скрыт D130) | ⚠️ решение D130; риск расхождения копий |
| 11 | Фраза дня — квест: `app/daily_phrase_quest.ts:40–52` | en, es, fr, de | switch | 🔴 топ-5 (нет it) |
| 12 | Пик: `app/spire/spire_ui_lang_gate.ts:9` (интерфейс), `components/spire/spire_home_week.ts:14` (языки обучения) | интерфейс ru/uk; обучение — все 5 | константы | ⚠️ топ-8 |
| 13 | Уведомления: `app/notifications.ts:459–466` | 8 языков интерфейса (en → ru) | константа + флаг en | ⚠️ топ-8 |
| 14 | Экзамен/тест уровня: `app/exam_target_gate.ts:20–39` | en, fr; таблица скрывает экзамен для es/de/it | константа + таблица (D129) | ⚠️ решение D129 |
| 15 | Курс Learning V2, уроки | только en (таблица: lessons/learning_v2 hidden для es/fr/de/it, D129) | таблица готовности | ⚠️ решение D129 — сверить с D188 «все языки доступны» |
| 16 | Озвучка карточек: `app/flashcards/tts_voices.ts:45–56`; выбор голоса `flashcards_voice_picker.tsx:67, 99` | цепочки en/ru/uk/es; выбор — только en | константы | 🔴 топ-6 |
| 17 | Озвучка карточек (аудио): `app/flashcards/card_tts_audio.ts:15` | все 5 | константа | ✅ |
| 18 | Dev-кнопка языка: `app/study_target_lang_dev.ts:33–36` | ru/uk: все 5; иначе только en | константа (только dev) | ⚠️ противоречит D188, только dev |
| 19 | Миграции/счётчики: `content_delivery_migration.ts:14`, `legacy_free_lesson_access.ts:31`, `paywall_progress_mirror.ts:23`, `progress_events_client.ts:88`, `mistake_practice_legacy_cleanup.ts:20`, `pack_trial_gift.ts:74`, `soft_upsell_core.ts:19`, `mistake_practice_answer_journal.ts:18` | en, fr | константы | ⚠️ не выбор; es/de/it пропускаются |
| 20 | Сохранённые карточки: `hooks/use-flashcards.ts:268, 356, 382` | читает en, fr | константа | 🔴 топ-3 |

## Фильтрация контента наборов по языку

- Загрузка каталога `communityFirestore.ts:445–480`: по одному запросу на каждый из `PACK_LANGUAGE_CHOICES` (6 × limit 40) + общий limit 80, кэш 6 ч. ✅
- Фильтр экранов `communityCatalogFilter.ts:21` — по `packLanguage ?? studyTarget`; «Без языка» видны при любом языке (D127). Используется в `FlashcardsCategoryHub.tsx:504`, `flashcards_video_packs.tsx:370`, `flashcards_my_packs.tsx:450`. ✅
- 🟡 Несогласованность: корзины каталога (`communityFirestore.ts:471`) и чип (`flashcards_packs.tsx:422`) берут `normalizePackLanguage(pack.packLanguage)` без запасного `studyTarget`; `normalizePackLanguage` превращает пустое в `'en'`. Набор без поля `packLanguage` в корзине — «английский», в фильтре — по `studyTarget`.
- 🟡 Поиск `cards_search_sources.ts:59` — по всему каталогу без языка (вероятно, задумано); счётчик `FlashcardsHubScreen.tsx:247` — все наборы без фильтра (может расходиться со списком).
- 🟡 Старые документы без `packLanguage` (`communityFirestore.ts:81–96`) отбрасываются, если их `studyTarget` ≠ текущего языка обучения — даже при выбранном в чипе их языке.

## Фильтры «только языки, где есть данные» (запрещено владельцем)

1. `app/flashcards_packs.tsx:415–427` — 🔴 есть, не исправлен в HEAD (Темы в работе).
2. `app/flashcards/fc_lang_filter.ts:107–124` — был; в рабочем дереве уже исправлен.
3. Лента видео (`video_language_contour.ts`) — раздел скрывается без канала: не выбор языка, но эффект тот же («язык пропал»). Решение D132 — показать владельцу.
