# HANDOFF: Реакции на подиуме лиги (👑 🔥 😤) — доделать фичу

Дата: 2026-07-21. Автор хендофа: Kimi Work (сессия редизайна Лиги).
Исполнитель: Codex. Язык отчёта пользователю — русский, простым языком (см. AGENTS.md → Session Communication And Impact-Analysis Protocol; в конце отчёта обязателен раздел «Находки и предложения»).

---

## 1. Миссия

Доделать фичу «Реакции на подиуме» в разделе Лига (экран клуба/лиги):

- Долгий тап по человеку на подиуме (топ-3) открывает пузырь-пикер с тремя эмодзи: 👑 🔥 😤.
- Под именем участника на подиуме — строка счётчиков реакций, например `👑 5 · 🔥 2`.
- Один участник группы = одна реакция на одну цель: повтор того же эмодзи снимает реакцию, другой эмодзи переключает.
- На себе пикер не открывается (сервер тоже отклоняет `self_reaction`).
- Лидер видит социальное признание («8 игроков восхищены тобой» — как счётчики под его именем).

Серверная часть (callable + чистый редьюсер) УЖЕ НАПИСАНА и лежит незакоммиченной в дереве. Осталось: подключить, правила, клиент, UI, вайринг, тесты, коммит.

---

## 2. Состояние репозитория (проверено фактами на 2026-07-21)

- Рабочая папка: `C:\appsprojects\phraseman`.
- Текущий checkout: ветка `feature/referral-roulette`. Она СОДЕРЖИТ всю линейку редизайна Лиги (проверено: `git branch --contains 4aa942eb7` → также `codex/league-hub-redesign-20260719`, `feature/tournaments-phase1`, `integration/unified-20260721`).
- Рекомендация: продолжать на текущем checkout (`feature/referral-roulette`). Ветки НЕ переключать без явного слова пользователя.
- В дереве ~94 dirty/untracked файла параллельных сессий. ИХ НЕ ТРОГАТЬ и НЕ КОММИТИТЬ. Коммитить строго только файлы этой фичи (список в шаге 8).
- ЧУЖОЕ незакоммиченное изменение: `components/league/LeagueLeaderboardRow.tsx` (удалена 1 строка со стриком). Это не наше — не коммитить, не откатывать, не «чинить».
- Известные падающие тесты НЕ от этой фичи (inflight-работа параллельных сессий): `achievements`, `firebase_cost_controls`. Не чинить, в отчёте упомянуть как чужие.

### Уже закоммичено (линейка редизайна Лиги, контекст)

- Фикс пропадающей карточки Лиги на главной; hero v2; Концепция B «Арена» (сцена с подиумом, SVG-лучи, липкая карточка позиции, лента «Сейчас в гонке», кольцо сундука); модал-тизер сундука «Что внутри?» (`41986732e`); «Горячие 2 часа» ×2 XP зоне вылета в последние 2 часа недели (`4aa942eb7`).

### Написано, но НЕ закоммичено и НЕ подключено (наш файл)

`functions/src/league_podium_reactions.ts` (135 строк, LF, на диске, содержимое проверено):

- `LEAGUE_PODIUM_REACTION_EMOJIS = ['crown','fire','grumpy']` (👑 🔥 😤).
- Чистый редьюсер `applyLeaguePodiumReactionToggle(doc, uid, emoji)` → `{ next, status }`, статусы `added | removed | switched`; счётчики клампятся в 0.
- Callable `leaguePodiumReaction` (onCall, `HOT_CALLABLE_OPTIONS`):
  - auth обязателен; `resolveStableUidForAuth(db, auth.uid, data.stableId, { requireKnownIdentity: true, repairLinks: false })`;
  - бан-проверка `assertCanUseLeague` (users.banned / banned_users);
  - вход: `{ groupId, targetUid, emoji, stableId }`; валидации: `group_target_required`, `bad_emoji`, `self_reaction`;
  - группа обязана быть текущей ISO-недели (локальная копия `getWeekId`, формат `YYYY-Www`) → иначе `league_group_not_current`;
  - оба юзера обязаны быть в `members` группы → `not_a_group_member` / `target_not_in_group`;
  - транзакция в `league_groups/{groupId}/podium_reactions/{targetUid}` = `{ weekId, targetUid, counts, reactors, updatedAt }` (merge);
  - ответ: `{ ok: true, status, counts, myReaction }`.

---

## 3. План работ (шаги с точными якорями)

### Шаг 1. Подключить модуль в `functions/src/index.ts` (CRLF, 502 строки)

- После строки 42 (`... = require('./league_groups');`) добавить:
  `const { leaguePodiumReaction } = require('./league_podium_reactions');`
- После строки 156 (`exports.leagueActivateGroupBoost = leagueActivateGroupBoost;`) добавить:
  `exports.leaguePodiumReaction = leaguePodiumReaction;`

