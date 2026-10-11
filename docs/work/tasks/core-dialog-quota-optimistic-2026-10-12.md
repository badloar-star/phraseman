# Task packet: пилюля диалогов «N/30» — мгновенное списание при отправке (E3)

Governance-ID: TG-F42D8A40F054
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10, решение советника, журнал п.62; срок 14.10).

## Outcome
Пилюля «N/30» (бесплатные реплики месяца) менялась только по ответу сервера (`coaching.applyQuota`) — после отправки
человек секунды видел старое число. Теперь: показ = max(0, остатокСервера − ходовВПолёте); при отправке turnId
попадает в набор (повтор того же хода — без изменений); ответ сервера ОДНИМ обновлением пишет остаток и снимает turnId
(цифра не прыгает); исход service/network/rate_limited/paused — turnId снимается (откат), понятное сообщение — уже
существующая панель «Повторить»; quota_exhausted — 0 и снятие. Логи `[DIALOG-QUOTA-OPT]`. Firebase не трогаем.

## Scope
In: `app/dialogue_v2_quota_optimistic.ts` (новый, чистые переходы), `hooks/use_dialogue_v2_session_coaching.ts`
(одно состояние квоты), `app/dialogue_v2_session.tsx` (вызовы на отправке/ответе/отказе), тест-контракт.
Out: сервер, экран лимита, E1/E2 (после R1).

## Architecture
Состояние `{ remaining, pending }` в одном useState; переходы begin/settle/rollback — чистые функции модуля.

## Security and privacy
Без данных; turnId в логе усечён.

## Technical debt
E1/E2 — бэклог Ядра после R1.

## Verification
Тест переходов (повтор хода, ответ одним шагом, откат, max(0)); контракт вызовов в экране; сторожа диалогов.

## Rollback
`git revert`.
