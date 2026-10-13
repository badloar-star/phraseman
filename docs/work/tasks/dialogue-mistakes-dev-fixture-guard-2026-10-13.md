# Task packet: ошибки диалога — подставной итог (dev_dialog_completion) не пишет в журнал ошибок

Governance-ID: TG-BD6FA4BDE4C2
Status: In progress
Owner: Ядро (сессия 1)
Related: Дизайн 13.10 ~10:50 (п.3); задача dialogue-mistakes-to-journal-2026-10-13.md

## Outcome

- hooks/useDialogueV2MistakeCapture.ts: при подставном итоге (getDevDialogCompletion() != null, только __DEV__) поправки НЕ
  записываются в журнал и не синкаются; хук отдаёт id-заглушки по числу поправок (status 'ready'), чтобы Дизайн мог снять
  кнопку «Добить: Ещё учу (N)»; нажатие в этом режиме ничего не открывает и пишет причину. Журнал [DIALOG-MISTAKES].

## Scope

In scope: hooks/useDialogueV2MistakeCapture.ts. Out of scope: экран итога, dev_dialog_state.ts.

## Architecture

No architecture change.

## Security and privacy

Защищает настоящий журнал ошибок тестового аккаунта от выдуманных поправок съёмки.

## Technical debt

- Заглушки id `dev-fixture:N` живут только в состоянии хука; если появится dev-режим «настоящая отработка на подставном итоге»,
  понадобится отдельный dev-журнал.

## Verification

babel-проверка; тест захвата (dialogue_v2_mistake_capture) без изменений; на эмуляторе dev_dialog_completion=errors — в журнале
[DIALOG-MISTAKES] skip reason=dev_fixture.

## Rollback

Откат коммита.
