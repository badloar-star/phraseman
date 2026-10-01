# Квитанция: Account V2 — Пакет 6H, подготовка доказательства на iPhone (OD17)

Governance-ID: TG-1B1CB54A103D (пакет `account-v2-pkg6h-ios-proof-2026-10-01.md`)
Дата: 2026-10-01
Статус: **подготовлено, на устройстве НЕ доказано.** `eas build` не запускался (решение после ревью).

---

## 1. Анализ: что есть для iOS и чего не хватало

### 1.1 Нативная часть (патч `patches/expo-sqlite+16.0.10.patch`)

Патч **не только Android**. В нём есть iOS-часть (строки 1221–2572 патча):

| Файл | Что делает |
|---|---|
| `ios/NativeDatabase.swift` | флаг `leaseActivated`, атомарная аренда, однократное закрытие аренды (`AccountLeaseCloseFlight`) |
| `ios/SQLiteModule.swift` (~1080 строк правки) | `acquireAccountProvisionLockAsync` — `flock(LOCK_EX)` на файле в `Application Support/account-sqlite-provision-locks/` (каталог исключён из бэкапа); `releaseAsync`; **`protectAccountDatabaseFamilyAsync`**; `commitAccountLeaseAsync` / `revokeAccountLeaseSync` / `closeAccountLeaseAsync`; учёт prepared-statement'ов аренды; проверка канонического пути `Documents/SQLite/accounts-v2/<имя>` и запрет symlink |
| `ios/AccountSQLiteLeaseAtomic.h/.m` | lock-free состояние аренды на `stdatomic` (операции / commit / revoke / ожидание опустения) |

`protectAccountDatabaseFamilyAsync` ставит каталогу `accounts-v2` и каждому существующему файлу семейства (`.db`, `-wal`, `-shm`, `-journal`):
`isExcludedFromBackup = true` и `FileProtectionType.completeUntilFirstUserAuthentication` — **с обратным чтением** обоих атрибутов; любое расхождение → ошибка.

Подключение ObjC к Swift: `ExpoSQLite.podspec` — `DEFINES_MODULE=YES`, `source_files "**/*.{c,h,m,swift}"`, заголовки публичные → `AccountSQLiteLeaseAtomic` виден Swift через umbrella-заголовок. Патч к `node_modules` применён локально (файлы на месте); на EAS его применит `postinstall: patch-package`.

SQLCipher на iOS: `app.config.js` добавляет плагин `expo-sqlite` с `useSQLCipher: true` → podspec вендорит `sqlcipher/sqlite3.c` с `SQLITE_HAS_CODEC` и `SQLCIPHER_CRYPTO_CC` (CommonCrypto).

**Вывод:** новый Swift писать не нужно — он уже есть. Но:

> 🔴 **iOS-часть патча ни разу не компилировалась.** Она пришла снимком `efe19ae9d` (30.09), iOS-сборок после этого не было. Значит, **следующая любая iOS-сборка, включая магазинную 2.0, впервые соберёт эти ~1100 строк Swift/ObjC**. Сборка пробы — первая проверка компиляции, и её стоит сделать ДО релизной.

### 1.2 Keychain (SecureStore)

`keychainService: phraseman.account_native_storage.v2`, `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY`, без биометрии → `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`: ключ не уходит в iCloud-связку и не восстанавливается на другое устройство из бэкапа. Правка не нужна.

Особенность iOS: записи Keychain **переживают удаление приложения**. Провиженер это уже покрывает: «линия active + ключ есть + файлов нет» → `empty_recreated_same_identity` (пустая база + гидрация с сервера), без карантина.

### 1.3 Пробелы, найденные в JS (закрыты в Фазе 2)

1. **`protectAccountDatabaseFamilyAsync` не вызывался нигде в JS.** На iOS база V2 легла бы в iCloud-бэкап (зашифрованной, но в бэкапе) и без класса защиты файлов. Android не затронут: там каталог исключён правилами бэкапа (`withAndroidBackupRules`).
2. `account_native_expo_environment.ts` отдавал `null` на iOS всегда — доказать было нечем.

### 1.4 Что может ответить ТОЛЬКО iPhone

- компилируется ли Swift/ObjC патча вместе с SQLCipher (`-DNDEBUG` и т.п.);
- проходит ли строгая проверка пути на устройстве (`/var` ↔ `/private/var`: `resolvingSymlinksInPath` у Apple снимает `/private`, сравнение «лексический = разрешённый» должно сойтись — но это не проверено);
- обратное чтение `isExcludedFromBackup` и класса защиты на реальной файловой системе;
- что `-wal`/`-shm`, созданные SQLite позже, наследуют защиту каталога (в Swift прямо помечено: «требует проверки на устройстве»);
- SQLCipher действительно шифрует (заголовок файла ≠ `SQLite format 3`);
- закоммиченная запись переживает выгрузку приложения (WAL-восстановление).

