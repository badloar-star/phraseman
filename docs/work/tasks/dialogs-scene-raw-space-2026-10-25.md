# Task packet: голый пробел внутри View сцены Диалогов (крэш-класс, срочно)

Governance-ID: TG-A3D72BCF8D84
Status: In progress
Owner: 2 · ДИЗАЙН (по заданию 0 · КООРДИНАТОР)
Related epic/enabler: none

## Outcome

Мой коммит 3e278380a оставил пробел между `)}` и `{/* light-accent-ok … */}` внутри View в DialogsSceneStage.tsx (строки 131, 136) — текстовый узел вне Text, на Android «Text strings must be rendered within a <Text> component». Цель: пробела нет, сторож jsx_raw_text_guard зелёный, других таких мест в diff 3e278380a нет.

## Scope

In scope: components/dialogs/scene/DialogsSceneStage.tsx (две строки); проверка всего diff 3e278380a.
Out of scope: остальной экран Диалогов.

## Architecture

Комментарий переносится на отдельную строку внутри фигурных скобок, соседнего текста в View не остаётся.

## Security and privacy

Данных не касается.

## Technical debt

Устраняется дефект собственной правки.

## Verification

jsx_raw_text_guard, тест сцены Диалогов, разбор файла парсером.

## Rollback

Откат одного коммита.
