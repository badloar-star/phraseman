# Квитанция: Account V2 — Пакет 6D, E2E на Firebase Emulator Suite (2026-10-01)

Governance-ID: TG-D3DE53F2D345 · Пакет: `account-v2-pkg6d-emulator-e2e-2026-10-01.md`

Прод не затрагивался: ни деплоя, ни реальных аккаунтов, ни паролей владельца.
Учётки — 3 локальных аккаунта Auth Emulator (`scripts/accounts-v2-emulator-seed.local.json`,
в .gitignore). В квитанции uid — только усечённый sha256 (`a=06a30cbbad`, `b=bb9ef4e2ad`, `c=eef33cd38d`).

## Окружение

- `firebase emulators:start --only auth,firestore,functions,storage,database --project phraseman-ea0b3`
  (firebase-tools 15.15.0). Storage/RTDB эмулируются, чтобы функции не обращались к проду.
  Оговорка: при не-demo id проекта CLI читает метаданные проекта через свою авторизацию
  (данные не читаются/не пишутся).
- Functions собраны `npm --prefix functions run build` (exit 0); экспорты `accountsV2SyncApply`,
  `accountsV2DeletionStatus`, `accountDeleteEnqueue` загружены в эмулятор.
- Сидер: `scripts/accounts-v2-emulator-seed.mjs` — 3 аккаунта; `config/accounts_v2 {syncEnabled, deletionPurgeEnabled}=true`;
  `remote_config/app.bools.accounts_v2_client_enabled` переключался off/on. Firestore эмулятора
  очищался перед каждым прогоном (`DELETE /emulator/v1/.../documents`).
- Android: Pixel_8 (emulator-5554), dev-сборка app.phraseman 1.5.60, Metro (супервизор) с
  `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=10.0.2.2`. Очередь эмулятора и слоты светофора соблюдены.

## A. Серверный E2E (настоящий клиент V2 → callable в эмуляторе) — `tests/accounts_v2_emulator_e2e_v2.test.ts`

Контроллер → outbox → раннер → callable-транспорт; хранилище области — память (общая на
«перезапуски»), защёлка — тот же SecureStore-порт. Итоговый прогон: **4/4 PASS**.

| Шаг | a | b | c |
|---|---|---|---|
| Флаг выкл: вызовов accountsV2SyncApply | 0 | 0 | 0 |
| Флаг вкл: вызовов / сущностей в `accounts_v2/{uid}` / мс | 1 / 2 / 2067 | 1 / 2 / 521 | 1 / 2 / 511 |
| outbox опустел (ack), проблем квитанций | да, 0 | да, 0 | да, 0 |
| Перезапуск: новых вызовов / сущностей | 0 / 2 | 0 / 2 | 0 / 2 |
| Выход: сессия | закрыта | закрыта | закрыта |
| Другой аккаунт шлёт мой пакет | permission-denied `uid_mismatch`, final | то же | то же |
| Чтение `accounts_v2/{uid}` клиентом (чужой / сам) | 403 / 403 | 403 / 403 | 403 / 403 |
| Удаление: локальная область | detached, closed, erased, 0 записей | то же | то же |
| `accountDeleteEnqueue` | **INTERNAL** (блокер 1) | то же | то же |
| Квитанция V2 → статус (nudge) → `accounts_v2` после стирания | v2_purged → 0 сущностей | то же | то же |
| После завершения квитанции / чужой ключ | completed / permission-denied | то же | то же |

Удаление (шаг 7) шло обходом блокера 1: квитанция V2 выпущена тем же серверным кодом
(`functions/lib/.../firestore_ports.js`, Admin SDK, только `FIRESTORE_EMULATOR_HOST`), стирание и
этапы — через НАСТОЯЩИЙ callable `accountsV2DeletionStatus` с ключом телефона (`purpose: deletion_status`).

## B. Android-эмулятор

| Проверка | Факт |
|---|---|
| Dev-подключение к эмуляторам | `[FIREBASE-EMU] connected host=10.0.2.2 services=auth,firestore,functions,functions:us-central1 failed=none`; натив: «emulator host will be used» |
| Первая попытка (логи сначала) | `functions` падал `ReferenceError: Property 'moduleWithDashes' doesn't exist` (баг RNFB при незагруженном пакете functions) → исправлено: сначала `require('@react-native-firebase/functions').getFunctions` |
| Флаг выкл | `[ACCOUNT-V2] auth_sync skip reason=flag_off`; новых вызовов accountsV2SyncApply с телефона: 0 (194 → 194 по логу эмулятора) |
| Флаг вкл на телефоне | не применился: remote config читается из кэша (`из кэша remote_config_cache_v1`) — сетевое чтение `remote_config/app` требует входа (блокер 2) |
| Путь базы V2 | `files/SQLite/accounts-v2/` (defaultDatabaseDirectory expo-sqlite), файлы 0600 владельца приложения; соседняя `phone-state-v1-*.db` в `files/SQLite/` |
| Бэкап (readback из установленного APK, aapt2) | `allowBackup=true`, `fullBackupContent=@xml/backup_rules`, `dataExtractionRules=@xml/data_extraction_rules`; include только `sharedpref "."` и `database RKStorage` → **files/SQLite/accounts-v2 НЕ в бэкапе** ✔; **SecureStore.xml (sharedpref) В бэкапе** ✘ (находка 3) |

