# PhraseMan

React Native + Expo + TypeScript. Мобильное приложение для изучения английских фразовых глаголов (RU/UK).

## 🚨 MASTER MAP — обязательно читать перед изменениями
- `docs/MASTER_MAP.md` — source of truth по data flow, зависимостям, рискам, QA-gates.

## Сборка (EAS)
Профиль выбирает пользователь по контексту: `production` / `preview` / `development`.
```bash
eas build --platform android --profile production
```

## Аудио / тактильность
- Озвучка фраз/слов/диалогов: `expo-speech` через `hooks/use-audio.ts` (`useAudio`).
- Отклик нажатий: `hooks/use-haptics.ts` (`hapticTap`). Отдельных аудиофайлов под UI-клики нет.

### ⚠️ ПРАВИЛО: Все TTS только через `useAudio`
**Запрещено** вызывать `Speech.speak` / `Speech.stop` напрямую из компонентов. Прямые вызовы минуют:
- 220-мс гард от двойного тапа на одном тексте,
- `normalizeSpeechRate(rate)` (клипит 0.5–1.0),
- единый сброс state между utterances,
- автоматический fallback rate на актуальный `settings.speechRate`.

Без гарда на Android `Speech.stop()` асинхронный, и быстрая последовательность вызовов наслаивает utterances → звук "ускоряется/жуёт". Это и был баг dev-билда после удаления MP3-пайплайна (commit `075a99d`).

**Канон:**
```ts
const { speak, stop } = useAudio();
speak(text, settings.speechRate, { pitch?, onDone?, onStopped?, onError? });
useEffect(() => () => { stop(); }, [stop]); // ОБЯЗАТЕЛЬНО на каждом экране с озвучкой — гасит TTS при размонтировании
```

Если экран не успел загрузить `settings.speechRate` (или это generic-проп типа `onSpeak: (text: string) => void`), допустимо вызывать `speak(text)` без второго аргумента — `useAudio` сам подтянет `getUserSettingsSnapshot().speechRate`. Хардкоды вида `speak(text, 0.9)` или `speak(text, 1.0)` запрещены — это и было причиной «ттс игнорирует скорость / эффект перемотки пленки» в flashcards practice / lesson_verbs / FlashcardListItem / UgcPackEditorCardPreview.

`useAudio` также никогда не пробрасывает `pitch: undefined` в нативный TTS — некоторые Android-движки трактуют undefined как 0 и выдают chipmunk-эффект. Поле опускается, если caller не передал значение явно.

**Stop-settle gap (80 мс):** `useAudio.speak` всегда сначала вызывает `Speech.stop()`, а сам `Speech.speak()` откладывает на `STOP_SETTLE_MS = 80 мс` через `setTimeout`. На Android `Speech.stop()` асинхронный — без gap'а старый и новый utterance успевают наслоиться, и звук «работает через раз» / «эффект перемотки». Если в окно gap'а пришёл новый `speak(...)`, предыдущий pending timer отменяется и играет только последний запрос (это правильное UX: юзер тапнул новое — слышит новое). Запрещено убирать `STOP_SETTLE_MS` или вызывать `Speech.speak` синхронно после `Speech.stop()`.

Покрыто тестами: `tests/use_audio_guard.test.ts`, `tests/speech_rate_guard.test.ts`.

## Детальная документация
- [docs/HOME_DEPENDENCIES.md](docs/HOME_DEPENDENCIES.md) — зависимости home.tsx
- [docs/FLASHCARDS_RULES.md](docs/FLASHCARDS_RULES.md) — правила flashcards
- [docs/PREMIUM_MODAL_RULES.md](docs/PREMIUM_MODAL_RULES.md) — правила premium_modal

## ⚠️ ЛИДЕРБОРД — КРИТИЧЕСКИЕ ПРАВИЛА

Архитектура (Firestore):
- `leaderboard/{uid}` — читает приложение (`fetchGlobalLeaderboard`)
- `users/{uid}/progress` — пишет `syncToCloud` с устройства
- Cloud Function `syncLeaderboardCron` синхронит `users` → `leaderboard` каждые 2 часа

