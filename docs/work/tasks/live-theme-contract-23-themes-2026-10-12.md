# live_theme_contract под 23 темы Liquid Glass и сквозной accentText

Governance-ID: TG-7B5A70C9EF21
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (запрос координатора 07:25)
Related epic/enabler: accent-text-light-cards-2026-10-12.md

## Outcome

Тест `tests/live_theme_contract.test.ts` соответствует модели 2.0: видимые темы — реестр Liquid Glass из 23 тем, `ThemeMode` — совместимый графитовый алиас; плюс сквозная проверка, что `accentText` доходит до экранов по всем путям (Theme с токенами, палитра V2 с токенами и без них).

## Scope

In scope: переписать этот один тест, запись в INBOX. Out of scope: правки боевого кода (тест красный из-за устаревших ожиданий, не из-за дефекта), экраны Дизайна.

## Architecture

Тест читает исходники (`constants/theme.ts`, `components/ThemeContext.tsx`) и вызывает `makeLiquidGlassTheme`, `getV2Palette`, `liquidGlassTokens`; боевой код не меняется.

## Security and privacy

Не применимо.

## Technical debt

Прежний тест закреплял 9 режимов с ценами и `indigo` по умолчанию — отменено переходом на реестр Liquid Glass.

## Verification

Точечный запуск набора по слоту светофора, чтение текста вывода.

## Rollback

`git revert` коммита.
