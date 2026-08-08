# Learning V2: инвентаризация прямого доступа Content Studio к Firestore

Дата аудита: 2026-07-15
Ветка: `codex/learning-v2-pilot`
Область: Phase 0 / Task 0, только правила доступа и тесты. Deploy, новые Firestore namespaces, indexes и callables не выполнялись.

## Итог

Финальный recursive catch-all раньше содержал `allow read, write: if isAdmin()`. В Firestore все совпавшие `allow` объединяются через OR, поэтому этот grant разрешал администратору любой неизвестный путь и отменял смысл точных `if false` блоков. Теперь catch-all содержит ровно один deny: `allow read, write: if false`.

Для 18 новых Learning V2 namespaces добавлены отдельные документирующие deny-блоки. Ещё 14 reused/existing server-only namespaces закрыты deny-only catch-all и проверяются emulator-матрицей. Реальные операции legacy browser admin сохранены только через точные правила; широкого admin prefix/catch-all больше нет.

## Метод и доказательства

- Проверены `firestore.rules`, `admin/legacy.html` и `admin/french-quizzes-workflow.js`; для каждого прямого browser-вызова записаны path, метод и место использования.
- Единый вход legacy admin проверяет custom claim `admin === true`: `admin/legacy.html:14702-14746`. В таблицах ниже роль `admin claim` означает именно этот gate, не email и не UI-флаг.
- Различались Firestore-операции `get`, `list`, `create`, `update`, `delete`. `setDoc`/`batch.set` отмечены как `create/update`, потому что сервер правил выбирает метод по существованию документа. Транзакции разложены на `get + update/create`.
- Collection-group запросы проверены отдельно от document get: `app_message_states` и `promo_redemptions` требуют точного recursive-suffix `allow list`, потому что вложенный document match сам по себе не авторизует collection-group query.
- Typed matrix в `functions/src/content_studio/emulator/v2_authoring_rules.emulator.test.ts` содержит все 78 именованных legacy namespaces и вложенные dynamic surfaces. Это делает пропуск namespace видимым в code review.
- Emulator-only файл исключён из обычного Functions Jest и запускается отдельной demo-only командой. Статический guard перечисляет все root-level recursive wildcard независимо от имени capture-переменной: разрешены только два точных collection-group suffix и один финальный path-wide deny-only блок.
- Поиск 18 V2 names в `admin/` не нашёл прямых browser/mobile Firestore вызовов. Reused factory paths встречаются в `functions/src/**` под Admin SDK/callable enforcement. Число прямых V2 admin Firestore вызовов в проверенных файлах: **0**.

Классификация каждой строки ровно одна:

- `explicit_legacy_allow` — прямой legacy-доступ пока является действующим контрактом и сохранён точным rule.
- `migrate_to_callable` — доступ сохранён для совместимости, но владелец должен перенести действие в callable.
- `remove_after_verified_migration` — старый прямой surface можно удалить только после подтверждённой миграции и проверки UI.

## Legacy direct-access inventory

### Конфигурация, журнал и старые content-control surfaces

