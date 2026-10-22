# Главная, шаг 1 ускорения первого кадра: авто-Lite (стор — ОЗУ или эмулятор; dev — выключен, ссылка ?lite=)

Governance-ID: TG-8328CD70181C
Owner: 3 · МАКЕТЫ · Date: 2026-10-22 · Source: владелец кнопкой (ускорение первого кадра Главной — «Да, и то и другое»), план 4 · ТЕМЫ
docs/work/home_first_frame_effects_2026-10-22.md; решение координатора: эмулятор — инструмент сверки 1:1, в dev-сборках авто-Lite по
умолчанию выключен, ссылка ?lite=auto|on|off, в сторе — авто; порог ОЗУ < 3 ГиБ не трогать; журнал [HOME-LITE] [PERF-LITE].

## Outcome
- Стор-сборка: лёгкий режим сам — ОЗУ < 3 ГиБ (как было) или эмулятор / симулятор (expo-device isDevice === false).
- Dev-сборка (ENABLE_DEV_TOOLS): авто выключен (reason dev_default_off) — эмулятор Сверки рисует тени, ручных действий не нужно.
- Ссылка phraseman://dev_state?lite=auto|on|off — проверить авто или принудительно (в памяти до перезапуска); в сторе не действует.
- Журнал одной строкой «[HOME-LITE] [PERF-LITE] mode» с причиной, сборкой, ссылкой.

## Scope
- app/lite_mode.ts, app/dev_state_fixtures.ts, tests/lite_mode.test.ts. Порог ОЗУ (app/flashcards/low_power.ts) не меняется.

## Architecture
- decideLiteMode — чистая функция; dev-контекст — параметр (по умолчанию стор). Флаг тот же (constants/lite_mode_flag), тени читают его.

## Security and privacy
- Данные не собираются и не передаются; ручной выбор — прежний ключ AsyncStorage. Политику не меняет.

## Technical debt
- Шаги 2–4 (маски теней, запечённый фон, фон под сценой и герой 512, отложенный CapFill) — следующие волны.

## Verification
- Срез типов файлов, тесты лёгкого режима и ссылок разработки (dev_links_r1, moments_v3_dev_override), храповик — через слот.

## Rollback
- git revert коммита; LITE_MODE_AUTO_ENABLED=false отключает авто целиком.
