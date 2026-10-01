# Account System V2 — статус Claude-сессии, 2026-09-30

> ПОСЛЕДНЕЕ (TG-9B994CA6B1FF): КЛИЕНТСКИЙ ПАКЕТ СИНХРОНИЗАЦИИ ПРИНЯТ. modules/account-session-v2/account_sync*.ts (+ _transport, _clock, _srs_reissue, _batching, _outbox_records, _outbox_effects, _outbox_followups, _runner_ports) выполняет серверный контракт: conflict/rejected окончательные; решение по details.final; карантин только при ≥5 неудачах И ≥24 ч, возвратный (requeue); учёт неудач на диске; операции одной сущности в одном пакете, baseRevision не переписывается; гибридные часы SRS с верхней границей; перевыпуск SRS внутри markResolved; срок жизни 170 сут по двум оценкам (отрицательная = ложная). 3 ревью + 3 ремонта, итог SPEC APPROVE + SEC APPROVE (условие закрыто). Тесты: app 361/361, functions 388/388. Файлы в общем снимке efe19ae9d; firestore.rules с accounts_v2 — d9f615758 (коммиты сессии ef683a).
> Остаточный риск (TEMP): часы вперёд на 10–170 сут → возможен повтор после TTL квитанций; закрыть серверной проверкой возраста операции.
> СЛЕДУЮЩИЕ ШАГИ: (1) Пакет 5 — read-only inventory + dry-run миграции (жемчуг/XP dropped); (2) Пакет 4 — протокол удаления аккаунта; (3) серверная проверка возраста операции; (4) лаунчер WAL-кампании на эмуляторе; (5) Пакет 6 — интеграция за выключенным флагом.
>
> ПРЕДЫДУЩЕЕ (TG-831C22D22486, шаг 2): firestore.indexes.json — fieldOverrides: accounts_v2_ops {expireAt ttl:true, operationIdJson, fingerprint} и accounts_v2_entities {stateJson, entityIdJson, lastOperationIdJson} без индексов; сторож rules_guard.test.ts проверяет и это (4 теста). jest src/accounts_v2_ — 368/368, eslint чисто. Не задеплоено. СЛЕДУЮЩИЙ ШАГ: клиентский пакет — modules/account-session-v2/account_sync*.ts: исходы квитанций conflict/rejected{code}, решение по details.final, retryAfterMs не тратит попытку, потолок 5 → карантин, операции одной сущности в один пакет, базу не переписывать, SRS updatedAtMs гибридные часы + serverNowMs, removeItemIds; паритет-сторож сервера обновить.
>
> ПРЕДЫДУЩЕЕ (правила): правила Firestore — `match /accounts_v2/{document=**}` с `allow read, write: if false` + `collection != 'accounts_v2'` в админском catch-all; сторож functions/src/accounts_v2_adapter/rules_guard.test.ts (3 теста). jest src/accounts_v2_ — 11 suites, 367/367. Правила НЕ задеплоены. Следующий шаг: firestore.indexes.json fieldOverrides (исключить *Json и fingerprint из индексов для групп accounts_v2_entities/accounts_v2_ops) + TTL-политика (записать в документ деплоя), затем клиентский пакет.
>
> ПРЕДЫДУЩЕЕ (TG-7B595477E599): Пакет 3A-srv (Firestore-адаптер + callable, functions/src/accounts_v2_adapter/, не подключён к index.ts) — ПРИНЯТ после 3 ревью и 3 ремонтов: 364/364 тестов, строгая проверка типов и eslint чисто, мутации M1–M4 ловятся. Хэши: callable.ts c807eebe…, errors.ts e94f0843…, firestore_port.ts 18f7f8ec…. Модель: accounts_v2/{uid}/accounts_v2_entities|_ops|_meta/rate; tx.get(rate) → getAll(plan) → applyBatch → set; лимит 20/60с + 600/сутки; окончательные отказы только с details.final:true; ответ {receipts, serverNowMs}; expireAt 180 суток. Следующий шаг цикла: правила Firestore для accounts_v2/** (+ учесть админский catch-all), затем TTL/индексы-исключения (конфиг), затем клиентский пакет по контракту.

Governance-ID: TG-678DB932FDA2
Источник задачи: handover Codex `PHRASEMAN_ACCOUNT_V2_FULL_HANDOVER_2026-09-29.md` (раздел 11). Главная цель — вся система аккаунтов, а не только WAL.

## WAL / crash-recovery пакет (Android SQLCipher) — SOURCE APPROVE

Замороженные байты (SHA-256 / размер), все пять не отслеживаются git (`??`), не добавлены в индекс:

| Файл | SHA-256 | байт |
|---|---|---:|
| runtime-probes/android-account-sqlcipher-recovery/probe.ts | def167732541bc815686cf8f4b9b34707e55446cebcf8fabbd7ee7813d3b3c31 | 24006 |
| runtime-probes/android-account-sqlcipher-recovery/index.js | be94dfa7403dde25d5286fdeb7148b1413e2e1c4c6ac3ec761503e0f60badb76 | 8271 |
| runtime-probes/android-account-sqlcipher-recovery/run-proof.ps1 | c982a0672a269a1b7588953357b8498bfc39aa571caae48435eeb376305ea4d0 | 26272 |
| tests/account_sqlcipher_wal_recovery_android_runtime_probe.test.ts | 9892b58d1e96b7639799bb8e628a68e5cb61cde3b808053bd541b3bd4be64cd7 | 21476 |
| tests/account_sqlcipher_wal_recovery_android_runtime_entrypoint.test.ts | a3590d078cf49d7cd6080a616e79573817f196d085cf5618798b224a7725f738 | 54180 |

Ход: ревью №1 (после Codex) — SOURCE HOLD (P1 bootstrap невыполним для реального процесса; P2 тест порядка чтения; P2 переиспользование PID; P2 факты §8). Ремонт №1: RED 18 failed / 234 passed → GREEN 252/252. Ревью №2 — HOLD (регрессия порядка: baseline WAL снимался после launch; недостающие факты aggregate). Ремонт №2: RED 3 failed / 379 passed → GREEN 382/382. Ревью №3 — **SOURCE APPROVE**.

Гейты последнего ремонта: `node --check` exit 0; PowerShell Parser ParseErrors=0; strict tsc (3 TS-файла) exit 0; eslint `--max-warnings 0` exit 0; trailing whitespace — совпадений нет.

Ограничения (честно): это SOURCE-доказательство. Раннер по-прежнему fail-closed `device_campaign_not_authorized`; на устройстве/эмуляторе ничего не запускалось; runtime PASS отсутствует.

## Открытые пункты (не блокируют approve)

- P2 для ревью лаунчера: в транскрипте нет события «launch отправлен» (`launch-sent`); модель доказывает «baseline до launch-ack», а §5 требует «до отправки launch». Добавить событие между `baseline-bound` и `launch-ack` и мутацию «baseline-bound после launch-sent».
- Письменное дополнение к пакету: маркер `account_sqlcipher_recovery_bootstrap_acknowledged` (`runtimeIdentity|mode`), событие хоста `bootstrap-ack` первым в каждой фазе, имена ключей aggregate (`deviceIdentitySha256`, `abi=x86_64` и др.).
- P3: тесты на `powershell.exe` 5.1 вместо PowerShell 7; неканонический JSON `Write-Pass`; побайтовый расчёт checksum на 2+ МиБ WAL; failure-evidence требует полный aggregate; нет привязки aggregate к транскрипту (`transcriptSha256`); нет мутаций false/missing для `checkpointAfterAuthoritativeRead` и `plaintextCanaryAbsent`; `probe.ts:602` код `emit_failed`.

## Что дальше по плану (без устройства, без commit, без deploy)

1. Записать дополнение к пакету (маркер, порядок событий, ключи aggregate) — файл вне репозитория (Codex outputs), делать по согласованию.
2. Следующие безопасные source-этапы: Firebase Auth/Firestore Rules/deletion/sync контракты (Пакет 3–4), read-only inventory и dry-run миграции (Пакет 5). Реальные adapters, интеграция (Пакет 6) и retirement (Пакет 7) — только после device/server/migration gates.
3. Device-кампания (шесть фаз) — только когда эмулятор не занят другой сессией и получено явное разрешение.

Аккаунты для финальной проверки, указанные владельцем: badloar@gmail.com, Mytheoryborn@gmail.com, Zawetkashop@gmail.com — использовать только после готовности интеграции (Пакет 6) и только на тестовой сборке/эмуляторе, не на production-данных без отдельной команды.

## Пакет 3S — серверное ядро применения синхронизации (source-only)

Governance-ID: TG-C78DB201011D. Три новых файла, не отслеживаются git, не подключены к `index.ts`, `firestore.rules` не менялись:

| Файл | SHA-256 | байт |
|---|---|---:|
| functions/src/accounts_v2_apply_core.ts | 7d8bd09a8a6258c5bf9502072d6b280c3c63e62fdd4d8d0253d2abc987196af8 | 40931 |
| functions/src/accounts_v2_apply_core.test.ts | 7640aa0ab68c0dd555ac48e8966261b563f7decfc6d2f7cb75b71a45c3b39d2b | 28137 |
| functions/src/accounts_v2_envelope_parity.test.ts | 31d69b8bbddf8b6a13c13a737522514cd9ec2df6a44ba4cd84cb732e180ea4c0 | 9915 |

RED: 50 failed / 12 passed из 62 (заглушка, каждая функция бросала not_implemented). GREEN: 2 suites, 62/62. Гейты: strict tsc exit 0, eslint --max-warnings 0 exit 0, в ядре нет firebase-admin/firebase-functions, в index.ts нет accounts_v2, trailing whitespace нет.

Решения исполнителя там, где клиент деталь не задаёт (требуют письменной фиксации после ревью): серверное расширение квитанций `conflict`/`rejected{code}` (клиент сейчас знает только applied|duplicate и на новые исходы уйдёт в `sync_receipt_invalid` — безопасно, но клиент нужно научить перед подключением); схемы payload по доменам (lesson `{passed,score}`, flashcard `{op:'upsert',fields}|{op:'tombstone'}`, library `{itemIds}`); baseRevision: урок и библиотека — устаревший не конфликт (D66/коммутативность), карточка — по ревизиям полей; любое поле `srsPolicy` → `rejected/srs_policy_hold`; потолок состояния сущности 512 КиБ; повреждённое хранимое состояние → откат пакета.

Не сделано: Firestore-адаптер порта, callable, правила Firestore, клиентская поддержка новых исходов квитанций, экранирование entityId для путей Firestore (за адаптером), эмулятор. Независимые ревью (спецификация, TS/безопасность) — запущены.

## Решения владельца (2026-09-30, ответы в чате)

1. SRS (интервальное повторение) при расхождении между устройствами: **побеждает самый свежий** (last-writer-wins по времени/ревизии). Снимает TEMP `srs_policy_hold` — реализовать в ядре 3S.
2. Эмулятор Android: **разрешено запускать сразу, даже если занят** другой сессией. (Сессию-соседа предупреждать сообщением.)
3. 16 устаревших тестов в `functions/src/community_packs.test.ts`: **владелец разрешил удаление**.
4. Библиотека карточек: **удаление наборов разрешено** — добавить операцию удаления с защитой от воскрешения (tombstone членства).
5. SRS «самый свежий» уточнено владельцем: **по времени правки** на телефоне (не причинный порядок). Время передаётся внутри SRS-значения; сервер ограничивает «будущее» относительно своего времени.

## Пакет 3S — ИТОГ: SPEC APPROVE + SECURITY APPROVE (2026-09-30)

Серверное ядро применения синхронизации прошло 9 кругов независимого ревью (Opus). Финальные вердикты: SECURITY/TS APPROVE (ревью №5 и №6), SPEC APPROVE (ревью №9). jest `src/accounts_v2_` — 8 suites, 281/281; strict tsc (все accounts_v2_*) exit 0; eslint --max-warnings 0 exit 0; в index.ts не подключено; firestore.rules не менялись.

Файлы (functions/src, не отслеживаются git): accounts_v2_apply_core.ts 07a5211e…, accounts_v2_contract.ts 35f86512…, accounts_v2_validate.ts 4a342ac9…, accounts_v2_merge.ts e32f5042…, accounts_v2_store.ts 83188237…, тесты: apply_core.test 6bbe1e8b…, batch_causality.test 48cce041…, commit_budget.test 41e37909…, domain_rules.test ed50bf3b…, envelope_parity.test e7717602…, library_order.test 789db922…, srs_time.test 251fd40a…, validate.test 305833fa….

Ключевые решения: хранение всего пользовательского JSON-строками (stateJson), ключи документов — sha256; предел состояния 180 000 байт и бюджет коммита < 9,5 МиБ (тест на реальных записях); SRS — по времени правки (updatedAtMs в SRS-значении, допуск будущего 10 мин, проигравшая → conflict); библиотека — add/remove с ревизиями, GC tombstone ≤ R0, лимит 1000; эффективная база внутри пакета; conflict/rejected окончательные.

TEMP-контракт для клиентского пакета (обязательно до подключения callable): (а) базу ожидающих операций никогда не переписывать, операции одной сущности — в одном пакете, иначе честный conflict и новая осознанная операция; (б) гибридные часы SRS; (в) serverNowMs в ответе адаптера; (г) SRS отдельной операцией при srs_time_in_future; (д) порядок outbox, не подмешивать чужие операции; поддержка исходов conflict/rejected и removeItemIds.

Следующие шаги: правила Firestore V2 + эмулятор-тесты (исходники), Firestore-адаптер порта + callable (без экспорта), клиентский пакет по TEMP-контракту, dry-run миграции (Пакет 5), протокол удаления (Пакет 4), лаунчер WAL-кампании на эмуляторе.

## Решения владельца по миграции (2026-09-30, ответы в чате)

6. Руны и звёзды существующих пользователей: **перенести в монеты** (курс — из документа решений D03, если там есть; иначе спросить владельца).
7. Заморозка серии: **оставить только для Plus** (бесплатно у подписчиков, у остальных нет).
8. Переносить кроме уроков и карточек: **серия дней и активные дни; экзамены и сертификаты; достижения и статистика**. «Открытые уроки» владелец не выбрал, но действует прежнее решение D121 («уже открытые уроки при пересчёте не закрываются»).
9. Память интервальных повторений карточек: **перенести** (время правки берётся из старой записи).
10. Курс: **1 руна = 1 монета**. Звёзды (v2_access_stars и др.) **не переносить**.
11. Служебные поля входа (привязка Google/Apple, технические метки firebaseAuthUid/linkedAuth и т.п.) **не переносить** — вход в V2 новый; не блокируют перенос.
12. Урок на 40–59% без открытого следующего — **не открывать** следующий (перенос ничего не меняет в открытости).

## ИТОГ: Пакет 5 (dry-run миграции) — ПРИНЯТ (SPEC APPROVE + SECURITY APPROVE), 2026-09-30

- Пакеты: account-v2-pkg5-migration-dryrun, account-v2-pkg5-repair1. functions `src/accounts_v2_`: 516/516. tsc/eslint по migration чистые. 11 мутационных проверок.
- Статус отчёта `ready | hold`; `applyAllowed` только при ready (`assertMigrationApplyAllowed`); чистка старого `users/{uid}` запрещена, пока `pendingDomainCount > 0` (`assertLegacyCleanupAllowed`).
- Руны → `runesToCoins` 1:1, но домена монет в ядре V2 нет → carry_pending_domain. Серия/экзамены/достижения/доступ к урокам — тоже carry_pending_domain. **Нужен пакет «домены V2: монеты, серия, экзамены, достижения» до реального переноса.**
- Хвосты P3: (1) ES/DE — если нет `unlocked_lessons` в снимке, урок на 40–59% получит passed:false → ставить HOLD при таком сочетании либо доказать, что у ES/DE нет старых уроков; (2) перенести OD6–OD12 в docs/phraseman-2.0/03_DECISIONS.md; (3) dry_run.ts 780 строк — вынести packBatches/buildReport; (4) заморозка ссылается на D101/D107 вместо OD7. Блокирующие HOLD, оставшиеся по делу: mistakePracticeMergePending, progressServer*/progressMigratedAt.
- Следующий шаг по списку: **Пакет 4 — протокол удаления аккаунта.**

