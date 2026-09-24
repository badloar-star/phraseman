# PM-227 — Аудит видимости существенных ошибок в админке

Разведка, код не менялся. Цель — проследить цепь ошибка → очередь → транспорт →
запись → отображение для существующего `DebugLogger`/App Health канала, и
проверить, есть ли тест, который инъецирует тестовый сбой и проверяет его путь
(не только вызов логгера).

## Цепь

```
Клиент (любой .catch / try-catch в приложении)
  └─ DebugLogger.error(context, error, severity)              app/debug-logger.ts:172
       ├─ dev-консоль (console.error/warn), только __DEV__
       ├─ ПАМЯТЬ-очередь (persistDebugLog)                     app/debug-logger.ts:129
       │    • coalescing: повтор той же (context+error+severity) в течение
       │      60 сек НЕ создаёт новую запись, только count++ и timestamp
       │    • лимит: 160 записей (MAX_DEBUG_LOGS), TTL 7 дней
       │    • на диск (AsyncStorage, ключ debug_logs_v1) уходит одна отложенная
       │      запись раз в 5 сек (DEBUG_LOG_FLUSH_DELAY_MS) — не на каждый вызов
       │    • это ЛОКАЛЬНЫЙ журнал для самого устройства — в админку НЕ уходит
       │      (см. "Контракт полей", дыра #1)
       └─ logAppError(context, error, {severity, feature, writeToFirestore})
            app/app_health.ts:130
              ├─ throttle: shouldSend() — по fingerprint = hash(context|errName|msg[:160])
              │    critical: не чаще раза в 10 мин; warning: раз в 30 мин
              │    (кэш в памяти + зеркало в AsyncStorage app_health_last_*,
              │     план хранения ≤192 ключей, TTL 7 дней, прунится раз в 6 часов)
              ├─ severity: 'info' — вообще не уходит дальше (return false в shouldSend)
              ├─ recordError() → Crashlytics (app/firebase.ts:96), best-effort,
              │    обёрнут в try/catch с логом через сам DebugLogger при отказе
              └─ ТРАНСПОРТ (если shouldWrite = writeToFirestore ?? severity==='critical'):
                   submitClientReport('app_error', {...}) → callable Cloud Function
                   app/client_reports.ts → functions/src/client_reports.ts:399
                     • auth обязателен (unauthenticated иначе)
                     • rate limit: 20/час на (kind, authUid, stableUid) —
                       functions/src/client_reports.ts:42
                     • payload очищается/обрезается на сервере (buildReportDoc,
                       kind==='app_error', client_reports.ts:313-330) — сервер НЕ
                       доверяет клиентским данным, сам режет длину полей
                     • ЗАПИСЬ: db.collection('app_errors').doc() внутри
                       runTransaction, поле status:'new'
                     • firestore.rules: app_errors — allow create: if false
                       (клиент никогда не пишет напрямую, только через callable
                       с Admin SDK) — firestore.rules:1786-1789
ОТОБРАЖЕНИЕ: admin/v2/legacy.html, раздел "App Health"
  • loadAppHealth() читает collection(db,'app_errors') постранично (500/страница,
    +1 для определения "ещё есть"), фильтр createdAt >= окно (24ч по умолчанию,
    настраивается селектором периода) — admin/v2/legacy.html:40555
  • KPI-карточки: Status (RED/YELLOW/GREEN/PARTIAL/ERROR), Critical, Warnings,
    Affected users, Top repeat — но explicitly помечены 'n/a', если страница
    неполная (health.complete !== true) — не выдают ложную точность
  • список карточек: severity, context, feature, platform, appVersion, uid→имя
    (renderUserRef), message, tags — admin/v2/legacy.html:40700-40723
  • действия: markAppHealthStatus → updateDoc(app_errors/{id}, {status, reviewedAt,
    reviewedBy}) — reviewed/fixed/known, admin/v2/legacy.html:40726
```

## Контракт полей

Из BACKEND.md: error code, operation, screen/domain, build/SHA, traceId,
severity, bounded safe context, occurrence timestamp; псевдонимизация account
identifier при необходимости.

