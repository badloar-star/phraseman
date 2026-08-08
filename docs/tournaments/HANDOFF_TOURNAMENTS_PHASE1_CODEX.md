# HANDOFF: Турниры — Фаза 1 (серверный каркас) → Codex

**Дата:** 2026-07-21 · **Ветка:** `feature/tournaments-phase1`
**Спека:** `docs/tournaments/2026-07-21-tournaments-mode-spec.md`
**Макеты (24 состояния, утверждены владельцем):** `docs/design/tournaments/shots/`
**Живой прототип (вне репо):** `C:\Users\badlo\Documents\kimi\workspace\tournament-mockups`

Владелец: **ничего не деплоить**. Codex должен сам проверить, прогнать тесты и задеплоить, когда сочтёт нужным.

---

## 1. Что уже сделано (проверено: `tsc --noEmit` чисто, jest 31/31 PASS)

### Новые файлы
- `functions/src/tournament_core.ts` — типы и константы: коллекции, стейт-машина
  (`scheduled → lobby → round1 → table1 → … → round4 → final → results → rewards → closed`,
  отдельный терминал `cancelled`), скоринг (база + speed-bonus ≤+40% + стрик ×1.5/×2,
  голосовые задания ×1.5 база), seeded-детерминированный выбор заданий
  (`seed = roomId + roundNo`), призы (🥇 билет+50💎+титул+рамка 24ч, 🥈 билет+25💎, 🥉 10💎),
  банк недели (20% стоимости билета в 💎), сезонные очки, hot-streak, генератор ботов,
  симуляция ответов ботов.
- `functions/src/tournaments.ts` — 6 Cloud Functions (см. §2).
- `functions/src/tournament_bots.ts` — `adminSeedBotProfiles` (сидер персонажей ботов).
- `functions/src/tournament_core.test.ts` — 31 тест: скоринг, seed, стейт-машина,
  призы, банк, стрики, боты.

### Изменённые файлы
- `functions/src/index.ts` — экспорты: `tournamentCreateRooms`, `tournamentJoin`,
  `tournamentFillBots`, `tournamentSubmitAnswers`, `tournamentFinalize`,
  `tournamentClaimReward`, `adminSeedBotProfiles`.
- `firestore.indexes.json` — добавлен турнирный индекс.

## 2. Cloud Functions (контракты)

| Функция | Тип | Что делает |
|---|---|---|
| `tournamentCreateRooms` | scheduler | За ~10 мин до слота (12:00/19:00/21:00 локальные, конфиг `tournamentSchedule`) создаёт комнаты |
| `tournamentJoin` | callable | Транзакция: проверка билета/free-входа недели, списание, вход в комнату 16; отмена → возврат билета + 3💎 |
| `tournamentFillBots` | internal | За 30 сек до старта добивает до 16 ботами; живых <8 → отмена с возвратами |
| `tournamentSubmitAnswers` | callable | Server-authoritative проверка ответов раунда по seed; батч-запись очков (НЕ per-question) |
| `tournamentFinalize` | internal | Места, призы, сезонные очки, взнос в банк, стрики, `reward_claims` идемпотентно |
| `tournamentClaimReward` | callable | Идемпотентный клейм наград |

Билеты: `users/{uid}/inventory/tickets`. Лог списаний: `users/{uid}/shard_log`.
UID-резолв: прямой doc → fallback `where('firebaseAuthUid','==',authUid)`; проверка `banned_users`.

## 3. Коллекции

`tournamentSchedule`, `tournamentRooms`, `tournamentTasks`,
`tournamentSeasons/{weekId}/entries/{uid}`, `tournamentBank`,
`botProfiles`, `users/{uid}/reward_claims`.

## 4. ⚠️ БЛОКЕР: firestore.rules — неразрешённые merge-конфликты (НЕ от этой работы)

В `firestore.rules` 5 конфликтов `<<<<<<< HEAD … >>>>>>> codex/learning-v2-pilot`
(строки ~1191, 1523, 1549, 1604, 2031 на момент хендоффа). Из-за них турнирные правила
НЕ добавлены. **Сначала разрешить конфликты** (уточнить у владельца: HEAD, pilot или обе
версии), затем добавить блок (все записи — только Cloud Functions/Admin SDK):

```
// ── Турниры (Фаза 1) ──
match /tournamentSchedule/{docId} {
  allow read: if request.auth != null;
  allow write: if false;
}
match /tournamentRooms/{roomId} {
  allow read: if request.auth != null;
  allow write: if false;
}
match /tournamentTasks/{taskId} {
  allow read: if false;           // задания отдаёт только сервер по seed
  allow write: if false;
}
match /tournamentSeasons/{weekId} {
  allow read: if request.auth != null;
  allow write: if false;
  match /entries/{uid} {
    allow read: if request.auth != null;
    allow write: if false;
  }
}
match /tournamentBank/{docId} {
  allow read: if request.auth != null;
  allow write: if false;
}
match /botProfiles/{botId} {
  allow read: if request.auth != null;
  allow write: if false;
}
match /users/{uid}/reward_claims/{claimId} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow write: if false;
}
```

Также в рабочей копии лежит мусор `.swarm/` (memory.db и пр.) — не трогали, удалить/игнорить на усмотрение.

## 5. Чек-лист для Codex перед деплоем

1. Разрешить конфликты `firestore.rules` + добавить блок §4 → `firebase deploy --only firestore:rules` (после ок владельца).
2. `cd functions && npx tsc --noEmit` — чисто.
3. `cd functions && npx jest tournament_core` — 31/31.
4. Прогнать полный jest-сьют functions (не сломали ли соседей — diff только в `index.ts`).
5. Проверить, что в `firestore.indexes.json` турнирный индекс валиден → deploy indexes.
6. `adminSeedBotProfiles` — засеять ботов (staging сначала!).
7. Scheduler `tournamentCreateRooms`: проверить таймзону/регион в конфиге `tournamentSchedule` перед включением.
8. Деплой functions на staging, дымовой тест: join → fillBots → submitAnswers → finalize → claimReward.

## 6. Что НЕ сделано (следующие шаги после Фазы 1 сервера)

- **Клиент RN**: экраны по утверждённым макетам (`docs/design/tournaments/shots/`, прототип
  `workspace/tournament-mockups` — React/TS, можно портировать компоненты почти 1:1):
  таббар с 5-й иконкой-кубком + LIVE-точка, главная Турниров, лобби 16, раунд,
  таблица-плашки с FLIP, результаты/подиум, сезон, отмена, шер-карточка, реванш.
- **Админка**: раздел «Турниры» — генератор заданий в пул `tournamentTasks`,
  редактор расписания/призов/банка.
- **Фаза 2**: VIP-турнир публичный, трансляция (реакции + прогнозы ×3), голосовой раунд,
  финал топ-8 ×2, «Зал славы».
- **Фаза 3**: кланы с нуля (5–20 чел., сумма очков топ-5 членов).

Все продуктовые решения и цифры — в спеке, не додумывать.
