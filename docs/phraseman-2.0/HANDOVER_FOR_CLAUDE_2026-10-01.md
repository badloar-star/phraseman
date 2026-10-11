# PhraseMan 2.0 — handover для следующей сессии Claude

Дата: 2026-10-01. Репозиторий: `C:\appsprojects\phraseman`. Ветка: `feature/referral-roulette`. HEAD на момент handover: `cdb331c678f8a0c148da1258d88ad4cfe262d380`. Рабочее дерево намеренно грязное и содержит изменения других сессий: не делать `reset --hard`, `checkout`, массовое удаление, commit/push/deploy без отдельного разрешения.

## Как читать состояние

## КРИТИЧЕСКОЕ УТОЧНЕНИЕ ВЛАДЕЛЬЦУ

Этот handover описывает промежуточный Account V2 source/migration workstream, а **не выполненную полную переделку системы аккаунтов**. На момент handover:

- legacy AsyncStorage, legacy auth/session flow и старые экраны всё ещё остаются authority;
- Account V2 не включён глобально и работает только как dual-write/hydration mirror;
- provider handoff, logout, account deletion, multi-device policy и синхронизация не заменены одной новой конечной системой;
- production/device/emulator cutover не выполнен.

Если следующая сессия продолжает только аудиты, миграционные таблицы и source-контракты, она **не выполняет основную задачу владельца**. Следующий исполнитель должен сначала сделать архитектурный inventory старой системы и реализовать новую account/session authority end-to-end, а затем только переносить/удалять legacy-пути по подтверждённым gates. Не объявлять этот документ доказательством завершения полной переделки.

- Полный реестр: `docs/phraseman-2.0/registries/tasks.json` — 276 задач; `done=106`, `review=76`, `planned=79`, `ready_audit=3`, `superseded=12`; acceptance: `accepted=353`, `open=194`.
- `review` означает source evidence с незакрытыми runtime/release/independent-review gates, а не готовность приложения.
- E23 (Account/migration): 12 задач; review: PM-233, PM-235, PM-236, PM-237; planned: PM-234, PM-238–PM-244.
- Живой журнал: `docs/phraseman-2.0/PROGRESS.md`.
- Расширенный журнал: `docs/phraseman-2.0/HANDOVER_2026-09-29.md`.
- Текущий Account V2 status: `docs/work/tasks/account-v2-status-2026-09-30.md`.
- Память/сохранение прогресса: `docs/reports/ACCOUNT_PRESERVED_PROGRESS_INVENTORY.md`.
- Внешние копии handover: `C:\Users\badlo\Documents\Codex\2026-09-22\new-chat\outputs\PHRASEMAN_ACCOUNT_V2_FULL_HANDOVER_2026-09-29.md` и `ACCOUNT_IMPLEMENTATION_STATUS.md`.

## Что сделано в последнем bounded-пакете

### PM-233 — ledger прав/покупок

Evidence: `docs/phraseman-2.0/evidence/PM-233_purchase_ledger.md`. Read-only скан: 39 продуктов/прав, 193 маркера, `uncovered=0`, `stale=0`, `resurrected=0`; node guard `6/6`; production counts/compensation/Firestore/deploy не запускались; `--prod` намеренно отказывается. `local_key:league_gold_theme_unlocked_v1` классифицирован в legacy themes.

### PM-235 — migration compatibility/cutover

Файлы: `functions/src/accounts_v2_migration/compatibility.ts`, `compatibility.test.ts`, evidence `docs/phraseman-2.0/evidence/PM-235_migration_compatibility.md`.

Контракт: `schemaVersion=1`; фазы `legacy → dual_write → v2_cutover → purged`; в dual-write оба протокола допустимы, V2 требует verified hydration; после cutover legacy-write запрещён, после purge legacy полностью запрещён; cutover/purge требуют `ready`, `applyAllowed`, `pendingDomainCount=0`, backup/hydration и правильного rollback window; rollback возможен только до purge при открытом окне. Source gates: migration `7 suites / 187 tests`, ESLint, Functions tsc, no-network closure — PASS. Independent review, device/runtime, Firestore cutover и release — NOT RUN.

