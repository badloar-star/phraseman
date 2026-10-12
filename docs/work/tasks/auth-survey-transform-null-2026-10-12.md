# Task packet: опрос — тот же dev-краш `transform` со значением undefined при смене выбранного варианта

Governance-ID: TG-DD8E06E11CB9
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (разрешение координатора 12.10 на правку закреплённого файла)
Related epic/enabler: продолжение 91758eb36 (краш смены языка; сторож transform_never_undefined_contract)

## Outcome

В шторке опроса смена выбранного варианта больше не роняет dev-сборку: у снятого варианта стиль
`transform: selected ? [{ translateY: RAISED_LIFT }] : undefined` давал processTransform(null) → null.forEach (класс из 91758eb36).
Вид не меняется: пустой массив = «без сдвига», как и прежде. Исключение из сторожа снято — по проекту ноль мест этого класса.

## Scope

In scope: `components/survey/SurveySheetModal.tsx:705` (`: undefined` → `: []`), новый отпечаток файла в
`tests/survey_unavailable_liquid_glass_source_contract.test.mjs` (с причиной), удаление исключения из
`tests/transform_never_undefined_contract.test.mjs`.

Out of scope: прочая логика и вид опроса.

## Architecture

No architecture change: одно значение стиля. Закреплённый файл меняется по разрешению координатора; отпечаток обновляется тем же коммитом.

## Security and privacy

Не затрагивает данные, сеть, авторизацию.

## Technical debt

- Pay now: последнее место класса; исключение из сторожа удалено.

## Verification

- `node --test tests/transform_never_undefined_contract.test.mjs tests/survey_unavailable_liquid_glass_source_contract.test.mjs tests/survey_sheet_liquid_glass_source_contract.test.mjs`.
- Проверка синтаксиса файла опроса.

## Rollback

`git revert`; отпечаток и исключение возвращаются вместе с прежней строкой.
