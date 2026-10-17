# Утренняя выкладка 18.10 — сайт, политика, админка (подготовка, БЕЗ выкладки)

> Подготовил «9 · САЙТ» 17.10 вечером по заданию координатора. Ничего не выложено. Выкладка — только по слову владельца.
> Функции из R103 (в том числе R110 автоназвание и R111 восстановление по коду) — отдельной строкой реестра, здесь только хостинг.

**Порядок на утро одной строкой (для отчёта Макетов):** **0) владелец включает TTL по `expireAt` на `auth_recovery_rate_limits` и `auth_recovery_clean_rate_limits` — только сам и одной командой `bash scripts/deploy_from_clean_head.sh --only "firestore:indexes" --execute` (fieldOverrides уже в firestore.indexes.json); §4 в HEAD теперь без срока и верен при любом состоянии TTL (Ревизор 3.31)** → сайт `hosting:knowlywww` (с абзацем §4 — ✅ в HEAD) → админка `hosting:admin` → функции R111 (только после сайта с абзацем §4) → опросы: `shard_surveys_v2_seed --write` (когда «ready 13 из 13») → `shard_surveys_retire_v1 --write`; всё — словом владельца, откат у каждого шага ниже.

## 1. Сухой прогон (чистая выгрузка HEAD, без --execute)

