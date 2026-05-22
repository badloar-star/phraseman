# GUSTAV Algorithm Audit 01

Date: 2026-05-19

Scope:

- `docs/gustav/GUSTAV_PHRASEMAN_MAP_AND_REBUILD_PLAN.md`
- реальная архитектура PhraseMan вокруг lessons, quizzes, source locales, study target dev switch, Heisenberg, trainer, personal trainings

Verdict: HOLD.

Gustav после reset-а стал правильным по направлению, но еще не готов к генерации французского. Он остановил главную ошибку: не строит новый язык поверх абстрактной фантазии. Но пока это больше архитектурный план, чем исполняемый алгоритм с гарантиями. Для платного приложения нужны машинные контракты, run-isolation, fail-fast gates, source graph, schema validation и target-aware tests.

## 1. Что уже стало сильнее

### PASS-001. Старый Gustav аннулирован

Статус: PASS.

Почему это важно:

Старый standalone Gustav был опасен, потому что мог переносить несуществующую архитектуру в PhraseMan. Новый документ прямо запрещает использовать старую логику как источник решений.

Что сохранить:

- reset rule;
- no French generation yet;
- source-of-truth только из PhraseMan files, atlas, audits and approved requirements.

### PASS-002. English Base теперь понята как graph, а не папка

Статус: PASS.

Почему это важно:

В PhraseMan английская база живет в TypeScript files, generated files, intro screens, quiz payloads, personal training taxonomy, trainer and flashcards. План правильно требует English Base Source Graph.

Что сохранить:

- нельзя просто "перевести 32 урока";
- надо извлечь lesson purpose, skills, phrases, quizzes and practice mappings.

### PASS-003. Heisenberg отделен от Gustav

Статус: PASS.

Почему это важно:

Heisenberg добавляет source/interface language для изучения English. Gustav должен добавлять new study target. Это разные задачи.

Evidence:

- `docs/HEISENBERG_LOCALIZATION_PIPELINE.md` говорит, что Heisenberg adds a new source language for users who learn English.
- `app/spanish_content_gate.ts` явно разделяет Spanish UI/source language and dev Spanish-as-study-target.

Что сохранить:

- Gustav может reuse Heisenberg discipline, но не его assumption that target stays `en`.

### PASS-004. "Моя практика" выделена как отдельный риск

Статус: PASS.

Почему это важно:

PhraseMan уже имеет серьезный personal training room and taxonomy. Для French target нельзя использовать English-specific diagnosis taxonomy blindly.

Evidence:

- `app/personal_training_taxonomy.ts` содержит English grammar ids and Cambridge/CEFR metadata.
- `tools/personal_training_agent_room/README.md` требует replacement hygiene and training gates.

Что сохранить:

- отдельный My Practice agent;
- separate target progress and target trainer queues;
- запрет на смешивание English practice with French practice.

## 2. Blockers

### GVA-001. Нет исполняемой Source Graph schema

Severity: BLOCKER.

Проблема:

Документ говорит "создать English Base Source Graph", но пока не описывает точную schema. Без schema агент может каждый раз понимать base по-разному.

Риск:

- French curriculum будет построен на неполной базе;
- часть intro screens, quizzes, flashcards или personal trainings выпадет;
- агент будет додумывать lesson purpose "от фонаря".

Нужно добавить:

- `docs/gustav/GUSTAV_SOURCE_GRAPH_SCHEMA.md`;
- обязательные поля для lesson, phrase, word, quiz, intro screen, practice skill;
- `sourceFiles[]`;
- `runtimeOwners[]`;
- `confidence`;
- `knownRisks[]`;
- `generatedFrom`;
- `lastAuditStatus`.

Gate:

Французский generation запрещен, пока Source Graph schema не существует и не покрывает all learning surfaces.

### GVA-002. Нет строгого runtime type contract для source vs target

Severity: BLOCKER.

Проблема:

Документ концептуально разделяет `sourceLocale` and `studyTarget`, но не требует TypeScript-level contract.

Evidence:

