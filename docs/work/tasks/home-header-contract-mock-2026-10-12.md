# Task packet: красный контракт шапки Главной — мок useHomePlateStyle

Governance-ID: TG-F30527852CD9
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: tests/home_v2_video_rail_contract.test.cjs, components/home/v2/HomeV2Header.tsx, components/home/v2/homePlate.ts

## Outcome

tests/home_v2_video_rail_contract.test.cjs зелёный: песочница теста знает useHomePlateStyle (шапка стала брать плашки из homePlate после 9ffbfb41a).

## Scope

In scope: мок в тесте. Out of scope: код шапки.

## Architecture

No architecture change.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: красный тест не должен доехать до release:precheck.

## Verification

node --test для этого файла.

## Rollback

Откат коммита.