| Поле контракта | Пишет клиент? | Долетает до Firestore (`app_errors`)? | Отображается в админке? |
|---|---|---|---|
| error code / errorName | да (`error.name`, app_health.ts:34) | да (`errorName`, client_reports.ts:321) | НЕТ — карточка показывает только `context` и `message`, `errorName` не рендерится (admin/v2/legacy.html:40700-40723) |
| operation | ЧАСТИЧНО — есть только `context` (произвольная строка типа `"health:loop_failed"`), отдельного поля `operation` нет нигде в цепи | `context` — да | да, как есть (`context`) |
| screen/domain | `feature` (первая часть `context` до `:`) и `screen` (опционально) | да | да (`feature`, но `screen` не рендерится в App Health списке — только в App Activity) |
| build/SHA | `appVersion`, `buildNumber` — да | да | **НЕТ** — карточка показывает `appVersion`, но НЕ `buildNumber` (admin/v2/legacy.html:40711-40713 не включает buildNumber) |
| traceId | **НЕТ НИГДЕ.** Ни один файл в цепи (`debug-logger.ts`, `app_health.ts`, `client_reports.ts`, `legacy.html`) не содержит поля `traceId`/`trace_id` | — | — |
| severity | да | да | да, с цветом (крит=красный, warn=жёлтый) |
| bounded safe context | да (`message` обрезан до 500/2000 символов, `stack` до 4000/8000, `tags` — максимум 20/24 ключа по 180/220 симв) | да, повторно обрезано на сервере | да (`message`, `tags`), `stack` в Firestore есть, но **в списке карточек не отображается** (только message+tags) |
| occurrence timestamp | да (`timestamp`/`createdAt`) | да (`createdAt`, `createdAtMs`, `serverTimestamp`) | да |
| псевдонимизация account identifier | **НЕТ** — `uid` пишется как есть (stableUid), `userName` — открытым текстом из AsyncStorage `user_name` | да, как есть | да — `renderUserRef` показывает имя+uid, псевдонимизации/хеширования нет |

**Явные дыры:**
1. **`traceId` полностью отсутствует** в контракте на практике — заявлен в
   BACKEND.md, не реализован ни в `debug-logger.ts`, ни в `app_health.ts`, ни в
   транспорте. Нельзя склеить один инцидент по разным устройствам/сессиям —
   единственная связка — `fingerprint` (хеш `context+errName+msg[:160]`), это
   суррогат, не полноценный trace/correlation id.
2. **`errorName` и `buildNumber` доезжают до Firestore, но не рендерятся в
   админке** — контракт "долетает" формально выполнен, но администратор их не
   видит без ручного похода в консоль Firestore.
3. **Локальный журнал (`debug-logger.ts`, AsyncStorage `debug_logs_v1`) и
   серверный канал (`app_health.ts` → `app_errors`) — это ДВЕ разные очереди.**
   Локальный журнал переживает перезапуск устройства (см. CLAUDE.md), но
   **никогда не покидает устройство** — не read-only backup для support,
   вытащить его можно только вручную (нет автоматического экспорта/отправки).
   Если severity='warning' и `writeToFirestore` не передан явно — событие
   осядет ТОЛЬКО в локальном журнале и не попадёт в admin вообще (это
   ожидаемое поведение по BACKEND.md — "не делать серверную запись на каждую
   перерисовку" — но означает, что часть warning-уровня физически невидима
   в админке, это осознанный компромисс, а не баг).
4. **Никакой явной псевдонимизации uid нет** — `stableUid` и `userName`
   пишутся как есть. Для целей поддержки это осмысленно (админ должен видеть,
   кому чинить), но противоречит букве "псевдонимизация account identifier при
   необходимости" — трактовка "при необходимости" оставлена как есть, не
   дефект, но стоит явно зафиксировать это решение отдельно.

## PII

Проверено на уровне `buildReportDoc(kind==='app_error', ...)`
(`functions/src/client_reports.ts:313-330`):
- Поля жёстко перечислены (`context`, `feature`, `screen`, `severity`,
  `fingerprint`, `errorName`, `message`, `stack`, `tags`, `userName`,
  `osVersion`, `deviceName`) — нет catch-all/`...payload`, то есть клиент
  физически не может протащить произвольное поле в документ.
- `message` обрезан до 2000, `stack` — до 8000 символов на сервере (плюс
  500/4000 на клиенте) — не может разрастись бесконтрольно.
- `tags` — максимум 24 ключа по 220 символов, типизированы
  (`string|number|boolean|null`) — нет вложенных объектов, нет способа
  протащить структуру произвольной глубины.
- Тест `client_reports.test.ts:251-271` явно проверяет, что агрегат
  (`jarvis_quality_daily`) не содержит `stableUid`/email/`stack` — но это
  тест ДРУГОГО пути (агрегированная quality-метрика), не самой записи в
  `app_errors`. Для самой записи в `app_errors` отдельного PII-теста НЕТ.