- `app/source_locales.ts` описывает source/interface locales.
- `app/study_target_lang_dev.ts` сейчас dev-only and supports only `'en' | 'es'`.
- `app/spanish_content_gate.ts` содержит комментарии, что Spanish UI and Spanish study target are separate.

Риск:

- French target может быть случайно добавлен как source locale;
- Russian/Ukrainian explanations can mix with target content;
- UI switch can show correct labels but wrong course content.

Нужно добавить:

- `StudyTargetId = 'en' | 'fr' | ...`;
- `SourceLocaleId = 'ru' | 'uk' | ...`;
- `LearningContext = { sourceLocale, studyTarget }`;
- `ContentScope = { studyTarget, sourceLocale, surface, lessonId? }`;
- type-level ban: target content cannot be assigned to source-locale fields.

Gate:

Any Gustav integration PR must fail if target and source are represented as one generic `lang`.

### GVA-003. Run isolation not strict enough

Severity: BLOCKER.

Проблема:

Документ говорит isolated run artifacts, но не фиксирует точную структуру и запреты.

Риск:

- агент снова может создать файлы не там;
- generated content может попасть в app before audit;
- трудно понять, что было создано, кем, по каким inputs.

Нужно добавить run folder:

```text
docs/gustav/runs/<runId>/
  manifest.json
  inputs/
  source_graph/
  research/
  curriculum/
  generated/
  audits/
  apply_plan/
  verdict.json
```

`manifest.json` должен содержать:

- run id;
- requested study target;
- allowed source locales;
- input commit/ref;
- source graph hash;
- agents used;
- allowed write zones;
- product write permission: false by default.

Gate:

Любой Gustav run без manifest gets rejected.

### GVA-004. Нет отдельного apply gate

Severity: BLOCKER.

Проблема:

План говорит "integration after pilot", но не описывает отдельный apply step.

Риск:

- approved content and product integration смешаются;
- агент может сразу менять app files;
- diff станет слишком большим для review.

Нужно добавить:

1. `generate` step writes only to `docs/gustav/runs/*`.
2. `audit` step reviews generated artifacts.
3. `apply-plan` step proposes exact production file changes.
4. `apply` step can run only after explicit approval.

Gate:

No Gustav agent can write to `app/*`, `constants/*`, `scripts/*` during generation mode.

### GVA-005. External reference policy undefined

Severity: BLOCKER.

Проблема:

План говорит сравнивать с strong references, but does not define how to record evidence.

Риск:

- агент будет ссылаться на Cambridge/Oxford vaguely;
- невозможно проверить, откуда взялся порядок тем;
- commercial content can contain unverified claims.

Нужно добавить Evidence Ledger:

```text
research/evidence_ledger.json
```

Fields:

- `claimId`;
- `claim`;
- `sourceName`;
- `sourceUrlOrCitation`;
- `sourceType`;
- `usedFor`;
- `confidence`;
- `agentNotes`;
- `copyrightSafeSummary`.

Gate:

Any curriculum change needs evidence or explicit product rationale.

Note:

При реальном research надо использовать актуальные источники и фиксировать даты доступа. Для Open Web claims нужен browsing/research step. For official references, prefer primary sources.

### GVA-006. Agent roles are not yet executable prompts

Severity: HIGH.

Проблема:

В документе есть agent office roles, но это еще не полноценные prompts with strict IO.

Риск:

- разные агенты будут возвращать разный формат;
- QA cannot aggregate blockers;
- "GO/HOLD" can become subjective.

Нужно добавить:

- `docs/gustav/agents/*.md`;
- one prompt per agent;
- exact input contract;
- exact output JSON contract;
- blocker categories;
- escalation rule;
- examples of unacceptable output.

Minimum output contract:

```json
{
  "agent": "EnglishBaseAuditAgent",
  "verdict": "GO | HOLD | BLOCK",
  "blockers": [],
  "findings": [],
  "requiredFixes": [],
  "evidence": [],
  "confidence": 0.0
}
```

Gate:

