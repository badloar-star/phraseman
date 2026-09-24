# PM-282 — Шпиль: «Друзья на этой неделе» (этаж друга)

Дата: 2026-09-24 · Sonnet 5 · L1

## Что искал

Acceptance PM-282-A1: этаж друга берётся из УЖЕ существующей активности друзей,
без нового Firestore-чтения на каждого друга.

## Что нашёл

Готового «агрегата активности друзей» (кэш-документ, который кто-то пишет при
каждом отчёте) в кодовой базе НЕТ. `friends_activity_feed_v1`/`_v2` в
`app/cache_reset.ts:37-38` — только имена ключей AsyncStorage-кэша в списке
сброса при выходе из аккаунта; ни один модуль их не пишет и не читает — мёртвые
строки, не рабочий механизм.

Зато для точно такой же задачи — «лига уже отдаёт вес друга без чтения на
каждого» — механизм есть и используется прямо сейчас:

- `functions/src/friends_profiles.ts` → callable `friendsGetProfiles`. Один
  вызов на всех друзей (до 100 uid), сервер параллельно читает
  `leaderboard/{uid}` + `users/{uid}` (`Promise.all` в `fetchOneProfile`),
  отдаёт `FriendPublicProfile[]`. Поле `weeklyXp` (XP друга за неделю лиги)
  уже едет этим путём — читается из `users/{uid}.progress.week_points_v2` /
  `weekly_xp` тем же чтением, что и остальной профиль.
- Клиент: `app/friends_profiles_batch.ts` → `fetchFriendProfilesBatch(uids)`.
  TTL-кэш 5 мин на клиенте, dedupe inflight, батч по 100. Сервер держит свой
  кэш 60 c (`friends_profiles.ts: SERVER_CACHE_TTL_MS`), ключ кэша учитывает
  проверенный список взаимных друзей.
- Итог по чтениям: не «N чтений на каждого друга с клиента», а 1 клиентский
  RTT + N параллельных server-to-server чтений ВНУТРИ одного вызова (тот же
  порядок, что уже платит weeklyXp/streak/activeDays/friendsPush — не новая
  стоимость, а тот же бюджет, которым уже оплачена лента «Вместе»).

## Что сделано

Прогресс Шпиля (PM-275) пишется в `progress.spire_week_v1` — то же поле
`users/{uid}.progress`, которое `friendsGetProfiles` УЖЕ читает ради
weeklyXp/activeDays. Добавил чтение этого же поля рядом:

- `functions/src/friends_profiles.ts`:
  - `spireFloorFromUserProgress(progress, nowMs)` — локальный узкий парсер
    `progress.spire_week_v1` (тот же приём, что уже применён в файле для
    `weeklyXpFromUserProgress`/`currentWeekKey`: дублируем маленькую чистую
    функцию вместо кросс-импорта серверного `spire_progress_contract.ts`,
    который валидирует форму ОТЧЁТОВ — лишний surface для простого чтения).
    Берёт максимум `tier+1` среди `en/es/de/fr` за ТЕКУЩУЮ неделю (weekKey
    совпадает), возвращает `{spireFloor, spireLang}` (`null` = не играл на
    этой неделе / данных нет).
  - `FriendPublicProfile.spireFloor: number | null`, `.spireLang: string | null`
    — новые поля, `buildFriendProfile`/`friendTogetherFieldsFromUserData`
    прокидывают их наружу.
- `app/friends_profiles_batch.ts`: зеркало полей в
  `FriendProfileBatchRecord.spireFloor`/`.spireLang` (клиентский тип
  callable-ответа).

Ни одного нового Firestore-чтения не добавлено: `users/{uid}` в
`fetchOneProfile` и так читался целиком ради «Вместе» — просто читаем из уже
загрученного документа ещё одно поле.

## Что НЕ сделано (открыто для следующего шага)

- UI-строка «Друзья на этой неделе» на экране Шпиля не нарисована — задача
  профиля L1 просила именно ЭТО поле данных, acceptance PM-282-A1 про источник
  чтения. Рендер строки — отдельный (дизайн-)шаг: взять
  `fetchFriendProfilesBatch(friendUids)`, отсортировать по `spireFloor`
  (`null` — в конец или скрыть), показать имя + этаж + флаг языка
  (`spireLang`). Понадобится решить: показывать друга с разных языков рядом
  (T27 «даже из других комнат») — поле `spireLang` для этого уже есть.
- Тестов на `spireFloorFromUserProgress`/`friendsGetProfiles` не добавлено:
  файла `functions/src/friends_profiles.test.ts` в проекте нет вовсе (весь
  модуль без тестов), заводить тестовую инфраструктуру для соседних функций —
  за рамками L1-задачи на одно поле.
- `friends_activity_feed_v1/v2` — мёртвые строки в `app/cache_reset.ts`; не
  трогал (не относится к этой задаче, вне списка разрешённых файлов).

## Проверка

- `functions/`: `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit
  --pretty false -p tsconfig.json` — 0 ошибок.
- jest не запускал (нет теста на этот файл; jest/tsc полного проекта — не по
  протоколу лёгкой задачи, точечный typecheck сделан).
