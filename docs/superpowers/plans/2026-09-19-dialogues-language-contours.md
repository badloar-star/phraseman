# Dialogues Language Contours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Dialogues feature independently safe and complete for English, Spanish, French, and German, so a target can be enabled only after its own reviewed content pack and runtime proof are available.

**Architecture:** Keep the global course rollout closed while introducing a dialogue-only, fail-closed target registry. A versioned pack owns target-native scenario/prompt/voice data; all clients and server callables resolve through it. The activation gate is the sole route authority and treats unknown or incomplete languages as unavailable, never as English.

**Tech Stack:** React Native/TypeScript, Firebase callable functions, Jest/tsx focused contract gates.

---

### Task 0: Establish the quality-agent contract before any target pack exists

**Files:**
- Create: `.agents/skills/dialogue-language-quality/SKILL.md`
- Create: `.agents/skills/dialogue-language-quality/references/roles.md`
- Test: `tests/dialogue_language_quality_agents_contract.test.ts`

- [ ] **Step 1: Define the six independent roles.** They are Target Contract
  Guardian, Scenario Pack Reviewer, Prompt Language Judge, Voice Locale Gate,
  State Isolation Judge, and Surface Matrix Gate. Each returns hash-bound
  `PASS`, `REVISE`, or `BLOCK`; an author never judges its own pack.
- [ ] **Step 2: Write the failing contract test.** It must reject a receipt
  without the target-pack hash, English benchmark hash, judge-prompt version,
  deterministic-gate report hash, all required roles, or a PASS verdict.
- [ ] **Step 3: Wire receipt validation into the activation gate.** A changed
  pack, prompt, voice manifest, or matrix report invalidates activation until a
  fresh independent review is available.
- [ ] **Step 4: Validate the skill and run the focused receipt test.**

---

### Task 1: Introduce a dialogue-only language registry

**Files:**
- Create: `app/dialogue_language_registry.ts`
- Create: `functions/src/dialogue_language_registry.ts`
- Test: `tests/dialogue_language_registry.test.ts`
- Test: `functions/src/dialogue_language_registry.test.ts`

- [ ] **Step 1: Write failing registry tests.** Assert the exact supported codes
  `en`, `es`, `fr`, `de`; their names and BCP-47 speech locales; unknown input
  produces `null`, never `en`; and client/server metadata have the same version.
- [ ] **Step 2: Run the tests and observe the missing-module failure.**
  `npm test -- tests/dialogue_language_registry.test.ts --runInBand --watchman=false`
- [ ] **Step 3: Implement the immutable registry.** Export `DialogueStudyTarget`,
  `DIALOGUE_STUDY_TARGETS`, `resolveDialogueStudyTarget(value): DialogueStudyTarget | null`,
  target display names, `speechLocale`, and `registryVersion`. Do not reuse
  `storageStudyTarget`, which is intentionally lossy outside dialogue storage.
- [ ] **Step 4: Re-run both focused registry tests.** Expected: all pass.

### Task 2: Make scenario content target-native

**Files:**
- Create: `app/dialogue_language_packs.ts`
- Modify: `app/ai_dialog_scenarios.ts`
- Test: `tests/dialogue_language_packs.test.ts`

- [ ] **Step 1: Write failing tests for each target.** For every public scenario,
  require a target pack record with non-empty native `title`, `goal`, `role`,
  `setting`, `persona`, `hint`, and 4–7 unique objectives. Assert no field is
  inherited from English for `es`, `fr`, or `de` and medical scenes retain the
  safe-practice boundary.
- [ ] **Step 2: Implement the `DialogueLanguagePackV1` schema.** Store scenario
  text beneath `scenarios[scenarioId]`, keep IDs/categories/CEFR shared, and
  remove `goalEn` as a server payload source. `dialogScenarioForTarget()` must
  return `null` for an absent pack or scenario.
- [ ] **Step 3: Author and review complete ES/FR/DE packs.** Add provenance
  receipts naming the reviewer and content hash. Include target-native scenario
  greetings in `app/ai_dialog_greeting.ts` and the target-native companion
  opener; English local openers must not survive target selection. This step is
  blocked until the separate native-language review is available; it must not
  use mechanical translation or copy English target text.
- [ ] **Step 4: Run scenario and pack tests.** Expected: all targets complete;
  current English scenario tests still pass.

### Task 3: Fail closed at every Dialogues entry point

**Files:**
- Modify: `app/ai_dialog_target_gate.ts`
- Modify: `components/DialogsTabContent.tsx`
- Modify: `app/ai_dialog_home.tsx`
- Modify: `app/ai_dialog_briefing.tsx`
- Modify: `app/ai_dialog_session.tsx`
- Modify: `app/ai_companion_session.tsx`
- Test: `tests/ai_dialog_target_gate.test.ts`
- Test: `tests/ai_dialog_no_english_fallback_contract.test.ts`

- [ ] **Step 1: Write failing parameterised tests.** For `es`, `fr`, `de`, assert
  an incomplete pack blocks every route and does not initialise energy, quota,
  purchase, warmup, or prompt call. For a complete pack assert the selected
  target is passed through unchanged.
