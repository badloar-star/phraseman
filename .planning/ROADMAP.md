# Phraseman Roadmap

**Last updated:** 2026-05-03
**Current milestone:** v1.0 — Friends MVP
**Granularity:** Coarse (3 phases)

## Milestone v1.0: Friends MVP

**Goal:** Дать пользователям возможность находить друг друга, добавлять друзей и соревноваться внутри своего круга через отдельный Hall of Fame с недельным режимом.

**Success metric:** Активный пользователь добавляет ≥1 друга в первую неделю; ≥30% активных юзеров открывают Friends HoF хотя бы раз в неделю на 30-й день после релиза.

---

### Phase 1: Foundation — Friend Codes, Data Model, Security
**UI hint:** no (mostly backend, Firestore, security rules)

**Goal:** Заложить фундамент для системы друзей: уникальные friend codes, Firestore схема, security rules, weekly XP инфраструктура. Никакого UI на этой фазе — только данные, правила и Cloud Functions.

**Requirements:**
- FRIEND-04, FRIEND-05 (code generation + uniqueness)
- XP-01, XP-02, XP-03, XP-04 (weekly XP tracking + cron)
- SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06 (Firestore rules)
- TEST-01, TEST-06 (unit tests for code generation + cron)

**Plans:** 3 plans

Plans:
- [ ] 01-PLAN.md — Friend code generation + Firestore storage with canonical UID and transactional uniqueness (FRIEND-04, FRIEND-05, TEST-01, SEC-06)
- [ ] 02-PLAN.md — Weekly XP client tracking + Cloud Function reset cron Monday 00:00 UTC (XP-01..04, TEST-06)
- [ ] 03-PLAN.md — Firestore security rules for friends/friend_requests/friend_code_index (SEC-01..06)

**Success Criteria:**
1. New user gets a unique 6-char friend code auto-generated on first relevant action; verified no two users share a code (Cloud Function or transaction-based check).
2. `weekly_xp` field exists on all user progress documents and is incremented in lockstep with total xp on every XP gain.
3. `resetWeeklyXpCron` runs every Monday 00:00 UTC and zeroes `weekly_xp` for all users without touching total xp; verified via emulator test.
4. Firestore security rules allow correct friend-data writes and reject unauthorized writes; verified via rules test suite.
5. Existing global leaderboard flow (`pushMyScore`, `firestore_leaderboard.ts`) is unchanged; smoke test passes.

---

### Phase 2: Friend Requests & Friends List Screen
**UI hint:** yes (new screen, settings entry, friend code display, request actions)

**Goal:** Создать экран "Друзья" с моим кодом, полем ввода кода, списком друзей и входящими запросами. Полный жизненный цикл friend request: send → pending → accept/decline.

**Requirements:**
- FRIEND-01, FRIEND-02, FRIEND-03, FRIEND-06, FRIEND-07, FRIEND-08 (code display + lookup UI)
- REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06, REQ-07 (request lifecycle)
- LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, LIST-06, LIST-07, LIST-08, LIST-09 (Friends screen)
- TEST-02, TEST-03, TEST-05 (request state machine + atomic accept + ban filter)

**Success Criteria:**
1. User can navigate to Friends screen from a discoverable entry point and see own friend code with copy + share buttons.
2. User can paste/enter another user's code → if valid and not banned, friend request is sent; recipient sees it on their Friends screen.
3. Recipient can accept → both users immediately appear in each other's friends list; declined requests disappear from recipient's view.
4. Friends list scrolls smoothly with 50+ friends; banned users never appear; deletion works bidirectionally.
5. All edge cases handled: duplicate request, request to self, request to existing friend, request to banned user — clear UI feedback for each.

---

### Phase 3: Friends Hall of Fame + Arena Integration
**UI hint:** yes (new HoF screen with toggle, arena lobby modification)

**Goal:** Добавить отдельный Friends Hall of Fame с тогглером "Всё время / Эта неделя", встроить кнопку входа в "Путь героя", и расширить Arena lobby списком друзей под кнопкой "Пригласить".

**Requirements:**
- HOF-01, HOF-02, HOF-03, HOF-04, HOF-05, HOF-06, HOF-07 (Friends HoF screen)
- ARENA-01, ARENA-02, ARENA-03, ARENA-04 (Arena lobby friends list)
- TEST-04 (HoF weekly toggle data integrity)

**Success Criteria:**
1. User can open Friends HoF from "Путь героя" and see ranked list of self + all friends.
2. Toggle "Всё время / Эта неделя" switches data source between total xp and weekly_xp; user's row is highlighted; banned users excluded.
3. In Arena lobby, user sees scrollable friends list below "Пригласить друга" button; tapping a friend shares the existing arena invite link to that friend (system share sheet OR direct deeplink, depending on UX choice — locked in discuss-phase).
4. No regressions: existing global Hall of Fame, arena flow, share invite, and daily limit behave identically.
5. Empty states are friendly: "Эта неделя ещё не началась" / "У вас пока нет друзей — добавьте по коду".

---

## Out of Milestone (deferred to v1.1)

- **Phase 4 candidate**: Push notifications (FCM token storage, friend request push, weekly leader push, arena challenge push).
- **Phase 5 candidate**: Online presence + live arena challenge (RTDB onDisconnect or Firestore last_active polling, accept/decline within 60s window).
- **Phase 6 candidate**: Referral system (shards / premium-trial for inviting active friends).

---

## Phase Coverage Validation

All v1.0 requirements mapped to a phase:

| REQ-ID | Phase |
|--------|-------|
| FRIEND-01..03, 06..08 | 2 |
| FRIEND-04, 05 | 1 |
| REQ-01..07 | 2 |
| LIST-01..09 | 2 |
| HOF-01..07 | 3 |
| XP-01..04 | 1 |
| ARENA-01..04 | 3 |
| SEC-01..06 | 1 |
| TEST-01, 06 | 1 |
| TEST-02, 03, 05 | 2 |
| TEST-04 | 3 |

✓ 100% coverage.

---
*Last updated: 2026-05-03 after initialization*
