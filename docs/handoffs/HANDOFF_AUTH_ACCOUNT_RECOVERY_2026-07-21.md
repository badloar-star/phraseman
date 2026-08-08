# HANDOFF: Восстановление доступа к аккаунту (auth recovery) — передача в Codex

Дата: 2026-07-21. Подготовлено в сессии Kimi. Статус: **Этапы 1, 2 и серверная часть Этапа 3 ГОТОВЫ и проверены. Остались: клиентский UI восстановления, админ-UI блок, деплой.**

> С чего начать: прочитай `AGENTS.md` (обязателен целиком), потом этот файл, потом исходники из раздела 5 по мере надобности. Ничего не откатывай и не «чисти» чужие незакоммиченные изменения (список в разделе 10). Не деплой без явного подтверждения владельца.

---

## 1. Инцидент и цель

Продакшн-инцидент: юзер **Yuraus** (stable_id `ae9fee12-34e8-46c8-8c17-d88e27268a5e`, uskovavalya52@gmail.com, 657 535 XP, 51 день стрика, уровень B1) на v1.5.63 после переустановки не мог войти через Google: `local_stable_link_failed` / `remote_stable_link_failed` / `auth_link_failed`. То же на iOS. Отзыв 1★ в Play. Суть класса проблем: после переустановки/смены устройства/выбора «не того» Google-аккаунта юзер теряет доступ к прогрессу и не понимает, что делать.

**Цель владельца (дословно по смыслу):**
- юзеры НИКОГДА больше не должны встречаться с такими проблемами;
- всё восстановление — АВТОМАТИЧЕСКИ, без ручных действий владельца (никаких «кодов из поддержки», которые владелец выдаёт руками);
- для юзера всё выглядит естественно: никаких тостов/баннеров «прогресс восстановлен» — прогресс просто на месте в момент входа.

## 2. Продуктовые решения (утверждены владельцем 2026-07-21, не пересматривать без него)

1. **Жёсткая обязательная регистрация ОТКЛОНЕНА** — не решает проблему (link-фейлы возможны и у зарегистрированных) и ухудшает онбординг.
2. **Вариант Б «Отложенная привязка» (deferred link) — принят и сделан (Э2):** при транзиентном фейле серверного link после успешного Google-входа юзер НЕ видит ошибку; намерение пишется в локальный журнал, фоновый воркер дожимает привязку и молча подтягивает облако. До подтверждения сервера — никакого свапа stable_id.
3. **Вариант В «Подсказка, каким аккаунтом входить» — принят и сделан (Э2):** сервер отдаёт замаскированный email привязки (`usk***@gmail.com`) по локальному stable_id; модалка показывает «Войди через Google-аккаунт usk***@gmail.com».
4. **Код восстановления по email — принят, сервер готов (Э3):** код — это ДОКАЗАТЕЛЬСТВО владения почтой привязки, единственный способ безопасно перепривязать аккаунт, когда юзер не может войти «правильным» провайдером. UX-матрица входа в recovery:
   - привязка Google/Gmail → primary: инструкция «добавь этот Google-аккаунт на устройство и войди снова»; код — fallback-ссылка;
   - привязка Apple / не-Gmail → код — primary путь.
5. **Защита `stable_id_mismatch` («не тот аккаунт») НЕ трогается** — это защита от показа чужого прогресса. Recovery — осознанный обход через доказательство email.
6. **После успешного recovery — тишина:** никаких «восстановлено» уведомлений.
7. **Откат:** перепривязка по коду фиксируется в `auth_recovery_events` с прежними uid и окном отката 14 дней; админу уходит авто-алерт в Telegram (смотреть, не действовать).
8. **Путь «мёртвая почта» (не построен, задача 5):** самообслуживание при неактивности старого провайдера ≥30 дней + сверка локальных данных с облачными + авто-алерт админу + окно отката 14 дней; конфликт → авто-репорт.
9. **«Привязать запасной способ входа» в настройках (не построено, задача 6):** модель `auth_links` уже допускает несколько provider uid на один stable_id.

---

## 3. Что уже сделано и проверено (НЕ переделывать)

### Этап 1 — хотфикс надёжности входа (root, 134 теста зелёные в 7 сьютах)

