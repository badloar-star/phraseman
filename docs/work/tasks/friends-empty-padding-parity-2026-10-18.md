# Task packet: «Друзья» — отступ пустого списка по макету (190, офлайн 68)

Governance-ID: TG-FD82C63BE579
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: координатор 18.10 — «paddingTop 190 — да, по макету (паритет каждого элемента), офлайн-вариант оставь 68»; макет docs/design/v2-app/community.html friendsEmpty(): `padding-top:${error?68:190}px`.

## Outcome

Пустой список друзей стоит на той же высоте, что в макете COM-04-EMPTY. Вариант при сбое подписки остаётся на 68.

## Scope

В работе: components/friends/FriendsEmptyState.tsx, только paddingTop.

Вне работы:
- заголовок вкладки — по макету его нет, решение координатора «не трогаем»;
- ширина кнопки — уже 2de473369.

## Architecture

Не меняется: одно значение стиля, зависящее от пропа `error`.

## Security and privacy

Не затрагивает.

## Technical debt

Pay now: расхождение с макетом.

## Verification

- Тесты friends_empty_cta_center_contract и layout_stability_contract.
- Кадры — Сверка, по просьбе координатора: uk/ru × тёмная/светлая.

## Rollback

Ревертнуть коммит.
