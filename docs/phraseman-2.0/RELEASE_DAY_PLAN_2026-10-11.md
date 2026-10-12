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

## Стоп-условия

- Ошибка сборки функций, ошибки старта в логах, CLI предлагает удаление — стоп, откат этого шага, отчёт.
- Деньги (монеты, спины, награды) ведут себя не так, как в проверке шага 2 или 3, — откат шагов 2–3, отчёт.
