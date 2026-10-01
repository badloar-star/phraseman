# Квитанция: Account V2 — WAL-кампания Android SQLCipher (шесть фаз), 2026-09-30

Задача: `account-v2-wal-campaign-launcher-2026-09-30.md` (TG-1F75E418DA38). Итог: **PASS — все шесть фаз**.
Нормативный пакет: Codex `ACCOUNT_ANDROID_SQLCIPHER_WAL_RECOVERY_PACKET.md`, SHA-256 `a1161b298d390695fae2a2f63127a3faea3c4b7c8ffc9e4e1ebf8d2399a02353` (закреплён в лаунчере).

Граница доказательства (как в пакете §9): на этом x86_64-эмуляторе и этой debug-сборке выделенная SQLCipher-база откатила незакоммиченную транзакцию после SIGKILL процесса приложения, восстановила подтверждённый WAL-коммит до checkpoint, прошла quick_check/cipher_integrity_check и открылась после checkpoint с тем же атомарным состоянием. Не доказывает: отключение питания, физическое устройство, OEM/бэкап, iOS, миграцию, прод.

## Устройство (без персональных данных)

| Факт | Значение |
|---|---|
| Модель | sdk_gphone64_x86_64 (AVD Pixel_8) |
| ABI | x86_64 |
| API / Android | 35 / 15 |
| SHA-256 build fingerprint | 2626a7db5f3a5a5050ca3505c8bbefb48a24ac5bba7532bc924b99a073ef733f |
| deviceIdentitySha256 | 7c9444beff18225cda748ff2cb14fe5101589dd21a5bcdff36e2553c2104de81 |
| Установленный APK (app.phraseman, debug, установлен 2026-09-28) SHA-256 до/после | d22d4e96fc17fed159a12e6d503d4bbe4c2227cff6b37d54db22d0f60d29f9c0 / тот же |

Сборка APK не понадобилась: использован уже установленный debug dev-client (как в канонической SQLCipher-пробе 2026-09-27), проба подана через Metro с временной подменой `package.json.main` (журнал + CAS-возврат; возвращён, `git status package.json` чист).

## Хэши (кастоди)

| Артефакт | SHA-256 |
|---|---|
| probe.ts | 34a8bdbeb7294aad74782af8d7a5d8f973b7767bff43ad453fac128d9c1d973b |
| index.js (не менялся) | be94dfa7403dde25d5286fdeb7148b1413e2e1c4c6ac3ec761503e0f60badb76 |
| run-proof.ps1 | 31fe189fbe3af2a2a87bc48310bc75117ba08d7e68837b0a11223fb26629aa11 |
| launch-campaign.ps1 (launcherSha256) | 0ff093ff535af2a455ff6f352e2908876d0285f678a25234eb796f9a442e7213 |
| sourceSha256 (probe|index|runner|launcher) | a463641614ca016268788821665b5c98ad24713e95673c1036c359e364bed910 |
| nativeSha256 (патч expo-sqlite, его package.json, gradle.properties) | 1581f6cf54224484cf132c5340f43d6285b25277e0359b6445c39adc28eb8e44 |
| transcriptSha256 | fb974129593c7fa6e51d66055e3ecffbbce74565838564b4ffced6264801faae |

До и после кампании source/native/APK совпали (sourceRecaptured, nativeRecaptured, apkRecaptured = true).

## Фазы

| # | Фаза | PID / starttime | События транскрипта | Итог |
|---|---|---|---|---|
| 1 | prepare | 3876 / 48337 | bootstrap-ack, launch-sent, launch-ack, prepare-pass | PASS |
| 2 | dirty-hold | 4053 / 51164 | bootstrap-ack, baseline-bound, launch-sent, launch-ack, dirty-ready, wal-delta-validated, sigkill-sent, proc-gone | PASS |
| 3 | rollback-verify | 4241 / 67940 | bootstrap-ack, launch-sent, launch-ack, rollback-pass | PASS |
| 4 | committed-wal-hold | 4382 / 69628 | bootstrap-ack, launch-sent, launch-ack, committed-wal-ready, wal-present-validated, sigkill-sent, proc-gone | PASS |
| 5 | recovery-verify | 4543 / 71761 | bootstrap-ack, launch-sent, launch-ack, authoritative-read, checkpoint, recovery-pass | PASS |
| 6 | final-reopen | 4687 / 73706 | bootstrap-ack, launch-sent, launch-ack, final-reopen-pass | PASS |

