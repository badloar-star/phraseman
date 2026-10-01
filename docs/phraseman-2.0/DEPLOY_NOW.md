# DEPLOY_NOW — безопасная выкладка «только добавить» (до релиза 2.0)

Подготовлено сессией «Ядро» 2026-10-01 по поручению координатора/владельца
(«все экраны должны работать уже сейчас»). Выполняет **только владелец**.

Основа: сверка кода с облаком `docs/phraseman-2.0/evidence/PM-007_code_vs_cloud_functions.md`
(снята 01.10, только чтение): в коде 438, в облаке 516; **34 функции есть в коде, но не выложены**.

Принцип: выкладываем ТОЛЬКО новые функции, которых нет в облаке. Сборка в сторе
**1.6.24** их не вызывает → сломать её они не могут. Изменённые старые функции и
удаление функций — ждут релиза 2.0.

> ⚠️ **На вопрос CLI «Would you like to proceed with deletion? / delete functions?» отвечать `No`.**
> Команды ниже перечисляют функции поимённо (`--only functions:A,functions:B`), поэтому
> CLI не должен предлагать удаление; если всё же спросит — **No**. Полный `firebase deploy`
> или `--only functions` без имён **НЕ запускать**: он удалит 112 функций облака, часть из
> которых вызывает 1.6.24 и даже 2.0 (`shardsApplyDelta`, `aiDialogSyncPurchase`,
> `resolveLearningV2CourseUnlockReceipt`).

---

## Шаг 0. Индексы базы — можно сразу

```bash
firebase deploy --only firestore:indexes --project phraseman-ea0b3
```

- Добавляет индексы уровня коллекции для `external_economy_events.createdAtMs`
  (коммит 3f63c244d). Без них телефон не может подтянуть свои внешние начисления.
- Безопасно для 1.6.24: **да** — индекс только включает запрос, ничего не запрещает.
- Если CLI спросит удалить индексы, которых нет в файле, — **No**.

## Шаг 0б. Правила базы — сразу после индексов

```bash
firebase deploy --only firestore:rules --project phraseman-ea0b3
```

- Нужны экранам 2.0: клиент сам читает `config/spire_v1`, память и сессии Диалогов V2, «Опрос дня», итоги недели Шпиля — без новых правил эти чтения будут отклонены.
- Безопасно для 1.6.24: **да, по разнице с коммитом сборки 1.6.24 (af76518ac)** — +208/−5 строк, ни один блок `match`, которым пользуется 1.6.24, не удалён и не сужен. Изменения: новые коллекции 2.0, вариант пейвола `PLUS` добавлен к списку, `error_reports` (только админ) разделён на чтение/запись, поле `coinWalletLimitsV1` закрыто от клиента (1.6.24 его не пишет).
- Оговорка: если в облаке сейчас правила НОВЕЕ сборки 1.6.24 (кто-то выкладывал), консоль Firebase → Firestore → Rules → История покажет; при сомнении сравните перед выкладкой.

## Секреты

Ничего заводить не нужно: `DIALOGUE_V2_SESSION_HMAC_KEY`, `DIALOGUE_V2_MEMORY_ID_SECRET` и `OPENAI_API_KEY` есть в Secret Manager (проверено `firebase functions:secrets:get`, 01.10). Для Диалогов нужна только выкладка 10 функций из шага 1.

## Шаг 1. Новые функции 2.0 — безопасно для 1.6.24

Все функции ниже **новые** (в облаке их нет), 1.6.24 их не вызывает.

