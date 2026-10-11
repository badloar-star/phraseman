# Текст цветом акцента на светлых карточках: accentText ≥ 4.5:1 во всех темах

Governance-ID: TG-E32EE93E441F
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (приоритетный запрос координатора 04:55, кадр CHK_w_light_session от Дизайна)
Related epic/enabler: theme-contrast-audit-2026-10-10.md

## Outcome

В светлом оформлении градиентных и тонированных тем текст цветом акцента (`accentText`) читается на `opaqueCard`, `card`, `opaqueSheet`, `opaqueControl` с контрастом ≥ 4.5:1 на всех уровнях насыщенности (calm/accent/max) и шагах ползунка; в тёмном — не хуже прежнего. Заливки (`accentInk`, `ctaInk`, `cta`, `accent`) не меняются.

## Scope

In scope: `constants/liquidGlassThemeVariants.ts`, `constants/liquidGlassGradientThemes.ts` (только `accentText`), новый тест `tests/theme_accent_text_contrast.test.ts`, запись в INBOX, сообщение Дизайну. Out of scope: перенос экранов с `t.textSecond`/`g.cta` на `accentText` (делает Дизайн), смена `textSecond`.

## Architecture

`accentText` уже есть в `GlassTokens`; в светлом оформлении значение подбирается до контраста ≥ 4.55 на самой тёмной из поверхностей (карточка/шторка/плашка) сдвигом светлоты в OKLCH с сохранением оттенка; в тёмном остаётся прежним.

## Security and privacy

Не применимо.

## Technical debt

Старые экраны красят текст через `t.textSecond` (= `g.cta` в новом наборе) — миграция на Дизайне.

## Verification

Новый тест по 23 темам × 2 оформления × 3 уровня × 21 шаг; существующие тесты контраста и палитры.

## Rollback

`git revert` коммита.