### PM-236 — два устройства/idempotency

Файл: `functions/src/accounts_v2_migration/two_device_idempotency.test.ts`; evidence `docs/phraseman-2.0/evidence/PM-236_two_device_idempotency.md`.

In-memory проверены: два устройства (`applied → duplicate`), interruption/resume (duplicate prefix + одноразовый хвост), offline/reconnect и запрет legacy-write после cutover. `stars` остаётся `keep_in_place`, community pack не теряется. Focused `1/3`, полный migration `8 suites / 190 tests` — PASS. Реальный Firebase Emulator/device E2E — NOT RUN.

### PM-237 — backup/restore

Файлы: `functions/src/accounts_v2_migration/backup_manifest.ts`, `backup_manifest.test.ts`; evidence `docs/phraseman-2.0/evidence/PM-237_backup_restore.md`.

`accounts-v2-migration-backup.v1` содержит canonical operations JSON, SHA-256 и entity/operation refs. Restore сначала проверяет schema/hash/refs; tamper отвергается. Наличие файла не считается rollback. Full migration `9 suites / 197 tests`, ESLint, Functions tsc, no-network closure — PASS. Реальный backup/restore Firestore/device и rollback — NOT RUN.

### Android WAL

Пять утверждённых source-файлов и SHA:

- `runtime-probes/android-account-sqlcipher-recovery/probe.ts` — `8EB07FD6AE3F603920CC63D39CB0B35391712A0DB476A43260E312A3EEBA5060`
- `runtime-probes/android-account-sqlcipher-recovery/index.js` — `BE94DFA7403DDE25D5286FDEB7148B1413E2E1C4C6AC3EC761503E0F60BADB76`
- `runtime-probes/android-account-sqlcipher-recovery/run-proof.ps1` — `927307CD988DA0A28EC3C9AF27ACF118C101DA649440F09EBF2C2360420B3E44`
- `tests/account_sqlcipher_wal_recovery_android_runtime_probe.test.ts` — `19F7CA70D42C15A7B88D4551C1A8661EEA2C1C8CD2E16E210C275470AAD0F74A`
- `tests/account_sqlcipher_wal_recovery_android_runtime_entrypoint.test.ts` — `5AF25518ADA54AAFACC71816C7C714E3F72FAAEA6D7068A3289A145BAC75EBA3`

Exact Jest: `2 suites / 443 tests PASS`; ESLint, Node syntax, PowerShell parse, diff check PASS. Это source/contract approval, не device runtime.

## Зафиксированные требования владельца

- XP удалить полностью вместе со всеми связанными контрактами/UI/уровнями/наградами. Старые XP-квитанции только прочитать и закрыть через `shards_6`; XP не восстанавливать.
- Terms/legal убрать упоминания XP, leagues, season pass, season points. Лиги, лиговые бонусы, season pass и season points удалить.
- MAX полностью отсоединить от приложения и bundle: никаких imports/упоминаний/экранов/клиентских вызовов.
- Сервер только для синхронизации/сохранения прогресса, subscriptions, updates, video и notifications; сервер не должен решать поведение приложения.
- Главная уже переделана Claude, новые assets подключены; не переделывать и не удалять новые Main/coin-rank assets.
- Старые assets, shirts, official sets и pearl cosmetics удалить; прогресс за удаляемое не компенсировать. Новые coin-rank assets не трогать.
- 20 coin ranks; диалоги открываются по coin rank; profile card стоит 10 000 coins.
- Learning V1: первые 3 урока бесплатно, остальные платно. Learning V2: первые 2 полных урока бесплатно, остальные платно.
- TTS разрешён во всех местах, где нет готовой озвучки.
- Отдельный язык для каждой стороны обучения не добавлять; отдельный выбор только в карточках, остальные языки следуют настройкам.
- Free: 3 пользовательских набора, 50 карточек, 30 flashcard trainings/month, 30 Spire sessions/month. Plus: unlimited sets, 1500 cards.
- Награда за «Привет» — нет. Старые personal plans удалить. Все существующие учебные аудио можно мигрировать.
- PM-069: старые руны не переводить в coins. PM-070: использовать единый нужный идентификатор coin rank. PM-072 уже описан Claude.
- PM-088: дополнительные energy boosters удалить. PM-140: диалог по coin-rank rule, не прямая покупка. PM-184: улучшенную визитку ещё выбрать; PM-185: визитка 10 000 coins.
- PM-204: все существующие учебные аудио разрешены к миграции. PM-219: personal plans удалить.
- Пользовательские решения Account V2: ядро владеет уроками, карточками/SRS и библиотекой; coins ledger, streak/active days, exams, achievements/stats и unlocked lessons остаются в действующих хранилищах 2.0 (`keep_in_place`). Руны→coins 1:1 — только информационное решение, баланс не копируется.
- Нет компенсации за удаляемые старые данные; не делать реальные удаления без отдельной команды владельца.

