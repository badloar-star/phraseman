# Task packet: D74 — серверная Арена отключена в коде, пул Шпиля сохранён

Governance-ID: TG-8011681FEC7E
Status: In progress
Owner: subagent session «D74 arena server tombstones»
Related epic/enabler: D74 (docs/phraseman-2.0/03_DECISIONS.md), PM-221

## Outcome

Клиентские callable Арены отвечают fail-closed надгробием `arena_retired` без чтения и записи Firestore; крон `arenaV2CleanupHourly` и триггер `arenaV2OnQueueWrite` сняты с экспорта, поэтому следующий деплой (делает владелец) удалит их и перестанет тратить деньги. Шпиль продолжает собирать недельные пакеты из того же пула заданий.

## Scope

In scope: новый файл `functions/src/arena_retired.ts` (надгробия), блок экспорта Арены в `functions/src/index.ts`, классификатор `scripts/pm221_server_domain_map.mjs` и перегенерированная карта `docs/phraseman-2.0/evidence/PM-221_server_domain_map.md`, ратчет `tests/d74_arena_server_retired.probe.ts`, контрактные тесты, сторожившие живую Арену.

Out of scope: удаление реализации (`arena_v2.ts`, `arena_expansion.ts` — не трогаются, CLAUDE.md запрещает откат файлов Арены), клиентское приложение, деплой, облачные данные, `PROGRESS.md`, `registries/tasks.json`.

## Architecture

Сейчас: index.ts экспортирует 48 callable + 1 крон + 1 триггер прямо из `./arena_v2` и `./arena_expansion`. Станет: те же 48 имён экспортируются из `./arena_retired` (одна фабрика надгробия), фоновые функции не экспортируются. Админские функции пула (`adminArenaConfig*`, `adminArenaContent*`, `adminArenaPublication*`) остаются живыми — они ведут `arena_v2_config/current.targetPublications`, который читает `spire_pack_build.ts`. Библиотечные модули Арены, импортируемые Шпилем, не меняются.

## Security and privacy

Надгробие бросает `failed-precondition` до любой работы с данными; лог содержит только имя функции, без uid и данных запроса. Секреты HMAC Арены надгробию не выдаются. App Check не включается (пломба владельца). Новых данных не собирается — правка privacy policy не нужна.

## Technical debt

- Contain: реализация Арены остаётся на диске неэкспортированной; ратчет `tests/d74_arena_server_retired.probe.ts` не даёт вернуть экспорт из `./arena_v2`/`./arena_expansion` и фоновые функции. Выход — отдельная команда владельца на физическое удаление или возврат Арены.

## Verification

`npx tsx tests/d74_arena_server_retired.probe.ts`, `npx tsx tests/pm221_server_domain_map.probe.ts`, `npx tsx tests/server_remote_event_allowlist.probe.ts`, `node tests/server_decision_atlas_contract.mjs`, `npx tsx tests/season_progression_server_retired.probe.ts`, точечные jest по затронутым контрактным тестам и тестам Шпиля.

## Rollback

Вернуть в index.ts экспорт из `./arena_v2` и `./arena_expansion` (блок сохранён в комментарии), удалить `arena_retired.ts`, задеплоить. Данные пользователей не трогаются, поэтому откат без потерь.
