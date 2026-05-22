# GUSTAV Source Graph Schema

Status: draft contract v0

Purpose: define the read-only graph Gustav must build from the current PhraseMan English Base before any new study target is designed or generated.

This schema is not a content-generation format. It is an audit and planning format.

French, German, Spanish-as-study-target, or any other new target must not be generated until the English Base Source Graph exists and passes validation.

## 1. Core rule

Gustav must not treat the current app as a simple list of lessons.

The graph must explain:

- what each English lesson teaches;
- which phrases, words, intro screens, quizzes and practice surfaces belong to it;
- which files are canonical source files;
- which files are generated derivatives;
- which source locales are present;
- which runtime screens consume the content;
- what is safe to reuse for a new target language;
- what must be redesigned for a new target language.

If the graph cannot explain a surface, Gustav must mark it as `unknown`, not guess.

## 2. Required top-level shape

```ts
type GustavSourceGraph = {
  schemaVersion: 'gustav-source-graph-v0';
  graphId: string;
  generatedAt: string;
  repoRoot: string;
  inputRef: {
    gitCommit?: string;
    gitStatusSummary: string;
    atlasGeneratedAt?: string;
  };
  baseStudyTarget: 'en';
  supportedSourceLocalesObserved: SourceLocaleId[];
  studyTargetsObserved: StudyTargetId[];
  lessons: LessonNode[];
  introScreens: IntroScreenNode[];
  phrases: PhraseNode[];
  words: WordNode[];
  quizzes: QuizNode[];
  prepositionPacks: PrepositionPackNode[];
  flashcards: FlashcardNode[];
  dailyPhrases: DailyPhraseNode[];
  personalPractice: PersonalPracticeNode[];
  surfaces: SurfaceNode[];
  sourceFiles: SourceFileNode[];
  generatedFiles: GeneratedFileNode[];
  unresolved: UnresolvedNode[];
  validation: GraphValidationSummary;
};
```

## 3. Identity types

```ts
type SourceLocaleId =
  | 'ru'
  | 'uk'
  | 'es'
  | 'pt-BR'
  | 'vi'
  | 'id'
  | 'tr'
  | 'pl';

type StudyTargetId =
  | 'en'
  | 'fr'
  | 'de'
  | 'es';

type SurfaceKind =
  | 'lesson'
  | 'lessonIntro'
  | 'phraseExercise'
  | 'wordExercise'
  | 'quiz'
  | 'prepositionDrill'
  | 'flashcards'
  | 'dailyPhrase'
  | 'personalTraining'
  | 'trainer'
  | 'arena'
  | 'progress'
  | 'admin'
  | 'web'
  | 'unknown';

type ProvenanceKind =
  | 'canonical'
  | 'generated'
  | 'runtime'
  | 'test'
  | 'audit'
  | 'unknown';

type AuditStatus =
  | 'not_audited'
  | 'pass'
  | 'warning'
  | 'hold'
  | 'block';

type Confidence =
  | 'high'
  | 'medium'
  | 'low'
  | 'unknown';
```

Critical distinction:

- `SourceLocaleId` is the language used to explain the lesson to the learner.
- `StudyTargetId` is the language being learned.

No field may use generic `lang` when it actually means one of these two different concepts.

## 4. Shared metadata

```ts
type SourceRef = {
  path: string;
  exportName?: string;
  lineStart?: number;
  lineEnd?: number;
  provenance: ProvenanceKind;
  notes?: string;
};

type RuntimeRef = {
  path: string;
  route?: string;
  componentName?: string;
  surfaceKind: SurfaceKind;
  notes?: string;
};

type LocalizedTextMap = Partial<Record<SourceLocaleId, string>>;

type Risk = {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'blocker';
  title: string;
  detail: string;
  sourceRefs: SourceRef[];
  ownerAgent?: string;
};

type EvidenceRef = {
  evidenceId: string;
  claim: string;
  sourceType: 'app_file' | 'atlas' | 'test' | 'audit' | 'external_reference' | 'manual_note';
  sourceRefs?: SourceRef[];
  confidence: Confidence;
};
```

## 5. Lesson node

