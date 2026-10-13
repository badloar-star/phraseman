# Админка 2.0 — план переписывания ПОСЛЕ выхода 2.0

Подготовило Ядро (сессия 1), 13.10.2026, по заданию координатора.
- Основа — `ADMIN_2_0_REWRITE_INVENTORY_2026-10-13.md`, раздел «РЕШЕНИЯ ВЛАДЕЛЬЦА».
- Имена разделов, функций, коллекций и ключей взяты из кода поиском: `admin/v2/legacy.html`, `functions/src/index.ts`,
  `firestore.rules`, `app/remote_flags.ts`; HEAD 13.10 ~12:15.

**Это только план. Ничего не удаляется и не выкладывается. Удаление данных запускает только владелец.**
Админка правится только в `admin/v2/legacy.html` (CLAUDE.md). Вход владельца не трогать: `claims.admin`, без `signOut` в отказе.

---

## Главные ограничения — прочитать до любого этапа

1. **Старые сборки 1.6.x ещё вызывают серверные функции** Арены, Лиг, осколков и Идей. Удалить callable — значит сломать
   этот раздел у тех, кто не обновился.
   - **Удаление функций (этап 4) — только после принудительного обновления** (рубильник «принудительное обновление» в Пульте) до 2.0
     ИЛИ после того, как доля 1.6.x упадёт ниже порога, который назначит владелец (смотреть в Analytics по версиям).
   - Убрать разделы из админки (этап 2) можно сразу: старые сборки админку не открывают.
2. **Зависимости Шпиля под пломбой CLAUDE.md — НЕ трогать как «остатки Арены».**
   - `spire_pack_build.ts` строит неделю Шпиля из живого пула Арены. Читает: `tournamentTasks`, `arena_v2_config/current`,
     `resolveArenaTargetPublication` (коллекции `arena_target_publication_*`, `arena_question_pool_publications`), `tournament_core`,
     `tournament_pool_publication`, `arena_target_quality`, `arena_v2_core`.
   - Функции пула: `adminArenaConfigGet/Set`, `adminArenaContentStatus/Validate`, `adminArenaPublication{Stage,Activate,Rollback,Status}`.
   - Раздел админки `arena-content` (стр. ~15478) уже обслуживает Шпиль («Контент Spire»). Его **переименовать**, не удалять.
3. **Слово «осколки» (shard) не равно «старая экономика».** Под пломбой живое и не удаляется:
   - опросы осколков `shard_surveys`, `shard_survey_responses`, `shard_survey_stats`, `shard_survey_rate_limits`;
   - функции `getActiveShardSurvey`, `submitShardSurvey`, `adminWriteShardSurvey`;
   - `levelSpinStarGrant` и коллекции `level_spin_*` — функция **дня выхода** (ранбук, шаг 13);
   - «шардинг» курса V2: `learningV2LocalizedCourseShardBackgroundWorker`, `adminApprove/Preview/RejectLearningV2CourseWave`.
     К валюте не относится.
   - `revenueCatShardsWebhook` / `revenuecat_shard_*` — отказ старым покупкам осколков и разворот возвратов. Нужен, пока живы
     старые покупки (D70). Удалять только по слову владельца после проверки RevenueCat.
4. **MAX** — отдельный запрет CLAUDE.md. План его не касается.
5. **App Check не включать никогда** (пломба). Безопасность в § 4 — без App Check.

---

## 1. УБРАТЬ

Порядок по каждому пункту строго такой:
**UI админки → функции (после условия п.1) → правила (закрыть запись и чтение) → данные (сухой прогон → владелец).**

### 1.1 Идеи пользователей (в приложении скрыты PM-171)

