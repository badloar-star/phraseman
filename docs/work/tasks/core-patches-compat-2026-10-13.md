# Task packet: совместимость утренних патчей между собой и с HEAD

Governance-ID: TG-200713EFECE8
Status: Done
Owner: Ядро (сессия 1)
Related: координатор 13.10; R1_RUNBOOK_13_16_OCT.md

## Outcome

Патчи политики, апселла, темы (L1 и отдельно L05), «Что нового» и английского интерфейса наложены по очереди во временный
индекс (read-tree HEAD, git apply --cached), в порядке дня сборки. Результат — раздел «Совместимость патчей» в плане.
Устаревший патч английского интерфейса перегенерирован от HEAD тем же содержимым.

## Scope

In scope: временные индексы в scratchpad, раздел плана, handoff/enable_english_ui.patch. Out of scope: рабочее дерево, общий индекс, код.

## Architecture

No architecture change.

## Security and privacy

Не касается данных.

## Technical debt

- Перед днём сборки повторить проверку: HEAD сдвигается, патчи могут устареть снова.

## Verification

git apply --cached --check по цепочкам L1 и L05 + перегенерированный патч на чистом HEAD.

## Rollback

Откат коммита (старый патч вернётся).