```ts
type LessonNode = {
  nodeId: `lesson:${number}`;
  lessonId: number;
  baseStudyTarget: 'en';
  currentOrder: number;
  titles: LocalizedTextMap;
  englishSkillLabel?: string;
  inferredGrammarObjectives: string[];
  explicitGrammarObjectives: string[];
  cefrEstimate?: 'A1' | 'A2' | 'A2+' | 'B1' | 'B1+' | 'unknown';
  introScreenIds: string[];
  phraseIds: string[];
  wordIds: string[];
  quizIds: string[];
  prepositionPackIds: string[];
  personalPracticeIds: string[];
  runtimeRefs: RuntimeRef[];
  sourceRefs: SourceRef[];
  knownRisks: Risk[];
  auditStatus: AuditStatus;
  confidence: Confidence;
};
```

Validation:

- every `LessonNode` must have at least one `SourceRef`;
- every production lesson must have `lessonId`, `currentOrder`, `titles.ru`, `titles.uk`;
- if `englishSkillLabel` is inferred, `confidence` cannot be `high`;
- if lesson has no intro screens, this must be recorded as a risk, not silently ignored.

## 6. Phrase node

```ts
type PhraseNode = {
  nodeId: `phrase:${string}`;
  phraseId: string;
  lessonId: number;
  baseStudyTarget: 'en';
  targetText: string;
  acceptedAlternatives: string[];
  sourcePrompts: LocalizedTextMap;
  tokenWordIds: string[];
  spanishStudyTargetText?: string;
  spanishStudyTargetAlternatives?: string[];
  sourceRefs: SourceRef[];
  generatedFrom?: SourceRef[];
  runtimeRefs: RuntimeRef[];
  knownRisks: Risk[];
  auditStatus: AuditStatus;
  confidence: Confidence;
};
```

Mapping from current app:

- `LessonPhrase.english` -> `targetText`;
- `LessonPhrase.alternatives` -> `acceptedAlternatives`;
- `LessonPhrase.russian` -> `sourcePrompts.ru`;
- `LessonPhrase.ukrainian` -> `sourcePrompts.uk`;
- `LessonPhrase.spanish` -> `sourcePrompts.es`;
- `LessonPhrase.words` and `wordsEn` -> linked `WordNode`s.

Validation:

- `targetText` must be English for base graph;
- Russian/Ukrainian prompts must not be treated as target content;
- `spanishStudyTargetText` cannot be used as French seed;
- generated phrase files must include provenance.

## 7. Word node

```ts
type WordNode = {
  nodeId: `word:${string}`;
  text: string;
  baseStudyTarget: 'en' | 'es' | 'unknown';
  category?: string;
  correct: string;
  distractors: string[];
  lessonIds: number[];
  phraseIds: string[];
  sourceRefs: SourceRef[];
  knownRisks: Risk[];
  auditStatus: AuditStatus;
  confidence: Confidence;
};
```

Validation:

- `correct` must match accepted target token behavior;
- distractors must not contain the correct answer unless the runtime explicitly allows it;
- if a word belongs to Spanish dev target, it must be marked and isolated.

## 8. Intro screen node

```ts
type IntroScreenNode = {
  nodeId: `intro:${number}:${string}`;
  lessonId: number;
  screenId?: string;
  order?: number;
  kind?: string;
  titles: LocalizedTextMap;
  subtitles: LocalizedTextMap;
  lines: Partial<Record<SourceLocaleId, unknown[]>>;
  examples: IntroExampleGraphNode[];
  developerNotes?: {
    screenGoal?: string;
    visualPriority?: string[];
    highlightRules?: string[];
    forbiddenContent?: string[];
    layoutRules?: string[];
  };
  sourceRefs: SourceRef[];
  runtimeRefs: RuntimeRef[];
  knownRisks: Risk[];
  auditStatus: AuditStatus;
  confidence: Confidence;
};

type IntroExampleGraphNode = {
  targetText: string;
  sourceTranslations: LocalizedTextMap;
  notes: LocalizedTextMap;
};
```

Validation:

- intro examples for the English graph must keep English as target text;
- RU and UK explanations must be separate;
- fallback from one source locale to another must be recorded as risk;
- placeholder intro screens must be marked as placeholder or inferred.

## 9. Quiz node

