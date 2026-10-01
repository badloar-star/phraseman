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

Если CLI попросит значение секрета (например ключ OpenAI) — это значит, секрет у функции
ещё не заведён; вводите его сами, в чат не вставляйте.

## Шаг 2. ЧТО НЕ ВЫКЛАДЫВАТЬ ДО РЕЛИЗА 2.0 (сломает 1.6.24)

| Что | Почему нельзя сейчас |
|---|---|
| `levelSpinStarGrant` (новый кошелёк монет, 6d5835ef8) | в облаке живёт старая версия, через неё 1.6.24 начисляет спины. Новая версия спины **отклоняет** → у людей в сторе пропадут награды спинов |
| `report_replies` / `admin_reports_center` (награда за жалобу в монетах v2, f20328d12) и hosting админки | 1.6.24 не умеет забирать награду v2 |
| `shard_survey_core` | менять вместе с релизом (белые списки маршрутов 2.0) |
| удаление 112 функций облака без кода | часть вызывает 1.6.24, а 3 вызывает даже 2.0 — см. PM-007 |

Порядок в день релиза: `functions:levelSpinStarGrant` → остальные изменённые функции → hosting админки (подробно — PROGRESS.md, Q13).

## Шаг 3. После выкладки — в админке

1. Админка → Пульт → Шпиль: включить «Шпиль для игроков» (`config/spire_v1.enabled`). Админская функция сама создаст документ с правильной версией схемы — документа в проде сейчас **нет**.
2. Проверить, что хаб «Диалоги» на 2.0 (эмулятор/дев-сборка) открывает каталог.
3. Набор сообщества: одобрить тестовый набор → убедиться, что появилась озвучка (лог `[CARD-TTS]`).

## Откат

Любая функция из шага 1 откатывается удалением именно её:
`firebase functions:delete <имя> --project phraseman-ea0b3` (1.6.24 её не вызывает).
Шпиль выключается тем же переключателем в админке.

---

## Дополнения (решения координатора 01.10)

- 🔴 **ПОЛНУЮ выкладку functions НЕ делать**, пока в нашу ветку не перенесён сторож почты
  активации (`activationEmailRetryCron`, `resendKeyHealthCron`, `email_delivery_watchdog.ts`).
  Сейчас он живёт только в облаке и в ветке `claude/sad-cannon-876ae9`; полная выкладка
  удалит его молча. Именная выкладка из этого файла его НЕ трогает.
- **TTL 90 дней для журналов ошибок/активности** (`app_errors`, `app_activity`): после того как
  код начнёт писать поле `expireAt`, включите политику TTL в консоли:
  Firebase Console → Firestore → TTL (Time-to-live) → «Create policy» → коллекция `app_errors`,
  поле `expireAt`; то же для `app_activity`. Действует только на документы с этим полем.
- **14 облачных функций без решения** (season* ×4, задания/сундук/щит друзей ×4,
  `communityPurchasePack`, `profileCardUpgrade`, открытие курса Learning V2 ×2,
  `statsInsightsGenerate`, `weeklyReviewGenerate`) — удалять после релиза, и только если их не
  вызывает ни 2.0, ни живые версии 1.6.x; иначе — после окна принудительного обновления.
