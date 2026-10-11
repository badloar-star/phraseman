# Выкладка серверной части 2.0 — пакет по шагам (Ядро, 11.10, ред. 2)

Выполняет координатор (приказ владельца ему в чате). Ядро сверило:
- все функции ниже существуют в экспортах `functions/src/index.ts`;
- папка `functions/` и правила закоммичены;
- изменённые функции — второе поколение (Cloud Run), регион `us-central1`.

Подробные описания групп — [DEPLOY_NOW.md](DEPLOY_NOW.md).

> ⚠️ **Исправление ред. 1:** `hosting:admin` в ред. 1 был помечен «безопасно». **Неверно.** В админке сейчас награда за
> жалобу в монетах v2, а 1.6.x её забрать не умеет (DEPLOY_NOW, шаг 2). Админка выкладывается **только в день релиза**.

## 0. Перед КАЖДОЙ группой

```bash
git status --short functions/ firestore.rules firestore.indexes.json
```

- Пусто — можно. Не пусто — стоп: `firebase deploy` берёт рабочую папку, а не коммит.
- Функции — только поимённо (`--only functions:A,functions:B`), без `--force`.
- Полный `firebase deploy` или `--only functions` без имён — **нельзя**: удалит ~110 облачных функций, часть зовёт 1.6.x.
- На вопрос CLI «delete functions? / delete indexes?» — **No**, имена — в отчёт.
- Ключи Шпиля (`config/spire_v1.enabled`, `spire_tab_enabled`) — не трогать до выхода стор-сборки.

## 1. Порядок и команды

| № | Группа | Статус | Можно сейчас |
|---|---|---|---|
| 1а | Индексы | — | да |
| 1б | Правила | — | да, но сначала сверка (раздел 2) |
| 2 | Приватность (5 функций) | ✅ выложено координатором, rc=0 | — |
| 3 | Пакеты A+B+D и K (4 функции) | — | да |
| 4 | Диалоги V2 (10) | — | да |
| 5 | Озвучка карточек, видео, прочее (8) | — | да |
| 6 | Шпиль (14) | — | да; ключи не включать |
| 7 | Наборы «Из видео» (2) | — | да; кнопка — после админки |
| 8 | Почта (сторож 2 + напоминания 1) | — | сторож — да; напоминания — с «да» владельца |
| 9 | Политика на сайте | — | да |
| 10 | День релиза | — | **нет** — раздел 4 |

### 1а. Индексы

```bash
firebase deploy --only firestore:indexes --project phraseman-ea0b3
```

- **1.6.x:** только добавления (+148 строк к сборке 1.6.24 `af76518ac`, удалений нет). Индекс включает запросы и ничего не
  запрещает. Порядок «сервер раньше клиента» безопасен.
- **После:** Firebase Console → Firestore → Индексы: новые в статусе «Создание» → «Включено».
- **Откат:** не нужен — лишний индекс ничего не ломает.

### 1б. Правила — после сверки из раздела 2

```bash
firebase deploy --only firestore:rules --project phraseman-ea0b3
```

- **Что меняется против 1.6.24:** +296/−12 строк. Удалено ровно 4 вещи:
  - комментарий у `arena_v2_receipts`;
  - `error_reports` разделён на чтение/запись — только админ, как и было;
  - список вариантов пейвола заменён тем же списком плюс `PLUS`;
  - **блок `users/{uid}/friends_chest_claims` — его читает 1.6.24.**
- **🟡 Риск для 1.6.x.** `app/friends_together/together_store.ts:254` в сборке 1.6.24 читает «сундук недели уже забран». После
  выкладки чтение получит отказ. Клиент молча вернёт «не забран» — сундук на втором устройстве или после переустановки
  покажется незабранным. Денег не теряем: повторный забор идёт через облачную `friendsClaimWeeklyChest`, она сверяет
  документ недели (идемпотентно).
- **Рекомендация Ядра:** вернуть в `firestore.rules` 4 строки (только чтение владельцем) до `min_app_version ≥ 2.0` и
  выложить правила уже с ними. Ядро сделает это по слову координатора:

  ```
  match /users/{userId}/friends_chest_claims/{weekKey} {
    allow read: if canonicalUserMatchesAuth(userId);
    allow write: if false;
  }
  ```

