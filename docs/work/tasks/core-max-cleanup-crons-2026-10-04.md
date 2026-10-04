# Task packet: вычистить MAX из кронов истечения и напоминания (решение владельца 04.10: «МАКС ВЫЧИСТИТЬ»)

Governance-ID: TG-EC3BA0E3104A
Status: Done
Owner: 1 · Ядро; прямое решение владельца в чате 04.10 на вопрос о 10 красных тестах MAX в кронах

## Outcome
MAX уже выведен из доступа (`premium_status.ts`: MAX_TIER_PLANS = [], «MAX receipts no longer grant any access»).
В кронах остались мёртвые ветки и тесты, требующие отменённого поведения:
- `premium_expiry_reminder.ts`: тип `subscriptionPlan: 'plus' | 'max'` → только 'plus'; удалены MAX_SUBSCRIPTION_COPY
  (8 языков «Твой MAX скоро продлится») и ветка выбора; комментарий «including MAX» исправлен.
- Тесты: 10 красных проверок MAX («MAX monthly follows…», «MAX monthly reminder names MAX» ×8, «MAX monthly … →
  subscription») заменены одной проверкой на файл: план `max_monthly` доступа не даёт → крон его не обрабатывает,
  напоминание не строится.

## Scope
functions/src/premium_expiry_reminder.ts, premium_expiry_reminder.test.ts, premium_expiry_cron.test.ts.
НЕ входит (отдельный вопрос владельцу): общие функции MAX в premium_status.ts (isMaxTierActive, resolveIsMaxTier) —
их импортирует законсервированный код звонков max_voice_* (161 файл, CLAUDE.md: «код не удалён намеренно»).

## Architecture
Удаление мёртвой ветки; поведение для живых планов (monthly/yearly/annual/lifetime, VIP) не меняется.

## Security and privacy
Не затрагивается.

## Technical debt
Полная чистка раздела MAX (клиент + functions-max + premium_status) — по отдельному слову владельца.

## Verification
Тесты обоих кронов зелёные целиком; tsc functions.

## Rollback
Откат коммита.