```ts
type QuizNode = {
  nodeId: `quiz:${string}`;
  quizId: string;
  lessonId?: number;
  testedSkills: string[];
  baseStudyTarget: 'en';
  sourceLocalePrompts: LocalizedTextMap;
  targetItems: QuizItemNode[];
  runtimeRefs: RuntimeRef[];
  sourceRefs: SourceRef[];
  knownRisks: Risk[];
  auditStatus: AuditStatus;
  confidence: Confidence;
};

type QuizItemNode = {
  itemId: string;
  prompt: LocalizedTextMap;
  correctAnswer: string;
  acceptedAlternatives: string[];
  distractors: string[];
  correctAnswerRationale?: string;
  distractorRationales?: Record<string, string>;
  prerequisites: string[];
  ambiguityScore?: number;
  knownRisks: Risk[];
};
```

Validation:

- every quiz item must have a tested skill or be marked unknown;
- if multiple answers are linguistically valid but runtime accepts one, audit status is `hold` or `block`;
- no quiz may test a skill that has no lesson/practice prerequisite unless explicitly marked as placement or diagnostic.

## 10. Personal practice node

```ts
type PersonalPracticeNode = {
  nodeId: `practice:${string}`;
  diagnosisId: string;
  baseStudyTarget: 'en';
  cefrLevel?: string;
  prerequisites: string[];
  placementRisk?: string;
  appPath?: string;
  sourceDraft?: string;
  qaReport?: string;
  jesseStatus?: string;
  linkedLessonIds: number[];
  linkedSkillIds: string[];
  sourceLocaleSummaries: LocalizedTextMap;
  sourceRefs: SourceRef[];
  runtimeRefs: RuntimeRef[];
  knownRisks: Risk[];
  auditStatus: AuditStatus;
  confidence: Confidence;
};
```

Validation:

- English diagnosis ids cannot be reused for French without a transfer decision;
- every practice node must declare its base study target;
- active personal training without QA status must block new target generation.

## 11. Other surface nodes

```ts
type PrepositionPackNode = {
  nodeId: `preposition:${string}`;
  baseStudyTarget: 'en';
  kind: 'time' | 'place' | 'direction' | 'other' | 'unknown';
  linkedLessonIds: number[];
  examples: string[];
  sourceRefs: SourceRef[];
  runtimeRefs: RuntimeRef[];
  knownRisks: Risk[];
  auditStatus: AuditStatus;
  confidence: Confidence;
};

type FlashcardNode = {
  nodeId: `flashcard:${string}`;
  baseStudyTarget: 'en' | 'unknown';
  category?: string;
  front?: string;
  backBySourceLocale: LocalizedTextMap;
  linkedLessonIds: number[];
  sourceRefs: SourceRef[];
  runtimeRefs: RuntimeRef[];
  knownRisks: Risk[];
  auditStatus: AuditStatus;
  confidence: Confidence;
};

type DailyPhraseNode = {
  nodeId: `dailyPhrase:${string}`;
  baseStudyTarget: 'en';
  targetText: string;
  sourceLocaleMeanings: LocalizedTextMap;
  sourceRefs: SourceRef[];
  runtimeRefs: RuntimeRef[];
  knownRisks: Risk[];
  auditStatus: AuditStatus;
  confidence: Confidence;
};

type SurfaceNode = {
  nodeId: `surface:${string}`;
  surfaceKind: SurfaceKind;
  path: string;
  route?: string;
  targetSensitive: boolean;
  sourceLocaleSensitive: boolean;
  progressSensitive: boolean;
  storageSensitive: boolean;
  cloudSensitive: boolean;
  owner: 'course' | 'quiz' | 'trainer' | 'personal_practice' | 'heisenberg' | 'ui' | 'admin' | 'unknown';
  contentNodeIds: string[];
  knownRisks: Risk[];
  auditStatus: AuditStatus;
};
```

## 12. Source and generated file nodes

```ts
type SourceFileNode = {
  path: string;
  provenance: 'canonical' | 'runtime' | 'test' | 'audit' | 'unknown';
  exports: string[];
  contentKinds: SurfaceKind[];
  targetSensitive: boolean;
  sourceLocaleSensitive: boolean;
  canonicalFor: string[];
  generatedDerivatives: string[];
  knownRisks: Risk[];
};

type GeneratedFileNode = {
  path: string;
  generatedFrom: SourceRef[];
  generatedBy?: string;
  generatedAt?: string;
  currentHash?: string;
  sourceHash?: string;
  staleStatus: 'current' | 'stale' | 'unknown';
  contentKinds: SurfaceKind[];
  mustNotUseAsCanonical: boolean;
  knownRisks: Risk[];
};

type UnresolvedNode = {
  id: string;
  kind: 'missing_link' | 'unknown_surface' | 'unknown_provenance' | 'ambiguous_owner' | 'schema_gap';
  title: string;
  detail: string;
  sourceRefs: SourceRef[];
  severity: 'low' | 'medium' | 'high' | 'blocker';
};
```