- `app/auth_provider.ts`:
  - `AUTH_LINK_HINT_TIMEOUT_MS` 1500 → **5000** (комментарий обновлён).
  - Новые константы `AUTH_LINK_TRANSIENT_FAILURES` (классы identity/transport/app_check) и `AUTH_LINK_RETRY_BACKOFF_MS = [700, 1500]`.
  - `ensureStableAuthLinkWithRetry` — реальный цикл ретраев (mismatch НЕ ретраится — это защита).
  - Оба `captureAuthSignInFailure(..., 'auth_link', ...)` получили failure-класс в detail: шаблон `` `remote_stable_link_failed:${linkedRemote.failure ?? 'unknown'}` `` (и `local_...` аналогично).
  - Плавающий `logAppError` получил `.catch(() => {})` (закрыт uncaught «(in promise)» поверх ошибки входа).
- `app/cloud_sync.ts`: `waitForFirebaseAuthUid` 4×350мс → **80×250мс (20 с)** с комментарием про инцидент 2026-07-21.
- `components/RegistrationPromptModal.tsx`: состояние `retryProvider` (set в cancelled/error ветках, null при mismatch и Apple-service-id) + кнопка «Повторить» после errorNote (bg `t.accent`, текст `t.correctText` — UI contrast rule, triLang во всех 8 локалях).
- `tests/auth_provider_stable_link.test.ts`: ожидания обновлены (5000 мс, новый шаблон failure-класса).

### Этап 2 — тихий deferred link + recovery hint (root + functions, зелёное)

- **Новый `app/pending_auth_link.ts`** — журнал `pending_auth_link_v1` (AsyncStorage): record/read/clear/process + route-shim.
- `app/auth_provider.ts`: `SignInResult` + вариант **`'linked_pending'`**; defer-ветка при транзиентном фейле локального link (journal + `logAuthEvent('auth_signin_deferred_pending')` + `emitAuthProviderLinked()` + return `linked_pending`); `void clearPendingAuthLink()` перед секцией 4; очистка журнала в `signOutAndWipeForAccountSwitch` и в `completePreparedAccountDeleteLocalExit`.
- `app/_layout.tsx`: импорты `restoreFromCloudDetailed` + `processPendingAuthLink`; `restoreCloudForBoot` фоново дожимает журнал, при `'completed'` молча зовёт `restoreFromCloudDetailed()`.
- **Сервер `functions/src/auth_identity.ts`**: `maskEmailForRecoveryHint` (3 символа + `***@domain`), `buildRecoveryHintFromUserData`, callable **`authRecoveryHint`**. `functions/src/index.ts` — require + `exports.authRecoveryHint` (строки ~44, ~162).
- **Клиент `app/cloud_sync.ts`**: `fetchAuthRecoveryHint` + тип `AuthRecoveryHint` (после `ensureStableAuthLink`). ВНИМАНИЕ: файл со смешанными CRLF/LF — многострочные Edit-замены там могут не матчиться; вставки делать аккуратно (в прошлый раз вставлялось Python-скриптом побайтово).
- **Модалка**: состояние `recoveryHint`, effect на `visible && context === 'startup_recovery'`, строка-подсказка между subtitle и кнопками (accent-цвет, triLang: вариант с маской email и вариант «привязан к Google/Apple»).
- Тесты: root 134 зелёные (7 сьютов, команды в разделе 9); `functions/src/auth_identity_recovery_hint.test.ts` — 7 зелёные.

### Этап 3, сервер — recovery кодом + admin repair + spike-алерт (functions, 76/76 зелёные, `npm run build` чистый)