Каждая фаза — свежий процесс/рантайм, свои nonce и runtimeIdentity (в aggregate только их SHA-256).

## Сырые факты

- Грязная транзакция: baseline WAL отсутствовал (0 кадров) и снят ДО отправки launch; после `dirty-ready` WAL 2 142 432 байт, 520 новых кадров, все маркеры коммита 0, заголовок/соли/контрольные суммы валидны (prefixMatch, saltsMatch, checksumsValid, structurallyComplete, allDeltaCommitMarkersZero = true). WAL SHA-256 a922ae1c4e3cdf75c6713a9a64894b8e9af40ed7dd7bc7c9505beb116356a3d2.
- SIGKILL: `run-as app.phraseman kill -9` только после повторной сверки PID/starttime (KillBinding), исчезновение `/proc/<pid>` наблюдалось, нового запуска не было.
- Откат: 0 строк dirty-v1 (batch и items), quick_check = ok, cipher_integrity_check = 0 строк.
- Коммит с WAL: main 20 480 байт (96507aa2…a821b), WAL 2 171 272 байт (86bc63be…799ed), shm 32 768 (0a144792…b48b1), journal отсутствует; открытая канарейка в main и WAL не найдена.
- Восстановление: committed-v1 = 1 batch / 2 items прочитаны, dirty отсутствует, integrity чисто — всё ДО checkpoint (маркер authoritative_read раньше checkpointed); после checkpoint(TRUNCATE) повторное чтение совпало.
- Финал: то же атомарное состояние после переоткрытия.
- Очистка: приложение остановлено, adb reverse снят, свой Metro остановлен, package.json возвращён байт-в-байт, четыре файла семейства удалены и отсутствуют, EvidencePublication = PASS.

