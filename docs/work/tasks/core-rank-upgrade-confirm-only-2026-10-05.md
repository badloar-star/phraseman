# Task packet: повышение ранга с визитки — только через экран подтверждения (деньги)

Governance-ID: TG-D15247B7BFE4
Status: In progress (правка; коммит — только после ревью opus и ОК координатора)
Owner: сессия 1 · ЯДРО (координатор 05.10, решение — вариант (А) Дизайна)

## Outcome

Сверка 04:45 (3232d6ce7): «Повысить ранг · 6 000» на визитке сразу списывал монеты (7845 → 1845) без подтверждения.
Решение: кнопка визитки НЕ тратит — закрывает визитку и открывает app/coin_rank.tsx (coins.html №3/№4:
подтверждение, «Проверяем повышение», трата только по его кнопке, защита от повтора). Прямой путь траты с визитки
удаляется целиком; сторож-тест: визитка не вызывает и не берёт upgrade. Плюс номер ранга на визитке без «+1».

## Scope

components/profile-card/useSelfProfileCard.ts (убрать handleUpgrade/upgrade, добавить openRankUpgrade),
components/PlayerProfileModal.tsx (onUpgrade → openRankUpgrade; номер ранга), новый сторож в tests/.
coin_rank.tsx и hooks/use_coin_rank_upgrade.ts — без изменений.

## Architecture

Визитка — только показ и навигация. Списание — единственное место: экран coin_rank (useCoinRankUpgrade.upgrade).

## Security and privacy

Деньги: уменьшение поверхности траты. Данные и сервер не меняются; деплоя нет.

## Technical debt

Церемония повышения на визитке остаётся только как показ (если ранг уже новый); сама церемония — на coin_rank.

## Verification

Сторож-тест визитки; тесты coin_rank_*; ревью opus code-reviewer диффа; ОК координатора до коммита.

## Rollback

git revert отдельного коммита.
