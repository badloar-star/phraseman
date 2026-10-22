# Task packet: задания №23 — убрать переходник localizedMeaning, чинить зависимости тестов тела заданий

Governance-ID: TG-287FBBD6EC3E
Status: В работе
Owner: 2 · ДИЗАЙН (продолжение tasks-1to1-2026-10-22; просьба Learning V2 22.10: смысл фразы берёт правило из кавычек задания, `localizedMeaning` в выпуске равен тексту задания)
Related epic/enabler: реестр №23

## Outcome

Хук `useLearningV2TaskParts` передаёт данные задания в правило Learning V2 как есть, без переходника `localizedMeaning` → смысл. Тесты режимов не тянут тему и переводы (заглушки), экспорт `lv2TaskPlateStyle` остаётся в layout-токенах. Мера успеха: tsc и целевые тесты зелёные, в коде нет `withRequiredPhraseMeaning`.

## Scope

In scope: components/learning-v2/LearningV2TaskBody.tsx (удалить переходник), tests/learning_v2_mode_feedback_lane.test.tsx (данные теста по форме выпуска: смысл в кавычках задания), токены (learning_v2_task_theme_tokens.ts, learning_v2_task_layout_tokens.ts), карточка нового слова (высота 245, закладка 14).

Out of scope: само правило разбора (Learning V2).

## Architecture

Границы те же: режимы → общее тело → чистая функция правила. Лёгкие токены вынесены в отдельный файл, чтобы тело заданий не тянуло ThemeContext.

## Security and privacy

Не затрагивается: данных не собираем, сетевых вызовов нет.

## Technical debt

Нет: переходник, добавленный на час, удаляется до первого коммита.

## Verification

tsc, tests/learning_v2_task_body_*.test.ts, learning_v2_mode_feedback_lane, learning_v2_audio_replay_buttons, learning_v2_task_chrome_contract; склейки Сверки.

## Rollback

Откат: revert коммита; данные не затрагиваются.
