# Kimi K3 Complete Handoff — Phraseman Learning V2

## Start here

This is the only document you need from the owner. Read it completely before
working. It contains the product brief, constraints, execution sequence,
browser-preview requirements, quality gates and the exact delivery contract.

Act as the visual/frontend specialist for Phraseman Learning V2. Produce a
coherent, runnable visual prototype system that Codex can later inspect and
port into the real React Native application and Admin V2.

Do not ask the owner to copy additional prompts from another document. Execute
the phases in this document in order and maintain one delivery package.

## 1. Responsibility boundary

### Kimi owns

- visual direction and design-system refinement;
- responsive browser prototypes;
- mobile learning surfaces;
- Admin V2 visual surfaces;
- component composition and presentation-only interaction;
- motion and reduced-motion behavior;
- accessibility presentation;
- dark/light themes and large-text layouts;
- Chinese, Japanese, Korean and Arabic visual/script rendering;
- screenshots, contact sheets, interaction videos and visual QA;
- a clean, inspectable handoff package for Codex.

### Codex owns

- learning architecture and product truth;
- activity contracts, view models and typed intents;
- scoring, correctness and evidence;
- progress, mastery, stars, rewards and access;
- authentication, accounts, persistence and synchronization;
- Firebase, Firestore, Functions, Rules and indexes;
- content-generation logic and validation;
- security, privacy, migrations and production release;
- final React Native/Admin integration.

Presentation components must consume immutable mock view models and emit typed
mock intents. They must not make business decisions.

## 2. Product mission

Phraseman Learning V2 is an episode-based language-learning system with a
replaceable frontend. The visual layer must be polished enough for real product
evaluation while remaining independent from backend and learning-engine logic.

The architecture is multilingual from the beginning. It must support ordinary
alphabetic languages and complex writing systems without assuming Latin
characters, spaces between words, left-to-right direction or one glyph per
character.

Chinese and Japanese are the first complete special-script experiences.
Korean and Arabic are mandatory expansion proofs. The architecture must also
remain visually extensible to Hebrew, Devanagari, Thai, Greek and Cyrillic.

## 3. Canonical interface states

Use these six states consistently:

1. `prompt`
2. `active`
3. `processing`
4. `success`
5. `needs_work`
6. `recovery`

Keep the main geometry stable between states. Do not replace an entire screen
with a centered spinner. Processing, failure and recovery must preserve context.

## 4. Required mobile surfaces

Create runnable browser representations of:

1. Learning V2 episode map;
2. reusable Activity Scaffold;
3. Sound Discrimination;
4. Writing System hub;
5. Chinese pinyin and tone contrast;
6. Chinese hanzi recognition;
7. Chinese component/radical decomposition;
8. Chinese guided stroke order;
9. Chinese Personal Script Review;
10. Japanese hiragana introduction;
11. Japanese katakana introduction;
12. Japanese kanji reading selection;
13. Japanese kanji components and strokes;
14. Japanese furigana presentation;
15. Japanese Personal Script Review;
16. Korean Hangul syllable-composition proof;
17. Arabic RTL and contextual-form proof.

For each applicable activity, expose all six states plus online/offline,
permission, signal/result and recovery variants.

Annotations such as pinyin and furigana are independent visual layers. They
must not replace the underlying text. Treat user-visible strings as Unicode
grapheme clusters; never split combining marks, emoji sequences or script
clusters by code unit.

## 5. Required Admin V2 surfaces

Create responsive visual workspaces for:

1. Language Profiles;
2. Script Profiles;
3. Script Curriculum Builder;
4. Character and Component Library;
5. Script Content Generation;
6. Script Review and QA;
7. Script Preview Lab;
8. Language/Script Release Readiness.

These are nested workspaces inside the existing eight canonical Admin V2
Content routes. Do not create a ninth Content route or a new top-level Admin
category.

Script-aware generation must be represented through typed recipes and output
variants within the existing canonical 13 generation stages. Do not invent new
generation-stage kinds.

Admin presentation rules:

- simple categorized navigation;
- one primary action per page;
- icons accompanied by labels and tooltips;
- clear loading, empty, error, success, disabled and dirty states;
- human-readable labels before raw IDs or hashes;
- keyboard accessibility and logical focus order;
- no direct Firestore access;
- no production environment selector;
- no edits to legacy Admin;
- no excessive dashboards, decorative cards or visual clutter.