| Точный путь | Файл / функция / действие | Фактические операции | Роль | Fallback до → после | Владелец миграции | Классификация |
|---|---|---|---|---|---|---|
| `admin_config/{docId}` | `admin/legacy.html:27397,31876,31912,31930`, support/alerts settings | get, create/update | admin claim | explicit → explicit | Admin Platform | `explicit_legacy_allow` |
| `admin_digest_runs/{id}` | `admin/legacy.html:27346`, `window.loadDailyDigest`, latest run | list | admin claim | global catch-all → exact list | Admin Platform | `migrate_to_callable` |
| `admin_digests/{day}` | `admin/legacy.html:27350`, `window.loadDailyDigest`, daily fallback | get | admin claim | global catch-all → exact get | Admin Platform | `migrate_to_callable` |
| `admin_log/{id}` | `admin/legacy.html:15125,19637,32718-32722,33109`, `logAction`/French audit/load log | list, create | admin claim | explicit → explicit | Admin Platform | `explicit_legacy_allow` |
| `admin_push_jobs/{id}` | `admin/legacy.html:39300,39314,39365,39379,34577-34578`, submit/load/badge | list, create | admin claim | global catch-all → exact list/create | Messaging | `migrate_to_callable` |
| `adminContentDrafts/fr/quiz/{version}` | `admin/legacy.html:19615-19651,19730`; `admin/french-quizzes-workflow.js:177`, French draft batch | create/update | admin claim | global catch-all → exact create/update | Content Studio | `remove_after_verified_migration` |
| `adminContentRollbacks/fr/quiz/{version}` | `admin/legacy.html:19615-19651,19771`; `admin/french-quizzes-workflow.js:242`, rollback batch | create/update | admin claim | global catch-all → exact create/update | Content Studio | `remove_after_verified_migration` |
| `app_meta/{docId}` | `admin/legacy.html:21382,21406,38453,38731`, feature flags/searching aggregate | get, create/update | admin claim | explicit → explicit | Admin Platform | `migrate_to_callable` |
| `remote_config/{docId}` | `admin/legacy.html:18376,28647,29424-31332`, control-panel config | get, create/update | admin claim | explicit → explicit | Admin Platform | `migrate_to_callable` |
| `remote_config_history/{id}` | `admin/legacy.html:29470,29648,29690,29933,30834,30998,31171,31191,31334`, history | list, create | admin claim | explicit → explicit | Admin Platform | `migrate_to_callable` |
| `support_inbox/{id}` | `admin/legacy.html:27396`, `window.loadSupportInbox`, latest 500 | list | admin claim | global catch-all → exact list | Support | `migrate_to_callable` |

### Пользователи, identity, rewards и referral

| Точный путь | Файл / функция / действие | Фактические операции | Роль | Fallback до → после | Владелец миграции | Классификация |
|---|---|---|---|---|---|---|
| `banned_users/{uid}` | `admin/legacy.html:16903,18740,18758,19036,27756,35905,35964,36011,36060`, ban/unban/load | get, list, create/update, delete | admin claim | explicit → explicit | Trust & Safety | `explicit_legacy_allow` |
| `leaderboard/{uid}` | `admin/legacy.html:16638,17493,18742,27738,27758,35874,38977,39540,39575-39595`, inspect/repair/delete | get, list, create/update, delete | admin claim | explicit → explicit | Player Data | `explicit_legacy_allow` |
| `leaderboard_stats/global` | `admin/legacy.html:39042,39127`, global thresholds | get | admin claim | explicit → explicit | Player Data | `explicit_legacy_allow` |
| `name_index/{nameKey}` | `admin/legacy.html:17500`, lookup reserved name | get | admin claim | explicit → explicit | Identity | `explicit_legacy_allow` |
| `public_profiles/{uid}` | `admin/legacy.html:17485-17486`, profile search | list | admin claim | explicit → explicit | Identity | `explicit_legacy_allow` |
| `referral_attributions/{refereeId}` | `admin/legacy.html:15567,15689-15704,19076-19077,35547-35572,35744-35747`, inspect/revoke | get, list, update (transaction) | admin claim | partial+catch-all → explicit admin update | Growth | `migrate_to_callable` |
| `top_helpers/{uid}` | `admin/legacy.html:18385`, helpers board | list | admin claim | explicit → explicit | Support | `explicit_legacy_allow` |
| `user_consents/{uid}` | `admin/legacy.html:27089,27140`, consent audit | list | admin claim | explicit → explicit | Privacy | `explicit_legacy_allow` |
| `user_warnings/{id}` | `admin/legacy.html:18726,27725`, add warning | create | admin claim | explicit → explicit | Trust & Safety | `explicit_legacy_allow` |
| `users/{uid}` | `admin/legacy.html:15315-19105,25237,27739-28703,35455-36013,38976,39440-39611`, search/repair/merge/delete | get, list, create, update, delete | admin claim | explicit → explicit | Identity | `migrate_to_callable` |
| `users/{uid}/shard_log/{id}` | `admin/legacy.html:18302-18305,35554-35567,37168-37169,37322-37323`, audit/reward transaction | list, create | admin claim | nested explicit → nested explicit | Economy | `migrate_to_callable` |
| `users_dedup_archive/{uid}` | `admin/legacy.html:35847-35864`, `window.mergeUserPrompt`, archive source | create/update | admin claim | global catch-all → exact create/update | Identity | `remove_after_verified_migration` |
| `promo_codes/{code}` | `admin/legacy.html:30352,30478-30484`, list and parent lookup | get, list | admin claim | explicit → explicit | Growth | `migrate_to_callable` |
| `users/{uid}/promo_redemptions/{code}` (`collectionGroup`) | `admin/legacy.html:30470-30484`, redemption scan + parent get | list (CG) | admin claim | nested+catch-all → nested + exact CG list | Growth | `migrate_to_callable` |

