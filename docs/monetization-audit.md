# Monetization Audit

Date: 2026-05-12

## Recommended Model

The best fit for the app is a course-first subscription model:

- Lessons 1-3 are free without starting a subscription.
- Lesson 4 and everything after it require Premium.
- If the user closes the lesson paywall, show the store-backed 3-day trial offer once, only when App Store / Google Play / RevenueCat reports a real trial on the selected product.
- Keep shards as a secondary consumable economy for arena refills, packs, and recovery moments, not as the main unlock for course content.

This is stronger than a blind 3-day free trial at install because the user reaches value first, then sees the paywall at a motivated moment. It also avoids giving the whole app away during a trial before the user understands the habit loop.

## Current Implementation

| Area | Current status | Decision |
| --- | --- | --- |
| Lessons | Lessons 1-3 free; lesson 4+ routed through Premium gate. Direct entry into lesson menu, lesson screen, words, help, irregular verbs, preposition drill, and next-lesson flow is guarded. | Good. Keep as core paywall. |
| Exit trial offer | Paywall close can show a 3-day trial modal when the store product has a real trial intro. Purchase still goes through App Store / Google Play via RevenueCat. | Good. This is the correct "with card" equivalent for stores. |
| Quizzes | Easy is free; medium/hard are Premium-gated. | Good. Keep medium/hard as Premium. |
| Trainer hub | One free trainer session per day for non-Premium; Premium gives unlimited smarter practice inside the same Words / Phrases / Arena sections. Direct session routes require a short-lived entry token. | Good. |
| Smart trainer | Direct route now checks Premium before loading. | Good. |
| Diagnosis trainer | Direct route now checks Premium before loading. | Good. |
| Flashcards | Saved flashcards are capped for non-Premium with `FREE_FLASHCARD_LIMIT = 20`. | Good. Consider showing the limit earlier in UI. |
| Stats and analytics | Deep stats use premium blur; phrase analytics gates pattern/trainer actions. | Good. Keep detailed insights Premium. |
| Arena | Non-Premium has energy/daily limits; Premium gets unlimited play. Ranked, hill, friend host, friend guest, room, rematch, match toast, and notification flows now reserve a short-lived `/arena_game` entry token. | Good. Keep QA coverage on push/rematch resume. |
| Themes | Premium-only themes are gated. | Good as a cosmetic Premium perk. |
| Streak/protection | Streak freeze and mastery convenience are monetizable, with shard fallback. | Good. Do not make basic streak viewing Premium. |
| Marketplace/packs | Packs/community content appear shard-based. | Good as separate economy, not subscription core. |

## Should Be Premium

- Course content after the first 3 lessons.
- Medium/hard quizzes and future advanced quiz modes.
- Unlimited trainer sessions and smarter personalized selection inside the normal trainer sections.
- Diagnosis trainer, pattern explanations, weak-point diagnosis, and deep phrase analytics.
- Unlimited arena energy / daily arena plays.
- Unlimited saved flashcards and advanced flashcard collections.
- Premium themes and cosmetic identity/status perks.
- Streak freeze, mastery replay convenience, and other protection mechanics.

## Should Stay Free

- Lessons 1-3.
- Easy quizzes.
- Basic daily tasks and basic progress signals.
- Viewing achievements and profile basics.
- A small daily trainer allowance.
- Limited flashcard saving.
- Enough arena access to feel the loop before hitting limits.

## Risks And Gaps

1. Push/rematch Arena flows are now tokenized, but they should get device QA because they depend on live navigation timing and notifications.

2. There are duplicate quiz entry surfaces, including tab and non-tab quiz screens. Keep the premium logic centralized if more quiz modes are added.

3. Old `lesson_b1` links are normalized to `course_after_lesson3` so analytics read as course-lock events, not B1-specific events.

4. `getVerifiedPremiumStatus()` returns Premium by default in `__DEV__` unless `tester_no_premium` is set. That is useful for development, but QA must explicitly test non-Premium with `tester_no_premium=true`.

5. Local premium fallback has a 24-hour RevenueCat grace window. That is user-friendly for network issues, but production analytics should distinguish verified store entitlement from local grace.

6. The 3-day offer depends on platform configuration. If App Store Connect / Google Play Console / RevenueCat offerings do not expose an intro trial, the app correctly should not promise 3 days locally.

## Next Implementation Queue

1. Run device QA from `docs/MONETIZATION_RELEASE_QA.md`:
   - iOS sandbox purchase sheet shows the real 3-day trial terms;
   - Android license tester purchase sheet selects the real trial offer;
   - lesson 4 direct route, trainer direct route, and arena direct route are blocked for free users.

2. Watch direct-block analytics after release:
   - `arena_direct_gate_blocked`;
   - `trainer_direct_gate_blocked`.

3. After QA, compare the lesson-3-to-paywall funnel:
   - lesson 3 completed;
   - `course_paywall_after_lesson3`;
   - exit trial offer shown;
   - purchase started;
   - purchase completed.

