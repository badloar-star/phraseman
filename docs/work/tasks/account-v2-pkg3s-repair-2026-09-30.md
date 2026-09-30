# Task packet: Account V2 — Пакет 3S, ремонт по двум HOLD (SPEC + SECURITY/TS)

Governance-ID: TG-3082EDFEB312
Status: In progress
Owner: Claude session (Account V2)

## Outcome

Закрыть находки независимых ревью серверного ядра синхронизации: потеря варианта карточки, непригодные для Firestore ключи и глубина, непроверенный пакет проходит в applyBatch, хрупкий сторож паритета, мелкие P3. Успех: RED→GREEN на новых тестах, строгий tsc, eslint, повторные ревью SPEC APPROVE и SECURITY/TS APPROVE.

## Scope

In scope только: functions/src/accounts_v2_apply_core.ts, functions/src/accounts_v2_apply_core.test.ts, functions/src/accounts_v2_envelope_parity.test.ts; запись решений в docs/work/tasks.
Out of scope: index.ts, firestore.rules, клиентские файлы modules/account-session-v2/*, эмулятор, deploy, commit.

## Architecture

Решения (владелец разрешил принимать их советом агентов): (1) вариант карточки повышает ревизию поля; (2) хранимые идентификаторы документов — sha256 от канонического [type,id] / operationId, экспортируется `docIdFor`/`opDocIdFor`; несоответствующие id (не well-formed Unicode, управляющие символы, длина) отклоняются в validateBatch; (3) глубина хранимого состояния ≤ 20, имена полей `''` и `__.*__` отклоняются; (4) `applyBatch` принимает только брендированный `ValidatedBatch`; (5) `conflict` и `rejected` — окончательные, подтверждаемые исходы; сервер пока не подключается, клиент нужно обновить ДО подключения callable; сторож паритета сверяет «исходы клиента ⊆ исходов сервера»; (6) SRS: временная политика — SRS и неизвестные поля сохраняются как opaque и живут по общему правилу ревизий/вариантов, специальная ветка `srsPolicy` остаётся как консервативный отказ, помечена TEMP до решения владельца; (7) схемы payload lesson/flashcard/library и запрет удаления из библиотеки фиксируются в комментарии как решение сессии, ожидающее подтверждения.

## Security and privacy

Ключи документов не содержат пользовательских строк; отпечаток и id — хэши. Нет утечки данных в ошибках; усечение path. Новых сборов данных нет.

## Technical debt

Accept temporarily: клиентская поддержка conflict/rejected, TTL и лимит частоты квитанций (адаптер), операция разрешения вариантов, SRS-политика. Каждый пункт записывается в статус с владельцем «эта сессия/владелец».

## Verification

RED до правки, GREEN после; jest по трём файлам (functions, NODE_OPTIONS=--max-old-space-size=8192, только текст итога); strict tsc по трём файлам; eslint --max-warnings 0; grep firebase-admin / index.ts; trailing whitespace; повторные независимые ревью.

## Rollback

Копия файлов до ремонта в `.tmp_3s_backup/`; файлы не подключены к index.ts.