### Reports, moderation, support и community

| Точный путь | Файл / функция / действие | Фактические операции | Роль | Fallback до → после | Владелец миграции | Классификация |
|---|---|---|---|---|---|---|
| `error_reports/{id}` | `admin/legacy.html:24485,24497,24569,25786,26055-26059,32452,33110,34532-34552`, triage/test report | list, create, update, delete | admin claim | partial+catch-all → explicit admin create | Support | `explicit_legacy_allow` |
| `user_reports/{id}` | `admin/legacy.html:19034-19035,27591,27700-27771,32451,33111,34531,34554-34555`, triage | list, update | admin claim | explicit → explicit | Trust & Safety | `explicit_legacy_allow` |
| `safety_flags/{id}` | `admin/legacy.html:26990,27048,27072,27141`, review flag | list, update | admin claim | explicit → explicit | Trust & Safety | `explicit_legacy_allow` |
| `user_ideas/{id}` | `admin/legacy.html:27831,28048`, idea inbox | list | admin claim | explicit → explicit | Product | `explicit_legacy_allow` |
| `explain_report_entries/{id}` | `admin/legacy.html:28171,28227,28349-28363`, explanation complaint triage | list, update, delete | admin claim | explicit → explicit | Learning Content | `explicit_legacy_allow` |
| `explain_reports/{id}` | `admin/legacy.html:28172,28381`, explanation counters/reset | list, delete | admin claim | explicit → explicit | Learning Content | `explicit_legacy_allow` |
| `website_contact_inbox/{id}` | `admin/legacy.html:17925,32288,32333-32428,34535`, contact inbox | list, update | admin claim | explicit → explicit | Support | `explicit_legacy_allow` |
| `community_pack_purchases/{id}` | `admin/legacy.html:37080-37332`, purchase repair transaction | list, update | admin claim | explicit → explicit | Community | `migrate_to_callable` |
| `community_pack_reports/{id}` | `admin/legacy.html:23265-23347,34536`, moderation | list, update | admin claim | explicit → explicit | Community | `explicit_legacy_allow` |
| `community_pack_submissions/{id}` | `admin/legacy.html:23737-23743,34537`, pending queue | list | admin claim | explicit → explicit | Community | `explicit_legacy_allow` |
| `community_packs/{id}` | `admin/legacy.html:23573,23888-23894`, inspect packs | get, list | admin claim | explicit → explicit | Community | `explicit_legacy_allow` |
| `help_board_topics/{id}` | `admin/legacy.html:22378-23186`, load/create/update topic | get, list, create, update | admin claim | explicit → explicit | Community | `migrate_to_callable` |
| `help_board_comments/{id}` | `admin/legacy.html:22378-23085`, load/create comment | list, create | admin claim | explicit → explicit | Community | `migrate_to_callable` |
| `help_board_reports/{id}` | `admin/legacy.html:22378-22520`, moderation load | list | admin claim | explicit → explicit | Community | `explicit_legacy_allow` |
| `help_board_moderation_queue/{id}` | `admin/legacy.html:22378-22700`, approve/reject | list, update | admin claim | explicit → explicit | Community | `migrate_to_callable` |
| `help_board_restrictions/{id}` | `admin/legacy.html:22378-22520`, restriction load | list | admin claim | explicit → explicit | Community | `explicit_legacy_allow` |
| `help_board_compass_billing/{id}` | `admin/legacy.html:22378-22520`, billing audit | list | admin claim | explicit → explicit | Community | `explicit_legacy_allow` |

### Learning content и динамические cache roots

