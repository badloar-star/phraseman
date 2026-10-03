# Task packet: community_pack_like_owner_fix — 2 красных теста владения по цели

Governance-ID: TG-F0D909098077
Status: Done
Owner: Ядро; координатор 03.10

## Outcome
Тесты «Добавить себе пишет владение по цели» и «английская цель как раньше» получали []: с 728ccc825 (Account V2 6G) loadCommunityOwnedPackIdsResult читает в рамках поколения аккаунта (accountScopeKey) и без начатого аккаунта возвращает {ids: [], status: 'stale'}. Законный сдвиг: тест поднимает аккаунт (beginAccountGeneration), как tests/gustav_community_pack_target_gate.test.ts. Код не меняется.

## Scope
tests/community_pack_like_owner_fix.test.ts.

## Architecture
Без изменений кода.

## Security and privacy
Нет изменений.

## Technical debt
Принято: нового долга нет; поведение кода не меняется, правится только подготовка теста.

## Verification
Файл 17/17.

## Rollback
git revert.
