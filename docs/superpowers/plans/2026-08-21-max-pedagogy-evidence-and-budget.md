# MAX Pedagogy Evidence And Time-Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MAX teach one clear English speaking goal at the learner's real level, adapt the lesson to the allotted call time, treat uncertain speech neutrally, and only advance durable progress from bounded evidence.

**Architecture:** Keep `goalMastery` as the durable projection, but stop accepting arbitrary jumps: each completed lesson can advance a goal by at most one stage, and stage 3 requires a completed transfer scene after prior evidence. Replace boolean phrase results with a four-state speech result while accepting legacy booleans. Keep subscription products and prices outside this change; the prompt adapts to the actual duration supplied by the session.

**Tech Stack:** TypeScript, Firebase Functions, OpenAI Realtime tool schemas, React Native, Jest.

---

### Task 1: Preserve the learner's CEFR floor

**Files:**
- Modify: `functions/src/max_voice_can_do_goals.ts`
- Test: `functions/src/max_voice_can_do_goals.test.ts`

- [ ] Add a failing test showing an A2 learner with one completed A2 goal remains on A2 and a B1 learner remains on B1.
- [ ] Run `cd functions && npx jest --runInBand --no-cache src/max_voice_can_do_goals.test.ts`; expect the new cases to fail with A1.
- [ ] Change `levelFromMastery` to begin at the fallback CEFR floor and only evaluate that level and higher levels.
- [ ] Re-run the focused test; expect PASS.

### Task 2: Lock MAX to English while preserving eight explanation languages

**Files:**
- Modify: `functions/src/max_voice_prompt.ts`
- Modify: `functions/src/max_voice_mint.ts`
- Test: `functions/src/max_voice_prompt.test.ts`
- Test: `functions/src/max_voice_mint.test.ts`

- [ ] Add failing tests for Russian, Ukrainian, Spanish, Brazilian Portuguese, Vietnamese, Indonesian, Turkish, and Polish interface codes, plus an unknown-code fallback that is not Russian.
- [ ] Add a failing tutor mint test proving `studyTarget: 'fr'` cannot inject French or English-goal translation-on-the-fly into MAX.
- [ ] Run both focused suites and verify RED.
- [ ] Make English the only tutor study target and make an unknown explanation language fall back to English, while leaving non-tutor language contracts unchanged.
- [ ] Re-run both focused suites and expect PASS.

### Task 3: Replace binary spoken retrieval with four-state evidence

**Files:**
- Modify: `app/max_call_tutor_tools.ts`
- Modify: `functions/src/max_voice_prompt.ts`
- Modify: `functions/src/max_voice_tutor_memory.ts`
- Modify: `functions/src/premium_dialog_review.ts`
- Test: `tests/max_call_tutor_tools.test.ts`
- Test: `functions/src/max_voice_tutor_memory.test.ts`

- [ ] Add failing tests for `pass`, `needs_work`, `uncertain`, and `invalid`; uncertain/invalid must leave the queue unchanged.
- [ ] Verify both focused tests fail because only `ok: boolean` exists.
- [ ] Add the result enum to the tool and memory types, preserve legacy `ok` input at the server boundary, and only mutate spacing for confident outcomes.
- [ ] Update prompt wording so unclear audio causes clarification without correction or penalty.
- [ ] Re-run both focused suites and expect PASS.

### Task 4: Derive mastery from bounded lesson evidence

**Files:**
- Modify: `functions/src/max_voice_tutor_memory.ts`
- Modify: `functions/src/max_voice_prompt.ts`
- Modify: `app/max_call_tutor_tools.ts`
- Test: `functions/src/max_voice_can_do_goals.test.ts`
- Test: `tests/max_call_tutor_tools.test.ts`

- [ ] Add failing tests proving a new goal cannot jump from 0 to 3 in one lesson, progress advances at most one stage, and stage 3 requires a prior stage plus `sceneOutcome: 'done'`.
- [ ] Verify RED against the current absolute mastery merge.
- [ ] Pass the scene outcome into goal projection and clamp advancement to evidence rules without lowering earned progress.
- [ ] Rewrite the tool description as an observed lesson result rather than authority to close the goal.
- [ ] Re-run focused tests and expect PASS.

### Task 5: Adapt the teaching plan to actual allotted minutes

**Files:**
- Modify: `functions/src/max_voice_prompt.ts`
- Test: `functions/src/max_voice_prompt.test.ts`

- [ ] Add failing prompt-contract tests for quick, focused, and extended duration bands communicated through the trusted time note.
- [ ] Verify RED because the opening currently checks every due and homework phrase.
- [ ] Add duration rules: quick calls use one goal and at most one retrieval; focused calls use one goal, up to two retrievals and an optional short scene; extended calls retain one goal and add longer transfer/conversation.
- [ ] Require MAX to state the available time and the compact plan once at the start.
- [ ] Re-run the focused prompt suite and expect PASS.

### Task 6: Reduce correction load and make learner agency explicit

**Files:**
- Modify: `functions/src/max_voice_prompt.ts`
- Modify: `functions/src/premium_dialog_review.ts`
- Test: `functions/src/max_voice_prompt.test.ts`
- Test: `functions/src/premium_dialog_review.test.ts`

- [ ] Add failing tests for the correction ladder, a maximum of three review items, at most one polish item, and one meaningful learner choice when time permits.
- [ ] Verify RED against mandatory repeat-after-every-correction and the eight-item review.
- [ ] Implement recast / focused correction / uncertainty clarification rules and replace controlling teacher language with confident guidance plus bounded choice.
- [ ] Cap the review at one main fix plus two detail items.
- [ ] Re-run focused tests and expect PASS.

### Task 7: Make homework complete and retrieval-based

**Files:**
- Modify: `app/max_call_tutor_tools.ts`
- Modify: `app/max_voice_review.tsx`
- Test: `tests/max_call_tutor_tools.test.ts`
- Test: `tests/max_voice_review_projection.test.ts`

- [ ] Add failing tests proving homework is limited to three items, every item needs a meaning, and the fallback asks for one unaided contextual use rather than three repetitions.
- [ ] Verify RED.
- [ ] Reject incomplete homework atomically and replace the fallback copy in all supported UI languages.
- [ ] Re-run the focused tests and expect PASS.

### Task 8: Focused verification

**Files:**
- Verify only; no source changes unless a failing gate reveals a scoped regression.

- [ ] Run client tests: `npx jest --runInBand --no-cache tests/max_call_tutor_tools.test.ts tests/max_voice_review_projection.test.ts`.
- [ ] Run functions tests: `cd functions && npx jest --runInBand --no-cache src/max_voice_prompt.test.ts src/max_voice_can_do_goals.test.ts src/max_voice_tutor_memory.test.ts src/premium_dialog_review.test.ts src/max_voice_mint.test.ts`.
- [ ] Confirm no project OpenAI API call was made.
- [ ] Review the final diff only for the files in this plan and report unresolved product hypotheses separately from implemented invariants.
