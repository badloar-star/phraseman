# Журнал выкладки 22.10 — утренний пакет (Ядро)

Governance-ID: TG-007FDB8B65CE
Governance-ID: TG-6304E6A87376
Status: In progress
Owner: Ядро (сессия 1). «ДА» владельца на пакет `deploy-pack-morning-2026-10-22.md` — кнопками в чате координатора, ~09:20.

## Outcome

Группы Г → А → Б выложены в прод по одной, с ревизиями для отката до и 10 минутами логов после. Группа В (isPlus) — НЕ выкладывается, пока координатор не даст отдельное слово. Д — сайт (9 · САЙТ).

## Scope

- Г: `adminAlertDispatchOnCreate`, `adminAlertRecoveryCron` (bae288570 + bd56321bb).
- А: `spireJoinRoom`, `spireReportSteps` (a02d64a0a + попутные D162 и coinRank).
- Б: `giftLinkInfo`, `giftCancel`, `webCheckoutCreate`, `webOrderStatus`, `paypalOrderCreate`, `stripeWebhook`, `paypalOrderCapture`, `webPrices`. Только после сигнала 9 · САЙТ о сроке «5 рабочих дней» (50b0b6251). Крон напоминаний `web_activation_reminders` НЕ включается.

## Architecture

`scripts/deploy_from_clean_head.sh --only <цели> --execute` — выгрузка ровно HEAD, сборка, паритет рантайма. Обёртка `deploy_group.sh` (scratchpad) записывает ревизии до и после. Одна тяжёлая операция за раз, через светофор.

## Security and privacy

Код уже проверен Ревизором (пакет). Новых данных нет. App Check не трогается.

## Technical debt

`support_repo_context.json` пересобрать после применения политики v4 (Д2), перед выкладкой функций поддержки. В этих группах её нет.

## Verification

После каждой группы — ревизии «после», 10 минут логов функций (ошибки/предупреждения), итог одной строкой координатору и сюда.

## Rollback

`gcloud run services update-traffic <svc> --to-revisions=<ревизия до>=100 --region <регион>`. Новые функции Б удаляются через `firebase functions:delete` по имени.

Governance-ID: TG-C162EB1FFF68

## Ход

- **Г** — 06:58Z, HEAD e1c3afa8c, exit 0.
  - `adminalertdispatchoncreate`: -00010-cox → **-00011-wag**.
  - `adminalertrecoverycron`: -00009-xed → **-00010-zuv**.
  - Откат — ревизии «до».
  - Логи 06:58–07:06Z: dispatch — 4 записи, recovery — 6 записей. warn 0, error 0. ✅
- **А** — по слову владельца добавлен `spireZoneWarningCron` (dcc314113, «край зоны»).
  - 07:13Z, HEAD b9b822702, exit 0.
  - `spirejoinroom`: -00004-pok → **-00005-qag**.
  - `spirereportsteps`: -00002-sub → **-00003-now**.
  - `spirezonewarningcron`: -00002-los → **-00003-vah**. Расписание `0 6-22 * * 0` ENABLED.

  - Логи 07:13–07:23Z: joinroom 1 запись, reportsteps 0, zonewarning 0. warn 0, error 0. ✅ (трафик утром мал)

Governance-ID: TG-529C67DF5D8B
Governance-ID: TG-EE1D82D08B85

- **Б** — сигнал 9 · САЙТ (50b0b6251, «5 рабочих дней») в HEAD. Крон `web_activation_reminders` НЕ выкладывается.
  - 07:36Z, HEAD 1287acfb6, exit 0.
  - Обновлены:
    - `webcheckoutcreate`: -00033-qen → **-00034-jed**;
    - `weborderstatus`: -00024-nus → **-00025-vip**;
    - `paypalordercreate`: -00032-dih → **-00033-hec**;
    - `stripewebhook`: -00043-gaw → **-00044-zub**;
    - `paypalordercapture`: -00041-feh → **-00042-liv**;
    - `webprices`: -00026-lev → **-00027-hut**.
  - Новые: `giftlinkinfo` -00001-ron, `giftcancel` -00001-lot. Откат — `firebase functions:delete` по имени.
  - Ответы до и после выкладки совпадают побайтно:
    - `webPrices`: 200, eur 799/3999/9999;
    - `webOrderStatus` (POST cs_ несуществующий): 200, `{"ok":true,"status":"unknown"}`.
  - Тестовое событие Stripe НЕ отправлялось: нужен вход в панель Stripe или ключи, Ядро их не касается. Вместо него — логи 15 минут, по указанию координатора.

  - Логи 07:35–07:53Z, все 8 функций: error 0, warn 0. ✅
  - 9 · САЙТ получил сигнал «включай giftDeliveryEnabled».

