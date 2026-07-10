# Phraseman Admin Control Plane and Language Factory Design

**Status:** Design approved by product owner; awaiting written-spec review before implementation.

**Goal:** Reorganize the Phraseman admin into a safe operational control plane and add a Language Factory that can create, validate, review, publish, and roll back new language packs without an app release.

## 1. Scope

This design combines two related tracks:

1. Admin Control Plane: a modular replacement for the current monolithic admin entry point.
2. Language Factory: a content-production system for new target languages and content surfaces.

The existing `admin/index.html` remains an emergency fallback until migration coverage is complete. Existing functionality is not deleted during migration.

## 2. Target information architecture

The first-level admin navigation has seven sections:

```text
Overview
Application
Users
Money
Content
Community & Support
Diagnostics
```

`Content` contains:

```text
Courses & Languages
Language Factory
Content QA
Publishing
History / Rollback
```

Global controls are search, environment indicator, current admin role, emergency alerts, and Audit Log.

The UI uses a calm operational dashboard style: one main action per page, text plus consistent SVG icons, visible focus/loading/error/empty/permission states, clear dangerous-action separation, and no emoji as primary navigation icons.

## 3. Language Factory workflow

```text
English Blueprint
  -> Curriculum Planner
  -> Lesson Generator
  -> Vocabulary Generator
  -> Conditional Drills Generator
  -> Quiz / Card / Arena Generator
  -> Source and Language QA
  -> Human Review
  -> Draft Pack
  -> Publish
  -> Monitor and Rollback
```

The English course is the structural blueprint. A target language pack preserves the approved lesson sequence and schema, while translations, examples, vocabulary, drills, quizzes, cards, and arena questions are generated for that target language.

The generator supports:

- one lesson;
- a selected lesson range;
- a batch of N lessons such as 10, 20, 32, or 35;
- phrase sets with the established lesson cardinality;
- lesson vocabulary with lemma, part of speech, level, and translation;
- irregular-verb sections only where the lesson blueprint requires them;
- preposition and other part-of-speech drills only where source analysis detects them;
- quizzes, flashcard packs, and arena question packs;
- curriculum planning based on an explicit source registry and source evidence.

Theory is not auto-published by this workflow. Theory remains a separate authored/editorial process.

## 4. Content artifact model

Every generated pack is versioned and immutable after publication.

Required pack metadata:

```text
packId
studyTarget
sourceLocale
surface
schemaVersion
contentVersion
sourceBlueprintVersion
contentHash
createdAt
createdBy
reviewStatus
activationStatus
```

Each lesson artifact contains:

```text
lessonId
sequence
topic
sourceBlueprintRef
phrases[]
vocabulary[]
irregularVerbs[]?
drills[]?
quizzes[]?
cards[]?
arenaQuestions[]?
qaReport
sourceEvidence[]
reviewDecision
```

Generated output is stored as a draft artifact first. It is never written directly into the production runtime source.

## 5. Source and quality contract

The system uses a source registry rather than an unverified prompt claim.

Each source record stores:

```text
sourceId
provider
url
retrievedAt
license
reliability
coverage
usedFor
```

QA must verify:

- target-language correctness;
- source/target separation;
- phrase count and schema shape;
- duplicate phrases and translations;
- vocabulary membership in lesson phrases;
- part-of-speech consistency;
- irregular-verb correctness;
- preposition/drill alignment;
- level progression;
- missing audio and invalid metadata;
- unsafe, nonsensical, or malformed text;
- cross-lesson duplicate leakage.

The pack cannot move to `Published` unless machine gates pass and a human review decision exists.

## 6. Runtime delivery contract

New language content is delivered through isolated course packs, not large new top-level TypeScript payloads.

Pack manifest fields follow the existing course-pack direction:

```text
packId
studyTarget
sourceLocale
surface
schemaVersion
contentVersion
minAppVersion
sha256
byteSize
createdAt
dependencies
entryIndex
```

Runtime states are explicit:

```text
missing
downloading
ready
corrupt
stale
offline_fallback
blocked
```

Pack selection, download, cache, restore, and progress storage remain isolated by `studyTarget` and source locale. Unknown targets fail closed; they must not silently render English or another language.