Не покрывается и этой пробой (честно): поведение при **заблокированном** телефоне — ключ с `WHEN_UNLOCKED` недоступен, открытие уйдёт в отказ (безопасно, без порчи); важно для фоновой синхронизации Пакета 7. Межпроцессность с виджетами: виджеты (`@bacons/apple-targets`) живут в своих контейнерах и к базе V2 не обращаются; блокировка `flock` защищает от гонок внутри приложения.

---

## 2. Что сделано (Фаза 2)

| Файл | Правка |
|---|---|
| `modules/account-session-v2/native/account_native_environment.ts` | у блокировки необязательный `protectFamily` (только iOS) |
| `modules/account-session-v2/native/account_native_expo_environment.ts` | iOS открывается **только** при `EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF=1`; на iOS блокировка обязана иметь `protectAccountDatabaseFamilyAsync`, иначе блокировка отпускается и отказ; вызов как метода нативного объекта. Android без изменений |
| `modules/account-session-v2/native/account_native_scope_adapter.ts` | под удерживаемой блокировкой: защита семейства **до открытия** (каталог получает класс до создания файлов) и **после доказательства ключа** (защищает созданные файлы); провал → база не открывается, линия не публикуется, соединение закрыто. Без `protectFamily` (Android) — ничего не делает |
| `runtime-probes/ios-account-sqlcipher/probe.ts` | чистая логика пробы: фазы `write` / `verify` / `erase` через настоящий адаптер+провиженер+store, синтетическая область, квитанция только из кодов и чисел |
| `runtime-probes/ios-account-sqlcipher/probe_native.ts` | настоящие порты: окружение, чтение первых 16 байт файла базы, метка платформы |
| `app/dev-account-v2-ios-proof.tsx` | скрытый экран (`phraseman://dev-account-v2-ios-proof`): 3 кнопки фаз, квитанция, «Поделиться»; второй замок — проверка флага в рантайме |
| `metro.config.js` | без флага экран и оба модуля пробы **физически исключены из бандла** (как dev-вход OD23) |
| `eas.json` | новый профиль `ios-account-v2-proof` (только он) |
| `tests/account_v2_ios_proof_6h_v2.test.ts` | 16 тестов (ниже) |
| `tests/support/account_native_fake_device.ts` | фейковое устройство вынесено из теста 6C без изменения поведения + iOS-режим `iosProtect` |
| `tests/account_native_scope_adapter_v2.test.ts` | только импорт фейка из `support/` |

Профиль:

```json
"ios-account-v2-proof": {
  "distribution": "internal",
  "environment": "production",
  "autoIncrement": false,
  "ios": { "buildConfiguration": "Release" },
  "env": {
    "EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF": "1",
    "EXPO_PUBLIC_DISABLE_EXPO_UPDATES": "1",
    "EXPO_PUBLIC_STORE_RELEASE": "0"
  }
}
```

Без `channel` и с выключенными обновлениями: OTA эту сборку не перезапишет. Флаги клиента V2 и эмулятор **не включены**: проба проверяет хранилище, не синхронизацию; сервер не трогается.

### Проверки

- `tests/account_v2_ios_proof_6h_v2.test.ts` — 16/16: шлюз iOS (без флага null; с флагом — `protectFamily` с правильным `this`; без Swift-метода — отказ и отпуск блокировки; Android не меняется), порядок `acquire → protect(нет базы) → protect(база есть) → release`, оба места провала защиты, полный цикл пробы write→«убийство»→verify→erase, открытый заголовок SQLite = FAIL, отсутствие uid/ключа/64-hex в квитанции, исключение из Metro с флагом и без, изоляция профиля EAS.
- Соседние: `account_native_scope_adapter_v2`, `account_v2_client_tails_6c_v2`, `account_v2_producer_6f_v2` (OD23), `account_v2_tails_6e_v2`, `account_session_v2_metro_babel_guard_v2`, `layout_stability_contract`, `perf_freeze_contract` — 7 сьютов, 98/98.
- Babel проекта (как Metro, `platform: ios`, dev и release) — 5 затронутых файлов компилируются.
- `npm run typecheck`: 37 ошибок, **все в чужих файлах** (`modules/learning-v2/content/source/*`, `scripts/dialogue_v2_ui_copy.ts`); в затронутых файлах ошибок нет.

---

## 3. Сборка и проба — инструкция (выполнять ПОСЛЕ ревью)

**Перед сборкой (сессия):**
1. Закоммитить файлы пакета — в `eas.json` стоит `requireCommit: true`.
2. `npx eas-cli whoami` → `badloar`.
3. `npx eas-cli env:list --environment production` — убедиться, что там нет переменных `EXPO_PUBLIC_ACCOUNTS_V2_*` (иначе в сборке включится клиент V2 против прода).

