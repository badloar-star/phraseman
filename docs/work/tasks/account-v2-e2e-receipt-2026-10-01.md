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


---

## Пакет 6G (TG-4CAC183BF512) — перенос при первом входе (OD21) + гидрация, 2026-10-01

Firebase Emulator Suite заново (`firebase emulators:start --only auth,firestore,functions,storage,database --project phraseman-ea0b3`),
functions собраны `npm --prefix functions run build` (экспорты `accountsV2MigrateMine`, `accountsV2PullMine` загружены эмулятором).
Сидер 6D — 3 аккаунта, серверный флаг выкл; старые данные и проверки — `scripts/accounts-v2-6g-emulator-e2e.mjs`
(настоящие callable с токенами Auth-эмулятора, REST только на loopback). uid-хэши: a=bc93c51f60, b=8a74aa1495.

Старые данные: a — `users/stable-6g-e2e-a` (3 урока, 3 сохранённые карточки, память свайпов c1, 2 набора) с привязкой
`auth_links/{uid a}.stable_id` (документ НЕ под uid — как у реальных людей со stable_id); b — `users/{uid b}` с `identityHidden`.

| Шаг | Факт | Итог |
|---|---|---|
| Флаг выкл → перенос a | `failed-precondition accounts_v2_disabled`, `accounts_v2/{a}` пуст | PASS |
| Без входа | `UNAUTHENTICATED` | PASS |
| Первый вход a | `status=done ops=7 applied=7` за 113 мс; 7 сущностей (3 урока + 3 карточки + библиотека); отметка `accounts_v2_meta/migration.status=done` | PASS |
| Повторный вход a | `already_done` за 22 мс, сущностей и квитанций столько же | PASS (после починки, см. ниже) |
| «Новая установка» a: pull по 2 | 4 страницы, все 7 своих сущностей; SRS c1 c временем правки из старой записи; урок 2 `{passed:true, score:5}` | PASS |
| Отметка потеряна → перенос заново | `applied=0 duplicate=7`, сущности без изменений | PASS |
| b (скрытая личность) | `hold`, `identity_hidden`, в V2 ноль записей | PASS |
| pull b | 0 сущностей (чужого a не видит) | PASS |

**Найдено E2E и починено по логам (RED→GREEN):** первый прогон — повторный вход a сразу после переноса получил
`resource-exhausted` вместо `already_done`: блок «попытка идёт» в памяти инстанса не снимался после успеха.
Починка: блок снимается после done/hold (остаётся только для partial), тест «сразу после done на том же инстансе».
Итоговый прогон: **12/12 PASS**.


---

## 6G/7A/7C/7D телефонный E2E + откат 7B (TG-4E116864AC73), 2026-10-01 вечер

Pixel_8 (emulator-5554), dev-сборка 1.6.24, свой бандлер (супервизор, `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=10.0.2.2`),
Firebase Emulator Suite заново (functions собраны, `accountsV2MigrateMine/PullMine/SyncApply` загружены), сидер — 3 аккаунта
(uid-хэши a=b7a2dcf20f, b=1f0adf811b, c=e736e73a51). Старые данные: a — `users/stable-e2e-a` (+`auth_links`): уроки 1–2,
3 сохранённые карточки a1..a3, память свайпов a1, библиотека 2 набора; b — `users/<uid>` (2 карточки); c — пусто.
Логи — `adb logcat ReactNativeJS` (вывод бандлера без TTY логов приложения не несёт). Флаги клиента — через кэш remote config
приложения (как в 6E/6F: сетевое чтение `remote_config/app` до входа не идёт), серверные — в эмуляторе Firestore.
Сессия прервана по просьбе координатора (эмулятор нужен «Дизайну»): часть сценариев не прогнана.

