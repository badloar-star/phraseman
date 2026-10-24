# Task packet: «Свободный разговор» висит на «•••» после реплики (скрин владельца 24.10, iOS, испанский)

Governance-ID: TG-0EF4C53DC2FE
Status: Done — клиентская часть (23 + 2 набора зелёные, кроме чужого dialogue_v2_plus_tools); сервер и «не понимаю» — у Ядра и владельца
Owner: 5 · ВХОД И АККАУНТ (координатор 24.10)

## Outcome

ИИ «¡Hola! ¿De qué te gustaría hablar hoy?» → «Hi how are you» → «Me temo que no te sigo» → «Teach me» → вечные «•••». Владелец:
«не должно быть зависаний». После правки «•••» никогда не висит дольше потолка вызова: по потолку — плашка «не получилось» с
«Повторить». Логи [FREEFORM-HANG] показывают отправку, ответ (время), отказ (код, причина), тайм-аут и что увидел человек.

## Scope

- app/dialogue_v2_freeform_client.ts — потолки вызовов (старт 22 с, ход 32 с; сервер 20/30 с), логи [FREEFORM-HANG].
- app/dialogue_v2_freeform.tsx — лог «что показали», отказ хода «нет согласия» → окно согласия.
- tests/dialogue_v2_freeform_hang_contract.test.ts — сторож потолков и логов.

Не в scope: серверная причина долгого хода (Ядро, по логам); «не понимаю» на английскую реплику — это местный ответ клиента
по правилу владельца 18.10 (detectDialogueOffLanguage), менять поведение — только по решению владельца; промпт ИИ — Ядро.

## Architecture

httpsCallable получает { timeout } как у сценарного старта (dialogue_v2_turn_client: 22 с). По потолку вызов падает
deadline-exceeded → существующая ветка сбоя хода (setTurnFailed → плашка DialogueGlassSysError с «Повторить», sending=false).

## Security and privacy

Новых данных нет. В логах — id хода, длина текста, код и время, без текста реплик.

## Technical debt

Почему сервер долго отвечает на «Teach me» — выяснит Ядро по логам [FREEFORM-HANG] и серверным.

## Verification

babel.parseSync, тесты свободного разговора, новый сторож, срез типов.

## Rollback

git revert коммита.
