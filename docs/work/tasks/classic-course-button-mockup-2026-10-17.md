# Task packet: кнопка «Классический курс» на карте V2 — дорисовать в макет

Governance-ID: TG-9188287C5CEC
Status: In progress
Owner: 3 · МАКЕТЫ (поручение координатора 17.10)
Related epic/enabler: 98f738846 (Дизайн: вкладка «Обучение» открывает карту V2), гейт «приложение = макет»

## Outcome

В эталоне карты V2 появилась кнопка «Классический курс» там же и такой же, как в коде: строка «Урок N» на плашке урока, справа; заливка тоном, без обводки, значок library, текст 13/700, высота 36. Гейт паритета для LearningV2ChaptersCourse сверяет экран с макетом, в котором кнопка есть.

## Scope

В объёме: docs/design/v2-app/learning-v2.html — стиль плашки урока (.plate .kr/.clc/.arcrow), значок library в LP, разметка плашки в snake().
Вне объёма: код приложения (кнопку сделал Дизайн), learn.html. learn.html — макет старого списка со вкладками «Уроки | V2», которые 98f738846 отменил; его обновление — отдельный вопрос координатору.

## Architecture

Реестр visual_parity.json связывает components/learning-v2/LearningV2ChaptersCourse.tsx с learning-v2.html (learning-v2-001 и соседние строки), поэтому кнопка дорисовывается в learning-v2.html. Счётчик «N / 56» уезжает в строку сюжета справа, чтобы освободить место кнопке в строке «Урок N».

## Security and privacy

Не затрагивает: только статичный HTML-макет.

## Technical debt

- Contain: learn.html со вкладками «Уроки | V2» устарел после 98f738846 — сообщено координатору, решение за ним.

## Verification

- Кадр playwright блоков карты (#map-a-b, #map-states) — кнопка в строке «Урок N» справа, ничего не налезает.
- Сверка с кодом: LearningV2ChaptersCourse.tsx kickerRow / classicChip (98f738846).

## Rollback

git revert коммита макета: вернёт плашку без кнопки.
