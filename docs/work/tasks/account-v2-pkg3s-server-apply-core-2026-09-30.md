# Task packet: Account V2 — Пакет 3S: чистое серверное ядро применения синхронизации

Governance-ID: TG-6E3BF5EF5FFD
Status: In progress
Owner: Claude session (Account V2, handover Codex 2026-09-29; следующий шаг после SOURCE APPROVE WAL-пакета)
Related epic/enabler: Account System V2, Пакет 3 (sync adapters, server contracts)

## Outcome

В functions/ появляется чистое (без firebase-admin, без onCall, без записей в index.ts) серверное ядро проверки и применения пакетов синхронизации аккаунта V2: идентификация вызывающего только из auth, строгая валидация схемы v1 и лимитов, применение пакета через порт транзакции с квитанциями, идемпотентность, оптимистичная ревизия, слияние по доменам (уроки по D66, карточки, членство в библиотеке), SRS-поля сохраняются как есть. Успех: RED→GREEN на новых тестах, паритет схемы с клиентским `modules/account-session-v2/account_sync.ts`, строгий tsc и eslint, независимые ревью спецификации и безопасности.

## Scope

In scope: новые файлы `functions/src/accounts_v2_apply_core.ts`, `functions/src/accounts_v2_apply_core.test.ts`, `functions/src/accounts_v2_envelope_parity.test.ts`; запись результата в docs/work/tasks.
Out of scope: `functions/src/index.ts` (экспорт запрещён), `firestore.rules`, эмулятор, устройство, deploy, commit, чужие изменения, подписки/оплата, экономика (жемчуг/XP удалены без компенсации).

## Architecture

Клиентская сторона (`account_sync.ts`, outbox, runner) принята и ничего не знает про сервер. Ядро — чистые функции: `resolveCallerUid`, `validateBatch`, `applyBatch(port, uid, batch, nowMs)`. Порт `AccountsV2TxPort` (getOp/getEntity/putEntity/putReceipt) вызывается внутри одной транзакции; в тестах — in-memory. D66: сервер хранит результат урока, но не пересчитывает pass/score и не откатывает; SRS-изменение → отказ `srs_policy_hold` (решение по SRS за владельцем); членство в библиотеке не выводит право/покупку. Неподключённое к index.ts ядро не создаёт функций при деплое.

## Security and privacy

UID берётся только из auth; UID из payload не даёт полномочий (mismatch → отказ). Нет чтений/записей чужих UID. Лимиты размеров/глубины/узлов защищают от DoS. Персональные данные в ядро не логируются. App Check не используется (запломбирован). Privacy policy: новые сборы данных не добавляются (ядро не подключено).

## Technical debt

Contain: политика SRS — явный HOLD с кодом отказа; паритет-сторож ловит расхождение схем. Accept temporarily: реальный Firestore-адаптер порта и callable — следующий шаг (Пакет 3), владелец задачи — эта сессия.

## Verification

RED (падающие тесты до реализации) → GREEN; `npx jest` в functions с NODE_OPTIONS=--max-old-space-size=8192 по трём файлам, только текст итога; strict tsc по трём файлам; eslint `--max-warnings 0`; grep, что в ядре нет firebase-admin и в index.ts нет экспорта; независимое ревью спецификации и ревью TS/безопасности.

## Rollback

Три новых файла не подключены нигде — откат удалением этих файлов. Резервных копий не нужно.