| Слой | Что |
|---|---|
| Админка | раздел `tab-ideas` (стр. ~14262), пункт меню, обработчики `adminListUserIdeas`/`adminDecideUserIdea`/… в JS |
| Функции (16) | `submitUserIdea`, `updateUserIdea`, `likeUserIdea`, `unlikeUserIdea`, `reportUserIdea`, `getPublicUserIdea`, `listPublicUserIdeas`, `adminListUserIdeas`, `adminDecideUserIdea`, `adminDraftIdeaDecision`, `adminSetUserIdeaStatus`, `adminDeleteUserIdea`, `adminRestoreUserIdea`, `adminSetIdeaSubmissionRestriction`, `adminAlertOnUserIdeaCreated`, `adminAlertOnUserIdeaReport` |
| Коллекции | `user_ideas`, `idea_inbox`, `idea_reports`, `user_idea_rate_limits`, `user_idea_report_rate_limits` |
| Ключи RC | `ideas_enabled` (мёртвый в Пульте) |
| Кто ещё читает | Джарвис `user_ideas` / `compass_*` / `arena_*` / `league_*` **не читает** (проверено 13.10 по `functions/src/jarvis/*_firestore_fetcher.ts`). Перед этапом 4 повторить проверку. Награда «idea_reward» в Plus-планах (`vip=idea`, settings.tsx) — оставить: это история выданных Plus. |

### 1.2 Компас и Подсказки главной (`home_hints` клиент не читает)

| Слой | Что |
|---|---|
| Админка | раздел `tab-compass` (стр. ~14445) с подсказками главной |
| Функции | `adminGetHomeHintsCatalog`, `adminPublishHomeHints`, функции «почему» Компаса (найти по `compass_why_*` в functions/src) |
| Коллекции | `home_hints`, `home_hints_history`, `compass_billing`, `compass_briefings`, `compass_why_billing`, `compass_why_cache`, `compass_why_daily_budget`, `compass_why_rate_limits` |
| Ключи RC | `compass_copy_overrides`, `compass_voice_fallback_ru/uk/es` |
| Кто ещё читает | Убедиться, что `app/` не читает `compass_*`/`home_hints` — по инвентарю нет. Проверить также `app/remote_flags.ts`: ключи compass объявлены там, удалить вместе с типом. |

### 1.3 Арена и Лиги (D54/D74/D78/D83: клиент и сервер Арены удалены в 2.0)

| Слой | Что |
|---|---|
| Админка | старые панели Арены и Лиг, если остались; мёртвый ключ `gate_arena_premium` в Пульте. `arena-content` **переименовать** в «Контент Шпиля» (§ 0 п.2) |
| Функции | `arena_v2_*` матчей и очереди (~30), `league_*`, `tournament*` **кроме пула** (§ 0 п.2), `botProfiles`, `arena_rooms*`. Список составлять по `functions/src/index.ts` и сверять с импортами `spire_*.ts`: всё, что импортирует Шпиль, остаётся |
| Коллекции (71 в правилах) | Удаляемые — матчи, комнаты, сезоны, очереди, профили, звёзды, сундуки Лиг: `arena_v2_matches*`, `arena_v2_queue*`, `arena_v2_seasons`, `arena_v2_star_ledger`, `arena_rooms*`, `arena_sessions`, `league_groups`, `league_week_results`, `league_chest_*`, `league_crowns`, `tournamentRooms`, `tournamentSeasons`, `tournamentSchedule`, `botProfiles` и др. **Остаются**: `tournamentTasks`, `arena_v2_config`, `arena_target_publication_*`, `arena_question_pool_publications`, `tournament_pool_v11_*` |
| Ключи RC | `gate_arena_premium` |
| Кто ещё читает | Шпиль (§ 0 п.2). Сторожа `tests/d74_arena_server_retired.probe.ts`, `tests/d83_arena_client_deleted.probe.ts`, `scripts/guard_league_*.mjs` — обновить списки. Старые сборки 1.6.x (§ 0 п.1). |

### 1.4 Осколки (старая валюта), A/B пейвола, старая экономика