### Решения владельца по удалению (2026-09-30)
13. Ключ удаления на телефоне даёт право **узнать этап и дотолкнуть** удаление до конца; данных аккаунта не открывает.
14. Запись-квитанция «удалён» (только этап, без личных данных) хранится **30 дней**, потом стирается сама (TTL).
15. Переустановка / потеря ключа: **ничего не показываем**, обычный новый вход; сервер доводит удаление сам; вход той же почтой = новый чистый аккаунт. Уведомлений об удалении не показывать никогда (правило владельца).

## ИТОГ: Пакет 4 (протокол удаления) — ПРИНЯТ (SPEC+SECURITY APPROVE, ремонт №1 APPROVE), 2026-09-30

- Код: functions/src/accounts_v2_deletion/* (receipt, status_authorizer, purge_core, deletion_flow, firestore_ports + тесты), modules/account-session-v2/account_deletion_detach.ts, firestore.indexes.json (TTL квитанций 30 дн). Не подключено, index.ts и account_delete.ts не тронуты. 187/187 functions + 10/10 клиент; 24 мутационные проверки.
- Этапы квитанции: pending → purging → v2_purged → completed (completed ставит только конвейер). Отзыв pending-квитанции: revokeAccountsV2DeletionReceipt. Ключ — base64url ровно 32 байта (старый hex-ключ из auth_provider.ts:575 НЕ подходит — клиент V2 генерирует новый формат). uid с префиксом `_` отвергаются адаптером.
- Для Пакета 6: обёртки onCall; выпуск квитанции только в точке невозврата; шаг purgeAccountsV2ForDeletion в конвейере account_delete с курсором; completeAccountsV2DeletionReceipt в конце конвейера; защёлка isDetached, переживающая перезапуск; автоповтор стирания после close_failed; лимит на подбор несуществующих квитанций; P3: saveCursor бросает при 'absent' (отзыв останавливает стирание после текущей порции), отзыв после v2_purged возвращает отдельный результат; эмулятор и деплой TTL.
- Следующий шаг по списку: **(3) серверная проверка возраста операции** (отказ операций старше 170 сут по часам сервера), затем (4) лаунчер WAL-кампании на эмуляторе, (5) Пакет 6.

## В РАБОТЕ: серверная проверка возраста операции (пакет account-v2-op-age-guard-2026-09-30)
- Исполнитель прерван перезапуском сессии на середине: частичные правки лежат в errors.ts, firestore_port.ts, envelope_parity.test.ts, новый accounts_v2_op_age.test.ts, outbox*/transport + тесты клиента. Копия до начала — `.tmp_opage_backup/`. Продолжать тем же пакетом; владелец: **не больше 1 агента одновременно**.

