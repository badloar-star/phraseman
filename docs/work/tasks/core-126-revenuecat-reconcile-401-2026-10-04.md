# Task packet: §126 п.1 — revenueCatPremiumReconcileMine отвечает 401 (только чтение и подготовка)

Governance-ID: TG-94EA8E61CB15
Governance-ID: TG-94EA8E61CB15
Governance-ID: TG-94EA8E61CB15
Status: Diagnosis (read-only) — включение после «да» владельца, выкладку делает координатор
Owner: Ядро

## Outcome
Подтвердить причину 401 у восстановления Plus, проверить совместимость кода в HEAD с клиентом, найти другие вызываемые функции с той же дырой, подготовить список пострадавших (оплата есть, Plus нет) без записи и готовый план включения.

## Scope
Только чтение: IAM-политики Cloud Run, журналы запросов, Firestore (revenuecat_premium_lineages, users — маской полей). Скрипт сканирования — во временной папке сессии, не в репозитории. Код не меняется.

## Architecture
Вызываемые функции (onCall v2) — сервисы Cloud Run; без `allUsers → roles/run.invoker` запрос отбивается на входе до кода (проверка авторизации делается в самой функции).

## Security and privacy
Публичный invoker — штатная схема для callable: доступ проверяет функция (request.auth). Список пострадавших содержит uid и имя — только во временной папке, в отчёт идут числа; ничего не пишется в прод и наружу.

## Technical debt
В функции два немых catch (`catch {` и `.catch(() => undefined)`) — лечить логами вместе с именованной выкладкой (отдельная правка после «да»).

## Verification
get-iam-policy до/после; журналы 401/200 до/после; повторный скан пострадавших.

## Rollback
Включение = добавление привязки IAM; откат = её снятие (`remove-iam-policy-binding`).

## §126 п.2: explainMistake 503 — сперва логи (Ядро, 04.10)
Governance-ID: TG-94EA8E61CB15
- Факт (журнал Cloud Run с 01.10): 200 — 750, 503 — 205 (~21%), 429 — 9. Валидатор отклонил вывод 315 раз, свежих генераций 97; провайдер не падал (0 «provider fetch failed»). Значит 503 = исчерпаны 3 попытки валидатора. Причину отказа лог не печатал.
- Правка: onValidationReject получает второй (необязательный) аргумент — код причины; лог валидатора печатает причину, язык интерфейса, длину и начало ответа (80 знаков). Поведение не меняется.
- Дальше: владелец/координатор выкладывает функцию → по логам видно, какое правило режет → чиним правило или промпт.

## §126 п.1: 14 админских функций и функций Джарвиса без invoker — проверка доступа по коду (Ядро, 04.10, только чтение)
Governance-ID: TG-94EA8E61CB15
Вопрос: можно ли открыть им `allUsers → roles/run.invoker`, т. е. проверяет ли САМА функция admin-claim из request.auth (а не просто «вошёл»), и не трогает ли MAX.

**Безопасно открыть (13):** первая проверка в каждой — custom claim `admin: true` + роль/право через `request.auth.token`; без claim — `permission-denied` до любого чтения данных.
- `adminActivateTelegramPremiumOrder`, `adminInspectTelegramPromoCode` — `requireMoneyAdmin`: claim `admin` + право `money.manual_access.write`. (У Activate разбор входа стоит на строку раньше проверки — это только валидация формы, к базе не ходит.)
- `adminGetAlertDiagnostics` — `token.admin !== true` → отказ; дальше только `.count()`.
- `adminGetV2OwnerGeneratorWorkspace`, `adminPrepareV2OwnerEpisodeDraft` — `requireV2ConfiguredRootOwnerV1`: claim владельца + sha256 uid совпадает с настроенным владельцем (строже allowlist).
- `adminListShardRefunds` — `hasVerifiedCallablePermission(auth, 'money.read')` (uid + claim + право).
- `adminRepairPendingReferralPurchase`, `adminResumePendingReferralPurchaseRepair` — `assertAdminReferralRepairAccess`: только роль `owner` + `money.manual_access.write`.
- `jarvisGetBusinessTier` (права чтения), `jarvisRunBusinessTierBackfill` (только owner/admin), `jarvisGetGrowthSnapshot`, `jarvisGetQualitySnapshot`, `jarvisGetMoneySnapshot` — claim `admin` + валидный `adminRole` + конкретное право.
- `requireAdminAppCheck` в части из них — пустышка (`ENFORCE_APP_CHECK_ADMIN = false`, пломба App Check), на открытие не влияет.
- MAX: ни одна не включает и не вызывает MAX. `jarvisGetMoneySnapshot` только ЧИТАЕТ историю `voice_minute_events` (деньги за прошлые минуты) — ничего не тратит.

**Не открывать (1):** `adminGetMaxVoiceOpsDashboard` — раздел MAX запломбирован (CLAUDE.md, 04.09); включение — только по прямой команде владельца.

Итог: открытие invoker этим 13 не расширяет доступ — посторонний получит тот же `permission-denied`, только уже от кода, а не от Cloud Run. Выполнение — после «да» владельца (координатор).
