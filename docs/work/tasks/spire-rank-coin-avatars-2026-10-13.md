# Task packet: монеты рангов вместо букв в Шпиле (13.10)

Governance-ID: TG-69FEB796F605
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по поручению координатора (решение владельца 13.10)

## Outcome

Владелец: «должно показывать аватары ников — монеты рангов». Во всех четырёх местах Шпиля, где участник комнаты рисовался кружком с буквой (`SpireInitial`), показывается монета ранга — тот же компонент `AvatarView` с `coinRank`, что в «Друзья на этой неделе» и в комментариях Карточек: соперники у этажей башни, «кто на этаже», «Все участники», пьедестал. Ранг неизвестен — базовая монета (ранг 0), буква не показывается никогда. Своя монета у себя — по рангу из `useMyCoinRank`.

## Scope

In scope: новый `components/spire/SpireRankCoin.tsx` (memo), `SpireTower.tsx` (слой соперников), `SpireFloorInfo.tsx`, `SpireAllMembers.tsx`, `SpirePodium.tsx`, типы `SpireRival`/`SpireMemberRow`/`SpireRoomRow`/`SpireRoomMember`, декодер `spireDecodeRoomMembers`/`spireDecodeRoster` (необязательное поле `coinRank`), превью-фикстуры (разные ранги), одна строка маппинга участников в `SpireHomeScreen.tsx` (хунки согласованы с Темами), сторож.

Out of scope: запись `coinRank` в документ комнаты на сервере (Ядро, `functions/src/spire_groups.ts`), формула ранга ботов (Ядро).

## Architecture

Ранг едет внутри уже читаемого документа комнаты (`members[uid].coinRank`, `roster[i].coinRank`): новых чтений нет. Клиент декодирует число 0..19, иначе null. Компонент монеты мемоизирован по (rank, size). Свой ранг для строки `isMe` подставляется из `useMyCoinRank`, а не из комнаты.

## Security and privacy

Ранг монеты уже публичен (friends_profiles.coinRank, public_coin_rank_projection). В комнату недели он попадает тем же публичным значением; новых персональных данных нет. Политика конфиденциальности не меняется.

## Technical debt

Remove: `SpireInitial` (кружок с буквой) и комментарий «ранга монеты у участника комнаты в данных нет».

## Verification

Точечные прогоны сторожей Шпиля через test:one под светофором; кадры Сверки (я на 4 этаже, tier 3/floor 4 и 7).

## Rollback

git revert коммита.
