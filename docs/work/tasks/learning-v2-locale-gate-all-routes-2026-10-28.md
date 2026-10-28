# Task packet: каждый вход в Learning V2 проверяет язык интерфейса

Governance-ID: TG-C64EBF54E6A1
Status: In progress
Owner: Learning V2 session; координатор 28.10 (Переводчик: курс есть только на ru/uk, localized() для остальных подставляет русский)

## Outcome

Ни один маршрут Learning V2 не открывается при языке интерфейса, на котором у курса нет пояснений (всё кроме ru/uk): лог [V2-HIDDEN] и уход
на Главную — как уже делают course, session/[id], chapter-exam, learning_v2_placement. Сторож: каждый маршрут app/learning-v2/** и
app/learning_v2_*.tsx либо проверяет isLearningV2Hidden, либо закрыт для выпуска (dev-маршрут).

## Scope

Без замка в выпуске были 4 маршрута: /learning_v2_lesson_words, /learning_v2_session_intro, /learning_v2_session_intro_check,
/learning_v2_direct_session_player_v1 (последний — ещё и в реестре попыток). Новая обёртка app/learning_v2_locale_guard.tsx
(withLearningV2LocaleGuardV1); в четырёх файлах default export оборачивается. Сторож tests/learning_v2_locale_gate_all_routes_2026_10_28.test.ts.
localized() в factory_native_course_v1.ts не трогаю (чужая незакоммиченная правка Codex) — описание правки координатору.

## Architecture

Обёртка без хуков: isLearningV2Hidden() (рубильник + язык) → Redirect на LEARNING_V2_HIDDEN_REDIRECT с [V2-HIDDEN], иначе внутренний
экран с теми же props. session/[id] импортирует intro и плеер как компоненты — там замок уже сработал раньше, поведение не меняется.

## Security and privacy

Нет данных.

## Technical debt

Перевод курса на остальные 7 языков — отдельная работа фабрики.

## Verification

Сторож всех маршрутов, тесты видимости V2 и затронутых экранов, проверка типов.

## Rollback

Revert коммита.
