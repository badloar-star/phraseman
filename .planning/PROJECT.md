# Phraseman

**Last updated:** 2026-05-03 (initialization)
**Status:** Brownfield — production app, adding social features

## What This Is

Phraseman — мобильное приложение (iOS + Android) для изучения английских **фразовых глаголов** с локализацией под русский и украинский языки. Уже в продакшене.

**Core Value:** Помочь пользователю запомнить и научиться использовать английские phrasal verbs через короткие интерактивные уроки, повторение, геймификацию и соревнование.

## Tech Stack

| Слой | Технология |
|------|------------|
| Фронтенд | React Native + Expo (SDK), TypeScript |
| Навигация | expo-router (file-based) |
| Backend | Firebase (Firestore + Auth + Cloud Functions + App Check + Remote Config + FCM) |
| Аудио | expo-speech (TTS) — централизовано через `useAudio` hook |
| Платежи | RevenueCat (iOS App Store + Google Play) |
| Билды | EAS Build (profiles: production / preview / development) |
| Локали | RU, UK |
| Аналитика | Firebase Crashlytics |

## Existing Capabilities (Validated)

### Контент и обучение
- ✓ 32 урока по фразовым глаголам — существуют
- ✓ Flashcards: предзаданные + пользовательские карточки — существует
- ✓ Active recall практика — существует
- ✓ TTS озвучка фраз/слов/диалогов через `useAudio` hook — существует
- ✓ Лессоны (lesson_X.tsx) с разными режимами (verbs, sentences, dialog, etc.) — существует
- ✓ UGC packs (community packs) с editor preview — существует
- ✓ Daily phrase — существует

### Геймификация
- ✓ XP система с уровнями и аватарами по уровню (`getLevelFromXP`, `getBestAvatarForLevel`) — существует
- ✓ Achievements (RU + ES локали) — существует
- ✓ Energy system (с модальными окнами) — существует
- ✓ Shards (валюта) с rewards модалью — существует
- ✓ League system + результаты — существует

### Соревнование (Arena)
- ✓ Arena PvP матчи — существует (`arena_game`, `arena_join`, `arena_lobby`)
- ✓ Arena rating + leaderboard — существует
- ✓ Arena daily limit (5 матчей/сутки для free, unlimited для premium) — существует
- ✓ "Играть с другом" через invite link (deeplink) — существует
- ✓ Duel deeplink flow — существует (см. `docs/DUEL_DEEPLINK_FLOW.md`)

### Социальное (минимум)
- ✓ Hall of Fame (глобальный лидерборд) — существует
- ✓ Avatar selection — существует
- ✓ Profile name editing — существует
- ✓ Beta testers tooling — существует

### Премиум
- ✓ Premium через RevenueCat (monthly + annual) — существует
- ✓ Admin override premium (`admin_premium_override` + `premium_expiry`) — существует
- ✓ Premium guard (`premium_guard.ts`) — существует

### Инфраструктура
- ✓ Canonical UID (`getCanonicalUserId()`) — существует
- ✓ App Check защита от абуза — существует
- ✓ Cloud Functions sync (leaderboard cron каждые 2 часа) — существует
- ✓ User report system (bug reports + admin "Пофикшено" с наградой) — существует
- ✓ Ban system (`banned_users/{uid}`) — существует
- ✓ Onboarding flow — существует
- ✓ Tab UI (Home / Quizzes / Hall of Fame / Settings) — существует

## Current Milestone: Friends MVP (v1.0 — социальные функции)

**Goal:** Добавить базовую социальную сеть друзей для повышения retention и мотивации.

### Active Requirements (в работе)

- [ ] User can find another user by 6-character friend code
- [ ] User can send/accept/decline friend requests
- [ ] User can view their friends list (sorted by XP, no limit)
- [ ] User can view friends-only Hall of Fame with all-time / weekly XP toggle
- [ ] User can copy own friend code and share via deeplink
- [ ] User can see friends list under "Invite to Arena" button (share invite link to specific friend)
- [ ] User can remove a friend
- [ ] Banned users do not appear in friend lookup or friends list

### Out of Scope (для этого milestone)