## 6. Browser Mode Lab

Build a portable local prototype using React/Vite or an equivalently portable
static frontend stack. It must run with one documented command and contain:

- surface navigator;
- locale and script selector;
- canonical-state selector;
- controls for online/offline, permissions, signal and result;
- light/dark theme selector;
- 100%, 150% and 200% text scale;
- full/reduced motion;
- phone, tablet and desktop frames;
- LTR and RTL direction;
- accessibility annotations;
- developer intent/event log;
- mock fixtures only;
- no real network calls or durable writes.

Every clickable prototype action must append a typed mock intent to the
developer log. It must never silently perform persistence, scoring or progress.

If Kimi Websites provides a share URL, include it as an optional convenience.
The local source package remains canonical.

## 7. Visual and accessibility rules

- premium, playful and calm rather than childish;
- one unmistakable primary action per state;
- dark/near-black text and icons on lime, neon green or bright salad surfaces;
- never white foreground on bright lime;
- minimum touch targets: 44 pt iOS and 48 dp Android;
- normal text contrast: at least 4.5:1;
- meaningful non-text controls: at least 3:1;
- 200% text without clipping or horizontal page scrolling;
- no content jump when data/state changes;
- reduced-motion alternative for every motion behavior;
- visible keyboard focus;
- documented screen-reader names, states and announcements;
- script-aware fallback fonts;
- correct RTL logical and visual order;
- no mid-grapheme truncation or wrapping;
- no copied competitor branding, assets, mascots, layout or trade dress.

Use a token-driven system for color, typography, spacing, radii, elevation and
motion. Record important decisions and rejected alternatives.

## 8. Forbidden actions

Do not:

- deploy or touch production;
- modify Firebase, Firestore, Functions, Rules or indexes;
- implement authentication, payments or account logic;
- calculate correctness, scoring, evidence, mastery, stars or unlocks;
- write progress or persistence;
- call AI, speech, analytics or storage providers;
- use API keys, secrets or production URLs;
- change the canonical 17 Learning V2 activity families;
- claim acoustic pronunciation assessment from transcript or visual UI;
- hide unsupported states or silently switch locale;
- edit legacy Admin;
- add a top-level Admin category;
- add generation-stage kinds beyond the canonical 13;
- deliver only static screenshots;
- change source outside the isolated delivery root.

## 9. Execution sequence

Complete these phases in order. Keep one running Mode Lab throughout.

### Phase 0 — Contract audit

Before building:

- separate Codex-owned core from Kimi-owned presentation;
- inventory every required surface;
- list missing information and explicit assumptions;
- create a responsive/accessibility matrix;
- propose the delivery root;
- confirm mock-only operation and all forbidden-action boundaries.

Do not invent missing product truth. Represent unknown values as fixtures or
documented assumptions.

### Phase 1 — Design system and Mode Lab

Build the token system, selectors, canonical states, viewport frames, themes,
text scaling, direction modes, reduced motion and intent log. Open the running
result in the browser and capture a design-system contact sheet.

### Phase 2 — Learning V2 mobile prototypes

Build the episode map, Activity Scaffold, Sound Discrimination, Writing System
hub and all Chinese/Japanese/Korean/Arabic surfaces listed above.

Each activity consumes a mock immutable view model and emits typed mock intents.
Do not place correctness, mastery, access or evidence rules in components.

Show the running result in the browser and capture annotated contact sheets.

### Phase 3 — Admin V2 prototypes

Build all eight script/language workspaces as nested views inside the existing
Admin V2 Content structure. Demonstrate 375, 768, 1024 and 1440 pixel widths,
plus RTL and keyboard interaction.

Use mock records and intent logs only. Open the result in the browser and
capture an Admin contact sheet.

### Phase 4 — Visual QA and refinement

Check every delivered surface for:

- hierarchy and one-primary-action rule;
- stable geometry;
- touch-target sizes;
- contrast, including dark foreground on lime;
- 200% text;
- focus order and screen-reader semantics;
- reduced motion;
- LTR and RTL;
- Chinese/Japanese glyph coverage;
- grapheme-safe layout;
- phone, tablet and desktop widths;
- all applicable states and recovery;
- absence of forbidden imports, writes and business decisions.

Fix presentation defects only. Do not weaken core boundaries. Capture useful
before/after evidence and list unresolved limitations.

### Phase 5 — Package for Codex

