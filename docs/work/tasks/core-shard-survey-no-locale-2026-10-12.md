# Task packet: опрос осколков — без текста на языке пользователя не предлагать (код без деплоя)

Governance-ID: TG-48820A791B2C
Status: In progress
Owner: сессия «1 · Ядро». Координатор 12.10: «(б) — ДА, готовь код с тестами БЕЗ деплоя: нет текста на языке пользователя →
опрос не предлагать, en в SUPPORTED_SURVEY_LANGS, лог [SHARD-SURVEY] reason=no_locale. Положи в пакет дня релиза… Тексты для uk
и других языков подготовь файлом-черновиком». Повод: на украинском интерфейсе в «Сегодня» русская строка опроса
«Зовёшь друга заниматься…» — resolveLocalized() подставлял ru.

## Outcome
- functions/src/shard_survey_core.ts: 'en' в SUPPORTED_SURVEY_LANGS; чистая функция missingSurveyLocaleKeys(config, lang) —
  какие тексты (заголовок, подпись, финальный экран, вопросы, варианты, кнопки действий) с непустым ru не имеют перевода.
- functions/src/shard_survey.ts: getActiveShardSurvey не отдаёт опрос, у которого нет текста на языке пользователя (ротация —
  survey: null; старый режим — кандидат отсеивается в памяти, без лишних чтений); лог [SHARD-SURVEY] reason=no_locale.
- Черновик переводов для админки: docs/phraseman-2.0/SHARD_SURVEY_TRANSLATIONS_DRAFT.md.
- Блок в DEPLOY_MORNING (рядом с опросом осколков, «к дню релиза»).

## Scope
In: два файла functions, тест ядра, черновик, документ выкладки. Out: деплой, запись в прод (решает владелец).

## Architecture
Проверка — чистая функция ядра; обёртка зовёт её перед presentSurvey. ru-язык всегда проходит (fallback-язык контента).

## Security and privacy
Данных пользователя не касается.

## Technical debt
До выкладки сервера опрос на uk/en по-прежнему приходит русским.

## Verification
shard_survey_core.test.ts (+ en, + пропуски по ключам), tsc функций при наличии памяти.

## Rollback
`git revert`; функции не выкладывались.
