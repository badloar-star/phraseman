# Task packet: холодный старт — заставка по теме, без чёрных кадров и вспышки

Governance-ID: TG-4A6ADED59C2B
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: координатор 09:45 (находка Макетов 22), evidence/modals_1018/theme_boot

## Outcome

При светлой системе заставка светлая (нативная и экранная), при тёмной — прежняя #101214; после заставки нет чёрных кадров и вспышки «тёмное → светлое».

## Scope

In scope:
1. Логи [THEME-BOOT] в app/_layout.tsx: монтаж/первый кадр StartupSplashHold, каждый вызов SplashScreen.hideAsync (какой путь, msSinceBoot) — чтобы найти источник чёрных кадров (яркость 0, не #101214).
2. Экранная заставка (StartupSplashHold, корневой GestureHandlerRootView, appFullScreenOverlay): фон по сохранённой теме, до её чтения — по системной; надпись и подзаголовок читаются на светлом фоне.
3. Нативная заставка: app.json expo-splash-screen — светлый фон и иконка с тёмным текстом для светлой системы, dark — прежние #101214 и иконка.

Out of scope: чужие незакоммиченные правки app/_layout.tsx (коммит только своими хунками, safe_commit --patch); android/ (в .gitignore, генерируется prebuild).

## Architecture

No architecture change: цвет заставки берётся из тех же токенов liquidGlassTokens; системная схема — Appearance.getColorScheme() синхронно.

## Security and privacy

Не затрагивает: только отрисовка и логи без данных пользователя.

## Technical debt

- Pay now: захардкоженный тёмный STARTUP_SPLASH_BG.
- Defer: чёрные кадры — диагноз по логам, починка после воспроизведения.

## Verification

Эмулятор: холодный старт при светлой и тёмной системе (cmd uimode night no/yes), кадры f1…f8, журнал [THEME-BOOT]. Нативная часть — при следующей сборке.

## Rollback

`git revert`; app.json — вернуть backgroundColor/image.
