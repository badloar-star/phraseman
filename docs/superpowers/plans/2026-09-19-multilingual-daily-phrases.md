# Multilingual Daily Phrases (ES, FR, DE) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Daily Phrase ready for isolated Spanish, French, and German study-target contours with native 176-row source-backed banks and hard anti-English-leak quality gates, while keeping production activation closed.

**Architecture:** Preserve English’s bundled catalogue as English-only. Generalise the existing French server-pack pattern into a target-neutral Daily Phrase pack registration, validator and adapter; every non-English target reads only a target/source scoped, hash-verified payload. The UI and quest consume a target-native `DailyPhrase` plus target-native quest pool, so target content never relies on UI-language fields.

**Tech Stack:** React Native/TypeScript, Jest/ts-jest, AsyncStorage, Firebase Storage server-pack manifests, static admin workflow modules, JSON content artifacts.

---

## File structure

- `app/study_target.ts`: internal target identity and production-closed target list.
- `app/target_storage_keys.ts`: target-scoped Daily Phrase keys for ES/FR/DE.
- `app/daily_phrase_system.ts`: target-only dispatch, no English fallback and unavailable result.
- `app/target_daily_phrase_remote_registration.ts` (new): target/source/surface pack registrations.
- `app/target_daily_phrase_remote_runtime.ts` (new): manifest/hash/payload adapter and native quest-pool cache.
- `app/daily_phrase_quest.ts`: target-native pool argument and deterministic option builder.
- `app/daily_phrase_target_gate.ts`: data readiness and unavailable-copy gate per target.
- `content/daily-phrases/{es,de}/...` (new): source-backed reviewed intake and build artifacts; `docs/gustav/runs/...` continues to own French historical evidence.
- `scripts/validate_target_daily_phrase_bank.mjs` (new): deterministic content/style/evidence validation.
- `scripts/review_target_daily_phrase_bank.mjs` (new): fixed input/output reviewer artifact contract; it must not make external API calls.
- `admin/v2/{spanish,german}-daily-phrases-{workflow,admin}.js` (new) and `admin/v2/legacy.html`: closed publication/rollback workflow only.
- `tests/target_daily_phrase_*.test.ts` (new): isolation, content, style, reviewer, runtime, quest and admin contracts.

### Task 1: Freeze the observed English contract in tests

**Files:**
- Create: `tests/target_daily_phrase_english_blueprint.test.ts`
- Test: `tests/daily_phrase_quest.test.ts`

- [ ] **Step 1: Write the failing blueprint test**

```ts
expect(IDIOMS).toHaveLength(176);
expect(buildDailyPhraseQuestOptions(phrase, IDIOMS, '2026-09-19')).toHaveLength(3);
expect(englishEntryFields).toEqual([
  'id', 'english', 'literal', 'meaning', 'text',
  'literal_uk', 'meaning_uk', 'text_uk',
]);
```

- [ ] **Step 2: Run the focused test and verify it fails because the shared blueprint export does not exist.**

Run: `npm test -- tests/target_daily_phrase_english_blueprint.test.ts --runInBand`

Expected: FAIL citing the missing blueprint export.

- [ ] **Step 3: Add the smallest typed English blueprint descriptor**

Export an immutable `DAILY_PHRASE_ENGLISH_BLUEPRINT` from a target-neutral module. It records 176, required explanation fields, 3 options and the no-production-activation policy; it does not change English selection.

- [ ] **Step 4: Re-run the focused test.**

Expected: PASS.

### Task 2: Make target identity and keys fail closed

**Files:**
- Modify: `app/study_target.ts`
- Modify: `app/target_storage_keys.ts`
- Create: `tests/target_daily_phrase_target_isolation.test.ts`

- [ ] **Step 1: Write failing target/key assertions**

```ts
expect(isStudyTarget('es')).toBe(true);
expect(isStudyTarget('de')).toBe(true);
expect(STUDY_TARGETS).toEqual(['en']);
expect(dailyPhraseKey('es')).toMatch(/^daily_phrase_v2::es::/);
expect(dailyPhraseKey('de')).toMatch(/^daily_phrase_v2::de::/);
expect(storageStudyTarget('unknown')).toBeNull();
```

- [ ] **Step 2: Run the focused test and verify expected failure.**

Run: `npm test -- tests/target_daily_phrase_target_isolation.test.ts --runInBand`

Expected: FAIL because ES/DE are coerced to English.

- [ ] **Step 3: Implement exact target validation and scoped keys**

Add `es` and `de` only to internal types/metadata; keep `STUDY_TARGETS` English-only. Replace Daily Phrase’s coercing lookup with a target resolver returning `StudyTarget | null`; scope all non-English daily phrase keys via `targetKey`.