- **Остаточный риск (не баг, а неизбежное свойство любого error-reporter):**
  `message` и `stack` — это текст исключения, который пишет разработчик;
  если где-то в коде это `Error('failed for ${email}')`, PII попадёт в лог.
  Ни один слой цепи не знает семантику текста ошибки и не может отфильтровать
  email/токен из `message`/`stack` post-hoc. Это структурный лимит подхода,
  а не пропущенная проверка — стоит явно проговорить с владельцем при
  необходимости добавить redaction по паттернам (email/JWT/card).
- Токены, пароли, полные подсказки/карточки, аудио — **не собираются**:
  ни один путь в цепи не имеет доступа к этим данным (DebugLogger вызывается
  из общих catch-блоков с `Error`, а не с доменными объектами).

## Тестовое покрытие конца пути

**Тест, который инъецирует тестовую ошибку и проверяет весь путь до записи/
отображения — НЕ НАЙДЕН.** Это находка для PM-227-A2.

Что есть по частям (юнит-уровень, не сквозной):
- `tests/debug_logger_storage_contract.test.ts` — проверяет только ЛОКАЛЬНЫЙ
  журнал (`AsyncStorage debug_logs_v1`): coalescing, лимит 160, отсутствие
  console.error для warning. **Мокает `app_health` целиком** (`jest.mock('../app/app_health', ...)`),
  то есть намеренно НЕ проверяет транспорт дальше.
- `tests/app_health_throttle_cache.test.ts` — проверяет throttle-кэш и что
  `submitClientReport('app_error', {...})` вызывается с ожидаемыми полями
  (`context`, `feature`, `severity`, `message`). **Мокает `client_reports`
  целиком** — не проверяет, что запрос реально долетает до Cloud Function
  или до документа Firestore.
- `functions/src/client_reports.test.ts:251-271` — единственный тест, который
  реально прогоняет `kind:'app_error'` через `submitClientReport` (серверный
  callable) в тестовом Firestore-фейке, но проверяет **только побочный
  агрегат** `jarvis_quality_daily/.../app_errors/buckets` (для department
  Джарвиса), а НЕ сам документ в `app_errors` (нет `reportDocs('app_errors')`
  проверки, нет проверки полей `errorName`/`fingerprint`/`stack` итогового
  документа).
- Админский рендер (`loadAppHealth`, `renderAppHealthKpis`, `filterAppHealth`,
  `markAppHealthStatus` в `admin/v2/legacy.html`) — **вообще без теста**: это
  инлайн-скрипт в HTML-файле, юнит-тестов на него в репозитории нет (только
  контрактные проверки индексов/схемы Firestore в
  `tests/admin_d1_truthful_operational_surfaces_contract.test.ts`, которые
  проверяют индекс `app_errors(status ASC, createdAt DESC)`, а не сам UI).

**Вывод по A2:** сегодня "проверено" только то, что `DebugLogger.error(...)`
вызывается и что мок `submitClientReport` получает нужный payload. Ни один
существующий тест не доказывает, что инъецированная ошибка (а) реально
создаёт документ в `app_errors` с полным набором контрактных полей и (б) этот
документ виден/фильтруется/помечается в отображаемой логике админки. Три
звена цепи (локальный журнал → throttle/транспорт → серверная запись →
админ-рендер) протестированы тремя РАЗНЫМИ тестами с моками на границах,
ни один тест не идёт end-to-end.

## Вердикт

Цепь **работает end-to-end по коду** (прослежена полностью: вызов →
внутрипроцессная очередь с coalescing/лимитом/TTL → throttle → callable с
серверной валидацией/rate-limit → Firestore `app_errors` → чтение и рендер в
`admin/v2/legacy.html` → пометка статуса). Rules и индексы подтверждают, что
путь именно такой (клиент не может писать в `app_errors` напрямую, только
через callable; читает только админ; есть составной индекс под
`status+createdAt`, который использует `loadAppHealth`).

Но она **рвётся в трёх местах, не критично для работоспособности, но
противоречит заявленному контракту и acceptance A2**:
1. `traceId` из контракта не реализован нигде — заявлен, не сделан.
2. Часть долетевших до Firestore полей (`errorName`, `buildNumber`) не
   отображается в UI админки — "было бы видно", но не показано.
3. **Нет теста, который проходит всю цепь целиком** (инъекция ошибки →
   документ в `app_errors` → видимость в рендере админки) — все три теста,
   касающиеся этого пути, обрывают проверку на границе мока. Это прямая
   находка для PM-227-A2: "тестовый сбой найден, а не только вызван logger"
   сегодня не выполнено.

Ничего в коде не менялось — эти три пункта передаются родительской сессии на
решение (какие чинить, в каком порядке).
