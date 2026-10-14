# Task packet: D188 (уточнение владельца) — тап по любому языку сразу переключает обучение

Governance-ID: TG-02FDA45C223D
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: D188 (первая часть — core-d188-all-study-languages-open-2026-10-14.md)

## Outcome

Слова владельца через координатора: «ЭТО ЯЗЫКИ ИЗУЧЕНИЯ, А НЕ ИНТЕРФЕЙСА, ПОЭТОМУ ОН ДОЛЖЕН БЫТЬ ТАМ», «НАРАВНЕ С ДРУГИМИ
ЯЗЫКАМИ», «И ВСЕ РАЗБЛОКИРОВАНЫ», «Так и должно быть» (без пометок «скоро»/«в разработке»). В шторке «Язык изучения»
всегда 5 одинаковых строк (en, es, fr, de, it) при любом из 9 интерфейсов; тап по ЛЮБОМУ языку сразу переключает
обучение (тот же путь, что для начатого: applyStudyLanguageSelection, галочка в кадре тапа, шторка уезжает, тост),
без экрана приветствия. Лог `[LEARN-LANG]` печатает ui, итоговый список и выбор.

## Scope

In scope: `components/settings/StudyLanguagePicker.tsx` (хук: опция `switchNewLanguagesDirectly`, обход ветвей
resolver/welcome), `components/settings/StudyLanguageSheet.tsx` (включает опцию, лог списка), стражи
`tests/d188_all_study_languages_open.test.ts`, `tests/video_language_pill_study_target.test.ts`.
Out of scope: экран /language_welcome остаётся (deep-link и прямые маршруты); таблица D129/D130; макет PRF-23 (Макеты).

## Architecture

Хук остаётся единственным путём смены языка; новая опция только выбирает ветку switch для неначатого языка.
applyStudyLanguageSelection сам отмечает язык начатым (mark_started), поэтому «начатость» поддерживается как раньше.

## Security and privacy

Данных не добавляется. Профиль языка (цель/уровень с экрана приветствия) для новых языков не спрашивается — не пишется.

## Technical debt

Contain: экран /language_welcome из шторки больше не открывается; решить его судьбу отдельно (не удалять без слова).

## Verification

Точечные тесты двух стражей + canonical contour; проверка типов затронутых файлов; разбор .tsx babel.

## Rollback

Убрать опцию `switchNewLanguagesDirectly` из шторки — вернётся переход на приветствие.
