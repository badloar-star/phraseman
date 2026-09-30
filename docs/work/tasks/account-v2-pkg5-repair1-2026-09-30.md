# Task packet: Account V2 — Пакет 5 (dry-run миграции), ремонт №1 + решения владельца

Governance-ID: TG-509D7AF40102
Status: Done (SPEC+SECURITY APPROVE)
Owner: Claude session (Account V2, /loop)

## Outcome

Закрыть SPEC HOLD ревью Пакета 5 (SECURITY APPROVE) и внести решения владельца 6–9 из статуса.

P1:
- id страниц карточек сверять с `${target}_${String(position).padStart(4,'0')}` (как `flashcardPageDocId` в `app/flashcards_cloud_pages.ts`), фикстуры поправить;
- `clientSequence` считать внутри сущности (номер куска + 1); в operationId добавить хэш содержимого; тест «снимок → новая карточка → повтор: старые операции duplicate, новая — новая»;
- правило `passed ≥ 3` противоречит D121: уже открытые уроки не закрываются.

P2:
- `identityHidden:true` и `anon_merge_claim` → HOLD всего аккаунта (тесты);
- в контракт отчёта: исполнитель переноса не применяет пакеты при статусе ≠ ready;
- разделить блокирующие HOLD и информационные `no_v2_domain`;
- примечание о правах Plus: intro/loyalty/had_premium_ever лежат в users/{uid}.progress.

P3: D54 → D90; маскировка ключей в отчёте; разбор ключей прогресса одной функцией `parseProgressKey`.

Решения владельца:
- руны и звёзды → монеты (D03). Курс не утверждён: dry-run считает суммы и кладёт их в `pendingOwnerRate`, операции начисления НЕ строит, статус аккаунта при ненулевой сумме — `needs_owner_rate` (блокирующий, но не ошибка);
- заморозка серии → только Plus: купленные заморозки не переносятся (drop со ссылкой на решение 7);
- серия/активные дни, экзамены/сертификаты, достижения/статистика → carry. Если в V2 нет домена — классифицировать как `carry_pending_domain` (информационный, с точным путём поля), без выдумывания новой схемы;
- память SRS → carry в сущность карточки (`updatedAtMs` из старой записи; нет времени → запись в HOLD).

## Scope

In scope: functions/src/accounts_v2_migration/*, scripts/accounts-v2-migration-dry-run.mjs, docs/reports/accounts-v2-migration-dry-run.schema.json. Out of scope: ядро applyBatch, клиент, чтение Firestore, деплой, commit.

## Architecture

Таблица инвентаря получает новые судьбы: `carry_pending_domain` и `info` (информационные, не блокируют), `pending_owner_rate` (балансы рун/звёзд, суммируются в `pendingOwnerRate`, операций нет). Статус отчёта: `ready | hold | needs_owner_rate`, `applyAllowed` = статус `ready`; `assertMigrationApplyAllowed` — контракт для исполнителя. SRS-память свайпов разбирается отдельным модулем `srs_memory.ts` и вливается полем `srs` в upsert карточки. operationId = хэш(uid, сущность, кусок, содержимое); clientSequence = кусок + 1. Всё — чистые функции, без сети и Firestore.

## Security and privacy

Отчёт по-прежнему без значений полей и без uid; неизвестные ключи маскируются (почта, длинные id, не-ASCII → `<masked>`). Суммы балансов в `pendingOwnerRate` — числа, не персональные данные. Сторож no_network расширен на новый модуль.

## Technical debt

Accept temporarily: курс рун/звёзд → монеты не утверждён (needs_owner_rate); домены серии/экзаменов/достижений/доступа к урокам в Account V2 не созданы (carry_pending_domain); поля личности и технические маркеры остаются блокирующим HOLD до решения.

## Verification

RED→GREEN; functions `src/accounts_v2_`; строгая проверка типов; eslint; повторное ревью SPEC+SECURITY.

## Rollback

Копия `.tmp_pkg5_backup1/`.

## Доработка после ревью (SPEC APPROVE + 2×P2, SECURITY APPROVE)

- P2-а: `passed = score>=3 || (score>=2 && следующий урок уже в unlocked_lessons)` — перенос не открывает уроки, которые не были открыты (D121 в обе стороны); тест.
- P2-б: в контракт исполнителя: `ready` ≠ полный перенос; старый `users/{uid}` не трогать, пока `informational.carry_pending_domain > 0` (поле-счётчик в отчёте + схема + assert-помощник).
- Решения 10–12 (статус): руны 1:1 → строить операции начисления монет (если в V2 есть домен монет; иначе carry_pending_domain с суммой); звёзды → drop; поля входа → drop (не HOLD).
