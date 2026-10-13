# Task packet: dev-итог диалога на языке интерфейса (9 языков) вместо русского «(dev)»

Governance-ID: TG-444AC661B671
Status: Done
Owner: Ядро (сессия 1)
Related: координатор 13.10; EN-проход 368463202 строка 18 (en-dialog-completion-001)

## Outcome

Подставной итог диалога (dev_dialog_completion=clean|errors) показывал оценку, совет, цели и исправления по-русски с пометкой «(dev)» —
на английском прогоне кадр не совпадал с образцом. Теперь тексты на языке интерфейса из input.interfaceLang (9 языков), без «(dev)»
в видимом тексте; факт подмены пишется в журнал [DEV-STATE]. Настоящий путь (dialogueV2SessionComplete) не меняется.

## Scope

In scope: app/dialogue_v2_completion_client.ts (devCompletionResult). Out of scope: сервер, экран итога.

## Architecture

No architecture change.

## Security and privacy

Только dev-подмена; данных не касается.

## Technical debt

- Английские фразы ученика в подмене (Hello / I want table) — учебный материал, не переводятся.

## Verification

Тест dev-подмены итога + сканеры переводов.

## Rollback

Откат коммита.