| Точный путь | Файл / функция / действие | Фактические операции | Роль | Fallback до → после | Владелец миграции | Классификация |
|---|---|---|---|---|---|---|
| `card_packs/{id}` | `admin/legacy.html:34557-34558,38009,38187,38275`, unpublished list/preview/update | get, list, update | admin claim | partial+catch-all → admin OR published | Content Studio | `migrate_to_callable` |
| `daily_phrases/{id}` | `admin/legacy.html:37404-37994`, phrase editor/publish | list, create, update | admin claim | explicit → explicit | Content Studio | `migrate_to_callable` |
| `daily_phrase_save_counts/{id}` | `admin/legacy.html:37405,37731`, save counters | list | admin claim | explicit → explicit | Content Studio | `explicit_legacy_allow` |
| `choice_explanations/{hash}` | `admin/legacy.html:28179-28539`, dynamic cache preview/reset | get, list, delete | admin claim | explicit → explicit | Learning Content | `remove_after_verified_migration` |
| `phrase_explanations/{hash}` | `admin/legacy.html:28179-28539`, dynamic cache preview/reset | get, list, delete | admin claim | explicit → explicit | Learning Content | `remove_after_verified_migration` |
| `mistake_explanations/{hash}` | `admin/legacy.html:28179-28539`, dynamic cache preview/reset | get, list, delete | admin claim | explicit → explicit | Learning Content | `remove_after_verified_migration` |
| `quiz_explanations/{hash}` | `admin/legacy.html:28179-28539`, data/DOM-selected cache preview/reset | get, list, delete | admin claim | explicit → explicit | Learning Content | `remove_after_verified_migration` |

### Arena и leagues

| Точный путь | Файл / функция / действие | Фактические операции | Роль | Fallback до → после | Владелец миграции | Классификация |
|---|---|---|---|---|---|---|
| `arena_profiles/{uid}` | `admin/legacy.html:16348,16516,16569,16636,16718,16899,34572-34573`, resync/cleanup | list, update, delete | admin claim | partial+catch-all → explicit update/delete | Arena | `migrate_to_callable` |
| `arena_session_results/{id}` | `admin/legacy.html:18213-18217`, per-user results | list | admin claim | explicit → explicit | Arena | `explicit_legacy_allow` |
| `arena_sessions/{id}` | `admin/legacy.html:38386,38451,38644,38678,38729,38919,38950,34566-34567`, load/force finish | list, update | admin claim | participant+catch-all → participant + explicit admin update | Arena | `migrate_to_callable` |
| `arena_rooms/{id}` | `admin/legacy.html:38384,38452,38626,38675,38730,38900,38949,34569-34570`, load/delete | list, delete | admin claim | authenticated read+catch-all → read + exact admin delete | Arena | `migrate_to_callable` |
| `matchmaking_queue/{id}` | `admin/legacy.html:38382,38450,38610,38672,38728,38883,38948,34563-34564`, queue cleanup | list, delete | admin claim | owner+catch-all → owner + explicit admin list/delete | Arena | `migrate_to_callable` |
| `arena_rooms_live/{roomCode}` | `admin/legacy.html:39674,39782,39866,39891`, close/delete live room | list, update, delete | admin claim | explicit → explicit | Arena | `explicit_legacy_allow` |
| `arena_room_members/{id}` | `admin/legacy.html:32614-32616,39867-39871`, roster/update readiness | list, update | admin claim | explicit → explicit | Arena | `explicit_legacy_allow` |
| `league_groups/{id}` | `admin/legacy.html:15928,16171,21488,39512,39542,39573-39596`, group repair transaction | get, list, create/update | admin claim | explicit → explicit | Leagues | `migrate_to_callable` |
| `league_chest_events/{id}` | `admin/legacy.html:16299`, chest audit | list | admin claim | explicit → explicit | Leagues | `explicit_legacy_allow` |
| `league_crowns/{id}` | `admin/legacy.html:16300`, crowns audit | list | admin claim | explicit → explicit | Leagues | `explicit_legacy_allow` |
| `league_chat_messages/{id}` | `admin/legacy.html:21483-22250`, load/add/hide/restore | list, create, update | admin claim | explicit → explicit | Leagues | `migrate_to_callable` |
| `league_chat_moderation_queue/{id}` | `admin/legacy.html:21540,21654-21660,22248,34579`, moderation | list, update | admin claim | explicit → explicit | Leagues | `migrate_to_callable` |
| `league_chat_reports/{id}` | `admin/legacy.html:21541,21684,22249,34580`, resolve report | list, update | admin claim | explicit → explicit | Leagues | `migrate_to_callable` |
| `league_chat_bans/{id}` | `admin/legacy.html:21544,21694-21715,22252`, ban lifecycle | list, create, update | admin claim | explicit → explicit | Leagues | `migrate_to_callable` |