- **После:** зайти в 1.6.x и 2.0 — Главная, Уроки, Друзья открываются. В логах клиента нет `permission-denied`.
- **Откат одной командой:** Firebase Console → Firestore → «Правила» → история → предыдущая версия → «Восстановить».

### 2. Приватность — ✅ выложено

Проверка: следующее оповещение в Telegram — без строки «Пользователь»; в новых `app_errors` нет `userName`.

### 3. Пакеты A+B+D и K

```bash
firebase deploy --only functions:mistakePracticeSyncEvents,functions:friendsGetProfiles --project phraseman-ea0b3
```

```bash
firebase deploy --only functions:youtubeCatalogSyncCron,functions:adminRefreshYoutubeCatalog --project phraseman-ea0b3
```

**Что уедет вместе с ними** — все изменения модулей с прошлой выкладки:

| Функция | Изменения модуля | Влияние на 1.6.x |
|---|---|---|
| `mistakePracticeSyncEvents` | язык в запросе (11.10); «Ваш ответ» > 200 знаков **обрезается**, не отклоняется (04.10); язык `it` (04.10); отказ 400 пишет причину в лог (04.10) | безопасно: форма запроса и ответа прежняя, длинный ответ старого клиента обрежется, а не упадёт |
| `friendsGetProfiles` | без повторных чтений друга (11.10); язык Шпиля `it` | безопасно: форма ответа прежняя |
| `youtubeCatalogSyncCron`, `adminRefreshYoutubeCatalog` | не перепубликует без изменений (11.10); `durationSec` в снимке (05.10); раз в 15 мин и логи (01.10) | безопасно: новое поле лишнее для старого клиента, форма снимка та же |

- **Порядок:** сервер раньше клиента — да; клиент 2.0 без них работает по-старому.
- **После:**

  ```bash
  firebase functions:log --only mistakePracticeSyncEvents -n 20 --project phraseman-ea0b3
  ```

  - нет `list:target_filter_unavailable`;
  - у крона YouTube — `[YT-CATALOG] publish:skipped {"reason":"unchanged"}` со второго запуска.
- **Откат** — вернуть трафик на прошлую ревизию (имя сервиса — имя функции строчными):

  ```bash
  gcloud run revisions list --service mistakepracticesyncevents --region us-central1 --limit 3
  ```

  ```bash
  gcloud run services update-traffic mistakepracticesyncevents --region us-central1 --to-revisions <ПРОШЛАЯ_РЕВИЗИЯ>=100
  ```

  То же для `friendsgetprofiles`, `youtubecatalogsynccron`, `adminrefreshyoutubecatalog`. Следующий `firebase deploy`
  этой функции снова поставит новый код.

### 4. Диалоги V2 (новые имена — 1.6.x их не вызывает)

Перед выкладкой: `npx tsx scripts/dialogue_v2_embedded_release.ts --check` → `PASS`.

```bash
firebase deploy --only functions:dialogueV2Catalogue,functions:dialogueV2SessionStart,functions:dialogueV2TextTurn,functions:dialogueV2SessionComplete,functions:dialogueV2FreeformSessionStart,functions:dialogueV2FreeformSessionTurn,functions:dialogueV2FreeformPreparedBotVoiceResolve,functions:dialogueV2MemoryView,functions:dialogueV2MemoryResume,functions:dialogueV2MemoryClear --project phraseman-ea0b3
```

- Секреты уже в Secret Manager. Если CLI попросит значение — стоп, владелец вводит сам.
- Выкладывать **всей группой**: функции читают один встроенный выпуск, хэши пакетов общие.
- **После:** в 2.0 разговор стартует и отвечает.

  ```bash
  firebase functions:log --only dialogueV2TextTurn -n 20 --project phraseman-ea0b3
  ```

- **Откат:** `firebase functions:delete <имя> --region us-central1 --project phraseman-ea0b3` по одной. 1.6.x не задета.
- **Аварийно без выкладки:** документ `dialogue_v2_release_control/active` с `status: "disabled"`.