### Шаг 2. Правила Firestore — `firestore.rules` (CRLF, 2288 строк)

Блок `match /league_groups/{groupId}` на строке 1693 сейчас без вложенных подколлекций. Вложить внутрь него (паттерн вложенных match в файле уже есть, напр. `match_history`):

```
match /podium_reactions/{targetUid} {
  allow read: if request.auth != null;
  allow create, update, delete: if isAdmin();
}
```

Клиент только читает счётчики; все записи — через callable (Admin SDK обходит rules).
Прогнать `npx jest tests/firestore_rules_security.test.ts`.

### Шаг 3. Клиентский модуль `app/league_podium_reactions.ts` (новый, LF)

Паттерны взять из `app/league_group_boosts.ts`:

- helper `callable<TReq,TRes>(name)` = `httpsCallable(getFunctions(getApp(), 'us-central1'), name)` (строки ~58-60);
- guard: `IS_EXPO_GO || !CLOUD_SYNC_ENABLED` (из `./config`) → подписка no-op, toggle возвращает `{ ok: false, reason: 'unavailable' }`;
- stableId для payload: `getCanonicalUserId()` из `./user_id_policy`.

API модуля:

```ts
export type LeaguePodiumEmoji = 'crown' | 'fire' | 'grumpy';
export const LEAGUE_PODIUM_EMOJI_GLYPHS = { crown: '👑', fire: '🔥', grumpy: '😤' };
export type LeaguePodiumReactionState = {
  counts: Record<LeaguePodiumEmoji, number>;
  myReaction: LeaguePodiumEmoji | null;
};
// onSnapshot на league_groups/{groupId}/podium_reactions → map targetUid → state:
export function subscribeToLeaguePodiumReactions(
  groupId: string, myUid: string,
  cb: (byTarget: Record<string, LeaguePodiumReactionState>) => void,
): () => void;
// callable 'leaguePodiumReaction' с { groupId, targetUid, emoji, stableId }:
export function toggleLeaguePodiumReaction(args: {
  groupId: string; targetUid: string; emoji: LeaguePodiumEmoji;
}): Promise<{ ok: true; status: 'added'|'removed'|'switched'; counts: ...; myReaction: ... } | { ok: false; reason: string }>;
```

Firestore-доступ в приложении — через `@react-native-firebase/firestore` (`firestore().collection('league_groups').doc(groupId).collection('podium_reactions').onSnapshot(...)`); свериться с тем, как это делают соседние подписки в `app/club_screen.tsx` / `app/league_group_boosts.ts`, и повторить их стиль.

### Шаг 4. UI — `components/league/LeagueArenaScene.tsx` (LF, 297 строк)

- Интерфейс `LeagueArenaSceneProps` (~строка 10): добавить
  `reactions?: Record<string, LeaguePodiumReactionState>; myUid?: string; onReact?: (member: GroupMember, emoji: LeaguePodiumEmoji) => void;`
- Долгий тап (`delayLongPress` ~350) по человеку на подиуме → пузырь-пикер над ним с 3 кнопками-эмодзи; вход — одноразовый spring (scale/opacity) на RN Animated (файл уже на RN Animated). Бесконечные циклы ЗАПРЕЩЕНЫ — ratchet-тест `tests/runtime_lifecycle_ratchet.test.ts` следит за `Animated.loop`/`withRepeat(-1)`; одноразовый spring регистрировать не нужно.
- Тап вне пикера / повторный long-press — закрывает.
- На себе (`member.uid === myUid`) пикер не открывать.
- Под именем участника — строка счётчиков: только ненулевые, формат `👑 5 · 🔥 2`; своё активное эмодзи можно подсветить.
- Экспорт memo-компонента на строке 252 — сохранить memo.
- Никаких эмодзи-медалей в других местах рядом со стрелками зон (явное требование пользователя из сессии: «НЕ ДОБАВЛЯЙ ЕМОДЗИ ТАМ ГДЕ СТРЕЛОЧКИ»). Эмодзи только в пикере и в строке счётчиков подиума.

### Шаг 5. Вайринг — `app/club_screen.tsx` (CRLF!, 1758 строк)

ВАЖНО: файл CRLF — многострочные Edit могут ломаться; делать однострочные правки или править через python-скрипт.

