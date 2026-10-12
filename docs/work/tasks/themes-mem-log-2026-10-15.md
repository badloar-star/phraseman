# Экран тем: факты по памяти (+52 МБ за 65 с), лог [THEMES-MEM]

Governance-ID: TG-4DD5B06C82EC
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (запрос координатора по скорости)

## Outcome
Выяснено по коду, что монтирует /settings_themes; добавлен dev-лог [THEMES-MEM] (число превью, размеры кэшей токенов и арта, куча Hermes и её прирост) — по нему решаем, что облегчать. Вид экрана не меняется.

## Scope
Геттеры размеров кэшей (constants/liquidGlassThemePalette.ts, components/theme/themed_art_registry.ts), хук логирования (components/settings/themesMemLog.ts), вызов в app/settings_themes.tsx. Только dev (__DEV__).

## Architecture
Хук пишет на монтировании и при каждой смене темы/оформления/интенсивности; значения кучи — из HermesInternal.getInstrumentedStats (если есть), без побочных эффектов.

## Security and privacy
Не применимо.

## Technical debt
Облегчение (миниатюры, ленивая загрузка) — после цифр.

## Verification
Точечный тест на источник; цифры снимает Сверка на эмуляторе.

## Rollback
git revert коммита.
