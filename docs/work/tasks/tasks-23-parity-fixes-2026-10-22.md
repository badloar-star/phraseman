# Task packet: задания №23 — расхождения Сверки: поля 20, тёмная кнопка нового слова

Governance-ID: TG-6B2317E963F7
Status: В работе
Owner: 2 · ДИЗАЙН (координатор 22.10: расхождения №23 по склейкам Сверки в C:/Temp/claude/png/parity/diff2)
Related epic/enabler: реестр №23, docs/work/tasks/tasks-1to1-2026-10-22.md

## Outcome

Поля шапки и тела заданий — 20 (макет `--pad` 20, измерено ≈ 16,5); кнопка «Понятно →» нового слова — тёмная плоская, как `.nw .tcta`. Остальные пункты Сверки разобраны по коду макета: дорожка прогресса и нижняя панель в макете есть (тёмная склейка снимала класс th-ink и теряла переменные темы), «Проверить» активна и при неполной фразе, тексты «Вставь слово» и «Ситуация» у «Слушай-выбери» — данные правила Learning V2.

## Scope

In scope: LearningV2TaskChrome (поля шапки), LearningV2PracticeViewport (поля тела), LearningV2NewWordEncounterOverlay (кнопка), LearningV2TaskBody (кнопка принимает подпись для доступности и значок справа).

Out of scope: правило разбора текста заданий (Learning V2), токены тёмной темы эталона (4 · ТЕМЫ).

## Architecture

Границы прежние: общая кнопка заданий используется и в новом слове; цвета — токены learning_v2_task_theme_tokens.

## Security and privacy

Не затрагивается: данных не собираем, сетевых вызовов нет.

## Technical debt

Нет.

## Verification

tsc, tests/learning_v2_new_word_encounter_overlay, learning_v2_task_chrome_contract, tests тела заданий; склейка Сверки в th-ink и на уровне «Максимум».

## Rollback

Откат: revert коммита; данные не затрагиваются.
