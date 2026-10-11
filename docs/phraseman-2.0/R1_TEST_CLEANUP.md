# Уборка тестовых записей после съёмки R1

Версия 11.10.2026 · сессия «Макеты» · **только план, в прод ничего не записано и не удалено.**
Основание: ledger п.56 (владелец разрешил реальные отправки с тестового гостя). Условие координатора: тестовые записи
в модерации и поддержке помечать «TEST R1» и убрать после съёмки.

Пути и поля сверены с кодом (`файл:строка`). Что не проверено — помечено «НЕ ПРОВЕРЕНО».
Любое действие из разделов «Откат» в проде — **только после явного «да» владельца** и только по перечисленным ниже полям.

---

## 0. Что записать ДО съёмки (иначе потом нечем искать)

1. `stableId` и `authUid` того аккаунта, с которого шлёмся (Dev Hub / журнал входа `[AUTH-SIGNIN]`). Обозначим **G**.
2. `id` набора **P**, под которым ставим лайк, добавление и отклик (журнал `[PACK-SOCIAL]`).
3. `id` заявки на публикацию (ответ функции `submissionId`; журнал клиента).
4. **Во все свободные тексты** (название набора, описание, отклик, жалоба, обращение) вписывать префикс `TEST R1`.
   Firestore не ищет подстроку — поиск идёт по G, а `TEST R1` нужен глазам при проверке выдачи.
5. **Решение координатора (11.10): G ≠ №3.** G — анонимный гость на эмуляторе, №3 — Google-аккаунт «Phraseman Support».
   Удаление №3 всё равно делать ПОСЛЕДНИМ, а все откаты «руками» — до него (после удаления входа нет, часть следов остаётся, раздел 9).
6. **Отклик и лайк — на наборе тестового аккаунта №2**, а не на чужом (так «колокольчик» не уйдёт реальному автору, раздел 3).
   Если для кадра нужен именно чужой набор — пометить, решает координатор.
7. **Вызов ИИ требует настоящего Plus** (раздел 6). Если у тестовых аккаунтов Plus нет — кадр `paywalls-008` не снимаем.
8. Всё это на паузе, пока владелец не подтвердил Сверке напрямую.

---

## 1. Сводная таблица

| № | Отправка | Что пишет | Находится по | Что считает | Откат | Кто может |
|---|---|---|---|---|---|---|
| 1 | Заявка на публикацию | `community_pack_submissions/{id}` + `users/G/pack_publish_limits/community_pack` | `authorStableId`=G, `callerAuthUid`=G.auth | суточный лимит 3 новых (UTC) | «Отозвать» у гостя → `cancelled`; админ `reject`; удалить документ — только консоль | гость · админ (claim `admin`) · владелец (консоль) |
| 2 | Отклик под набором | `community_packs/P/pack_comments/{auto}` + уведомление автору набора | `authorId`=G | `commentsCount` P +1 | гость удаляет свой отклик (−1) | гость · владелец (консоль) |
| 3 | Жалобы на набор/отклик/игрока | `community_pack_reports/{cpr_…}` или `user_reports/{auto}` + `client_report_rate_limits` | `reporterUid`=G | окно 5/час; для `user_reports` ещё `jarvis_quality_daily` | статус `reviewed`, затем удалить документ (правила разрешают админу) | админ |
| 4 | Обращение в поддержку («Сообщить об ошибке») | `error_reports/{id}` + `client_report_rate_limits` | `uid`=G | окно 10/час; `jarvis_quality_daily` | статус `archived` (НЕ `fixed`), затем удалить документ | админ |
| 5 | Вызов ИИ | `premium_dialog_quotas`, `premium_dialog_rate_limits`, `premium_dialog_billing`, `ai_operation_billing`, (V2) `dialogue_v2_*` | `uid`/`authUid`/`stableUid`=G | месячная квота реплик +1; деньги OpenAI | данные — только консоль/Admin SDK; деньги не вернуть | владелец |
| 6 | +1 добавление, +1 лайк | `pack_adds/G`, `pack_likes/G` под P | id документа = G | `addedCount` +1, `likesCount` +1 | лайк — повторный тап гостя; добавление — **только консоль** (+ `addedCount` −1) | гость (лайк) · владелец (добавление) |
| 7 | Удаление аккаунта №3 | `account_delete_jobs`, tombstone `pending` на 14 суток | `stableUid`/`authUid` №3 | — | «Восстановить аккаунт?» при входе, пока воркер не начал | владелец аккаунта |

