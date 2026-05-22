# GUSTAV Agent Contracts

Status: draft contract v0

Purpose: define the agent office as enforceable roles with inputs, outputs, verdicts and blocking power.

This document replaces any vague "agents will check it" idea. Agents must be auditable.

## 1. Universal stale-memory guard

Every Gustav agent prompt must include:

```text
Old standalone Gustav ideas are invalid. Use only PhraseMan repo files, docs/gustav contracts, run artifacts, approved requirements and recorded evidence. If a claim is not supported, mark it unknown instead of guessing.
```

## 2. Universal agent rules

Every agent must:

- know its role;
- read only its required inputs;
- return blockers first;
- use `GO`, `HOLD`, or `BLOCK`;
- provide evidence refs;
- mark unknowns;
- avoid self-approval;
- never write production files;
- never generate French content unless run mode explicitly allows generation;
- never collapse source locale and study target into one field.

## 3. Universal output schema

```ts
type GustavAgentVerdict = {
  schemaVersion: 'gustav-agent-verdict-v0';
  runId: string;
  agentId: string;
  agentRole: string;
  startedAt?: string;
  completedAt?: string;
  verdict: 'GO' | 'HOLD' | 'BLOCK';
  confidence: 'high' | 'medium' | 'low';
  blockers: GustavAgentFinding[];
  findings: GustavAgentFinding[];
  requiredFixes: GustavRequiredFix[];
  evidence: GustavAgentEvidenceRef[];
  filesRead: string[];
  filesWritten: string[];
  unknowns: string[];
  nextRecommendedAgent?: string;
};

type GustavAgentFinding = {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'blocker';
  title: string;
  detail: string;
  affectedArtifacts: string[];
  affectedProductFiles?: string[];
  evidenceIds?: string[];
};

type GustavRequiredFix = {
  id: string;
  ownerAgent: string;
  fixType: 'doc' | 'schema' | 'content' | 'audit' | 'runtime' | 'test' | 'research' | 'apply_plan';
  detail: string;
  blocksGeneration: boolean;
  blocksApply: boolean;
};

type GustavAgentEvidenceRef = {
  evidenceId: string;
  sourcePath?: string;
  sourceUrl?: string;
  claim: string;
  confidence: 'high' | 'medium' | 'low';
};
```

Any agent output that does not match this shape is advisory only and cannot unblock Gustav.

## 4. Verdict meanings

`GO`:

- agent found no blockers in its scope;
- output is complete enough for the next gate.

`HOLD`:

- work can continue in audit/design mode;
- generation or apply cannot proceed if the finding blocks that stage.

`BLOCK`:

- current path is unsafe;
- stop the run until fixed.

## 5. Self-approval ban

No agent can approve its own generated artifact.

Examples:

- Curriculum Transfer Agent cannot final-approve its own curriculum.
- Pedagogy Agent cannot final-approve its own lesson text.
- Quiz Agent cannot final-approve its own quiz items.
- Runtime Integration Agent cannot approve storage migration without QA Gate.

## 6. Required agents

### App Cartographer Agent

Mission:

Map PhraseMan learning surfaces and target-sensitive runtime paths.

Inputs:

- atlas docs;
- app route files;
- lesson files;
- quiz files;
- trainer files;
- personal training files;
- Heisenberg docs.

Outputs:

- surface inventory;
- unknown surfaces;
- target/source sensitivity flags.

Blocks if:

- unknown target-sensitive surface exists;
- storage-sensitive surface has no owner;
- app path is guessed.

### English Source Graph Agent

Mission:

Build the read-only English Base Source Graph from app sources.

Inputs:

- `GUSTAV_SOURCE_GRAPH_SCHEMA.md`;
- lesson spine;
- lesson data;
- intro screens;
- quizzes;
- personal practice;
- generated/source file map.

Outputs:

- source graph;
- validation summary;
- unresolved nodes.

Blocks if:

- graph lacks lesson links;
- generated files are used as canonical without provenance;
- source locale and study target are confused.

### English Base Audit Agent

Mission:

Audit current English Base before it becomes the basis for another target.

Checks:

- grammar correctness;
- phrase naturalness;
- lesson-theory alignment;
- quiz ambiguity;
- generated/source drift;
- source-locale contamination.