## ИТОГ: серверная проверка возраста операции — ПРИНЯТА (SPEC+SECURITY APPROVE, ремонт №1 APPROVE), 2026-09-30
- Сервер: `operation_expired` (>170 сут) и `operation_time_in_future` (>10 мин), поштучно, без квитанции; повтор с квитанцией отвечает duplicate раньше проверки возраста. `validateClientBatch` в callable (требует enqueuedAtServerMs), `validateBatch` — для dry-run.
- Клиент: метка постановки + неизменная граница первой отправки (firstSentAtServerMs/LocalAtMs), по две оценки, «младшая правдоподобная»; `createAccountSyncDispatchPort(wireBatch, send)`.
- Тесты: functions src/accounts_v2_ 644/644 (22 набора), клиент account_sync*_v2 223. Мутации пойманы.
- TEMP: сдвиг часов >10 сут при первой отправке/переводе назад; сброшенная дата + автоисправление часов до первой отправки → правка в карантине навсегда (починка — монотонные часы, отдельная задача).
- Следующий шаг: **(4) лаунчер WAL-кампании на эмуляторе**, затем (5) домены V2 (монеты/серия/экзамены/достижения), (6) Пакет 6.

## Режим работы (2026-09-30, вечер)
- Коммиты — разрешены владельцем наперёд (передано надсмотрщиком + глобальный CLAUDE.md «коммитить часто»); коммитим ТОЛЬКО свои пути через pathspec. Push/deploy/реальная миграция/удаление пользователей — только владелец.
- Лимит: 1 агент-исполнитель; открытые решения — короткий вызов решателя Fable, запись «РЕШЕНО ЗА ВЛАДЕЛЬЦА (Fable): …» здесь.
- После Account V2 — финальный этап по docs/phraseman-2.0/FINAL_PHASE.md для области «аккаунт/данные»: все связанные экраны и состояния на эмуляторе на 3 аккаунтах, скорость на слабом Android, админка по своей части.
- Коммит 1e1bb38e4: Пакет 5, Пакет 4, проверка возраста операций, ремонты клиента.