---

## 2. Заявка на публикацию набора

- **Функция:** `communitySubmitPackForReview` (`functions/src/community_packs.ts:359`; клиент `app/community_packs/publishLocalPack.ts`).
- **Пишет:**
  - `community_pack_submissions/{id}`: `status:'pending'`, `authorStableId`, `callerAuthUid`, `submittedAt`(мс), `payload`
    (`titleRu`, `descriptionRu`, `cards`…), `submissionKind:'create'`, `submissionKey`, `payloadHash`
    (`community_packs.ts:566-575` с ключом идемпотентности, `:583-590` без). Если есть `submissionKey`, id =
    `create_<sha256(G \0 ключ)>`, иначе авто-id.
  - `users/G/pack_publish_limits/community_pack` = `{dayKey:'YYYY-MM-DD', count, updatedAtMs}` — **+1**, сброс сам в
    полночь UTC (`functions/src/pack_publish_limit.ts:78-95`, лимит 3 в сутки `:14`). Админ-вызов лимит не тратит.
  - Триггеров на создание заявки в `community_packs.ts` нет; Telegram-алерта на заявку не нашёл (в дайджесте очередей
    она может попасть в «элементы в очередях» — НЕ ПРОВЕРЕНО).
- **Найти:** `community_pack_submissions` where `authorStableId == G` (или `callerAuthUid == G.auth`), статус `pending`.
- **Откат (от мягкого к жёсткому):**
  1. Гость в приложении «Отозвать» → `communityAuthorRemovePack` (`community_packs.ts:888`) → `status:'cancelled'`,
     `reviewedAt` (`:910-925`). Документ остаётся.
  2. Админ: `communityModerateSubmission` (`:601`, claim `admin`) с `action:'reject'` → `status:'rejected'` и **запись в
     `users/G/community_seller_inbox`** (`:639-660,682-699`). **`approve` НЕ использовать** — он создаёт опубликованный
     набор в `community_packs` и регистрирует карточки в реестре фраз (`:721+`, `syncFlashcardRegistryPackMutation`).
  3. Удалить сам документ заявки: правила `community_pack_submissions` — `write: if false` (`firestore.rules:2858-2861`),
     значит **ни приложение, ни веб-админка**; только консоль Firebase / Admin SDK владельца.
  4. Сбросить слот лимита: удалить/обнулить `users/G/pack_publish_limits/community_pack` (консоль) — по желанию,
     сам сбросится в 00:00 UTC.
- **Если заявку уже одобрили и набор вышел в каталог:** `communityAdminModeratePack` (`:958`) `action:'remove'` →
  `listingStatus:'admin_removed'`, снимает карточки из реестра, пишет inbox автору; либо `communityAuthorRemovePack`
  для опубликованного (`:928-950`) → `admin_removed` + `removedByAuthor`. Документ `community_packs/{id}` физически
  удалить нельзя (`allow create, delete: if false`, `rules:2772`) — только консоль.

## 3. Отклик под набором

- **Путь:** клиент пишет прямо в Firestore, без функции — `publishPackComment`
  (`app/community_packs/packCommentsFirestore.ts:218`), транзакция:
  - `community_packs/P/pack_comments/{auto}`: `authorId:G`, `authorName`, `text` (≤200), `createdAtMs`, `pinned:false`,
    `reactions:{}`, `reactedBy:{}` (`:249-258`);
  - `community_packs/P`: `commentsCount` **+1** (`:259`).
- **Условие правил:** писать можно, только если набор добавлен себе (`pack_adds/G` существует) либо G — автор P
  (`firestore.rules:2805-2835`). Поэтому порядок съёмки: добавление → отклик.
- **Побочный эффект наружу:** триггер `notifyOnPackCommentCreated` (`functions/src/user_notifications.ts:132`) создаёт
  `users/<автор P>/notifications/pack_comment_<commentId>` — **реальный автор чужого набора получит «колокольчик» с
  текстом отклика** (кроме случая, когда автор P = G). Крон чистит такие записи старше 30 дней (`:14-18`).
- **Найти:** `collectionGroup('pack_comments')` where `authorId == G` (НЕ ПРОВЕРЕНО: нужен ли индекс collection-group)
  или открыть ветку P и искать `TEST R1`.
- **Откат:** гость удаляет свой отклик (`deletePackComment`, `packCommentsFirestore.ts:290`: удаление + `commentsCount`
  **−1**). Правила: удалить может **только автор отклика**, автор набора лишь скрывает (`rules:~2845`). Остальное —
  консоль: удалить `users/<автор P>/notifications/pack_comment_<commentId>` или подождать 30 дней.
