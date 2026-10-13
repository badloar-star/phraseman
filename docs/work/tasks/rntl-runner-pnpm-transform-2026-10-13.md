# Task packet: раннер RNTL снова исполняет тесты (pnpm-путь в transformIgnorePatterns)

Governance-ID: TG-4CA8E68F214C
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10, после 18959e709)

## Outcome

`jest.rntl.config.cjs` (и наследующий его `jest.sunday-sheet.config.cjs`) снова трансформирует react-native/expo-пакеты,
лежащие по pnpm-пути `node_modules/.pnpm/<pkg@ver>/node_modules/<pkg>/…`. Раньше паттерн смотрел только на имя сразу после
первого `node_modules/` (там `.pnpm`) и игнорировал всё → `react-native/jest/setup.js` падал «Cannot use import statement
outside a module», раннер выполнял 0 тестов.

## Scope

In scope: одна строка `transformIgnorePatterns` в jest.rntl.config.cjs. Out of scope: чужая незакоммиченная строка testMatch
в том же файле (не коммитится), сами .tsx-тесты — красные после починки только списком координатору.

## Architecture

Паттерн `node_modules/(?!(\.pnpm/[^/]+/node_modules/)?(<список ESM-пакетов>)/)`: разрешённый пакет трансформируется и в
плоском, и в pnpm-размещении; прочие пакеты .pnpm по-прежнему не трансформируются (скорость).

## Security and privacy

Только тестовая инфраструктура.

## Technical debt

- Contain: нет.

## Verification

1 тест — раннер выполняет >0 тестов; затем 9 ночных .tsx по одному (одна нить, память ≥2 ГБ).

## Rollback

git revert коммита.

## Result

Раннер выполняет тесты: 9 ночных .tsx — 7 зелёных (nickname 7, friend_list_row 41, friend_together 8, hybrid_sheet 2, survey_offer 6, survey_sheet 29, session_attempts_hud 2); красные: learning_v2_intro_reader_a (2 утверждения), learning_v2_new_word_encounter_overlay (мок react-native без StyleSheet) — зона Learning V2, списком координатору. Чужая незакоммиченная строка testMatch (learning_v2_mode_feedback_lane) в коммит не вошла.
