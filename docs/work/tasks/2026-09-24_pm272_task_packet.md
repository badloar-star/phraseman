# Task packet: Шпиль: сборка пакета недели (PM-272)

Governance-ID: TG-PM272-SPIRE-WEEKLY-PACK
Status: Review
Owner: Claude Opus 5.5 (субагент)
Related epic/enabler: E25 / PM-272 (docs/phraseman-2.0/registries/tasks.json)

## Outcome

Раз в неделю сервер собирает файл пакета «язык × шпиль»: этажи 1..15, ступени по
`spireStepsForFloor`, по 3 набора из 10 заданий, отпечатки ответов в формате Арены.
Устройство скачивает файл один раз в неделю и играет ступени без сети, а
`spireReportSteps` сверяет `packHash` из customMetadata файла. Мерило успеха:
для каждого языка с опубликованным пулом на текущую и следующую неделю лежит
`spire_packs/{lang}/{tier}/{weekId}.json` с `packHash`, и отчёты не уходят в `pack_unknown`.

## Scope

In scope:
- `functions/src/spire_pack_contract.ts` — чистая сборка;
- `functions/src/spire_pack_build.ts` — крон, админ-callable, запись в Storage;
- `functions/src/spire_pack_contract.test.ts`;
- `functions/src/index.ts` — экспорт;
- `storage.rules` — правило `spire_packs`;
- записи в `docs/phraseman-2.0` (реестр, evidence, журнал).

Out of scope:
- клиентское скачивание и кэш пакета (PM-279/PM-273);
- слух, диктант и голос (PM-286, источник звука не решён);
- публикация контуров es/de/fr (PM-287, отдельная сессия);
- любые правки файлов Арены (только чтение и переиспользование чистых функций);
- деплой.

## Architecture

Источник — живой пул Арены `tournamentTasks` той же публикации
(`arena_v2_config/current` → `resolveArenaTargetPublication`). Выборка и проверка
повторяют `loadArenaTaskPool`. Публичная форма задания и отпечатки берутся из
`toPublicTournamentTask`, объяснения вырезаются, как в `arenaPlanTask`. Соль
отпечатков — `saltId` пакета, а не `matchId`. Пакет детерминирован, поэтому
повторная сборка того же пула даёт тот же хеш. Существующий файл недели
перезаписывается только с `force`. Инвариант: `packHash` лежит в customMetadata,
его читает `resolveExpectedPackHash`.

## Security and privacy

- Персональных данных в пакете нет: только учебные задания без ответов.
  Правильные ответы в открытом виде не отдаются, только перечислимые отпечатки,
  как в Арене (это подсказка для интерфейса, а не защита от читов).
- Storage: `spire_packs/**` — `get` только для вошедшего, `list` и запись
  клиентам запрещены. Пишет только Admin SDK.
- Admin-callable: claim `admin: true` + permission `application.config.write`.
  App Check не форсируется: действует пломба `APP_CHECK_SEALED_BY_OWNER_2026_08_17`,
  опции `ADMIN_SENSITIVE_WRITE_OPTIONS` взяты как есть.
- Privacy Policy не затронута: новых данных пользователя не собирается.

## Technical debt

- **Pay now:** флаги PM-287 читаются через его контракт (`parseSpireTaskFlagsDoc` +
  `spireFlaggedTaskIds`), своей копии разбора нет.
- **Contain:** раскладка режимов и формула трудности заданы константами в коде.
  Выход: перенести в `config/spire_v1`, если владелец захочет менять их без релиза.
- **Accept temporarily:** слух, диктант и голос отсутствуют (`pendingKinds`,
  `voiceRequired: false`). Владелец решает источник звука (PM-286).

## Verification

- Штатный тест-раннер и проверка типов не запускались (условие задачи, светофор).
- `tsx`-смоук в scratchpad: 7/7 утверждений `spire_pack_contract.test.ts`
  на мини-шиме; синтетический пул 4050 заданий — 135 ступеней, 0 повторов внутри
  ступени, хеш детерминирован. Импорт `spire_pack_build.ts` проходит.
- `docs/phraseman-2.0`: `tools/render_views.py` + `tools/validate.py` — 0 ошибок.
- Дальше: `npm run test:one -- functions/src/spire_pack_contract.test.ts` и
  точечная проверка типов functions/ в следующей сессии со слотом.

## Rollback

Функции новые, чужие данные они не меняют. Откат — снять два экспорта в
`functions/src/index.ts` и удалить функции при деплое. Файлы в Storage
`spire_packs/**` можно удалить: тогда отчёты игроков честно уйдут в `pack_unknown`,
а локальный прогресс на устройстве не стирается (TOWER_CONTRACT §5).
Правило `storage.rules` безопасно откатывается удалением блока (default deny).
