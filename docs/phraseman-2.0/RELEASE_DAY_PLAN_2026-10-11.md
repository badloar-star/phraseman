# День релиза 2.0 — план по шагам (для владельца, Ядро 11.10)

Один файл, по порядку. Остальная серверная часть **уже выложена** 11.10 координатором по
[DEPLOY_RUNBOOK_2026-10-11.md](DEPLOY_RUNBOOK_2026-10-11.md): правила, индексы, Диалоги, Шпиль без ключей, приватность,
экономия, видео, почта, политика на сайте. Здесь — только то, что можно лишь в день выхода 2.0.

Значений ключей здесь нет. Все команды — из корня проекта. Перед каждой выкладкой функций:

```bash
git status --short functions/
```

Пусто — можно. Функции — только поимённо, без `--force`; на вопрос «delete functions?» — **No**.

---

## Шаг 0. До сборки (накануне)

1. `npm run release:precheck` — **зелёный**. Без этого стор не собираем (решение координатора 11.10). Сейчас он красный по
   контенту Learning V2 — [задание Codex](handoff/CODEX_LEARNING_V2_PRIORITIES_2026-10-11.md).
2. Окно «Что нового»: в `app/release_notes_v2_gate.ts` функция `configuredV2Release` возвращает
   `{ minBuildId: 131, newUserCutoffMs: <момент выхода> }`.
3. Переменные EAS production: все 6 обязательных заданы (проверено Ядром 11.10 по именам), запрещённых нет.
4. Сборка и отправка — [RELEASE_BUILD_E4.md](RELEASE_BUILD_E4.md).

## Шаг 1. Магазины одобрили 2.0 и она доступна для скачивания

Дальше — только после этого. Шаги 2–4 меняют поведение для 1.6.x.

## Шаг 2. Монеты — первой

```bash
firebase deploy --only functions:levelSpinStarGrant --project phraseman-ea0b3
```

- **Зачем первой:** новый кошелёк монет. Новая версия **отклоняет спины 1.6.x**. У тех, кто ещё не обновился, награды
  спинов перестанут начисляться — поэтому сразу шаг 5 (обновление).
- **Проверка:**

  ```bash
  firebase functions:log --only levelSpinStarGrant -n 20 --project phraseman-ea0b3
  ```

  Нет ошибок старта; спин на 2.0 даёт монеты.
- **Откат одной командой** (вернуть трафик на прошлую ревизию):

  ```bash
  gcloud run revisions list --service levelspinstargrant --region us-central1 --limit 3
  ```

  ```bash
  gcloud run services update-traffic levelspinstargrant --region us-central1 --to-revisions <ПРОШЛАЯ>=100
  ```

## Шаг 3. Остальные изменённые функции

```bash
firebase deploy --only functions:adminReplyToReport,functions:claimReportReward,functions:adminDraftReportReply,functions:adminExportReportDocuments,functions:adminExportUnresolvedReports,functions:adminListReportQueue,functions:adminUpdateReportStatus --project phraseman-ea0b3
```

```bash
firebase deploy --only functions:submitShardSurvey,functions:getActiveShardSurvey,functions:adminWriteShardSurvey,functions:adminDeleteShardSurvey --project phraseman-ea0b3
```

```bash
firebase deploy --only functions:progressSubmitEvent,functions:coinReconcileV1 --project phraseman-ea0b3
```

- **Награда за жалобу** — монеты v2: 1.6.x её забрать не сможет, 2.0 — сможет.
- **Опрос** — белые списки маршрутов 2.0.
- **Опрос — без русской подмены (e4f45f8e3, Ядро 12.10):** `getActiveShardSurvey` не предлагает опрос, у которого нет
  текста на языке человека (лог `[SHARD-SURVEY] reason=no_locale`); в языки опроса добавлен `en`. Уезжает той же командой
  выше. **Сразу после неё** — переводы uk/en: `node scripts/apply_shard_survey_translations.mjs` (план), затем
  `--write --confirm APPLY_SURVEY_TRANSLATIONS_UK_EN` (только владелец — запись в прод). Без этого шага на uk/en опросы
  исчезнут; на es/pt-BR/vi/id/tr/pl — исчезнут до отдельного перевода. Подробно:
  [SHARD_SURVEY_TRANSLATIONS_DRAFT.md](SHARD_SURVEY_TRANSLATIONS_DRAFT.md). Проверка: `firebase functions:log --only
  getActiveShardSurvey -n 20` — строки `reason=no_locale` только у языков без перевода.