### Messages, campaigns, analytics, billing и surveys

| Точный путь | Файл / функция / действие | Фактические операции | Роль | Fallback до → после | Владелец миграции | Классификация |
|---|---|---|---|---|---|---|
| `app_messages/{id}` | `admin/legacy.html:25299-25377,31945-32155`, list/create/update/delete | list, create, update, delete | admin claim | explicit → explicit | Messaging | `migrate_to_callable` |
| `app_messages/{id}/reactions/{uid}` | `admin/legacy.html:29129,29293,32132-32137`, reaction audit/cleanup | list, delete | admin claim | nested explicit → nested explicit | Messaging | `migrate_to_callable` |
| `app_messages/{id}/poll_votes/{uid}` | `admin/legacy.html:28990-28995,29147,29294,32139-32144`, vote audit/cleanup | list, delete | admin claim | nested explicit → nested explicit | Messaging | `migrate_to_callable` |
| `users/{uid}/app_message_states/{messageId}` (`collectionGroup`) | `admin/legacy.html:28998-29004,32147-32152`, state scan/update/delete | list (CG), update, delete | admin claim | nested+catch-all → nested + exact CG list | Messaging | `migrate_to_callable` |
| `global_broadcast_modals/{id}` | `admin/legacy.html:24949-25171`, campaign lifecycle | get, list, create, update | admin claim | explicit → explicit | Messaging | `migrate_to_callable` |
| `app_activity/{id}` | `admin/legacy.html:32906,33843-33847,34224`, activity analytics | list | admin claim | explicit → explicit | Analytics | `explicit_legacy_allow` |
| `app_errors/{id}` | `admin/legacy.html:32869-32977,34574-34575`, diagnostics triage | list, update | admin claim | explicit → explicit | Analytics | `explicit_legacy_allow` |
| `paywall_funnel/{id}` | `admin/legacy.html:20162-20163,20298,31694-31695`, funnel analytics | list | admin claim | explicit → explicit | Growth Analytics | `explicit_legacy_allow` |
| `site_stats/{id}` | `admin/legacy.html:19868-19869,20142`, totals/daily stats | get | admin claim | explicit → explicit | Analytics | `explicit_legacy_allow` |
| `subscription_cancel_surveys/{id}` | `admin/legacy.html:36809-36925`, cancellation feedback | list | admin claim | explicit → explicit | Growth Analytics | `explicit_legacy_allow` |
| `vip_survey_responses/{uid}` | `admin/legacy.html:25431-25432,25650-25651`, VIP feedback | list | admin claim | explicit → explicit | Growth Analytics | `explicit_legacy_allow` |
| `shard_surveys/{id}` | `admin/legacy.html:34755`, survey config | list | admin claim | explicit → explicit | Economy Research | `explicit_legacy_allow` |
| `shard_survey_stats/{id}` | `admin/legacy.html:34756`, survey aggregates | list | admin claim | explicit → explicit | Economy Research | `explicit_legacy_allow` |
| `shard_survey_responses/{id}` | `admin/legacy.html:34840-34852`, responses | list | admin claim | explicit → explicit | Economy Research | `explicit_legacy_allow` |
| `revenuecat_premium_events/{id}` | `admin/legacy.html:19063,20339-20343,25977,34225`, RevenueCat/refund views | list | admin claim | global catch-all → exact list | Billing | `migrate_to_callable` |
| `revenuecat_shard_transactions/{id}` | `admin/legacy.html:19064,20349-20362,34226`, shard revenue views | list | admin claim | global catch-all → exact list | Billing | `migrate_to_callable` |
| `email_contacts/{id}` | `admin/legacy.html:17923`, contact export | list | admin claim | explicit → explicit | Billing Ops | `explicit_legacy_allow` |
| `web_premium_orders/{id}` | `admin/legacy.html:17924`, web order export | list | admin claim | explicit → explicit | Billing Ops | `explicit_legacy_allow` |