## Что ещё обязательно сделать

1. Fresh independent review PM-235/236/237 exact source bytes; не считать registry `review` финальным acceptance.
2. Firebase Emulator + Android двухустройственный прогон: first-login migration, interruption, offline queue, duplicate receipts, old-client return, rights/balance invariants.
3. Реальный backup→restore с проверкой dataset/refs и rollback gate; только после этого обсуждать cutover.
4. Инвентаризация и интеграция production/client Account V2 entrypoints: auth/session/login/logout/device binding, `app/cloud_sync.ts`, Account V2 runtime/hydration, storage, deletion, legacy writers. Отдельно фиксировать «подключено в app» против «только contract/test».
5. Закрыть PM-234 и PM-238–244 по owner decisions; PM-239–242 — только опись branches/worktrees, не удалять ветки автоматически.
6. Проверить iOS/EAS/device gates; скрытый emulator email login не должен попасть в магазинную сборку.
7. Обновить legal/Terms/Privacy фактически после кода. Deploy/functions/rules/indexes/production migration — только отдельной owner-командой после release gates.

## Что нельзя делать

Не использовать project `OPENAI_API_KEY` для Codex chat/review/research/generation; TTS — только при отдельном явном запросе и с `OPENAI_TTS_API_KEY`/guard. Не делать deploy, production reads/writes, real migration, real user deletion, paid API или Firestore purge. Не удалять новые Main/coin-rank assets и не смешивать чужие dirty changes.

## Воспроизводимые команды

```powershell
cd C:\appsprojects\phraseman\functions
npx jest --config jest.config.js --runInBand --watchman=false --no-cache src/accounts_v2_migration
npx eslint src/accounts_v2_migration
npx tsc --noEmit --pretty false --incremental false
cd C:\appsprojects\phraseman
node scripts/pm233_purchase_ledger_dry_run.mjs --check
node --test scripts/pm233_purchase_ledger_dry_run.test.mjs
```

После каждого bounded изменения обновлять `PROGRESS.md`, соответствующий task/evidence и `registries/tasks.json`; явно писать `NOT_RUN` для device/production/release. Не объявлять E23 или Account V2 полностью готовыми.

## Новейший runtime slice — auth → Account V2 coordinator (2026-10-01)

Изменён production caller `app/auth_provider.ts`: после успешного provider sign-in он вызывает `syncAccountsV2ClientAuth(firebaseUid)`, а после Firebase sign-out — `syncAccountsV2ClientAuth(null)`. Глобальный `accounts_v2_client_enabled` не переключён; при OFF lazy runtime не грузится. Layout остаётся страховочным повторным вызовом после первого content frame.

