# Task packet: dev_state без второй копии (tabs) в стеке (координатор 14.10)

Governance-ID: TG-CB36E8F84AA8
Governance-ID: TG-90FD92298FE0
Status: In progress — правка готова, внести в окно кода вместе с [PAYWALL-CLOSE-JS]
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Зонд [PAYWALL-CLOSE-FREEZE] показал стек `[__root] > [(tabs),*(tabs)]` после тестового входа:
- `/dev_state` открывается поверх вкладок;
- затем делает `router.replace(next)`;
- для вкладочного `next` (`/settings`, `/home`, …) на место dev_state встаёт вторая копия группы вкладок;
- нижняя копия заморожена — отсюда ложные «зависания» в прогонах (тап подсвечивается, экран не меняется).

Починка (только dev-экран):
- если стек можно свернуть — `router.dismissTo(next)`: снимает dev_state и ведёт на уже открытый маршрут;
- если маршрута нет — expo-router сам заменяет;
- иначе `router.replace` как раньше;
- журнал `[DEV-STATE] route: …` пишет, какой способ выбран и почему.

## Scope

In scope: `app/dev_state.tsx` (ветка перехода) + сторож `tests/dev_state_no_duplicate_tabs.test.ts`.
Out of scope: остальная логика фикстур.

## Architecture

`router.dismissTo` уже используется в `app/navigation_back.ts` (та же версия expo-router).

## Security and privacy

Только dev-маршрут (в сторе файла нет).

## Technical debt

- Новых долгов нет.
- Старые прогоны, снятые с дублем (tabs) (WB-R 14.10), остаются в evidence как есть. Выводы по «зависанию» из них не делаем.

## Verification

- Сторож.
- Сверка: `dev_state?next=/settings` → зонд показывает `[(tabs)]` без дубля.

## Rollback

`git revert`.
