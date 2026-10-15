# Task packet: онбординг в цветах дефолтных тем (светлая система — «Сумерки», тёмная — «Океан»)

Governance-ID: TG-B9C151E0E23B
Governance-ID: TG-4A10338962ED
Governance-ID: TG-FAFF0BD05FEC
Governance-ID: TG-A8C28C0E728C
Governance-ID: TG-0E70A1D66C6A
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: приоритет координатора 15.10 к сборке 16.10; макет «Онбординг в темах» (12 шагов каталога `app/onboarding_flow.ts`)

## Outcome

Онбординг новичка рисуется цветами активной темы (у новичка — дефолтная по системе: светлая → ink «Сумерки», тёмная → marine «Океан», `app/theme_first_run_default.ts`). Тексты, порядок экранов, кегли и раскладка не меняются. Включается экран уровня (`SHOW_ONBOARDING_LEVEL_STEP`). Экраны «План готов» и «Первая фраза вслух» не затрагиваются. Контраст: главная кнопка ≥ 3:1 к фону, подпись на ней ≥ 4,5:1, основной текст ≥ 4,5:1 в обеих темах.

## Scope

In scope: `components/onboarding_palette.ts` (новый: палитра из токенов темы + кэш стилей на тему), `components/CleanOnboarding.tsx` (статический `StyleSheet` → стили из палитры, инлайн-цвета → роли палитры, полоса статуса по теме, кнопки входа по поверхности, рубильник уровня), тесты контракта (`onboarding_theme_palette_contract`, `auth_apple_button_variant_contract`).
Out of scope: `components/onboarding_aha/*`, «вторичная кнопка с заливкой buttonFill» (1,7:1), тексты, порядок, размеры, иллюстрация телефона с пушем (остаётся реалистичной картинкой).

## Architecture

`useOnboardingPalette()` берёт `liquidGlassTokens(liquidGlassThemeId)` из `ThemeContext` и отдаёт роли (bg, card, soft/track, text, secondary, line, ctaFill/ctaInk, good). Стили строятся функцией `createStyles(P)` один раз на тему (`memoStylesByPalette`), каждый компонент берёт `styles` и `P` хуками в начале тела. Решение «какой цвет какой роли» — по свойству и исходному цвету; тени и затемняющие подложки остаются чёрными.

## Security and privacy

Данные не собираются и не передаются; только цвета. Политика конфиденциальности не затрагивается.

## Technical debt

Contain: иллюстрации сейфа и графика перекрашены от поверхностей темы; телефон с пушем оставлен фиксированным. Эталонные снимки светлой и тёмной тем — Сверке.

## Verification

Разбор файла парсером (синтаксис), тест контраста обеих тем, `auth_apple_button_variant_contract`, затронутые контракты онбординга по слоту; снимки на эмуляторе в светлой и тёмной системной теме.

## Rollback

`git revert` отдельного коммита (одним движением); рубильник уровня возвращается в `false`.