No agent output counts unless it matches schema.

### GVA-007. My Practice isolation is under-specified

Severity: HIGH.

Проблема:

Документ правильно выделяет My Practice, но не описывает exact data model for target-aware practice.

Evidence:

- `app/trainer_store.ts` uses `trainer_store_v1`.
- `app/personal_training_taxonomy.ts` uses English grammar ids.
- `tools/personal_training_agent_room/README.md` is built around one diagnosis id and English training files.

Риск:

- English weaknesses can appear in French practice;
- French mistakes can be diagnosed with English ids;
- spaced repetition can mix targets.

Нужно добавить:

- target-aware storage key plan;
- target-aware diagnosis id namespace;
- per-target CEFR metadata;
- source-locale feedback fields;
- migration plan from existing `trainer_store_v1`;
- compatibility mode for current English users.

Gate:

No French My Practice until tests prove target queues and diagnosis taxonomies are isolated.

### GVA-008. Storage and progress isolation needs exact key strategy

Severity: HIGH.

Проблема:

План says progress and trainer should not mix, but no exact naming strategy exists.

Риск:

- switching target can overwrite progress;
- user can lose English trainer data;
- cloud sync may upload mixed state.

Нужно добавить:

- storage key matrix;
- local vs cloud ownership;
- migration rules;
- rollback plan;
- target-specific archive behavior.

Example target-safe key shape:

```text
trainer_store_v2::<studyTarget>
lesson_progress_v2::<studyTarget>
quiz_history_v2::<studyTarget>
personal_practice_v2::<studyTarget>
```

Gate:

Any key that stores learning progress must include `studyTarget` or be explicitly marked global.

### GVA-009. Product surface inventory is still manual

Severity: HIGH.

Проблема:

The plan lists surfaces, but does not define inventory completeness checks.

Риск:

- hidden surfaces like arena, daily tasks, admin, web screens, rewards or flashcards may be missed;
- French target might appear incomplete even if lessons work.

Нужно добавить:

- inventory script or checklist;
- "surface owner" required for every surface;
- `targetSensitive: true | false`;
- `sourceLocaleSensitive: true | false`;
- `contentKind`;
- `runtimeRoute`.

Gate:

No generation until inventory covers all learning-content routes and data files.

### GVA-010. Generated/source drift needs a dedicated check

Severity: HIGH.

Проблема:

PhraseMan has source files and generated files. Gustav plan mentions them but does not define drift detection.

Examples:

- `app/lesson_data_1_8_phrases_source.ts`
- `app/lesson_data_1_8_phrases_es.gen.ts`
- `app/lesson_data_9_16_phrases_es.gen.ts`

Риск:

- Gustav reads generated file as canonical source;
- a stale generated file becomes base for French;
- English audit fixes source but not generated output.

Нужно добавить:

- canonical-source map;
- generated-file provenance;
- hash comparison;
- stale-generated blocker.

Gate:

Gustav cannot use generated files as truth unless provenance says they are current.

### GVA-011. Quiz ambiguity audit needs to be formal, not descriptive

Severity: MEDIUM-HIGH.

Проблема:

План says audit quiz ambiguity, but not how.

Риск:

- paid app can contain questions where multiple answers are valid;
- source locale can make answer too obvious or misleading;
- distractors can test grammar not yet taught.

Нужно добавить quiz item schema:

- `testedSkill`;
- `lessonPrerequisites`;
- `correctAnswerRationale`;
- `distractorRationales`;
- `acceptedAlternatives`;
- `sourceLocalePrompt`;
- `ambiguityScore`;
- `reviewStatus`.

Gate:

Quiz item must fail if `acceptedAlternatives` contains an answer that runtime rejects.

### GVA-012. Curriculum transfer matrix needs explicit decisions

Severity: MEDIUM-HIGH.

Проблема:

План says keep/split/merge/reorder/add/remove, but not the exact artifact.

Риск:

- French will quietly mirror English;
- missing French-specific topics;
- bad lesson order for Russian/Ukrainian learners.