RED→GREEN contract: в `tests/accounts_v2_client_wiring_v2.test.ts` добавлен тест, который сначала падал из-за отсутствующего forwarding, затем прошёл. Focused auth test: 1/1 PASS. Existing hydration/controller gate: `tests/account_v2_hydration_6g_v2.test.ts` 25/25 PASS. Existing producer/app wiring gate: `tests/account_v2_producer_6f_v2.test.ts` 27/27 PASS. ESLint изменённых файлов: 0 errors (есть прежние warnings). Repository-wide TypeScript остаётся NOT_PASS из-за несвязанных Learning V2 content errors; этот slice не добавил новых ошибок.

Текущая архитектурная граница: `modules/account-session-v2/account_session.ts` — типы/fence/reducer-ядро, но legacy AsyncStorage/экраны остаются authority; V2 пока dual-write + hydration mirror, не глобальная замена. Не переключать флаг и не удалять legacy до emulator/device evidence.

## Addendum — изменения после первоначального handover (2026-10-01)

Этот раздел добавлен после исходного handover; его нельзя считать заменой dirty-worktree аудиту.

### Auth → Account V2 FIFO transition

- `modules/account-session-v2/account_v2_auth_transition.ts`: Firebase listener observations теперь входят в тот же FIFO coordinator, что и provider sign-in/sign-out. Внутри очереди есть повторная проверка активного provider transition; drain использует authoritative `ports.currentAuthUid()`, а release выполняется в `finally`, поэтому stale listener UID не открывает чужой scope и очередь не зависает.
- `tests/account_v2_auth_transition_v2.test.ts`: добавлена регрессия back-to-back idle listener observations; suite `12/12 PASS`.
- Общий auth gate после изменения: `5 suites / 94 tests PASS`.
- Независимое ревью: `PASS / APPROVE` (`/root/review_v2_producer_order`).

### Package 8A — root writers and retained metadata

- `scripts/accounts_v2_root_fields_code_census.cjs` + `functions/src/accounts_v2_migration/root_fields_census_guard.test.ts` строят source census корневых writers `users/{id}` и краснеют на новый writer без правила. В production/Firestore не читали.
- `ROOT_RULES` теперь явно классифицирует найденные runtime/service/admin/push/tournament/account-id поля как `keep_in_place` с retention `OD20`; `achievements_state` остаётся `keep_in_place` по `OD8`. Поле `progress` намеренно классифицируется отдельным progress-инвентарём.
- Fresh migration gate после этого slice: `10 suites / 211 tests PASS`.
- Scoped Functions ESLint по inventory/root-guard: `PASS`.
- Отдельный Functions TypeScript gate остаётся `NOT_PASS` из-за несвязанной ошибки `modules/learning-v2/content/source/session_package_from_shard_v1.ts:1018` (`reason: no_card_copy` vs `no_own_exercise`); в затронутых migration-файлах ошибки не обнаружено.

### Flashcard persistence diagnostics

- `hooks/use-flashcards.ts`: каждый guarded `return false` и storage `catch` теперь пишет только безопасную причину (`account_not_current`, `scope_unavailable`, `account_changed_before_commit`, `commit_not_current`, `storage_write_failed`), без UID, текста карточек и snapshot.
- `tests/flashcards_persist_logging_contract.test.ts`: source contract `1/1 PASS`; вместе с `use-flashcards`, hydration и producer gates — `3 suites / 72 tests PASS`.
- Root ESLint для hook и contract test: `PASS`.

### Текущее состояние и ограничения

- Никакого deploy, production migration, Firestore read/write, real-user deletion, device/EAS или OpenAI API не выполнялось.
- Account V2 не объявлен полностью готовым: остаются emulator/device gates, независимое ревью PM-235/236/237, backup/restore runtime и cutover/release approval.
- Ветка и рабочее дерево остаются намеренно грязными; изменения других сессий не принадлежат этому slice. Не делать `reset --hard`, массовое удаление, commit/push/deploy без отдельной команды владельца.

### Последний bounded-срез — same-UID foreground resume (2026-10-01)

