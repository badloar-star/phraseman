# Экран «Темы» в Настройках против profile.html / settings-gaps-states.html; хаб Карточек на 23 темах

Governance-ID: TG-1708289DA83D
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора; срок 12.10)
Related epic/enabler: muted-text-aa-light-2026-10-14.md; shadow-style-tokens-2026-10-14.md

## Outcome

Построчная сверка экрана `app/settings_themes.tsx` с кадром тем в `docs/design/v2-app/profile.html` (функция `themes()`): порядок и названия 13 + 10 тем, превью-кружки, выбранное состояние, переключатель тёмное/светлое, ползунок насыщенности; расхождения закрыты правкой токенов/кода в моей зоне. Отдельно — проверка по токенам, что хаб Карточек (`0a53b6d9b`, утренний вид) читаем на всех 23 темах (мятная кнопка и плитки).

## Scope

In scope: `app/settings_themes.tsx` и его компоненты тем (`ThemeSwatch`, `ThemeIntensitySlider`, `theme_display_names.ts`, `liquidGlassThemeSwatch.ts`), тесты, запись в INBOX. Out of scope: вёрстка других экранов Настроек, макеты.

## Architecture

Сверка по исходникам и численно (названия, порядок, цвета кружков из `themeSwatchSpec`); хаб Карточек — контраст пар токенов, которыми он красится, на 23 темах × оформления × уровни.

## Security and privacy

Не применимо.

## Technical debt

Кадры эмулятора для окончательного match ставит Сверка.

## Verification

Сравнительные скрипты (чтение), тесты тем по слоту светофора, контракт экрана настроек.

## Rollback

`git revert` коммита.