- **Новый `functions/src/auth_recovery.ts`** — callables `authRequestRecoveryCode` и `authConfirmRecoveryCode` (контракты — раздел 5). Коллекции: `auth_recovery_codes` (salt+sha256 hash, TTL 10 мин, attempts, status active/consumed/send_failed), `auth_recovery_rate_limits` (3 письма/час на stable_id, транзакционное окно по паттерну client_reports), `auth_recovery_events` (перепривязка + previousProviderUids + rollbackUntil +14 дней). Форма записей перепривязки НАМЕРЕННО повторяет `ensureAuthLinkDoc`/`ensureProviderLinkedAuth` из `auth_identity.ts` (auth_links + users.firebaseAuthUid/linkedAuth + leaderboard.firebaseAuthUid) — **если меняется та форма, синхронно менять здесь** (комментарий в шапке файла). Инвариант account_delete_pending соблюдён (uid с незавершённым удалением не перепривязывается). attempts++ вынесен ИЗ транзакции (бросок ошибки откатывает записи tx — это был найденный и починенный баг). Telegram-алерт без PII (маски, хвост uid 8 символов).
- **Новый `functions/src/admin_auth_repair.ts`** — callables `adminRepairAuthLink` (чинит дрифт users ↔ auth_links) и `adminRelinkProvider` (перепривязка по providerEmail или providerUid; email резолвится через `admin.auth().getUserByEmail`). Паттерн `admin_access_controls.ts`: `actor()` с permission, идемпотентность `admin_command_operations`, аудит `createAuditRecord` → `admin_log` (actions `auth_link_repair` / `auth_provider_relink`).
- `functions/src/admin/permissions.ts`: новый permission **`'users.auth_repair'`** в union + ROLE_PERMISSIONS owner и admin (НЕ support).
- `functions/src/admin_email.ts`: `buildHtmlBody` — `unsubscribeUrl` стал опциональным (футер отписки не добавляется транзакционным письмам); новый экспорт **`sendTransactionalEmail({to, subject, text})`** → `{ok, id?, error?}`; при пустом ключе `error: 'resend_key_missing'`.
- `functions/src/admin_alerts.ts`: AlertType + **`'authFailureSpike'`**; конфиг-поля `authFailureWindow`, `authFailureAlertedAt`; экспорты **`isAuthFailureErrorDoc(data)`** (feature==='auth' || context 'auth:signin_failure') и `nextAuthFailureSpikeState`; триггер **`adminAlertOnAuthFailureSpike`** на `app_errors/{id}` (окно 1 ч, порог `cfg.spikePerHour`, cooldown 1 ч, топ-stage в сообщении).
- `functions/src/index.ts`: require auth_recovery (строка ~46), `exports.authRequestRecoveryCode/authConfirmRecoveryCode` (~163-164), re-export `adminRepairAuthLink, adminRelinkProvider` (~381), `exports.adminAlertOnAuthFailureSpike` (~232).
- Тесты (новые файлы): `auth_recovery.test.ts` (13), `admin_auth_repair.test.ts`, `admin_alerts_auth_spike.test.ts`, расширен `admin_email.test.ts` — всё зелёное.

### Статус проверок (команды — раздел 9)

- root: **134/134** в 7 auth-сьютах; functions: **76/76** в 8 сьутах; `cd functions && npm run build` — чисто.
- root `npx tsc --noEmit`: 148 ошибок, ВСЕ пре-существующие в `scripts/` и `tests/` (arena/heisenberg/personal_plan и т.п.), в изменённых файлах — 0. Лог: `.codex-tmp/tsc-root.log`.

### Пре-существующие падения — НЕ чинить без запроса владельца

- `tests/firestore_rules_security.test.ts` — 5 падений (commit 340ca6aaf поменял rules, тест устарел). Существовало ДО этой работы.
- `tests/registration_prompt_responsive_contract.test.ts` — 2 падения и `tests/startup_provider_reauth_recovery.test.ts` — 1 падение: контракты ищут старые строки (`styles.privacy`, `cardContent`, хардкод-строку «Войди тем же способом…»), которых нет ни в HEAD, ни сейчас — модалку рефакторили раньше (triLang + responsive scale), функционал на месте (проверено: ScrollView, legalLinks, Privacy/Terms есть). Стейл-тесты, не регресс.

---

## 4. Что осталось — задачи для Codex (по приоритету)

### Задача 1. Клиент: обёртки вызовов в `app/cloud_sync.ts`

По образцу `fetchAuthRecoveryHint` (тот же файл, рядом): `requestAuthRecoveryCode(stableId)` → `{ok, maskedEmail, expiresInSec, provider}`; `confirmAuthRecoveryCode(stableId, code)` → `{ok, stableId}`. Пробрасывать коды ошибок callable наверх (UI маппит их на triLang-строки). Помни про смешанные CRLF/LF в файле.

### Задача 2. Клиент: вход в recovery из `components/RegistrationPromptModal.tsx`