| Слой | Что |
|---|---|
| Админка | раздел `tab-refunds` (стр. ~15188, «Refunds-осколки», D70); архивный блок `paywall_v2_pct` в Пульте (стр. ~14522, ~32749) и вызовы `adminGetPaywallAbWorkspace`/`adminPublishPaywallAb` (~36313–36498); подписи «осколки» в UGC purchases → «монеты» |
| Функции | `adminGetPaywallAbWorkspace`, `adminPublishPaywallAb`, `adminListShardRefunds`. **Не** удалять функции из § 0 п.3 |
| Коллекции | `shard_log`, `shard_rewards`, `shard_earn_daily_counters`, `shard_operation_receipts`, `coin_exchange_trades`, `coin_migrations`, `pearls_to_coins_migrations`, `gifts_to_coins_migrations` — **только после** сверки, что миграции завершены (журналы миграций — доказательство для поддержки; владелец решает, хранить ли их архивом) |
| Ключи RC | `paywall_v2_pct` и мёртвые из инвентаря: `numeric_energy_v2`, `free_lesson_limit`, `max_energy`, `energy_recovery_interval_ms`, `speaking_enabled`, `explain_enabled`, `gate_ai_text_tutor`, `gate_avatar_auras_premium`, `gate_mastery_premium`; `lifetime_button_enabled` — сначала выровнять дефолт (LIFETIME_SALE_RETIRED) |
| Кто ещё читает | `coin_reconcile_v1.ts` журналы миграций **не читает** (проверено 13.10). Джарвис `money_*` — проверить fetcher-ы. |

### 1.5 Бета-тестеры — владелец не выбрал → **уточнить**

- Разделы `tab-testers` (стр. ~12527) и `tab-beta-testers` (~12551), iframe `testers.html` / `beta_testers.html`.
- Аура тестера удалена (D108). Флажок жалобы у тестеров (57da354da) — рабочая функция стор-сборки. Раздел тестеров, возможно, нужен для выдачи этого флажка.
- Вопрос владельцу.

### 1.6 Сухой прогон данных (перед этапом 5)

Скрипт-образец, его пишет Ядро в этапе 5. Вход — ADC владельца, файл ключа не читается. Ничего не пишет.

```bash
node scripts/admin2_cleanup_dryrun.mjs --group ideas|compass|arena|economy
```

- Для каждой коллекции группы — `collection(...).count().get()`: одно агрегатное чтение на 1000 записей индекса. Документы не выкачиваются.
- Плюс проверка подколлекций: `listDocuments` у первых 5 документов.
- Итог: таблица «коллекция → документов → оценка чтений на удаление».
- Удаление — отдельная команда владельца: `--apply --confirm DELETE_<GROUP>_<дата>`.
  - Сначала резервная копия: `gcloud firestore export gs://… --collection-ids=…`.
  - Удаление пачками по 400 с журналом `[ADMIN2-CLEANUP]`.
- Сессии Claude удаление не запускают.

---

## 2. ОСТАВИТЬ и сгруппировать

Новый раздел меню **«Для владельца»** — всё внутреннее, не фича приложения:

| Группа | Разделы legacy.html | Функции (есть) |
|---|---|---|
| Телеграм-оплаты | панель Telegram Premium (найти по `adminActivateTelegramPremiumOrder`) | `adminActivateTelegramPremiumOrder`, `adminInspectTelegramPromoCode`, `adminAlertOnTelegramPremiumOrderWritten`; коллекции `telegram_premium_orders`, `telegram_premium_dead_letter`, `telegram_premium_bot` |
| Сайт и подарочные сертификаты | `site-admin` (~12557), `website-inbox` (~13681), `gift-certificates` (~14822), iframe `site.html` | `adminCreateGiftCertificateBatch`, `adminListGiftCertificates`, `adminGetGiftCertificateDownload`, `adminSendPreparedGiftCertificate`, `adminUpdateGiftCertificate*`, `adminDeleteGiftCertificate`, `adminCancelGiftCertificateBatchOperation`, `webOrderStatus`, `siteStatsTrack`, `submitWebsiteContact` |
| Око Саурона / Дайджест / SOC 2 / Планы / Устав / Аудит | `jarvis` (~12181), `jarvis-plans` (~12244), `product-charter` (~13867), `soc2-readiness` (~13903), `daily-digest` (~14125), `audit` (~15241) | `jarvis*`, `adminGenerateDailyDigest`, `adminGetDailyBriefing`, `adminGetDirectorDigest`, `adminCreatePlan`/`adminListPlans`, `adminGet/SaveProductCharter`, `adminListAuditLog`, `adminAlertDailyDigestsCron` |