| Цель | HEAD прогона | Проверки | Что уйдёт |
|---|---|---|---|
| `hosting:knowlywww` (knowlyapps.web.app) | 48913e286 | каркас сайта OK · страницы политики = legal/*.json OK (October 17, 2026) · `firebase deploy --dry-run` OK | 185 файлов, 14 МБ |
| `hosting:admin` (phraseman-ea0b3.web.app) | 00fc7467c | `firebase deploy --dry-run` OK · admin_hosting_deploy_guard OK (legacy redirects + inline JS) · 23 inline-скрипта `node --check` | 17 файлов, 3,9 МБ |

Скрипт сам заново выгрузит свежий HEAD и повторит все проверки перед выкладкой — утром прогон будет по тому коммиту, что будет на HEAD.

### Расхождения с продом (сверено с живыми страницами 17.10 ~23:00)

| Страница | Прод | Уйдёт |
|---|---|---|
| `/legal/privacy/`, `/legal/privacy-ios/` | October 15, 2026; абзац о согласии на разбор ошибок — без пометки | October 17, 2026; абзац и «mistake explanations» с пометкой «only in app versions earlier than 2.0.0» (750da12e7) |
| `/legal/terms/`, `/legal/data-deletion/` | заголовок вкладки по-русски («Условия использования», «Удаление данных»), data-deletion — October 15 | английский заголовок и `lang="en"` у текста; data-deletion — October 17 |
| `/premium/` | `start.js?v=20261015q` | `start.js?v=20261015r` (сброс кэша скрипта) |
| `/`, `/download/` | совпадают | — |
| админка `legacy.html` | есть вкладки «Око Саурона»/«Планы» (функции Jarvis удалены из облака — кнопки отдают not-found); нет поля названия набора | без Jarvis (86aa201b6), «Стадия роста» — локальный срез; блок «Название набора» (d7bde78f6) |
| админка `oauth-privacy.html` | October 12, 2026 | October 17, 2026 (тот же текст, что на сайте) |

## 2. Команды и порядок

```bash
bash scripts/deploy_from_clean_head.sh --only "hosting:knowlywww" --execute
```
```bash
bash scripts/deploy_from_clean_head.sh --only "hosting:admin" --execute
```

Порядок: сначала сайт (политика), потом админка. Админка безопасна и до выкладки функций R110: без сервера поле названия пишет
«Автоназвание ещё не выложено — впиши руками», сохранение черновика работает как раньше.
**Если владелец решит добавить абзац п. 3 (восстановление по коду) — сначала правка политики и коммит, потом эти команды.**

### Проверка после выкладки (2 минуты)
- https://knowlyapps.web.app/legal/privacy/ — «Last updated October 17, 2026», в §11 есть «earlier than 2.0.0».
- https://phraseman-ea0b3.web.app/ → вход → «Фразы из видео»: блок «Название набора» есть, вкладок «Око Саурона»/«Планы» нет;
  «Стадия роста» открывается без ошибки not-found.

### Откат
Firebase Console → Hosting → нужный сайт (knowlyapps / phraseman-ea0b3) → «Release history» → у предыдущего релиза «Rollback».
Одна кнопка, без сборки; сайт и админка откатываются независимо. Код в git не трогается.

## 3. Политика против ночных правок: дневной предел неверных кодов восстановления (R111, Вход)

Вопрос Входу не доставлен (сессии в разных режимах прав, сообщение истекло) — ответ ниже собран по коду `functions/src/auth_recovery.ts`
(40ad95e86, 916ae8081; в прод НЕ выложено — R103/R111).

**Что хранится** — коллекция `auth_recovery_rate_limits` (закрыта правилами, читает только сервер):
- `caller_uid_<sha256(uid входа)[0:32]>` и `caller_ip_<sha256(IP)[0:32]>` — `{count, windowStartMs, updatedAtMs}`, окно 1 час
  (≤10 писем/ч на аккаунт входа, ≤30/ч на IP);
- `wrong_target_<sha256(цель)>` и `wrong_caller_<sha256(uid)>` — счётчики неверных кодов за сутки;
- сам IP и uid в открытом виде не пишутся; в логах `[RECOVERY-LIMIT]` — только счётчики и длина цепочки x-forwarded-for.

**Новое относительно политики:** §4 уже говорит про «attempt counters and recovery records used to prevent abuse», но **IP-адрес
в приложении** политика упоминает только для сайта (§14) и Hugging Face (§13). Хэш IP — это обработка IP-адреса (псевдоним), её
надо назвать.

**🔴 До выкладки функций R111 — двое замечаний к коду (Входу/Ревизору), от них зависит формулировка:**
1. `sha256(IP)` без секретной соли обратим перебором (IPv4 — 4 млрд вариантов, минуты на ноутбуке). Нужен HMAC с секретом
   (как у кодов — `hashRecoveryCode(salt, …)`), иначе «не храним IP» неправда по сути.
2. Документы счётчиков без срока жизни — лежат вечно после окна. Нужен `expireAt` + TTL-политика Firestore (сутки), тогда в
   политике можно честно написать «удаляются в течение суток».

**Готовый абзац (до выкладки функций R111)** — дописать в §4 legal/privacy_policy_en.json и _ios.json после абзаца про код,
`npm run legal:sync`, перепин хэшей, коммит, затем выкладка сайта. Политика ведётся только на английском (legal/*.json — один
канонический текст, его показывают все 9 языков интерфейса), поэтому абзац — EN; RU — для чтения владельцем.

**ИТОГ (решение координатора 17.10: HMAC с существующим секретом кодов, expireAt по окну, TTL-политику включает владелец в R103).**
Поправка Ревизора f23e972a6: TTL Firestore удаляет документ не сразу, а в пределах ~48 ч после expireAt → «within two days»/«shortly after».
Ключи HMAC в HEAD — 07818d3da (лимиты вызывающего и неверных кодов). Лимит писем по stableId (`send_target_…`) Вход переводит на
HMAC — в рабочем дереве, в HEAD ещё нет; правка legal/*.json — только после этого коммита.
Сверено с рабочим деревом Входа (auth_recovery.ts, ещё не закоммичено на момент записи): ключи счётчиков — `createHmac('sha256',
secret)` от вида и значения; `expireAt` = начало окна + окно (1 ч для запросов, 24 ч для неверных кодов) — то есть не дольше суток.

> **EN (канон, финал):** To protect account recovery against code guessing and other abuse, the App keeps short-lived counters of
> recovery requests and incorrect codes. Each counter is identified by a keyed hash (made with a secret key) of your sign-in account
> identifier or of the IP address the request came from; we do not store the IP address itself. A counter contains only a number and
> timestamps, is used only to limit repeated attempts, and is deleted automatically shortly after the limit period ends (at most two days).

> **RU (для владельца):** Чтобы защитить восстановление доступа от подбора кода и других злоупотреблений, приложение хранит
> краткосрочные счётчики запросов на восстановление и неверных кодов. Каждый счётчик обозначен хэшем с секретным ключом от
> идентификатора вашего аккаунта входа или IP-адреса, с которого пришёл запрос; сам IP-адрес мы не храним. Счётчик содержит только
> число и отметки времени, используется только для ограничения повторных попыток и удаляется автоматически вскоре после окончания
> окна ограничения (не позже чем через двое суток).

**✅ 17.10 ~23:45 — выполнено:** абзац внесён в legal/privacy_policy_en.json и _ios.json по итогу Входа 1fa264c86/dff2faabb
(HMAC учётки входа, восстанавливаемого аккаунта/введённой почты и IP; «deleted automatically within two days»), legal:sync, пины —
коммит ниже в истории файла. Ещё за владельцем: TTL-политика по expireAt на auth_recovery_rate_limits и auth_recovery_clean_rate_limits
(R103) и разовая чистка старых документов без expireAt.

Условия, при которых абзац верен (проверить утром перед правкой политики): (1) коммит Входа с HMAC и expireAt есть в HEAD;
(2) TTL-политика Firestore на `auth_recovery_rate_limits.expireAt` включена (R103, владелец) — без неё «не дольше суток» держится
только на логике окна, а документы физически остаются; (3) выкладка функций R111 — не раньше выкладки сайта с этим абзацем.

### 3.0. ИТОГ 18.10 ~01:00 — в сборку и на сайт идёт запасная фраза (Ревизор 3.31, 86d578776)

Абзац §4 с «within two days» лежал и в `app/legal/privacy_policy_en*.json` — с ним уезжала сборка 18.10 раньше включения TTL. Поэтому
в `legal/*.json` (обе версии) последняя фраза заменена запасной из §3.1 — «used only to limit repeated attempts during its limit period
(at most one day), and is otherwise retained only as described in the "Retention" section below»; legal:sync (app/legal, сайт, админка),
пины перепинены. Других языковых файлов политики нет (один канонический EN) — Переводчик не нужен.

- TTL-политики подготовлены **только в файле** `firestore.indexes.json` → `fieldOverrides`: `auth_recovery_rate_limits.expireAt` и
  `auth_recovery_clean_rate_limits.expireAt`, `ttl: true` (как у `promo_redeem_rate_limits`). **Выкладка индексов — только владелец и
  только как включение TTL**: `bash scripts/deploy_from_clean_head.sh --only "firestore:indexes" --execute` (или Console → Firestore → TTL).
  Проверка: в Console у обеих политик статус «Serving».
  ⚠ `firestore:indexes` выкладывает файл целиком: если CLI спросит про УДАЛЕНИЕ индексов, которых нет в файле, — отвечать «N».
  Безопаснее разово включить две TTL-политики в Console (Firestore → TTL), а файл выложить позже вместе с остальными индексами.
- «within two days» вернуть отдельной правкой ПОСЛЕ релиза, когда TTL подтверждён «Serving»; тогда же разовая чистка старых документов
  без `expireAt`.
- Порядок «TTL → сайт» больше не блокирует выкладку сайта: запасная фраза верна и до, и после TTL.

### 3.1. Жёсткий порядок «TTL → сайт» и запасной абзац §4 (Ревизор 3.29, 19ddf5fed)

В HEAD (fc101659f) абзац §4 обещает «deleted automatically within two days». Это правда только при включённой TTL-политике Firestore
по полю `expireAt` на **обеих** коллекциях — `auth_recovery_rate_limits` и `auth_recovery_clean_rate_limits`. Код ставит `expireAt`
(окно 1 ч / 24 ч), но удаляет документ только TTL (в пределах ~24 ч после `expireAt`).

1. **Владелец** включает TTL: Firebase Console → Firestore → TTL → «Create policy» → коллекция `auth_recovery_rate_limits`, поле
   `expireAt`; то же для `auth_recovery_clean_rate_limits`. Статус политики должен стать «Serving».
2. Только после этого — выкладка сайта (`hosting:knowlywww`), потом функции R111.
3. **Если TTL утром НЕ включён — сайт с текущим абзацем не выкладывать.** Сначала заменить последнюю фразу абзаца запасной, затем
   legal:sync, перепин хэшей, коммит, повторный сухой прогон и только потом выкладка.

**Запасной вариант (без обещания срока).** Формулировку «removed after the limit period» не беру: без TTL документы физически
остаются, и это была бы неправда. Честная замена — без срока, со ссылкой на общий раздел хранения §19, где уже есть
«fraud-prevention records may be retained longer where needed for … abuse prevention»:

> **EN (запасной, канон):** … A counter contains only a number and timestamps, is used only to limit repeated attempts during its
> limit period (at most one day), and is otherwise retained only as described in the "Retention" section below.

> **RU (для владельца):** … Счётчик содержит только число и отметки времени, используется только для ограничения повторных
> попыток в пределах своего окна (не больше суток), а в остальном хранится так, как описано в разделе «Хранение» ниже.

Замена — одна фраза в обоих файлах (`legal/privacy_policy_en.json`, `legal/privacy_policy_en_ios.json`):
«and is deleted automatically within two days.» → «is used only to limit repeated attempts during its limit period (at most one
day), and is otherwise retained only as described in the "Retention" section below.» (вместе с предшествующим «is used only to
limit repeated attempts,» — фраза пишется целиком заново). Затем `npm run legal:sync`, перепин двух хэшей в
`tests/legal_document_liquid_glass_source_contract.test.mjs`, юр-сторожа, `bash scripts/deploy_from_clean_head.sh --only "hosting:knowlywww"`.

## 4. Автоназвание наборов из видео (R110) — что уходит в OpenAI

Подтверждаю по коду `functions/src/video_pack_title.ts` и `admin/v2/legacy.html` (d7bde78f6):
- `adminSuggestVideoPackTitle` отправляет в OpenAI **только фразы ролика** (до 40 пар «фраза — перевод» из документа владельца)
  и прошлые варианты названия. Ни uid, ни email, ни данных учеников; вызывать может только админ.
- Ручная правка названия переводится через уже выложенный `adminTranslateMessage` — уходит **только текст названия**.
- В Firestore пишется только название набора (`packTitles` версии и `titleRu…titlePl/titleEn` набора) — контент, не личные данные.
- Политика: это обработка контента владельцем, не данных людей; §11 (AI providers) описывает ИИ-функции для людей и к админке не
  относится. **Правка политики не нужна.**

## 5. R116 — выключить старые опросы в день выхода опросов 2.0 (подготовлено, НЕ выполнено)

**Когда:** в тот же день, когда в приложении начнут показываться новые опросы (сборка с опросами 2.0 по макету
`docs/design/v2-app/surveys-v2.html`, после утверждения владельцем). Раньше — нельзя: люди останутся совсем без опросов.

**Что:** все 60 живых документов `shard_surveys` (ротация `owner-selected-63-v1`, 1 опрос в сутки; всего документов 64,
4 уже выключены раньше, в т. ч. 072 и 100 — 13.10). Ничего не удаляется: ответы и статистика остаются в админке («Опросы»).

**Как:** только данные, без деплоя. У каждого документа выключаются ОБА флага — `enabled` и `rotation.enabled`: в режиме
ротации сервер `enabled` не читает, поэтому одного флага мало (тот же приём, что 13.10). Сервер после этого отвечает «опроса нет»,
строка опроса на Главной уходит в течение 6 часов (кэш клиента `app/home_survey_entry.ts`).

```bash
node scripts/shard_surveys_retire_v1.mjs
```
— план, только чтение (17.10 вечером: `documents 64, live 60, toWrite 60`). Запись — словом владельца:
```bash
node scripts/shard_surveys_retire_v1.mjs --write --confirm SHARD_SURVEYS_RETIRE_V1
```
Перед записью скрипт сохраняет контрольную точку прежних флагов в `.codex-tmp/survey-retire/checkpoint-<время>.json`.
**Откат** (вернуть ровно как было):
```bash
node scripts/shard_surveys_retire_v1.mjs --restore .codex-tmp/survey-retire/checkpoint-<время>.json --write --confirm SHARD_SURVEYS_RETIRE_V1
```
Стоимость: 64 чтения на план, 60 записей одним прогоном; после выключения каждый вызов getActiveShardSurvey делает пустой запрос
`where enabled == true` (минимум 1 чтение) — дешевле, чем сейчас. Функцию `getActiveShardSurvey` убрать вместе со старым клиентом
опросов позже, когда в сторах не останется сборок, которые её зовут.

### 5.1. Можно ли показать опросы 2.0 БЕЗ новой сборки (записать в shard_surveys)? — Частично. (вечер 17.10, Сайт)
Проверено по коду клиента (`components/survey/SurveySheetModal.tsx`, тип не менялся с 27.08 — значит, и в сторе 1.6.24) и сервера:
- **Работает:** опрос из 1–3 вопросов со степпером; `single_choice` — вертикальные плитки с радио, подписи любые (эмодзи тоже).
  → чипы (A2–A4, A6, B2, B3, B5, C1, D1, D2, D4, E1, E4, F1, G3, G6, G7, G9) переносятся как есть.
- **Не поддержано клиентом:** мультивыбор (A1, A5, B4, C4, D3, E3, F3, G5) → только как одиночный «главное»; шкала 1–5 и эмодзи-шкала —
  только 5 строк столбиком (не в ряд, медленнее 1–3 с); NPS 0–10 — 11 строк, не годится → заменить на 5 вариантов «точно да…точно нет».
- **Не поддержано сервером без деплоя:** «до 3 опросов в день» — сервер даёт максимум 1 опрос в сутки (ротация = 1 в UTC-день;
  обычный режим — общий кулдаун `shard_survey_last_at_ms`, пол 1 день). Обход без деплоя: 1 опрос в день из 3 вопросов.
- **Обязательно до записи:** все 9 языков у каждого текста — опрос без полного перевода сервер не показывает (`missingSurveyLocaleKeys`).
  Есть ru/en, нужны ещё 7 (Переводчик).
- **Таргетинг:** только free/Plus, число уроков, платформа — «только игравшим в Пик/карточки» нельзя.
**Минимум в клиенте для полной версии:** мультивыбор + ряд-шкала (≈ 1 день, один компонент), сервер: N опросов в день (кулдаун в часах) — деплой функций.
Скрипт заведения опросов (по образцу retire) НЕ написан — закончился лимит сессии; это следующий шаг, если владелец выберет «без сборки».

### 5.2. Скрипт заведения опросов 2.0 (без новой сборки) — готов, НЕ выполнен
`scripts/shard_surveys_v2_seed.mjs` + тексты `docs/work/tasks/surveys-v2-content.json`: 13 опросов, 36 вопросов, только одиночный
выбор. Мультивыбор → «главное» (A1, A5, B4, C4, D3, E3, F3, G5). Шкалы → 5 строк «Очень… Совсем нет». Эмодзи-оценки → 5 строк
с эмодзи. NPS → «Точно посоветую… Точно нет». В вопросы про Пик и карточки добавлено «Не играю в Пик» / «Не пользуюсь», потому что
сервер не умеет показывать опрос только игравшим. «Про Plus» — только free, «Твой Plus» — только Plus. 1 опрос в день, свежий
первым (survey_v2_01 → 13). Проверка — тем же кодом, что у сервера (functions/lib: validateSurveyConfigForWrite, parseSurveyConfig,
missingSurveyLocaleKeys).

План 17.10 (только чтение): ошибок 0, в проде таких id нет. Готовы 0 из 13 — нет переводов на uk/es/pt-BR/vi/id/tr/pl.
**✅ 17.10 ~23:45 — после переводов Переводчика b9bcbcf2e: ready 13 из 13, ошибок 0, в проде таких id нет (план, без записи).**
Скрипт не пишет ни одного опроса без всех 9 языков: сервер такой не покажет.

```bash
node scripts/shard_surveys_v2_seed.mjs
```
Утром словом владельца — сначала заведение, потом выключение старых:
```bash
node scripts/shard_surveys_v2_seed.mjs --write --confirm SHARD_SURVEYS_V2_SEED
```
```bash
node scripts/shard_surveys_retire_v1.mjs --write --confirm SHARD_SURVEYS_RETIRE_V1
```
Пока ротация жива, сервер показывает опрос ротации, поэтому дубля не будет. После выключения ротации сервер сам уйдёт на новые.
Откат заведения: `--restore .codex-tmp/survey-v2-seed/checkpoint-<время>.json --write --confirm SHARD_SURVEYS_V2_SEED`. Новые
опросы выключаются, ничего не удаляется. Откат старых — по 5.
Награды за опрос нет (PM-058, выплата 0); поле `rewardShards: 1` нужно только для валидации.

## 6. Репетиция утренней выкладки сайта — 18.10 ~01:30 (Сайт), без выкладки и без входа в прод

Чистая выгрузка HEAD 63cc84ceb (`bash scripts/deploy_from_clean_head.sh --only "hosting:knowlywww"`) — PASS: каркас сайта, страницы
политики = legal/*.json, `firebase deploy --dry-run`.

| Проверка | Итог |
|---|---|
| Текст политики/условий на сайте = `app/legal` (то, что в сборке) | privacy 143/143 строк, privacy-ios 145/145, terms 104/104 — совпадает целиком |
| Внутренние ссылки (29 страниц, 1084 ссылки, с учётом редиректов firebase.json) | битых 0 (единственная «не страница» — `phraseman://apple-auth`, это переход в приложение, так задумано) |
| Ссылки из приложения | `knowlyapps.com/legal/privacy/` и `/legal/terms/` — есть; на сайте живы `/legal/privacy/`, `/legal/privacy-ios/`, `/legal/terms/`, `/legal/data-deletion/` |
| 390 px, горизонтальная прокрутка | нет ни на одной из 11 страниц: `/`, 4 юр-страницы, `/download/`, `/premium/`, `/faq/`, `/contact/`, `/gift/`, `/english-level-test/` (scrollWidth = 390); `/?lang=en` и `/download/?lang=en` — тоже 390 |
| Языки сайта | у сайта 2 языка интерфейса — ru (24 страницы) и en (3 юр-страницы + переключатель `?lang=en`, `assets/site-i18n.js`: `SUPPORTED = ['en','ru']`); 9 языков у сайта нет |

🟡 Найдено, не блокирует (так же и в проде сейчас): в `?lang=en` на `/download/` кнопка «Начать бесплатно», подзаголовок и подпись под
QR остаются по-русски, заголовок вкладки тоже русский — неполный перевод en-режима сайта.

**Одна команда утром (из корня репозитория, словом владельца):**
```bash
bash scripts/deploy_from_clean_head.sh --only "hosting:knowlywww" --execute
```
**Ожидаемый вывод** (хэш — тот, что будет на HEAD утром):
```
[DEPLOY-CLEAN] HEAD=<hash> цели=hosting:knowlywww режим=ВЫКЛАДКА папка=/c/Temp/claude/deploy_clean_<hash>
[DEPLOY-CLEAN] грязных путей в рабочем дереве (в выкладку НЕ попадут): N
[DEPLOY-CLEAN] выгружено файлов: ~14 900
[DEPLOY-CLEAN] каркас сайта — OK
[DEPLOY-CLEAN] страницы политики = legal/*.json — OK (October 17, 2026)
[DEPLOY-CLEAN] ВЫКЛАДКА из /c/Temp/claude/deploy_clean_<hash>: firebase deploy --only hosting:knowlywww --project phraseman-ea0b3
=== Deploying to 'phraseman-ea0b3'...
i  hosting[knowlyapps]: found 185 files in knowly-www
✔  hosting[knowlyapps]: release complete
✔  Deploy complete!
Hosting URL: https://knowlyapps.web.app
[DEPLOY-CLEAN] firebase deploy exit=0
```
Если любая строка до «ВЫКЛАДКА» — FAIL, скрипт останавливается и ничего не выкладывает. После — проверка §2 (privacy:
«during its limit period (at most one day)» в §4). Откат — Firebase Console → Hosting → knowlyapps → Release history → Rollback.