## WAL-кампания на эмуляторе — RUNTIME PASS 6/6 (исполнитель), на независимом ревью
- Pixel_8 x86_64 API 35, отладочное приложение (APK не собирался). Фазы: prepare, dirty-hold (520 незакоммиченных кадров), rollback, committed-wal-hold (WAL 2 171 272 байт, канарейки открытого текста нет), recovery (чтение до checkpoint), final-reopen — все PASS. Квитанция: docs/work/tasks/account-v2-wal-campaign-receipt-2026-09-30.md.
- Лаунчер `launch-campaign.ps1`, закрыт по умолчанию (открывается только токеном авторизации). Закрыты открытые пункты: launch-sent, transcriptSha256, канонический JSON, код emit_failed.
- РЕШЕНО (обратимо, без Fable — тривиально): пакет app.phraseman на эмуляторе НЕ удалять — проба живёт внутри основного приложения, удаление стёрло бы dev-данные эмулятора; тестовые файлы БД удалены.

### РЕШЕНО ЗА ВЛАДЕЛЬЦА (Fable), 2026-09-30: домены вне ядра V2
Вариант A — Account V2 владеет только уроками, карточками (+SRS) и библиотекой. Монеты (леджер stars_ledger, руны→монеты 1:1 = переименование в леджере), серия/активные дни, экзамены/сертификаты, достижения/статистика, открытые уроки остаются в действующих серверных хранилищах 2.0; dry-run помечает их `keep_in_place` (не входит в pendingDomainCount); чистка легаси удаляет только carried/derived/dropped, keep_in_place — явный allowlist «не трогать» со сторожем. Причины: не расширять только что принятое ядро перед релизом; валюта обязана быть серверной; не создавать вторую правду для параллельных сессий; данные никуда не переезжают — не теряются.