Итого: 78 именованных namespaces в typed matrix; вложенные `app_messages/*/{reactions|poll_votes}` и `users/*/shard_log` проверяются дополнительными dynamic cases. Два data-driven root selector-а legacy UI (`cacheCollection` и универсальные revenue/user queries) сведены к перечисленным allowlisted namespaces; произвольного root-rule для них нет.

## V2 и server-only deny inventory

| Группа | Collection | Direct admin get/list/create/update/delete | Серверный путь |
|---|---|---|---|
| New V2 | `content_mode_templates` | denied | callable/Admin SDK |
| New V2 | `content_mode_template_draft_revisions` | denied | callable/Admin SDK |
| New V2 | `content_mode_template_versions` | denied | callable/Admin SDK |
| New V2 | `content_mode_template_lifecycle` | denied | callable/Admin SDK |
| New V2 | `content_season_drafts` | denied | callable/Admin SDK |
| New V2 | `content_season_revisions` | denied | callable/Admin SDK |
| New V2 | `content_season_lifecycle` | denied | callable/Admin SDK |
| New V2 | `content_episode_drafts` | denied | callable/Admin SDK |
| New V2 | `content_episode_revisions` | denied | callable/Admin SDK |
| New V2 | `content_episode_lifecycle` | denied | callable/Admin SDK |
| New V2 | `content_studio_review_queue` | denied | callable/Admin SDK |
| New V2 | `content_studio_localization_units` | denied | callable/Admin SDK |
| New V2 | `content_studio_review_receipts` | denied | callable/Admin SDK |
| New V2 | `content_studio_validation_receipts` | denied | callable/Admin SDK |
| New V2 | `content_studio_waivers` | denied | callable/Admin SDK |
| New V2 | `content_studio_preview_sessions` | denied | callable/Admin SDK |
| New V2 | `content_studio_preview_receipts` | denied | callable/Admin SDK |
| New V2 | `content_app_support_manifests` | denied | callable/Admin SDK |
| Planned reused | `content_factory_stages` | denied | Functions/Admin SDK |
| Planned reused | `content_factory_correction_events` | denied | Functions/Admin SDK |
| Planned reused | `content_factory_artifact_orphans` | denied | Functions/Admin SDK |
| Planned reused | `content_factory_releases` | denied | Functions/Admin SDK |
| Planned reused | `content_factory_catalog` | denied | Functions/Admin SDK |
| Planned reused | `content_factory_catalog_releases` | denied | Functions/Admin SDK |
| Planned reused | `content_factory_release_history` | denied | Functions/Admin SDK |
| Planned reused | `admin_command_operations` | denied | Functions/Admin SDK |
| Existing server-only | `content_factory_jobs` | denied | Functions/Admin SDK |
| Existing server-only | `content_factory_job_units` | denied | Functions/Admin SDK |
| Existing server-only | `content_factory_job_reviews` | denied | Functions/Admin SDK |
| Existing server-only | `content_factory_source_registry` | denied | Functions/Admin SDK |
| Existing server-only | `content_factory_daily_budget` | denied | Functions/Admin SDK |
| Existing server-only | `content_factory_budget_reservations` | denied | Functions/Admin SDK |

## Карта rules до и после

| Surface | До | После |
|---|---|---|
| Неизвестный path | admin read/write через recursive catch-all | deny-only |
| 18 новых V2 collections | совпадали только с permissive catch-all | exact deny block + deny-only catch-all |
| 14 reused/existing server-only | permissive catch-all открывал admin browser | deny-only catch-all; 32×5 emulator matrix |
| 9 legacy unmatched paths | работали только через catch-all | минимальные exact get/list/create/update rules |
| 7 известных masked operations | partial rule OR catch-all | явная admin operation при сохранённой user/participant ветке |
| 2 collection-group list | nested document rule + catch-all | nested write rules + exact recursive-suffix admin list |