- **Жалоба на этот отклик** — отдельная запись, см. раздел 4.

## 4. Жалобы

- **Функция:** `submitClientReport` (`functions/src/client_reports.ts:680`), виды (`:56-66`):
  - `community_pack_report` → `community_pack_reports/{cpr_<sha256(G|packId|commentId)[:48]>}` (`:236-240`): `packId`,
    `packTitle`, `authorStableId`, `studyTarget`, `reason`, `comment`(≤500), при жалобе на отклик ещё `commentId`,
    `commentAuthorStableId`, `commentText`; `reporterUid:G`, `reporterAuthUid`, `status:'new'` (`:311-340`).
    Повтор той же жалобы документ не плодит (тот же id).
  - `user_report` / `arena_opponent_report` → `user_reports/{auto}`: `reportedUid`, `reportedName`, `reason`,
    `reporterUid:G`, `status:'new'` (`:268-309`). Жалоба на бота Арены молча не пишется.
  - оба: `client_report_rate_limits/<вид>_<hash(authUid|G)>` = `{count, windowStartMs}` (лимит 5 в час) (`:760-790`).
- **Счётчики:** для `community_pack_report` агрегата качества **нет**; для `user_report` — есть:
  `jarvis_quality_daily/<день>/sources/user_reports/buckets/<hash>` (`eventCount`, `affectedUserCount`) и
  `jarvis_quality_daily/_meta` (`quality_daily_aggregate.ts:104-121`; правила `write: false` — только Admin SDK).
- **Наружу уходит алерт владельцу:** `adminAlertOnUserReport` (`admin_alerts.ts:157`) и
  `adminAlertOnCommunityPackReportCreated` (`admin_alert_sources_reports.ts:83`) → очередь `admin_alert_events` →
  Telegram-бот. **Сообщение в Telegram не отозвать** — заранее предупредить владельца. Попадает и в ежедневный дайджест
  (`admin_daily_digest.ts:442,837`).
- **Автоскрытия набора по числу жалоб** для `community_pack_reports` не нашёл — НЕ ПРОВЕРЕНО.
- **Найти:** `community_pack_reports` / `user_reports` where `reporterUid == G`.
- **Откат:** `adminUpdateReportStatus` (`admin_reports_center.ts:653`, право `reports.status.write`):
  `community_pack_reports` `new→reviewed` (других статусов нет, `:75-77`), `user_reports` `new→reviewed|archived`
  (`:70-73`); пишет `admin_log` (аудит, оставить). Затем **удалить документ**: правила разрешают `isAdmin()`
  (`rules:1810-1813`, `1885-1889`) — из админки или консоли. `client_report_rate_limits/...` — тоже `isAdmin` (`rules:1975`).
  **Не использовать** «Ответить с наградой» (`adminReplyToReport`, `report_replies.ts:358`) — он начисляет награду
  автору жалобы.

## 5. Обращение в поддержку («Сообщить об ошибке»)

- **Путь:** `app/error_report.ts:157` `submitErrorReport` → `submitClientReport('error_report', …)`. Локально ставит
  метку «не чаще раза за период» в AsyncStorage (`THROTTLE_KEY`, сбросится `pm clear`).
- **Пишет:** `error_reports/{auto|idempotent}`: `uid:G`, `authUid`, `comment`, `category`, `screen`, `dataId`, `dataText`,
  `copyText`, `diagnostics`, данные устройства, `status`; `client_report_rate_limits` (10 в час); **агрегат**
  `jarvis_quality_daily/<день>/sources/error_reports/buckets/<hash>` +1 и `.../affected_users/<marker>`,
  `jarvis_quality_daily/_meta`.
- **Наружу:** `adminAlertOnContentReport` (`admin_alerts.ts:273`) → Telegram владельцу (не отозвать).
- **Найти:** `error_reports` where `uid == G`; текст `TEST R1` в `comment`.
- **Откат:** `adminUpdateReportStatus`: `new→archived` (разрешено, `admin_reports_center.ts:68`). **Не ставить `fixed`:**
  по комментарию в `client_reports.ts:793-796` админка при «пофикшено» начисляет осколок автору. Потом удалить документ
  (`rules:1891-1899`: `isAdmin`, кроме `contentScope:'spire'`). Счётчик `jarvis_quality_daily` **штатно не откатывается** —
  только Admin SDK.
