# Премиум-темы: чернила главной кнопки по градиенту и регистр accentGraphic

Governance-ID: TG-171DB38EB6A2

## Outcome
Сторожа theme_max_button_matrix и accent_graphic_token красные на HEAD по 6 премиум-темам (пакет a50cfbf18, 4 · ТЕМЫ): в светлом оформлении текст главной кнопки на её градиенте 1,19–2,88; accentGraphic отличается от accent только регистром hex.

## Scope
In scope: `constants/liquidGlassThemePalette.ts` (premiumLegibleRoles, accentGraphic).
Out of scope: состав реестра тем и tests/live_theme_contract (вопрос координатору).

## Architecture
Градиент главной кнопки премиум-темы = [accent, accent] коллекции (как у всех тем; раньше оставался от базовой темы — storm_violet: тёмный акцент и сиреневая кнопка). accentInk премиум-темы выбирается из чернил коллекции/белого/чёрного по ХУДШЕМУ контрасту к accent и всем точкам accentGradient. accentGraphic, совпавший с accent без учёта регистра, возвращает сам accent.

## Security and privacy
Данных не касается.

## Technical debt
Нет.

## Verification
theme_max_button_matrix, accent_graphic_token, sheet_danger_contrast, two_theme_new_screens_contrast, theme_contrast_report.

## Rollback
Откатить коммит.
