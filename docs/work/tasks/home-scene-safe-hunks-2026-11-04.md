# Task packet: безопасные хунки сцены Главной из грязного дерева

Governance-ID: TG-0051DECFB548
Status: In progress
Owner: сессия «2 · ДИЗАЙН»
Related epic/enabler: none

## Outcome

По таблице Ревизора и решению координатора 04.11 в HEAD попадают только безопасные правки сцены Главной: звёзды не мигают при неактивной сцене (проп active), шапка статусов переносит плашки и масштабирует текст только в режиме scene, сцена резервирует измеренную высоту шапки, ∞ в плашке энергии не режется на Android, таймер тихого повтора очищается при уходе, `peakSceneTopHex` для общей шапки «Сообщества». Не коммитятся: компактная сцена 280, удаление героя, art-логика `HomeScene`, правки сторожей под 280 (до слова владельца).

## Scope

In scope: `HomeSceneEnergy.tsx`, `HomeV2Header.tsx`, `SceneBackdrop.tsx`, `SceneStarTwinkle.tsx`, `scene_palette.ts` (файлы целиком), хунки в `HomeScene.tsx`, `HomeSceneStage.tsx`, `app/(tabs)/home.tsx`. Out of scope: всё перечисленное в «не коммитятся».

## Architecture

No architecture change: опциональные пропы и чистая функция; поведение по умолчанию прежнее.

## Security and privacy

Данные не затрагиваются. Политика конфиденциальности не затрагивается.

## Technical debt

Contain: хунки отбираются патчем на варианте HEAD, остальное остаётся неотслеженным у Codex.

## Verification

Типы и сторожа `home_scene_*`, `scene_*`, `home_hero_512` на варианте HEAD + эти хунки.

## Rollback

Откатить коммит: прежний вид сцены, данные не затронуты.