Governance-ID: TG-9A386DE247A3
Governance-ID: TG-C5EBE54A5A6B

- **В-ядро** (решение координатора — вариант 1, без вебхука): `publicProfileProjectMine`, `premiumExpiryCron`, `friendsGetProfiles`.
  - Накопление с прошлых выкладок проверено:
    - friends — только 1a247db5f;
    - проекция — только cbdecef56;
    - крон — d14113f79 (маска полей при скане), a4606e6e6 (мёртвый MAX), f5447d10c (логи), 0217c4a21 (export) + cbdecef56.
  - 08:02Z, exit 0.
    - `publicprofileprojectmine`: -00010-yob → **-00011-kom**;
    - `premiumexpirycron`: -00044-siz → **-00046-cis**;
    - `friendsgetprofiles`: -00022-tot → **-00023-ber**.
  - Логи 08:01–08:04Z: error 0, warn 0.
  - Дозапись `--apply`, 08:03Z:
    - 238 кандидатов: Plus — 157, не Plus — 66, без users — 15;
    - **записано 223**, ошибок 0.
  - Повторная пробная проверка: 157 «без изменений». 66 профилей «не Plus» показываются как изменённые из-за ошибки сравнения в скрипте: `Number(null ?? -1)` = 0, а не null. Данные верные, повтор безвреден. Починка — вместе с 🟡(а) Ревизора (лимит 2000).
- **Вебхук** `revenueCatShardsWebhook` — 08:09Z, HEAD 9de6be219, exit 0.
  - -00064-vet → **-00065-rik**.
  - Логи 08:05–08:10Z: 6 записей, error 0, warn 0.
  - 30 минут наблюдения [REVENUECAT] / [PLUS-RING] идут, плюс сверка первого события Plus.
- Вебхук — отдельной группой.
  - Ревизор ✅ 3.162: накопление с 04.09, окно рефералов 30 дней (a0cf96827) — решение владельца 21.09.
  - Откат -00064-vet.

Governance-ID: TG-69792F7525EF

## Очередь после вебхука

1. Удаление Лиг 1.x и лишних функций, группы A и B.
   - **Исключено:** `adminSearchUsers`. Его зовёт новая панель «Выдать Plus любому профилю» (9 · САЙТ, legacy.html).
   - Остаются инструменты поддержки `adminSupportSendReply`, `adminRelinkProvider`, `adminRepairAuthLink`.
2. Пакет 27: inboxRev, f3e4462fe и коммиты 5 · ВХОД.
3. `adminGrantAccess` + `adminSearchUsers`: 8c2a5ce21 + 0f5a2ca89, Ревизор ✅ 3.166. 🟡 на потом:
   - `normalizeAdminAccessInput` стоит раньше проверки прав `actor()`;
   - кольцо синхронизируется только для kind vip, выдача premium обновит его при запуске приложения.

Governance-ID: TG-610BF65F5794

**Порядок изменён координатором** (владелец: «Да, после Ревизора»):
- после 30 минут логов вебхука → `adminGrantAccess` + `adminSearchUsers` отдельной группой (8c2a5ce21, 0f5a2ca89, 1efb79375; Ревизор 3.166 ✅);
- 10 минут логов [ADMIN-PLUS] → сигнал 9 · САЙТ (hosting:admin, knowlywww);
- потом удаления.

Governance-ID: TG-F75A58F43798

- **adminGrantAccess + adminSearchUsers** — 08:48Z, HEAD e55e65a7e, exit 0.
  - adminGrantAccess: -00023-caw → **-00024-feh**.
  - adminSearchUsers: -00021-xid → **-00023-nuz**.
  - contactInboxId в эту выкладку НЕ вошёл (9 · САЙТ ещё пишет).
  - Логи 08:47–08:58Z: grant — 5 записей, search — 6. error 0, warn 0. ✅
- **Решение координатора (разделение)**:
  1. После коммита 9 · САЙТ — `adminGrantAccess` (contactInboxId) + `submitWebsiteContact` (в проде с 22.09; накопление: f5447d10c логи, effa48638 акция). Потом сигнал САЙТУ.
  2. Удаление аккаунта — ТОЛЬКО после вердикта Ревизора по накоплению 13.10→HEAD на пути worker+mine. D189 выкладывается ЦЕЛИКОМ одним пакетом: `accountDeleteWorker` (-00036-jay), `accountDeleteMine` (-00064-qeh), `accountDeleteEnqueue` (-00030-zim, с 01.10), `accountDeleteCredentialStatus` (-00005-nob, с 01.10). Несёт d4fb962fc (promo.resolvedUid).