Важно: отдельный `allow ... if false` не переопределяет другой совпавший `allow`. Поэтому rollback никогда не должен возвращать глобальный admin catch-all.

## RED / GREEN evidence

Команда (из корня worktree, только demo project; emulator сам запускается и останавливается):

```powershell
npm --prefix functions run test:emulator:v2-authoring-rules
```

- RED до изменения rules: `160 failed, 23 passed, 183 total`. Все 160 deny cases упали по ожидаемой причине: `Expected request to fail, but it succeeded`.
- RED для сужения `matchmaking_queue` до `list/delete`: добавленный admin direct-get тест сначала упал с `Expected request to fail, but it succeeded`.
- GREEN после exact rules, сужения matchmaking и полной legacy inventory matrix: `351 passed, 351 total`.
- Обычная Functions Jest-конфигурация больше не подхватывает emulator-only файл: `npm --prefix functions test -- --listTests --no-cache` возвращает 127 строк общего вывода — 123 пути тестовых файлов и 4 служебные/пустые строки npm; совпадений `*.emulator.test.ts` нет. До добавления исключения список содержал 124 тестовых пути, включая emulator-файл. Запрошенная review-команда `npm --prefix functions exec -- jest --listTests --no-cache` при npm 11 использует корневой Jest config, перечисляет 1302 файла и также даёт 0 emulator-файлов; поэтому отдельно зафиксирован результат реального Functions config.
- Static rules contract:

```powershell
npx jest --runTestsByPath tests/firestore_rules_security.test.ts --no-cache --runInBand
```

Результат: `60 passed, 60 total`. Static guard использует semantic tokenizer для `match`-путей, требует, чтобы единственным `match` на service-level был ровно один `databases/{*}/documents`, защищает 18 explicit-deny и 14 catch-all-only namespace и покрывает generic, duplicate, sibling и wrapper bypass-regressions; безопасные nested lookalike-пути, переименования capture, `match` с whitespace/comments и `allow` с whitespace вокруг пунктуации принимаются.

Functions compile gate:

```powershell
npm --prefix functions run build
```

В текущем HEAD он останавливается на существовавших до Task 0 пробелах ветки: `functions/src/index.ts` уже импортирует отсутствующие в HEAD `arena_timing_observability`, `admin_monthly_decision_pack`, `admin_content_stages`, `admin_content_stage_bulk`, `admin_content_stage_edits`, `content_stage_worker` и ожидает три ещё не экспортированных symbol. Это не ошибка новых rules/emulator файлов: emulator test прошёл TypeScript/Jest transpilation и 351 проверку. Сгенерированные build-артефакты `functions/lib/**` после проверки возвращены к HEAD/удалены.

## Что не выполнялось

- Не было deploy Firebase Hosting/Functions/Rules.
- Не создавались Firestore collections, documents, indexes или production namespaces.
- Не добавлялись callables и не менялся admin UI.
- Emulator использовал только `demo-phraseman-rules`; production project не использовался.
- OpenAI API и project API key не использовались.

## Rollback

1. Восстановить последний проверенный набор **explicit** rules из этого коммита или из последнего зелёного security-rules commit.
2. Если обнаружена пропущенная legacy операция, добавить один exact match и только нужный `get/list/create/update/delete`, затем повторить обе emulator/static команды.
3. Для collection-group query использовать точный recursive-suffix match по конкретному collection ID, не общий recursive grant.
4. Никогда не восстанавливать `allow read, write: if isAdmin()` в `match /{document=**}` и не заменять его другим глобальным/prefix-wide admin allow.

## Находки и предложения

- Переносить в callables сначала paths с `migrate_to_callable`, начиная с identity merges, Arena cleanup и admin writes.
- После подтверждённой миграции удалить старые French draft/rollback и dynamic cache browser surfaces, но только вместе с emulator regression и проверкой UI.
- Исправить отдельным task существующие missing modules/exports в Functions HEAD, чтобы общий `npm run build` снова стал зелёным; это не должно смешиваться с security rules commit.