- **`progressSubmitEvent`** — серия от 2.0 (`streak_sync`). Старые события 1.6.x проверяются по-прежнему.
- **`coinReconcileV1`** — разовая сверка монет. Выложить **до** чистки D90 (`level_spin_results`).
- **Проверка:** `firebase functions:log --only <имя> -n 20 --project phraseman-ea0b3` по одной функции из каждой
  команды. На клиенте 2.0 — `[STREAK-SYNC] sent`, на сервере — нет всплеска `progress_streak_evidence_rejected`.
- **Откат:** `gcloud run services update-traffic <имя строчными> --region us-central1 --to-revisions <ПРОШЛАЯ>=100` —
  для каждой функции. Для новой `coinReconcileV1` — `firebase functions:delete coinReconcileV1 --region us-central1`.

## Шаг 3б. Озвучка карточек — только после правки политики

Не раньше, чем на сайте опубликован абзац П9 (§6/§13) — подробно в «Пакет 20.10», п.6 ниже. Пока политика обещает озвучку
только на устройстве, эти две функции не выкладываются.

```bash
firebase deploy --only "functions:cardTtsPackWorker,functions:adminCardTtsRequeuePack" --project phraseman-ea0b3
```

Затем «Пульт» → `card_tts_enabled` → ВКЛ; без этого функции ничего не шлют в OpenAI.

## Шаг 4. Админка — последней

```bash
firebase deploy --only hosting:admin --project phraseman-ea0b3
```

- В новой админке: награда за жалобу v2, кнопки Шпиля, «🃏 Собрать наборы карточек», копия политики.
- **Проверка:** зайти https://phraseman-ea0b3.web.app/legacy.html#control-panel — вход работает, видна вкладка
  «Контент Spire» → «Шпиль для игроков».
- **Откат:** Firebase Console → Hosting → admin → история выпусков → прошлый → «Откатить».

## Шаг 5. Обновление для 1.6.x

Админка → «Пульт» → блок принудительного обновления (поле `min_app_version`): версия 2.0 и ссылки на магазины.

- Без этого у 1.6.x пропадают спины (шаг 2) и награда за жалобу (шаг 3).
- Решение и момент — владельца. Ядро рекомендует сразу после шагов 2–4.

## Шаг 6. Шпиль — включение ([OWNER_RELEASE_STEPS.md](OWNER_RELEASE_STEPS.md) §4)

Функции Шпиля уже выложены 11.10. Только переключатели, по порядку:

1. Админка → «Контент Spire» → «Шпиль для игроков» → **«Включить Шпиль»** (`config/spire_v1.enabled`, документ создаётся
   сам).
2. Там же, для каждого языка → **«Подготовить задания для Шпиля»** (первая неделя не будет пустой; дальше наборы собирает
   крон).
3. Проверка на dev-сборке с `EXPO_PUBLIC_SPIRE_DEV_TAB=1`: комната открывается, ступень с заданиями.
4. **«Показать вкладку «Шпиль» игрокам»** (`spire_tab_enabled`, через публикацию рубильников). Клиенты увидят вкладку при
   запуске или возврате, не позднее ~5 минут.
5. Проверка на телефоне: вкладка видна, вход в комнату, ступень открывается.

- **Откат:** та же кнопка — «Скрыть вкладку», затем «Выключить Шпиль». Данные комнат не удаляются.

## Шаг 7. После релиза (не в тот же день)