- **Если Сверка использовала другую форму** («Идея/отзыв», письмо): это `feedback_entries` / `user_ideas` / входящая
  почта `support_inbox` (server-only, `rules:3457`) — НЕ РАЗБИРАЛ, скажите — добавлю.

## 6. Вызов ИИ

- **Основной путь приложения:** `premiumDialogSend` (`functions/src/premium_dialog.ts:1047`; клиент
  `app/ai_dialog_client.ts:400`). Для **Free** функция вернёт `dialog_plus_required` (`:1135`) — реальный вызов возможен
  только на Plus/пробном доступе гостя (проверить заранее, чтобы не потерять попытку).
- **Пишет:**
  - `premium_dialog_quotas/quota_<sha256('quota|authUid|stableUid')[:48]>`: `monthlyCount` **+1**, `monthlyCap`,
    `periodKey` (`:70,203-206,286-300`) — квота сама сбрасывается 1-го числа UTC;
  - `premium_dialog_rate_limits/...` (`:66,253`);
  - `premium_dialog_billing/{auto}`: `uid`, `authUid`, токены (`:71`; для V2 — `dialogue_v2_usage_billing.ts:91`);
  - `ai_operation_billing/{auto}` — журнал стоимости с TTL (`ai_operation_billing.ts:67`, `log_ttl`).
  - V2-диалоги (если шли через них): `dialogue_v2_sessions/{id}`, `dialogue_v2_freeform_sessions/{id}` (с `expiresAtMs`),
    `users/G/dialogue_v2_freeform_memory/{язык}`.
- **Деньги:** реальный запрос в OpenAI — **не вернуть**. Единственный пункт, где откат невозможен по определению.
- **Найти:** по `uid`/`authUid`/`stableUid` == G.
- **Откат:** правила на все эти коллекции — `false`, значит только консоль/Admin SDK. Реально нужно: удалить строку
  `premium_dialog_billing` (если мешает отчётам) и, при желании, уменьшить `monthlyCount` на 1. Память собеседника —
  через `dialogueV2MemoryClear` (`dialogue_v2_memory_management_callable.ts:134`, вызывает сам гость).
- **TTL сессий V2:** в индексах есть `ttl: true` для `expireAt` (`firestore.indexes.json:1216-1235`), но привязка именно
  к `dialogue_v2_*_sessions` — НЕ ПРОВЕРЕНА.

## 7. +1 добавление и +1 лайк

- **Путь:** клиент пишет напрямую, транзакциями (`app/community_packs/packSocialFirestore.ts`):
  - лайк `:131` → `community_packs/P/pack_likes/G` `{userId, packId, createdAt}` + `P.likesCount` **+1**;
  - добавление `:165` → `community_packs/P/pack_adds/G` + `P.addedCount` **+1** (только первое добавление этим G).
  Правила: `pack_likes` — создать/удалить может владелец id (`rules:2781`); **`pack_adds` — создать можно,
  `update, delete: if false`** (`rules:2788-2793`).
- **Откат:**
  - лайк: гость повторно тапает сердце → удаляется `pack_likes/G`, `likesCount` −1;
  - добавление: **из приложения снять нельзя.** Консоль/Admin SDK: удалить `pack_adds/G` и сделать `addedCount` −1
    (`FieldValue.increment(-1)`). Локально у гостя набор лежит в библиотеке — удалить там же (или `pm clear`).
  - Порядок: сначала снять отклик (раздел 3) и лайк, потом убирать добавление — отклик требует `pack_adds/G` в момент записи.
- **Нюансы:** кэш каталога у людей живёт до 6 ч (`packLiveCounts.ts`), цифры «добавили/лайки» выровняются сами.
  Реальный набор: +1 виден всем и влияет на сортировку популярного (`packSocial.ts`).
- **Дыра:** удаление аккаунта G **не чистит** `pack_likes/pack_adds/pack_comments` под чужими наборами и не уменьшает
  счётчики (в списках `account_delete.ts:279-298` их нет) → такой след останется навсегда. Откат — ДО удаления.

## 8. Удаление аккаунта №3

- **Функции:** `accountDeleteEnqueue` (`functions/src/account_delete.ts:2188`) — клиент ставит задачу; админ —
  `adminQueueAccountDeletion` (`admin_account_delete.ts:433`, право `users.delete`).