Validation:

- generated file without `generatedFrom` is `unknown` and cannot be canonical;
- stale generated file is a blocker for target generation if it feeds lesson, quiz or practice content;
- unresolved blocker means graph verdict is `HOLD`.

## 13. Validation summary

```ts
type GraphValidationSummary = {
  verdict: 'PASS' | 'HOLD' | 'BLOCK';
  totalLessons: number;
  totalPhrases: number;
  totalIntroScreens: number;
  totalQuizzes: number;
  totalPersonalPracticeNodes: number;
  totalSurfaces: number;
  unresolvedBlockers: number;
  unresolvedHighRisks: number;
  generatedFileUnknowns: number;
  sourceLocaleTargetConfusions: number;
  notes: string[];
};
```

`PASS` means the graph is complete enough for curriculum design.

`HOLD` means Gustav can continue inventory/audit work but cannot generate target language.

`BLOCK` means current source graph is unsafe even for curriculum transfer.

## 14. Current PhraseMan source mapping

Initial canonical inputs:

- lesson spine: `constants/lessons.ts`, `app/lesson_data_all.ts`;
- lesson types: `app/lesson_data_types.ts`;
- phrase data: `app/lesson_data_1_8_phrases_source.ts`, `app/lesson_data_1_8_phrases_es.gen.ts`, `app/lesson_data_9_16_phrases_es.gen.ts`, `app/lesson_data_17_24.ts`, `app/lesson_data_25_32.ts`;
- intro screens: `app/lesson_intro_screens_lesson*_v2.ts`, `app/lesson_intro_screens_9_32.ts`, `app/lesson_intro_screens_17_32.ts`, `app/lesson_intro_screens_en_17_32.ts`, `app/lesson_intro_screens_es_l2.ts`;
- words: `app/lesson_words.tsx`, `app/lesson_words_source_locales.ts`, `app/lesson_words_es_map.ts`, `app/lesson_words_spanish_gloss.ts`;
- quizzes: `app/quiz_data.ts`, `app/quiz_data_es_l2.ts`, `app/quiz_source_locale_payloads.ts`, `app/quizzes/*`;
- prepositions: `app/preposition_explanations.ts`, `app/preposition_overrides.ts`, `app/lesson_prepositions.ts`, `app/preposition_drill.tsx`;
- personal practice: `app/personal_training_taxonomy.ts`, `app/diagnosis_training_*.ts`, `app/diagnosis_training_engine.ts`, `app/diagnosis_training_types.ts`, `tools/personal_training_agent_room/*`;
- trainer: `app/trainer_store.ts`, `app/trainer_session.ts`, `app/trainer_smart_session.tsx`, `app/trainer_words_session.tsx`, `app/trainer_phrases_session.tsx`;
- source-locale architecture: `app/source_locales.ts`;
- target dev switch: `app/study_target_lang_dev.ts`, `app/spanish_content_gate.ts`;
- Heisenberg: `docs/HEISENBERG_LOCALIZATION_PIPELINE.md`, `scripts/heisenberg_pipeline.cjs`, `scripts/lib/heisenberg_core.cjs`.

## 15. Hard fail rules

The Source Graph fails if:

- target language and source locale are represented by one field;
- any target-language content is found inside source-locale fields without explicit legacy note;
- generated files are treated as canonical without provenance;
- any lesson has phrases but no linked lesson node;
- any quiz has no tested skill and no diagnostic marker;
- any personal practice training is linked to a new target without transfer decision;
- French generation exists before graph verdict `PASS`.

## 16. What Gustav must not infer

Gustav must not infer:

- French lesson order from English order without transfer matrix;
- French grammar rules from English grammar labels;
- personal practice diagnosis ids from English ids;
- source locale from UI language if the current context says study target;
- study target from source locale;
- generated file freshness without provenance;
- content correctness from file existence.