1. Снять `PARITY_GATE_WAIVER`, если задавали.
2. Когда `min_app_version ≥ 2.0` и логи за 7 дней пусты — по одной удалить:
   - `friendsTogetherClaimLevel`;
   - `videoWatchRunesClaim`;
   - 14 функций без кода ([DEPLOY_NOW.md](DEPLOY_NOW.md), шаг 2);
   - и убрать из правил блок `friends_chest_claims` (вместе со сторожем PM-170, который его сейчас требует).
3. Остальное — [OWNER_RELEASE_STEPS.md](OWNER_RELEASE_STEPS.md) §7.

## Пакет 20.10 — по пунктам (Ядро, 12.10 вечер)

Подробности к шагам 2–3 и новый шаг 3б. **Нажимает только владелец.** Сессии ИИ ничего из этого не выкладывают.
Выкладка — из чистого среза коммита, как в [DEPLOY_MORNING_2026-10-13.md](DEPLOY_MORNING_2026-10-13.md) («Почему не из рабочей
папки» и «Команда»): `firebase deploy` собирает рабочую папку, а в ней бывают чужие незакоммиченные правки.

**Что уедет вместе.** Каждая функция берёт весь свой код на момент коммита. Ниже — коммиты с 20.09 в файле функции и её прямых
зависимостях. Дату прошлой выкладки владелец смотрит командой (только чтение) и отсекает всё, что раньше, — оно уже в проде:

```bash
gcloud functions describe <имяФункции> --gen2 --region us-central1 --project phraseman-ea0b3 --format="value(updateTime)"
```

Общие для всех групп коммиты (затрагивают общий код личности и логов, смысл для человека — нет): `0394a4add` (бан переживает
удаление аккаунта), `8917963d6`, `11cf4f911`, `301df32e6`, `750728284`, `a16a2b600` (старым сборкам — client_too_old),
`f5447d10c` / `17047a3c8` (немые catch пишут причину), `efe19ae9d` (общий снимок 30.09).

### 1. `levelSpinStarGrant` — шаг 2, первой

| | |
|---|---|
| Функция | `levelSpinStarGrant` (functions/src/level_spin_star_grant.ts) |
| Порядок | первой, сразу после одобрения 2.0 магазинами, затем без паузы шаг 5 (обновление для 1.6.x) |
| Что даёт | серверный кошелёк монет без спинов (Q13, `6d5835ef8`); список источников монет закреплён (`318589878`); «Супер-воскресенье» снято (`b053c3ac4`, D147); серия телефона раз в сутки (`5e1dc5344`, `398daf03c` — старые клиенты по-старому) |
| Уедет вместе | `caf7b9889` (progressMigrateSnapshot не затирает облако), `1adefdef7` (отказы progressSubmitEvent с причиной), `923ea2b00`, `c9ba37a23`, `9345148f2`, общие выше |
| Риск | **1.6.x перестаёт получать награды спинов** — поэтому шаг 5 сразу |
| Проверка | `firebase functions:log --only levelSpinStarGrant -n 20 --project phraseman-ea0b3` — нет ошибок старта; спин на 2.0 даёт монеты |
| Откат | `gcloud run revisions list --service levelspinstargrant --region us-central1 --limit 3` → `gcloud run services update-traffic levelspinstargrant --region us-central1 --to-revisions <ПРОШЛАЯ>=100` |
| Политика до выкладки | ничего нового: монеты — внутриигровая валюта, уже описана |

### 2. `coinReconcileV1` — шаг 3, третья команда

| | |
|---|---|
| Функция | `coinReconcileV1` (functions/src/coin_reconcile_v1.ts) — **новая**, callable; зовёт клиент 2.0 (app/community_packs/functionsClient.ts) |
| Порядок | после `levelSpinStarGrant`; **до** чистки D90 (`level_spin_results`) |
| Что даёт | разовая серверная сверка монет (`b87afa74a`); учитывает призы спинов аккаунтов, скрытых слиянием (`6e8f634bb`); квитанция против повторной сверки (`4ad2bf08f`) |
| Уедет вместе | общие выше + те же коммиты прогресса, что у levelSpinStarGrant |
| Проверка | `firebase functions:log --only coinReconcileV1 -n 20 --project phraseman-ea0b3`; в Firestore появляются `coin_reconcile_receipts/{opId}`, баланс у тестового аккаунта не задваивается при повторном входе |
| Откат | функция новая: `firebase functions:delete coinReconcileV1 --region us-central1 --project phraseman-ea0b3` (клиент 2.0 переживает отсутствие — сверка просто не применится) |
| Политика | ничего нового |