- Третичная ссылка **«Нет доступа к этому аккаунту?»** — показывать в контексте `startup_recovery` (и после mismatch-ошибки), маленькая, под основными кнопками, с учётом Admin/App UI-контраста и triLang (8 локалей).
- Шаг 1 (по UX-матрице из раздела 2, п.4): Google/Gmail → экран-инструкция «Добавь аккаунт usk***@gmail.com на устройство (Настройки → Аккаунты) и войди снова» + ссылка-fallback «Получить код на почту»; Apple/не-Gmail → сразу шаг кода.
- Шаг 2: кнопка «Отправить код на usk***@gmail.com» → `requestAuthRecoveryCode` → поле ввода 6 цифр (таймер 10 мин из `expiresInSec`, кнопка «Отправить снова» с учётом rate-limit ошибки `recovery_rate_limited`) → `confirmAuthRecoveryCode`.
- Маппинг ошибок на человеческие строки: `recovery_code_invalid` («неверный код, осталось попыток: N» — N не приходит, покажи общее), `recovery_code_expired`, `recovery_code_locked`, `recovery_code_missing`, `recovery_rate_limited`, `recovery_no_email` (скрыть путь кода, показать инструкцию/поддержку), `resend_key_missing` → generic «техническая ошибка, напишите в поддержку».
- **При успехе:** локальный stable_id уже равен целевому (см. сценарий mismatch) → просто повторить обычный путь успешного входа: `emitAuthProviderLinked()` + `restoreFromCloudDetailed()` фоново + закрыть модалку МОЛЧА (п.6 решений). Если локальный stable_id ОТЛИЧАЕТСЯ от возвращённого (свежая переустановка, локальный S2 пустой) — adopt: бэкап локальных ключей по существующему механизму auth_switch_backup (см. `logAuthEvent('auth_switch_backup_restored')`), записать stable_id из ответа, затем restore. Merge прогресса S2+S НЕ делаем (облако S выигрывает, локаль S2 в бэкапе).
- Тесты: расширить/добавить рядом с `tests/registration_prompt_modal_lifecycle.test.tsx` (осторожно: 3 стейл-падения в соседних файлах — пре-существующие, не «чинить» их в рамках этой задачи).

### Задача 3. Админ-UI: блок «Связи входа» на странице профиля пользователя

- Сначала прочитай `docs/design/ADMIN_UI_BIBLE.md` (требование AGENTS.md). Ключевое: палитра фиксирована (primary `#2563EB`, danger `#DC2626`), у каждой кнопки tooltip (что сделает / кого затронет / когда вступит в силу / как проверить), опасные действия — preview → явное подтверждение текстом действия → аудит, состояния loading/empty/error/success.
- Место: `admin/v2/scripts/admin-core.js`, страница профиля (функция ~строка 1950-1972, грид секций 1–7). Диагностику показать в секции «1. Личность и аккаунт» (она уже про «привязку входа»; auth_links уже читает серверный `adminGetUserProfile` → `identity.aliases`/`identityErrors` — переиспользуй), а КНОПКИ — новым блоком по образцу `renderAdminAccessControls` (строки 1983-1987), вставка рядом со строкой 1961.
- Операции по образцу preview/publish (обработчики ~5423-5445, `buildAccessPreview` 1976-1982): «Починить связь» → `adminRepairAuthLink`; «Перепривязать провайдера» → `adminRelinkProvider` (форма: email ИЛИ providerUid + reason обязательна). `requestId`/`idempotencyKey` — генерировать как в существующих операциях; повторный клик безопасен (replayed).
- Вызовы: `admin/v2/scripts/admin-firebase.js` — добавить `httpsCallable(functionsUs, 'adminRepairAuthLink'/'adminRelinkProvider')` + actions-обёртки по образцу grantAccess (строки 118-119, 222-223).
- UI-гейтинг: `can('users.auth_repair')` (admin-core.js ~601-603) — проверь, что клиентский `ADMIN_ROLE_PERMISSIONS` знает новый permission (иначе добавь в JS-карту ролей рядом).
- Факты разведки (проверены): query-параметр `openUser` (admin-core.js:1957) нигде не читается — мёртвый; можно в рамках задачи реализовать авто-открытие профиля по нему (аккуратно, отдельным коммитом) или не трогать.
- Проверка: `npm run hosting:admin` НЕ запускать (деплой — только владелец). Локальная проверка: открыть admin/v2/index.html, прогнать руками сценарии preview/confirm на тестовом юзере; существующие admin-тесты не ломать.

### Задача 4. Решение + сервер: запрос кода БЕЗ локального stable_id (свежая переустановка)

