# Task packet: R111 — атомарные потолки неверных кодов, пара «цель+вызывающий», HMAC лимита писем

Governance-ID: TG-81DF3B69BD01
Status: В работе (координатор 17.10 23:13; Ревизор f23e972a6 держит R111 открытым)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

1. Потолок неверных кодов нельзя обойти параллельными вызовами: чтение, проверка и +1 — в той же транзакции, что сверяет код.
2. Злоумышленник не может одним аккаунтом «сжечь» попытки жертвы: потолок на пару «цель + вызывающий» 5, общий на цель 20,
   на вызывающего 10 (все за 24 ч). Закрыть цель целиком — нужно ≥ 4 разных Google-аккаунтов, каждый тратит свой дневной
   потолок. Шанс угадать один 6-значный код ≤ 20/сутки ≈ 0,73 %/год (было бы 0,37 % при 10, но тогда один аккаунт запирал
   жертву на сутки).
3. Документ лимита писем — по HMAC-ключу цели (не по голому stableId), без поля stableId, с expireAt; корзины чистой установки
   тоже с expireAt.

## Scope

functions/src/auth_recovery.ts: wrongCodeLimitRefs / readWrongCodeBudgetTx / writeWrongCodeTx (+ recordWrongCodeAttempt,
isWrongCodeBudgetOpen для тестов); оба пути подтверждения читают потолки внутри своей транзакции (исход daily_limited →
resource-exhausted); предварительное чтение вызова чистой установки снято (минус 1 чтение). Лимит писем: doc
`send_target_<HMAC>`, expireAt. cleanRecoveryRateWrite: expireAt. Тесты на 1–3.

## Architecture

Нет новых транзакций: счётчики (3 чтения) добавлены в существующие транзакции подтверждения до их записей.

## Security and privacy

Только HMAC-ключи и счётчики; поле stableId из лимита писем убрано. Абзац политики — Сайт: «and of the account being
recovered», «deleted within two days» (Ревизор f23e972a6).

## Technical debt

Старые документы лимита писем по голому stableId (если есть в проде) осиротеют; удалит TTL-политика только при наличии
expireAt — у старых его нет. Владельцу в R103: разовая чистка `auth_recovery_rate_limits` без expireAt.

## Verification

functions jest auth_recovery.test.ts + app_check_sealed.test.ts; tsc functions.

## Rollback

Обратный собственный патч; прод не меняется до R111.