Governance-ID: TG-F974EAA55560

- **Пакет акции** — 09:13Z, HEAD 38f472d20, exit 0.
  - adminGrantAccess: -00024-feh → **-00025-fov** (contactInboxId).
  - adminSearchUsers: -00023-nuz → **-00024-kex**.
  - submitWebsiteContact: -00052-jel → **-00053-cef**.
  - 10 минут логов → сигнал 9 · САЙТ.
- **D189**: «ДА» владельца (кнопка, 22.10), Ревизор 3.172 ✅.
  - Пять отдельных выкладок по порядку Ревизора: Worker → Mine → CredentialStatus → Enqueue → RetryCron. Стоп при первой ошибке.
  - RetryCron в коде уже `every 120 minutes` (ff4c18772).
  - Откат: Worker -00036-jay, Mine -00064-qeh, CredStatus -00005-nob, Enqueue -00030-zim, RetryCron -00031-bor.
  - После — 15 минут логов [D189-GUEST], [ACCOUNT-DELETE-ENQUEUE], [ACCOUNT-DELETE-JOB], [D189-LADDER-SCRUB].

Governance-ID: TG-F9A463DCBAE5

- **D189** — все пять выложены 10:00Z, по порядку Ревизора. Первая попытка 09:26Z упала на СБОРКЕ: TS7006 в index.ts из e2db2ac4b, починка a4c9b19ff. В прод тогда ничего не ушло.
  - accountDeleteWorker: -00036-jay → **-00037-jaq**.
  - accountDeleteMine: -00064-qeh → **-00065-nuc**.
  - accountDeleteCredentialStatus: -00005-nob → **-00006-fuv**.
  - accountDeleteEnqueue: -00030-zim → **-00031-bux**.
  - accountDeleteRetryCron: -00031-bor → **-00032-fej**, расписание `every 120 minutes` ENABLED.
  - Код удаления между шагами не менялся (git log по account_delete*.ts — пусто).
  - Первые логи 09:36–10:00Z: error 0, warn 0. 15 минут меток D189 идут.

- **mistakePracticeSyncEvents** (bef7c9246, «да» владельца после ✅ Ревизора) — выложена 11:58Z из чистого HEAD 14a853b3a.
  - Ревизия: -00014-fiz → **-00015-lim**. Откат: `gcloud run services update-traffic mistakepracticesyncevents --to-revisions=mistakepracticesyncevents-00014-fiz=100 --region us-central1`.
  - Отсчёт чтений до выкладки (24 ч на 11:53Z): всего 234 494, NOT_FOUND 49 356, LOOKUP 87 682, QUERY 97 456. Повторный замер — 23.10 после 12:00Z.
  - 15 минут логов [MP-SYNC] идут.

- **levelSpinStarGrant** (кошелёк монет 2.0, 6d5835ef8; «Да, после ✅ Ревизора» владельца + ✅ Ревизора) — выложена 12:41Z из чистого HEAD e8d65a831.
  - Ревизия: -00008-zev (02.09) → **-00009-meq**, трафик 100 %.
  - Откат: `gcloud run services update-traffic levelspinstargrant --to-revisions=levelspinstargrant-00008-zev=100 --region us-central1`.
  - Повод: с 20.10 старая версия отбивала 400 начисления 2.0 (поле promotionEligibility). Пакет — coin-grant-server-not-deployed-2026-10-22.md.
  - Смягчение дневного лимита не включалось: в коде его нет, хвост ниже лимита (≤450 за «Дневной путь», 1 200 за жалобы).

- **Удаление 39 функций** («Да, удалить» владельца через координатора) — 13:33–13:34Z, одним пакетом `firebase functions:delete … --force`.
  - 39 из 39 «Successful delete», ошибок 0. Функций в проде было 449, стало 410. Ни одна из 39 не осталась. Расписания лиг больше нет.
  - Охраняемые на месте: levelSpinStarGrant, claimReportReward, vipRevokeMine, adminUpdateGiftCertificateRecipient, adminSupportSendReply, adminRelinkProvider, adminRepairAuthLink, adminSearchUsers, adminReplyToReport, mistakePracticeSyncEvents, revenueCatShardsWebhook.
  - Возврат: исходники 39 функций — `C:\Temp\claude\functions_archive\functions_archive_2026-10-22\<имя>.zip` (39 целых, 1,4 ГБ), плюс git до 8b0689a9c.
  - Журнал ошибок приложений (app_errors) за час ДО удаления: 1 запись, 0 «не найдено». Проверки после — 13:50Z и 14:35Z.