### 3. Награда за жалобу — шаг 3, первая команда

| | |
|---|---|
| Функции (7) | `adminReplyToReport`, `claimReportReward`, `adminDraftReportReply` (functions/src/report_replies.ts); `adminExportReportDocuments`, `adminExportUnresolvedReports`, `adminListReportQueue`, `adminUpdateReportStatus` (functions/src/admin_reports_center.ts) |
| Порядок | после шага 2 |
| Что даёт | награда за жалобу в монетах v2 `{coins}` 300/600/1000 (`f20328d12`, Q4); жалоба на задание Шпиля (`315c3edb6`); расход ИИ черновика ответа виден по operation (`76de2317d`, `abec9c00a`, `490f82406`) |
| Уедет вместе | `dac44f015` (общий коммит функций 11.10), `a4606e6e6` (удалены помощники MAX), общие выше |
| Риск | 1.6.x не сможет забрать новую награду (2.0 — может) → шаг 5 |
| Проверка | `firebase functions:log --only claimReportReward -n 20 --project phraseman-ea0b3`; админка → ответ на жалобу с наградой → на 2.0 «Забрать» начисляет монеты |
| Откат | для каждой из 7: `gcloud run services update-traffic <имя строчными> --region us-central1 --to-revisions <ПРОШЛАЯ>=100` |
| Политика | ничего нового (жалобы и ответы уже описаны) |

### 4. Опрос осколков + «без русской подмены» — шаг 3, вторая команда

| | |
|---|---|
| Функции (4) | `submitShardSurvey`, `getActiveShardSurvey`, `adminWriteShardSurvey`, `adminDeleteShardSurvey` (functions/src/shard_survey.ts) |
| Порядок | шаг 3; **сразу после** — переводы uk/en (ниже) |
| Что даёт | белые списки маршрутов 2.0 (`e504ec057` — без переходов в Арену/Лигу, `41648d48d` — раздел «Идеи» выключен), `825a5a9f6` (жемчуг не начисляется); **(б) `e4f45f8e3`**: опрос без текста на языке человека не предлагается, лог `[SHARD-SURVEY] reason=no_locale`, `en` в языках опроса |
| Уедет вместе | общие выше |
| Сразу после (только владелец, запись в прод) | `node scripts/apply_shard_survey_translations.mjs` — план; затем `node scripts/apply_shard_survey_translations.mjs --write --confirm APPLY_SURVEY_TRANSLATIONS_UK_EN`. Без этого на uk/en опросы исчезнут; es/pt-BR/vi/id/tr/pl — исчезнут до отдельного перевода; 9 из 63 опросов скрипт покажет «нет в черновике» — их вручную в админке. [SHARD_SURVEY_TRANSLATIONS_DRAFT.md](SHARD_SURVEY_TRANSLATIONS_DRAFT.md) |
| Проверка | `firebase functions:log --only getActiveShardSurvey -n 20 --project phraseman-ea0b3` — `reason=no_locale` только у языков без перевода; на uk-интерфейсе в «Сегодня» опрос по-украински |
| Откат | для каждой из 4: `gcloud run services update-traffic <имя строчными> --region us-central1 --to-revisions <ПРОШЛАЯ>=100` (переводы в документах не мешают старой ревизии) |
| Политика | ничего нового |

### 5. `progressSubmitEvent` — шаг 3, третья команда (вместе с coinReconcileV1)