## 7. Safe admin write boundary

Sensitive actions use server command contracts, not arbitrary browser writes.

Commands include:

- remote-config publish;
- feature-flag rollout;
- kill switch;
- manual entitlement;
- economy mutation;
- ban/unban;
- account merge;
- content publish/unpublish;
- rollback;
- pack activation.

Each command requires:

```text
actor
role
reason
canonical target
input validation
idempotency key
compare-and-set/version check
before snapshot
after snapshot
immutable audit record
rollback reference
```

Store entitlements are read-only in admin. Manual access is represented separately and never impersonates RevenueCat or App Store state.

## 8. Admin states and data truth

The UI must distinguish:

```text
not signed in
signed in without permission
loading
not loaded
empty
partial
stale
permission denied
index/rules error
ready
guarded write
```

Green/healthy status is allowed only after the source was successfully read and freshness was verified. Empty telemetry is not healthy telemetry.

Revenue analytics separates:

- store truth from RevenueCat/webhooks;
- behavioral purchase signals;
- modeled estimates.

## 9. Per-user adaptive generation

Adaptive content is a separate runtime feature:

```text
user progress and mistakes
  -> bounded generation request
  -> target-language and safety gate
  -> short-lived exercise
  -> user feedback
  -> optional cache with TTL
```

It does not modify canonical lessons, published packs, or shared curriculum. It is subject to rate limits, cost controls, kill switches, target-language validation, and privacy rules.

## 10. Workstream decomposition

Agents may work in parallel only when their write scopes are disjoint.

### Workstream A — Admin shell

Owns admin layout, routes, shared UI components, navigation, accessibility, and migration coverage.

### Workstream B — Server command and security layer

Owns Firestore rules, callable/server commands, RBAC, idempotency, audit, rollback, and command tests.

### Workstream C — Language Factory contracts

Owns pack schemas, job states, source registry, generation artifacts, and QA report contracts.

### Workstream D — Runtime course-pack delivery

Owns manifests, loaders, cache, target-isolated storage, offline behavior, and runtime gates.

### Workstream E — Content QA and editorial workflow

Owns source verification, linguistic gates, review screens, curriculum progression, and publication acceptance.

### Workstream F — Adaptive user generation

Owns user-context selection, bounded generation, TTL cache, feedback, quotas, and runtime kill switch.

### Integration gate

The root agent integrates only after each workstream supplies its contracts, changed-file list, focused tests, and risk notes. A final advisor review is required before claiming completion.

## 11. Implementation order

1. Freeze current evidence and mark stale Admin v2 documents as historical where appropriate.
2. Build migration coverage for all current admin entries.
3. Define server command, audit, RBAC, and rollback contracts.
4. Remove broad browser write permissions and route sensitive writes through commands.
5. Build the seven-section admin shell.
6. Add Language Factory schemas and draft job state.
7. Connect source registry and QA gates.
8. Pilot one target language with one lesson.
9. Add batch generation and human review.
10. Add pack publication and runtime delivery.
11. Add quizzes, cards, and arena question generation.
12. Add per-user adaptive generation only after pack delivery is stable.
13. Run integration, security, browser, rollback, and release gates.

## 12. Non-goals

- No automatic theory publication.
- No direct arbitrary Firestore editor in the admin.
- No replacement of real store billing state with manual flags.
- No automatic publication of AI output.
- No new language by copying large generated arrays into the app bundle.
- No per-user generation that mutates shared canonical content.
- No production generation through the local Codex project API key.

## 13. Acceptance criteria

- Every current admin capability has a migration destination or an explicit guarded fallback.
- No high-risk operation is a direct uncontrolled browser write.
- Dangerous operations have confirmation, reason, audit, and rollback references.
- Store entitlement and manual access are visibly and technically separate.
- A target language can be generated as a draft, reviewed, QA-checked, published, loaded, cached, and rolled back without an app release.
- A failed, stale, corrupt, or unknown pack cannot silently render another language.
- One lesson and a batch of N lessons use the same versioned job model.
- Theory remains manual/editorial.
- Per-user generated exercises are isolated from canonical packs and bounded by quotas/TTL.
- Admin shell and generation workflow pass focused unit, rules, browser, and integration gates.