Нужно добавить:

```text
docs/gustav/runs/<runId>/curriculum/transfer_matrix.csv
```

Columns:

- `englishLessonId`;
- `englishSkill`;
- `frenchDecision`;
- `frenchLessonId`;
- `decisionReason`;
- `learnerRiskRu`;
- `learnerRiskUk`;
- `evidenceIds`;
- `reviewVerdict`.

Gate:

Every French lesson must trace to either English transfer, French-specific addition, or product-specific bridge.

## 3. Medium findings

### GVA-013. No explicit stale memory guard for agents

Severity: MEDIUM.

Problem:

The reset rule exists, but agents need prompt-level guard: "ignore all Gustav concepts not present in current docs/gustav and PhraseMan files."

Fix:

Add this to every Gustav agent prompt:

```text
You must not use earlier standalone Gustav ideas. Treat them as invalid unless restated in PhraseMan docs/gustav or supported by app files.
```

### GVA-014. No cost and size control

Severity: MEDIUM.

Problem:

Language generation can explode across lessons, quizzes, words, flashcards, personal practice and UI.

Fix:

Add batch limits:

- one surface at a time;
- one lesson block per run for early pilot;
- max generated artifacts per run;
- mandatory manifest stats.

### GVA-015. No rollback story

Severity: MEDIUM.

Problem:

Integration plan mentions regression but not rollback.

Fix:

Every apply plan must include:

- files touched;
- storage migrations;
- reverse migration;
- feature flag;
- target disabled state.

### GVA-016. No screenshot/UI gate specifics

Severity: MEDIUM.

Problem:

Plan says screenshot smoke tests but not what screens.

Fix:

Minimum screenshot targets:

- language/target switch;
- lesson list;
- lesson intro screen;
- phrase exercise;
- quiz screen;
- trainer/My Practice;
- flashcards;
- progress view.

Gate:

No mixed source/target text visible in the same content scope.

### GVA-017. No product copy policy for bilingual explanations

Severity: MEDIUM.

Problem:

French from Russian and Ukrainian needs consistent grammar terminology and tone.

Fix:

Add source-locale terminology glossary:

- Russian grammar terms;
- Ukrainian grammar terms;
- forbidden calques;
- examples of concise app tone.

### GVA-018. No admin/content operations plan

Severity: MEDIUM.

Problem:

PhraseMan has admin/manual manifests for personal trainings and probably content operations. Gustav needs to know which generated content needs admin sync.

Fix:

Surface inventory must mark:

- requires admin sync;
- has manual manifest;
- has generated derivative;
- has cloud dependency.

## 4. New required artifacts

Create these before French:

1. `docs/gustav/GUSTAV_SURFACE_INVENTORY.md`
2. `docs/gustav/GUSTAV_SOURCE_GRAPH_SCHEMA.md`
3. `docs/gustav/GUSTAV_AGENT_CONTRACTS.md`
4. `docs/gustav/GUSTAV_RUN_ISOLATION_PROTOCOL.md`
5. `docs/gustav/GUSTAV_TARGET_STORAGE_PLAN.md`
6. `docs/gustav/GUSTAV_PERSONAL_PRACTICE_TARGET_PLAN.md`
7. `docs/gustav/GUSTAV_RESEARCH_EVIDENCE_POLICY.md`
8. `docs/gustav/GUSTAV_APPLY_GATE.md`

Add scripts later only after these docs are accepted:

1. `scripts/gustav_source_graph_dump.ts`
2. `scripts/gustav_surface_inventory.ts`
3. `scripts/gustav_validate_run.ts`
4. `scripts/gustav_validate_target_isolation.ts`
5. `scripts/gustav_quiz_ambiguity_audit.ts`
6. `scripts/gustav_personal_practice_target_audit.ts`

## 5. Revised readiness gates

### Gate 0. Reset gate

Status required: PASS.

Requirements:

- old standalone Gustav not used;
- no generated French content outside approved run folder;
- only PhraseMan-derived docs and files are source of truth.

### Gate 1. Inventory gate

