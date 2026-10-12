# Карточки (серия cards-v2): «Тень» на плоских кнопках панели соцдействий набора

Governance-ID: TG-91604D462E5D
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора: проверить «Тень» на экранах cards-v2)

## Outcome
Круглые и пилюльные контролы в CommunityPackSocialBar (кнопка действий, «добавить», пилюля «в топе») получают малую внешнюю тень стиля «Тень» из токенов темы, как остальные вложенные контролы cards-v2; без неё они были плоскими заливками.

## Scope
app/community_packs/CommunityPackSocialBar.tsx — только стиль (файл Дизайна, ему сообщается). MyPacksV2.tsx не трогаю: его палитра идёт из модуля learning-v2 (файл Codex).

## Architecture
nestedBoxShadow(g) из components/v2/ShadowSurface.tsx, g = liquidGlassTokens(темы) уже есть в компоненте; логика не меняется.

## Security and privacy
Не применимо.

## Technical debt
Мёртвая функция shadowForTile в app/flashcards/FlashcardsCategoryHub.tsx (старые RN-тени, нигде не вызывается) — удалить отдельным шагом по согласованию с Дизайном.

## Verification
Сторож обводок, тесты Карточек, срез типов; кадры cards-v2 у Сверки.

## Rollback
git revert коммита.
