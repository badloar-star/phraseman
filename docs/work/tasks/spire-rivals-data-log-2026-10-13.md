# Task packet: Шпиль — соперники «кто на этаже / выше / ниже»: откуда данные (сперва логи)

Governance-ID: TG-614529FFC4B5
Status: In progress
Owner: Ядро (сессия 1) — данные; Дизайн — отрисовка и прокрутка
Related: задача владельца через координатора 13.10; кадр docs/phraseman-2.0/evidence/spire_tiers/tier_000.png (у этажей ни
монет, ни «+N»; в карточке этажа только сам игрок «Н»)

## Outcome

- Разбор пути данных (без правок): комната недели читается УЖЕ одним документом — `spireSyncRoom` (app/spire/spire_room_client.ts):
  вступление `spireJoinRoom` при первой встрече недели → один `getDoc` комнаты → кэш AsyncStorage + память, обновление не чаще
  `SPIRE_ROOM_REFRESH_MS`, при входе в Шпиль. Строки — `spireBuildRoomRows` (живые из комнаты + жители-боты формулой из
  roster, без чтений), соперники по этажам — `spireRivalsByFloor` (себя исключает). Новых запросов не нужно.
- app/spire/use_spire_game.ts: журнал `[SPIRE-RIVALS]` в logcat (console, а не DebugLogger — журналы кадров Сверки
  снимают logcat): источник комнаты (status/reason, кэш или сеть), groupId, живых/лиц ботов, rows.length, распределение
  соперников по этажам (без себя), свой этаж. Одна строка на смену строк.
- Диагноз и починка — по фактам журнала с эмулятора.

## Scope

In scope: журнал в use_spire_game.ts. Out of scope: отрисовка соперников и прокрутка башни (Дизайн), сервер комнат.

## Architecture

No architecture change.

## Security and privacy

В журнал идут только счётчики и номер комнаты; имён и uid соперников нет.

## Technical debt

- Журнал комнаты в spire_room_client идёт через DebugLogger и в logcat не виден — при следующей правке клиента продублировать
  ключевые строки в console.

## Verification

babel-проверка; use_spire_game ≤ 400 строк (сторож spire_game_source_contract); кадр с журналом [SPIRE-RIVALS].

## Rollback

Откат коммита.