- Исправлено `modules/account-session-v2/account_v2_auth_transition.ts`: при включённом gate повторное наблюдение того же linked UID теперь снова проходит через `setSessionUid(uid)`. Здоровый контроллер делает безопасный no-op, а остановленный после transient reauth/fail-closed runner получает штатное возобновление.
- Добавлена production-runtime регрессия в `tests/account_v2_auth_transition_v2.test.ts`: при `uid=A` и `sending=false` повторная foreground-синхронизация обязана вызвать `setAuthUid(A)` и вернуть `sending=true`.
- Проверки после изменения: auth transition `19/19 PASS`; wiring + controller `35/35 PASS`; ESLint изменённых файлов — `0 errors`, только 5 прежних `require()` warnings.
- Независимое ревью: `PASS` — `/root/account_authority_slice_review`; fresh transition `19/19 PASS`, controller `17/17 PASS` (combined `36/36`). Wiring в последнем ремонте не менялся; ранее его gate был PASS. Это всё ещё только вертикальный slice, не полная переделка Account/Auth.

### Начало фактической Account Authority 2.0 переделки (2026-10-01)

- План: `docs/superpowers/plans/2026-10-01-account-authority-2-0.md`.
- Task 1 реализован: `modules/account-authority-v2/account_authority_ids.ts` и `account_authority_contract.ts` вводят раздельные branded IDs для server-owned `accountId`, Firebase UID, provider subject, device/session/operation; добавлен frozen command/result/state contract.
- Task 2 реализован: `modules/account-authority-v2/account_authority_reducer.ts` — чистый reducer с generation/attempt/session fences, fallback при отмене provider, takeover fencing и проверкой preserved-domain commit.
- RED→GREEN gate: `tests/account_authority_contract.test.ts` + `tests/account_authority_reducer.test.ts` — `34/34 PASS`; exact ESLint PASS.
- Независимое read-only ревью `/root/account_authority_slice_review`: `PASS`, P1/P2 не осталось. Проверены forged IDs, phase-safe state, stale auth/takeover/cancel callbacks, overlapping attempts и fallback session.
- Важно: это только завершённые Task 1–2. FIFO runtime, local store, provider/lease wiring, server handlers, migration и удаление legacy ещё НЕ сделаны. Production/device/emulator/deploy/API не запускались.

### Завершённые bounded-пакеты — Tasks 3–4

- Task 3 завершён: `modules/account-authority-v2/account_authority_runtime.ts`, `account_authority_local_store.ts`, `tests/account_authority_runtime.test.ts`; focused Jest `3 suites / 82 tests PASS`, scoped ESLint PASS, fresh review PASS. Durable generation/owner fences, restart-safe destructive tails, boot fail-closed, deferred-owner atomic bind and live-queue backpressure are enforced.
- Task 4 завершён: `functions/src/account-authority/lease_contract.ts`, `lease_handlers.ts`, `delete_contract.ts` и 2 focused suites; Jest `2 suites / 30 tests PASS`, ESLint/Functions TypeScript PASS, fresh critical review PASS. Pure server contracts enforce tenant/device/session/tombstone/retirement/claims/purge/expiry invariants.
- Не считать Account Authority 2.0 завершённым: Firebase adapters, Rules/indexes, `functions/src/index.ts`, scheduler, emulator/device, legacy callsites, migration, production/deploy gates ещё НЕ сделаны.

### Task 5 — provider auth через authority (реализован, fresh independent critical review PASS)

- Изменены `app/auth_provider.ts`, `app/accounts_v2_client_flag.ts`, `modules/account-session-v2/accounts_v2_client_runtime.ts`, `modules/account-authority-v2/account_authority_runtime.ts` и auth-provider/runtime tests.
- Provider callbacks больше не принимают ownership/account/session decisions: credential acquisition — thin adapter, authority runtime — единственный владелец scope/lease transitions.
- Provider failure содержит явный `identityPreserved`: только доказанно неизменённая identity может восстановить A; changed/unknown identity закрывает A, делает provider signOut/release и не может снова открыть stale A.
- Cleanup errors (scope close, provider signOut, lease release) имеют приоритет и больше не маскируются обычным provider error; обычный provider result возвращается только после успешной компенсации.
- Gates: focused aggregate `7 suites / 200 tests PASS`, full TypeScript PASS, scoped ESLint PASS, diff-check PASS. Fresh review `/root/account_authority_auth_task5_review`: PASS, P0/P1/P2 не найдено.
- Global cutover остаётся hardcoded OFF. Production bootstrap с реальными local-store/lease/provider adapters, Functions wiring, Rules/indexes, emulator/device/background и migration evidence ещё НЕ сделаны.