Сейчас `authRequestRecoveryCode` требует `stableId`, а после чистой переустановки локального stable_id старого аккаунта на устройстве НЕТ. Варианты: (а) расширить callable: принимать `{email}` → искать users по `linkedAuth.email` → слать код туда же; ответ ВСЕГДА одинаковый `{ok:true}` (+ maskedEmail только если найден), чтобы не было энумерации аккаунтов; rate-limit дополнительно по auth uid. (б) не делать и закрывать такие кейсы админ-инструментом (владелец против ручных действий). **Рекомендация: (а).** Согласовать с владельцем, потом реализовать + тесты + UI-шаг «введи email привязки» в модалке.

### Задача 5. Путь «мёртвая почта» (30 дней неактивности) — утверждён концептуально

Самообслуживание: если старый provider uid не входил ≥30 дней (`lastSignInAt` в auth_links/users), устройство доказывает владение через сверку локальных данных с облачными (уровень/XP/даты сходятся), сервер перепривязывает текущий uid к stable_id, пишет `auth_recovery_events` (type: 'inactivity_auto'), шлёт Telegram-алерт админу, окно отката 14 дней; при конфликте (старый провайдер вдруг активен) → авто-репорт. Спеку детализировать перед кодом; опираться на `auth_recovery.ts`.

### Задача 6. Настройки: «Привязать запасной способ входа»

Отдельная фича (больший объём): экран в настройках аккаунта, линковка второго провайдера к тому же stable_id (серверная модель допускает), конфликты (второй провайдер уже привязан к другому stable_id) → ошибка. Начинать только после задач 1–3 и деплоя.

### Задача 7. Деплой (ТОЛЬКО с подтверждения владельца)

1. **Проверить продовые параметры:** `functions/.env.phraseman-ea0b3` НЕ содержит `RESEND_API_KEY` (проверено: 0 вхождений; локальный `functions/.env` — содержит). Без него письма кода упадут с `resend_key_missing` (безопасно, но фича мертва). Добавить параметр в прод (Firebase console → Functions configuration, или в `.env.phraseman-ea0b3` перед деплоем). Секрет `ADMIN_ALERT_BOT_TOKEN` — defineSecret, в .env-файлах не живёт; алерты в проде уже работают → скорее всего задан, но проверить `firebase functions:secrets:access` не нужно — достаточно, что приходят существующие алерты.
2. `cd functions && npm run build && firebase deploy --only functions:authRecoveryHint,functions:authRequestRecoveryCode,functions:authConfirmRecoveryCode,functions:adminRepairAuthLink,functions:adminRelinkProvider,functions:adminAlertOnAuthFailureSpike`
3. После деплоя: smoke — из админки вызвать диагностику любого тестового юзера; из приложения (dev) прогнать recovery-flow на тестовом аккаунте.
4. Релиз приложения (EAS) — действие владельца. До релиза клиент без `authRecoveryHint` в проде падает безопасно (null → модалка без подсказки); recovery-UI без задеплоенных callables показывать НЕЛЬЗЯ — гейтовать по remote flag или выпускать вместе с деплоем.

---

## 5. Контракты callables (выписано из кода, сверяй с источником перед использованием)

Все callable — region `us-central1`. Клиент вызывает через `httpsCallable`.

### `authRecoveryHint` (задеплоена НЕТ — см. задачу 7)
- Req: `{ stableId: string }` (auth обязателен). Resp: `{ ok: true, hint: { provider: 'google'|'apple', maskedEmail: string|null } | null }`.

### `authRequestRecoveryCode`
- Req: `{ stableId: string }` (auth обязателен).
- Resp: `{ ok: true, maskedEmail: string, expiresInSec: 600, provider: 'google'|'apple'|null }`.
- Ошибки: `unauthenticated/auth_required`, `invalid-argument/stable_id_required`, `failed-precondition/recovery_no_email`, `resource-exhausted/recovery_rate_limited` (3/час), `failed-precondition/resend_key_missing`, `internal/recovery_email_failed`.
- Письмо уходит ТОЛЬКО на email привязки (из users/{stableId}.linkedAuth.email), RU+EN текст, код 6 цифр, TTL 10 мин.