- [ ] **Step 4: Re-run the target isolation test.**

Expected: PASS.

### Task 3: Define and validate target-native source artifacts

**Files:**
- Create: `content/daily-phrases/schema/target_daily_phrase_bank.schema.json`
- Create: `scripts/validate_target_daily_phrase_bank.mjs`
- Create: `tests/target_daily_phrase_bank_validator.test.ts`

- [ ] **Step 1: Write failing validator fixtures**

```ts
expect(validateBank(validBank)).toMatchObject({ status: 'PASS', acceptedRows: 176 });
expect(validateBank({ ...validBank, rows: validBank.rows.slice(1) }).errors)
  .toContain('count_must_equal_176');
expect(validateBank(withEnglishTargetText)).errors).toContain('target_language_leak');
expect(validateBank(withDuplicateMeaning)).errors).toContain('duplicate_meaning');
```

- [ ] **Step 2: Run the test and verify it fails because the validator is absent.**

Run: `npm test -- tests/target_daily_phrase_bank_validator.test.ts --runInBand`

Expected: FAIL with missing validator module.

- [ ] **Step 3: Implement schema and deterministic validator**

Validate exact target/source/surface, 176 rows, unique normalized ids/target text/meanings, all RU/UK explanatory fields, per-row source URL and checked date, accepted reviewer decision, no placeholders/mojibake, target text in its own example, and length-band parity against the English corpus. Emit machine-readable errors keyed by row id.

- [ ] **Step 4: Re-run the validator test.**

Expected: PASS.

### Task 4: Add closed ES and DE source-backed native banks

**Files:**
- Create: `content/daily-phrases/es/source-bank.json`
- Create: `content/daily-phrases/de/source-bank.json`
- Create: `content/daily-phrases/es/reviewer-decisions.json`
- Create: `content/daily-phrases/de/reviewer-decisions.json`
- Create: `tests/target_daily_phrase_content_es_de.test.ts`

- [ ] **Step 1: Write failing parity tests**

```ts
for (const target of ['es', 'de'] as const) {
  const bank = readBank(target);
  expect(validateBank(bank)).toMatchObject({ status: 'PASS', acceptedRows: 176 });
  expect(new Set(bank.rows.map((row) => row.targetText))).toHaveSize(176);
  expect(bank.activationApproved).toBe(false);
}
```

- [ ] **Step 2: Run the test and verify it fails because banks do not exist.**

Run: `npm test -- tests/target_daily_phrase_content_es_de.test.ts --runInBand`

Expected: FAIL with missing bank fixture.

- [ ] **Step 3: Build each bank from row-level trusted evidence**

Create 176 native expressions per target, with independent RU/UK explanatory copy and native contextual examples. Capture source evidence per row from approved dictionaries; create an auditable accepted/rejected reviewer decision for every row. Do not derive a row by translating the corresponding English row.

- [ ] **Step 4: Run content and validator gates.**

Run: `npm test -- tests/target_daily_phrase_content_es_de.test.ts tests/target_daily_phrase_bank_validator.test.ts --runInBand`

Expected: PASS.

### Task 5: Generalise the hash-verified remote pack runtime

**Files:**
- Create: `app/target_daily_phrase_remote_registration.ts`
- Create: `app/target_daily_phrase_remote_runtime.ts`
- Modify: `app/daily_phrase_system.ts`
- Modify: `app/daily_phrase_target_gate.ts`
- Create: `tests/target_daily_phrase_runtime.test.ts`

- [ ] **Step 1: Write failing runtime dispatch tests**

```ts
expect(getTodayPhraseSyncForTarget('es', 'ru')).toBeNull();
expect(getTodayPhraseSyncForTarget('de', 'uk')).toBeNull();
expect(runtimeSource).not.toContain('getIdiomsSync');
expect(systemSource).not.toContain("return getTodayPhraseSync(); // non-English");
```

- [ ] **Step 2: Run test and verify it fails because ES/DE use the English fallback.**

Run: `npm test -- tests/target_daily_phrase_runtime.test.ts --runInBand`

Expected: FAIL at the English fallback assertion.

- [ ] **Step 3: Implement target-neutral pack registration and adapter**

Reuse French’s manifest and payload SHA-256 checks. The adapter accepts only matching target/source/surface and complete reviewed rows. `daily_phrase_system` routes `en` to English only, `fr/es/de` to the adapter only, and returns `null` on absent/invalid payload. Preserve French behaviour with compatibility tests.

- [ ] **Step 4: Re-run runtime tests plus French adapter tests.**

Run: `npm test -- tests/target_daily_phrase_runtime.test.ts tests/gustav_fr_daily_phrase_runtime_pack_adapter.test.ts --runInBand`