| Группа | Функции | Безопасно для 1.6.24 | Что включает |
|---|---|---|---|
| Диалоги V2 | `dialogueV2Catalogue`, `dialogueV2SessionStart`, `dialogueV2TextTurn`, `dialogueV2SessionComplete`, `dialogueV2FreeformSessionStart`, `dialogueV2FreeformSessionTurn`, `dialogueV2FreeformPreparedBotVoiceResolve`, `dialogueV2MemoryView`, `dialogueV2MemoryResume`, `dialogueV2MemoryClear` | да — новые имена | хаб «Диалоги» (сейчас «Диалоги не загрузились»). Тратят OpenAI только когда 2.0 ведёт диалог |
| Шпиль | `spireJoinRoom`, `spireReportSteps`, `spireFinalizeCron`, `spireZoneWarningCron` | да — комнат у 1.6.24 нет, кроны работают только по существующим комнатам | игровая часть Шпиля |
| Шпиль, админка | `adminSpireConfigGet`, `adminSpireConfigSet`, `adminSpireTaskReportList`, `adminSpireTaskIncidentStates`, `adminSpireTaskIncidentSetState` | да — только админ | включение Шпиля из админки, жалобы на задания |
| Озвучка карточек D128 | `cardTtsPackWorker`, `adminCardTtsRequeuePack` | да | авто-озвучка набора при одобрении в админке (OpenAI, копейки) |
| Видео-наборы | `adminAlignVideoPhraseTranscript`, `adminBackfillVideoPacks` | да — только админ | транскрипция фраз видео в админке |
| Прочее 2.0 | `dailyPollVote`, `customCardMilestoneNotify`, `profileCardBioSetMine`, `giftsToCoinsMigrationReport` | да — новые имена | опрос дня, уведомление о своих карточках, «о себе» в визитке, строка-итог миграции подарков |
| Письма сайта | `webActivationReminderCron` | да (к приложению не относится) | **шлёт настоящие письма** оплатившим на сайте, кто не активировал доступ. Включайте осознанно |
| Сторож почты активации | `activationEmailRetryCron`, `resendKeyHealthCron` | да (к приложению не относится) | **В облаке УЖЕ есть** (выложены из ветки `claude/sad-cannon-876ae9`); выкладка ЗАМЕНИТ их нашей версией (перенос 01.10). Совместимость с данными облачной версии: тот же документ `admin_config/email_watchdog` и те же поля дедупа/пробы, те же поля заявки `customerEmailRetryCount`/`customerEmailLastRetryAtMs`, старый статус письма `failed` по-прежнему досылается. Отличия нашей версии: досылает и новые статусы (`provider_rejected`, `transport_unknown`, `skipped_no_resend_from`), не трогает уже активированные заявки, пишет пульс в `cron_heartbeats`. Секреты `RESEND_API_KEY` и `ADMIN_ALERT_BOT_TOKEN` уже есть в Secret Manager |

**Не выкладывать сейчас (своя очередь):**
- `accountsV2SyncApply`, `accountsV2DeletionStatus` — у Account V2 свой план (сессия Account V2).
- `adminArenaPublication*` (4 шт.) — пул заданий Шпиля/Learning V2; выкладывать вместе с проверкой публикации пула (не срочно для экранов).

### Команды (по группам, чтобы проще откатить)

```bash
firebase deploy --only functions:dialogueV2Catalogue,functions:dialogueV2SessionStart,functions:dialogueV2TextTurn,functions:dialogueV2SessionComplete,functions:dialogueV2FreeformSessionStart,functions:dialogueV2FreeformSessionTurn,functions:dialogueV2FreeformPreparedBotVoiceResolve,functions:dialogueV2MemoryView,functions:dialogueV2MemoryResume,functions:dialogueV2MemoryClear --project phraseman-ea0b3
```

```bash
firebase deploy --only functions:adminSpireConfigGet,functions:adminSpireConfigSet,functions:adminSpireTaskReportList,functions:adminSpireTaskIncidentStates,functions:adminSpireTaskIncidentSetState,functions:spireJoinRoom,functions:spireReportSteps,functions:spireFinalizeCron,functions:spireZoneWarningCron --project phraseman-ea0b3
```

```bash
firebase deploy --only functions:cardTtsPackWorker,functions:adminCardTtsRequeuePack,functions:adminAlignVideoPhraseTranscript,functions:adminBackfillVideoPacks,functions:dailyPollVote,functions:customCardMilestoneNotify,functions:profileCardBioSetMine,functions:giftsToCoinsMigrationReport --project phraseman-ea0b3
```

```bash
firebase deploy --only functions:webActivationReminderCron --project phraseman-ea0b3
```

```bash
firebase deploy --only functions:activationEmailRetryCron,functions:resendKeyHealthCron --project phraseman-ea0b3
```

Мгновенный алерт о проваленном письме живёт внутри `stripeWebhook` / `paypalOrderCapture`
(web_checkout.ts, 01.10: алерт + секрет `ADMIN_ALERT_BOT_TOKEN`). Он заработает только после
выкладки этих двух платёжных функций — выкладывайте их отдельно и осознанно (в web_checkout.ts
этой ветки есть и другие изменения относительно облака), после проверки оплаты на сайте.
Без этого защиту дают оба крона выше: ключ проверяется раз в 12 ч, письма досылаются раз в 6 ч.


### Шаг 1в. «Из видео» пустой — собрать наборы из опубликованных роликов (приоритет владельца)

Факт (чтение прода 01.10, `[VIDEO-PACKS-PROBE]`): в `video_phrase_sets` **10 роликов**, у всех
активная версия со статусом `published`, всего **1396 фраз** (от 50 до 296 на ролик). Наборов
`community_packs` с `videoId` — **0**. Индекс запроса экрана (`listingStatus` + `videoId`) в облаке
есть. Экран пуст только потому, что наборы из этих роликов никогда не создавались (ролики
опубликованы раньше, чем публикация начала создавать набор).

1. Выложить (обе — только для админа, 1.6.24 их не вызывает):

