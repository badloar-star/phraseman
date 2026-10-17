# Task packet: ключи лимитов восстановления — HMAC вместо голого sha256, expireAt (до выкладки R111)

Governance-ID: TG-75E8628AACBD
Governance-ID: TG-81DF3B69BD01
Status: В работе (координатор 17.10 ~22:15, от Сайта — для политики приватности)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Документы `auth_recovery_rate_limits` (лимит вызывающего: uid/IP; потолок неверных кодов: цель/вызывающий) больше не
хранят обратимые ключи: sha256(IP) без секрета перебирается за минуты (~4 млрд IPv4). Теперь ключ — HMAC-SHA256 с
УЖЕ существующим секретом восстановления `AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT` (новый секрет не заводим — правило
владельца). У каждого документа поле `expireAt` (конец окна); просроченное при чтении = 0, независимо от TTL-политики.

## Scope

functions/src/auth_recovery.ts:
- `recoveryRateKey(kind, value)` = HMAC-SHA256(current secret, `kind|value`), 32 hex; используется в
  consumeRecoveryCallerRate (caller_uid_, caller_ip_) и assertWrongCodeBudget (wrong_target_, wrong_caller_).
- REQUEST_RECOVERY_CALLABLE_OPTIONS и CONFIRM_RECOVERY_CALLABLE_OPTIONS получают в `secrets` существующий
  AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT (чистая установка его уже имеет).
- Поле `expireAt` (Date = начало окна + окно) при записи; при чтении `expireAt <= now` → счётчик 0.
- Логи [RECOVERY-LIMIT]: при недоступном секрете — `rate_key_unavailable` и отказ «восстановление недоступно» (как у
  чистой установки при битом ключнике), без хранения голых хэшей.
Тесты: ключ IP ≠ голый sha256 и ≠ IP; просроченный по expireAt счётчик не блокирует; options содержат секрет.

## Architecture

Ротация секрета (current → previous) сбрасывает счётчики — допустимо: окна 1 ч / 24 ч. TTL-политика коллекции по полю
expireAt — настройка прода, идёт владельцу утром в R103; код от неё не зависит.

## Security and privacy

В базе только HMAC-ключи (необратимы без секрета) + счётчики и время окна; документы сами истекают (expireAt) и
удаляются TTL-политикой после её включения. Абзац политики — у Сайта.

## Technical debt

Включение TTL-политики Firestore на auth_recovery_rate_limits по полю expireAt — R103, владелец.

## Verification

functions jest auth_recovery.test.ts + app_check_sealed.test.ts (--runInBand, слот), tsc functions.

## Rollback

Обратный собственный патч; прод не меняется до R111.