Запрещено:
1. Удалять вызов `pushMyScore` из `xp_manager.ts` — он пишет в `leaderboard/{uid}` напрямую при каждом XP.
2. Читать `item.avatar` из Firestore — устаревшее. Всегда вычислять: `String(getBestAvatarForLevel(getLevelFromXP(xp)))`.
3. Менять формулу `getLevelFromXP` без синхронной миграции `user_avatar` в Firestore.
4. Менять поля `_doPushMyScore` без обновления `functions/src/sync_leaderboard.ts` — поля должны быть идентичны.
5. Добавлять lang-фильтры в `fetchGlobalLeaderboard` — лидерборд глобальный.

Ключевые файлы: `app/firestore_leaderboard.ts`, `app/xp_manager.ts`, `app/(tabs)/hall_of_fame.tsx`, `functions/src/sync_leaderboard.ts`, `components/AvatarView.tsx`.

Ручная синхронизация:
```bash
cd functions && node -e "const admin=require('firebase-admin');admin.initializeApp({credential:admin.credential.cert(require('../service-account.json'))});require('./lib/sync_leaderboard').syncLeaderboardFromUsers().then(()=>process.exit(0));"
```

## ⚠️ АРЕНА — ДНЕВНОЙ ЛИМИТ

- `app/arena_daily_limit.ts` — AsyncStorage `arena_daily_limit_v1` хранит `{ date: YYYY-MM-DD, count }`.
- Лимит **5 матчей/сутки** для free; premium (`isUnlimited === true`) — без ограничений.
- Порядок проверок в `handleFindMatch`: лимит → энергия (нельзя тратить энергию если лимит исчерпан).
- "Играть с другом" (`handlePlayWithFriend`) — БЕЗ проверки лимита.
- Не инкрементировать лимит при `isUnlimited`.
- `ARENA_DAILY_MAX = 5` завязан на dots-индикатор — менять только синхронно с UI.

При исчерпанном лимите: `handleFindMatch` → `ArenaLimitModal mode='matchmaking'`; `handleFriendShare` → `mode='invite'`.

Файлы: `app/arena_daily_limit.ts`, `components/ArenaLimitModal.tsx`, `app/arena_lobby.tsx`.

## ⚠️ АДМИНКА / UID / РЕПОРТЫ / PREMIUM — ИНВАРИАНТЫ

**UID source of truth:** для любых user-scoped данных в Firestore использовать только canonical UID из `getCanonicalUserId()`. `anon_id` — только legacy-display, не ключ данных.

**Репорты багов и кнопка "✅ Пофикшено":**
- `error_reports.uid` обязан быть canonical UID — иначе награда уйдёт в чужой `users/{uid}`.
- `markFixed` в `admin/index.html` должна: (1) менять статус, (2) +1 к `users/{uid}.shards`, (3) писать `users/{uid}/shard_rewards` с `seen: false`.
- `ShardRewardModal` показывается только для `users/{canonicalUid}/shard_rewards` — UID mismatch = "пофикшено без награды".

**Premium из админки:** менять поля синхронно:
- Выдача бессрочная: `progress.premium_plan` (`monthly`/`annual`) + `progress.admin_premium_override = 'true'`, `progress.premium_expiry = '0'` (или ключ убрать).
- Выдача на срок (кнопки в админке): тот же override + план `admin_grant` + `progress.premium_expiry` = UNIX ms строкой; приложение синкает ключ `premium_expiry` через `cloud_sync`.
- Снятие: сбросить `premium_plan`, `admin_premium_override`, `premium_expiry`. Иначе `premium_guard.ts` слетит.

**Бан:** проверять `banned_users/{uid}`, `users/{uid}.banned` и клиентские проверки доступа. Только UI админки ≠ работающий бан.

**Антидубли:** не смешивать `stable_id`, `auth.uid`, `anon_id` как ключи одного домена. Перед релизами с identity/sync — `scripts/dedup_users.js`, `scripts/dedup_leaderboard.js` в dry-run.

## Критические правила кратко

- **flashcards:** `const tr = lang === 'uk' ? (item.uk || item.ru) : item.ru` — всегда fallback. TTS кнопка обёрнута в `<View onStartShouldSetResponder={() => true}>`, без stopPropagation. `use-flashcards.ts` НЕ писать `uk: card.uk || card.ru` при загрузке.
- **premium_modal:** `showSuccess()` НЕ автозакрывает экран. Золотые цвета фиксированы: фон `#B8860B`, текст `#FFD700` — не заменять на `theme.accent`.
