# Arena Matchmaking — как это работает

## Общая схема

```
Игрок жмёт "Найти соперника"
    ↓
MatchmakingContext.startSearching() → пишет запись в Firestore matchmaking_queue/{userId}
    ↓
Cloud Function onMatchmakingWrite срабатывает мгновенно
    ↓
Есть подходящий игрок? → создаём сессию (транзакция)
    ↓                                  ↓
  ДА: sessionId пишется в записи     НЕТ: ждём
  обоих игроков                          ↓
    ↓                             cron каждую минуту
  subscribeMatchmakingQueue()      пробует снова
  видит sessionId → статус 'found'
    ↓
  MatchFoundToast (если фон) или arena_lobby (если в приложении)
```

---

## Клиент — MatchmakingContext (`contexts/MatchmakingContext.tsx`)

**Что делает:**
- Глобальный провайдер, обёрнут в `_layout.tsx`
- `startSearching(userId, rankTier, rankLevel, size, expoPushToken)` — пишет в очередь, запускает интервал
- `cancelSearching()` — удаляет из очереди
- Интервал каждую 1 сек: отсчёт времени + расширение диапазона после 3 мин + таймаут 10 мин
- **DEV-режим:** через 3 сек создаёт фейковый `bot_${userId}_${Date.now()}` sessionId — только для тестирования, помечено TEMPORARY

**Расширение диапазона:**
- 0–3 мин: `searchRange = 2` (ищем в ±2 ранга)
- 3–10 мин: `searchRange = 4` (расширяем до ±4)
- Обновляет запись в Firestore чтобы Cloud Function видела новый диапазон

**MatchFoundToast (`components/MatchFoundToast.tsx`):**
- Показывает тост "⚔️ Соперник найден!" когда статус `found` и игрок НЕ в лобби
- Автозакрытие через 20 сек
- По нажатию → `router.push('/arena_game', { sessionId, userId })`

**`subscribeMatchmakingQueue(userId, cb)`** (`app/services/arena_db.ts`):
- Слушает `matchmaking_queue/{userId}` в реальном времени
- Когда поле `sessionId` появляется → вызывает callback → статус `found`

---

## Cloud Functions (`functions/src/`)

### `onMatchmakingWrite` — мгновенный матч
- Триггер: `firestore.onDocumentWritten('matchmaking_queue/{userId}')`
- Срабатывает когда игрок встаёт в очередь
- Вызывает `tryMatchForUser(userId)` — ищет подходящего прямо сейчас
- Если матч не найден — ничего не делает, ждём крона

### `matchmakingCron` — fallback каждую минуту
- Загружает всех в очереди без `sessionId`
- Группирует по `size`, для каждой группы запускает `matchGroup()`
- Убирает записи старше 15 минут (stale cleanup)

### Алгоритм подбора (`rankFilteredCandidates`)
```
effectiveRange = max(мой searchRange, их searchRange)
матч возможен если |мой rankIndex - их rankIndex| <= effectiveRange
```
- `rankIndex` = 0 (Bronze I) … 23 (Legend III)
- `searchRange` начинается с 2, расширяется клиентом до 4

### Создание сессии (`createSession`) — защита от race conditions
```
Firestore ТРАНЗАКЦИЯ:
  1. Проверяем что оба игрока всё ещё без sessionId
  2. Если один уже схвачен другим инстансом — бросаем ошибку, транзакция откатывается
  3. Создаём arena_sessions/{sessionId}
  4. Создаём session_players/{sessionId}_{userId} для каждого
  5. Пишем sessionId в matchmaking_queue/{userId} обоих → клиент видит матч
```

### Push-уведомления
- Если у игрока есть `expoPushToken` в записи очереди → шлём через Expo Push API
- Не критично: если не дошло — игрок увидит матч через Firestore subscription когда вернётся в приложение

---

## Firestore коллекции

| Коллекция | Документ | Поля |
|---|---|---|
| `matchmaking_queue` | `{userId}` | `userId, rankTier, rankIndex, size, joinedAt, searchRange, expoPushToken?, sessionId?` |
| `arena_sessions` | `{sessionId}` | `id, type, state, rankTier, size, playerIds[], questions[], currentQuestionIndex, questionStartedAt, questionTimeoutMs, createdAt` |
| `session_players` | `{sessionId}_{userId}` | `sessionId, playerId, score, answers[], finished?` |

---

## Боты в матчмейкинге (ранний этап)

Включены через флаг `BOT_FALLBACK_ENABLED` в `app/config.ts`. Если за случайное
окно `[BOT_FALLBACK_MIN_MS..BOT_FALLBACK_MAX_MS]` (по умолчанию 60–120 сек) не
нашёлся реальный соперник — клиент создаёт локальную бот-сессию с
`sessionId="bot_<uid>_<ts>"`. Серверные коллекции (`arena_sessions`,
`matchmaking_queue.sessionId`) для бот-матчей **не пишутся** — Cloud Function
`gameLoop` ничего о боте не знает.

**Поведение бота** (`app/constants/bot_difficulty.ts`):
- Точность: `lerp(50%, 85%)` по `rankIndex` игрока (Bronze I → Legend III)
- Задержка ответа: `lerp(8000мс, 1800мс)` ± случайный шум 1500мс
- Никогда не выходит за окно вопроса (clamp до 38000мс) — без «таймаутов»

**Имена** (`app/constants/bot_names.ts`): пул из 100 ников, общий для всех
локалей — пользователь любого языка может встретить любое имя. Это намеренно:
интернет-игра должна ощущаться разнообразной.

**Аватар**: рандомный из 51 встроенных, уровень `±3` от уровня игрока.

**Что бот пишет в Firestore**:
- `arena_profiles/{uid}` — звёзды, ранг, winStreak, matchesPlayed/Won, xp (через клиентскую транзакцию в `arena_results.tsx` `saveMatchResult`)
- `arena_profiles/{uid}/match_history/{sessionId}` — карточка матча с `oppIsBot: true`
- daily tasks `arena_play` + `arena_win` инкрементируются как обычно

**Что бот НЕ пишет**:
- `arena_sessions/{sessionId}` (серверный CF не запускается)
- `matchmaking_queue.sessionId` (клиент сам leave-ит queue)
- `users/{uid}/progress.xp` напрямую — арена-XP сидит в `arena_profiles.xp`,
  только daily-task-rewards идут в leaderboard через `xp_manager.registerXP`

**Аналитика**: события `arena_match_bot_started` / `arena_match_bot_finished` /
`arena_match_bot_result` (см. админский Firestore Analytics). По ним — ретеншн-эффект
ботов и плановое отключение когда DAU вырастет.

**Удалённое наследие** (не восстанавливать):
- Серверная фабрика ботов: `app/bot_data.ts`, `app/firestore_bots.ts`,
  `app/services/arena_bots.ts`, `functions/src/bot_engine.ts`, `scripts/seed_bots.mjs`
- `botIds` в сессиях / `isBot` в `session_players` — текущая система
  обходится без серверных бот-документов

---

## DEV vs PROD

| | DEV (`__DEV__`) | PROD |
|---|---|---|
| Таймаут поиска | 3 сек → бот-матч | 60–120 сек случайно → бот-матч (если нет реального) |
| Bot-матч | Да | Да (под флагом `BOT_FALLBACK_ENABLED`) |
| Реальный матч | Да (если есть другой игрок) | Да (приоритет — реальный матч за окно ожидания) |

---

## Тесты

```bash
cd functions && npm test
```

Файл: `functions/src/matchmaking.test.ts` — 8 тестов для `rankFilteredCandidates` и stale detection.