| Сц. | Итог | Факт (ключевые строки) |
|---|---|---|
| A. первый вход, V2 вкл | **FAIL (дефект)** | `hydrate migrate status=hold ops=0`; сервер: `migrate hold reasons=unknown_field writes=0_v2`, отметка `{legacyFound:true, holdReasons:["unknown_field"]}`. Виновники — корневые поля, которые приложение пишет в `users/{stableId}` при входе: `accountGeneration` (getLearningV2AccountBinding → `ensureAccountGeneration`), `updatedAt`; `classifyRootField` для них (и для `last_active_at`, `created_at`, которые пишет старый cloud_sync) → `hold/unknown_field`. После снятия двух полей из ТЕСТОВОГО документа и сброса отметки: `migrate a status=done ops=6 applied=6` (2 урока + 3 карточки + библиотека). |
| B. новая установка (pm clear → вход a) | **PASS** (с оговоркой) | `storage opened decision=provision_new hydrate=true` → `migrate status=already_done` → `pull_done entities=6` → `mirror seeded=6` → 1-й проход `saved_cards persist_failed count=3` → `apply_failed code=StaleHydration`; следующий старт: `migrate_skip already_done` → `applied … cards_added=3 srs_written=1 library_titles_written=2` → `legacy_marker_set` → `outcome=hydrated`. На экране «Сохранённые»: 3 карточки. Старый restore в эмуляторе не работает (`boot restore failed identity_unavailable`), поэтому «сначала старый restore» не наблюдался. |
| C. выключатель 7A вкл | **PARTIAL** | restore: `legacy_restore_decision skip=true reason=v2_owns_domains flag=true client=true platformSupported=true hydrated=true` + `legacy_skip domain=saved_cards/swipe_memory/community_library phase=restore keys=1`. Удаление карточки a1 (долгое нажатие → «Удалить»): `journal record list=saved count=1` → `producer done kind=card_snapshot planned=1` → `transport call_ok ops=1`; V2: `en:saved:a1 rev=4 {deleted:true}`; старое облако: `progress.flashcards_v1` по-прежнему `[a1,a2,a3]`. `legacy_write_decision` НЕ наблюдался: старый `doSyncToCloud` в эмуляторе не доходит до решения — `authEnsureStableLink` → `identity_check_unavailable` (функции эмулятора: `admin.firestore.FieldValue/Timestamp` undefined, блокер 1, node 24 вместо 22) и ранний `return` без лога. |
| D. выход → вход тем же | NOT_RUN | — |
| E. смена a→b→c | NOT_RUN | — |
| F. выключатель выкл | NOT_RUN | (по коду: при `false` решение не вызывается и не логируется — проверено только тестами 7A) |
| G. названия наборов (7C) | **PASS** | названия пришли «с другого устройства» (настоящий `accountsV2SyncApply`, отдельная операция `itemTitles`, `applied serverRevision=2`) → на новой установке `library_titles_written=2`, локально `community_owned_pack_titles_v1` = «Набор Путешествия», «Набор Кафе». |
| H. удалённая не воскресает после pm clear | NOT_RUN | pm clear + вход a: dev-вход дважды не обработался (`lifecycle skip reason=auth_changed`, строки входа нет), время вышло. Риск остаётся: после pm clear метки нет → старый restore со старым облаком, где a1 жив. |
| I. откат 7B | NOT_RUN / BLOCKED | старый писатель в эмуляторе не пишет вовсе (см. C) — возобновление записи после выключения флага здесь не наблюдаемо. |
| J. старый клиент после done (PM-235) | **PASS — риск подтверждён** | запись «старого клиента» прямо в `users/stable-e2e-a.progress.flashcards_v1` (+`oldclient1`, `last_active_at`) после done: `pull a entities=6` — `oldclient1` нет; `migrate a status=already_done ops=0` — повторного сканирования нет; при выключателе вкл restore эти ключи пропускает. Правка со старого телефона после переноса для V2 невидима. |

### Найденные дефекты

1. 🔴 **Перенос OD21 уходит в HOLD у реальных людей**: корень `users/{id}` несёт служебные поля, которых нет в
   `ROOT_RULES` (`functions/src/accounts_v2_migration/inventory.ts`): `accountGeneration` (пишет Learning V2 при первом
   обращении), `updatedAt`, `last_active_at`/`created_at` (пишет старый cloud_sync на каждой записи) → `unknown_field` → hold
   ВСЕГО аккаунта. В 6G не пойман: в сиде были только `progress` и `canonicalStableId`. Нужна классификация корневых полей
   по реальной переписи (решение координатора/владельца: drop/keep_in_place) и сторож с реальным составом документа.
2. 🟡 **Гидрация: «persist_failed» без причины**: `persistFlashcards` (hooks/use-flashcards.ts) выходит `return false` 4 раза
   без лога и глушит исключение немым `catch {}` → `apply_failed StaleHydration`; самоизлечилось на следующем старте.
   Логи ранних выходов ставил для диагностики, но откатил: по указанию координатора коммитится только квитанция
   (пакет `account-v2-e2e-flashcards-persist-logs-2026-10-01.md`).
3. 🟡/💸 **Лишние записи после гидрации**: сразу после `hydrate done` производитель отправил `card_snapshot planned=3` —
   засеянное зеркало отличается от локальной карточки полями `studyTarget/packLanguage`; ревизии a2/a3 выросли до 3
   без изменений пользователя.
4. 🟡 Экран «Мои наборы» с id наборов, которых нет в каталоге, висит на скелетоне (эмулятор, каталог пуст).
5. Окружение: dev-клиент после pm clear грузит бандл с `10.0.2.2:8081` и рвётся на 68 МБ (`ProtocolException: Expected
   leading [0-9a-fA-F] character but was 0xd`); помогло `debug_http_host=localhost:8081` в префах + `adb reverse`.
   Чужие правки дерева перезагружали JS каждые 1–2 мин (и раз уронили Главную `noAndroidOutline`), выключено HMR-префом
   тестового приложения.

### Уборка

Флаги эмулятора Firestore возвращены (`accounts_v2_client_enabled=false`, `accounts_v2_legacy_sync_disabled=false`,
`syncEnabled=false`), затем эмуляторы остановлены (деревья процессов сняты, порты 4000/4400/4500/5001/8080/9000/9099/9199/8081
свободны), свой бандлер остановлен, `adb reverse --remove-all`. Данные app.phraseman восстановлены из снимка до прогона
(108 681 728 байт; после распаковки files/databases/shared_prefs/no_backup ≈ 107 МБ), приложение остановлено.
Код приложения не изменён (диагностическая правка откачена, diff пуст). Очередь эмулятора не отдана — отдаёт координатор.
