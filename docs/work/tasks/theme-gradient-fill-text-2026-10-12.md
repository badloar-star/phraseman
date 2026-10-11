# Текст поверх градиентных заливок «Максимум» и пара ctaInk/cta

Governance-ID: TG-6D6221F927B0
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (запрос координатора 02:25)
Related epic/enabler: theme-max-matrix-and-ink-tokens-2026-10-12.md

## Outcome

Подтверждение, что `ctaInk` читается на `cta` и что `text`/`secondary` читаются на каждой точке градиентных фонов и карточек (`bgGradient`, `cardGradient`) во всех 23 темах, обоих оформлениях и на всех шагах ползунка; сторож в тесте.

## Scope

In scope: расширение `tests/theme_max_button_matrix.test.ts`, отчёт, запись в INBOX. Out of scope: правка токенов, пока проверка зелёная; чужие экраны.

## Architecture

Тест читает токены `liquidGlassTokens` и сравнивает контраст по WCAG; код приложения не меняется.

## Security and privacy

Не применимо.

## Technical debt

Градиентные точки считаются по непрозрачному цвету без учёта прозрачности поверх картинок.

## Verification

Точечный запуск по слоту светофора, чтение текста вывода.

## Rollback

`git revert` коммита.
