# Task packet: D78 — удалить серверную Арену, текстового репетитора и dev-выдачи из кода

Governance-ID: TG-B5B0472E6E1B
Status: In progress
Owner: сессия Claude (субагент), владелец badloar@gmail.com
Related epic/enabler: docs/phraseman-2.0/03_DECISIONS.md D74, D78, D79, D81; предыдущий шаг d74-arena-server-retired.md

## Outcome

Владелец решил: удаляемое удаляем из кода целиком (реализация, экспорт, тесты), а не
оставляем заглушками. После задачи в точке входа функций нет ни одного
arena-callable/cron/trigger (кроме 8 админских функций пула, которым питается Шпиль),
нет текстового репетитора `tutorText*` и dev-выдач `devRunesGrant`, `devShardsGrant`,
`referralDevGrantSpin`. Успех = ратчет-проба `tests/d74_arena_server_retired.probe.ts`
(«удалено») зелёная, тесты Шпиля и пула зелёные.

## Scope

In scope: `functions/src/arena_v2.ts`, `arena_expansion.ts`, `arena_retired.ts` и
библиотеки, которые импортирует только удаляемый код; `functions/src/tutor_text_*`;
`functions/src/dev_runes_grant.ts`, `dev_shards_grant.ts`, `referral_dev_grant*.ts`;
их тесты; экспорт в `functions/src/index.ts`; клиентские `app/tutor_text_memory_callable.ts`,
`app/dev_runes_grant.ts`, `app/dev_shards_grant.ts` и их вызовы; тесты-контракты,
читающие удалённые файлы (точечная правка).

Out of scope: клиент Арены `app/arena_client.ts` и экраны Арены (отдельный шаг);
реферальная рулетка (D80 — остаётся); `dialogueV2Freeform*`; деплой.

## Architecture

Шпиль (`functions/src/spire_*`) читает опубликованный пул заданий через
`arena_v2_core`, `arena_target_registry`, `arena_target_quality`, `arena_stars_v3`,
`tournament_core`, `tournament_pool_publication` и админские функции пула
(`admin_arena_config/content/publication`). Эти модули и их транзитивные импорты
остаются. Удаляется только то, что после снятия `arena_v2.ts`/`arena_expansion.ts`
никто не импортирует (проверяется rg).

## Security and privacy

Удаление снижает поверхность атаки: исчезают callable, писавшие в Firestore, и
dev-выдачи валюты. Новых данных не собирается; Privacy Policy не меняется.

## Technical debt

- Pay now: заглушки D74 (`arena_retired.ts`) удаляются вместо «надгробий».
- Contain: ратчет `tests/d74_arena_server_retired.probe.ts` не даёт вернуть экспорт.
- Accept temporarily: клиент Арены всё ещё зовёт удалённые callable — отдельный шаг D78.

## Verification

`npx tsx tests/d74_arena_server_retired.probe.ts`, `npx tsx tests/server_remote_event_allowlist.probe.ts`,
`node tests/server_decision_atlas_contract.mjs`, `npx tsx tests/season_progression_server_retired.probe.ts`,
`npx tsx tests/firestore_listener_allowlist.probe.ts`, `functions/src/spire_*.test.ts`,
`functions/src/admin_arena_publication.test.ts`, typecheck functions.

## Rollback

`git revert` коммита удаления возвращает файлы; данные в Firestore не трогаются.
