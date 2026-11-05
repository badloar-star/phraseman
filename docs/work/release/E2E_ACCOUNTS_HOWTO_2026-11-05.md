# E2E: тестовые аккаунты и эмуляторы Firebase — как пользоваться (06.11, без секретов)

Составлено Входом. Паролей здесь нет: они лежат в игнорируемом файле `scripts/accounts-v2-emulator-seed.local.json` (и пересоздаются командой ниже).

## 1. Какие аккаунты бывают

| Что | Где живёт | Как войти | Примечание |
|---|---|---|---|
| **Три Google-аккаунта владельца (№1, №2, №3)** | уже залогинены в системе AVD Pixel_8 (боевой Firebase) | обычный вход «через Google» в приложении, паролей вводить не нужно | №1 НЕ трогать. Удаление аккаунта (A9) — только №3 и сразу восстановить (A10, ≤14 дней). Описание: `docs/work/tasks/auth-scenario-matrix-2026-10-18.md` §A, §E |
| **Эмуляторные `accounts-v2-e2e-a/b/c@phraseman.test`** | Auth-эмулятор на ПК (исчезают при остановке эмулятора) | dev-ссылка `phraseman://dev-emulator-login?email=…&password=…` (пароль из gitignored `scripts/accounts-v2-emulator-seed.local.json`) | Единственные учётки, которые принимает dev-вход. Создаются «сейчас» → после метки среза 01:15:50Z это НОВЫЕ аккаунты (подходят для «новичка») |
| **Эмуляторные `veteran@e2e.test`, `newbie@e2e.test`** | Auth + Firestore эмулятора (`scripts/e2e/seed.mjs`) | пароль `E2E_PASSWORD` (по умолчанию локальный, не боевой) | Для сценариев с готовым прогрессом (ветеран: уроки 1–9). dev-вход их НЕ принимает (только `accounts-v2-e2e-*`) — подходят для Maestro-входа через экран e-mail, если он есть в сборке, либо для чтения данных |

## 2. Поднять эмуляторы (сделано Входом 06.11; снова — по команде)

Условие: на ПК свободны порты 9099 и 8085. Порт 8080 занят Open WebUI владельца и НЕ используется.

```bash
bash scripts/e2e/start_emulators.sh        # Auth 9099 + Firestore 8085, только 127.0.0.1 (конфиг firebase.e2e.json), данные в .e2e-emulator-data
node scripts/e2e/seed.mjs                  # ветеран + новичок в эмуляторах
```

Проверка: `curl http://127.0.0.1:8085/` → `Ok`; `curl http://127.0.0.1:9099/` → HTTP 200. Остановить: завершить процесс `firebase emulators:start` (и только его).

## 3. Свежие аккаунты для dev-входа

Создаются прямо в Auth-эмуляторе (REST), пароли берутся из gitignored файла (если его нет — сид `scripts/accounts-v2-emulator-seed.mjs` создаст и запишет):

```bash
node C:/Temp/claude/emu_accounts.mjs      # вход/создание a, b, c (только 127.0.0.1:9099); вывод — «создан/есть», без паролей
```

(если файла нет под рукой — попросить Вход; скрипт читает `scripts/accounts-v2-emulator-seed.local.json`).

## 4. Dev-сборка на эмулятор Pixel_8_fresh (Maestro)

1. Сервер разработки: `bash scripts/e2e/metro_emulator.sh` (порт 8082; задаёт `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=10.0.2.2` и `EXPO_PUBLIC_FIREBASE_EMULATOR_FIRESTORE_PORT=8085`). Для проверки гейтов дополнительно `EXPO_PUBLIC_DEV_FORCE_FLAGS=rank_gates_enabled,section_openings_enabled`.
2. Чистая установка (на fresh AVD очистка данных разрешена — это не устройство владельца).
3. Онбординг до конца → вход: `adb shell am start -a android.intent.action.VIEW -d "phraseman://dev-emulator-login?email=accounts-v2-e2e-a@phraseman.test&password=<из gitignored файла>"`.
4. В журнале: `[FIREBASE-EMU] connected host=10.0.2.2 services=auth,firestore,functions` (функций в этом конфиге нет — вызовы функций, в том числе бонус +500, в эмуляторе НЕ выполнятся; бонус проверять только по журналу `[RANK-GATE] first_lesson_bonus` и локальному начислению).
5. Дальше — шаги `E2E_NEWBIE_STEPS_2026-11-05.md` и `NEWBIE_E2E_NOT_ON_DEVICE_2026-11-05.md`.

## 5. Тестер Google Play (Q8, замена подписки)

Решение координатора 06.11: считать аккаунты №2/№3 лицензионными тестерами. Сценарий: месячная подписка Plus → экран оплаты → годовой → в Play одна активная подписка, режим `DEFERRED`. Если Play или RevenueCat вернут отказ «не тестер» — записать ТОЧНЫЙ текст ошибки в журнал (`[PLAN-CHANGE]`) и сообщить координатору: это единственный повод писать владельцу. Покупки на не-тестерском аккаунте приведут к реальному списанию — перед подтверждением в окне Google Play убедиться, что есть пометка «тестовая покупка / test card»; без неё НЕ подтверждать.

## 6. Сквозное удаление (Ядро)

№3 → удаление (A9) → сразу восстановление (A10). Журнал: `[ACCOUNT-DELETE-UI]`, `[ACCOUNT-RESTORE]`. Окно согласуют Ядро и Сверка; исполняет тот, у кого управление AVD.