- [ ] **Step 2: Replace the French-only gate.** Return a structured reason keyed
  by target and missing evidence, use raw target resolution, and make unknown
  target unavailable. Localise the unavailable screen through interface copy;
  never claim that English content is available.
- [ ] **Step 3: Gate every route before side effects.** Apply the same gate to
  catalogue, briefing, scenario, companion and tutor entry flows. A blocked
  target renders only its unavailable state; it cannot display English tiles or
  use the `coffee` fallback.
- [ ] **Step 4: Run entry/flow/gate tests.** Expected: no route opens or charges
  on a missing pack; English flow remains unchanged.

### Task 4: Parameterise all server dialogue callables

**Files:**
- Create: `functions/src/dialogue_ai_language_contract.ts`
- Modify: `functions/src/premium_dialog.ts`
- Modify: `functions/src/premium_dialog_stream.ts`
- Modify: `functions/src/premium_dialog_review.ts`
- Test: `functions/src/premium_dialog_prompt.test.ts`
- Test: `functions/src/premium_dialog_stream_quality.test.ts`
- Test: `functions/src/premium_dialog_review.test.ts`

- [ ] **Step 1: Write failing tests for Spanish and German.** Cover scenario,
  companion, stream, review, translation and how-to-say prompts. Each must say
  only the selected target language, reject a wrong-language response, and
  retain the interface language only in designated coach/translation fields.
- [ ] **Step 2: Implement a dialogue-specific server contract.** It must reject
  unknown targets with `invalid-argument` rather than defaulting to English;
  preserve the existing general AI language contract for non-dialogue features.
- [ ] **Step 3: Replace language-specific safety fallbacks.** Add reviewed,
  target-native regulated-advice fallbacks and validate them with the target
  reply guard.
- [ ] **Step 4: Run all focused callable tests.** Expected: EN/ES/FR/DE matrix
  passes for send, stream, review and translation.

### Task 5: Isolate dialogue state and audio

**Files:**
- Modify: `app/dialogs_progress.ts`
- Modify: `app/ai_dialog_ownership.ts`
- Modify: `app/ai_dialog_daily_quota.ts`
- Modify: `app/ai_dialog_hint_economy.ts`
- Modify: `app/ai_dialog_client.ts`
- Modify: `app/ai_dialog_stream_client.ts`
- Test: `tests/dialogue_language_state_isolation.test.ts`
- Test: `tests/dialogue_language_voice_contract.test.ts`

- [ ] **Step 1: Write failing isolation tests.** Complete/purchase/hint/quota
  data written for one target must not appear in any other target. Translation
  cache identity must include the dialogue target and pack version.
- [ ] **Step 2: Add `dialogue_v1::<target>::…` storage keys and migration-safe
  reads.** English legacy keys may be read only for English; ES/FR/DE must never
  read them.
- [ ] **Step 3: Bind TTS/ASR to pack speech locale.** No target may use
  `en-US` as a fallback. Cover scenario, companion, tutor, phrase and review
  playback plus recognition. Unavailable voice evidence blocks activation.
- [ ] **Step 4: Run state and voice tests.** Expected: four isolated namespaces
  and no cross-target audio request.

### Task 6: Add a release-grade language-contour gate

**Files:**
- Create: `tests/dialogue_language_contours_gate.ts`
- Modify: `package.json`
- Modify: `docs/work/tasks/2026-09-19-dialogues-language-contours-audit.md`

- [ ] **Step 1: Write a failing static/runtime matrix gate.** It must inspect
  client routes, all dialogue callables, packs, receipts, storage keys and
  speech locales for `en/es/fr/de`.
- [ ] **Step 2: Add `npm run dialogues:language-contours-gate`.** The command
  fails on missing content/evidence, unknown-to-English fallback, English text
  in an activated non-English pack, or an ungated entry path.
- [ ] **Step 3: Run the gate, existing Dialogues tests, and affected function
  tests under the repository heavy-process semaphore.** Record exact commands,
  exit status and findings in the audit document.
- [ ] **Step 4: Require the gate in the language-picker launch checklist.** A
  separate approved rollout change may add a target to the production picker
  only after this gate is green; this plan itself does not activate languages.

## Plan self-review

Coverage: all reported leak paths are owned by Tasks 1–6. The plan deliberately
separates platform mechanics from learner-facing native authoring and does not
permit an incomplete pack to become selectable. No task weakens a gate or uses
the project OpenAI credential from Codex.

## Resume checkpoint — 2026-09-20 10:31 UTC

Read the latest checkpoint in
`docs/work/tasks/2026-09-19-dialogues-language-contours-audit.md` before using the
historical unchecked steps above as a status report. Native content is complete
and independently reviewed (51 scenes / 253 actions per ES/FR/DE), but that is
not release approval. The current client regression is 43 suites / 262 tests
PASS. Tutor integration, strict voice availability, server pack binding and the
final release-grade evidence gate remain in progress.

Clarification to Task 5: isolate linguistic content, progress, ownership and
target-local state. Preserve the owner-approved account-global daily AI reply
allowance and generic paid +10 grant; creating a per-language server allowance
would multiply the revenue entitlement without authorization. Local mirrors
must reflect that same account-global server fact, not pretend there are four
independent allowances.
