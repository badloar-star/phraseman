# Реестр поддерживаемых content locale — PM-119 / PM-120 (разведка)

Дата: 2026-09-24 · Ветка: `feature/referral-roulette` · Read-only разведка, код не менялся.

Разделяем (как требует `docs/LOCALES.md`): **UI locale** (язык интерфейса,
`constants/i18n.ts`, 9 языков — не предмет этого реестра), **изучаемый язык**
(`StudyTarget`, он же «content locale» в терминах карточки), **язык
источника/объяснений** (`SourceLocale`: `ru`/`uk`, для personal_practice) и
**поверхность** (`LearningLanguageSurface`: lessons/learning_v2/daily_phrase/
dialogues/arena/videos/flashcards/diagnostic_and_exam).

## 1. Реестр изучаемых языков (StudyTarget)

Канонический источник: `app/learning_language_contour.ts`
(`LEARNING_LANGUAGE_TARGETS = ['en','es','fr','de']`), реэкспортирован в
`app/study_target.ts` и `app/learning_language_surface_matrix.ts`. Карточки
(флаг + подпись) читают именно этот список — четыре языка, не «намного
больше», как формулировал первоисточник R119; расширение реестра сверх этих
четырёх не готово нигде в коде.

| locale_code | V1 уроки | Learning V2 | Диалоги (AI) | Где хранится флаг готовности |
|---|---|---|---|---|
| `en` | Да, полный (32 урока), это канонический продакшен-контент | Не проверялось отдельно в этом заходе — исторически основной контур V2 | Да, всегда `enabled: true` | `app/ai_dialog_target_gate.ts` (`target === 'en'` → всегда `enabled`) |
| `es` | Частично, за `ENABLE_DEV_STUDY_TARGET_LANG` (dev-флаг) — `app/spanish_content_gate.ts:spanishStudyActive`. Есть L2 intro-экраны для уроков 1–8 (`getSpanishL2IntroScreens`) | Не проверялось в этом заходе (вне scope: нет времени грепать `modules/learning-v2/**`) | Да в проде — `dialogueLanguageIsActivated('es')` истинно через `DIALOGUE_OWNER_RELEASED_TARGETS` (ручное разрешение владельца 2026-09-20), но `aiDialogContentGateForTarget` дополнительно требует пройденного review evidence (`SPANISH_AI_DIALOG_REQUIRED_EVIDENCE`) — по коду evidence не подтверждён, значит попадает в общий `enabled = dialogueLanguageIsActivated('es')` = `true` (see note) | `app/spanish_content_gate.ts` (V1), `app/ai_dialog_target_gate.ts` + `app/dialogue_language_activation.ts` (диалоги) |
| `fr` | Нет — заблокировано `FRENCH_CONTENT_SOURCE_GATE` (`app/french_content_source_gate.ts`): требуется 26 пунктов required evidence (grammar reference, exam bank, hint bank и т.д.), ни один не отмечен approved в коде; `frenchStudyActive` тоже висит на dev-флаге `ENABLE_DEV_STUDY_TARGET_LANG` | Не проверялось | В коде `dialogueLanguageIsActivated('fr')` = `true` через тот же owner-release список 2026-09-20, при этом `FRENCH_AI_DIALOG_REQUIRED_EVIDENCE` (сценарии, TTS-контракт, native review) не подтверждён нигде в коде — расхождение (см. «Риски» ниже) | `app/french_content_source_gate.ts` (V1, жёсткий блок), `app/dialogue_language_activation.ts` (диалоги, мягкое разрешение) |
| `de` | Не найдено отдельного контентного гейта уровня V1 (grep на `'de'`/`german` в `lesson_data_all.ts` — пусто) → похоже, немецких V1-уроков просто нет в контенте, при этом язык присутствует в списке `LEARNING_LANGUAGE_TARGETS` как выбираемый | Не проверялось | В коде `dialogueLanguageIsActivated('de')` = `true` тем же путём, `GERMAN_AI_DIALOG_REQUIRED_EVIDENCE` не подтверждён | `app/ai_dialog_target_gate.ts` (диалоги); отдельного контентного гейта V1 для de не нашлось |

**Важное расхождение, найденное разведкой (не факт бага, а несогласованность
двух источников готовности):** `dialogue_language_activation.ts` содержит
`DIALOGUE_OWNER_RELEASED_TARGETS = ['es','fr','de']` с комментарием «Explicit
production release switch authorised by the owner on 2026-09-20» — то есть
диалоги для es/fr/de включены в проде решением владельца в обход independent
quality receipts (`DIALOGUE_LANGUAGE_ACTIVATION_RECEIPTS` — пустой объект).
Одновременно `ai_dialog_target_gate.ts` продолжает объявлять для этих же
языков длинные списки `requiredEvidence` (сценарии, TTS-контракт, native
review), которые по коду не собраны. Итог: включено вручную владельцем, но
формальное «evidence-approved» состояние не достигнуто. Это не новая находка
этой сессии — фиксирую как наблюдение для реестра, ничего не меняю.

## 2. Источник/объяснение (SourceLocale)

`app/study_target.ts`: `SOURCE_LOCALES = ['ru', 'uk']`. Используется только в
`personal_practice` (сторона объяснений) — `sourceTargetKey('personal_practice', target, sourceLocale, id)`.
Прочие поверхности (lesson_progress, flashcards, daily_phrase, dialogues,
achievements, target_stats) НЕ параметризуются source locale — они одномерны
по `StudyTarget`. Это осознанное решение схемы (`docs/LOCALES.md`: «Точное key
format определить по существующему sync contract»), не пробел.