Blocks if:

- English lesson teaches wrong rule;
- quiz accepts only one answer while multiple are valid;
- generated/source drift affects canonical content.

### Target Architecture Agent

Mission:

Validate source locale vs study target architecture.

Inputs:

- `GUSTAV_TARGET_LANGUAGE_ARCHITECTURE.md`;
- `app/source_locales.ts`;
- `app/study_target_lang_dev.ts`;
- `app/spanish_content_gate.ts`;
- source graph.

Outputs:

- architecture verdict;
- required runtime contracts;
- risk list.

Blocks if:

- French is modeled as source locale;
- generic `lang` stores both concepts;
- target-aware loaders are missing for integration.

### Evidence Auditor Agent

Mission:

Check that research and curriculum decisions are traceable.

Inputs:

- `GUSTAV_RESEARCH_EVIDENCE_POLICY.md`;
- evidence ledger;
- curriculum plan;
- transfer matrix.

Blocks if:

- Cambridge/Oxford/CEFR claims are vague;
- source is weak;
- copyrighted material is copied;
- evidence does not support the exact decision.

### Curriculum Transfer Agent

Mission:

Decide how English Base transfers to the target language.

Outputs:

- keep/split/merge/reorder/add/remove matrix;
- rationale per target lesson;
- source-locale learner risks.

Blocks if:

- French order copies English without reason;
- French-specific grammar is missing;
- transfer decision lacks evidence.

### Pedagogy and Grammar Agent

Mission:

Create or review explanations for a target language and source locale.

For French pilot:

- French examples;
- Russian explanations;
- Ukrainian explanations;
- learner warnings;
- beginner-safe simplifications.

Blocks if:

- explanation is a literal translation of English lesson;
- target-language rule is wrong;
- Russian/Ukrainian terms are mixed.

### Quiz and Assessment Agent

Mission:

Create or audit quizzes from taught skills.

Blocks if:

- item tests untaught skill;
- multiple correct answers are not accepted;
- distractor is nonsense;
- source-locale prompt gives away the answer.

### My Practice Agent

Mission:

Design target-aware personalized practice.

Inputs:

- personal training taxonomy;
- trainer store;
- source graph;
- target curriculum.

Blocks if:

- English diagnosis ids are reused for French without transfer decision;
- trainer queues can mix targets;
- feedback source locale is missing.

### Storage and Migration Agent

Mission:

Protect user progress, trainer queues and cloud sync.

Blocks if:

- learning state key lacks target namespace;
- migration has no rollback;
- English progress can be overwritten.

### Runtime Integration Agent

Mission:

Plan safe app integration after apply approval.

Blocks if:

- app imports target content globally without context;
- target switch can leak content;
- English regression risk is untested.

### QA Gate Agent

Mission:

Final blocker aggregator.

Inputs:

- all agent verdicts;
- run verdict;
- apply plan;
- tests.

Blocks if:

- any required agent is missing;
- any unresolved blocker exists;
- actual changed files exceed approved apply plan.

## 7. Required agent chain by mode

Inventory mode:

```text
App Cartographer -> QA Gate
```

Source graph mode:

```text
English Source Graph -> App Cartographer -> QA Gate
```

Curriculum mode:

```text
English Source Graph -> English Base Audit -> Evidence Auditor -> Curriculum Transfer -> QA Gate
```

Generate mode:

```text
Curriculum Transfer -> Pedagogy and Grammar -> Quiz and Assessment -> My Practice -> Evidence Auditor -> QA Gate
```

Apply plan mode:

```text
Target Architecture -> Storage and Migration -> Runtime Integration -> Heisenberg compatibility if needed -> QA Gate
```

## 8. Agent output storage

Every agent output must be stored under:

```text
docs/gustav/runs/<runId>/audits/agent_verdicts/<agentId>.json
```

No agent verdict stored only in chat can unblock a run.

## 9. Hard fail rules

Agent contract fails if:

- missing `runId`;
- missing verdict;
- missing blockers array;
- missing files read;
- missing evidence for a claim;
- agent writes outside run folder;
- generation agent approves itself;
- old standalone Gustav assumptions appear;
- source locale and study target are mixed.

