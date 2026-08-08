# Report Audio And Runtime Repairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every currently stale personal-plan recording, preserve deployed audio URLs, and repair every remaining report issue that can be reproduced from current source.

**Architecture:** Treat authored phrase text as the source of truth, regenerate only freshness-check failures, and overwrite the matching Firebase Storage object without rotating its download token. For the remaining reports, trace each UI-to-storage path, add one failing regression test per proven root cause, and make the smallest source change that turns it green.

**Tech Stack:** Expo/React Native, TypeScript, Jest/ts-jest, Node.js scripts, OpenAI `/v1/audio/speech`, Firebase Storage.

---

### Task 1: Preserve the deployed audio URL during forced replacement

**Files:**
- Modify: `scripts/upload_plan_audio_to_storage.mjs`
- Create: `tests/upload_plan_audio_token_preservation_contract.test.ts`

- [ ] **Step 1: Write the failing source-contract test**

```ts
test('forced upload reuses an existing Firebase download token', () => {
  expect(source).toContain('const existingToken = await objectExists(objectPath)');
  expect(source).toContain("typeof existingToken === 'string' ? existingToken : crypto.randomUUID()");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx jest --runTestsByPath tests/upload_plan_audio_token_preservation_contract.test.ts --no-cache --runInBand`
Expected: FAIL because forced uploads currently mint a new token before checking the object.

- [ ] **Step 3: Implement token preservation**

Move the object lookup before the force/skip branch, reuse the returned token when it is a string, and generate a UUID only when the object has no token.

- [ ] **Step 4: Run the test and verify GREEN**

Run the Step 2 command again. Expected: PASS.

### Task 2: Regenerate and publish every current stale plan clip

**Files:**
- Generated: `assets/audio/personal-plans-runtime/**`
- Generated: `app/personal_plan_runtime_audio_assets.generated.ts`
- Generated: `app/personal_plan_runtime_audio_assets.compact.generated.ts`
- Generated only if its token changes: `app/plan_audio_url_map.generated.ts`

- [ ] **Step 1: Prove the current stale set**

Run: `node scripts/check_all_audio_freshness.mjs --json`
Expected current evidence: one stale clip, `mitap_d004_content_unit_phrase_5`; zero missing phrase-audio entries.

- [ ] **Step 2: Generate with the explicit spend guard**

Run: `$env:PHRASEMAN_ALLOW_OPENAI_DEV_SPEND='1'; node scripts/regen_plan_listen_audio_targeted.mjs`
Expected: one MP3 regenerated through `/v1/audio/speech`, with registry target `We wait for the client.`

- [ ] **Step 3: Force-upload only that object while preserving its token**

Run: `node scripts/upload_plan_audio_to_storage.mjs --only-file=mitap-d004-content-unit-phrase-5.mp3 --force`
Expected: one object uploaded, zero failures, existing URL still valid.

- [ ] **Step 4: Verify local and remote readiness**

Run: `node scripts/check_all_audio_freshness.mjs --json`
Expected: `totalGaps: 0`.

### Task 3: Repair proven remaining report roots

**Files:**
- Modify only the exact flashcard, personal-plan navigation, lesson-audio, or daily-phrase files identified by read-only root-cause traces.
- Create one focused Jest regression test for each proven behavior.

- [ ] **Step 1: Record the failing path and working comparison for each report group**

Require exact evidence for flashcard pack purchase, Gavan day 8 alignment, lesson 28 audio, lesson 30 mismatch, and daily-expression saving. Do not change source for vague or non-reproducible reports.

- [ ] **Step 2: Write and run one failing test per proven root cause**

Run each new test with `npx jest --runTestsByPath <test> --no-cache --runInBand`; expected failure must name the missing or wrong behavior.

- [ ] **Step 3: Implement the smallest root-cause fix and rerun each test**

Expected: each new regression test passes without changing unrelated dirty files.

### Task 4: Final verification and review

**Files:**
- Verify all files changed by Tasks 1-3.

- [ ] **Step 1: Run audio freshness and focused Jest suites**

Expected: zero audio gaps and zero focused-test failures.

- [ ] **Step 2: Run TypeScript and diff gates**

Run: `npx tsc --noEmit --pretty false` and `git diff --check`. Report unrelated concurrent failures separately; do not repair them without scope evidence.

- [ ] **Step 3: Obtain independent TypeScript and release-risk review**

Expected: no P0-P2 findings in the task diff before any production release.
