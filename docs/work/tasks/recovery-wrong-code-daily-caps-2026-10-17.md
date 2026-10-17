# Task packet: дневные потолки неверных кодов восстановления (security-review Ревизора 454976a16, пакет R111)

Governance-ID: TG-27F0FB4B8E13
Status: В работе (координатор 17.10 ~21:45; выкладка — утром по «да» владельца в пакете R111)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Подбор 6-значного кода восстановления упирается в потолок: не больше 10 неверных кодов за 24 ч на цель (кого
восстанавливают) и не больше 10 за 24 ч на вызывающего (uid, общий для обычного и «чистого» пути). Честный ввод
проходит. Ответ при превышении — человеческий текст на клиенте («Слишком много попыток…»), без кодов.

## Разбор (Ревизор, docs/work/tasks/revizor-2026-10-15.md, 454976a16)

1. 🔴 Новый код обнуляет попытки: 3 письма/ч × 5 попыток = 15 угадываний в час на цель.
2. 🔴 Лимит вызывающего ограничивает письма, а не неверные коды: N Google-аккаунтов → ≈50·N угадываний в час.
3. 🟡 IP берётся из первого адреса x-forwarded-for (подделывается клиентом).
4. 🟡 Немой catch `candidateUser = null` в requestCleanInstallRecoveryCodeCore.

## Scope

functions/src/auth_recovery.ts:
- `assertWrongCodeBudget` (до транзакции подтверждения) + `recordWrongCode` (после исхода `invalid`): документы
  `auth_recovery_rate_limits/wrong_target_<sha256>` и `wrong_caller_<sha256>` {count, windowStartMs}, окно 24 ч; 2 чтения
  на подтверждение, без новых коллекций и правил. Отказ: resource-exhausted `recovery_daily_attempts_limited` (клиент
  мапит в errorRateLimited, components/auth_recovery_modal_model.ts:345).
- authConfirmRecoveryCode: цель = stableId. authConfirmCleanInstallRecoveryCode: цель = challenge.targetStableId
  (1 предварительное чтение вызова), иначе ключ вызова.
- Логи [RECOVERY-LIMIT]: значения счётчиков, ветка, отказ (без uid/stableId).
- П.4: причина в журнале (только код ошибки Admin Auth, без e-mail).
- П.3 (IP): НЕ меняю вслепую — правый адрес x-forwarded-for может оказаться адресом балансировщика, и тогда лимит
  станет общим на всех. Пишу в [RECOVERY-LIMIT] число адресов в цепочке (без самих адресов) — решение по фактам.
Тесты: подбор упирается в потолок (цель и вызывающий), честный код проходит, окно сбрасывается через 24 ч.

## Architecture

Счётчики вне основной транзакции (как лимит вызывающего): фазы и откаты подтверждения не сдвигаются; гонка даёт ≤ +1.
Проверка до транзакции — чтобы потолок закрывал и попытки с верным кодом после исчерпания (иначе подбор с перебором
продолжался бы до попадания).

## Security and privacy

Хэши вместо uid/stableId; в логах — только счётчики, ветка, длина цепочки x-forwarded-for.

## Technical debt

IP-лимит — после логов прода (п. 3).

## Verification

functions jest (--runInBand, через слот) по auth_recovery.test.ts + app_check_sealed.test.ts; tsc functions.

## Rollback

Обратный собственный патч; прод не меняется до выкладки R111.