## ИТОГ: Пакет 5, keep_in_place + защита чистки — ПРИНЯТ (SPEC+SECURITY APPROVE, 3 круга ревью), 2026-09-30
- keep_in_place (монеты/руны, серия, экзамены, достижения, unlocked_lessons); carried_and_kept / derived_and_kept (уроки, карточки, наборы, SRS, Plus — приложение 2.0 ещё читает их из старого места); dropped_but_read на всех 15 правилах drop (живые читатели найдены сторожем cleanup_readers_guard.test.ts).
- legacyCleanupPaths — белый список (одно поле, без корней/пробелов/[ ]/лишних точек/< > …) и сейчас возвращает [] для любого реального отчёта (закреплено тестом). Реальную чистку запускает только владелец.
- 166/166 тестов миграции. ES/DE 40–59% без списка открытых → HOLD; EN/FR → informational.
- Хвосты на момент включения чистки: расширить сторож на admin/v2/legacy.html и scripts/, ключи из склеек/констант, проверка в эмуляторе.

## Runbook Пакета 6A (ремонт №2, 2026-10-01)
- `config/accounts_v2.everEnabled` — липкая метка «V2 когда-либо включали»; сервер ставит её сам и НИКОГДА не снимает. Вручную не снимать: пока она стоит, удаление аккаунта стирает accounts_v2/{uid}/** даже при выключенных флагах. Снятие = риск, что данные V2 переживут удаление аккаунта.

## ИТОГ: Пакет 6A (сервер за выключенными флагами) — ПРИНЯТ (SPEC+SECURITY APPROVE, 3 круга), 2026-10-01
- Экспорты accountsV2SyncApply и accountsV2DeletionStatus; config/accounts_v2 {syncEnabled, deletionPurgeEnabled, everEnabled(липкий, не снимать руками)}; флаги выкл по умолчанию → ноль чтений данных.
- Удаление: заготовка квитанции при постановке, публикация в точке невозврата (после пломбы владельца), стирание accounts_v2/** с курсором под таймаут 540 с, completed после Auth, отзыв при откате; стирание при purgeEnabled||syncEnabled||everEnabled||состояние задачи||флаг неизвестен; по завершении поля V2 из задачи удаляются.
- Лимитер статуса: последняя запись XFF, мягкий 200 (только с промахами), жёсткий 1000/мин/инстанс; отказ = 0 чтений.
- Тесты: src/accounts_v2_ + account_delete 836/837 (красный account_delete_revenuecat_phase2 — был до пакета).
- Для 6B: клиент шлёт accountsV2Deletion {operationId, capability base64url 32 байта} в accountDeleteEnqueue; `accounts_v2_disabled` = «сервер выключен» (не карантин); `rate_limited` = «попробуйте позже»; защёлка отсоединения, переживающая перезапуск; тумблер флага в админке.

## Повтор WAL-кампании — ОТЛОЖЕН (2026-10-01 ~00:20)
- Эмулятор emulator-5554 занят чужой сессией в обход очереди (app.phraseman на экране, чужой adb reverse tcp:8081, adb reverse --list висит). Перезапуск эмулятора заблокирован классификатором безопасности (вмешательство в чужую работу) — НЕ обходить. Нужен заход, когда эмулятор выключен/свободен, или разрешение владельца на перезапуск. Команда та же, байты probe 41a807b1…, launcher 48c8b7cd….

## WAL повтор на текущих байтах — 6/6 фаз PASS (2026-10-01), уборка упала на package.json (восстановлен вручную). Дефект лаунчера P2 — в квитанции; починить при следующем заходе исполнителя WAL.

## ИТОГ: Пакет 6B (клиент за выключенным флагом accounts_v2_client_enabled) — ПРИНЯТ (SPEC+SECURITY APPROVE), 2026-10-01. Хвосты P2/P3 до включения — в пакете 6B. Коммит сборки: b95865d99 (declare-поля ломали Babel).
- Пакет 6B ремонт №1 — APPROVE (2026-10-01). Хвосты к подключению хранилища — в пакете 6B.

## ИТОГ: WAL-кампания Android — ПРИНЯТА (SOURCE APPROVE, RUNTIME EVIDENCE ACCEPT, отступления приняты Fable), 2026-10-01. Proof of record: прогон EntryProxy 01:55Z, 6/6 фаз + уборка + публикация.
