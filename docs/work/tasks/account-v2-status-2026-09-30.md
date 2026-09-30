# Account System V2 — статус Claude-сессии, 2026-09-30

> ПОСЛЕДНЕЕ (TG-831C22D22486, шаг 2): firestore.indexes.json — fieldOverrides: accounts_v2_ops {expireAt ttl:true, operationIdJson, fingerprint} и accounts_v2_entities {stateJson, entityIdJson, lastOperationIdJson} без индексов; сторож rules_guard.test.ts проверяет и это (4 теста). jest src/accounts_v2_ — 368/368, eslint чисто. Не задеплоено. СЛЕДУЮЩИЙ ШАГ: клиентский пакет — modules/account-session-v2/account_sync*.ts: исходы квитанций conflict/rejected{code}, решение по details.final, retryAfterMs не тратит попытку, потолок 5 → карантин, операции одной сущности в один пакет, базу не переписывать, SRS updatedAtMs гибридные часы + serverNowMs, removeItemIds; паритет-сторож сервера обновить.
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