### `authConfirmRecoveryCode`
- Req: `{ stableId: string, code: string (6 цифр) }` (auth обязателен; `request.auth.uid` — НОВЫЙ provider uid, его и привязываем).
- Resp: `{ ok: true, stableId }`.
- Ошибки: `invalid-argument/code_required|code_format_invalid|stable_id_required`, `failed-precondition/recovery_code_missing|recovery_target_missing|account_delete_pending`, `deadline-exceeded/recovery_code_expired`, `resource-exhausted/recovery_code_locked` (5 попыток), `permission-denied/recovery_code_invalid`.
- Эффекты: auth_links/{uid} → stableId (форма ensureAuthLinkDoc), users/{stableId}.firebaseAuthUid/linkedAuth, leaderboard.firebaseAuthUid, `auth_recovery_events` (previousProviderUids, rollbackUntil +14д, вытеснение чужого stable фиксируется), код → consumed, Telegram-алерт админу (без PII).

### `adminRepairAuthLink` (claims: admin + permission `users.auth_repair`)
- Req: `{ uid, reason, requestId, idempotencyKey }`.
- Resp: результат + `replayed?: true` при повторе с тем же idempotencyKey (mismatch ключа → `already-exists`).
- Ошибки: `permission-denied`, `invalid-argument`, `not-found/user not found`, `failed-precondition/no_provider_link`.
- Аудит: `admin_log`, action `auth_link_repair`, before/after.

### `adminRelinkProvider` (claims: admin + permission `users.auth_repair`)
- Req: `{ uid, providerEmail?, providerUid?, reason, requestId, idempotencyKey }` — ровно один из providerEmail/providerUid; email валидируется и резолвится через Firebase Auth.
- Ошибки: `invalid-argument/exactly_one_provider_identifier_required|provider_email_invalid|provider_uid_invalid`, `not-found/provider_not_found|user not found`, `failed-precondition/account_delete_pending`.
- Аудит: action `auth_provider_relink`, before/after с previousProviderUids.

---

## 6. Ключевые файлы для чтения перед задачами 1–3

- `components/RegistrationPromptModal.tsx` (1056 строк) — контексты, triLang, retryProvider, recoveryHint (Э2 уже там).
- `app/cloud_sync.ts` — `fetchAuthRecoveryHint` (образец обёртки), `restoreFromCloudDetailed`. Смешанные CRLF/LF!
- `app/auth_provider.ts` — `SignInResult` с `'linked_pending'`, mismatch-ветки, `emitAuthProviderLinked`, auth_switch_backup.
- `app/pending_auth_link.ts` — журнал (уже готов).
- `admin/v2/scripts/admin-core.js` — профиль (~1950-1989), `renderAdminAccessControls` (~1983-1987), `buildAccessPreview` (~1976-1982), preview/publish (~5423-5445), `can()` (~601-603).
- `admin/v2/scripts/admin-firebase.js` — httpsCallable + actions (~118-130, 222-223).
- `docs/design/ADMIN_UI_BIBLE.md` — перед задачей 3 обязательно.
- `functions/src/auth_recovery.ts`, `functions/src/admin_auth_repair.ts` — шапки файлов содержат дизайн-комментарии.

## 7. Правила и инварианты (критично, из AGENTS.md)

- **Auth identity invariants:** provider sign-in НЕ использует клиентскую Firestore-транзакцию для users/auth_links (только server callables); `auth_links/{providerUid}` — якорь, существующий provider-linked stableUid побеждает локальный anonymous; `signInWithProvider` проверяет `readAccountDeletePendingAuth` сразу после `signInWithCredential`; account switch — только через `signOutAndWipeForAccountSwitch()`; при правках гонять: `tests/auth_provider_stable_link.test.ts`, `tests/account_delete_flow_contract.test.ts`, `tests/firestore_rules_security.test.ts`, `tests/stable_id.test.ts`, `tests/auth_identity_anon_relink.test.ts`.
- **Тесты — read-only guards:** не переписывать источник/тесты/фикстуры из тестов; дрифты — репортить владельцу; snapshot-update запрещён; временное — только в `.codex-tmp/` и т.п.
- **Не удалять функциональность** без явного запроса; «починить» ≠ «убрать».
- **UI contrast rule:** на lime/accent-заливках — тёмный текст (`t.correctText`), не белый.
- **Admin V2 boundary:** старые admin-файлы — read-only, вся работа в admin/v2.
- **Codex OpenAI API firewall:** никаких трат project/user OpenAI-ключей (кроме TTS по явному запросу с spend guard).
- **Сессионная гигиена:** узкие проверки, не запускать broad-сьюты/глобальные сканы; логи — в `.codex-tmp/`.
- Отчёты владельцу — на русском, простым языком, с секцией «Находки и предложения».

