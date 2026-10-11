# Светлые темы: скрим под статус-баром берёт цвет фона темы, а не чёрный

Governance-ID: TG-12A0F5455847
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора, кадр HOME_light.png)
Related epic/enabler: light-themes-no-dark-blots-all-screens-2026-10-14.md

## Outcome
В светлых темах полоса под статус-баром (маска `TopFadeMask`, живёт в `(tabs)/_layout` и в `ScreenGradient`) светлая — цвет фона темы; было чёрное с альфой 0.446 (на кадре «Затмение» светлая: y=20 → RGB 131,133,135). Тёмные темы без изменений. Лог `[HOME-PLATE] topscrim …` со значением цвета скрима.

## Scope
`components/TopFadeMask.tsx` (если `tone` не передан — цвет от темы; явный `tone` работает как раньше), тест. `ScreenGradient`, `_layout`, `home.tsx` не трогаю.

## Architecture
Чистая функция `topFadeScrim(isLight, bgTop, strength, tone)` → `{ rgb, alpha }`; тема берётся из `liquidGlassTokens(liquidGlassThemeId)`.

## Security and privacy
Не применимо.

## Technical debt
Скрим светлых тем закрывает контент плотнее тёмного (альфа 0.8 против 0.446): иначе прокручиваемый контент просвечивает под статус-баром; подбор альфы — по кадру Сверки.

## Verification
Точечный jest под слотом светофора; кадр Главной в светлой теме — у Сверки.

## Rollback
git revert коммита.
