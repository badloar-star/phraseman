# Metro раздувается до 5–6,5 ГБ за 10–20 минут — причина и безопасная правка конфигурации

Governance-ID: TG-CDE4B9A03EB6
Status: Ready — правка подготовлена, НЕ применена (ждёт подтверждения «Эмулятора» на перезапуск Metro)
Owner: сессия «4 · ТЕМЫ 2.0» (по просьбе координатора 23:58)
Related epic/enabler: ПК падал до 0,5 ГБ свободной памяти 4 раза за вечер 10.10

## Outcome

Причина найдена по коду и по замеру уже запущенного Metro (второй Metro не запускался). Подготовлена правка конфигурации: ограничить число процессов-преобразователей в разработке и исключить из обхода папки, которых приложение не импортирует. Release-сборка (EAS) правкой не затрагивается — проверено.

## Scope

In scope: анализ, правка `metro.config.js` в виде патча, описание, скрипт замера `scripts/dev_node_memory.ps1`.
Out of scope: запуск Metro, применение патча без подтверждения, удаление чужих временных папок, `.watchmanconfig` (см. ниже).

## Architecture

### Главная причина — число процессов-преобразователей (≈ 5 из 6,5 ГБ)

Metro сам выбирает число воркеров (`node_modules/metro-config/src/defaults/getMaxWorkers.js`):

```
workers = max(1, ceil(cores × (0.5 + 0.5·exp(−cores × 0.07)) − 1))
```

На этой машине **24 логических ядра** → **14 воркеров** (`jest-worker/processChild`). Expo CLI берёт `options.maxWorkers ?? config.maxWorkers` (`@expo/cli/.../instantiateMetro.js:153`), а в `metro.config.js` значения нет — действует формула.

**Замер живого сеанса 10.10** (`scripts/dev_node_memory.ps1`, только чтение): `expo start --dev-client --port 8081` (pid 36480, 269 МБ) + **ровно 14 процессов jest-worker**. Сразу после старта они лёгкие (по ~49 МБ, всего 686 МБ), но каждый воркер при преобразовании модулей грузит Babel, пресеты и кэши AST и растёт до **300–450 МБ**, при этом Metro их не пересоздаёт. Арифметика: 14 × ~400 МБ + основной процесс 1–1,5 ГБ ≈ **5,5–7 ГБ** — это и есть наблюдаемые «5–6,5 ГБ за 10–20 минут» (воркеры раскручиваются по мере запросов бандла, параллельная сборка Android + Web/iOS ускоряет рост).

Оговорка: рост каждого воркера я не измерял (Metro только что стартовал); цифра 300–450 МБ — типичный размер Babel-воркера Metro, подтвердить предстоит замером через 15 минут после перезапуска (команда ниже).

### Вторичная причина — лишний обход корня (CPU, события файлов, дубли пакетов; на память почти не влияет)

Блок-лист Metro (`ignoredRootFolders`) и `ignore_dirs` Watchman не знают о папках, которые накопились в корне. Файлов, которые Metro сейчас индексирует зря (замер `find`, 10.10):

| Папка | Файлов | Заметка |
|---|---|---|
| `android` | 8 792 | нативная сборка, в git нет |
| `functions-admin` | 7 511 | со своим `node_modules`, в git есть |
| `functions-content` | 6 690 | со своим `node_modules` |
| `functions-english-test` | 5 926 | со своим `node_modules` |
| `output` | 3 169 | выгрузки |
| `dist` | 2 751 | выгрузки (в Watchman уже игнорируется, в блок-листе нет) |
| `.tmp` | 1 043 | |
| `.arena-*` (7 папок) | ≈ 2 000 | копии сборок |
| `.tmp_*_backup` (≈ 80 папок) | ≈ 1 500 | копии исходников |
| `asset_sources`, `_archive`, `_to_delete`, `prototypes`, `.agents`, `.dev-screens`, `backups`, `specs`, `hardware`, … | ≈ 600 | |

Итого ≈ 40 тыс. файлов. Карта файлов сама по себе — мегабайты, поэтому это **не** причина гигабайтов; но обход, события изменений (сборки пишут в эти папки постоянно) и **дубликаты `package.json`/haste-имён** из трёх `functions-*/node_modules` нагружают CPU и засоряют граф. `content` и `docs` уже исключены (`content` — незакоммиченной правкой другой сессии TG-441DCCC0ACA3).

Что НЕ является причиной: `require.context` в `router.ctx.js` читает только `app/` (≈ 1 195 файлов, один контекст); `watchFolders` не заданы (по умолчанию корень проекта); кэш — штатный `FileStore` в временной папке; Watchman занимает 18 МБ; `inlineRequires` выключен по умолчанию.

## Правка (патч `docs/work/tasks/bundler-memory-fix-2026-10-10.patch`, 53 добавленных строки)

