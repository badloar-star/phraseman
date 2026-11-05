Governance-ID: TG-387F4BBEEF27

# Task packet: сторож аудита Пика под новое условие «тур выключен»

## Outcome
Красный тест аудита Пика («?tour=off») после моей правки превью: условие стало `params.tour === 'off' || params.state === 'welcome'` (тур Пика выключен в превью приветствия). Сторож ищет старую строку; делаем его проверкой смысла, не точной строки.

## Scope
Только `tests/spire_peak_audit_2026_11_05.test.ts` (одна проверка). Код превью не меняется.

## Architecture
No architecture change: тест должен подтверждать, что `?tour=off` по-прежнему выключает тур.

## Security and privacy
Не затрагивает.

## Technical debt
Pay now: проверка на смысл (начало условия `params.tour === 'off'`), а не на точную строку.

## Verification
Точечный прогон этого теста и сторожа окон первого входа.

## Rollback
`git revert` коммита.
