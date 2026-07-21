# Learning V2 Multilingual and Writing Systems Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** PLANNED ONLY — DO NOT EXECUTE without a later explicit owner instruction.

**Goal:** Make Learning V2, Admin V2 generation and the app structurally capable of supporting major world languages and complex writing systems, with full first special packs for Chinese and Japanese.

**Architecture:** Add immutable language/script profiles and a typed Script Curriculum alongside the existing 17-family learning catalog. Content Studio generates and reviews profile-bound content; the app renders it through replaceable presentation ports. No script activity may falsify learning evidence or silently reuse an incompatible locale, renderer or normalization rule.

**Tech Stack:** TypeScript, React Native/Expo, Admin V2, Firebase Functions, canonical JSON/SHA-256 artifacts, Jest/RNTL/Playwright/Maestro, Unicode/Intl/CLDR-compatible data.

---

## Authority and stop rules

- Source design:
  `docs/superpowers/specs/2026-07-19-learning-v2-multilingual-writing-systems-design.md`.
- Existing 17 `V2ActivityFamily` values remain unchanged until a separate exact
  contract decision; Script Curriculum is not silently an eighteenth family.
- No implementation, generation, API use, deployment or production mutation is
  authorised by this document.
- Admin work is confined to `admin/v2/**`; legacy Admin files stay untouched.
- Chinese/Japanese content requires approved data provenance and a qualified
  linguistic reviewer.

## Workstream map

### Task 0 — Freeze decisions and normative schemas

**Planned files:**

- Create `modules/learning-v2/contracts/language_profile.ts`
- Create `modules/learning-v2/contracts/script_profile.ts`
- Create `modules/learning-v2/contracts/script_curriculum.ts`
- Create mirrored Functions contracts under `functions/src/content_studio/`
- Create focused shared corpus tests

**RED requirements:**

- language pair identity rejects missing source/target variants;
- profile hashes reject mutable workflow metadata;
- mixed-script languages accept multiple exact ScriptProfile refs;
- unsupported profile versions fail closed;
- Script Curriculum cannot masquerade as `V2ActivityFamily`;
- source/target/profile hash mismatch fails.

**Acceptance:** client and Functions share the same canonical corpus and hashes.

### Task 1 — Unicode, segmentation and normalization foundation

**Planned files:**

- Create `modules/learning-v2/language/grapheme_segmenter.ts`
- Create `modules/learning-v2/language/text_normalizer.ts`
- Create `modules/learning-v2/language/script_direction.ts`
- Create language-pair fixtures for Latin, Cyrillic, CJK, Hangul, Arabic,
  Hebrew, Devanagari and Thai

**RED requirements:**

- emoji/combining marks and grapheme clusters are never split;
- Japanese/Chinese/Thai validation does not require spaces;
- Arabic/Hebrew direction and logical focus order remain correct;
- normalization never collapses distinct target forms without profile authority;
- width, kana, diacritic and regional conversions are profile-controlled.

**Acceptance:** deterministic cross-platform corpus passes without naive
`string.length`, lowercase or whitespace assumptions.

### Task 2 — Script Curriculum and evidence boundary

**Planned files:**

- Create `modules/learning-v2/script/script_activity_catalog.ts`
- Create `modules/learning-v2/script/script_curriculum_graph.ts`
- Create `modules/learning-v2/script/script_evidence.ts`
- Create exact review/mastery policy contracts and tests

**RED requirements:**

- all 15 `ScriptActivityKind` values are exhaustive;
- tracing, recognition, reading, typing and free writing remain distinct;
- romanization selection never becomes target-script mastery;
- typed/IME evidence never becomes handwriting evidence;
- script progress and conversational progress are separately queryable.

**Acceptance:** every script node declares construct, input route, fallback and
evidence limitations.

### Task 3 — Admin V2 language and script profiles

**Planned nested workspaces inside the existing eight Content routes:**

- Mode Library: Language Profiles, Script Profiles, Character/Component Library
- Episode Builder: Script Curriculum
- Generation: Script Content Generation
- Review: Script Review and QA
- Preview: Script Preview Lab
- Release: Language/Script Release Readiness

**Planned modules:**

- `admin/v2/scripts/content-studio/language-profile-state.js`
- `admin/v2/scripts/content-studio/script-profile-state.js`
- `admin/v2/scripts/content-studio/script-curriculum-state.js`
- corresponding controllers/renderers and guarded callables

**RED requirements:**

- one screen has one primary task;
- browser never writes Firestore directly;
- profile version/hash and linguistic review are visible;
- unsupported generator capabilities fail before queue submission;
- stale source or data provenance invalidates review;
- Admin UI works at 375/768/1024/1440 px and RTL.

