# Пик: башня и тёплая строка сцены в оттенках темы (код, ждёт выбора A/B)

Governance-ID: TG-5064C7D98194
Owner: 3 · МАКЕТЫ · Date: 2026-10-22 · Source: координатор (слово владельца 22.10: «башню перекрашиваем в оттенки темы, монеты-ранги — металл»; закон «ЦВЕТА ДОЛЖНЫ БЫТЬ СТРОГО ЦВЕТАМИ И ОТТЕНКАМИ ТЕКУЩЕЙ ТЕМЫ»)

## Outcome
- На «Сцене» Пика наряд башни считается из акцента темы («Максимум») и цветов сцены (homeSceneTokensForTheme) по правилу из сравнения
  docs/design/v2-app/peak-tower-theme-shades.html (64626e62f). По умолчанию правило A («светлое»); B — одна константа SPIRE_TOWER_THEME_RULE.
- У лиги остаются форма навершия, ободки, фактура и блеск; без лиги — «Оникс без деталей», но тоже в цветах темы.
- Строка «N мест до повышения» — общий тёплый тон сцены Главной homeSceneWarmTone(акцент).flame вместо своего #FFD0C4; мятный #A6F0C6 (не использовался) убран.
- Коммит — только после ответа владельца A/B (координатор), в окно кода.

## Scope
- modules/spire/tower_skins.ts: SpireTowerThemeColors, SpireTowerThemeRule, SPIRE_TOWER_THEME_RULE, spireThemedLeagueSpec, spireThemedSkinForTier.
- components/spire/SpireTower.tsx: проп themeColors (только «Сцена»), выбор наряда, журнал [SPIRE-LAYOUT] tower:render + skin/themed.
- components/spire/scene/SpireScene.tsx: акцент «Максимума», тёплый тон, themeColors в башню.
- components/spire/scene/spire_scene_palette.ts: убраны warm/up. app/dev_spire_scene_preview.tsx: пустая энергия — muted.
- tests/spire_tower_skins.test.ts, tests/spire_scene_contract.test.ts: новые сторожа, две строки старых сторожей обновлены.
- Не трогаю: башню вне «Сцены» (окно, тур, моменты, карточка недели — вторая волна: светлые фоны требуют своего расчёта), монеты-ранги (металл),
  чужие незакоммиченные правки в components/spire/moments/*, SpireAllMembers/SpireHomeScreen/SpireStepScreen.

## Architecture
- Перекраска — чистая функция над таблицей лиг (skinFromLeague тот же); башня получает готовый skin, SVG не меняется.
- Цвета не #RRGGBB → наряд лиги (башня не ломается); проверено на всех 23 темах × тёмное/светлое: все #RRGGBB.
- useMemo по теме: наряд пересчитывается только при смене темы/лиги; homeSceneWarmTone кэширует по акценту.

## Security and privacy
- Данные не собираются и не передаются; сеть, хранилище, разрешения не затронуты. Политику конфиденциальности не меняет.

## Technical debt
- Вторая волна: башня на светлых фонах (окно Пика, моменты, карточка недели, тур) — своё правило под светлую подложку.
- «Сегодня»: тёплая строка #FFD9D0 в TodaySceneView — перевести на тот же homeSceneWarmTone вместе с кольцами (пункт 3 очереди).

## Verification
- Типы файлов Пика (свой tsconfig), тесты Пика/башни/контраста сцен, храповик цветовых литералов — через слот.
- Расчёт по всем темам: tower_theme_all.ts (92 сочетания, все #RRGGBB), контраст тёплого тона — аудит scene_contrast_audit (flame ≥ 4,5).
- Кадры 3–4 тем — Сверка после коммита (эмулятор сейчас запрещён владельцем).

## Rollback
- git revert коммита; либо SpireScene перестаёт передавать themeColors — башня возвращается к наряду лиги без других изменений.

## Решение владельца
- 22.10, кнопка Q45 (через координатора): «A — светлая» — SPIRE_TOWER_THEME_RULE = 'light' (по умолчанию), переключатель одной строкой оставлен.
- В тот же коммит: подпись своей монеты на «Сцене» (spireText(lang, 'you')) — сторож spire_a11y_labels_contract был красным с 7961dde6a.
