# п.63: accent как цвет ТЕКСТА в «светлая + Максимум» (контраст 1,0–1,8)

Governance-ID: TG-3D533949F41A
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора: найти по коду, где accent идёт текстом; минимальная правка; таблица «было → стало»)

## Outcome
Замер по 23 темам (светлое оформление, насыщенность 1): токен `accent` на поверхностях даёт контраст 1,00–1,31 у 10 градиентных тем (это пастельная заливка, не цвет текста), а `accentText` — ≥ 4,54 везде. Все места, где accent красит ТЕКСТ или значок-глиф в зоне Тем и общих компонентах, переведены на `accentText`; тёмные темы и заливки/кнопки (где accent и нужен как заливка) не меняются.

## Scope
app/community_packs/UgcPackEditorCardPreview.tsx (6 строк), components/flashcards/StatusFilterChips.tsx, components/SpeakingButton.tsx, components/lesson_help_theory_ui.tsx + lesson_help_theory_data.tsx (значок). Остаётся как есть: заливки/кнопки/кольца (accent как фон — задумано), экран статистики серии (уже accentText), dev- и Codex-файлы (learning-v2, DevHub) — списком координатору.

## Architecture
Токен accentText уже есть во всех темах (liquidGlassThemeVariants/GradientThemes) и в Theme; правка — замена источника цвета в местах «текст/значок». Новых токенов не вводится: legibleOn не нужен, потому что accentText уже доведён до ≥ 4,5 (замер ниже), в отличие от accent.

## Security and privacy
Только цвета.

## Technical debt
Файлы Codex/dev (learning-v2/horizons, _learning_v2_*, DevHubSheet, motion_showcase) используют accent как текст — передаются списком.

## Verification
Замер контраста (скрипт по токенам), срез типов, тесты типографики/ратчетов, поиск остаточных `color: *.accent`.

## Rollback
git revert.
