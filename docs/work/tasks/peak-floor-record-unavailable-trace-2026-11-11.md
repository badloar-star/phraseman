# Task packet: рекорд этажа Пика «Временно недоступен» — сперва логи

Governance-ID: TG-955BF980FE08
Status: In progress
Owner: сессия «Пик: лист этажа»
Related epic/enabler: none

## Outcome

Лист этажа Пика на эмуляторе показал «Временно недоступен» вместо рекорда. В логе бандлера нет ни одного
вызова `spireFloorRecords` и ни одного `[SPIRE-RECORD]` — загрузка обрывается на немом раннем выходе.
Цель: лог называет причину, по факту чиним первое звено.

## Scope

In scope: `components/spire/peak/use_peak_floor_records.ts` — лог `[SPIRE-RECORD]` на каждом раннем выходе
(нет ключа: флаг `floorRecordsEnabled`, uid, stableId, комната; ворота закрыты) и на успешном ответе.

Out of scope: включение флага в проде, серверная функция рекордов, вид листа.

## Architecture

No architecture change: только логи в существующем хуке, данные и запросы те же.

## Security and privacy

Лог содержит только флаги наличия полей, id недели и язык — без uid, имён и stableId.

## Technical debt

Pay now: немые ранние выходы получают постоянный лог (правило владельца: логи на ранних выходах остаются).

## Verification

Воспроизвести на эмуляторе (Пик → тап по этажу), прочитать `[SPIRE-RECORD]` в логе бандлера.

## Rollback

Откат коммита; на данные не влияет.