Остальное меню (~55 пунктов) сгруппировать по задачам владельца:
- **Пользователи**: Users, бан, жалобы, архив, удаление аккаунтов.
- **Деньги**: Plus, Plus Radar, промокоды, сертификаты → ссылка в «Для владельца», cancel surveys.
- **Контент**: фраза и опрос дня, опросы, видео/YouTube, V2, Шпиль, наборы.
- **Рубильники**: Пульт, Remote Config.
- **Связь**: push, имейлы, плашки, сообщения, поддержка.
- **Здоровье**: App Health, ошибки контента, алерты, бюджет OpenAI.

---

## 3. ДОБАВИТЬ

| Раздел | Готовые функции (подключить) | Чего нет (написать) | Часы |
|---|---|---|---|
| **Шпиль** | `adminSpireConfigGet/Set` (рубильник уже в UI), `adminSpirePackBuild`, `adminSpireTaskFlagAdd/List/Remove`, `adminSpireTaskReportList`, `adminSpireTaskIncidentStates/SetState` (частично в UI `arena-content`) | `adminSpireWeekOverview` — группы недели и итоги из `spire_groups` / `spire_week_results` через `count()` и `limit`; ошибки кронов `spireFinalizeCron`/`spirePackWeeklyCron`/`spireZoneWarningCron` из журнала операций. UI: неделя → группы → игрок (имя рядом с uid, `renderUserRef`) | 10–12 |
| **Диалоги** | `openAiDialogModelConfig`, `openAiDialogQuotaConfig` (модель и квоты). `dialogueV2MemoryView` / `MemoryClear` — пользовательские, админке **не** годятся (работают от имени вызвавшего) | `adminDialogueV2Sessions` (сессии пользователя из `dialogue_v2_sessions` по uid, `limit 20`); жалобы и оценки диалогов (из Оценок, фильтр kind=dialogue); выпуск и отзыв сценариев — сейчас сценарии в бандле, админка только показывает каталог | 12–16 |
| **Уроки V2 — выпуск и откат** | `adminActivateCourseRelease`, `adminRollbackCourseRelease`, `adminSealCourseRelease` (**в UI не подключены**), `adminPublishAuthoredLearningV2Course` (подключена), `adminApprove/Preview/RejectLearningV2CourseWave`, `adminGetLearningV2CourseWorkspaceProjection`, генератор (`v2-generator`, ~13378) | Экран «Выпуск»: текущий выпуск, история, «Опечатать», «Откатить к …» с подтверждением вводом слова (§ 4). Печать курса — по готовой проекции workspace | 8–10 |
| **Монеты и наборы сообщества** | `coinReconcileV1` (**без UI**), `adminGrantReward` (выдача монет и Plus), `communityAdminModeratePack`, `communityModerateSubmission`, `adminCommunityPackQaReview`/`ApplyQaFixes*`/`TranslateLocales`, `adminBackfillVideoPacks`, `adminCardTtsRequeuePack` | Журнал монет пользователя — `adminCoinLedgerView` (последние N операций по uid, `limit`); продажи наборов за монеты (`community_pack_rune_sales`, сумма за период через `count()`/`sum()`); модерация комментариев (`pack_comments`); ранг (чтение) | 10–12 |

Итого «Добавить»: ~40–50 ч. Каждая новая функция:
- `admin: true` claim;
- `enforceAppCheck: false` (пломба);
- серверная запись в журнал действий (§ 4);
- тест.

Тронул данные — обнови Джарвиса (правило CLAUDE.md).

---

## 4. БЕЗОПАСНОСТЬ