Expected: PASS.

### Task 6: Give the Daily Phrase quest a native target pool

**Files:**
- Modify: `app/daily_phrase_quest.ts`
- Modify: `components/DailyPhraseCard.tsx`
- Create: `tests/target_daily_phrase_quest.test.ts`

- [ ] **Step 1: Write a failing native-pool quest test**

```ts
const options = buildDailyPhraseQuestOptions(esPhrase, esPool, '2026-09-19');
expect(options).toHaveLength(3);
expect(options.filter((option) => option.isCorrect)).toHaveLength(1);
expect(options.every((option) => esPoolIds.has(option.id))).toBe(true);
expect(options.map((option) => option.label)).not.toContain(englishMeaning);
```

- [ ] **Step 2: Run it and verify it fails because `IDIOMS` is the fixed pool.**

Run: `npm test -- tests/target_daily_phrase_quest.test.ts --runInBand`

Expected: FAIL citing an English-pool option or absent pool parameter.

- [ ] **Step 3: Implement the minimal pool interface**

Accept a typed quest-pool entry list, preserve English as a default only inside the English caller, and have target runtime provide its matching cache. Keep deterministic FNV selection, id correctness, 50 XP, reduced motion and save behaviour unchanged.

- [ ] **Step 4: Re-run quest contracts.**

Run: `npm test -- tests/target_daily_phrase_quest.test.ts tests/daily_phrase_quest.test.ts tests/daily_phrase_quest_card_contract.test.ts --runInBand`

Expected: PASS.

### Task 7: Create dry-run delivery and live-admin workflow contracts

**Files:**
- Create: `admin/v2/spanish-daily-phrases-workflow.js`
- Create: `admin/v2/spanish-daily-phrases-admin.js`
- Create: `admin/v2/german-daily-phrases-workflow.js`
- Create: `admin/v2/german-daily-phrases-admin.js`
- Modify: `admin/v2/legacy.html`
- Create: `tests/target_daily_phrase_admin_workflow.test.ts`

- [ ] **Step 1: Write failing activation-closed workflow tests**

```ts
expect(workflow.createDraft(validManifest).activationApproved).toBe(false);
expect(workflow.createRollback(validManifest).writePath).toContain('/daily_phrase/');
expect(liveAdmin).toContain('renderSpanishDailyPhrasesAdmin');
expect(liveAdmin).toContain('renderGermanDailyPhrasesAdmin');
```

- [ ] **Step 2: Run the test and verify expected failure.**

Run: `npm test -- tests/target_daily_phrase_admin_workflow.test.ts --runInBand`

Expected: FAIL because ES/DE workflow modules are absent.

- [ ] **Step 3: Implement only guarded drafts/approval checks/rollback drafts**

Copy the French workflow shape with target-specific paths and manifest checks. Add scripts directly loaded by `admin/v2/legacy.html`; do not add a second admin surface, upload data, or enable a Remote Config flag.

- [ ] **Step 4: Re-run workflow and single-admin contracts.**

Run: `npm test -- tests/target_daily_phrase_admin_workflow.test.ts tests/admin_single_surface_contract.test.ts --runInBand`

Expected: PASS.

### Task 8: Run independent quality audits and close with evidence

**Files:**
- Create: `docs/gustav/runs/2026-09-19_es_de_daily_phrases/audit-summary.json`
- Create: `tests/target_daily_phrase_release_hold.test.ts`

- [ ] **Step 1: Write failing release-hold assertions**

```ts
expect(STUDY_TARGETS).toEqual(['en']);
for (const target of ['es', 'fr', 'de']) {
  expect(readFinalGate(target).activationApproved).toBe(false);
  expect(readFinalGate(target).gates.noEnglishFallback).toBe('PASS');
}
```

- [ ] **Step 2: Run and verify it fails before final audit artifacts exist.**

Run: `npm test -- tests/target_daily_phrase_release_hold.test.ts --runInBand`

Expected: FAIL with missing audit/final-gate data.

- [ ] **Step 3: Run three independent audits**

1. Deterministic schema/style/source-evidence validator over each target/source bank.
2. Runtime/quest isolation test suite, including an injected unavailable-pack case.
3. Fresh read-only requirement-by-requirement review against `specs/gustav-multilingual-daily-phrases-es-fr-de.md`.

Persist only concise machine-readable results; every non-PASS item names row ids and required repair.

- [ ] **Step 4: Re-run final release-hold and all focused suites.**

Run: `npm test -- tests/target_daily_phrase_*.test.ts tests/gustav_fr_daily_phrase_*.test.ts tests/daily_phrase_quest.test.ts tests/daily_phrase_locale.test.ts --runInBand`

Expected: PASS, with production activation still closed.