### 5. Озвучка карточек, видео, прочее (новые имена)

```bash
firebase deploy --only functions:cardTtsPackWorker,functions:adminCardTtsRequeuePack,functions:adminAlignVideoPhraseTranscript,functions:adminBackfillVideoPacks,functions:dailyPollVote,functions:customCardMilestoneNotify,functions:profileCardBioSetMine,functions:giftsToCoinsMigrationReport --project phraseman-ea0b3
```

- **1.6.x:** не вызывает.
- **После:** одобрить тестовый набор в админке → лог `[CARD-TTS]`.
- **Откат:** `functions:delete` по имени.

### 6. Шпиль — 14 функций (ключи НЕ включать)

```bash
firebase deploy --only functions:adminSpireConfigGet,functions:adminSpireConfigSet,functions:adminSpirePackBuild,functions:adminSpireTaskFlagList,functions:adminSpireTaskFlagAdd,functions:adminSpireTaskFlagRemove,functions:adminSpireTaskReportList,functions:adminSpireTaskIncidentStates,functions:adminSpireTaskIncidentSetState,functions:spireJoinRoom,functions:spireReportSteps,functions:spireFinalizeCron,functions:spireZoneWarningCron,functions:spirePackWeeklyCron --project phraseman-ea0b3
```

- **1.6.x:** комнат у неё нет.
- Кроны работают только по существующим комнатам, а `config/spire_v1` в проде нет — значит, Шпиль выключен.
- `spirePackWeeklyCron` раз в неделю пишет наборы в Storage — копейки.
- **После:**

  ```bash
  firebase functions:log --only spireFinalizeCron -n 20 --project phraseman-ea0b3
  ```

  Ошибок старта нет.
- **Откат:** `functions:delete` по имени.

### 7. Наборы «Из видео»

```bash
firebase deploy --only functions:adminBackfillVideoPacks,functions:adminPublishVideoPhrases --project phraseman-ea0b3
```

- `adminPublishVideoPhrases` — изменённая, **только для админа**. Модуль `video_phrases.ts` везёт с собой:
  - название набора без «.docx» и признак официального набора (11.10);
  - потолки ИИ (30.09–01.10);
  - повтор публикации без дублей (01.10).
- **1.6.x:** не вызывает. Созданные наборы видны и в 1.6.x — как обычные наборы сообщества, так задумано.
- Кнопку «🃏 Собрать наборы карточек» нажимать, только если она есть в **боевой** админке. Если её нет — ждёт выкладки
  админки (день релиза).
- **Откат:** удалить `adminBackfillVideoPacks`. Для `adminPublishVideoPhrases` — `update-traffic` на прошлую ревизию, как
  в группе 3.

### 8. Почта

```bash
firebase deploy --only functions:activationEmailRetryCron,functions:resendKeyHealthCron --project phraseman-ea0b3
```

- Заменяют уже живые версии из ветки `claude/sad-cannon-876ae9`: те же документы и поля, плюс досылка новых статусов.
- Откат — `update-traffic` на прошлую ревизию.

```bash
firebase deploy --only functions:webActivationReminderCron --project phraseman-ea0b3
```

- **Шлёт настоящие письма** оплатившим на сайте. Только с прямым «да» владельца.

### 9. Политика на сайте

```bash
firebase deploy --only hosting:knowlywww --project phraseman-ea0b3
```

- Разделы 3, 5, 20 и «Память диалогов» уже в коде (`legal:sync` выполнен).
- Безопасно: только текст.
- **Откат:** Firebase Console → Hosting → knowlywww → история выпусков → «Откатить».

## 2. Сверка правил перед группой 1б

```bash
firebase deploy --only firestore:rules --dry-run --project phraseman-ea0b3
```

- Компиляция без ошибок.
- Затем Console → Firestore → «Правила» → история: если боевая версия **новее** 1.6.24 (кто-то выкладывал) — сравнить с
  `firestore.rules`. Любое правило, которое закрывает чтение или запись, нужное 1.6.x, — стоп и отчёт Ядру.

## 3. Не выкладывать сейчас — и почему

