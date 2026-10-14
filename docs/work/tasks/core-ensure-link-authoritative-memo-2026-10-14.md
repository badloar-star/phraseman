# Task packet: ensure_link — подтверждённый сервером ответ переиспользуется в пределах поколения аккаунта (≤2 вызова на старте и при входе)

Governance-ID: TG-44DB94E3D322
Governance-ID: TG-F0612E7A3E8F (перепись сторожа account_authority_legacy_callsite_guard: generationFences cloudSync 14 → 17)
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: координатор 14.10, прогон №4 (evidence/acc_loop_r4): 21 вызов ensureStableAuthLink за 2,6 мин

## Outcome

Факты №4 ([AUTH-LOOP]): холодный старт — 11 вызовов, из них в сеть 2 (оба requireAuthoritative, №9 и №11, 5 с подряд);
вход №2 — сетевые №12 (freshMetadata), №13 (cacheMiss; №14–18 уже ждали общий in-flight), №19 и №20 (requireAuthoritative);
выход — №21. requireAuthoritative зовут ensureCloudMutationIdentity / ensureAuthoritativeIdentityForCloudMutation перед
каждой облачной записью — мимо кэша. Починка: успешный сетевой ответ authEnsureStableLink запоминается для ключа
stableId:authUid в текущем поколении аккаунта на 10 минут; requireAuthoritative-вызов с тем же ключом и поколением отвечает
этим ответом без сети (лог [ENSURE-LINK] authoritative_memo). Смена поколения (вход/выход/смена) или repair — сброс.
Запросы с метаданными или nonce слияния память не используют. Сторож: старт → ≤2 сетевых, вход → ≤2.

## Scope

In scope: app/cloud_sync.ts (ensureStableAuthLinkForStableIdDetailed, repairStableAuthLinkAfterIdentityFailure), тест.
Out of scope: сервер, карточка Настроек (Авторизация).

## Architecture

Память в процессе (не на диске), привязана к поколению аккаунта (account_generation) — защита «не писать в чужой аккаунт»
(инцидент 2026-08-25) сохраняется: поколение меняется при любой смене личности.

## Security and privacy

Новых данных нет; память только в процессе.

## Technical debt

Contain: TTL 10 мин — подобран как компромисс; после R1 по данным можно увеличить.

## Verification

Юнит-тест: два requireAuthoritative подряд → 1 вызов сети; смена поколения → снова сеть; metadata/nonce → сеть; repair → сеть.
Существующие тесты синхронизации/входа; сторож переписи generationFences cloudSync 14 → 17 (+1 [AUTH-LOOP] 7f9c95187, +2 память).

## Rollback

Убрать память (одна ветка) — поведение как прежде.