- Импорт уже есть: строка 111 (`LeagueArenaScene`). Добавить импорт клиентского модуля шага 3.
- Стейт рядом со строками 426-427 (`arenaClubStableUid`, `leagueGroupMeta`): `podiumReactions` + `useEffect` подписки по `[leagueGroupMeta?.groupId, arenaClubStableUid]` с cleanup-отпиской.
- Обработчик `handlePodiumReact` (useCallback): оптимистично применить toggle-семантику локально (та же логика, что у серверного редьюсера: тот же эмодзи — снять; другой — переключить; не было — добавить; кламп 0), вызвать `toggleLeaguePodiumReaction`, при ошибке — rollback + существующий toast/нотификация экрана (найти используемый в файле паттерн). Снапшот всё равно перезапишет состояние истиной.
- JSX-рендер сцены — строки 1512-1524: пробросить `reactions={podiumReactions}`, `myUid={arenaClubStableUid}`, `onReact={handlePodiumReact}`.
- Инвариант: в файле ровно 1 setInterval по allowlist `tests/owner_direction_runtime_contract.test.ts` — новых интервалов НЕ добавлять.

### Шаг 6. Юнит-тест редьюсера — `functions/src/league_podium_reactions.test.ts` (новый)

Образец: `functions/src/league_groups_name.test.ts`. Покрыть `applyLeaguePodiumReactionToggle`:
added (с нуля), removed (повтор того же эмодзи), switched (другой эмодзи переносит голос), кламп счётчика в 0, независимость reactors разных uid.

### Шаг 7. Прогоны (только узкие, без широких сьютов — AGENTS.md)

```
npx jest functions/src/league_podium_reactions.test.ts
npx jest tests/firestore_rules_security.test.ts
npx jest tests/league_club_hub_contract.test.ts tests/runtime_lifecycle_ratchet.test.ts tests/perf_freeze_contract.test.ts tests/owner_direction_runtime_contract.test.ts
```

Падения `achievements` / `firebase_cost_controls` — чужие, игнорировать (зафиксировать в отчёте).

### Шаг 8. Коммит

Коммитить ТОЛЬКО:
`functions/src/league_podium_reactions.ts`, `functions/src/index.ts`, `firestore.rules`, `app/league_podium_reactions.ts`, `components/league/LeagueArenaScene.tsx`, `app/club_screen.tsx`, `functions/src/league_podium_reactions.test.ts`.
НЕ включать `components/league/LeagueLeaderboardRow.tsx` (чужая правка) и прочие dirty-файлы.

---

## 4. Деплой (обязательно сказать в отчёте)

Callable и rules на проде не появятся сами. После коммита нужен деплой (его делает пользователь/отдельная команда, НЕ в этой задаче без запроса):

```
firebase deploy --only functions,firestore:rules
```

До деплоя клиент должен мягко переживать отсутствие callable (reason `not_deployed`/unknown → rollback + тихий toast), как это делает `app/league_group_boosts.ts`.

---

## 5. Ручная проверка (smoke)

1. Два тестовых аккаунта в одной недельной группе лиги → долгий тап по сопернику на подиуме → пикер → 👑 → у цели под именем `👑 1`, у себя пикер не открывается.
2. Повтор 👑 — реакция снята; 🔥 после 👑 — счётчик переехал.
3. Второй аккаунт видит обновлённые счётчики без перезахода (onSnapshot).
4. Офлайн/недеплой: toast об ошибке, состояние откатилось.

---

## 6. Очередь ПОСЛЕ этой фичи (следующие задачи пользователя, краткие брифы)

1. «Подтолкни друга» 👋 — тап по строке участника в зоне вылета: «Тимур, ты в зоне вылета — держись!». Лимит 1 nudge/день (коллекция `league_nudges`, серверный callable + дневной лимит по паттерну friend_activity_like_daily_limits). Лёгкое социальное давление + повод вернуться в приложение (получателю — нотификация в центре событий `users/{uid}/notifications`).
2. «Комбо-огонь» — ВАЖНАЯ поправка пользователя: клубов в приложении НЕТ, есть только недельные лиги со случайными людьми. Комбо делать ВНУТРИ недельной группы: если 5+ участников группы занимаются в один и тот же час → всей группе ×1.5 XP на этот час; лента «Сейчас в гонке» показывает «🔥 Комбо ×5 — все ускорены!». Сложная часть: Cloud Function по progress_events пишет `members.{uid}.lastActiveAt` в группу; множитель учитывать там же, где «Горячие 2 часа».
3. Хвост по «Горячим 2 часам»: отдельной строки `hotHoursM` в `streak_stats` пока нет — решить, нужна ли аналитика.

---

## 7. Инварианты и запреты (из AGENTS.md, напоминание)

- Тесты — read-only guards: не переписывать исходники из тестов, не прогонять snapshot-update.
- Локализация всех новых строк через `triLang` на 8 языков: ru, uk, es, pt-BR, vi, id, tr, pl.
- Не удалять/не ослаблять существующую функциональность ради фичи.
- Не стартовать фоновые демоны, не гонять широкие тесты «по привычке».
- Сессионный отчёт — на русском, простым языком, с разделом «Находки и предложения»; явно разделять «проверено» / «не проверял».
