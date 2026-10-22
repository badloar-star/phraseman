# Task packet: подключение разбора строки задания Learning V2 к телу заданий по «Предлагаем»

Governance-ID: TG-8A6280F729AD
Status: В работе
Owner: 2 · ДИЗАЙН (продолжение v2-tasks-body-proposed-2026-10-22; Learning V2 передал чистые функции task_prompt_parts_v1)
Related epic/enabler: реестр №23

## Outcome

Режимы заданий берут «что сделать», значок, ситуацию и цель из чистых функций Learning V2 (modules/learning-v2/runtime/task_prompt_parts_v1.ts) вместо своей эвристики; единый источник текстов на 9 языках. Мера успеха: «Собери фразу» (первый режим) показывает «Собери фразу», карточку «Ситуация» и крупную цель; остальные режимы переводятся на то же по очереди.

## Scope

In scope: components/learning-v2/LearningV2TaskBody.tsx (хук useLearningV2TaskParts, начало тела от parts), modules/learning-v2/modes/mode_contract_v1.ts (необязательный interactionId), app/learning_v2_direct_session_player_v1.tsx (передача id задания в режимы, 2 строки), phrase_builder_mode_v1.tsx, тесты.

Out of scope: сами функции разбора и контент (Learning V2), остальные режимы (отдельные коммиты).

## Architecture

Без смены границ: чистая функция разбора вызывается в режиме через useMemo; interactionId — необязательное свойство общего контракта режима (одобренные тексты макета ищутся по id, без id работает правило). Функции Learning V2 не читают сеть и хранилище.

## Security and privacy

Не затрагивается: данных не собираем, сетевых вызовов нет.

## Technical debt

- Contain: зависимость от нового файла Learning V2 (task_prompt_parts_v1.ts, пока не закоммичен их сессией) — мой коммит режимов не должен опережать их коммит; owner: 2 · ДИЗАЙН / Learning V2.

## Verification

- tests/learning_v2_task_body_proposed_2026_10_22.test.ts, контракты режимов и оболочки, проверка типов.

## Rollback

Откат: revert коммита; данные не затрагиваются.