- Push-челлендж в арену (нажать "Вызвать на арену" → push другу) — **отложено в фазу 2**, требует FCM token storage + presence system + invite states.
- In-app toast invite если друг онлайн — **отложено**, требует presence system (Firestore last_active или RTDB onDisconnect).
- Auto-import друзей из контактов телефона — **отложено навсегда** для MVP. Privacy риски: телефон не привязан к аккаунту в Phraseman, нужен hash matching на сервере, GDPR consent. Friend codes покрывают 95% сценариев.
- Поиск пользователей по никнейму — **отложено**, риск сталкинга. Friend codes безопаснее.
- Чаты/сообщения между друзьями — **out of scope** для Phraseman (это language learning app, не messenger).
- Friend-only achievements — **отложено**.

## Key Constraints

- **Canonical UID везде** (правило CLAUDE.md). Любой friend-related field в Firestore должен использовать canonical UID, не `anon_id` и не `stable_id`.
- **Privacy:** в friends list / HoF показывать только nick, xp, avatar, level. Никогда не показывать email, UID, последний онлайн (без дополнительной фичи presence).
- **Banned users:** проверка `banned_users/{uid}` обязательна при friend lookup и при отображении HoF.
- **TTS не используется** в этой фиче — friends чисто визуальная подсистема.
- **Существующий лидерборд НЕ ТРОГАТЬ:** глобальный leaderboard работает через `pushMyScore` + Cloud Function `syncLeaderboardCron`. Friends HoF — отдельная подсистема.
- **Premium-агностично:** друзья доступны всем юзерам (free + premium), без gating.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Friend codes (6 символов, base32 без `0/O/1/I/L`) | Защита от typo при ручном вводе. Стандарт индустрии. | — Pending |
| Friend requests требуют accept (не auto-add по коду) | Anti-spam, anti-stalking. | — Pending |
| Friends HoF: тогглер "Всё время / Эта неделя" | Мотивация для новичков (недосягаемые old-timers vs честная weekly борьба). | — Pending |
| Без auto-import контактов | Privacy риски, нет привязки телефона к аккаунту. | — Pending |
| Без push-челленджа в арену в MVP | Требует FCM + presence + invite states — это отдельная инфраструктура. | — Pending |
| Friends list без лимита (или мягкий cap 200) | У среднего юзера < 30 друзей. 100-местный cap (как в global HoF) — overkill. | — Pending |

## Critical Files & Modules (Reference)

Из CLAUDE.md и docs/:

- `app/firestore_leaderboard.ts` — глобальный лидерборд (НЕ ТРОГАТЬ для friends)
- `app/xp_manager.ts` — XP накопление, `pushMyScore` (НЕ ТРОГАТЬ)
- `app/auth_provider.ts` — auth + canonical UID
- `app/(tabs)/hall_of_fame.tsx` — глобальный HoF UI
- `app/arena_lobby.tsx` — арена, кнопки "Найти матч" / "Играть с другом"
- `app/arena_join.tsx` — приём арены-инвайтов через deeplink
- `app/arena_daily_limit.ts` — дневной лимит арены
- `components/AvatarView.tsx` — рендер аватарки по уровню
- `app/(tabs)/settings.tsx` — настройки + потенциальное место для "Друзья" / "Мой код"
- `app/achievements_screen.tsx` — "Путь героя" (где будет кнопка Friends HoF)
- `app/firestore_*.ts` — Firestore wrappers
- `firestore.rules` — security rules (нужно расширить)
- `functions/src/` — Cloud Functions (нужно добавить weekly_xp reset cron)

## Project Documentation

Доки уже существуют — для контекста:

- `CLAUDE.md` — правила, инварианты, критичные правила (лидерборд, арена, премиум, UID)
- `docs/ARCHITECTURE.md` — модульная архитектура, разделение flashcards / settings / home
- `docs/ARENA_FIRESTORE_CONTRACT.md` — Firestore contract для арены
- `docs/ARENA_MATCHMAKING.md`, `docs/ARENA_QUALITY_REPORT.md` — арена
- `docs/DUEL_DEEPLINK_FLOW.md` — deeplink-флоу для дуэлей
- `docs/HOME_DEPENDENCIES.md` — зависимости home.tsx
- `docs/FLASHCARDS_RULES.md` — правила flashcards
- `docs/PREMIUM_MODAL_RULES.md` — правила premium modal
- `docs/ENERGY_SYSTEM.md` — энергия

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-03 after initialization*