1. **`config.maxWorkers = 4`** для локальной разработки. Не ограничиваются сборочные машины: `EAS_BUILD=true`, `CI=true`, `EXPO_PUBLIC_STORE_RELEASE=1` (там остаётся формула Metro). Своё число для любого случая: `PHRASEMAN_METRO_MAX_WORKERS=N`.
   Проверено загрузкой предложенной конфигурации в Node (без запуска Metro): dev → 4; EAS → 14 (как раньше); стор-релиз → 14; EAS + ручное 2 → 2.
   Цена: холодный первый бандл на пустом кэше медленнее (4 вместо 14 процессов); с тёплым кэшем разница почти не заметна.
2. **Блок-лист**: ещё 24 корневые папки (`android`, `dist`, `output`, `functions-admin`, `functions-content`, `functions-english-test`, `asset_sources`, `_archive`, `_to_delete`, `animation-plans`, `backups`, `hardware`, `lingman-montazher`, `maestro-results`, `prototypes`, `showcase`, `specs`, `test-results`, `ux-audit`, `.agents`, `.artifacts`, `.codex`, `.dev-screens`, `.maestro`, `.motion-mockups`, `.shots`) и пять **префиксов** одноразовых папок: `.arena-`, `.tmp`, `.codex-tmp`, `_scoped_build_`, `_worktree_backups_` (регэксп привязан к корню проекта — вложенные папки вроде `node_modules/.tmp` не задеты).

### Почему это безопасно для release-сборки

- **Приложение эти папки не импортирует.** Проверено `git grep` по `app components constants modules hooks lib shared services index.js` на импорты/`require` каждой исключаемой папки — 0 совпадений; контроль самой проверки: на заведомо импортируемых `assets` / `modules` / `constants` она находит 665 / 488 / 990 импортов.
- **EAS клонирует репозиторий из git:** рабочие копии вне git (`android`, `output`, `dist`, `.tmp_*`, `.arena-*`…) в сборке вообще отсутствуют; для папок в git (`functions-*`, `asset_sources`, `_archive`…) исключение из обхода означает лишь «не индексировать», а импортов нет.
- **Не затронуто:** `runtime-probes`, `web_shims`, `store_release_stubs`, `config`, `plugins`, `patches`, `targets`, `shared`, `hooks`, `lib` (нужны разрешению модулей, подменам и плагинам).
- Проверка регэкспов на 39 реальных путях (16 должны блокироваться, 23 — проходить): ошибок нет, кроме ожидаемого прежнего поведения `runtime-probes` (давно заблокирован без флага `EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF=1`).

## Как применить (только после подтверждения «Эмулятора»)

```bash
# 1. Применить патч (рабочий файл конфигурации сейчас с CRLF и чужой незакоммиченной правкой content — патч поверх неё)
git apply --ignore-whitespace --check docs/work/tasks/bundler-memory-fix-2026-10-10.patch
git apply --ignore-whitespace docs/work/tasks/bundler-memory-fix-2026-10-10.patch
# 2. Перезапустить Metro с очисткой кэша один раз (список исключений поменялся)
#    expo start --dev-client --port 8081 --clear   (через супервизор Эмулятора)
# 3. Через 15 минут работы снять замер памяти
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev_node_memory.ps1
```

Ожидаемый результат замера: процессов `worker` 4 (было 14), суммарно воркеры ≈ 1,2–1,8 ГБ вместо 5+ ГБ.

## Security and privacy

Не применимо.

## Technical debt

- `.watchmanconfig` не обновлён: `ignore_dirs` — точные имена, а временных папок ≈ 80 с изменчивыми именами; Watchman их отслеживает (18 МБ, не проблема). Если понадобится — убрать сами временные папки (`.tmp_*_backup`, `.arena-*`: ≈ 5 тыс. файлов, решение владельца/координатора).
- Если и 4 воркера дадут рост выше 3 ГБ за 20 минут — следующий шаг: `PHRASEMAN_METRO_MAX_WORKERS=2` и/или перезапуск Metro по расписанию; корень роста тогда — граф самого приложения (в dev контекст роутера синхронный и тянет весь `app/`, включая лаборатории).
- `metro.config.js` сейчас с чужой незакоммиченной правкой (`content`) — патч накладывается поверх неё.

## Verification

- Замер живого Metro: `scripts/dev_node_memory.ps1` (1 основной + 14 воркеров, свободно 7,7 из 32 ГБ).
- Формула и источник: `getMaxWorkers.js`, `instantiateMetro.js:153`.
- Проверка конфигурации: загрузка копии в Node + 39 путей (см. выше).
- Проверка импортов: `git grep` по коду приложения.

## Rollback

`git apply -R --ignore-whitespace docs/work/tasks/bundler-memory-fix-2026-10-10.patch` или переменная `PHRASEMAN_METRO_MAX_WORKERS=14` (вернёт прежнее число воркеров без отката файла).