- **Что происходит:** локальные данные телефона стираются сразу; на сервере **14 суток** (`ACCOUNT_DELETE_GRACE_MS`,
  `account_delete_grace.ts:21`) tombstone в статусе `pending` — вход закрыт, **данные целы**. Затем воркер сносит дерево
  `users/<id>` и записи по спискам `account_delete.ts` (в т.ч. `error_reports`, `community_pack_reports`,
  `community_pack_submissions`, `community_packs` автора, `premium_dialog_*`, `dialogue_v2_memory`).
- **Откат:** при входе тем же аккаунтом «Восстановить аккаунт?» → `accountDeleteRestoreMine`
  (`account_delete_restore.ts:84`): снимает задачу, tombstone, маркер входа, постоянные запреты, пишет
  `account_deletion_restores`. **Только пока воркер не начал** (`accountDeleteRestorable`, `account_delete_grace.ts`);
  после первого прохода — необратимо.
- **Риск:** №3 = «Phraseman Support» — если на нём права админа/поддержки, потеря после 14 суток необратима.
  Перед удалением записать `stableUid`/`authUid`. Была ли у №3 подписка (RevenueCat) — НЕ ПРОВЕРЕНО.

## 9. Остаточный след (штатно не убирается)

| Что | Почему | Вывод |
|---|---|---|
| `jarvis_quality_daily` счётчики (`error_reports`, `user_reports`) | правила `false`, откатов нет | ≈ +1 событие в отчёте качества за день; оставить или поправить Admin SDK |
| Telegram-сообщения владельцу (жалобы, обращение) и `admin_alert_events` | уходят сразу | предупредить владельца |
| `admin_log` при модерации/статусах | это аудит | оставить |
| `community_seller_inbox` у G после `reject` | `write:false` | уйдёт вместе с `users/G` при удалении аккаунта |
| Лайк/добавление/отклик G под чужим набором после удаления G | нет в списках удаления | откатить ДО удаления (разд. 3, 7) |
| `ai_operation_billing`, `dialogue_v2_*_sessions` | нет в списках удаления; есть TTL (проверить) | ждать TTL |
| Стоимость OpenAI | невозвратна | принять |
| Уведомление реальному автору набора (отклик) | триггер | удалить `notifications/pack_comment_<id>` в консоли или подождать 30 дней |

## 10. Порядок уборки (когда съёмка закончена)

1. **Руками гостя (пока жив вход):** убрать лайк → удалить свой отклик → «Отозвать» заявку → стереть память
   собеседника (`dialogueV2MemoryClear`) → удалить локальный набор.
2. **Админка (claim `admin`):** жалобы `community_pack_reports`/`user_reports` → `reviewed`; `error_reports` → `archived`;
   затем удалить эти документы и их `client_report_rate_limits`. Не нажимать «пофикшено» и «ответить с наградой».
3. **Консоль/Admin SDK (только после «да» владельца):** `pack_adds/G` + `addedCount −1`; документ заявки;
   `users/G/pack_publish_limits/community_pack`; строки `premium_dialog_billing`/`ai_operation_billing` G; уведомление автору набора.
4. **Последним:** удаление аккаунта №3 (если слали с него) — или, если нужен вход после съёмки, нажать «Восстановить аккаунт?».
5. Проверка: поиск по G в `community_pack_submissions`, `community_pack_reports`, `user_reports`, `error_reports`,
   `premium_dialog_*` — пусто; `likesCount/addedCount/commentsCount` набора P вернулись к значениям из шага 0.

## 11. Как снизить след уже сейчас (предложение координатору/владельцу)

- Если можно выбирать, кому ставить лайк/добавление/отклик, брать набор, автор которого — сам тестовый G: тогда
  «колокольчик» никому чужому не уйдёт, а счётчики чужого набора не трогаются. Владелец разрешил и чужой реальный
  (п.56) — это безопасная альтернатива, а не запрет.
- Снимать кадры «жалоба» и «обращение» по одному разу: потолки 5 и 10 в час, а Telegram-шум растёт линейно.

## 12. Что НЕ проверено

- нужен ли индекс для `collectionGroup('pack_comments')` и `('pack_likes')` по `authorId`/`userId`;
- привязка TTL к `dialogue_v2_*_sessions` и к `ai_operation_billing`;
- кнопка удаления документов жалоб в `admin/index.html` (правила разрешают, кнопку не смотрел);
- наличие подписки у №3 (RevenueCat);
- автоскрытие набора по числу жалоб на сообщество;
- какая именно форма поддержки и какой вызов ИИ использовались при съёмке.
