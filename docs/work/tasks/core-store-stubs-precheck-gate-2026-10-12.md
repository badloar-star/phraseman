# Task packet: сторож стор-заглушек dev-модулей — блокирующий гейт release:precheck

Governance-ID: TG-63028064EFF7
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10, по dd756cf9a Дизайна).

## Outcome
2387d2a88 добавил экспорт `getDevDialogSend` в `app/dev_dialog_state.ts`, а стор-заглушка
`store_release_stubs/dev_state/dev_dialog_state_stub.ts` его не имела: в стор-сборке каждый ход Диалога упал бы с
«getDevDialogSend is not a function». Дизайн дописал заглушку (dd756cf9a). Сторож паритета экспортов
(`tests/store_release_dev_state_stubs.test.ts`) в release:precheck НЕ входил. Теперь входит блокирующим гейтом
`scripts/store_release_stubs_gate.mjs`: список заглушек берётся из `metro.config.js` (новая заглушка не выпадет из
проверки), для каждой — те же runtime-экспорты, что у настоящего модуля, и ни одного import.

## Scope
In: новый `scripts/store_release_stubs_gate.mjs`, строка в `scripts/release_precheck.mjs`, тест гейта.
Out: сами заглушки (их ведёт Дизайн), конфиг сборщика.

## Architecture
Чистый Node без запуска тестов (без OOM и ложно-зелёного кода выхода). Логика та же, что в jest-стороже: регулярка
`export (async )?(const|function) X` + `export default`.

## Security and privacy
Без данных.

## Technical debt
Регулярка не видит `export { a, b }` и `export class` — как и прежний сторож; при появлении таких экспортов расширить оба.

## Verification
Гейт на HEAD — зелёный; на искусственно урезанной заглушке — красный с именем экспорта (тест гейта на временной копии).

## Rollback
`git revert`.