| | |
|---|---|
| Функция | `progressSubmitEvent` (functions/src/progress_events.ts) |
| Что даёт | серия от 2.0 (`streak_sync`, `5e1dc5344`); старые события 1.6.x проверяются по-прежнему (`398daf03c`); отказы 400 пишут `[PROGRESS-EVENT] rejected` с причиной (`1adefdef7`) |
| Уедет вместе | `caf7b9889` (progressMigrateSnapshot не затирает облако), общие выше |
| Проверка | на клиенте 2.0 — `[STREAK-SYNC] sent`; на сервере — нет всплеска `progress_streak_evidence_rejected` (`firebase functions:log --only progressSubmitEvent -n 50`) |
| Откат | `gcloud run services update-traffic progresssubmitevent --region us-central1 --to-revisions <ПРОШЛАЯ>=100` |
| Политика | ничего нового |

### 6. Озвучка карточек `cardTts*` — НОВЫЙ шаг 3б, только после правки политики

| | |
|---|---|
| Функции (2) | `cardTtsPackWorker` (триггер Firestore `card_tts_jobs/{packId}`), `adminCardTtsRequeuePack` (callable, только admin) — functions/src/card_tts_worker.ts. **Новые.** |
| Рубильник | `remote_config/app.bools.card_tts_enabled` (по умолчанию ВЫКЛ; кэш инстанса 10 мин; ошибка чтения → ВЫКЛ). Имени `config/card_tts_v1` в коде нет. Даже выложенные функции при выключенном рубильнике ничего не шлют в OpenAI — задачи остаются `queued` |
| ⛔ Политика ДО выкладки | сейчас §13 обещает: «pronunciation is generated on device and Knowly does not receive the generated text-to-speech audio». Нужно опубликовать П9 из [PRIVACY_R1_GAP.md](PRIVACY_R1_GAP.md): абзац в §6 (текст карточек одобренного набора отправляется OpenAI для озвучки, аудио хранится с набором) и строку в конец первого абзаца §13 (у части наборов есть заранее подготовленная озвучка). Правка — в `legal/privacy_policy_en.json` и `legal/privacy_policy_en_ios.json`, затем `npm run legal:sync`, затем выкладка сайта `hosting:knowlywww` (DEPLOY_MORNING, блок «Г»). Проверить на https://knowlyapps.com/legal/privacy, что абзац виден |
| Порядок | (1) политика с П9 опубликована и видна → (2) `firebase deploy --only "functions:cardTtsPackWorker,functions:adminCardTtsRequeuePack" --project phraseman-ea0b3` → (3) «Пульт» → включить `card_tts_enabled` → (4) админка → перепоставить ждущие наборы (`adminCardTtsRequeuePack`) |
| Что даёт | озвучка одобренных наборов сообщества через OpenAI TTS (`cc3bac44d`, D128); рубильник ИИ останавливает и её (`2c24c96f7`); серверный рубильник (`a927ae576`); потолки и тайм-ауты платных запросов (`d99195f71`, `15326b641`, `490f82406`) |
| Проверка | `firebase functions:log --only cardTtsPackWorker -n 30 --project phraseman-ea0b3`: при выключенном рубильнике `[CARD-TTS-GATE] skipped:disabled`; после включения — набор доходит до `done`, в админке виден расход по operation; суточный бюджет `card_tts_daily_budget` не превышен |
| Откат | сначала рубильник `card_tts_enabled` → ВЫКЛ (останавливает за ≤ 10 мин без выкладки); затем при необходимости `firebase functions:delete cardTtsPackWorker adminCardTtsRequeuePack --region us-central1 --project phraseman-ea0b3`. Уже созданное аудио остаётся у наборов |
| Деньги | каждый одобренный набор = запросы OpenAI TTS; бюджет на сутки — `card_tts_daily_budget`, расход — `card_tts_billing` |

### Кто нажимает

Все шаги 2, 3, 3б, 4, 5 и запись переводов опросов — **только владелец** (или координатор по его прямому «да» на конкретный
шаг). Сессии ИИ готовят документы и проверяют срез, но ни одной выкладки и ни одной записи в прод не делают.

## Стоп-условия

- Ошибка сборки функций, ошибки старта в логах, CLI предлагает удаление — стоп, откат этого шага, отчёт.
- Деньги (монеты, спины, награды) ведут себя не так, как в проверке шага 2 или 3, — откат шагов 2–3, отчёт.
