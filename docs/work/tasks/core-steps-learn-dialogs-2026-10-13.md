# Task packet: шаги ссылок learn-012/013/031/032 и dialogs-041 по разбору Ядра (712ceea64)

Governance-ID: TG-192AF758716C
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (генератор ссылок; поручение координатора, разбор Ядра 13.10)

## Outcome

- learn-012: `lessonGates=real&lessonsDone=2` (ворота как в релизе при Plus; при 8 уровень A2 «достигнут» → экран зачёта) — окно «Уровень пока закрыт».
- learn-013: `plus=off&legacyCap=8&lessonsDone=2` — окно «Недоступно» без пейвола.
- learn-031/032: после слов — `tap:#lesson1-check` (автопроверка выключена по умолчанию).
- dialogs-041: `dev_dialog_end=on` + тап по вуали конца — итог «Диалог пройден» (endedBy='bot'); «Завершить» из меню давал «Разговор завершён».

## Scope

In scope: scripts/dev_links_r1_steps_chain7.py, пересборка DEV_LINKS_R1 (только эти строки — реестр чужой может быть незакоммичен).
Out of scope: подмены (Ядро 712ceea64).

## Architecture

add() в модуле chain7.

## Security and privacy

Подмены только в памяти; dialogs-041 локально отметит сценарий пройденным (как живое прохождение), сети нет.

## Technical debt

- Contain: нет.

## Verification

Генератор; prod_write_guard; селекторы есть в коде (lesson1-check, dialogue-v2-session-end-veil).

## Rollback

Откат коммита.
