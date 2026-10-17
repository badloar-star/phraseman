# Task packet: восстановление аккаунта по коду без App Check (код готовится, в прод НЕ выкладывается)

Governance-ID: TG-E06CDC8C09E3
Status: В работе (координатор 17.10 ~20:40, находка Ревизора ec28dd324 §10; деплой — утром словом владельца)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Восстановление по коду снова работает: 5 вызываемых функций auth*Recovery* больше не отказывают `app_check_required`
(клиентский App Check удалён 01.10, пломба 2026-08-17 — request.app всегда пуст). Защита от перебора сохраняется и
усиливается лимитом на вызывающего, как в authRecoveryHint (auth_identity.ts ~2448).

## Разбор

- functions/src/auth_recovery.ts: requireRecoverySession (:133) и requireCustomRecoverySession (:1677) бросают
  `app_check_required`, если `request.app` пуст → authRequestRecoveryCode, authConfirmRecoveryCode,
  authRequestCleanInstallRecoveryCode, authConfirmCleanInstallRecoveryCode, authIssueRecoveryHandoffToken,
  authCompleteRecoveryHandoff мертвы.
- Существующая защита (остаётся): вход только сессией Google/Apple (sign_in_provider), письмо ≤3/час на stableId,
  ≤3/час чистой установки, код блокируется после 5 неверных попыток, handoff — по custom-токену с claims события.
- Клиент (app/auth_recovery_secondary.ts) зовёт функции без условий App Check — правка клиента не нужна.

## Scope

functions/src/auth_recovery.ts:
1. Снять проверку `request.app` в двух помощниках сессии (пломба App Check владельца).
2. `consumeRecoveryCallerRate` — окно 1 ч: ≤ 10 вызовов на uid вызывающего и ≤ 30 на IP; ставится в authRequestRecoveryCode ПЕРЕД отправкой письма (чистая установка уже имеет корзины requester/email/pair)
   (документы `caller_uid_<sha256>` / `caller_ip_<sha256>` в уже закрытой правилами коллекции auth_recovery_rate_limits —
   новой коллекции и правок firestore.rules нет). Превышение → resource-exhausted `recovery_caller_rate_limited`.
3. Логи [AUTH-RECOVERY] на каждом решении лимита (без uid/IP в открытом виде).
Тест в functions/src/auth_recovery.test.ts (или отдельный): нет проверки app_check_required; лимит uid/IP.

## Architecture

Лимит вызывается сразу после проверки сессии в 5 функциях с сессией провайдера; authCompleteRecoveryHandoff (custom-токен
с claims события) лимитом не обвешиваем — его нельзя вызвать без только что выданного токена.

## Security and privacy

App Check защищал от скриптового перебора; замена — обязательный вход провайдера + лимиты на uid/IP + прежние лимиты на
stableId и попытки кода. Хэши вместо uid/IP. Ревизору — security-review до деплоя.

## Technical debt

Деплой функций — только словом владельца (адресный, 6 функций).

## Verification

Тесты functions (jest с --maxWorkers=1 через слот). Типы functions по файлу.

## Rollback

Обратный собственный патч; прод не меняется до деплоя.

## Итог 17.10 21:01 — 40ad95e86 (в прод НЕ выкладывалось)

Тесты auth_recovery + app_check_sealed 140/140 (2 прежних «требует App Check» перевёрнуты, +4 теста лимита), типы
functions 0 ошибок. Лимит без транзакции (гонка даёт максимум +1, фазы основной транзакции не сдвигаются).
Деплой (утром словом владельца, адресно): authRequestRecoveryCode, authConfirmRecoveryCode,
authRequestCleanInstallRecoveryCode, authConfirmCleanInstallRecoveryCode, authIssueRecoveryHandoffToken,
authCompleteRecoveryHandoff. firestore.rules не менялись. Ревизору на security-review — сообщение не доставлено (разные
режимы разрешений сессий). Вопросы ему: (а) нужен ли лимит вызывающего и на confirm; (б) при срабатывании лимита после
создания кода код остаётся active без письма.