**Acceptance:** drafts can be created, reviewed, versioned and previewed without
touching production or legacy Admin.

No ninth Content page or new top-level Admin category is added.

### Task 4 — Script-aware generation recipes in the canonical DAG

The canonical 13 `V2GenerationStageKind` values remain unchanged. Add typed
script recipe/output discriminators under the existing stages:

- `v2_activity_instances`: script inventory and activity packs;
- `v2_activity_graph`: Script Curriculum sequence/prerequisites;
- `v2_asset_manifest`: fonts, glyphs, strokes, licences and provenance;
- `v2_localization`: locale-pair explanations and annotations;
- `v2_episode_bundle`: immutable Script Curriculum payloads;
- `v2_season_qa`: language/script QA and release blockers.

**Dependencies:** published language profile, published script profile, approved
source/provenance manifest and renderer support manifest.

**RED requirements:**

- stage plan is deterministic and hash-bound;
- generation cannot fabricate stroke/readings/provenance;
- every output carries locale/script/profile refs;
- duplicate/conflicting symbol IDs fail;
- linguistic review is required before seal;
- stale dependency invalidates preview/release.

**Stop condition:** if an output cannot be represented under the canonical 13
stages, stop and create a separate versioned stage-catalog decision. Do not add
a fourteenth kind in this workstream.

### Task 5 — Chinese special pack

**Deliverables:**

- Simplified/Traditional profiles;
- pinyin plus optional Bopomofo annotation profiles;
- hanzi/component/radical inventory;
- stroke-order and confusable datasets;
- graded Script Curriculum;
- browser and device fixtures;
- reviewer/provenance receipts.

**Acceptance:** recognition, reading, component and stroke routes remain
construct-honest; regional variants never substitute silently.

### Task 6 — Japanese special pack

**Deliverables:**

- hiragana, katakana and kanji profiles;
- kana modifiers/contractions/long-vowel rules;
- kanji component/stroke/readings dataset;
- furigana and romanization fade policies;
- mixed-script segmentation fixtures;
- graded Script Curriculum and QA receipts.

**Acceptance:** on/kun/context readings are modeled explicitly; romanization is
not canonical target content.

### Task 7 — Expansion proof packs

Create contract/renderer/generator fixtures for:

- Korean Hangul composition;
- Arabic contextual forms and RTL;
- Hebrew RTL/niqqud;
- Devanagari matras/conjuncts;
- Thai clusters/tones/segmentation;
- Greek/Cyrillic confusables.

**Acceptance:** adding any fixture requires data/profile content only plus an
already supported code-owned capability; otherwise release fails with a stable
missing-capability issue.

### Task 8 — App Writing System hub

**Planned presentation:**

- Writing System home;
- section map and daily script practice;
- symbol/component explorer;
- guided stroke player;
- recognition/reading/composition activities;
- Personal Script Review;
- language-aware settings for annotations and scaffolding.

**Acceptance:** first frame is stable, hidden screens are frozen, large text and
screen readers work, RTL focus is correct, stroke animation respects reduced
motion, and no renderer computes mastery.

### Task 9 — Kimi visual workstream

Use the package under `docs/v2/frontend-handoff/kimi-k3/`.

Kimi creates only isolated visual prototypes and frontend source. Codex validates
contract parity before importing any file. Required surfaces:

- Learning V2 mobile shell;
- Writing System hub;
- Chinese and Japanese modes;
- representative Korean and Arabic extensibility states;
- Admin V2 language/script profile, generation, review and preview pages;
- responsive browser Mode Lab.

**Acceptance:** Kimi delivery manifest is complete; browser preview and contact
sheets exist; no prohibited import/write is present; every component consumes
fixtures/view models and emits typed intents only.

### Task 10 — Integrated validation and staged release

Required gates:

- canonical corpus and hashes;
- Unicode/grapheme/segmentation corpus;
- generator determinism/provenance;
- qualified linguistic review;
- accessibility and RTL;
- font/glyph coverage;
- offline/cache behavior;
- browser previews;
- physical iOS/Android CJK/RTL receipts;
- no-progress PreviewEnvelope;
- staged lab/internal rollout and rollback.

Production remains blocked until exact language-pair release evidence passes.

## Planned execution order

```text
0 contracts
→ 1 Unicode foundation
→ 2 Script Curriculum
→ 3 Admin profiles
→ 4 generation DAG
→ 5 Chinese + 6 Japanese (parallel content lanes, one code writer)
→ 7 extensibility proofs
→ 8 app hub
→ 9 Kimi presentation import
→ 10 integrated gates
```

## Completion packet

The eventual handover must include exact profiles, hashes, source licences,
reviewers, generated artifacts, browser URLs, screenshots, device receipts,
test counts, changed files, no-production state and the next executable task.