Локальные улики (вне репозитория): `C:\Temp\phraseman-wal-campaign\run-20260930T200130Z-183a5dcbf9ecd6a70bc0037a27b1c1cd\` (receipt.json, trace.log, metro.log).

## Все попытки (10 каталогов доказательств, 9 отказов до PASS)

Каталоги в `C:\Temp\phraseman-wal-campaign\`:

| Каталог (UTC) | Откуда | Итог | Причина |
|---|---|---|---|
| run-20260930T193325Z-99e0… | тест лаунчера (serial `emulator-5554\n`) до исправления якоря `$`→`\z` | campaign_failed, preflight | serial с переводом строки прошёл проверку; лаунчер дошёл до preflight (adb devices), эмулятор был выключен; уборка вызвала `am force-stop` → adb exit 1 |
| run-20260930T194811Z-f141…, 194812Z-9a15…, 194814Z-a555…, 194815Z-2076… | мутационная проверка M7 (гейт авторизации удалён) | campaign_failed, preflight ×4 | тесты «без авторизации» с serial `emulator-5554` дошли до preflight; эмулятор выключен; уборка вызвала `am force-stop` → adb exit 1 |
| run-20260930T195511Z-fd67… | ручной запуск кампании | campaign_failed, preflight | ошибка лаунчера: `.Count` у скаляра в StrictMode (список устройств); трассы причины ещё не было |
| run-20260930T195552Z-051b…, 195619Z-c1ba… | ручной запуск ×2 | unexpected_error PropertyNotFoundException, preflight | та же ошибка; второй запуск — первая правка не применилась |
| run-20260930T195655Z-6c1e… | ручной запуск | account_sqlcipher_recovery_close_ineffective, prepare | проба не знала обёртку нативного отказа после закрытия; семейство сохранено (main 20 480 байт) |
| run-20260930T200130Z-183a… | ручной запуск | **PASS**, 6/6 | — |

Во всех 5 тестовых/мутационных отказах эмулятор был выключен: `am force-stop` не дошёл ни до какого устройства. Но это ровно дефект P2 ревью — исправлен (см. ниже).

## Отступления от пакета (на решение владельца/ревьюера)

1. Эмулятор поднят этой сессией (пакет: «не поднимать эмулятор ради пакета»); основание — разрешение владельца 2026-09-30 и очередь `emulator.sh`. После кампании выключен.
2. Повторы после отказа (пакет: «не перезапускать вслепую»): 3 повтора после ошибок лаунчера и 1 после close_ineffective — каждый после диагноза и правки.
3. Семейство базы, сохранённое после провала close_ineffective, удалено перед повтором (SHA-256 main dfdd300643736fceb499ad71279893f932ab978813b9db5c4b2e9b57c57fc6e4, синтетические данные).
4. Байты лаунчера не прошли отдельное ревью до запуска (пакет требует APPROVE лаунчера до использования).
5. Не созданы отдельные PRE/POST-квитанции.
6. Локальный `receipt.json` неканонический и содержит сырые nonce/runtimeIdentity и модель устройства — только локально, вне репозитория; в aggregate — лишь их SHA-256.
7. Пакет app.phraseman не удалялся (удаление стёрло бы dev-данные эмулятора); удалены только четыре файла тестовой базы.
8. Счётчики строк отката/восстановления, quickCheckOk и cipherIntegrityErrorCount — **probe-derived** (их требует проба до PASS-маркера; хост строки не читает). В лаунчере помечены, в receipt.json — поле `probeDerivedFacts`.

## Ремонт №1 после ревью (без повторного прогона)

- Уборка после отказа больше не останавливает app.phraseman, если preflight не дошёл до host-setup (флаг `HostSetupReached`); тест + мутация R1 убита.
- Проба: для `closeSync` «revoked» больше не считается доказательством закрытия (только closed-варианты); `execSync` по-прежнему принимает revoked. Тесты + мутация R2 убита.
- `RecoveryOrdering` с постоянным списком убран — порядок доказывают наблюдённые маркеры в транскрипте recovery-verify.
- Остановка Metro сверяет время старта процесса с записанным (мутация R3 убита).
- Стадия в квитанции провала теперь — стадия отказа, а не `failure-cleanup`.

**Важно:** правка `closeSync` меняет путь фаз. PASS выше получен на probe.ts `34a8bdbe…` и лаунчере `0ff093ff…`; текущие байты — probe.ts `41a807b1e7cae1a54ae41c848a618c9b821b81fc6f4e1753d207ec60f5ec86ed`, launch-campaign.ps1 `48c8b7cdbf5391c3cc563158129d44ff080b2020fb3aa4779d693e40cc908d9b`. Какой именно вариант отказа дал closeSync на устройстве, не зафиксировано; если это был «revoked», новая проба упадёт close_ineffective. Повтор кампании нужен; эмулятор сейчас занят сессией «Дизайн» (очередь ответила WAIT) — повтор отложен.

## Повторный прогон на текущих байтах (UTC 2026-09-30 23:46–23:52)
- Байты: probe.ts 41a807b1e7ca…, launch-campaign.ps1 48c8b7cdbf53…; Pixel_8 x86_64 (эмулятор запущен этой сессией под очередью emulator.sh, выключен после).
- Фазы: prepare, dirty-hold, rollback-verify, committed-wal-hold (main 20480, WAL 2 171 272, канарейки нет), recovery-verify (recovery-pass), final-reopen — ВСЕ PASS; aggregate: PhaseTranscript и TranscriptDigest — validator_pass.
- Сбой на УБОРКЕ: восстановление package.json бросило IOException «file with a user-mapped section open» (файл держал чужой процесс) → итог лаунчера campaign_failed при пройденных фазах. package.json восстановлен вручную из журнала (журнал == HEAD, проверено cmp); тестовая БД семейства 588b… удалена вручную (чужие файлы 7b32…, eeee… не тронуты); бандлер остановлен лаунчером (exit=0); эмулятор выключен; очередь и слот отданы.
- Доказательства: C:\Temp\phraseman-wal-campaign\run-20260930T234644Z-rerun\
- ДЕФЕКТ ЛАУНЧЕРА (P2): Exit-PackageSwap должен повторять запись с паузой при блокировке и не бросать; окно подмены package.json (~5 мин) видно другим сессиям — риск для их сборок; рассмотреть запуск пробы без подмены общего package.json.

## Ремонт №2 (2026-10-01, без прогона на эмуляторе)

- **Общий package.json больше не подменяется по умолчанию.** Новый `entry-proxy.js` (только 127.0.0.1, только на время кампании) слушает порт устройства 8081 и переписывает ровно запрос виртуальной точки входа Expo (`/.expo/.virtual-metro-entry.bundle|map`) на `/runtime-probes/android-account-sqlcipher-recovery/index.bundle|map`, добавляя те же Hermes-параметры, что добавил бы Expo; всё остальное (status, HMR/WebSocket) проходит как есть, Host сохраняется. Metro лаунчера работает на 8082. Режим по умолчанию `-EntryMode EntryProxy`; прежняя подмена — только явный `-EntryMode PackageSwap`.
- **Проверка без устройства (2026-10-01):** свой Metro на 8082 + прокси на 8081 → запрос виртуальной точки входа вернул HTTP 200, 4 791 608 байт, бандл содержит модуль пробы и `AndroidAccountSqlcipherRecoveryApp`; package.json не менялся (SHA до = после); процессы остановлены, порты свободны. Поведение dev-клиента на устройстве через прокси НЕ проверено — нужен прогон.
- **Восстановление package.json (режим PackageSwap):** повтор с нарастающей паузой (250 мс → 4 с) до ~60 с, исключения не выходят наружу, каждая попытка в трассе (`package_restore_retry`), при окончательной неудаче — `package_restore_failed_journal_kept` в трассе и stderr, журнал остаётся.
- В режиме EntryProxy `packageRestored` = SHA package.json до кампании равен SHA после.
- Тесты: прокси 12/12 (переписывание, проброс, Host, 502 при падении Metro, WebSocket), лаунчер 27/27, проба 55/55; мутации R4–R7 убиты; eslint, strict typecheck, node --check, парсер PowerShell — чисто.

Текущие байты: launch-campaign.ps1 `5a3d69490c64599dbbf1fc21ba64e0015cdd59e9d92f0bc5e582c1ce9734eb98`, entry-proxy.js `cf1f5b241b1f8eecdd72342dd8c9b8e618e4b1c5f0aa2aaa3eb11f05d5dd7cfd`, probe.ts `41a807b1…` (не менялся). PASS прогона 2026-10-01 получен на launch-campaign.ps1 `48c8b7cd…` в режиме подмены package.json; для байтов `5a3d6949…` (режим прокси) нужен новый прогон.

## Прогон в режиме EntryProxy (без подмены package.json), UTC 2026-10-01 01:55–01:59 — ПОЛНЫЙ PASS
- Байты: launch-campaign.ps1 5a3d6949…, entry-proxy.js cf1f5b24…, probe.ts 41a807b1…, index.js be94dfa7…, run-proof.ps1 31fe189f….
- Все 6 фаз PASS; aggregate PhaseTranscript + TranscriptDigest PASS; уборка (entry_proxy_stop, metro_stop) и публикация (CleanupOutcome, EvidencePublication) — validator_pass. package.json не менялся (git status пуст).
- Эмулятор emulator-5554 уже был запущен до захода (очередь была свободна) — оставлен как был; очередь отдана.
- Доказательства: C:\Temp\phraseman-wal-campaign\run-20261001T015504Z-proxy\

## РЕШЕНО ЗА ВЛАДЕЛЬЦА (Fable), 2026-10-01: отступления приняты (вариант A)
- **Proof of record:** прогон EntryProxy UTC 2026-10-01 01:55Z (run-20261001T015504Z-proxy) на байтах launch-campaign.ps1 5a3d6949…, entry-proxy.js cf1f5b24…, probe.ts 41a807b1…. Все ранние прогоны — история разработки.
- PRE/POST-квитанции заменены равенством SHA package.json до/после (git status пуст) и validator_pass CleanupOutcome/EvidencePublication.
- Байты лаунчера/прокси/пробы заморожены: любое изменение = новый прогон, доказательство не переносится.
- Локальный receipt.json (сырые nonce, модель устройства) в репозиторий не попадает.
- Режим PackageSwap — нерекомендуемый; дефект окна подмены package.json закрыт режимом EntryProxy.
- Запуск лаунчера — только через очередь emulator.sh (скрипты scripts/adb-* и dev-android-emulator конфликтуют с портом 8081 прокси).
