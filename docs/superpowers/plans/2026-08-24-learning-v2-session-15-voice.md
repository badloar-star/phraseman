# Learning V2 Session 15 Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `executing-plans` and `test-driven-development`. This packet is intentionally limited to one English authoring session and one writer.

**Goal:** Produce an owner-reviewable `AUTO_PASS` candidate for English Lesson 1, session 15: a twelve-interaction voice-heavy rehearsal of already introduced `I/you` questions, answers, and locations.

**Architecture:** Keep the existing source → shard → five-child package route. Add only explicit author-written session-15 copy and feedback, extend the existing per-session projection hooks, and prove the exact learner-visible result with one focused gate before building the real interactive owner mock.

**Tech Stack:** TypeScript source content, `tsx` deterministic gates, existing Learning V2 choreography and HTML owner-mock builder.

---

### Task 1: Freeze the RED contract

**Files:**
- Create: `tests/learning_v2_episode_01_session_15_editorial_gate.ts`
- Modify: `package.json`
- Modify: `tests/learning_v2_lesson1_authoring_registry_gate.ts`

- [ ] Assert session 15 is `voice`, `voice_heavy`, `3 intro + 9 practice`, and depends on sessions 11–14.
- [ ] Assert the exact fifteen-item familiar phrase bank and the nine-family voice choreography.
- [ ] Assert three explicit `concept → formula → trap` bodies exist in all eight locales, are substantial causal prose, contain no course machinery, and preserve semantic target runs.
- [ ] Assert all listening/sound choices are close contrasts, every visible wrong option has unique locale-native feedback, and every success message shows the target once.
- [ ] Add the focused gate to the canonical authoring command.
- [ ] Run `npx tsx tests/learning_v2_episode_01_session_15_editorial_gate.ts`; expected RED is missing session-15 editorial content/projection.

### Task 2: Write the candidate content

**Files:**
- Modify: `modules/learning-v2/content/source/episode_01_session_map_v1.ts`
- Modify: `modules/learning-v2/content/source/episode_01_editorial_intro_bodies_11_15_v3.ts`
- Create: `modules/learning-v2/content/source/episode_01_session_15_editorial_copy_v1.ts`
- Create: `modules/learning-v2/content/source/episode_01_session_15_task_feedback_v1.ts`
- Modify: `modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1.ts`
- Modify: `modules/learning-v2/content/source/session_package_from_shard_v1.ts`

- [ ] Add session 14 to session 15 prerequisites/recall without changing any other map entry.
- [ ] Write all three intro bodies manually for `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, and `pl`; do not generate or mechanically interpolate them.
- [ ] Replace the phrase bank with fifteen familiar question/answer/location phrases and attach explicit meaning/explanation copy for every phrase and locale.
- [ ] Add exact feedback for every listening and sound contrast used by the nine practice cards.
- [ ] Wire the content through the existing shard/package path without adding a new activity family or acoustic-quality claim.
- [ ] Run the focused gate until GREEN.

### Task 3: Materialize and verify the owner candidate

**Files:**
- Modify: `modules/learning-v2/content/source/lesson1_authoring_registry_v1.ts`
- Modify: `tests/learning_v2_lesson1_authoring_registry_gate.ts`
- Create in ignored temp: `.codex-tmp/learning-v2-authoring-registry/session-15-real.html`
- Create in ignored temp: `.codex-tmp/learning-v2-authoring-registry/session-15-real-data.js`

- [ ] Run the focused session-15 gate, task-distractor gate, target-language visual gate, and canonical authoring gate.
- [ ] Compute the exact candidate fingerprint and record session 15 as `AUTO_PASS`; keep 16–56 frozen.
- [ ] Build the real interactive mock from source using `node scripts/build_learning_v2_lesson1_real_session_mock.mjs --from 15 --to 15` with explicit output paths.
- [ ] Re-run preflight and confirm `LOCKED 1–14`, `CURRENT 15`, `CURRENT STATUS AUTO_PASS`, `FORBIDDEN 16–56`.
- [ ] Do not lock session 15, open session 16, deploy, publish, push, or commit. Owner approval is the next gate.

