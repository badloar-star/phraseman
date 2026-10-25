# Аудит: можно ли выпустить обновление по воздуху на 2.0.2 прямо из HEAD (25.10, Ядро)

Задача координатора (решение владельца): одно обновление по воздуху на сборку 2.0.2 (144), runtime 2.0.2, без сборки 2.0.3, собранное
прямо из HEAD при недельном лимите 95 % и 🟢 Ревизора. Проверено на HEAD e67046de6 (122 коммита после 009c40c97).

## Итог

**Нативная часть HEAD совместима со сборкой 2.0.2. Коммиты исключать не нужно.**
Есть одно обязательное условие самой выкладки (раздел 3) и две проверки перед ней (раздел 4).

## 1. Нативная часть — без изменений

| Что | Как проверено | Результат |
|---|---|---|
| package.json, package-lock.json, pnpm-lock.yaml | `git diff 009c40c97 HEAD -- …` | не менялись |
| app.json: runtimeVersion, version, plugins | сравнение `expo` в обеих ревизиях | runtimeVersion 2.0.2 = 2.0.2, plugins равны |
| eas.json, babel.config.js, конфиг сборщика, index.js, react-native.config.js, patches/, plugins/ | `git diff --stat` | не менялись |
| android/, ios/ | `git ls-files android ios` | в git их нет (генерирует EAS) — нечему меняться |
| Новые обращения к нативным модулям в JS | добавленные строки: requireNativeModule, requireOptionalNativeModule, NativeModules., TurboModuleRegistry, getViewManagerConfig, codegenNativeComponent | ни одного |
| Новые импорты пакетов в JS приложения | все добавленные `from '…'` / `import('…')` / `require('…')` против package.json 2.0.2 | 10 пакетов, все уже есть: @expo/vector-icons, async-storage, netinfo, expo-image, expo-linear-gradient, expo-router, react, react-native, reanimated, react-native-svg |

Версии пакетов те же, а значит, у JS те же нативные API, что в сборке 144.

## 2. Связь клиента с сервером

- Клиент HEAD упоминает те же 116 серверных функций, что и 2.0.2. **Новых вызовов нет.**
  (Имена из functions/src/index.ts обеих ревизий плюс все функции на бою, поиск строк в кавычках в app/components/hooks/modules.)
- Не выложены, но и в 2.0.2 так же: `accountsV2MigrateMine`, `accountsV2PullMine`, `accountsV2SyncApply`. Это Account V2 за выключенным
  флагом `accounts_v2_client_enabled`.
- Сервер менялся после 009c40c97 в трёх коммитах:
  - 29c5c251a (поддержка) — выложен 25.10 ~12:00, 20 функций;
  - ec03e9e58 и ccd507589 («золотое задание» Пика: spire_golden, spire_progress) — **не выложены**, spireReportSteps на бою с 08:22.
  Клиент защищён дважды. Флаг `spire_gold` по умолчанию `false`. Даже при включённом флаге золото показывается, только если ответ
  spireReportSteps назвал версию правила `goldRule ≥ 1` (app/spire/spire_gold_server.ts), иначе журнал `gate reason=server_too_old`.
  **Включать `spire_gold` в «Пульте» — только после выкладки функций Пика.**

## 3. 🔴 Обязательно при выкладке: переменные магазинной сборки

`EXPO_PUBLIC_STORE_RELEASE=1`, `EXPO_PUBLIC_AI_DIALOG_ENABLED=true` и `EXPO_PUBLIC_EXPLAIN_ENABLED=true` заданы в eas.json в профиле
**сборки** (`build.production.env`). `eas update` профиль сборки не читает. Если переменная не попадёт в окружение выкладки:
- `IS_STORE_RELEASE` (app/config.ts:57) станет `false` — включатся отладочные инструменты;
- сборщик не подменит отладочные модули заглушками (конфиг сборщика, строки 216 и 245), и настоящие `dev_*` уедут людям.

Выкладка — в чистом снимке HEAD, в одну строку с переменными. Команды для координатора, запускаются после 🟢 Ревизора и «да» владельца:

```bash
FULL=$(git -C /c/appsprojects/phraseman rev-parse HEAD) && rm -rf /c/Temp/claude/ota_2_0_2 && mkdir -p /c/Temp/claude/ota_2_0_2 && git -C /c/appsprojects/phraseman -c core.autocrlf=false archive "$FULL" | tar -x -C /c/Temp/claude/ota_2_0_2
```

```bash
cd /c/Temp/claude/ota_2_0_2 && npm ci --include=dev
```

```bash
cd /c/Temp/claude/ota_2_0_2 && EAS_NO_VCS=1 EXPO_PUBLIC_STORE_RELEASE=1 EXPO_PUBLIC_AI_DIALOG_ENABLED=true EXPO_PUBLIC_EXPLAIN_ENABLED=true NODE_OPTIONS=--max-old-space-size=8192 eas update --branch production --environment production --platform all --message "2.0.2 OTA: <коротко>"
```

- `NODE_OPTIONS` нужен: сборка бандла этого репозитория не влезает в кучу Node по умолчанию (4 ГБ, проверено 25.10).
- Перед выкладкой проверить, на каком branch висит канал `production`: `eas channel:view production`.

## 4. Проверить перед выкладкой

1. **release:precheck в том же снимке HEAD** — Learning V2, маршруты стора, заглушки. Схема та же, что для сборки 144: снимок + временный
   `.git` без ветки.
2. **Отладочный код в готовом бандле:** `eas update` кладёт бандлы в `dist/` снимка. Прогнать там байтовую проверку
   `node scripts/store_bundle_dev_strings_gate.mjs --dir dist`. Маркеры `dev_vip_override`, `HUB-LIFECYCLE` = 0 — как у .aab 2bc59bdc.
   Если `eas update` уже опубликовал — смотреть сразу после, при находке откатить (`eas update:rollback`).

## 5. Чего обновление по воздуху не может

Иконки, разрешения, нативные пакеты и плагины, `app.json` вне JS — только сборкой. В HEAD таких изменений нет (раздел 1).
