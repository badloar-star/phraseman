# Task packet: аудит «назад» Ядра (8e9e5ec8b) — зона «Обучение», разбор и правки

Governance-ID: TG-90BA0B74D9CF
Status: In progress
Owner: Learning V2 session; задача координатора 26.10 (16 экранов зоны «Обучение»)

## Outcome

По каждому экрану зоны: что на самом деле в коде (аудит-скрипт видит не всё), куда ведёт запасной маршрут и почему, что поменял.
Правка только там, где запасной маршрут уводит из раздела без причины: «Теория» (app/hint.tsx) — /(tabs)/home → /lessons_list.

## Scope

app/hint.tsx (одна строка goBack); раздел в docs/work/back-button-audit-2026-10-26-learning-v2.md. Реестр ролей app/navigation_back.ts
не трогаю (Ядро). Перенос своих кнопок на общий ScreenBackButton — не вслепую: меняет место кнопки и шапку, нужен кадр Сверки.

## Architecture

safeRouterBack берёт запасной маршрут только без истории (глубокая ссылка, холодный старт). /lessons_list — тот же экран вкладки «Уроки»
(re-export (tabs)/lessons), это запасной маршрут раздела по реестру.

## Security and privacy

Нет данных.

## Technical debt

8 экранов со своей кнопкой «назад» — перенос на общую кнопку после кадров Сверки (список в отчёте).

## Verification

Сторож tests/hint_back_fallback_2026_10_26.test.ts (исходник: goBack ведёт в раздел).

## Rollback

Revert коммита.
