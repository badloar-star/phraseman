# GUSTAV Target Language Architecture

Status: draft contract v0

Purpose: define how PhraseMan must think about a language the user learns, separately from the language used to explain the lesson.

This document is a design contract only. It does not authorize app code changes.

This contract must be read together with:

- `docs/specs/2026-06-26-bootstrap-course-pack-master-audit.md`;
- `docs/specs/2026-06-26-language-pack-retrofit-plan.md`.

Continuation rule:

Every architecture pass must improve the target-language contract with more
verified coverage than the previous pass: more mapped surfaces, more explicit
source/target boundaries, more loader/storage/cloud/admin risks classified,
more focused tests/checks, or more blockers resolved. Each pass must end with a
`Next Pass Plan`. If the architecture cannot safely expand, the pass must record
blocker evidence and the smallest-safe unblock plan instead of repeating the
same verdict.

## 2026-06-27 Course-Pack Gate Snapshot

The current plan-content server copy is staging/shadow only. Production
activation is still `HOLD`.

Current activation-readiness state:

- human review is not a production gate;
- LLM official-source coverage V2 supersedes the old human reviewer hold for
  generated French rows;
- latest readiness evidence contains `1600` accepted row decisions and `164`
  accepted AI official-source decisions with activation/import/apply flags still
  closed;
- remaining production blocker is explicit apply/activation approval plus
  runtime/server/rollback gates staying closed until that approval path passes;
- `COURSE_PACK_REMOTE_LOADING_ENABLED=false`;
- `activationApproved=false`;
- bundled `plan_content_*` payloads remain in the app.

Gustav must not infer target-pack readiness or app activation from generated
rows, parity success, LLM review success, server upload success or dual-read
success. LLM official-source approval is content evidence, not permission to
write production app content, enable downloads, migrate storage/cloud state or
set `activationApproved=true`.

## 1. Current reality in PhraseMan

PhraseMan currently has two different concepts that must not be merged:

- source/interface language: the language used for UI, explanations, translations and learner-facing prompts;
- study target language: the language being learned.

Current source/interface architecture is represented in files like:

- `app/source_locales.ts`;
- `constants/i18n`;
- Heisenberg docs and scripts.

Current study target architecture is not production-ready for multi-target. It exists as a dev experiment:

- `app/study_target_lang_dev.ts`;
- `app/spanish_content_gate.ts`.

Important current limitation:

```ts
export type StudyTargetLang = 'en' | 'es';
```

That type is dev-only and cannot be treated as the final Gustav production architecture.

## 2. Non-negotiable separation

These are separate:

```text
sourceLocale = language used to teach/explain
studyTarget  = language being learned
```

Examples:

```text
sourceLocale=ru, studyTarget=en  -> Russian speaker learns English
sourceLocale=uk, studyTarget=en  -> Ukrainian speaker learns English
sourceLocale=ru, studyTarget=fr  -> Russian speaker learns French
sourceLocale=uk, studyTarget=fr  -> Ukrainian speaker learns French
```

French must not be added as:

- just another `SourceLocale`;
- a Heisenberg batch locale;
- a Spanish-style UI fallback;
- a mutation of English lesson data;
- content inside `russian`, `ukrainian`, `spanish`, `titleRU`, `titleUK`, or `titleES` fields.

## 3. Future production concepts

Future app architecture should have explicit concepts like:

```ts
type StudyTargetId =
  | 'en'
  | 'fr'
  | 'de'
  | 'es';

type SourceLocaleId =
  | 'ru'
  | 'uk'
  | 'es'
  | 'pt-BR'
  | 'vi'
  | 'id'
  | 'tr'
  | 'pl';

type LearningContext = {
  sourceLocale: SourceLocaleId;
  studyTarget: StudyTargetId;
};
```

Naming rule:

No new Gustav code should use a generic `lang` field when the value is actually source locale or study target.

## 4. Target registry

Target registry should describe the languages that can be learned:

```ts
type StudyTargetRegistryEntry = {
  id: StudyTargetId;
  status: 'active' | 'dev' | 'planned' | 'disabled';
  displayName: Record<SourceLocaleId, string>;
  courseLoaderId: string;
  quizLoaderId: string;
  practiceLoaderId: string;
  storageNamespace: string;
  minimumSourceLocales: SourceLocaleId[];
  featureFlag?: string;
};
```

Initial desired future:

```text
en: active
fr: planned/dev until approved
```

French readiness requires at least:

- `sourceLocale=ru`;
- `sourceLocale=uk`;
- separate French course graph;
- separate French quiz graph;
- separate French practice graph;
- separate storage namespace.

## 5. Content container contract

Every study target should eventually resolve to its own content container.

Conceptual shape:

```text
studyTargets/<target>/
  course/
  lessons/
  introScreens/
  phrases/
  words/
  quizzes/
  prepositions/
  flashcards/
  personalPractice/
  metadata/
```

This path is conceptual, not final. The actual physical layout must be chosen during apply planning so it fits Expo bundling and current PhraseMan imports.

Hard rule:

Content for one `studyTarget` cannot be loaded by another target unless it is explicitly marked as shared metadata.

## 5.1 Downloadable Target Pack Contract

Future production target languages must be represented as downloadable pack
candidates before they can become app-active content.

Minimum pack identity:

```ts
type TargetPackManifest = {
  packId: string;
  studyTarget: StudyTargetId;
  sourceLocales: SourceLocaleId[];
  schemaVersion: string;
  contentVersion: string;
  minAppVersion: string;
  sourceGraphHash: string;
  researchPackHash: string;
  pedagogyBlueprintVersion: string;
  domainRegistryVersion: string;
  byteSize: number;
  sha256: string;
  createdAt: string;
  activationApproved: false | {
    approvedAt: string;
    approvalRef: string;
  };
};
```

Minimum generated-row metadata:

```ts
type TargetPackRowMetadata = {
  studyTarget: StudyTargetId;
  sourceLocaleCoverage: SourceLocaleId[];
  researchEvidenceIds: string[];
  pedagogyBlueprintId: string;
  grammarClusterId: string;
  transformationType:
    | 'adapted_expression'
    | 'grammar_rebuild'
    | 'quiz_rebuild'
    | 'example_rewrite'
    | 'direct_equivalent';
  antiCalqueDecision: 'pass' | 'hold' | 'block';
  reviewerStatus: 'unreviewed' | 'needs_fix' | 'approved' | 'blocked';
  activationApproved: false;
};
```

Hard rules:

- rows without the required metadata are `HOLD`;
- direct translation is not the default strategy;
- `direct_equivalent` requires evidence and anti-calque pass;
- pack activation is separate from generation and reviewer preparation;
- a target pack cannot be app-active until storage/cloud, AI, admin and runtime
  loader gates pass.

## 6. Loader contract

Future loaders should be target-aware:

```ts
type TargetContentRequest = {
  studyTarget: StudyTargetId;
  sourceLocale: SourceLocaleId;
  lessonId?: number | string;
  surface:
    | 'lesson'
    | 'intro'
    | 'phrase'
    | 'quiz'
    | 'word'
    | 'preposition'
    | 'flashcard'
    | 'dailyPhrase'
    | 'personalPractice'
    | 'trainer';
};

type TargetContentResult<T> = {
  context: LearningContext;
  targetContent: T;
  sourceLocaleText: unknown;
  provenance: string[];
  auditStatus: 'pass' | 'warning' | 'hold' | 'block';
};
```

Hard rule:

A loader must receive both `studyTarget` and `sourceLocale`. If one is missing, it must fail closed.

For downloadable packs, loaders must also receive or resolve:

- pack manifest id;
- schema/content version;
- hash-verified cache status;
- explicit missing/downloading/ready/corrupt/stale/offline-fallback state.

Missing target/source context must never silently fall back to English, Russian,
Ukrainian or any other language.

## 7. Progress and storage boundary

Any user-learning state must be target-scoped unless explicitly global.

Target-scoped:

- lesson progress;
- quiz history;
- trainer queues;
- spaced repetition state;
- personal practice diagnosis;
- weak skill history;
- phrase analytics;
- word recall;
- target-specific achievements if based on learning content.

Global:

- user account;
- premium status;
- interface preference;
- device settings;
- app theme;
- global notification settings.

Open issue:

Exact storage key strategy belongs in `GUSTAV_TARGET_STORAGE_PLAN.md`.

## 8. Heisenberg compatibility

Heisenberg remains source-locale localization for English learning.

Gustav must not:

- convert Heisenberg batch locales into target languages;
- use Heisenberg generated copy as target-language lessons;
- make `studyTarget=fr` depend on Heisenberg activation;
- change Heisenberg gates without a compatibility audit.

Gustav may reuse:

- coverage audit style;
- generated artifact isolation;
- agent board discipline;
- source-locale terminology checks.

## 9. Spanish special case

Spanish currently has two meanings in PhraseMan:

- Spanish UI/source locale for learning English;
- dev-only Spanish-as-study-target experiment.

French must not copy this ambiguity.

Before French integration, Gustav must define a production target architecture where:

- `es` source locale stays source locale;
- future `es` study target is separate;
- `fr` study target is never confused with French source locale;
- target switch and UI language switch are separate controls or clearly separate state.

## 10. French from Russian and Ukrainian

French target initial requirement:

```text
studyTarget=fr
sourceLocale=ru
sourceLocale=uk
```

This means Gustav must eventually produce:

- French target phrases;
- French grammar explanations in Russian;
- French grammar explanations in Ukrainian;
- French quiz prompts in Russian;
- French quiz prompts in Ukrainian;
- French feedback in Russian;
- French feedback in Ukrainian;
- target-aware My Practice items;
- target-aware storage and progress.

It does not mean:

- translate English explanations word-for-word;
- copy English lesson order;
- put French into English phrase fields;
- use Russian and Ukrainian as interchangeable fallbacks.

## 11. Architecture gates

Before any French content:

- `LearningContext` concept must be accepted;
- target registry design must be accepted;
- source vs target naming must be enforced in docs and future code;
- source graph must pass;
- storage plan must exist;
- My Practice target plan must exist;
- apply gate must exist.

Before any app integration:

- TypeScript contracts must be added or mapped to existing app structures;
- target-aware loaders must be designed;
- target-aware storage keys must be designed;
- migration must be planned;
- rollback must be planned;
- English flow must have regression protection.

## 12. Hard fail rules

Architecture fails if:

- French is represented as source locale instead of study target;
- source locale and study target are stored in one `lang` variable;
- French content appears inside English lesson fields;
- target switch changes UI language without explicit source-locale change;
- UI language change changes study target without explicit target switch;
- storage keys omit study target for learning progress;
- app uses dev-only `StudyTargetLang` as final production solution.

