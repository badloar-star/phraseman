# Моменты v3 — светлые темы: акцентная графика и безопасный акцентный текст (15.10)

Governance-ID: TG-06D22F7D8B45

## Outcome
Сторож `light_accent_graphics_ratchet` перестаёт краснеть на новых окнах моментов: FirstDialogMoment, LessonPerfectMoment, MomentPromotion, SpireLastChanceSheet, StorySlides. Графика берёт цвет через `accentGraphic`, текст — через `accentTextSafe` (как серия Тем), без записи новых мест в базовую линию.

## Scope
Только цвета акцента в перечисленных компонентах; раскладка, тайминги и тексты не меняются. Проверка ProfileCardProSheet на вход гибрида (motion_hybrid_contract) — разбор, правка только если файл мой.

## Architecture
Палитра `useSpirePalette` / токены Тем отдают `accentGraphic` и `accentTextSafe`; компоненты берут их вместо `accent`/`accentText` там, где сторож требует.

## Security and privacy
Данные не затрагиваются; только цвета.

## Technical debt
Базовая линия сторожа не расширяется. Если токены в палитре отсутствуют — завести их через Темы, не копировать значения.

## Verification
`light_accent_graphics_ratchet`, `motion_hybrid_contract`, контрактные тесты затронутых окон, typecheck по затронутым файлам.

## Rollback
Откат коммита; поведение окон при выключенном `moments_v3` не меняется.