1. **Подтверждение вводом слова.** Общий модальный компонент в legacy.html: кнопка активна, только когда введено ровно слово действия
   (`УДАЛИТЬ`, `ОТКАТИТЬ`, или uid / id объекта). Обязателен для необратимых и массовых действий:
   - удаление пользователя и данных;
   - откат и опечатывание выпуска V2;
   - массовая выдача монет и Plus;
   - push и рассылки всем;
   - бан;
   - удаление сертификатов;
   - смена рубильников «техработы» и «ai_global_disable».

   Серверная половина: callable принимает `confirm: '<слово>'` и сверяет его. Без этого вызов из консоли браузера обходит модалку.
2. **Серверный журнал «кто что нажал».**
   - Коллекция `admin_actions`, писать **только сервер**. Поля: uid админа, email, имя действия, цель, параметры без PII, итог (`ok` / код ошибки), время.
   - Правило: `allow write: if false`, `allow read: if admin`.
   - Обёртка `withAdminAudit(name, handler)` для всех `admin*`.
   - Существующий `adminListAuditLog` читает старый журнал. Перевести на `admin_actions`.
   - Прямые `deleteDoc` и запись `remote_config/*` и `config/accounts_v2` из браузера — заменить callable-ами с журналом. Правила на эти
     документы — `allow write: if false` для клиента.
3. **Роли для помощников.**
   - UI уже зовёт `adminAccessResolve` (стр. ~48827), а функции нет: в `functions/src` её нет, проверено 13.10. Раздел «Управление доступом» сломан.
   - Реализовать `adminAccessResolve` / `adminAccessGrant` / `adminAccessRevoke`.
     - Роли: `owner` (всё), `support` (пользователи, жалобы, поддержка — без денег и рубильников), `content` (контент, опросы, фразы, V2-генератор — без выпуска V2 и денег).
     - Хранение — custom claims `adminRole`, `adminAccessVersion`, плюс документ `admin_roles/{uid}` для списка.
   - **Владелец (badloar@gmail.com) — `owner` всегда.** Claim `admin: true` не снимается. Правка входа — только с учётом `____ВХОД_В_АДМИНКУ_НЕ_ЛОМАТЬ____.md`.
   - Сервер проверяет роль в каждой `admin*` через общий `requireAdminRole(request, 'support' | 'content' | 'owner')`.
4. CSP без `unsafe-inline` и `unpkg`, библиотеки локально с SRI, убрать `127.0.0.1:43817` — из инвентаря, этап 7.

---

## 5. Стоимость Firebase и скорость

- **legacy.html — 3,7 МБ, 54 238 строк, `no-store` при каждом заходе.**
  - Разбить на оболочку (меню, вход, общие помощники) и модули разделов `admin/v2/tabs/<раздел>.js`, загружаемые при первом открытии раздела.
  - Модули — с хэшем в имени и `Cache-Control: public, max-age=31536000, immutable` (заголовки hosting в `firebase.json`). Оболочка — `no-cache`.
  - Ожидаемо: первый заход ~400–600 КБ вместо 3,7 МБ, повторные — из кэша.
- **Чтения.**
  - Обновить `ADMIN_FIRESTORE_COST_AUDIT`. Проверить `loadUsers` / `loadArchive` / `loadOpsLog` на выкачивание коллекций.
  - Списки — `limit` + курсор. Итоги — `count()` / `sum()` агрегации.
  - Имена рядом с uid — батчем `resolveUserNames`, 30 за запрос, кэш на сессию.
  - Новые разделы § 3 — только агрегации и `limit`.
- **Удаление мёртвого (§ 1)** снимает лишние слушатели и вызовы при входе в админку и уменьшает число развёрнутых функций (холодные старты, стоимость).
- Убрать дубли файлов: корневые `admin/legacy.html`, `admin/index.html`, `admin/full.html` заморожены и не хостятся. `admin/v2/full.html` читает `plan_content_telemetry_events`, продюсера нет — удалить с решением координатора.

---

