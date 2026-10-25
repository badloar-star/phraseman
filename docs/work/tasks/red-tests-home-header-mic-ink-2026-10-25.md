# Task packet: два красных node-теста против 2.0.2 (шапка Главной, микрофон Карточек)

Governance-ID: TG-EBB1EA3B1051
Status: In progress
Owner: 4 · ТЕМЫ
Related epic/enabler: ночной список Ревизора 2d3dd7234; коммиты 5c94a294c (чернила сцены), 98d392158 (значок микрофона)

## Outcome

Оба теста снова зелёные и по-прежнему сторожат смысл: (1) шапка Главной в песочнице стенда получает модуль `home_scene_ink`
(и заглушки кольца Plus), (2) значок микрофона в `SpeakHoldButton` — токен темы (ctaInk/accentInk, что контрастнее на заливке),
а не постоянный `#07110A`; контраст ≥ 4,5 уже держит zones_contrast_fixes_2026_10_25.

## Scope

In scope: tests/home_v2_video_rail_contract.test.cjs (мок стенда), tests/approved_ux_context.test.cjs (ожидание микрофона).
Out of scope: код приложения не меняется.

## Architecture

No architecture change: только ожидания тестов под уже выпущенный код.

## Security and privacy

Не касается данных пользователей.

## Technical debt

Pay now: стенд шапки получает все свои импорты, чтобы следующая правка шапки не роняла его на загрузке.

## Verification

node --test для обоих файлов; полный файл зелёный.

## Rollback

git revert коммитов тестов.
