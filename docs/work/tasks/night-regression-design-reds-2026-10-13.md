# Task packet: ночная регрессия — красные тесты зоны Дизайна

Governance-ID: TG-8563CB719D63
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по команде координатора 13.10 (NIGHT_REGRESSION_2026-10-13.md)

## Outcome

Три красных теста зоны Дизайна приведены в зелёное без ослабления проверок: (1) `dev_fc_lang_state` — строка `videopacks` в `DEV_SWITCHES_R1_CORE.md` (расширена в 228448bfe) и сторож согласованы; (2) `flashcards_blitz_access_behavior` — мок `react-native` в тесте получает `Platform` (импорт `dev_animations_off` из 4e74715d4 тянет `app/config.ts`) либо импорт в Блице становится ленивым в dev-ветке; (3) `spire_reject_rollback` проверен после последних коммитов Шпиля.

## Scope

In scope: `tests/` соответствующих файлов, при необходимости строка в `docs/phraseman-2.0/DEV_SWITCHES_R1_CORE.md` (только строка videopacks), при необходимости ленивый импорт в `app/flashcards_blitz_session.tsx` (кодовый коммит — только в окно :00–:05 / :30–:35).

Out of scope: логика dev-переключателей, поведение Блица, чужие красные тесты.

## Architecture

Сторож и документ должны описывать один и тот же формат значений (`videopacks=empty|demo|…`); тест Блица должен изолировать зависимость от платформы так же, как соседние тесты (мок с `Platform`). Ослаблять проверку ради зелёного запрещено.

## Security and privacy

Dev-переключатели; в стор-сборке заглушки. Данные не затрагиваются.

## Technical debt

Contain: тесты, мокающие `react-native` вручную, ломаются при каждом новом модуле, читающем `Platform`; ленивый импорт dev-флага снимает зависимость в корне (если выберем этот путь).

## Verification

`npm run test:one` по трём файлам; прогон соседних тестов Блица и dev-переключателей.

## Rollback

git revert коммита.