## 6. Этапы (по 1–2 дня; всё после выхода 2.0)

| Этап | Дни | Что | Кто | Условие начала | Проверка |
|---|---|---|---|---|---|
| 1 | 1 | Безопасность-основа: `withAdminAudit` + `admin_actions` (сервер), модалка «введи слово» + серверная сверка `confirm`, правила `admin_actions`/`remote_config`/`config/accounts_v2` (запись только сервером) | Ядро + Авторизация (вход) | релиз опубликован | тесты обёртки; ручной вход владельца; запись Пульта через callable |
| 2 | 1–2 | Роли: `adminAccessResolve/Grant/Revoke`, `requireAdminRole` во всех `admin*`; «Управление доступом» оживает | Авторизация | этап 1 | тест ролей; владелец — owner; помощник support не видит деньги |
| 3 | 1 | УБРАТЬ UI: разделы § 1.1–1.4 из legacy.html, мёртвые ключи из Пульта, `arena-content` → «Контент Шпиля», подписи «осколки» → «монеты»; меню по § 2 + раздел «Для владельца» | Ядро | этап 1 (журнал уже пишет) | сверка меню; вход владельца; сторож `guard_admin_login` |
| 4 | 1 | УБРАТЬ функции § 1.1–1.4 из `index.ts` (кроме пломб § 0), обновить сторожа d74/d83/лиги и контракт Джарвиса | Ядро | **условие § 0 п.1** (принудительное обновление или доля 1.6.x ниже порога) + слово владельца | тесты functions; сборка; выкладка — владелец (`firebase functions:delete` по именам — владелец) |
| 5 | 0,5 + владелец | Правила: закрыть удаляемые коллекции (`allow read, write: if false`). Скрипт сухого прогона § 1.6 → таблица владельцу | Ядро | этап 4 выложен | `firebase emulators` тест правил; сухой прогон без записи |
| 6 | владелец | Данные: экспорт в GCS → удаление по группам скриптом с `--apply --confirm` | **только владелец** | этап 5 + его слово по таблице | повторный сухой прогон = 0 |
| 7 | 2 | Скорость: разбиение legacy.html на оболочку и модули с кэшем, CSP/SRI, аудит чтений | Ядро | этап 3 | размер первого захода; число чтений на вход; все разделы открываются |
| 8 | 1–2 | ДОБАВИТЬ: Уроки V2 — выпуск и откат (готовые функции + модалка слова) | Ядро (+ Codex по контракту функций) | этапы 1–2 | выпуск и откат на тестовом проекте или эмуляторе функций |
| 9 | 2 | ДОБАВИТЬ: Шпиль — неделя, группы, инциденты, ошибки кронов (`adminSpireWeekOverview`) | Ядро | этап 7 (модульная оболочка) | чтения на открытие ≤ 30 |
| 10 | 2 | ДОБАВИТЬ: Монеты и наборы — `coinReconcileV1` в UI, `adminCoinLedgerView`, продажи и комментарии наборов | Ядро + Карточки | этап 7 | журнал монет совпадает с `coin_ledger` по тестовому uid |
| 11 | 2 | ДОБАВИТЬ: Диалоги — сессии пользователя, оценки и жалобы, модель и квоты | Ядро + Диалоги | этап 7 | без чтения реплик целиком: только мета (политика) |

Итого ~14–17 рабочих дней. Этапы 1–3 можно начинать сразу после выхода. Этапы 4–6 ждут условия § 0 п.1 и слова владельца.

## 7. Вопросы владельцу (до этапа 3)

1. Бета-тестеры — убрать или оставить (выдача тестерского флажка жалобы)?
2. Журналы миграций монет (`coin_migrations`, `pearls_to_coins_migrations`, `gifts_to_coins_migrations`) — удалить или в архив GCS?
3. Порог доли 1.6.x для удаления функций Арены, Лиг и Идей — или сразу принудительное обновление?
4. Роли помощников — нужны ли кроме `support` и `content` (например, `finance` только для Plus и сертификатов)?
