# GUSTAV Research Evidence Policy

Status: draft contract v0

Purpose: prevent Gustav from inventing lesson order, grammar rules, learner difficulty claims, CEFR placement or quiz logic without traceable evidence.

This policy is required before any French curriculum or content generation.

## 1. Core rule

Gustav may not say:

- "Cambridge says";
- "Oxford recommends";
- "best courses do this";
- "learners usually struggle with this";
- "CEFR places this at A2";

unless the claim is recorded in an evidence ledger.

If evidence is missing, the claim must be marked as:

```text
unverified product hypothesis
```

and cannot be used as the only basis for a curriculum decision.

## 2. Evidence ledger path

Every research or curriculum run must contain:

```text
docs/gustav/runs/<runId>/research/evidence_ledger.json
```

## 3. Evidence ledger schema

```ts
type GustavEvidenceLedger = {
  schemaVersion: 'gustav-evidence-ledger-v0';
  runId: string;
  createdAt: string;
  studyTarget: StudyTargetId;
  sourceLocales: SourceLocaleId[];
  claims: EvidenceClaim[];
};

type EvidenceClaim = {
  claimId: string;
  claim: string;
  claimType:
    | 'grammar_rule'
    | 'curriculum_order'
    | 'cefr_level'
    | 'learner_error'
    | 'translation_warning'
    | 'quiz_design'
    | 'pronunciation'
    | 'usage_naturalness'
    | 'product_constraint'
    | 'app_existing_behavior';
  usedFor:
    | 'lesson_order'
    | 'lesson_objective'
    | 'intro_screen'
    | 'phrase_generation'
    | 'quiz_generation'
    | 'personal_practice'
    | 'storage_architecture'
    | 'runtime_architecture'
    | 'audit';
  sourceType:
    | 'official_reference'
    | 'dictionary'
    | 'grammar_reference'
    | 'cefr_reference'
    | 'course_comparison'
    | 'academic_or_linguistic'
    | 'app_source'
    | 'app_test'
    | 'manual_product_decision';
  sourceName: string;
  sourceUrl?: string;
  citation?: string;
  accessDate?: string;
  copyrightSafeSummary: string;
  directQuote?: string;
  confidence: 'high' | 'medium' | 'low';
  limitations: string[];
  agentId: string;
  reviewerStatus: 'unreviewed' | 'accepted' | 'needs_review' | 'rejected';
};
```

## 4. Source quality ranking

Preferred:

1. Official grammar, dictionary, exam, CEFR or institution materials.
2. Recognized grammar/reference publishers.
3. Established course syllabi used only for comparison, not copying.
4. Linguistic or pedagogy research.
5. Current PhraseMan app source and tests.
6. Manual product decision with clear rationale.

Not enough by itself:

- random blog;
- forum answer;
- unsourced AI output;
- one course table of contents;
- old Gustav assumptions;
- generated content from another language.

## 5. Copyright safety

Gustav must not copy course content from external references.

Allowed:

- short citation metadata;
- short direct quote only when necessary and legally safe;
- copyright-safe summary;
- independent curriculum decision based on multiple signals;
- links and access dates.

Not allowed:

- copying full exercises;
- copying lesson text;
- copying proprietary sequence wholesale;
- paraphrasing a single source so closely that it becomes a hidden copy.

## 6. Minimum evidence per decision

Curriculum order decision:

- at least one grammar/curriculum evidence claim;
- one product/app constraint if it differs from English Base;
- one risk note for RU and UK learners if source-locale-specific.

Grammar rule:

- at least one grammar reference or accepted app-source rule;
- target-language examples must be independently written;
- if simplified for beginners, simplification must be marked.

CEFR placement:

- CEFR/source claim or explicit estimate;
- estimate must not pretend to be official.

Learner error:

- source-specific evidence or manual teacher/product rationale;
- cannot be guessed from English learner errors.

Quiz design:

- tested skill;
- correct answer rationale;
- distractor rationale;
- ambiguity review.

Personal practice:

- diagnosis skill;
- target-specific mistake pattern;
- source-locale explanation strategy;
- transfer decision from English taxonomy or new French taxonomy.

## 7. Web research rule

When Gustav needs current external facts or named source references, it must perform research and record:

- source URL;
- access date;
- source owner/publisher;
- what claim it supports;
- limitations.

No vague "Oxford/Cambridge/etc." language is allowed without ledger entries.

## 8. App-source evidence

PhraseMan files can be evidence for current behavior, not for universal language truth.

Example:

- `app/lesson_data_all.ts` proves the current English lesson order.
- It does not prove that French should use the same order.

App source can support:

- current English course structure;
- current UI/runtime behavior;
- current storage keys;
- existing source-locale handling;
- current personal training taxonomy.

App source cannot alone support:

- French grammar order;
- French usage naturalness;
- CEFR placement for French;
- Russian/Ukrainian learner difficulty claims for French.

## 9. Evidence review gate

Evidence gate passes only if:

- every curriculum decision has linked evidence or explicit product rationale;
- no rejected claim is used;
- all source URLs have access dates when web-based;
- direct quotes are minimal;
- summaries are copyright-safe;
- confidence is not inflated;
- external sources are not used as hidden copy.

Evidence gate holds if:

- claim is plausible but uncited;
- citation exists but source quality is weak;
- claim is too broad;
- claim is not connected to a decision.

Evidence gate blocks if:

- claim is false;
- source contradicts generated content;
- copied content is detected;
- old standalone Gustav assumption is used.

## 10. Required reviewer behavior

Evidence Auditor Agent must return blockers first.

It must check:

- claim traceability;
- source quality;
- copyright risk;
- whether evidence supports the exact decision;
- whether app source is being overused as language evidence.

It cannot approve content it generated.