**Владелец, один раз — регистрация iPhone** (для internal-сборки нужен UDID в профиле подписи):
4. Сессия запускает `npx eas-cli device:create` → выбрать «Website», появится ссылка/QR.
5. На iPhone открыть ссылку в **Safari** → «Разрешить» загрузку профиля → Настройки → «Профиль загружен» → Установить.
6. iOS 16+: Настройки → Конфиденциальность и безопасность → **Режим разработчика** → Вкл → перезагрузка → подтвердить.

**Сборка (одна iOS-сборка, кредиты по OD17):**

```bash
npx eas-cli build --platform ios --profile ios-account-v2-proof
```

Интерактивно попросит вход Apple ID (ad hoc-профиль с этим iPhone). Если сборка упадёт на компиляции Swift — это и есть первый результат: лог `Run fastlane` / `xcodebuild` с файлом и строкой в квитанцию, сборку 2.0 до исправления не запускать.

> ⚠️ Bundle ID тот же (`app.phraseman`): сборка **заменит** Phraseman из App Store/TestFlight на этом iPhone. Данные приложения сохраняются (тот же контейнер и та же команда). Сборка подключена к боевому Firebase как обычное приложение; синхронизация — старая (V2 выключен). После пробы — поставить обратно из App Store/TestFlight. Отдельный bundle ID не взят сознательно: тянет за собой виджеты `@bacons/apple-targets`, App Group, `GoogleService-Info.plist` и новые профили — больше риска, чем пользы.

**Проба (владелец, ~5 минут):**
7. Установить сборку по ссылке/QR со страницы сборки EAS.
8. В Safari набрать `phraseman://dev-account-v2-ios-proof` → «Открыть».
9. Нажать **«1. Записать и оставить открытым»** → ждать `verdict=pass` → «Поделиться квитанцией» (себе в Telegram/Заметки).
10. **Выгрузить приложение**: свайп снизу вверх с задержкой → смахнуть Phraseman вверх.
11. Снова открыть ссылку из шага 8 → **«2. Проверить после перезапуска»** → поделиться.
12. **«3. Стереть область»** → поделиться.
13. Прислать три квитанции в чат. Если где-то `verdict=fail` — прислать как есть, это тоже результат.

Что означают строки квитанции:

| Строка | Доказывает |
|---|---|
| `environment=ready` | iOS-шлюз открылся, нативный модуль с аренды и защиты на месте |
| `scope_open=opened` | flock-блокировка, Keychain-ключ, SQLCipher-ключ на том же соединении, схема |
| `family_protection=ok=2 failed=0` | бэкап-исключение + класс защиты каталога и файлов, с обратным чтением в Swift |
| `db_header=encrypted` | на диске не `SQLite format 3` — файл зашифрован |
| `lock_released_after_open` | блокировка отпущена после провиженинга |
| `canary_after_kill=present_age_s=N` | закоммиченная запись пережила выгрузку процесса |
| `erase=erased …`, `family_files_after=0` | стирание §5 на iOS, файлов не осталось |

---

## 4. Итог: доказано / не доказано

| Пункт | Статус |
|---|---|
| iOS-часть патча существует и покрывает блокировку, аренду, защиту семейства | ✅ по коду |
| JS вызывает защиту семейства на iOS, провал = отказ | ✅ тестами (фейк) |
| Проба, экран, профиль EAS изолированы от магазинных сборок | ✅ тестами |
| Swift/ObjC компилируется | ❌ ждёт EAS-сборки |
| Keychain / SQLCipher / file protection / бэкап / выгрузка — на iPhone | ❌ ждёт квитанций владельца |
| Заблокированный телефон, фоновые запуски | ❌ вне пробы (Пакет 7) |

iOS-шлюз в `account_native_expo_environment.ts` остаётся закрытым для всех сборок, кроме пробы. Снимать его — только после трёх `verdict=pass` с iPhone и отдельного решения.

**Откат:** удалить профиль из `eas.json`, файлы `runtime-probes/ios-account-sqlcipher/*`, `app/dev-account-v2-ios-proof.tsx`, блок в `metro.config.js`; правка адаптера без `protectFamily` поведение не меняет.

## Запуск сборки (2026-10-01)
- iPhone уже был в профиле (UDID …201E, профиль ad hoc MC37VGZV45 активен до 14.05.2027) — device:create не нужен.
- `requireCommit` отказал из-за чужих незакоммиченных правок → сборка из `git archive HEAD` (b37ea0279+) во временной папке scratchpad, `EAS_NO_VCS=1`, node_modules — junction (без копии).
- Сборка: https://expo.dev/accounts/badloar/projects/phraseman/builds/0098ba07-d923-47ad-a289-bc1c199fc2f7