| Что | Почему | Когда |
|---|---|---|
| `hosting:admin` | награда за жалобу в монетах v2 — 1.6.x её не заберёт | день релиза, последним |
| `levelSpinStarGrant` | новая версия отклоняет старые спины → у 1.6.x пропадут награды | день релиза, **первым** |
| награда за жалобу (`report_replies` / `admin_reports_center`) | то же, монеты v2 | день релиза |
| опрос осколков ×4 (`submitShardSurvey`, `getActiveShardSurvey`, `adminWriteShardSurvey`, `adminDeleteShardSurvey`) | белые списки маршрутов 2.0 | день релиза |
| `progressSubmitEvent` | новый тип `streak_sync` нужен только 2.0 | день релиза |
| `coinReconcileV1` | безопасна, но смысл есть только с 2.0; выложить ДО чистки D90 | день релиза |
| `adminPublishAuthoredLearningV2Course` (кодовая база content) | сторож D150 | пакетом релиза |
| `authConfirmRecoveryCode` | в модуле изменения сессии Авторизации | её пакетом |
| `jarvisDailyDepartmentsCron` | вместе с изменениями Джарвиса | их пакетом |
| `stripeWebhook`, `paypalOrderCapture` | платежи сайта | после тестовой покупки на сайте |
| `accountsV2SyncApply`, `accountsV2DeletionStatus` | свой план Account V2 | у сессии Account V2 |
| `adminArenaPublication*` (4) | вместе с проверкой публикации пула | отдельно |
| удаления: ~110 функций без кода, `friendsTogetherClaimLevel`, `videoWatchRunesClaim`, 14 без решения | часть вызывает 1.6.x | после `min_app_version ≥ 2.0`, по одной, с логами за 7 дней |

Порядок дня релиза (DEPLOY_NOW, «день релиза»):
1. `levelSpinStarGrant`.
2. Награда за жалобу, опрос ×4, `progressSubmitEvent`, `coinReconcileV1`.
3. `hosting:admin`.
4. Шпиль включается из админки после выхода стор-сборки ([OWNER_RELEASE_STEPS.md](OWNER_RELEASE_STEPS.md) §4).

## 4. Переменные сборки EAS (production) — только имена

Ядро значения EAS не читает. Проверка имён — expo.dev → проект → Environment variables (production).

**Обязательные** (без них стор-сборка падает на `scripts/release_keys_gate.mjs`):
1. `EXPO_PUBLIC_RC_IOS`
2. `EXPO_PUBLIC_RC_ANDROID`
3. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
4. `EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID`
5. `EXPO_PUBLIC_APPLE_ANDROID_REDIRECT_URI`
6. `EXPO_PUBLIC_APPLE_ANDROID_APP_CALLBACK_URI`

**Уже в `eas.json` (production)** — заводить не нужно: `EXPO_PUBLIC_STORE_RELEASE=1`,
`EXPO_PUBLIC_AI_DIALOG_ENABLED=true`, `EXPO_PUBLIC_EXPLAIN_ENABLED=true`.

**Не должно быть:** `EXPO_PUBLIC_ENABLE_DEV_TOOLS=1`, `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST`,
`EXPO_PUBLIC_SPIRE_DEV_TAB`, `EXPO_PUBLIC_TESTFLIGHT_DEV_TOOLS=1`.

**Необязательные:**
- `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST` — без них аналитика PostHog выключена. Включение — новая передача
  данных, сначала проверить политику.
- `PARITY_GATE_WAIVER` — рычаг владельца для сверки макетов.

**Перед стор-сборкой (правило координатора 11.10):** `npm run release:precheck` должен быть зелёным. Сейчас он красный
по контенту Learning V2 — [handoff Codex](handoff/CODEX_LEARNING_V2_PRIORITIES_2026-10-11.md). На сервере EAS эта
проверка не идёт.

## 5. Стоп-условия

- Ошибка сборки функций — стоп.
- CLI предлагает удалить функции или индексы — «No», имена в отчёт.
- Шаг, где боевые данные могут быть потеряны или перезаписаны, — стоп и отчёт.
- После группы в логах функции ошибки старта (`Error`, `failed to load`) — откат этой группы, отчёт.
- `--force` не использовать.
