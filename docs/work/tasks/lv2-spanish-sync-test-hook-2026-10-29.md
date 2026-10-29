# Task packet: сторож синка испанского прогресса (продолжение lv2-spanish-progress-cloud-sync-2026-10-29)

Governance-ID: TG-67A5C4A4E706
Status: In progress
Owner: Learning V2 session; координатор 29.10

## Outcome

Тест «испанский прогресс курса восстанавливается на новом устройстве и не смешивается с английским»: ключи es в SYNC_KEYS, отличаются
от английских, и правила слияния es те же (число — максимум, маски — ИЛИ, звёзды — лучшая). Для теста — доступ к правилу слияния через
существующие __cloudSyncTestHooks (только чтение).

## Scope

app/cloud_sync.ts (одна строка в __cloudSyncTestHooks), tests/cloud_sync_learning_v2_es_progress_2026_10_29.test.ts.

## Architecture

FC_RESTORE_MERGE_STRATEGIES не экспортируется; тест читает его через тестовый хук, как остальные внутренности синка.

## Security and privacy

Не затрагивается.

## Technical debt

Нет нового: хук только для тестов, как соседние.

## Verification

Новый тест + cloud_sync_sync_keys_validity + cloud_sync_customization_account_isolation.

## Rollback

Revert коммита.