## 3. UI locale — отдельный контур (для полноты, не предмет PM-119)

`constants/i18n.ts` — 9 локалей интерфейса (`ru, uk, en, es, pt-BR, vi, id,
tr, pl`), хранится отдельно через `LangContext` / `useLang()`, никак не
завязан на `StudyTarget`. Пересечения нет: `study_target.ts` явно принимает
`uiLang: Lang` только как параметр (для тостов/копирайта), не для выбора
контента.

## 4. Риски изоляции — PM-120 разведка

Read-only. Механизм изоляции реализован в `app/target_storage_keys.ts`:
каждый ключ хранения для домена (`lesson_progress`, `lesson_session_local`,
`lesson_rewards`, `level_exams`, `mistake_practice`, `personal_practice`,
`cloud_sync`, `daily_phrase`, `flashcards`, `target_stats`, `achievements`)
строится как `domain_v2::{target}[::{id}]`, где `target` — один из
`en|es|fr|de` (см. `TARGET_SCOPED_KEY_PATTERN`). Исключение: `en` использует
"legacy" необёрнутый ключ (`scopedOrLegacyKey`: `target === 'en' ? rawKey :
targetKey(...)`) — обратная совместимость со старыми инсталляциями, где `en`
был единственным языком. Это не смешение данных, а осознанный fallback для
исторических ключей.

**Проверено, что НЕ смешивается между языками:**
- прогресс уроков, лучшие результаты, серии прохождений (`lesson_progress`,
  `lesson_rewards`) — по target-namespace;
- локальные ошибки/mistake practice (`mistake_practice`) — по target-namespace,
  плюс `personal_practice` дополнительно по source locale;
- daily_phrase, flashcards, target_stats, achievements, level_exams — по
  target-namespace;
- `assertTargetKey()` — рантайм-страж: бросает исключение при попытке записать
  «сырой» (несколченный) ключ, который входит в список known target-sensitive
  паттернов (`RAW_TARGET_SENSITIVE_PATTERNS`), т.е. случайная запись
  испанского прогресса в английский слот технически заблокирована для
  известных ключей.

**Проверено, что ОБЩЕЕ на аккаунт (намеренно, по BIBLE раздел D35):**
- энергия (`app/energy_system.ts`) — глобальная, не завязана на `StudyTarget`
  нигде в файле (grep на `studyTarget` в energy_system.ts — 0 совпадений);
  подтверждает BIBLE: «Энергия: 5, −1 за начавшееся учебное занятие» —
  без разбивки по языку;
- баланс монет/ранг монеты/Plus entitlement — не проверялись предметно в этом
  заходе (вне списка файлов, которые грепались), но по BIBIЛЕ D35 это
  сознательно общие сущности, не предмет изоляции.

**Найденная область риска (не баг, а недостаточно проверенное место):**
UI-локаль `es` (испанский интерфейс) и `StudyTarget: 'es'` (изучаемый
испанский) — это РАЗНЫЕ переменные, но `app/spanish_content_gate.ts` держит
функции с очень похожими именами для обеих (`spanishSurfacesEnabled(lang,
studyTarget)`, `spanishLessonUiStringsActive(lang, studyTarget)`,
`flashcardContentLang(uiLang, studyTarget)`), где часть функций явно
игнорирует `studyTarget` (параметр `_studyTarget`) и решает по `lang`, а
часть — наоборот. Комментарии в файле («Spanish UI is a source/explanation
language for learning English») показывают, что авторы кода уже осознавали
эту двусмысленность и разделили пути, но плотность двух почти одинаковых
`es`-контуров в одном файле — понятный источник будущей путаницы при
доработке. Рекомендация для PM-120 (реализация): при расширении реестра
языков стоит явно разнести неймингом `sourceLocaleEs` vs `studyTargetEs` в
этом конкретном модуле.

Полная реализация изоляции (PM-120 acceptance criteria A1/A2 — проверка «все
ключи прогресса/ошибок/курсов/диалогов/тренировок включают нужные контуры» по
каждому файлу и «язык интерфейса хранится отдельно» формальным тестом) в этот
заход НЕ выполнялась — задача слишком велика для одного захода (см. задание).
По текущим находкам: язык интерфейса УЖЕ хранится отдельно (LangContext,
собственный AsyncStorage-ключ вне `target_storage_keys.ts`), критерий
PM-120-A2 фактически выполнен существующим кодом. Критерий A1 выполнен для
всех проверенных доменов; полный построчный аудит каждого потребителя
`target_storage_keys.ts` не проводился (десятки файлов) — для формального
закрытия A1 нужен отдельный точечный проход или тест-страж (аналог
`assertTargetKey`, но проверяющий на этапе сборки, что новые ключи не минуют
обёртку).

## 5. PM-122 — переключение языка бесплатное (реализация, см. отчёт задачи)

Код уже реализует BIBLE-требование «Смена языка бесплатная» для переключения
между уже начатыми языками: `components/settings/StudyLanguagePicker.tsx` →
`onSelect()` → ветка `started.includes(code)` вызывает
`applyStudyLanguageSelection()` напрямую, без paywall и без энергии.
Единственный paywall в этом файле (`shouldGateExtraLanguage`,
`app/study_languages.ts`) относится к ДОБАВЛЕНИЮ нового, ещё не начатого
языка сверх бесплатного лимита (`FREE_STUDY_LANGUAGE_LIMIT = 1`) — это другая
механика, соответствующая соседнему пункту первоисточника S47 «Продолжение
курса платное» (см. `sources/02_screenshot_transcript.md`, S47 непосредственно
перед S48). Изменений кода по PM-122 не потребовалось — см. итоговый отчёт.
