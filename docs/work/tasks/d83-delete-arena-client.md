# Task packet: D83 — удалить клиентскую Арену целиком

Governance-ID: TG-DE760364A701
Governance-ID: TG-774199A41B20
Status: Implemented (не закоммичено; проба D83 и D74 зелёные)
Owner: сессия Claude (субагент), владелец badloar@gmail.com
Related epic/enabler: docs/phraseman-2.0/03_DECISIONS.md D78, D83; предыдущий шаг d78-delete-arena-server-tutor-text-dev-grants.md

## Outcome

Владелец решил: клиентская Арена удаляется из кода целиком — экраны (поиск, матч,
друзья/дуэли, «Задание дня», история, топы, ранги, магазин звёзд, результаты, ревью,
приглашения), маршруты, клиент `app/arena_client.ts`, прогревы/предзагрузки, фоновый
поиск, ассеты Арены, входы в навигации, deep links. Тап по старому уведомлению
`arena_friend_*` ведёт на Главную и не падает. Успех = проба
`tests/d83_arena_client_deleted.probe.ts` зелёная, тесты Шпиля зелёные.

## Scope

In scope: `app/arena_*`, `app/(tabs)/arena.tsx` (становится пустым якорем старого URL),
`components/arena/**`, `components/ArenaReportOpponentButton.tsx`, `hooks/use_arena_*`
(кроме звука, нужного Learning V2), `modules/arena/**` (кроме модулей, которые
импортирует оставшийся код: Шпиль, практика ошибок, уведомления), ранговые ассеты,
точечные вырезы в `app/_layout.tsx`, `app/(tabs)/friends.tsx`, `app/+native-intent.tsx`,
обработчиках уведомлений, dev-витрине; тесты удалённого кода.

Out of scope: серверная часть (D78, уже сделано), админка, контент пула,
`docs/phraseman-2.0/PROGRESS.md`, `registries/tasks.json`, деплой, коммиты.

## Architecture

Шпиль (`modules/spire/step_machine.ts`) импортирует `modules/arena/answer_check.ts`
→ `contract.ts` → `target_registry.ts`. Практика ошибок импортирует `contract.ts`,
уведомления — `target_registry.ts`, Learning V2 speed-match — `hooks/use_arena_sound.ts`
→ `modules/arena/sound_catalog.ts`. Эти файлы остаются, всё остальное удаляется после
доказательства (граф импортов), что оставшийся код их не импортирует.

## Security and privacy

Удаление снижает поверхность: клиент больше не зовёт удалённые callable, не держит
кэши и очереди Арены. Новых данных не собирается. Политика не меняется.

## Technical debt

- Pay now: мёртвые экраны, прогрев хаба при входе, глобальный хост тоста находки.
- Contain: строки-метки `arena` в аналитике/навигации/энергии оставлены как
  исторические ключи; ратчет-проба запрещает возврат файлов и маршрутов.

## Verification

`npx tsx tests/d83_arena_client_deleted.probe.ts`, `npx tsx tests/d74_arena_server_retired.probe.ts`,
точечные jest-прогоны тестов Шпиля и затронутых контрактов, точечный typecheck.

## Rollback

Файлы восстанавливаются из git-истории (коммит до D83). Данные пользователей не
затрагиваются: серверная Арена уже снята D78.
