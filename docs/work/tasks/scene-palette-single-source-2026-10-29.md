# Task packet: единый источник цветов сцены (Глубокое небо / светлое А)

Governance-ID: TG-676E8E88FA35
Status: In progress (шаг 1 — инвентаризация; закрытие дефекта чёрных пятен светлых grad_* в Диалогах — отдельным коммитом)
Owner: сессия «4 · ТЕМЫ»
Related epic/enabler: вердикт владельца 29.10 «Тёмная тема везде — глубокое небо, светлая — тон темы ярче и глубже, все экраны»

## Outcome

Все экраны со сценой берут цвета из одной функции scenePalette(themeId, appearance, screen), перенесённой 1:1 из JS-эталона Макетов; тёмное — «Глубокое небо», светлое — стратегия А; нет свечений из прозрачного чёрного; на каждом экране лог [SCENE-THEME]; гейт соответствия снимков Сверки эталонным кадрам с порогом в OWNER_LOCKS.

## Scope

In scope: инвентаризация мест расчёта цвета сцены; затем scenePalette и перевод экранов (Главная, Диалоги, Сезон/обложки, приветствие языка, aha, Пик — после проверки git status, файлы Codex через патч в handover); тесты; запись в OWNER_LOCKS.

Out of scope: стили сцен, «вечер», карточки — их владелец не выбирал.

## Architecture

Сейчас цвет сцены считается в нескольких местах (home_scene_tokens, dialogs_scene_tokens, season_art, language_welcome_palette, aha_theme, Пик). Целевое состояние — одна чистая функция без React и тонкие адаптеры; расчёт по эталону docs/design/v2-app/scene-approved-2026-10-29.md.

## Security and privacy

Данные не затрагиваются.

## Technical debt

Pay now: разрозненные расчёты цвета сцены сводятся к одному источнику.

## Verification

Тесты на все темы × оформления; кадры Сверки против эталонных (геометрия и средняя разница); сторож «нет слоёв из прозрачного чёрного».

## Rollback

git revert коммитов шага.

## Сторож тёмного у grad_* (замечание Ревизора к ac9573883, 29.10)

Governance-ID: TG-19F24F5D526D

Outcome: tests/dialogs_scene_light_grad_glow.test.ts проверяет и тёмное оформление grad_*: glowRight/glowLeft равны bgGlow[0]/[1], glowBottom null — тёмное не уедет молча.
Scope: один тест; коммит — вместе со следующим шагом (scenePalette), где сторож перепишется под «Глубокое небо». Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 1: чистая функция scenePalette (Главная и Диалоги), перенос 1:1 из JS макета

Governance-ID: TG-676E8E88FA35

Outcome: components/scene/scene_palette.ts — scenePalette(themeId, appearance, screen): светлое = стратегия А (scenePal макета), тёмное = «Глубокое небо» (STYLES.sky из scene-styles.js на палитре paletteOf); тест tests/scene_palette_parity.test.ts прогоняет код макета (vm) и сравнивает числа на всех темах × оформлениях, разница 0.
Scope: новый чистый модуль и тест; экраны пока не переключаются (шаг 2). Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 1б: страж «Глубокого неба» ближе к эталону, патч для файлов Пика у Codex, геометрия света Диалогов

Governance-ID: TG-ADB191E4E3C3

Outcome: страж контраста «Глубокого неба» в scenePalette считает те же строки пикселей, что guardSky эталона (квантование по слоям и звёзды), и сверяется в parity-тесте с manifest.json; в docs/work/handover/ лежит патч/инструкция для файлов Пика, занятых Codex, и описание геометрии света Диалогов против Главной. Экраны на функцию не переводятся до зелёного parity.
Scope: components/scene/scene_palette.ts, tests/scene_palette_parity.test.ts, документ в docs/work/handover/. Architecture/Security/Debt/Verification/Rollback — как выше.