```bash
firebase deploy --only functions:adminBackfillVideoPacks,functions:adminPublishVideoPhrases --project phraseman-ea0b3
```

2. Админка → «Видео-фразы» → кнопка **«🃏 Собрать наборы карточек»**. Ожидается
«просмотрено 10, создано или обновлено 10». Стоимость: ~10 чтений роликов + 10 версий + 10 записей.
3. Открыть в 2.0 «Карточки → Из видео»: должны появиться 10 наборов (язык набора определяется
по фразам; если выбран другой язык набора — переключить вверху экрана).

Заметка: наборы создаются со статусом `published`, поэтому видны и в общей ленте наборов
сообщества (в том числе в 1.6.24) — это настоящие наборы, так и задумано (D-видео-наборы).

### Шаг 1б. Платёжные функции сайта — ОТДЕЛЬНО, только после проверки оплаты на сайте

Решение координатора 01.10. Сначала тестовая покупка на knowlyapps.com/start/ (карта и PayPal)
на текущей облачной версии → убедиться, что письмо с кодом пришло. Затем:

```bash
firebase deploy --only functions:stripeWebhook,functions:paypalOrderCapture --project phraseman-ea0b3
```

После выкладки — повторить тестовую покупку и проверить: письмо пришло, заказ в админке
`paid_pending_activation` → после ввода кода `activated`. Откат — выложить прежнюю версию из
ветки, с которой выкладывали раньше.


Если CLI попросит значение секрета (например ключ OpenAI) — это значит, секрет у функции
ещё не заведён; вводите его сами, в чат не вставляйте.

**Диалоги V2 — что нужно, кроме выкладки (дополнено «Ядром» 01.10):**
- **Выпуск в Firestore писать НЕ нужно.** Указателя `dialogue_v2_release_control/active` в проде
  нет — функции сами берут встроенный выпуск из одобренного владельцем 28.09 кандидата
  (304 пакета, `functions/src/generated/dialogue_v2_server_release.json`, коммит f1b81c9ce).
  Если когда-нибудь понадобится срочно выключить Диалоги без выкладки — создать этот документ
  с `status: "disabled"`: существующий выключенный указатель встроенный выпуск НЕ обходит.
- Секреты `DIALOGUE_V2_SESSION_HMAC_KEY`, `DIALOGUE_V2_MEMORY_ID_SECRET`, `OPENAI_API_KEY` в Secret Manager уже есть — заводить ничего не нужно.
- Перед выкладкой: `npx tsx scripts/dialogue_v2_embedded_release.ts --check` → `PASS`.
- Каталог на телефоне уже работает БЕЗ выкладки (встроенный снимок); выкладка нужна для
  самого разговора (старт/ход/итог), свободного разговора и памяти.

## Шаг 2. ЧТО НЕ ВЫКЛАДЫВАТЬ ДО РЕЛИЗА 2.0 (сломает 1.6.24)

| Что | Почему нельзя сейчас |
|---|---|
| `levelSpinStarGrant` (новый кошелёк монет, 6d5835ef8) | в облаке живёт старая версия, через неё 1.6.24 начисляет спины. Новая версия спины **отклоняет** → у людей в сторе пропадут награды спинов |
| `report_replies` / `admin_reports_center` (награда за жалобу в монетах v2, f20328d12) и hosting админки | 1.6.24 не умеет забирать награду v2 |
| `shard_survey_core` | менять вместе с релизом (белые списки маршрутов 2.0) |
| `adminPublishAuthoredLearningV2Course` — сторож D150 (06143603d): публикация авторского курса en блокируется, пока урок 1 расходится со встроенным релизом | выкладывать пакетом релиза 2.0. Функция живёт в кодовой базе **content** (functions-content) — выкладывать как `--only functions:content:adminPublishAuthoredLearningV2Course`. Сборка content теперь копирует эталон урока 1 (factory_native en/l01, 168 JSON, ~3 МБ) в lib — сторож сравнивает уроки; при отсутствии эталона остаётся fail-closed (`publish_lesson1_release_reference_unavailable`). Сейчас 78 расхождений → публикация en будет отклонена с причиной `publish_lesson1_diverges_from_release`, это и нужно |
| удаление 110 функций облака без кода (было 112; сторож почты перенесён 01.10) | часть вызывает 1.6.24, а 3 вызывает даже 2.0 — см. PM-007 |

Порядок в день релиза: `functions:levelSpinStarGrant` → остальные изменённые функции → hosting админки (подробно — PROGRESS.md, Q13).

### Q-COIN (b): `coinReconcileV1` — разовая серверная сверка монет (новая функция)

