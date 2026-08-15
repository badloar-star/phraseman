# Промпт для Codex: развернуть Арену

Скопируйте всё, что ниже разделителя, и передайте Codex.

---

Задача: развернуть серверную часть раздела «Арена» в проекте Phraseman и
включить её, чтобы владелец мог начать проверять. Репозиторий:
`~/Documents/phraseman` (ветка — текущая, переключать не нужно).

## ЖЁСТКИЕ ЗАПРЕТЫ

1. **Не откатывай и не переписывай файлы Арены.** Это `modules/arena/**`,
   `components/arena/**`, `app/arena*`, `functions/src/arena_*`,
   `tests/arena_*`, `docs/arena/**`, `components/tournament/TournamentBackdrop.tsx`.
   Никаких `git revert`, `git checkout` чужой версии и перезаписи из своего
   буфера. Работа над Ареной уже дважды терялась именно так. Подробности — в
   `____АРЕНА_НЕ_ОТКАТЫВАТЬ____.md` в корне.
2. **Ничего не «чини» по дороге.** Если видишь ошибки типов в
   `app/personal_plan_*`, `app/cloud_sync.ts`, `app/events.ts` — это чужая
   незавершённая работа, трогать её не нужно.
3. **Не меняй турнирный рантайм и опубликованный пул заданий.** Арена только
   читает `tournamentTasks`.
4. Секреты не коммить и не печатать в логи.

## Шаг 1. Секреты Functions

Без них поток пар, приглашений и редких наград отказывает (fail-closed):

```bash
cd ~/Documents/phraseman
firebase functions:secrets:set ARENA_V2_PAIR_HMAC_KEY
firebase functions:secrets:set ARENA_V2_INVITE_HMAC_KEY
firebase functions:secrets:set ARENA_V2_SPIN_HMAC_KEY
```

Значения — случайные строки не короче 32 байт. Если секреты уже заданы, оставь
как есть: ротация обесценит незавершённые приглашения.

## Шаг 2. Индексы — первыми

```bash
firebase deploy --only firestore:indexes
```

Дождись состояния `READY` у всех новых индексов, прежде чем идти дальше.
Запросы без готового индекса падают. Среди новых —
`arena_v2_members.expireAt` и `seats.updatedAtMs` (оба COLLECTION_GROUP).

## Шаг 3. Правила доступа

```bash
firebase deploy --only firestore:rules
```

Новое правило: `arena_v2_match_live/{matchId}/seats/{seatId}` — единственное
место во всей Арене, куда пишет сам клиент, и писать он может только в своё
место за столом.

## Шаг 4. Функции

```bash
firebase deploy --only functions
```

Новые вызовы: `arenaV2MatchPlan`, `arenaV2MatchFinish`, `arenaV2MatchSettle`,
`arenaV2FriendsBoard`, `adminArenaConfigGet`, `adminArenaConfigSet`.

## Шаг 5. Админская страница конфига

```bash
firebase deploy --only hosting:admin
```

Публикуется единственная рабочая админка `admin/v2/legacy.html`; конфиг Арены
находится в разделе `#control-panel`, карточка «Арена».

## Шаг 6. Включить Арену — без этого шага НИЧЕГО не заработает

Бэкенд Арены fail-closed: без документа `arena_v2_config/current` он отказывает
во всех вызовах, и в приложении все кнопки «Играть» серые. Это и есть причина,
по которой владелец сейчас видит неактивные кнопки.

Открой опубликованную страницу `legacy.html#control-panel`, найди карточку
«Арена», включи переключатели и запиши конфиг. Страница сама собирает
корректный документ через
`adminArenaConfigSet` — руками поля не выдумывай.

Включай по одному, наблюдая ошибки: сначала `enabled`, затем `quickEnabled`,
потом `rankedEnabled` и `friendEnabled`, затем `rewardsEnabled` и `spinEnabled`.
Флаги расширения (`arenaExpansionEnabled`, `arenaMatchLabEnabled`,
`arenaMasteryEnabled`, `arenaPartnerEnabled`) оставь выключенными до отдельного
решения владельца.

Если страница почему-то недоступна, документ можно создать серверной операцией,
но ТОЛЬКО в этом виде (значения публикации обязаны совпадать с константами
`functions/src/tournament_pool_publication.ts`, иначе загрузчик заданий
откажет):

```js
{
  schemaVersion: 'arena-v2-config.v1',
  productConfigVersion: 'arena-v2-product.v1',
  minClientVersion: '0.0.0',
  contentPublication: {
    poolVersion: 'tpool_20260801_v10',
    manifestSha256: '8ec778fef78045b148e077be7efdf2dcdc081a275005e4bcf713a1a3754a00e5',
    merkleRootSha256: 'ac0cf279e14c052854f90245fb5dae8da08a0a59bf806b1e63823c626024f999',
  },
  enabled: true,
  quickEnabled: true,
  rankedEnabled: true,
  friendEnabled: true,
  rewardsEnabled: true,
  spinEnabled: true,
}
```

## Шаг 7. Проверка

1. `arenaV2Home` отвечает и возвращает `availability.enabled: true`.
2. В приложении на главном экране Арены кнопки «Играть» стали активными.
   Изменение конфига доезжает примерно за пятнадцать секунд — это кеш, не сбой.
3. Быстрый матч запускается и доигрывается до экрана результата.
4. В логах Functions нет `arena_config_missing` и `arena_config_incompatible`.

## Откат, если что-то пошло не так

Выключи проблемный флаг на той же странице — этого достаточно, деплой
откатывать не нужно. Поля документа не удаляй: вызовы восстановления всё равно
проверяют совместимый конфиг.

## Чего НЕ нужно делать

- Не пересобирай приложение: сборка за владельцем.
- Не включай флаги расширения все сразу.
- Не публикуй пул заданий заново.
