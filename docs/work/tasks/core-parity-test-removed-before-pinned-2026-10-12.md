# Task packet: сторож реестра сверки — removed_by_owner проверяется раньше mockup_pinned

Governance-ID: TG-6E82D9FF4F98
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10, от Макетов 70a32e6df).

## Outcome
В `tests/visual_parity_gate.test.mjs` («стартуют pending») ветка `mockup_pinned → ждём pending` стояла раньше ветки
`removed_by_owner`: законно снятая владельцем строка с закреплённым макетом (cards-001, п.55) давала красный. Ветка
removed_by_owner (с обязательной removed_reason) поднята выше. Сторож не слабеет: причина по-прежнему обязательна.

## Scope
In: один тест. Out: реестр, гейт, тест «стор-сборка вырезает Learning V2» (зеленеет только патчем r1_cut_v2 после «да»).

## Architecture
Перестановка двух веток проверки.

## Security and privacy
Без данных.

## Technical debt
Тест «стор-сборка вырезает Learning V2» красный до решения владельца по выреза V2.

## Verification
node --test tests/visual_parity_gate.test.mjs: тест реестра зелёный; красный остаётся только тест выреза V2.

## Rollback
`git revert`.