- Команда: `firebase deploy --only functions:coinReconcileV1` (+ `firestore:rules` в общем окне правил — закрыто поле `coinReconcileV1`).
- **Безопасно для 1.6.24 и отдельно от `levelSpinStarGrant`**: 1.6.24 эту функцию не вызывает; от нового кошелька она не зависит. Можно выложить в день релиза вместе с группой монет или раньше.
- Что делает: вызывает сам пользователь 2.0 один раз (только если на телефоне есть разница «только на телефоне» или застрявшие спиновые начисления). Поднимает `users/{uid}.stars` ТОЛЬКО вверх и ТОЛЬКО на монетные дорожки спинов из серверных `users/{uid}/level_spin_results` (state `delivered`, подарок `stars_*`), у которых нет расписки `star_operations/level_spin:<requestId>.<lane>`. Расписка — тем же opId, `reason: level_spin_grant`, `sourceKind: coin_reconcile_v1`. Потолок 20 000 за жизнь; выше — ничего не поднимает, статус `over_cap_review` (решать вручную). Число от телефона — только в логе.
- Идемпотентность не зависит от правил: повтор возвращает сохранённый итог из `users/{uid}.coinReconcileV1`; даже при стёртой метке расписки по opId не дают зачислить дорожку второй раз.
- ⚠️ Выложить ДО чистки D90 (`level_spin_results` в инвентаре — `drop`): после чистки источника нет.
- Проверка после выкладки: логи `[COIN-RECONCILE]` (`scan … missing=… foundTotal=… status=…`). Перед массовым включением стоит посмотреть 2–3 аккаунта в логах: `foundTotal` против `clientVisibleBalance`.

## Шаг 3. После выкладки — в админке

1. Админка → Пульт → Шпиль: включить «Шпиль для игроков» (`config/spire_v1.enabled`). Админская функция сама создаст документ с правильной версией схемы — документа в проде сейчас **нет**.
2. Проверить, что на 2.0 (эмулятор/дев-сборка) в «Диалогах» открывается сценарий и проходит
   первая реплика (каталог виден и без выкладки; проверяем именно разговор).
3. Набор сообщества: одобрить тестовый набор → убедиться, что появилась озвучка (лог `[CARD-TTS]`).

## Откат

Любая функция из шага 1 откатывается удалением именно её:
`firebase functions:delete <имя> --project phraseman-ea0b3` (1.6.24 её не вызывает).
Шпиль выключается тем же переключателем в админке.

---

## Дополнения (решения координатора 01.10)

- ✅ **Сторож почты активации перенесён в нашу ветку (01.10)** — `email_delivery_watchdog.ts`,
  экспорт `activationEmailRetryCron` + `resendKeyHealthCron` в `functions/src/index.ts`. Полная
  выкладка его больше НЕ удалит (сверка PM-007: «в облаке, но нет в коде» 112 → 110). Запрет на
  полную выкладку из-за сторожа снят; остальные причины не делать её до релиза — шаг 2 выше.
- **TTL 90 дней для журналов ошибок/активности** (`app_errors`, `app_activity`): после того как
  код начнёт писать поле `expireAt`, включите политику TTL в консоли:
  Firebase Console → Firestore → TTL (Time-to-live) → «Create policy» → коллекция `app_errors`,
  поле `expireAt`; то же для `app_activity`. Действует только на документы с этим полем.
- **14 облачных функций без решения** (season* ×4, задания/сундук/щит друзей ×4,
  `communityPurchasePack`, `profileCardUpgrade`, открытие курса Learning V2 ×2,
  `statsInsightsGenerate`, `weeklyReviewGenerate`) — удалять после релиза, и только если их не
  вызывает ни 2.0, ни живые версии 1.6.x; иначе — после окна принудительного обновления.
- **Диалоги V2 — первая реплика, прогрев, служебный текст (Ядро, 01.10)** — выкладывать ВСЕЙ
  группой «Диалоги V2» из шага 1 (одна команда выше, ничего нового в ней нет). Почему всей группой:
  встроенный выпуск `functions/src/generated/dialogue_v2_server_release.json` получил
  `content.opening` во всех 304 пакетах — хэши пакетов изменились, и функции, читающие выпуск
  (`dialogueV2Catalogue`, `dialogueV2SessionStart`, `dialogueV2TextTurn`, `dialogueV2SessionComplete`,
  `dialogueV2Memory*`), должны жить на одном выпуске. Что даёт выкладка: `{ warm: true }` в
  `dialogueV2SessionStart`/`dialogueV2TextTurn` (мгновенный ответ, без чтений и OpenAI);
  первая реплика персонажа — первым ходом в истории модели (`dialogueV2TextTurn`), открывающая
  фраза свободного разговора (`dialogueV2FreeformSessionTurn`). `minInstances` НЕ менялся (0).
  До выкладки телефон всё равно показывает реплику (она во встроенном снимке), а прогрев
  тихо пишет в лог отказ и ни на что не влияет.
