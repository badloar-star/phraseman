# Task packet: Account Authority 2.0 — этап S3: сервер — удаление, правила, TTL

Governance-ID: TG-82054C0456F4
Status: Planned
Owner: Claude session (Account Authority 2.0)

## Outcome
По плану (docs/superpowers/plans/2026-10-01-account-authority-2-0.md, строка S3):
1. **Firebase-порты удаления** для шва `AccountDeleteStateStorePort` (S2a, `functions/src/account_authority/delete_contract.ts`, `firebase_lease_callable.ts` → `overrides.deleteStateStore`): состояние удаления аккаунта AA в Firestore (одна транзакция с подготовкой удаления; `beginBoundAccountDeletion` уже готов).
2. **Задача purge** — ограниченная (батчи, лимит документов за проход), идемпотентная (курсор/квитанция), возобновляемая; удаляет все документы коллекций `account_authority_*` этого аккаунта (принципалы по хешу uid, аренда, квитанции, отметки сессий, привязки, индекс токенов, счётчик квоты) и освобождает личность провайдера (release provider identity, по контракту delete_contract).
3. **Legacy-удаление** (`deleteAccountAndWipe` / `account_delete*.ts` в functions/src) — добавить коллекции `account_authority_*` в очистку (иначе после удаления по старому пути остаются принципалы/аренда/привязки — найдено security-ревью S2a: raw/hashed uid не стирались).
4. **Явные deny-правила** в `firestore.rules` для всех коллекций `account_authority_*` (клиент не читает и не пишет; только Admin SDK). ВНИМАНИЕ: в firestore.rules есть ЧУЖИЕ незакоммиченные правки — трогать только свои строки, коммит частями.
5. **TTL**: поле `expireAt` (уже пишется S2a, у принципала НЕТ — решение §AA-9 (2)) — описать политики TTL (Firestore TTL на `expireAt` для коллекций аренды/привязок/квоты/отметок/индекса/retired_sessions) в репозитории (firestore.indexes.json fieldOverrides ttl или документ развёртывания — что принято в проекте) — САМО включение TTL в проде = развёртывание, только по команде координатора.
6. **Джарвис**: если какой-то департамент читает эти коллекции — обновить контракт (`functions/src/jarvis/jarvis_data_contract_guard.test.ts`); иначе явно записать «не читает».
7. Функции по-прежнему НЕ экспортируются из `functions/src/index.ts`, `rolloutEnabled:false`.

## Scope
`functions/src/account_authority/*`, legacy-удаление аккаунта в `functions/src/account_delete*` (только добавление коллекций AA), `firestore.rules` (только свои правила), конфиг TTL, тесты (юнит + Firestore-эмулятор, если доступен без перегрузки машины — иначе юнит на фейковом Firestore и пометка «эмулятор — S8»).

## Architecture
Сервер — единственный, кто пишет коллекции AA; удаление: подготовка (одна транзакция) → асинхронный ограниченный purge → освобождение провайдера; legacy-удаление тоже чистит AA.

## Security and privacy
Security-ревью обязательно. Удаление полное (все коллекции AA по аккаунту/хешу uid), идемпотентное; правила deny-all для клиента; TTL как страховка. Политика конфиденциальности (S10): срок хранения 90 дн. и удаление вместе с аккаунтом — проверить формулировку.

## Technical debt
Включение TTL и выкладка — по команде координатора (развёртывание). Эмулятор Firestore — S8, если сейчас машина перегружена.

## Verification
Тесты: purge удаляет все коллекции AA аккаунта и не трогает чужие; повтор purge идемпотентен; обрыв посреди — возобновление с курсора; legacy-удаление чистит AA; правила: клиент не читает/не пишет `account_authority_*` (тест правил на эмуляторе или существующий раннер правил проекта); мутации; тайпчек функций (только если нет идущего полного — правило нагрузки); security-ревью до APPROVE.

## Rollback
git revert; включение TTL/выкладка — не выполнялись.