## Блокеры (честно)

1. **`accountDeleteEnqueue` в эмуляторе → INTERNAL**: `TypeError: Cannot read properties of undefined (reading 'serverTimestamp')`
   в `functions/lib/functions/src/account_delete_job.js:125` (`admin.firestore.FieldValue`). В обычном Node
   (`firebase-admin` 13.10.0) то же выражение работает → вероятно, прокси firebase-admin эмулятора
   firebase-tools 15.15 + node 24. Не V2-код, вне области пакета; конвейер удаления с 14-дневным окном
   на эмуляторе целиком не пройден.
2. **Вход тестовыми аккаунтами на телефоне невозможен без паролей владельца**: в приложении нет
   входа по почте/паролю (только Google/Apple; Google требует реального аккаунта — запрещено).
   Сохранённая прод-сессия против Auth Emulator даёт `INVALID_REFRESH_TOKEN`; после её снятия
   приложение создало анонимного пользователя, но слой идентичности (stable_id `users/*`,
   `auth_links`) в пустом эмуляторе отвечает PERMISSION_DENIED и remote config остаётся из кэша.
   Поэтому телефонные шаги «вход → урок/карточка → accounts_v2 → смена аккаунта → удаление»
   выполнены серверным E2E с настоящим клиентским кодом (раздел A), а не тапами.
3. **Нет производителя операций в приложении**: ни один экран не кладёт уроки/карточки в outbox V2
   (`outbox.enqueue` вызывается только из тестов) — включение флага сейчас ничего не синхронизирует.
   Это задача следующего пакета (подключение доменов к outbox).

## Находки

- SecureStore в бэкапе (`include sharedpref "."`): значения зашифрованы ключом Keystore (он не
  переезжает), после восстановления записи нечитаемы → `latch_read_failed`/`key_unreadable`.
  `latch_read_failed` (в отличие от `latch_corrupt`) не запускает восстановление → V2 может
  остаться выключенным на восстановленном устройстве. Предложение: исключить `sharedpref
  SecureStore.xml` (в плагине уже лежат `secure_store_*_rules.xml`, но манифест ссылается на другие).
- Строгая проверка ответов клиента (только простые объекты своего realm) верна для Hermes;
  в Jest-харнессе ответы fetch пришлось копировать литералами (иначе `receipt_shape` и вечный retry).

## Уборка

- Firebase emulators остановлены (дерево процессов 48932 снято, порты 9099/8080/5001/4000/9000/9199/4400/4500 свободны).
- Metro (8081) остановлен, сирот нет; `adb reverse tcp:8081`, добавленный мной, снят (список пуст, как до начала).
- Данные app.phraseman восстановлены из снимка до теста (tar files/databases/shared_prefs/no_backup,
  108 945 920 байт, размер после восстановления совпал); прод-сессия на месте; приложение остановлено.
- Очередь эмулятора отпущена, слоты светофора отданы.


---

## Пакет 6E (TG-52A880319166) — повтор телефонного E2E, 2026-10-01

Dev-вход: `phraseman://dev-emulator-login?…` (маршрут `app/dev-emulator-login.tsx`, работает только при
`__DEV__` + `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST`, только адреса `accounts-v2-e2e-*@phraseman.test`);
учётки подставлял хост из gitignored seed-файла через adb, в логах — только метка a/b/c.
Эмуляторы перезапущены начисто, сидер пересоздал 3 аккаунта (uid-хэши: a=6d3019363e…, b=2dc5f3ae34…, c=333c56abc9…).

| Шаг | Факт на телефоне (Pixel_8, dev-сборка, бандлер с эмуляторами) |
|---|---|
| Вход a (dev-путь) | `[FIREBASE-EMU-LOGIN] signed_in label=a` |
| Флаг выкл | `[ACCOUNT-V2] auth_sync skip reason=flag_off`, accountsV2SyncApply с телефона — 0 вызовов |
| Флаг вкл | `runtime storage_adapter_ready` → `storage opened decision=…` → `lifecycle started generation=1` |
| Область SQLCipher | `files/SQLite/accounts-v2/accounts-v2-a-<sha256(uid)>-1.db`, хэш совпал с uid a; первые байты файла случайные (нет «SQLite format 3») — база зашифрована |
| Перезапуск | `storage opened decision=reopen_existing hydrate=false lineage=1` |
| Смена a→b (первая попытка) | **дефект найден по логам**: `lease close_unexpected_result type=null` → `store close_failed reason=close_rejected` → `lifecycle open_failed code=account_scope_busy`. Kotlin `AsyncFunction` с `Unit` отдаёт в JS `null`, привязка ждала `undefined` — на Android ЛЮБОЕ закрытие области падало, смена аккаунта без перезапуска была невозможна |
| Починка | `account_sqlite_lease_binding.ts`: `null` (Android) и `undefined` (iOS) = «закрыто», остальное — отказ; RED→GREEN тест |
| Смена a→b→c→a после починки | на каждом шаге `lifecycle halted reason=account_switch` → `closed outcome=closed` → `storage opened` своей базы → `started generation=2/3/4`; 3 отдельных файла по хэшам a/b/c, ключи — отдельные записи SecureStore по хэшу |
| Удаление a (UI «Eliminar cuenta»; язык приложения временно es — ru-слово кириллицей adb не печатает) | `lifecycle halted reason=account_delete` → `delete detach_started hadSession=true` → `credential_ready` → `latch mark ok=true` → `erase done lineage=1 next=2` → `detach done closed=closed erase=erased` → `latch clear ok=true` → `detach_done`; файл области a исчез, области b и c на месте |
| Серверная часть удаления | `accountDeleteEnqueue` в эмуляторе — прежний блокер 1 (`serverTimestamp` undefined в прокси эмулятора); V2-стирание на сервере покрыто серверным E2E (раздел A) |

