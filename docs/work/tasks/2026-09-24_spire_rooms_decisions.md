# Task packet: решения владельца по комнатам/ботам Шпиля (PM-277)

Governance-ID: TG-BAADB109E8CF

## Outcome
Зафиксировать два открытых решения из PM-277 (docs/phraseman-2.0/evidence/PM-277_rooms_and_residents.md), нужные для PM-276 (итог недели).

## Scope
In scope: только запись решения в реестр 2.0 после ответа владельца.
Out of scope: сам код (уже написан субагентом в functions/src/spire_groups.ts, spire_residents.ts).

## Architecture
Без изменений — уточняет поведение уже написанной функции spireLiveZoneSize/зон повышения.

## Security and privacy
Нет.

## Technical debt
Нет нового.

## Verification
Ответ владельца записывается в PROGRESS.md как решение D57/D58, PM-276 использует его при реализации.

## Rollback
Не применимо (решение, не код).