## 8. Открытые вопросы к владельцу (не выдумывать ответы)

1. Подтвердить деплой functions (задача 7) и помочь с `RESEND_API_KEY` в проде, если параметра нет.
2. Задача 4 (код по введённому email) — утвердить вариант (а).
3. Yuraus: ответить в Play Console + компенсация (шарды/премиум-дни) — владелец делал/планирует?
4. Пре-существующие стейл-падения тестов (раздел 3) — актуализировать контракты или удалить? (Решение владельца, отдельной задачей.)

## 9. Быстрые команды

```bash
# root auth-сьюты (134 теста)
npx jest tests/auth_provider_stable_link.test.ts tests/auth_provider_behavior.test.ts tests/startup_cloud_identity_recovery.test.ts tests/account_delete_flow_contract.test.ts tests/stable_id.test.ts tests/auth_identity_anon_relink.test.ts tests/account_delete_quarantine_behavior.test.ts

# functions (76 тестов)
cd functions && npx jest src/auth_recovery.test.ts src/admin_auth_repair.test.ts src/admin_alerts_auth_spike.test.ts src/auth_identity_recovery_hint.test.ts src/auth_identity.test.ts src/admin_access_controls.test.ts src/admin_alerts.test.ts src/admin_email.test.ts --no-coverage

# сборка functions
cd functions && npm run build

# деплой (ТОЛЬКО с подтверждения владельца)
cd functions && firebase deploy --only functions:authRecoveryHint,functions:authRequestRecoveryCode,functions:authConfirmRecoveryCode,functions:adminRepairAuthLink,functions:adminRelinkProvider,functions:adminAlertOnAuthFailureSpike
```

## 10. Чужие незакоммиченные изменения в рабочем дереве — НЕ ТРОГАТЬ

Рабочее дерево грязное от других сессий. НЕ откатывать, НЕ «чинить», НЕ коммитить вместе с этой работой:

- `admin/v2/index.html`, `admin/v2/scripts/admin-capabilities.js`, `admin-core.js`, `admin-router.js` (чужие правки — осторожно при задаче 3: admin-core.js общий! править только свои вставки, чужие hunks сохранить);
- `app/(tabs)/lessons.tsx`, удаления `app/(tabs)/quizzes.tsx`, `app/arena_*`, `app/quiz_daily_limit.ts` (чужой arena/quiz рефактор);
- `app/referrals.tsx`, `app/remote_flags.ts`, `app/roulette_spin_client.ts`, `functions/src/referral*.ts`, `functions/src/admin_referrals.ts` (чужая referral-рулетка);
- `app/cloud_sync.ts` — **48 чужих строк** (монотонный merge уроков, задача #11) — сохранить, править файл только точечно;
- `app/_admin_settings_testers.tsx`, `components/admin_panel/ui.tsx`, `components/league/LeagueLeaderboardRow.tsx`, `constants/theme.ts`, `firebase.json`, `knowly-www/*`, несколько `tests/*`;
- untracked: `HANDOFF_*.md` в корне, `docs/handoffs/`, `content/english-test/`, `functions-english-test/`, `admin/v2/scripts/pages/english-test-analytics.js` и пр.
- `functions/lib/**` — build-артефакты (пересобраны `npm run build`, в репо трекаются — коммитить по практике репо вместе с functions-изменениями).

Мои (этой работы) файлы: `app/auth_provider.ts`, `app/cloud_sync.ts` (частично), `app/_layout.tsx`, `components/RegistrationPromptModal.tsx`, `app/pending_auth_link.ts` (новый), `functions/src/auth_identity.ts`, `functions/src/index.ts`, `functions/src/auth_identity_recovery_hint.test.ts` (новый), `functions/src/auth_recovery.ts` + тест (новые), `functions/src/admin_auth_repair.ts` + тест (новые), `functions/src/admin_alerts_auth_spike.test.ts` (новый), `functions/src/admin/permissions.ts`, `functions/src/admin_email.ts`, `functions/src/admin_alerts.ts`, `tests/auth_provider_stable_link.test.ts`.