Флаг на телефоне: свежий кэш remote config (TTL 6 ч — правка другой сессии в `remote_config_client.ts`)
не давал перечитать документ; для прогона флаг подан через кэш приложения (AsyncStorage) с отметкой свежести.
Бэкап: исключение `SecureStore.xml` — в плагине (сторож-тест); в установленной сборке ещё нет (нужны prebuild и пересборка APK).

Уборка 6E: эмуляторы и бандлер остановлены (деревья процессов сняты, порты свободны), `adb reverse tcp:8081` снят,
данные app.phraseman восстановлены из снимка до прогона (108 945 920 байт, язык `ru`, тестовых областей нет),
очередь эмулятора и слоты отданы.


---

## Пакет 6F (TG-84E5A5923FA4) — производитель операций, телефонный E2E, 2026-10-01

Эмулятор Android был выключен — поднят через очередь и погашен после прогона. Firebase Emulator Suite заново,
сидер — 3 аккаунта (uid-хэши a=bdf53bd108…, b=5727b6fc87…). Вход — dev-путь 6E, флаг — через кэш приложения
(TTL 6 ч remote config, как в 6E).

| Действие на телефоне (настоящий код записи приложения) | Лог производителя | Эмулятор Firestore `accounts_v2/{uid}` |
|---|---|---|
| a: урок 1 завершён (экран `lesson_complete`, прогресс 40/50 → 4.0) | `producer done kind=lesson_result planned=1 enqueued=1` → `transport call_ok ops=1` → `drain empty` | `lesson_progress en:lesson:1` `{best:{passed:true,score:4}}` rev 1 |
| a: фраза «she's smart» → «Add to flashcards» | `kind=card_snapshot planned=2 enqueued=2` (новая + уже лежавшая локально) | 2 × `flashcard en:saved:<id>` rev 1 |
| a: тренировка «Правда/ложь», 3 ответа, выход | `kind=swipe_memory planned=1 enqueued=1` | у карточки поле `srs` = `{updatedAtMs: lastSeenAt, correct, ease, mastered, nextDueAt, seen…}`, rev 2 |
| a: удаление карточки из «Сохранённых» | `kind=card_snapshot planned=1 enqueued=1` | `{deleted:true,fields:{}}` rev 3 (tombstone) |
| смена a→b (dev-вход) | `halted account_switch` → `closed` → `storage opened provision_new` → `started generation=2` | — |
| b: фраза «you're kind» → «Add to flashcards» | `kind=card_snapshot planned=2 enqueued=2` | у b — 2 карточки; у a — без изменений (3 сущности, tombstone на месте) |
| b: повторное завершение урока 1 | ноль операций: локальный лучший уже 4.0 (`isNewBest=false`) | у b урока нет |
| удаление b (UI) | `detach_started` → `erase done` → `detach_done`; область b (вместе с зеркалом производителя) удалена, область a на месте | серверное стирание — прежний блокер 1 (`accountDeleteEnqueue`, serverTimestamp в прокси эмулятора) |
| библиотека наборов | не прогнано на телефоне: каталог наборов сообщества в пустом эмуляторе пуст | покрыто тестом планировщика (`{itemIds}` только новые) |

Флаг выкл (тест + 6E-прогон): ноль операций, ноль записей в область; `produceAccountsV2ChangeIfEnabled` даже не строит изменение и не грузит клиент.

Наблюдения: (1) callable в эмуляторе отвечал 1–17 с (холодные функции) — отправка фоном, экран не ждал;
(2) локальные данные телефона при dev-входе не делятся по аккаунтам (это слой приложения, не V2), поэтому первый
снимок нового аккаунта несёт и прежние локальные карточки; (3) урок, лучший результат которого уже был на телефоне,
в V2 нового аккаунта не попадает до следующего улучшения — догонит гидрация/перенос (6G/миграция).

Уборка 6F: эмуляторы и бандлер остановлены (деревья процессов сняты, порты свободны), `adb reverse tcp:8081` снят,
данные app.phraseman восстановлены из снимка до прогона (108 954 624 байт, язык `ru`, тестовых областей нет),
Android-эмулятор погашен (был выключен до прогона), очередь эмулятора и слоты отданы.
