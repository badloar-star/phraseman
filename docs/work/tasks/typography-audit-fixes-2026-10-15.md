# Типографика стор-сборки: остаток аудита (VideoThumb, PLUS-значок, толстые рамки)

Governance-ID: TG-FDAB48DCC194
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора, аудит scripts/audit_typography_store_surface.mjs)

## Outcome
Сторож typography_store_surface_ratchet зелёный: fallbackTitle превью видео на шкале 13/17, значок PLUS 13/17; толстые рамки либо убраны (карточки дуги призов), либо помечены typo-exempt с причиной (индикаторы/эффекты/треугольники — не рамки контейнеров).

## Scope
app/flashcards/VideoThumb.tsx и components/dialogs/DialogueV2PlusTools.tsx — файлы Дизайна, правлю только стиль текста; components/prize_arc.tsx, celebration/RewardImpactRings.tsx, friends_together/FriendEventMarker.tsx, energy/EnergyInfoPopover.tsx; config/typography-store-surface-baseline.json (только вниз).

## Architecture
Шкала D145: 16 основной, 13 мелкий, межстрочный ≥ 1,25× (V2_TYPE 16/21, 13/17). Пометки typo-exempt — единственный способ, который понимает аудит (shadow-ok у него не в списке исключений).

## Security and privacy
Не применимо.

## Technical debt
Красный typography-ratchet в Настройках (18/22) — проверить отдельно (пункт 2 R1_WORK_SPLIT).

## Verification
Аудит и сторож типографики, сторож обводок «Тени», срез типов.

## Rollback
git revert коммитов.