Status required: PASS before any generation.

Requirements:

- all learning surfaces listed;
- every surface has owner and files;
- target-sensitive surfaces marked;
- source-locale-sensitive surfaces marked;
- unknown surfaces explicitly listed as blockers.

### Gate 2. Source Graph gate

Status required: PASS before curriculum design.

Requirements:

- English lessons extracted;
- intro screens linked;
- phrase blocks linked;
- quizzes linked;
- vocabulary linked;
- prepositions linked;
- flashcards linked;
- personal trainings linked;
- generated/source provenance recorded.

### Gate 3. English Base audit gate

Status required: PASS or accepted waivers before target design.

Requirements:

- grammar blockers resolved;
- quiz ambiguity blockers resolved;
- source/generated drift resolved;
- source-locale contamination resolved;
- personal practice mismatch resolved.

### Gate 4. Target architecture gate

Status required: PASS before French content.

Requirements:

- TypeScript target/source contracts designed;
- target registry planned;
- loaders planned;
- storage key strategy accepted;
- migration and rollback documented.

### Gate 5. Research evidence gate

Status required: PASS before curriculum freeze.

Requirements:

- evidence ledger exists;
- every curriculum decision has evidence or product rationale;
- source summaries are copyright-safe;
- access dates recorded for web references.

### Gate 6. Agent contract gate

Status required: PASS before agent work.

Requirements:

- every agent has prompt;
- every agent has JSON output schema;
- every agent can return HOLD/BLOCK;
- no agent approves its own generated content.

### Gate 7. Generation gate

Status required: PASS before any content artifact.

Requirements:

- run manifest exists;
- write zone limited to `docs/gustav/runs/<runId>`;
- product writes disabled;
- batch scope small and explicit.

### Gate 8. Apply gate

Status required: explicit approval.

Requirements:

- generated content passed audit;
- apply plan created;
- exact product files listed;
- tests listed;
- rollback listed.

## 6. Updated algorithm skeleton

This is the current safer Gustav algorithm after audit:

```text
GUSTAV(input):
  assert old_standalone_gustav == invalid
  assert input.repo == PhraseMan

  appMap = build_surface_inventory(repo)
  if appMap.hasUnknownLearningSurfaces:
    return HOLD("inventory incomplete")

  sourceGraph = build_english_source_graph(appMap)
  if sourceGraph.missingRequiredLinks:
    return HOLD("source graph incomplete")

  englishAudit = audit_english_base(sourceGraph)
  if englishAudit.hasBlockers:
    return HOLD("english base blockers")

  targetArchitecture = design_target_architecture(repo, sourceGraph)
  if !targetArchitecture.provesIsolation:
    return HOLD("target isolation not proven")

  agentContracts = load_agent_contracts()
  if !agentContracts.allSchemasValid:
    return HOLD("agent contracts incomplete")

  evidencePolicy = load_evidence_policy()
  curriculum = design_target_curriculum(sourceGraph, evidencePolicy)
  if !curriculum.allDecisionsTraceable:
    return HOLD("curriculum lacks evidence")

  run = create_isolated_run_manifest(input, sourceGraph, curriculum)
  generated = generate_small_batch(run)
  audits = run_independent_agents(generated, sourceGraph, curriculum)
  if audits.hasBlockers:
    return HOLD("generated content failed audit")

  applyPlan = create_apply_plan(generated)
  return WAIT_FOR_EXPLICIT_APPROVAL(applyPlan)
```

## 7. Audit decision

Current Gustav status: HOLD, architecture direction approved, implementation readiness not approved.

French generation status: BLOCKED.

Allowed next work:

- write surface inventory;
- write source graph schema;
- write agent contracts;
- write run isolation protocol;
- write target storage plan;
- write personal practice target plan;
- write research evidence policy;
- write apply gate.

Forbidden next work:

- generate French lessons;
- generate French quizzes;
- generate French words;
- edit production lesson files;
- edit trainer storage;
- mutate Heisenberg;
- add French target to runtime.