### Следующий фактический пакет — Task 6

- Перенести только preserved domains: lesson progress, saved cards/SRS, card membership/tombstones; XP/leagues/season/arena/retired systems не переносить.
- Не переключать global cutover flag и не удалять legacy до прохождения migration, emulator/device и release evidence.

### Task 6 — preserved-domain migration contract (реализован, fresh independent critical review PASS)

- Созданы `functions/src/accounts_v2_migration/preserved_domains.ts` и `preserved_domains.test.ts`; усилены `compatibility.ts` и его тесты.
- Политика carry ограничена lesson progress, flashcards/SRS и library membership/tombstones; account/coins/streak остаются keep-in-place адаптерами; XP/leagues/seasons/arena/retired domains отвергаются.
- Completion и preserved write требуют mapped `accountId`, verified hydration и полностью валидного compatibility decision без blocking reasons.
- После cutover unknown/missing protocol, phase, operation или non-boolean rollback flag fail closed; cross-field contradictions (legacy sync/purge/rollback window) блокируют client/write/completion/cutover/purge/rollback.
- Gates: focused Jest `3 suites / 47 tests PASS`, scoped ESLint PASS, Functions TypeScript PASS. Fresh review `/root/account_authority_task6_preserved_domains_review`: PASS, P0/P1/P2 не найдено.
- Контракт пока не подключён к реальным callable/cloud_sync/hydration write paths. Authenticated owner→accountId boundary, emulator/device, Rules/indexes/Functions integration, minimum-version rollout, backup/restore, rollback и release gates ещё НЕ сделаны.

### Следующий фактический пакет — Task 7

- Source census и retirement legacy ownership calls только после wiring/migration/emulator/device evidence; сохранять read-only compatibility layer для preserved data, не второй writer.

### Task 7 — legacy ownership census/guard (bounded source gate реализован, fresh independent review PASS)

- Создан test-only guard `tests/account_authority_legacy_callsite_guard.test.ts`; production legacy flows пока не удалялись, global cutover OFF.
- Census охватывает 8 ownership files, 42 категории и 210 классифицированных occurrences; exact provenance — 326 AST ownership callsites + 17 legacy-module imports. Guard использует стабильные normalized AST/provenance hashes, а не только counts.
- Clean-zone включает 11 authority/cutover файлов и binding-aware resolver для named imports, namespace/member aliases, destructured `require`, transitive aliases и deep-relative `/app/...` paths. Cutover gate AST требует фактический return false и отвергает direct true, local shadow и parameter shadow.
- Gates: focused Jest `28/28 PASS`, scoped ESLint PASS, scoped TypeScript PASS. Fresh review `/root/account_authority_task7_legacy_guard_review`: PASS, P0/P1/P2 не найдено.
- Это только source guard: удаление legacy ownership, real authority bootstrap, callable/cloud_sync/hydration wiring, Rules/indexes/Functions, emulator/device, backup/restore, rollback и release gates ещё НЕ сделаны. Полный repo typecheck имеет отдельные известные ошибки `app/cloud_sync.ts:3845, :3847, :3885`.

### Следующий фактический пакет — Task 8

- Закрывать только реальные integration/release gates: bootstrap/adapters, caller accountId binding, Functions/Rules/indexes, emulator/device, backup/restore, rollback window, then owner-authorized cutover.

### Task 8 — bounded bootstrap/source gate (реализован, fresh independent critical review PASS; release НЕ закрыт)