Build the exact package below, verify it, archive it and provide exact paths,
commands, hashes, preview URL and the next Codex action.

## 10. Canonical delivery

Place everything under:

```text
kimi-delivery/learning-v2-frontend/<YYYYMMDD-HHMM>-<short-run-id>/
```

Return a ZIP archive preserving that root. Do not return only chat code blocks.

Required structure:

```text
delivery-manifest.json
README.md
source/
  package.json
  src/
  public/
design/
  design-tokens.json
  component-inventory.json
  decisions.md
fixtures/
  fixture-index.json
  states/
qa/
  accessibility-report.json
  responsive-report.json
  prohibited-action-audit.json
  browser-test-report.json
screenshots/
  contact-sheets/
  mobile/
  admin/
videos/
handoff/
  codex-import-map.json
  file-sha256.json
  known-limitations.md
```

## 11. Delivery manifest

`delivery-manifest.json` must follow this shape:

```json
{
  "schemaVersion": "phraseman-kimi-frontend-delivery.v1",
  "runId": "YYYYMMDD-HHMM-short-id",
  "createdAt": "ISO-8601",
  "model": "Kimi K3",
  "inputs": [
    {
      "path": "input name",
      "sha256": "64 lowercase hex or unavailable"
    }
  ],
  "localRun": {
    "workingDirectory": "source",
    "installCommand": "npm install",
    "runCommand": "npm run dev",
    "expectedUrl": "http://localhost:PORT"
  },
  "shareUrl": null,
  "surfaces": [],
  "states": [
    "prompt",
    "active",
    "processing",
    "success",
    "needs_work",
    "recovery"
  ],
  "conditions": [],
  "filesManifest": "handoff/file-sha256.json",
  "codexImportMap": "handoff/codex-import-map.json",
  "screenshotsRoot": "screenshots",
  "videosRoot": "videos",
  "prohibitedActionsPassed": true,
  "knownLimitations": "handoff/known-limitations.md"
}
```

## 12. Codex import map

For every component record:

- Kimi source path;
- intended Phraseman presentation destination;
- required view-model fields;
- emitted intents;
- local presentation state;
- dependencies;
- asset paths and licences;
- responsive and accessibility notes;
- mobile, Admin or shared-reference classification;
- explicit confirmation that it contains no business logic.

Codex may reject or rewrite any component that violates the boundary.

## 13. Visual evidence

Every screenshot record must contain:

- surface ID;
- state;
- conditions;
- viewport;
- theme;
- text scale;
- locale/script;
- source revision;
- file SHA-256;
- a sentence explaining what it proves.

Contact sheets must expose, not hide, recovery, large-text, dark-mode and RTL
failures.

Record short videos covering:

- primary interaction;
- processing-to-result transition;
- recovery;
- reduced-motion alternative;
- representative Chinese or Japanese script interaction;
- representative Admin generation/review flow.

## 14. Prohibited-action audit

The audit must report zero:

- Firebase/Firestore/Functions imports;
- production credentials or URLs;
- auth/payment/access logic;
- progress/evidence/star/mastery writes;
- direct analytics/provider calls;
- generated API keys or secrets;
- legacy Admin modifications;
- copied competitor assets/trade dress;
- unlicensed fonts/assets;
- white-on-lime violations;
- hardcoded episode or policy truth in presentation.

## 15. Acceptance criteria

Do not claim completion unless:

- local preview starts from the documented command;
- all required surfaces are navigable;
- all six states exist where applicable;
- responsive, dark, 200%-text, reduced-motion and RTL evidence exists;
- manifest and SHA-256 files cover every delivery file;
- accessibility and responsive reports are present;
- decisions, assumptions and limitations are explicit;
- no source outside the delivery root was changed;
- inspection requires no deployment.

## 16. Required final answer

Your final response to the owner must contain:

1. concise outcome summary;
2. browser preview URL and exact local run command;
3. absolute or archive-relative delivery root;
4. exact file list;
5. generated-file manifest and SHA-256 path;
6. screenshot/contact-sheet paths and what they prove;
7. video paths and covered interactions;
8. important design decisions and rejected alternatives;
9. blocked inputs and assumptions;
10. accessibility and responsive QA results;
11. prohibited-action audit result;
12. known limitations;
13. the exact next action Codex should take.

End with this exact sentence:

```text
Kimi delivery is ready for Codex read-only intake; no Phraseman production
source, backend, Firebase configuration or release state was changed.
```
