# Лог причины в немом catch движения премиум-темы

Governance-ID: TG-AB03D2BCA30D

## Outcome
Координатор 24.10: в `PremiumThemeMotion.tsx` (useStormPlateData) `.catch` глушит ошибку чтения плиты движения. Добавить лог [PREMIUM-THEME-MOTION] с id темы и error.message; поведение прежнее.

## Scope
In scope: `components/home/v2/scene/PremiumThemeMotion.tsx` — одна строка catch.
Out of scope: снимок docs/work/codex_premium_themes_snapshot*, логика движения.

## Architecture
console.warn в catch: тема, источник (без полного пути — только факт наличия), сообщение ошибки. setData(null) как раньше.

## Security and privacy
Без uid и PII.

## Technical debt
Нет.

## Verification
babel parse файла; правка однострочная.

## Rollback
Откатить коммит.
