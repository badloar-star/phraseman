# Тон поверхностей премиум-тем — вариант 2 (свой контракт), читаемость строгая

Governance-ID: TG-B0893F241532

## Outcome
Координатор 25.10 (OWNER_DECISIONS_2026-10-21.md, ~07:20 «тон поверхностей — вариант 2»): пигменты коллекции Codex не трогаем (замок 24.10 + слово владельца 25.10 «как у Кодекса»). Тон-сторожа меряют 23 обычные темы, премиум-темы — своим контрактом premium_themes_contrast; читаемость текста/значков премиум-тем строгая; рамку переключателя у титана чиним тоном.

## Scope
In scope: тон-проверки в tests/blend_1018_pairs.ts, blend_auth_1018, blend_new_elements_1018b, theme_light_plate_separated_from_bg, theme_sheet_plate_lighter, theme_shadow_style_tokens, theme_surface_roles, themed_art_clay_accent_contrast, today_buttons_contrast_audit, button_tokens_contrast (только «вторичная несёт тон»), home_scene_theme_tokens; `components/settings/switch_chrome.ts`; расширение tests/premium_themes_contrast.test.ts (текст/вторичный/приглушённый на всех поверхностях премиум-тем).
Out of scope: пигменты, пороги, фоны сцены Главной (отдельно).

## Architecture
Исключаются только премиум-темы и только в тон-парах (порог ниже графического 3:1); текстовые/графические пары по-прежнему меряют все 29 тем. Причина и ссылка — в каждой правке.

## Security and privacy
Не касается.

## Technical debt
Тон премиум-коллекции меряется только глазами владельца/макетом Codex.

## Verification
Все перечисленные тесты + premium_themes_contrast.

## Rollback
Откатить коммит.