- Создан `modules/account-authority-v2/account_authority_bootstrap_contract.ts`; `modules/account-session-v2/accounts_v2_client_runtime.ts` теперь использует one-shot fail-closed registry вместо loose bootstrap state; добавлен `tests/account_authority_bootstrap_contract.test.ts`.
- Registry требует ровно complete composition `deviceId + lease + localStore + providerSignOut`, запрещает partial/missing/rebind, очищает lease response до проверенных `accountId/sessionId`, маскирует malformed payload и не публикует credential/session/account leakage.
- Integrated bounded gates: Task 7 guard `30/30 PASS`, Task 8 aggregate `3 suites / 26 tests PASS`, scoped strict TypeScript PASS (включая текущий cloud_sync), ESLint exit 0, diff-check PASS, lease method parity `3/3`, local-store parity `13/13`. Fresh review `/root/account_authority_task8_bootstrap_contract_review`: PASS, P0/P1/P2 не найдено.
- Global cutover остаётся hardcoded OFF. Production adapters/callable wiring, Rules/indexes/Functions exports, real hydration/cloud_sync integration, emulator/device, backup/restore, rollback window and owner-authorized release ещё НЕ сделаны.

### Точное состояние после bounded Task 8

- Готово на source/contract уровне: Tasks 1–7 + Task 8 bounded bootstrap/source gate.
- Открыто: реальная composition installation, authenticated owner→accountId boundary, Firebase/Functions/Rules/indexes, old-client/interrupted migration/two-device emulator, Android/iOS runtime, backup/restore, rollback, release and cutover.

### Task 8 callable boundary — source-only contract (fresh critical review PASS)

- Созданы `functions/src/account_authority/callable_boundary.ts` и `callable_boundary.test.ts`; boundary требует auth, валидирует optional App Check metadata без включения enforcement, запрещает client-owned account/device/session fields, выводит identity/delete session через trusted resolver, редактирует ошибки и безопасно проецирует lease/delete results.
- Exact aggregate: `4 suites / 41 tests PASS`, Functions TypeScript PASS, scoped ESLint PASS. Fresh review `/root/account_authority_task8_callable_boundary_review`: PASS, P0/P1/P2 не найдено.
- Намеренно не менялись `functions/src/index.ts`, Firebase adapters, Rules/indexes, emulator/deploy; source-only boundary не является production endpoint. Следующий gate — real adapter/export/Rules/emulator integration.

### Task 3 — FIFO runtime/local store (реализован, fresh independent review PASS)

- Созданы `modules/account-authority-v2/account_authority_runtime.ts` и `account_authority_local_store.ts`; тесты — `tests/account_authority_runtime.test.ts`.
- Runtime теперь имеет один FIFO coordinator: A закрывается до B, sign-out/sign-in сериализуются, same-UID resume не переоткрывает совпадающий scope, revoked lease закрывает scope, старый captured write отклоняется.
- Delete-account вызывает синхронный `clearAccountData` до первого remote await и повтор с тем же `operationId` не чистит локальные данные второй раз.
- Hardening добавил durable monotonic generation, owner/session/generation/stage ledger, atomic reservation и deferred-owner bind, restart-safe destructive tails, boot-time fail-closed protection от более нового B, cleanup при persistence/scope throws и admission backpressure без eviction живых операций.
- Focused Jest: `3 suites / 82 tests PASS`; scoped ESLint: `PASS`. Jest сохранил существующее предупреждение о force-exit/open handle, но exit code `0`.
- Fresh independent read-only review `/root/account_authority_runtime_final_review`: `PASS`, P1/P2 не найдено. Firebase/legacy integration, server handlers, migration, emulator/device, production/API/deploy и полная замена аккаунтов ещё НЕ сделаны.
- Это всё ещё промежуточная стадия основной работы: `auth_provider.ts`, `cloud_sync.ts`, legacy AsyncStorage/stable_id ownership, Firebase/server adapters и cutover пока НЕ переписаны/не подключены.
