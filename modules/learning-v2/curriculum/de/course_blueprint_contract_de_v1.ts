import { canonicalJsonV1 } from "../../policies/decision_registry";
import { GERMAN_RESEARCH_EVIDENCE_BINDINGS_DE_V1 } from "./research_evidence_bindings_de_v1";

export type GermanGrammarConstructIdDeV1 = `de_gc_${string}`;
export type GermanLexicalSenseIdDeV1 = `de_lex_${string}`;
export type GermanPronunciationTargetIdDeV1 = `de_pron_${string}`;
export type GermanCommunicativeOutcomeIdDeV1 = `de_out_${string}`;
export type GermanPhraseFrameIdDeV1 = `de_pf_${string}`;
export type GermanForbiddenSurfaceFormIdDeV1 = `de_forbid_${string}`;
export type GermanGraphEdgeIdDeV1 = `de_edge_${string}`;
export type GermanSituationIdDeV1 = `de_sit_${string}`;
export type GermanLexicalSlotIdDeV1 = `de_slot_${string}`;
export type GermanSessionPacketIdDeV1 = `de_l${string}_c${string}_s${string}`;
export type GermanEvidenceIdDeV1 = string;
export type Sha256HexDeV1 = string;

export type GermanGrammarConstructDeV1 = Readonly<{
  id: GermanGrammarConstructIdDeV1;
  form: string;
  function: string;
  scope: Readonly<{
    receptive: boolean;
    productive: boolean;
  }>;
  exclusions: readonly string[];
  prerequisiteIds: readonly GermanGrammarConstructIdDeV1[];
  firstIntroductionPacketId: GermanSessionPacketIdDeV1;
  guidedTargetPacketIds: readonly GermanSessionPacketIdDeV1[];
  retrievalTargetPacketIds: readonly GermanSessionPacketIdDeV1[];
  productionTargetPacketIds: readonly GermanSessionPacketIdDeV1[];
  transferTargetPacketIds: readonly GermanSessionPacketIdDeV1[];
  delayedTargetPacketIds: readonly GermanSessionPacketIdDeV1[];
  evidenceStatus: "DIRECT_SOURCE" | "PEDAGOGICAL_INFERENCE";
  evidenceIds: readonly GermanEvidenceIdDeV1[];
}>;

export type GermanLexicalPartOfSpeechDeV1 =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "determiner"
  | "preposition"
  | "conjunction"
  | "particle"
  | "numeral"
  | "formulaic_chunk"
  | "other";

export type GermanLexicalSenseDeV1 = Readonly<{
  id: GermanLexicalSenseIdDeV1;
  lemma: string;
  senseGloss: string;
  partOfSpeech: GermanLexicalPartOfSpeechDeV1;
  nounGender: "der" | "die" | "das" | null;
  nounPlural: string | null;
  verbValency: readonly string[] | null;
  verbFrame: string | null;
  verbSeparability: "SEPARABLE" | "INSEPARABLE" | null;
  verbAuxiliary: "haben" | "sein" | "haben_or_sein" | null;
  productionPolicy: "productive" | "receptive" | "regional_receptive";
  region: "AT" | "CH" | null;
  evidenceIds: readonly GermanEvidenceIdDeV1[];
}>;

export type GermanPronunciationEvidenceStatusDeV1 =
  | "DIRECT_SYSTEM"
  | "DIRECT_L2_RU"
  | "DIRECT_L2_UK"
  | "CONTRASTIVE_RISK"
  | "PEDAGOGICAL_INFERENCE";

export type GermanPronunciationCanonicalEvidenceBindingDeV1 = Readonly<{
  kind: "CANONICAL_BINDING";
  evidenceId: GermanEvidenceIdDeV1;
  evidenceStatus: Exclude<GermanPronunciationEvidenceStatusDeV1, "PEDAGOGICAL_INFERENCE">;
}>;

export type GermanPronunciationPedagogicalInferenceDeV1 = Readonly<{
  kind: "PEDAGOGICAL_INFERENCE";
  evidenceStatus: "PEDAGOGICAL_INFERENCE";
  rationale: string;
  supportingEvidenceBindings: readonly Readonly<{
    evidenceId: GermanEvidenceIdDeV1;
    evidenceStatus: Exclude<GermanPronunciationEvidenceStatusDeV1, "PEDAGOGICAL_INFERENCE">;
  }>[];
}>;

export type GermanPronunciationApplicabilityDeV1 = Readonly<{
  status: "APPLIES" | "DIAGNOSTIC_ONLY" | "NOT_APPLICABLE";
  correctiveRoute: string | null;
  rationale: string;
  evidenceBindings: readonly (
    | GermanPronunciationCanonicalEvidenceBindingDeV1
    | GermanPronunciationPedagogicalInferenceDeV1
  )[];
}>;

export type GermanPronunciationTargetDeV1 = Readonly<{
  id: GermanPronunciationTargetIdDeV1;
  target: string;
  perceptionEvidenceIds: readonly GermanEvidenceIdDeV1[];
  productionEvidenceIds: readonly GermanEvidenceIdDeV1[];
  ruApplicability: GermanPronunciationApplicabilityDeV1;
  ukApplicability: GermanPronunciationApplicabilityDeV1;
}>;

export type GermanCommunicativeOutcomeDeV1 = Readonly<{
  id: GermanCommunicativeOutcomeIdDeV1;
  cefrBand: "PRE_A1" | "A1" | "A2" | "B1";
  canDo: string;
  evidenceIds: readonly GermanEvidenceIdDeV1[];
}>;

export type GermanForbiddenSurfaceFormDeV1 = Readonly<{
  id: GermanForbiddenSurfaceFormIdDeV1;
  surface: string;
  reason: string;
  unlockConstructIds: readonly GermanGrammarConstructIdDeV1[];
  evidenceIds: readonly GermanEvidenceIdDeV1[];
}>;

export type GermanPhraseFrameDeV1 = Readonly<{
  id: GermanPhraseFrameIdDeV1;
  frame: string;
  grammarConstructIds: readonly GermanGrammarConstructIdDeV1[];
  lexicalSenseIds: readonly GermanLexicalSenseIdDeV1[];
  communicativeOutcomeIds: readonly GermanCommunicativeOutcomeIdDeV1[];
  forbiddenSurfaceFormIds: readonly GermanForbiddenSurfaceFormIdDeV1[];
  evidenceIds: readonly GermanEvidenceIdDeV1[];
}>;

export type GermanBlueprintSourceHashDeV1 = Readonly<{
  path: string;
  sha256: Sha256HexDeV1;
}>;

export type GermanExactSessionPacketDeV1 = Readonly<{
  id: GermanSessionPacketIdDeV1;
  lessonOrdinal: number;
  chapterOrdinal: number;
  sessionOrdinal: number;
  sessionWithinChapter: number;
  sourcePath: string;
  grammarConstructId: GermanGrammarConstructIdDeV1 | null;
  reviewConstructIds: readonly GermanGrammarConstructIdDeV1[];
  communicativeOutcomeIds: readonly GermanCommunicativeOutcomeIdDeV1[];
  prerequisiteOutcomeIds: readonly GermanCommunicativeOutcomeIdDeV1[];
  prerequisiteConstructIds: readonly GermanGrammarConstructIdDeV1[];
  prerequisitePacketIds: readonly GermanSessionPacketIdDeV1[];
  prohibitedConstructIds: readonly GermanGrammarConstructIdDeV1[];
  forbiddenSurfaceFormIds: readonly GermanForbiddenSurfaceFormIdDeV1[];
  situation: Readonly<{
    id: GermanSituationIdDeV1;
    description: string;
    contextSignature: string;
  }>;
  learningDelta: Readonly<{
    kind: "new_operation" | "reduced_support" | "changed_context" | "contrast" | "production" | "repair" | "transfer";
    description: string;
  }>;
  newLexicalSenseIds: readonly GermanLexicalSenseIdDeV1[];
  primaryLexicalSenseIds: readonly GermanLexicalSenseIdDeV1[];
  wordFirstGroundingLexicalSenseIds: readonly GermanLexicalSenseIdDeV1[];
  retrievalLexicalSenseIds: readonly GermanLexicalSenseIdDeV1[];
  phraseFrameIds: readonly GermanPhraseFrameIdDeV1[];
  canonicalExamples: readonly string[];
  allowedLexicalSlots: readonly Readonly<{
    id: GermanLexicalSlotIdDeV1;
    lexicalSenseIds: readonly GermanLexicalSenseIdDeV1[];
  }>[];
  sessionRole: "grammar_introduction" | "guided_extension" | "diagnostic_contrast" | "retrieval" | "spoken_production" | "transfer" | "checkpoint" | "review";
  modeFamilies: readonly ("word_grounding" | "form_function_discrimination" | "guided_retrieval" | "listening_comprehension" | "spoken_production" | "changed_context_transfer" | "delayed_retrieval")[];
  supportTrajectory: Readonly<{
    guided: "high" | "medium" | "low";
    retrieval: "medium" | "low" | "none";
    independent: "low" | "none";
  }>;
  independentProbe: Readonly<{
    trainingContextSignature: string;
    probeContextSignature: string;
    changedContextRequired: true;
    support: "low" | "none";
    lexicalSenseIds: readonly GermanLexicalSenseIdDeV1[];
  }>;
  delayedProbes: readonly Readonly<{
    /** Later packet in which this source packet's material is probed again. */
    targetPacketId: GermanSessionPacketIdDeV1;
    retrievalKind: "cross_session" | "cross_chapter" | "cross_lesson";
    contextSignature: string;
  }>[];
  accessibilityAlternative: Readonly<{
    modality: "visual_non_audio" | "text_non_speech" | "keyboard_non_drag" | "extended_time";
    description: string;
  }>;
  audioSemanticsRequired: boolean;
  phoneticDistractorCheckRequired: boolean;
  reviewEdgeIds: readonly GermanGraphEdgeIdDeV1[];
  pronunciationTargetIds: readonly GermanPronunciationTargetIdDeV1[];
  evidenceIds: readonly GermanEvidenceIdDeV1[];
  sourceHashes: readonly GermanBlueprintSourceHashDeV1[];
}>;

export type GermanPrerequisiteEdgeDeV1 = Readonly<{
  id: GermanGraphEdgeIdDeV1;
  prerequisiteId: GermanGrammarConstructIdDeV1;
  dependentId: GermanGrammarConstructIdDeV1;
  evidenceIds: readonly GermanEvidenceIdDeV1[];
}>;

export type GermanLexicalRetrievalEdgeDeV1 = Readonly<{
  id: GermanGraphEdgeIdDeV1;
  lexicalSenseId: GermanLexicalSenseIdDeV1;
  fromPacketId: GermanSessionPacketIdDeV1;
  toPacketId: GermanSessionPacketIdDeV1;
  retrievalKind: "cross_session" | "cross_chapter" | "cross_lesson";
}>;

export type GermanReviewEdgeDeV1 = Readonly<{
  id: GermanGraphEdgeIdDeV1;
  fromPacketId: GermanSessionPacketIdDeV1;
  toPacketId: GermanSessionPacketIdDeV1;
  grammarConstructIds: readonly GermanGrammarConstructIdDeV1[];
  lexicalSenseIds: readonly GermanLexicalSenseIdDeV1[];
  learningDelta: "reduced_support" | "changed_context" | "contrast" | "production" | "repair" | "transfer";
}>;

export type GermanBlueprintGraphsDeV1 = Readonly<{
  prerequisiteDag: readonly GermanPrerequisiteEdgeDeV1[];
  lexicalRetrievalGraph: readonly GermanLexicalRetrievalEdgeDeV1[];
  reviewEdges: readonly GermanReviewEdgeDeV1[];
}>;

export type GermanGrammarCoverageRowDeV1 = Readonly<{
  grammarConstructId: GermanGrammarConstructIdDeV1;
  explainPacketIds: readonly GermanSessionPacketIdDeV1[];
  discriminatePacketIds: readonly GermanSessionPacketIdDeV1[];
  guidedRetrievePacketIds: readonly GermanSessionPacketIdDeV1[];
  independentProducePacketIds: readonly GermanSessionPacketIdDeV1[];
  changedContextTransferPacketIds: readonly GermanSessionPacketIdDeV1[];
  delayedRetrievePacketIds: readonly GermanSessionPacketIdDeV1[];
}>;

export type GermanLexicalCoverageRowDeV1 = Readonly<{
  lexicalSenseId: GermanLexicalSenseIdDeV1;
  firstEncounterPacketId: GermanSessionPacketIdDeV1;
  meaningRetrievalPacketIds: readonly GermanSessionPacketIdDeV1[];
  formRetrievalPacketIds: readonly GermanSessionPacketIdDeV1[];
  phraseUsePacketIds: readonly GermanSessionPacketIdDeV1[];
  spokenUsePacketIds: readonly GermanSessionPacketIdDeV1[];
  crossSessionPacketIds: readonly GermanSessionPacketIdDeV1[];
  crossLessonPacketIds: readonly GermanSessionPacketIdDeV1[];
  delayedRetrievePacketIds: readonly GermanSessionPacketIdDeV1[];
}>;

export type GermanCanDoCoverageRowDeV1 = Readonly<{
  communicativeOutcomeId: GermanCommunicativeOutcomeIdDeV1;
  receptionPacketIds: readonly GermanSessionPacketIdDeV1[];
  productionOrInteractionPacketIds: readonly GermanSessionPacketIdDeV1[];
  transferPacketIds: readonly GermanSessionPacketIdDeV1[];
}>;

export type GermanPronunciationCoverageRowDeV1 = Readonly<{
  pronunciationTargetId: GermanPronunciationTargetIdDeV1;
  perceptionPacketIds: readonly GermanSessionPacketIdDeV1[];
  productionPacketIds: readonly GermanSessionPacketIdDeV1[];
}>;

export type GermanRuUkInterferenceRowDeV1 = Readonly<{
  pronunciationTargetId: GermanPronunciationTargetIdDeV1;
  ruPacketIds: readonly GermanSessionPacketIdDeV1[];
  ukPacketIds: readonly GermanSessionPacketIdDeV1[];
}>;

export type GermanBlueprintMatricesDeV1 = Readonly<{
  grammarCoverage: readonly GermanGrammarCoverageRowDeV1[];
  lexicalCoverage: readonly GermanLexicalCoverageRowDeV1[];
  canDoCoverage: readonly GermanCanDoCoverageRowDeV1[];
  pronunciationCoverage: readonly GermanPronunciationCoverageRowDeV1[];
  ruUkInterference: readonly GermanRuUkInterferenceRowDeV1[];
}>;

export type GermanBlueprintSourceDigestsDeV1 = Readonly<{
  researchDossier: Sha256HexDeV1 | null;
  sourceEvidenceLedger: Sha256HexDeV1 | null;
  ownerDecisions: Sha256HexDeV1 | null;
  taskPacketStage0: Sha256HexDeV1 | null;
  requirementManifest: Sha256HexDeV1 | null;
  designSpec: Sha256HexDeV1 | null;
  implementationPlan: Sha256HexDeV1 | null;
}>;

export type GermanBlueprintRegistryDigestsDeV1 = Readonly<{
  lessons: Sha256HexDeV1 | null;
  chapters: Sha256HexDeV1 | null;
  grammarConstructs: Sha256HexDeV1 | null;
  lexicalSenses: Sha256HexDeV1 | null;
  communicativeOutcomes: Sha256HexDeV1 | null;
  pronunciationTargets: Sha256HexDeV1 | null;
  phraseFrames: Sha256HexDeV1 | null;
  forbiddenSurfaceForms: Sha256HexDeV1 | null;
  sessionPackets: Sha256HexDeV1 | null;
}>;

export type GermanCourseBlueprintDeV1 = Readonly<{
  schemaVersion: "learning-v2-german-course-blueprint.v1";
  targetLanguage: "de";
  localePolicy: readonly ["ru", "uk"];
  declaredCounts: Readonly<{
    lessons: 32;
    chapters: 224;
    sessionPackets: 1792;
  }>;
  artifactPaths: Readonly<{
    blueprintContract: "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts";
    courseIndex: "modules/learning-v2/curriculum/de/course_blueprint_de_v1.json";
    lessonRegistry: "modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json";
    chapterRegistry: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json";
    grammarRegistry: "modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json";
    lexicalRegistry: "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json";
    communicativeOutcomeRegistry: "modules/learning-v2/curriculum/de/registries/communicative_outcomes_de_v1.json";
    pronunciationRegistry: "modules/learning-v2/curriculum/de/registries/pronunciation_targets_de_v1.json";
    phraseFrameRegistry: "modules/learning-v2/curriculum/de/registries/phrase_frames_de_v1.json";
    forbiddenSurfaceFormRegistry: "modules/learning-v2/curriculum/de/registries/forbidden_surface_forms_de_v1.json";
    prerequisiteDag: "modules/learning-v2/curriculum/de/graphs/prerequisite_dag_de_v1.json";
    lexicalRetrievalGraph: "modules/learning-v2/curriculum/de/graphs/lexical_retrieval_graph_de_v1.json";
    reviewEdges: "modules/learning-v2/curriculum/de/graphs/review_edges_de_v1.json";
    grammarCoverageMatrix: "modules/learning-v2/curriculum/de/matrices/grammar_coverage_de_v1.json";
    lexicalCoverageMatrix: "modules/learning-v2/curriculum/de/matrices/lexical_coverage_de_v1.json";
    canDoCoverageMatrix: "modules/learning-v2/curriculum/de/matrices/can_do_coverage_de_v1.json";
    pronunciationCoverageMatrix: "modules/learning-v2/curriculum/de/matrices/pronunciation_coverage_de_v1.json";
    ruUkInterferenceMatrix: "modules/learning-v2/curriculum/de/matrices/ru_uk_interference_de_v1.json";
    packetPattern: "content/learning-v2-course/curriculum/de/packets/lXX/sYY.json";
    validationModule: "modules/learning-v2/curriculum/de/course_blueprint_validation_de_v1.ts";
    approvalRegistry: "modules/learning-v2/curriculum/de/blueprint_approval_registry_de_v1.ts";
    ownerMapBuilder: "scripts/learning-v2-de-build-owner-map.mjs";
    ownerMapHtml: ".codex-tmp/learning-v2-curriculum-owner-map-de/index.html";
    ownerMapManifest: ".codex-tmp/learning-v2-curriculum-owner-map-de/manifest.json";
    blueprintOwnerApproval: "docs/v2/curriculum/de/BLUEPRINT_OWNER_APPROVAL.md";
  }>;
  sourceDigests: GermanBlueprintSourceDigestsDeV1;
  registryDigests: GermanBlueprintRegistryDigestsDeV1;
  graphDigests: Readonly<{
    prerequisiteDag: Sha256HexDeV1 | null;
    lexicalRetrievalGraph: Sha256HexDeV1 | null;
    reviewEdges: Sha256HexDeV1 | null;
  }>;
  matrixDigests: Readonly<{
    grammarCoverage: Sha256HexDeV1 | null;
    lexicalCoverage: Sha256HexDeV1 | null;
    canDoCoverage: Sha256HexDeV1 | null;
    pronunciationCoverage: Sha256HexDeV1 | null;
    ruUkInterference: Sha256HexDeV1 | null;
  }>;
  candidateFingerprint: Sha256HexDeV1 | null;
  grammarConstructs: readonly GermanGrammarConstructDeV1[];
  lexicalSenses: readonly GermanLexicalSenseDeV1[];
  communicativeOutcomes: readonly GermanCommunicativeOutcomeDeV1[];
  pronunciationTargets: readonly GermanPronunciationTargetDeV1[];
  phraseFrames: readonly GermanPhraseFrameDeV1[];
  forbiddenSurfaceForms: readonly GermanForbiddenSurfaceFormDeV1[];
  sessionPackets: readonly GermanExactSessionPacketDeV1[];
  graphs: GermanBlueprintGraphsDeV1;
  matrices: GermanBlueprintMatricesDeV1;
}>;

export class GermanCourseBlueprintSchemaErrorDeV1 extends Error {
  constructor(
    readonly code: string,
    readonly path: string,
  ) {
    super(`${code}:${path}`);
    this.name = "GermanCourseBlueprintSchemaErrorDeV1";
  }
}

const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "targetLanguage",
  "localePolicy",
  "declaredCounts",
  "artifactPaths",
  "sourceDigests",
  "registryDigests",
  "graphDigests",
  "matrixDigests",
  "candidateFingerprint",
  "grammarConstructs",
  "lexicalSenses",
  "communicativeOutcomes",
  "pronunciationTargets",
  "phraseFrames",
  "forbiddenSurfaceForms",
  "sessionPackets",
  "graphs",
  "matrices",
] as const);

const DECLARED_COUNT_KEYS = Object.freeze([
  "lessons",
  "chapters",
  "sessionPackets",
] as const);

const ARTIFACT_PATHS = Object.freeze({
  blueprintContract: "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts",
  courseIndex: "modules/learning-v2/curriculum/de/course_blueprint_de_v1.json",
  lessonRegistry: "modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json",
  chapterRegistry: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
  grammarRegistry: "modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json",
  lexicalRegistry: "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json",
  communicativeOutcomeRegistry: "modules/learning-v2/curriculum/de/registries/communicative_outcomes_de_v1.json",
  pronunciationRegistry: "modules/learning-v2/curriculum/de/registries/pronunciation_targets_de_v1.json",
  phraseFrameRegistry: "modules/learning-v2/curriculum/de/registries/phrase_frames_de_v1.json",
  forbiddenSurfaceFormRegistry: "modules/learning-v2/curriculum/de/registries/forbidden_surface_forms_de_v1.json",
  prerequisiteDag: "modules/learning-v2/curriculum/de/graphs/prerequisite_dag_de_v1.json",
  lexicalRetrievalGraph: "modules/learning-v2/curriculum/de/graphs/lexical_retrieval_graph_de_v1.json",
  reviewEdges: "modules/learning-v2/curriculum/de/graphs/review_edges_de_v1.json",
  grammarCoverageMatrix: "modules/learning-v2/curriculum/de/matrices/grammar_coverage_de_v1.json",
  lexicalCoverageMatrix: "modules/learning-v2/curriculum/de/matrices/lexical_coverage_de_v1.json",
  canDoCoverageMatrix: "modules/learning-v2/curriculum/de/matrices/can_do_coverage_de_v1.json",
  pronunciationCoverageMatrix: "modules/learning-v2/curriculum/de/matrices/pronunciation_coverage_de_v1.json",
  ruUkInterferenceMatrix: "modules/learning-v2/curriculum/de/matrices/ru_uk_interference_de_v1.json",
  packetPattern: "content/learning-v2-course/curriculum/de/packets/lXX/sYY.json",
  validationModule: "modules/learning-v2/curriculum/de/course_blueprint_validation_de_v1.ts",
  approvalRegistry: "modules/learning-v2/curriculum/de/blueprint_approval_registry_de_v1.ts",
  ownerMapBuilder: "scripts/learning-v2-de-build-owner-map.mjs",
  ownerMapHtml: ".codex-tmp/learning-v2-curriculum-owner-map-de/index.html",
  ownerMapManifest: ".codex-tmp/learning-v2-curriculum-owner-map-de/manifest.json",
  blueprintOwnerApproval: "docs/v2/curriculum/de/BLUEPRINT_OWNER_APPROVAL.md",
} as const);

const SOURCE_DIGEST_KEYS = Object.freeze([
  "researchDossier",
  "sourceEvidenceLedger",
  "ownerDecisions",
  "taskPacketStage0",
  "requirementManifest",
  "designSpec",
  "implementationPlan",
] as const);

const REGISTRY_DIGEST_KEYS = Object.freeze([
  "lessons",
  "chapters",
  "grammarConstructs",
  "lexicalSenses",
  "communicativeOutcomes",
  "pronunciationTargets",
  "phraseFrames",
  "forbiddenSurfaceForms",
  "sessionPackets",
] as const);

const GRAPH_DIGEST_KEYS = Object.freeze([
  "prerequisiteDag",
  "lexicalRetrievalGraph",
  "reviewEdges",
] as const);

const MATRIX_DIGEST_KEYS = Object.freeze([
  "grammarCoverage",
  "lexicalCoverage",
  "canDoCoverage",
  "pronunciationCoverage",
  "ruUkInterference",
] as const);

const GRAMMAR_KEYS = Object.freeze([
  "id",
  "form",
  "function",
  "scope",
  "exclusions",
  "prerequisiteIds",
  "firstIntroductionPacketId",
  "guidedTargetPacketIds",
  "retrievalTargetPacketIds",
  "productionTargetPacketIds",
  "transferTargetPacketIds",
  "delayedTargetPacketIds",
  "evidenceStatus",
  "evidenceIds",
] as const);

const LEXICAL_KEYS = Object.freeze([
  "id",
  "lemma",
  "senseGloss",
  "partOfSpeech",
  "nounGender",
  "nounPlural",
  "verbValency",
  "verbFrame",
  "verbSeparability",
  "verbAuxiliary",
  "productionPolicy",
  "region",
  "evidenceIds",
] as const);

const PRONUNCIATION_KEYS = Object.freeze([
  "id",
  "target",
  "perceptionEvidenceIds",
  "productionEvidenceIds",
  "ruApplicability",
  "ukApplicability",
] as const);

const COMMUNICATIVE_OUTCOME_KEYS = Object.freeze([
  "id",
  "cefrBand",
  "canDo",
  "evidenceIds",
] as const);

const FORBIDDEN_SURFACE_FORM_KEYS = Object.freeze([
  "id",
  "surface",
  "reason",
  "unlockConstructIds",
  "evidenceIds",
] as const);

const PHRASE_FRAME_KEYS = Object.freeze([
  "id",
  "frame",
  "grammarConstructIds",
  "lexicalSenseIds",
  "communicativeOutcomeIds",
  "forbiddenSurfaceFormIds",
  "evidenceIds",
] as const);

const PACKET_KEYS = Object.freeze([
  "id",
  "lessonOrdinal",
  "chapterOrdinal",
  "sessionOrdinal",
  "sessionWithinChapter",
  "sourcePath",
  "grammarConstructId",
  "reviewConstructIds",
  "communicativeOutcomeIds",
  "prerequisiteOutcomeIds",
  "prerequisiteConstructIds",
  "prerequisitePacketIds",
  "prohibitedConstructIds",
  "forbiddenSurfaceFormIds",
  "situation",
  "learningDelta",
  "newLexicalSenseIds",
  "primaryLexicalSenseIds",
  "wordFirstGroundingLexicalSenseIds",
  "retrievalLexicalSenseIds",
  "phraseFrameIds",
  "canonicalExamples",
  "allowedLexicalSlots",
  "sessionRole",
  "modeFamilies",
  "supportTrajectory",
  "independentProbe",
  "delayedProbes",
  "accessibilityAlternative",
  "audioSemanticsRequired",
  "phoneticDistractorCheckRequired",
  "reviewEdgeIds",
  "pronunciationTargetIds",
  "evidenceIds",
  "sourceHashes",
] as const);

const GRAPH_KEYS = Object.freeze([
  "prerequisiteDag",
  "lexicalRetrievalGraph",
  "reviewEdges",
] as const);

const MATRIX_KEYS = Object.freeze([
  "grammarCoverage",
  "lexicalCoverage",
  "canDoCoverage",
  "pronunciationCoverage",
  "ruUkInterference",
] as const);

const GERMAN_ID_PATTERN = /^de_[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u;
const SESSION_ID_PATTERN = /^de_l(\d{2})_c(\d{2})_s(\d{2})$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const ENGLISH_TARGET_PATH_PATTERN = /(?:^|\/)en(?:\/|$)|_en(?:_|\.|$)|english/iu;
const PARTS_OF_SPEECH = new Set<GermanLexicalPartOfSpeechDeV1>([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "determiner",
  "preposition",
  "conjunction",
  "particle",
  "numeral",
  "formulaic_chunk",
  "other",
]);
const PRONUNCIATION_EVIDENCE_STATUSES = new Set<GermanPronunciationEvidenceStatusDeV1>([
  "DIRECT_SYSTEM",
  "DIRECT_L2_RU",
  "DIRECT_L2_UK",
  "CONTRASTIVE_RISK",
  "PEDAGOGICAL_INFERENCE",
]);
const PRONUNCIATION_APPLICABILITY_STATUSES = new Set<
  GermanPronunciationApplicabilityDeV1["status"]
>(["APPLIES", "DIAGNOSTIC_ONLY", "NOT_APPLICABLE"]);
const DECLARED_EVIDENCE_IDS = new Set<string>(
  GERMAN_RESEARCH_EVIDENCE_BINDINGS_DE_V1.map((binding) => binding.id),
);
const EVIDENCE_STATUS_BY_ID = new Map<string, string>(
  GERMAN_RESEARCH_EVIDENCE_BINDINGS_DE_V1.map((binding) => [binding.id, binding.status]),
);
const GRAMMAR_EVIDENCE_STATUSES = new Set(["DIRECT_SOURCE", "PEDAGOGICAL_INFERENCE"]);
const VERB_SEPARABILITY_VALUES = new Set(["SEPARABLE", "INSEPARABLE"]);
const VERB_AUXILIARY_VALUES = new Set(["haben", "sein", "haben_or_sein"]);
const SESSION_ROLES = new Set([
  "grammar_introduction",
  "guided_extension",
  "diagnostic_contrast",
  "retrieval",
  "spoken_production",
  "transfer",
  "checkpoint",
  "review",
]);
const MODE_FAMILIES = new Set([
  "word_grounding",
  "form_function_discrimination",
  "guided_retrieval",
  "listening_comprehension",
  "spoken_production",
  "changed_context_transfer",
  "delayed_retrieval",
]);

function fail(code: string, path: string): never {
  throw new GermanCourseBlueprintSchemaErrorDeV1(code, path);
}

function assertRecord(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("plain_record_required", path);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("plain_record_required", path);
  }
}

function assertClosedKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  path: string,
): void {
  const actualKeys = Object.keys(value);
  for (const key of expectedKeys) {
    if (!Object.hasOwn(value, key)) fail("missing_field", `${path}.${key}`);
  }
  for (const key of actualKeys) {
    if (!expectedKeys.includes(key)) fail("unknown_field", `${path}.${key}`);
  }
}

function assertArray(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) fail("array_required", path);
}

function assertNonEmptyString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail("non_empty_string_required", path);
  }
}

function assertBoolean(value: unknown, path: string): asserts value is boolean {
  if (typeof value !== "boolean") fail("boolean_required", path);
}

function assertIntegerInRange(value: unknown, minimum: number, maximum: number, path: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    fail("integer_range_invalid", path);
  }
}

function assertUniqueStrings(
  value: unknown,
  path: string,
  options: Readonly<{ nonEmpty?: boolean }> = {},
): asserts value is string[] {
  assertArray(value, path);
  if (options.nonEmpty && value.length === 0) fail("non_empty_array_required", path);
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const itemPath = `${path}[${index}]`;
    assertNonEmptyString(value[index], itemPath);
    const item = value[index] as string;
    if (seen.has(item)) fail("duplicate_array_value", itemPath);
    seen.add(item);
  }
}

function assertEvidenceIds(value: unknown, path: string): asserts value is string[] {
  assertUniqueStrings(value, path, { nonEmpty: true });
  for (const evidenceId of value) {
    if (!DECLARED_EVIDENCE_IDS.has(evidenceId)) {
      fail("undeclared_evidence_id", evidenceId);
    }
  }
}

function assertGermanId(value: unknown, expectedPrefix: string, path: string): asserts value is string {
  if (
    typeof value !== "string" ||
    !GERMAN_ID_PATTERN.test(value) ||
    !value.startsWith(expectedPrefix)
  ) fail("german_id_invalid", path);
}

function assertNoDuplicateIds(
  values: readonly Readonly<{ id: string }>[],
  seenAcrossBlueprint: Set<string>,
): void {
  for (const value of values) {
    if (seenAcrossBlueprint.has(value.id)) fail("duplicate_id", value.id);
    seenAcrossBlueprint.add(value.id);
  }
}

function validateGrammarConstruct(value: unknown, path: string): void {
  assertRecord(value, path);
  assertClosedKeys(value, GRAMMAR_KEYS, path);
  assertGermanId(value.id, "de_gc_", `${path}.id`);
  assertNonEmptyString(value.form, `${path}.form`);
  assertNonEmptyString(value.function, `${path}.function`);
  assertRecord(value.scope, `${path}.scope`);
  assertClosedKeys(value.scope, ["receptive", "productive"], `${path}.scope`);
  assertBoolean(value.scope.receptive, `${path}.scope.receptive`);
  assertBoolean(value.scope.productive, `${path}.scope.productive`);
  assertUniqueStrings(value.exclusions, `${path}.exclusions`);
  assertUniqueStrings(value.prerequisiteIds, `${path}.prerequisiteIds`);
  for (let index = 0; index < value.prerequisiteIds.length; index += 1) {
    assertGermanId(value.prerequisiteIds[index], "de_gc_", `${path}.prerequisiteIds[${index}]`);
  }
  assertCanonicalSessionId(value.firstIntroductionPacketId, `${path}.firstIntroductionPacketId`);
  for (const key of [
    "guidedTargetPacketIds",
    "retrievalTargetPacketIds",
    "productionTargetPacketIds",
    "transferTargetPacketIds",
    "delayedTargetPacketIds",
  ] as const) {
    assertPacketIdArray(value[key], `${path}.${key}`);
  }
  if (!GRAMMAR_EVIDENCE_STATUSES.has(value.evidenceStatus as string)) {
    fail("grammar_evidence_status_invalid", `${path}.evidenceStatus`);
  }
  assertEvidenceIds(value.evidenceIds, `${path}.evidenceIds`);
}

function validateLexicalSense(value: unknown, path: string): void {
  assertRecord(value, path);
  assertClosedKeys(value, LEXICAL_KEYS, path);
  assertGermanId(value.id, "de_lex_", `${path}.id`);
  assertNonEmptyString(value.lemma, `${path}.lemma`);
  assertNonEmptyString(value.senseGloss, `${path}.senseGloss`);
  if (!PARTS_OF_SPEECH.has(value.partOfSpeech as GermanLexicalPartOfSpeechDeV1)) {
    fail("part_of_speech_invalid", `${path}.partOfSpeech`);
  }
  if (value.partOfSpeech === "noun") {
    if (
      (value.nounGender !== "der" && value.nounGender !== "die" && value.nounGender !== "das") ||
      typeof value.nounPlural !== "string" ||
      value.nounPlural.trim().length === 0 ||
      value.verbValency !== null ||
      value.verbFrame !== null ||
      value.verbSeparability !== null ||
      value.verbAuxiliary !== null
    ) fail("noun_package_invalid", path);
  } else if (value.partOfSpeech === "verb") {
    if (
      value.nounGender !== null ||
      value.nounPlural !== null ||
      !Array.isArray(value.verbValency) ||
      value.verbValency.length === 0 ||
      typeof value.verbFrame !== "string" ||
      value.verbFrame.trim().length === 0 ||
      !VERB_SEPARABILITY_VALUES.has(value.verbSeparability as string) ||
      !VERB_AUXILIARY_VALUES.has(value.verbAuxiliary as string)
    ) fail("verb_package_invalid", path);
    assertUniqueStrings(value.verbValency, `${path}.verbValency`, { nonEmpty: true });
  } else if (
    value.nounGender !== null ||
    value.nounPlural !== null ||
    value.verbValency !== null ||
    value.verbFrame !== null ||
    value.verbSeparability !== null ||
    value.verbAuxiliary !== null
  ) {
    fail("non_applicable_lexical_package_must_be_null", path);
  }
  if (
    value.productionPolicy !== "productive" &&
    value.productionPolicy !== "receptive" &&
    value.productionPolicy !== "regional_receptive"
  ) fail("lexical_production_policy_invalid", `${path}.productionPolicy`);
  if (value.productionPolicy === "regional_receptive") {
    if (value.region !== "AT" && value.region !== "CH") {
      fail("regional_receptive_region_required", `${path}.region`);
    }
  } else if (value.region !== null) {
    fail("nonregional_lexical_region_must_be_null", `${path}.region`);
  }
  assertEvidenceIds(value.evidenceIds, `${path}.evidenceIds`);
}

function validatePronunciationApplicability(
  value: unknown,
  locale: "ru" | "uk",
  path: string,
): void {
  assertRecord(value, path);
  assertClosedKeys(value, ["status", "correctiveRoute", "rationale", "evidenceBindings"], path);
  if (!PRONUNCIATION_APPLICABILITY_STATUSES.has(
    value.status as GermanPronunciationApplicabilityDeV1["status"],
  )) fail("pronunciation_applicability_status_invalid", `${path}.status`);
  assertArray(value.evidenceBindings, `${path}.evidenceBindings`);
  if (value.status === "NOT_APPLICABLE") {
    if (typeof value.rationale !== "string" || value.rationale.trim().length === 0) {
      fail("pronunciation_not_applicable_rationale_required", `${path}.rationale`);
    }
    if (value.correctiveRoute !== null) {
      fail("pronunciation_not_applicable_route_invalid", `${path}.correctiveRoute`);
    }
    if (value.evidenceBindings.length !== 0) {
      fail("pronunciation_not_applicable_evidence_invalid", `${path}.evidenceBindings`);
    }
    return;
  }
  assertNonEmptyString(value.correctiveRoute, `${path}.correctiveRoute`);
  assertNonEmptyString(value.rationale, `${path}.rationale`);
  if (value.evidenceBindings.length === 0) fail("pronunciation_locale_evidence_invalid", path);
  const expectedPrefix = locale === "ru" ? "DE-PHON-RU-" : "DE-PHON-UK-";
  const seenEvidenceIds = new Set<string>();
  let hasContrastiveRisk = false;
  let hasNonSystemClaim = false;

  const validateCanonicalBinding = (
    binding: Record<string, unknown>,
    bindingPath: string,
  ): GermanPronunciationEvidenceStatusDeV1 => {
    assertNonEmptyString(binding.evidenceId, `${bindingPath}.evidenceId`);
    if (!DECLARED_EVIDENCE_IDS.has(binding.evidenceId)) {
      fail("undeclared_evidence_id", binding.evidenceId);
    }
    if (seenEvidenceIds.has(binding.evidenceId)) fail("duplicate_array_value", bindingPath);
    seenEvidenceIds.add(binding.evidenceId);
    if (!PRONUNCIATION_EVIDENCE_STATUSES.has(
      binding.evidenceStatus as GermanPronunciationEvidenceStatusDeV1,
    ) || binding.evidenceStatus === "PEDAGOGICAL_INFERENCE") {
      fail("pronunciation_evidence_status_invalid", `${bindingPath}.evidenceStatus`);
    }
    if (EVIDENCE_STATUS_BY_ID.get(binding.evidenceId) !== binding.evidenceStatus) {
      fail("pronunciation_evidence_status_mismatch", bindingPath);
    }
    if (
      binding.evidenceStatus !== "DIRECT_SYSTEM" &&
      !binding.evidenceId.startsWith(expectedPrefix)
    ) fail("pronunciation_locale_evidence_invalid", bindingPath);
    return binding.evidenceStatus as GermanPronunciationEvidenceStatusDeV1;
  };

  for (let index = 0; index < value.evidenceBindings.length; index += 1) {
    const bindingPath = `${path}.evidenceBindings[${index}]`;
    const binding = value.evidenceBindings[index];
    assertRecord(binding, bindingPath);
    if (binding.kind === "CANONICAL_BINDING") {
      assertClosedKeys(binding, ["kind", "evidenceId", "evidenceStatus"], bindingPath);
      const status = validateCanonicalBinding(binding, bindingPath);
      if (status === "CONTRASTIVE_RISK") hasContrastiveRisk = true;
      if (status !== "DIRECT_SYSTEM") hasNonSystemClaim = true;
      continue;
    }
    if (binding.kind === "PEDAGOGICAL_INFERENCE") {
      assertClosedKeys(
        binding,
        ["kind", "evidenceStatus", "rationale", "supportingEvidenceBindings"],
        bindingPath,
      );
      if (binding.evidenceStatus !== "PEDAGOGICAL_INFERENCE") {
        fail("pronunciation_evidence_status_invalid", `${bindingPath}.evidenceStatus`);
      }
      if (typeof binding.rationale !== "string" || binding.rationale.trim().length === 0) {
        fail("pedagogical_inference_rationale_required", `${bindingPath}.rationale`);
      }
      assertArray(binding.supportingEvidenceBindings, `${bindingPath}.supportingEvidenceBindings`);
      if (binding.supportingEvidenceBindings.length === 0) {
        fail("pedagogical_inference_support_required", `${bindingPath}.supportingEvidenceBindings`);
      }
      let hasMatchingLocaleSupport = false;
      for (let supportIndex = 0; supportIndex < binding.supportingEvidenceBindings.length; supportIndex += 1) {
        const supportPath = `${bindingPath}.supportingEvidenceBindings[${supportIndex}]`;
        const support = binding.supportingEvidenceBindings[supportIndex];
        assertRecord(support, supportPath);
        assertClosedKeys(support, ["evidenceId", "evidenceStatus"], supportPath);
        const supportStatus = validateCanonicalBinding(support, supportPath);
        if (supportStatus === "CONTRASTIVE_RISK") hasContrastiveRisk = true;
        if (supportStatus !== "DIRECT_SYSTEM") hasMatchingLocaleSupport = true;
      }
      if (!hasMatchingLocaleSupport) {
        fail(
          "pedagogical_inference_locale_support_required",
          `${bindingPath}.supportingEvidenceBindings`,
        );
      }
      hasNonSystemClaim = true;
      continue;
    }
    fail("pronunciation_evidence_binding_kind_invalid", `${bindingPath}.kind`);
  }
  if (hasContrastiveRisk && value.status !== "DIAGNOSTIC_ONLY") {
    fail("contrastive_risk_applicability_invalid", path);
  }
  if (!hasNonSystemClaim) {
    fail("direct_system_only_locale_applicability_invalid", path);
  }
}

function validatePronunciationTarget(value: unknown, path: string): void {
  assertRecord(value, path);
  assertClosedKeys(value, PRONUNCIATION_KEYS, path);
  assertGermanId(value.id, "de_pron_", `${path}.id`);
  assertNonEmptyString(value.target, `${path}.target`);
  assertEvidenceIds(value.perceptionEvidenceIds, `${path}.perceptionEvidenceIds`);
  assertEvidenceIds(value.productionEvidenceIds, `${path}.productionEvidenceIds`);
  validatePronunciationApplicability(value.ruApplicability, "ru", `${path}.ruApplicability`);
  validatePronunciationApplicability(value.ukApplicability, "uk", `${path}.ukApplicability`);
  const targetEvidenceIds = [
    ...(value.perceptionEvidenceIds as string[]),
    ...(value.productionEvidenceIds as string[]),
  ];
  for (const [locale, applicability] of [
    ["ru", value.ruApplicability],
    ["uk", value.ukApplicability],
  ] as const) {
    const localeApplicability = applicability as Record<string, unknown>;
    if (localeApplicability.status !== "NOT_APPLICABLE") continue;
    const prefix = locale === "ru" ? "DE-PHON-RU-" : "DE-PHON-UK-";
    const hasLocaleSpecificTargetEvidence = targetEvidenceIds.some(
      (evidenceId) => evidenceId.startsWith(prefix) &&
        EVIDENCE_STATUS_BY_ID.get(evidenceId) !== "DIRECT_SYSTEM",
    );
    if (hasLocaleSpecificTargetEvidence) {
      fail("pronunciation_not_applicable_target_evidence_conflict", `${path}.${locale}Applicability`);
    }
  }
}

function validateCommunicativeOutcome(value: unknown, path: string): void {
  assertRecord(value, path);
  assertClosedKeys(value, COMMUNICATIVE_OUTCOME_KEYS, path);
  assertGermanId(value.id, "de_out_", `${path}.id`);
  if (
    value.cefrBand !== "PRE_A1" &&
    value.cefrBand !== "A1" &&
    value.cefrBand !== "A2" &&
    value.cefrBand !== "B1"
  ) fail("cefr_band_invalid", `${path}.cefrBand`);
  assertNonEmptyString(value.canDo, `${path}.canDo`);
  assertEvidenceIds(value.evidenceIds, `${path}.evidenceIds`);
}

function validateForbiddenSurfaceForm(value: unknown, path: string): void {
  assertRecord(value, path);
  assertClosedKeys(value, FORBIDDEN_SURFACE_FORM_KEYS, path);
  assertGermanId(value.id, "de_forbid_", `${path}.id`);
  assertNonEmptyString(value.surface, `${path}.surface`);
  assertNonEmptyString(value.reason, `${path}.reason`);
  assertUniqueStrings(value.unlockConstructIds, `${path}.unlockConstructIds`, { nonEmpty: true });
  for (let index = 0; index < value.unlockConstructIds.length; index += 1) {
    assertGermanId(
      value.unlockConstructIds[index],
      "de_gc_",
      `${path}.unlockConstructIds[${index}]`,
    );
  }
  assertEvidenceIds(value.evidenceIds, `${path}.evidenceIds`);
}

function validatePhraseFrame(value: unknown, path: string): void {
  assertRecord(value, path);
  assertClosedKeys(value, PHRASE_FRAME_KEYS, path);
  assertGermanId(value.id, "de_pf_", `${path}.id`);
  assertNonEmptyString(value.frame, `${path}.frame`);
  const idArrays = [
    ["grammarConstructIds", "de_gc_"],
    ["lexicalSenseIds", "de_lex_"],
    ["communicativeOutcomeIds", "de_out_"],
    ["forbiddenSurfaceFormIds", "de_forbid_"],
  ] as const;
  for (const [key, prefix] of idArrays) {
    assertUniqueStrings(value[key], `${path}.${key}`);
    for (let index = 0; index < value[key].length; index += 1) {
      assertGermanId(value[key][index], prefix, `${path}.${key}[${index}]`);
    }
  }
  assertEvidenceIds(value.evidenceIds, `${path}.evidenceIds`);
}

function validateDigestRecord(
  value: unknown,
  keys: readonly string[],
  path: string,
): void {
  assertRecord(value, path);
  assertClosedKeys(value, keys, path);
  for (const key of keys) {
    const digest = value[key];
    if (digest !== null && (typeof digest !== "string" || !SHA256_PATTERN.test(digest))) {
      fail("sha256_or_null_required", `${path}.${key}`);
    }
  }
}

function assertCanonicalRepositoryPath(value: unknown, path: string): asserts value is string {
  assertNonEmptyString(value, path);
  if (
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes(":") ||
    value.split("/").some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) fail("source_path_invalid", path);
  if (ENGLISH_TARGET_PATH_PATTERN.test(value)) fail("english_target_path_forbidden", path);
}

function validateSourceHash(value: unknown, path: string): void {
  assertRecord(value, path);
  assertClosedKeys(value, ["path", "sha256"], path);
  assertCanonicalRepositoryPath(value.path, `${path}.path`);
  if (typeof value.sha256 !== "string" || !SHA256_PATTERN.test(value.sha256)) {
    fail("sha256_invalid", `${path}.sha256`);
  }
}

function assertEnumString(value: unknown, allowed: ReadonlySet<string>, path: string, code: string): void {
  if (typeof value !== "string" || !allowed.has(value)) fail(code, path);
}

function validateSituation(value: unknown, path: string): void {
  assertRecord(value, path);
  assertClosedKeys(value, ["id", "description", "contextSignature"], path);
  assertGermanId(value.id, "de_sit_", `${path}.id`);
  assertNonEmptyString(value.description, `${path}.description`);
  assertNonEmptyString(value.contextSignature, `${path}.contextSignature`);
}

function validateLearningDelta(value: unknown, path: string): void {
  assertRecord(value, path);
  assertClosedKeys(value, ["kind", "description"], path);
  assertEnumString(
    value.kind,
    new Set(["new_operation", "reduced_support", "changed_context", "contrast", "production", "repair", "transfer"]),
    `${path}.kind`,
    "learning_delta_invalid",
  );
  assertNonEmptyString(value.description, `${path}.description`);
}

function validateSupportTrajectory(value: unknown, path: string): void {
  assertRecord(value, path);
  assertClosedKeys(value, ["guided", "retrieval", "independent"], path);
  assertEnumString(value.guided, new Set(["high", "medium", "low"]), `${path}.guided`, "support_level_invalid");
  assertEnumString(value.retrieval, new Set(["medium", "low", "none"]), `${path}.retrieval`, "support_level_invalid");
  assertEnumString(value.independent, new Set(["low", "none"]), `${path}.independent`, "support_level_invalid");
  const supportRank: Readonly<Record<string, number>> = { high: 3, medium: 2, low: 1, none: 0 };
  if (
    supportRank[value.guided as string] < supportRank[value.retrieval as string] ||
    supportRank[value.retrieval as string] < supportRank[value.independent as string]
  ) fail("support_trajectory_not_fading", path);
}

function validateIndependentProbe(value: unknown, path: string): void {
  assertRecord(value, path);
  assertClosedKeys(
    value,
    [
      "trainingContextSignature",
      "probeContextSignature",
      "changedContextRequired",
      "support",
      "lexicalSenseIds",
    ],
    path,
  );
  assertNonEmptyString(value.trainingContextSignature, `${path}.trainingContextSignature`);
  assertNonEmptyString(value.probeContextSignature, `${path}.probeContextSignature`);
  if (
    value.changedContextRequired !== true ||
    value.trainingContextSignature === value.probeContextSignature
  ) fail("independent_probe_changed_context_required", path);
  assertEnumString(value.support, new Set(["low", "none"]), `${path}.support`, "support_level_invalid");
  assertIdArray(value.lexicalSenseIds, "de_lex_", `${path}.lexicalSenseIds`);
  if (value.lexicalSenseIds.length === 0) {
    fail("independent_probe_lexical_targets_required", `${path}.lexicalSenseIds`);
  }
}

function validateAccessibilityAlternative(value: unknown, path: string): void {
  assertRecord(value, path);
  assertClosedKeys(value, ["modality", "description"], path);
  assertEnumString(
    value.modality,
    new Set(["visual_non_audio", "text_non_speech", "keyboard_non_drag", "extended_time"]),
    `${path}.modality`,
    "accessibility_modality_invalid",
  );
  assertNonEmptyString(value.description, `${path}.description`);
}

function validateSessionPacketShape(value: unknown, path: string): void {
  assertRecord(value, path);
  assertClosedKeys(value, PACKET_KEYS, path);
  const identity = typeof value.id === "string" ? SESSION_ID_PATTERN.exec(value.id) : null;
  if (!identity) fail("session_identity_invalid", path);
  const idLesson = Number(identity[1]);
  const idChapter = Number(identity[2]);
  const idSessionOrdinal = Number(identity[3]);
  if (
    idLesson < 1 || idLesson > 32 ||
    idChapter < 1 || idChapter > 7 ||
    idSessionOrdinal < 1 || idSessionOrdinal > 56
  ) fail("session_identity_invalid", path);
  assertIntegerInRange(value.lessonOrdinal, 1, 32, `${path}.lessonOrdinal`);
  assertIntegerInRange(value.chapterOrdinal, 1, 7, `${path}.chapterOrdinal`);
  assertIntegerInRange(value.sessionOrdinal, 1, 56, `${path}.sessionOrdinal`);
  assertIntegerInRange(value.sessionWithinChapter, 1, 8, `${path}.sessionWithinChapter`);
  const derivedChapterOrdinal = Math.floor(((value.sessionOrdinal as number) - 1) / 8) + 1;
  const derivedSessionWithinChapter = (((value.sessionOrdinal as number) - 1) % 8) + 1;
  if (
    idLesson !== value.lessonOrdinal ||
    idChapter !== value.chapterOrdinal ||
    idSessionOrdinal !== value.sessionOrdinal ||
    value.chapterOrdinal !== derivedChapterOrdinal ||
    value.sessionWithinChapter !== derivedSessionWithinChapter
  ) fail("session_identity_invalid", path);

  const expectedPath = `content/learning-v2-course/curriculum/de/packets/l${String(
    value.lessonOrdinal,
  ).padStart(2, "0")}/s${String(value.sessionOrdinal).padStart(2, "0")}.json`;
  if (value.sourcePath !== expectedPath) fail("session_source_path_invalid", `${path}.sourcePath`);

  if (value.grammarConstructId !== null) {
    assertGermanId(value.grammarConstructId, "de_gc_", `${path}.grammarConstructId`);
  }
  assertUniqueStrings(value.reviewConstructIds, `${path}.reviewConstructIds`);
  for (let index = 0; index < value.reviewConstructIds.length; index += 1) {
    assertGermanId(value.reviewConstructIds[index], "de_gc_", `${path}.reviewConstructIds[${index}]`);
  }
  const hasNewConstruct = value.grammarConstructId !== null;
  const hasReviewSet = value.reviewConstructIds.length > 0;
  if (hasNewConstruct === hasReviewSet) fail("packet_grammar_focus_invalid", path);

  assertIdArray(value.communicativeOutcomeIds, "de_out_", `${path}.communicativeOutcomeIds`);
  if (value.communicativeOutcomeIds.length === 0) {
    fail("packet_communicative_outcome_required", `${path}.communicativeOutcomeIds`);
  }
  assertIdArray(value.prerequisiteOutcomeIds, "de_out_", `${path}.prerequisiteOutcomeIds`);
  for (const key of ["prerequisiteConstructIds", "prohibitedConstructIds"] as const) {
    assertIdArray(value[key], "de_gc_", `${path}.${key}`);
  }
  assertPacketIdArray(value.prerequisitePacketIds, `${path}.prerequisitePacketIds`);
  assertIdArray(value.forbiddenSurfaceFormIds, "de_forbid_", `${path}.forbiddenSurfaceFormIds`);
  validateSituation(value.situation, `${path}.situation`);
  validateLearningDelta(value.learningDelta, `${path}.learningDelta`);

  assertUniqueStrings(value.newLexicalSenseIds, `${path}.newLexicalSenseIds`, { nonEmpty: true });
  if (value.newLexicalSenseIds.length > 5) fail("packet_new_lexical_sense_count_invalid", path);
  for (let index = 0; index < value.newLexicalSenseIds.length; index += 1) {
    assertGermanId(value.newLexicalSenseIds[index], "de_lex_", `${path}.newLexicalSenseIds[${index}]`);
  }
  assertIdArray(value.primaryLexicalSenseIds, "de_lex_", `${path}.primaryLexicalSenseIds`);
  const primaryLexicalSenseIds = value.primaryLexicalSenseIds as string[];
  if (primaryLexicalSenseIds.length === 0) {
    fail("packet_primary_lexical_targets_required", `${path}.primaryLexicalSenseIds`);
  }
  for (const lexicalSenseId of primaryLexicalSenseIds) {
    if (!value.newLexicalSenseIds.includes(lexicalSenseId)) {
      fail("packet_primary_lexical_target_not_new", lexicalSenseId);
    }
  }
  assertIdArray(
    value.wordFirstGroundingLexicalSenseIds,
    "de_lex_",
    `${path}.wordFirstGroundingLexicalSenseIds`,
  );
  const wordFirstGroundingIds = value.wordFirstGroundingLexicalSenseIds as string[];
  if (
    wordFirstGroundingIds.length !== value.newLexicalSenseIds.length ||
    value.newLexicalSenseIds.some((id) => !wordFirstGroundingIds.includes(id))
  ) fail("packet_word_first_grounding_incomplete", `${path}.wordFirstGroundingLexicalSenseIds`);
  assertIdArray(value.retrievalLexicalSenseIds, "de_lex_", `${path}.retrievalLexicalSenseIds`);
  const retrievalLexicalSenseIds = value.retrievalLexicalSenseIds as string[];
  for (const lexicalSenseId of retrievalLexicalSenseIds) {
    if (value.newLexicalSenseIds.includes(lexicalSenseId)) {
      fail("packet_new_retrieval_lexical_overlap", lexicalSenseId);
    }
  }
  assertIdArray(value.phraseFrameIds, "de_pf_", `${path}.phraseFrameIds`);
  assertUniqueStrings(value.canonicalExamples, `${path}.canonicalExamples`, { nonEmpty: true });
  if (value.canonicalExamples.length < 2 || value.canonicalExamples.length > 4) {
    fail("packet_canonical_example_count_invalid", `${path}.canonicalExamples`);
  }
  assertArray(value.allowedLexicalSlots, `${path}.allowedLexicalSlots`);
  if (value.allowedLexicalSlots.length === 0) {
    fail("packet_allowed_lexical_slots_required", `${path}.allowedLexicalSlots`);
  }
  const slotIds = new Set<string>();
  for (let index = 0; index < value.allowedLexicalSlots.length; index += 1) {
    const slotPath = `${path}.allowedLexicalSlots[${index}]`;
    const slot = value.allowedLexicalSlots[index];
    assertRecord(slot, slotPath);
    assertClosedKeys(slot, ["id", "lexicalSenseIds"], slotPath);
    assertGermanId(slot.id, "de_slot_", `${slotPath}.id`);
    if (slotIds.has(slot.id)) fail("duplicate_id", slot.id);
    slotIds.add(slot.id);
    assertIdArray(slot.lexicalSenseIds, "de_lex_", `${slotPath}.lexicalSenseIds`);
    if (slot.lexicalSenseIds.length === 0) {
      fail("packet_allowed_lexical_slot_empty", `${slotPath}.lexicalSenseIds`);
    }
  }
  assertEnumString(value.sessionRole, SESSION_ROLES, `${path}.sessionRole`, "session_role_invalid");
  assertUniqueStrings(value.modeFamilies, `${path}.modeFamilies`, { nonEmpty: true });
  for (let index = 0; index < value.modeFamilies.length; index += 1) {
    assertEnumString(
      value.modeFamilies[index],
      MODE_FAMILIES,
      `${path}.modeFamilies[${index}]`,
      "mode_family_invalid",
    );
  }
  validateSupportTrajectory(value.supportTrajectory, `${path}.supportTrajectory`);
  validateIndependentProbe(value.independentProbe, `${path}.independentProbe`);
  const independentLexicalSenseIds = (
    value.independentProbe as Record<string, unknown>
  ).lexicalSenseIds as string[];
  const allowedIndependentLexicalSenseIds = new Set([
    ...value.newLexicalSenseIds,
    ...retrievalLexicalSenseIds,
  ]);
  for (const lexicalSenseId of independentLexicalSenseIds) {
    if (!allowedIndependentLexicalSenseIds.has(lexicalSenseId)) {
      fail("independent_probe_lexical_target_not_declared_by_packet", lexicalSenseId);
    }
  }
  if (independentLexicalSenseIds.every((id) => retrievalLexicalSenseIds.includes(id))) {
    fail("independent_probe_retrieval_only", `${path}.independentProbe.lexicalSenseIds`);
  }
  const independentNewTargetCount = independentLexicalSenseIds.filter(
    (id) => (value.newLexicalSenseIds as string[]).includes(id),
  ).length;
  const independentRetrievalCount = independentLexicalSenseIds.filter(
    (id) => retrievalLexicalSenseIds.includes(id),
  ).length;
  if (independentRetrievalCount > independentNewTargetCount) {
    fail("independent_probe_retrieval_dominates", `${path}.independentProbe.lexicalSenseIds`);
  }
  for (const lexicalSenseId of primaryLexicalSenseIds) {
    if (!independentLexicalSenseIds.includes(lexicalSenseId)) {
      fail("independent_probe_primary_lexical_target_missing", lexicalSenseId);
    }
  }
  assertArray(value.delayedProbes, `${path}.delayedProbes`);
  value.delayedProbes.forEach((probe, index) => {
    const probePath = `${path}.delayedProbes[${index}]`;
    assertRecord(probe, probePath);
    assertClosedKeys(probe, ["targetPacketId", "retrievalKind", "contextSignature"], probePath);
    assertCanonicalSessionId(probe.targetPacketId, `${probePath}.targetPacketId`);
    assertEnumString(
      probe.retrievalKind,
      new Set(["cross_session", "cross_chapter", "cross_lesson"]),
      `${probePath}.retrievalKind`,
      "retrieval_kind_invalid",
    );
    assertNonEmptyString(probe.contextSignature, `${probePath}.contextSignature`);
  });
  validateAccessibilityAlternative(value.accessibilityAlternative, `${path}.accessibilityAlternative`);
  assertBoolean(value.audioSemanticsRequired, `${path}.audioSemanticsRequired`);
  assertBoolean(value.phoneticDistractorCheckRequired, `${path}.phoneticDistractorCheckRequired`);
  assertIdArray(value.reviewEdgeIds, "de_edge_", `${path}.reviewEdgeIds`);
  assertUniqueStrings(value.pronunciationTargetIds, `${path}.pronunciationTargetIds`);
  for (let index = 0; index < value.pronunciationTargetIds.length; index += 1) {
    assertGermanId(
      value.pronunciationTargetIds[index],
      "de_pron_",
      `${path}.pronunciationTargetIds[${index}]`,
    );
  }
  assertEvidenceIds(value.evidenceIds, `${path}.evidenceIds`);
  assertArray(value.sourceHashes, `${path}.sourceHashes`);
  if (value.sourceHashes.length === 0) fail("packet_source_hashes_required", `${path}.sourceHashes`);
  const sourcePaths = new Set<string>();
  for (let index = 0; index < value.sourceHashes.length; index += 1) {
    validateSourceHash(value.sourceHashes[index], `${path}.sourceHashes[${index}]`);
    const sourcePath = (value.sourceHashes[index] as Record<string, unknown>).path as string;
    if (sourcePaths.has(sourcePath)) fail("duplicate_source_hash_path", sourcePath);
    sourcePaths.add(sourcePath);
  }
}

function assertCanonicalSessionId(value: unknown, path: string): asserts value is GermanSessionPacketIdDeV1 {
  const identity = typeof value === "string" ? SESSION_ID_PATTERN.exec(value) : null;
  if (!identity) fail("session_id_reference_invalid", path);
  const lesson = Number(identity[1]);
  const chapter = Number(identity[2]);
  const session = Number(identity[3]);
  const derivedChapter = Math.floor((session - 1) / 8) + 1;
  if (
    lesson < 1 || lesson > 32 ||
    chapter < 1 || chapter > 7 ||
    session < 1 || session > 56 ||
    chapter !== derivedChapter
  ) fail("session_id_reference_invalid", path);
}

function assertIdArray(value: unknown, prefix: string, path: string): asserts value is string[] {
  assertUniqueStrings(value, path);
  for (let index = 0; index < value.length; index += 1) {
    assertGermanId(value[index], prefix, `${path}[${index}]`);
  }
}

function assertPacketIdArray(value: unknown, path: string): asserts value is GermanSessionPacketIdDeV1[] {
  assertUniqueStrings(value, path);
  for (let index = 0; index < value.length; index += 1) {
    assertCanonicalSessionId(value[index], `${path}[${index}]`);
  }
}

function validateGraphs(value: unknown, path: string): void {
  assertRecord(value, path);
  assertClosedKeys(value, GRAPH_KEYS, path);

  assertArray(value.prerequisiteDag, `${path}.prerequisiteDag`);
  value.prerequisiteDag.forEach((edge, index) => {
    const edgePath = `${path}.prerequisiteDag[${index}]`;
    assertRecord(edge, edgePath);
    assertClosedKeys(edge, ["id", "prerequisiteId", "dependentId", "evidenceIds"], edgePath);
    assertGermanId(edge.id, "de_edge_", `${edgePath}.id`);
    assertGermanId(edge.prerequisiteId, "de_gc_", `${edgePath}.prerequisiteId`);
    assertGermanId(edge.dependentId, "de_gc_", `${edgePath}.dependentId`);
    if (edge.prerequisiteId === edge.dependentId) fail("self_prerequisite_forbidden", edge.prerequisiteId);
    assertEvidenceIds(edge.evidenceIds, `${edgePath}.evidenceIds`);
  });

  assertArray(value.lexicalRetrievalGraph, `${path}.lexicalRetrievalGraph`);
  value.lexicalRetrievalGraph.forEach((edge, index) => {
    const edgePath = `${path}.lexicalRetrievalGraph[${index}]`;
    assertRecord(edge, edgePath);
    assertClosedKeys(
      edge,
      ["id", "lexicalSenseId", "fromPacketId", "toPacketId", "retrievalKind"],
      edgePath,
    );
    assertGermanId(edge.id, "de_edge_", `${edgePath}.id`);
    assertGermanId(edge.lexicalSenseId, "de_lex_", `${edgePath}.lexicalSenseId`);
    assertCanonicalSessionId(edge.fromPacketId, `${edgePath}.fromPacketId`);
    assertCanonicalSessionId(edge.toPacketId, `${edgePath}.toPacketId`);
    if (
      edge.retrievalKind !== "cross_session" &&
      edge.retrievalKind !== "cross_chapter" &&
      edge.retrievalKind !== "cross_lesson"
    ) fail("retrieval_kind_invalid", `${edgePath}.retrievalKind`);
  });

  assertArray(value.reviewEdges, `${path}.reviewEdges`);
  value.reviewEdges.forEach((edge, index) => {
    const edgePath = `${path}.reviewEdges[${index}]`;
    assertRecord(edge, edgePath);
    assertClosedKeys(
      edge,
      ["id", "fromPacketId", "toPacketId", "grammarConstructIds", "lexicalSenseIds", "learningDelta"],
      edgePath,
    );
    assertGermanId(edge.id, "de_edge_", `${edgePath}.id`);
    assertCanonicalSessionId(edge.fromPacketId, `${edgePath}.fromPacketId`);
    assertCanonicalSessionId(edge.toPacketId, `${edgePath}.toPacketId`);
    assertIdArray(edge.grammarConstructIds, "de_gc_", `${edgePath}.grammarConstructIds`);
    assertIdArray(edge.lexicalSenseIds, "de_lex_", `${edgePath}.lexicalSenseIds`);
    if (
      edge.learningDelta !== "reduced_support" &&
      edge.learningDelta !== "changed_context" &&
      edge.learningDelta !== "contrast" &&
      edge.learningDelta !== "production" &&
      edge.learningDelta !== "repair" &&
      edge.learningDelta !== "transfer"
    ) fail("learning_delta_invalid", `${edgePath}.learningDelta`);
  });
}

function validateMatrices(value: unknown, path: string): void {
  assertRecord(value, path);
  assertClosedKeys(value, MATRIX_KEYS, path);

  assertArray(value.grammarCoverage, `${path}.grammarCoverage`);
  const grammarCoverageSubjects = new Set<string>();
  value.grammarCoverage.forEach((row, index) => {
    const rowPath = `${path}.grammarCoverage[${index}]`;
    assertRecord(row, rowPath);
    const packetKeys = [
      "explainPacketIds",
      "discriminatePacketIds",
      "guidedRetrievePacketIds",
      "independentProducePacketIds",
      "changedContextTransferPacketIds",
      "delayedRetrievePacketIds",
    ] as const;
    assertClosedKeys(row, ["grammarConstructId", ...packetKeys], rowPath);
    assertGermanId(row.grammarConstructId, "de_gc_", `${rowPath}.grammarConstructId`);
    if (grammarCoverageSubjects.has(row.grammarConstructId)) {
      fail("duplicate_matrix_subject_id", row.grammarConstructId);
    }
    grammarCoverageSubjects.add(row.grammarConstructId);
    for (const key of packetKeys) assertPacketIdArray(row[key], `${rowPath}.${key}`);
  });

  assertArray(value.lexicalCoverage, `${path}.lexicalCoverage`);
  const lexicalCoverageSubjects = new Set<string>();
  value.lexicalCoverage.forEach((row, index) => {
    const rowPath = `${path}.lexicalCoverage[${index}]`;
    assertRecord(row, rowPath);
    const packetKeys = [
      "meaningRetrievalPacketIds",
      "formRetrievalPacketIds",
      "phraseUsePacketIds",
      "spokenUsePacketIds",
      "crossSessionPacketIds",
      "crossLessonPacketIds",
      "delayedRetrievePacketIds",
    ] as const;
    assertClosedKeys(row, ["lexicalSenseId", "firstEncounterPacketId", ...packetKeys], rowPath);
    assertGermanId(row.lexicalSenseId, "de_lex_", `${rowPath}.lexicalSenseId`);
    if (lexicalCoverageSubjects.has(row.lexicalSenseId)) {
      fail("duplicate_matrix_subject_id", row.lexicalSenseId);
    }
    lexicalCoverageSubjects.add(row.lexicalSenseId);
    assertCanonicalSessionId(row.firstEncounterPacketId, `${rowPath}.firstEncounterPacketId`);
    for (const key of packetKeys) assertPacketIdArray(row[key], `${rowPath}.${key}`);
  });

  assertArray(value.canDoCoverage, `${path}.canDoCoverage`);
  const canDoCoverageSubjects = new Set<string>();
  value.canDoCoverage.forEach((row, index) => {
    const rowPath = `${path}.canDoCoverage[${index}]`;
    assertRecord(row, rowPath);
    const packetKeys = ["receptionPacketIds", "productionOrInteractionPacketIds", "transferPacketIds"] as const;
    assertClosedKeys(row, ["communicativeOutcomeId", ...packetKeys], rowPath);
    assertGermanId(row.communicativeOutcomeId, "de_out_", `${rowPath}.communicativeOutcomeId`);
    if (canDoCoverageSubjects.has(row.communicativeOutcomeId)) {
      fail("duplicate_matrix_subject_id", row.communicativeOutcomeId);
    }
    canDoCoverageSubjects.add(row.communicativeOutcomeId);
    for (const key of packetKeys) assertPacketIdArray(row[key], `${rowPath}.${key}`);
  });

  assertArray(value.pronunciationCoverage, `${path}.pronunciationCoverage`);
  const pronunciationCoverageSubjects = new Set<string>();
  value.pronunciationCoverage.forEach((row, index) => {
    const rowPath = `${path}.pronunciationCoverage[${index}]`;
    assertRecord(row, rowPath);
    assertClosedKeys(row, ["pronunciationTargetId", "perceptionPacketIds", "productionPacketIds"], rowPath);
    assertGermanId(row.pronunciationTargetId, "de_pron_", `${rowPath}.pronunciationTargetId`);
    if (pronunciationCoverageSubjects.has(row.pronunciationTargetId)) {
      fail("duplicate_matrix_subject_id", row.pronunciationTargetId);
    }
    pronunciationCoverageSubjects.add(row.pronunciationTargetId);
    assertPacketIdArray(row.perceptionPacketIds, `${rowPath}.perceptionPacketIds`);
    assertPacketIdArray(row.productionPacketIds, `${rowPath}.productionPacketIds`);
  });

  assertArray(value.ruUkInterference, `${path}.ruUkInterference`);
  const ruUkInterferenceSubjects = new Set<string>();
  value.ruUkInterference.forEach((row, index) => {
    const rowPath = `${path}.ruUkInterference[${index}]`;
    assertRecord(row, rowPath);
    assertClosedKeys(row, ["pronunciationTargetId", "ruPacketIds", "ukPacketIds"], rowPath);
    assertGermanId(row.pronunciationTargetId, "de_pron_", `${rowPath}.pronunciationTargetId`);
    if (ruUkInterferenceSubjects.has(row.pronunciationTargetId)) {
      fail("duplicate_matrix_subject_id", row.pronunciationTargetId);
    }
    ruUkInterferenceSubjects.add(row.pronunciationTargetId);
    assertPacketIdArray(row.ruPacketIds, `${rowPath}.ruPacketIds`);
    assertPacketIdArray(row.ukPacketIds, `${rowPath}.ukPacketIds`);
  });
}

function validateReferences(value: GermanCourseBlueprintDeV1): void {
  const grammarIds = new Set(value.grammarConstructs.map((construct) => construct.id));
  const constructsById = new Map(value.grammarConstructs.map((construct) => [construct.id, construct]));
  const lexicalIds = new Set(value.lexicalSenses.map((sense) => sense.id));
  const outcomeIds = new Set(value.communicativeOutcomes.map((outcome) => outcome.id));
  const pronunciationIds = new Set(value.pronunciationTargets.map((target) => target.id));
  const forbiddenIds = new Set(value.forbiddenSurfaceForms.map((form) => form.id));
  const packetIds = new Set(value.sessionPackets.map((packet) => packet.id));
  const packetsById = new Map(value.sessionPackets.map((packet) => [packet.id, packet]));
  const phraseFrameIds = new Set(value.phraseFrames.map((frame) => frame.id));
  const reviewEdgeIds = new Set(value.graphs.reviewEdges.map((edge) => edge.id));
  const reviewEdgesById = new Map(value.graphs.reviewEdges.map((edge) => [edge.id, edge]));
  const declaredPrerequisitePairs = new Set<string>();
  const hasExactMembers = (actual: readonly string[], expected: ReadonlySet<string>): boolean =>
    actual.length === expected.size && actual.every((id) => expected.has(id));
  const deriveRetrievalScope = (
    sourcePacket: GermanExactSessionPacketDeV1,
    targetPacket: GermanExactSessionPacketDeV1,
  ): "cross_session" | "cross_chapter" | "cross_lesson" =>
    sourcePacket.lessonOrdinal !== targetPacket.lessonOrdinal
      ? "cross_lesson"
      : sourcePacket.chapterOrdinal !== targetPacket.chapterOrdinal
        ? "cross_chapter"
        : "cross_session";

  for (const construct of value.grammarConstructs) {
    for (const prerequisiteId of construct.prerequisiteIds) {
      if (!grammarIds.has(prerequisiteId)) fail("undeclared_grammar_construct_id", prerequisiteId);
      if (prerequisiteId === construct.id) fail("self_prerequisite_forbidden", construct.id);
      declaredPrerequisitePairs.add(`${prerequisiteId}->${construct.id}`);
    }
    const targetPacketIds = [
      construct.firstIntroductionPacketId,
      ...construct.guidedTargetPacketIds,
      ...construct.retrievalTargetPacketIds,
      ...construct.productionTargetPacketIds,
      ...construct.transferTargetPacketIds,
      ...construct.delayedTargetPacketIds,
    ];
    for (const packetId of targetPacketIds) {
      if (!packetIds.has(packetId)) fail("undeclared_session_packet_id", packetId);
    }
  }
  const graphPrerequisitePairs = new Set<string>();
  const prerequisiteDependents = new Map<
    GermanGrammarConstructIdDeV1,
    GermanGrammarConstructIdDeV1[]
  >(
    [...grammarIds].map((id) => [id, []]),
  );
  const prerequisiteIndegree = new Map<string, number>(
    [...grammarIds].map((id) => [id, 0]),
  );
  for (const edge of value.graphs.prerequisiteDag) {
    if (!grammarIds.has(edge.prerequisiteId)) {
      fail("undeclared_grammar_construct_id", edge.prerequisiteId);
    }
    if (!grammarIds.has(edge.dependentId)) fail("undeclared_grammar_construct_id", edge.dependentId);
    const pair = `${edge.prerequisiteId}->${edge.dependentId}`;
    if (graphPrerequisitePairs.has(pair)) fail("duplicate_prerequisite_edge", pair);
    graphPrerequisitePairs.add(pair);
    if (!declaredPrerequisitePairs.has(pair)) fail("extra_prerequisite_edge", pair);
    prerequisiteDependents.get(edge.prerequisiteId)?.push(edge.dependentId);
    prerequisiteIndegree.set(
      edge.dependentId,
      (prerequisiteIndegree.get(edge.dependentId) ?? 0) + 1,
    );
  }
  for (const pair of declaredPrerequisitePairs) {
    if (!graphPrerequisitePairs.has(pair)) fail("missing_prerequisite_edge", pair);
  }
  const prerequisiteQueue = [...grammarIds].filter(
    (id) => prerequisiteIndegree.get(id) === 0,
  );
  let visitedPrerequisiteNodes = 0;
  while (prerequisiteQueue.length > 0) {
    const prerequisiteId = prerequisiteQueue.shift() as GermanGrammarConstructIdDeV1;
    visitedPrerequisiteNodes += 1;
    for (const dependentId of prerequisiteDependents.get(prerequisiteId) ?? []) {
      const nextIndegree = (prerequisiteIndegree.get(dependentId) ?? 0) - 1;
      prerequisiteIndegree.set(dependentId, nextIndegree);
      if (nextIndegree === 0) prerequisiteQueue.push(dependentId);
    }
  }
  if (visitedPrerequisiteNodes !== grammarIds.size) fail("prerequisite_graph_cycle", "$.graphs.prerequisiteDag");

  for (const packet of value.sessionPackets) {
    if (packet.grammarConstructId !== null && !grammarIds.has(packet.grammarConstructId)) {
      fail("undeclared_grammar_construct_id", packet.grammarConstructId);
    }
    for (const constructId of packet.reviewConstructIds) {
      if (!grammarIds.has(constructId)) fail("undeclared_grammar_construct_id", constructId);
    }
  }
  const introductionPacketsByConstructId = new Map<
    GermanGrammarConstructIdDeV1,
    GermanExactSessionPacketDeV1[]
  >([...grammarIds].map((id) => [id, []]));
  for (const packet of value.sessionPackets) {
    if (packet.grammarConstructId !== null && grammarIds.has(packet.grammarConstructId)) {
      introductionPacketsByConstructId.get(packet.grammarConstructId)?.push(packet);
    }
  }
  for (const construct of value.grammarConstructs) {
    const introductionPackets = introductionPacketsByConstructId.get(construct.id) ?? [];
    if (introductionPackets.length !== 1) {
      fail("grammar_construct_introduction_count_invalid", construct.id);
    }
    if (introductionPackets[0].id !== construct.firstIntroductionPacketId) {
      fail("grammar_first_introduction_packet_mismatch", construct.id);
    }
  }
  for (const construct of value.grammarConstructs) {
    const dependentIntroduction = introductionPacketsByConstructId.get(construct.id)?.[0];
    if (dependentIntroduction === undefined) continue;
    const dependentOrder =
      (dependentIntroduction.lessonOrdinal - 1) * 56 + dependentIntroduction.sessionOrdinal;
    for (const prerequisiteId of construct.prerequisiteIds) {
      const prerequisiteIntroduction = introductionPacketsByConstructId.get(prerequisiteId)?.[0];
      if (prerequisiteIntroduction === undefined) continue;
      const prerequisiteOrder =
        (prerequisiteIntroduction.lessonOrdinal - 1) * 56 + prerequisiteIntroduction.sessionOrdinal;
      if (prerequisiteOrder >= dependentOrder) {
        fail(
          "grammar_prerequisite_introduction_not_earlier",
          `${prerequisiteId}->${construct.id}`,
        );
      }
    }
  }

  const seenSituationIds = new Set<string>();
  const seenSlotIds = new Set<string>();
  for (const packet of value.sessionPackets) {
    for (const outcomeId of packet.communicativeOutcomeIds) {
      if (!outcomeIds.has(outcomeId)) fail("undeclared_communicative_outcome_id", outcomeId);
    }
    for (const outcomeId of packet.prerequisiteOutcomeIds) {
      if (!outcomeIds.has(outcomeId)) fail("undeclared_communicative_outcome_id", outcomeId);
    }
    for (const constructId of packet.prerequisiteConstructIds) {
      if (!grammarIds.has(constructId)) fail("undeclared_grammar_construct_id", constructId);
    }
    for (const constructId of packet.prohibitedConstructIds) {
      if (!grammarIds.has(constructId)) fail("undeclared_grammar_construct_id", constructId);
      if (constructId === packet.grammarConstructId || packet.reviewConstructIds.includes(constructId)) {
        fail("packet_prohibited_construct_conflict", constructId);
      }
    }
    const focusedConstructIds = packet.grammarConstructId === null
      ? packet.reviewConstructIds
      : [packet.grammarConstructId];
    if (
      packet.grammarConstructId !== null &&
      packet.prerequisiteConstructIds.includes(packet.grammarConstructId)
    ) {
      fail(
        "packet_self_prerequisite_construct_forbidden",
        `${packet.id}:${packet.grammarConstructId}`,
      );
    }
    const expectedPrerequisiteConstructIds = new Set<GermanGrammarConstructIdDeV1>();
    for (const focusedConstructId of focusedConstructIds) {
      const focusedConstruct = constructsById.get(focusedConstructId);
      for (const prerequisiteId of focusedConstruct?.prerequisiteIds ?? []) {
        expectedPrerequisiteConstructIds.add(prerequisiteId);
      }
    }
    if (!hasExactMembers(packet.prerequisiteConstructIds, expectedPrerequisiteConstructIds)) {
      fail("packet_prerequisite_constructs_mismatch", packet.id);
    }
    const expectedPrerequisitePacketIds = new Set<GermanSessionPacketIdDeV1>();
    for (const prerequisiteId of expectedPrerequisiteConstructIds) {
      const prerequisiteConstruct = constructsById.get(prerequisiteId);
      if (prerequisiteConstruct !== undefined) {
        expectedPrerequisitePacketIds.add(prerequisiteConstruct.firstIntroductionPacketId);
      }
    }
    if (!hasExactMembers(packet.prerequisitePacketIds, expectedPrerequisitePacketIds)) {
      fail("packet_prerequisite_packets_mismatch", packet.id);
    }
    const packetOrder = (packet.lessonOrdinal - 1) * 56 + packet.sessionOrdinal;
    for (const prerequisitePacketId of packet.prerequisitePacketIds) {
      if (!packetIds.has(prerequisitePacketId)) {
        fail("undeclared_session_packet_id", prerequisitePacketId);
      }
      const identity = SESSION_ID_PATTERN.exec(prerequisitePacketId);
      const prerequisiteOrder = identity === null
        ? Number.POSITIVE_INFINITY
        : (Number(identity[1]) - 1) * 56 + Number(identity[3]);
      if (prerequisiteOrder >= packetOrder) fail("packet_prerequisite_not_earlier", prerequisitePacketId);
    }
    for (const forbiddenId of packet.forbiddenSurfaceFormIds) {
      if (!forbiddenIds.has(forbiddenId)) fail("undeclared_forbidden_surface_form_id", forbiddenId);
    }
    for (const lexicalSenseId of packet.newLexicalSenseIds) {
      if (!lexicalIds.has(lexicalSenseId)) fail("undeclared_lexical_sense_id", lexicalSenseId);
    }
    for (const lexicalSenseId of packet.retrievalLexicalSenseIds) {
      if (!lexicalIds.has(lexicalSenseId)) fail("undeclared_lexical_sense_id", lexicalSenseId);
    }
    for (const phraseFrameId of packet.phraseFrameIds) {
      if (!phraseFrameIds.has(phraseFrameId)) fail("undeclared_phrase_frame_id", phraseFrameId);
    }
    if (seenSituationIds.has(packet.situation.id)) fail("duplicate_id", packet.situation.id);
    seenSituationIds.add(packet.situation.id);
    for (const slot of packet.allowedLexicalSlots) {
      if (seenSlotIds.has(slot.id)) fail("duplicate_id", slot.id);
      seenSlotIds.add(slot.id);
      for (const lexicalSenseId of slot.lexicalSenseIds) {
        if (!lexicalIds.has(lexicalSenseId)) fail("undeclared_lexical_sense_id", lexicalSenseId);
      }
    }
    for (const probe of packet.delayedProbes) {
      if (!packetIds.has(probe.targetPacketId)) {
        fail("undeclared_session_packet_id", probe.targetPacketId);
      }
      const targetPacket = packetsById.get(probe.targetPacketId) as GermanExactSessionPacketDeV1;
      const targetOrder = (targetPacket.lessonOrdinal - 1) * 56 + targetPacket.sessionOrdinal;
      if (targetOrder <= packetOrder) {
        fail("delayed_probe_target_not_later", `${packet.id}->${probe.targetPacketId}`);
      }
      if (probe.retrievalKind !== deriveRetrievalScope(packet, targetPacket)) {
        fail("delayed_probe_scope_mismatch", `${packet.id}->${probe.targetPacketId}`);
      }
    }
    for (const edgeId of packet.reviewEdgeIds) {
      if (!reviewEdgeIds.has(edgeId)) fail("undeclared_review_edge_id", edgeId);
    }
    for (const pronunciationTargetId of packet.pronunciationTargetIds) {
      if (!pronunciationIds.has(pronunciationTargetId)) {
        fail("undeclared_pronunciation_target_id", pronunciationTargetId);
      }
    }
  }
  for (const form of value.forbiddenSurfaceForms) {
    for (const constructId of form.unlockConstructIds) {
      if (!grammarIds.has(constructId)) fail("undeclared_grammar_construct_id", constructId);
    }
  }
  for (const frame of value.phraseFrames) {
    for (const constructId of frame.grammarConstructIds) {
      if (!grammarIds.has(constructId)) fail("undeclared_grammar_construct_id", constructId);
    }
    for (const lexicalSenseId of frame.lexicalSenseIds) {
      if (!lexicalIds.has(lexicalSenseId)) fail("undeclared_lexical_sense_id", lexicalSenseId);
    }
    for (const outcomeId of frame.communicativeOutcomeIds) {
      if (!outcomeIds.has(outcomeId)) fail("undeclared_communicative_outcome_id", outcomeId);
    }
    for (const forbiddenId of frame.forbiddenSurfaceFormIds) {
      if (!forbiddenIds.has(forbiddenId)) fail("undeclared_forbidden_surface_form_id", forbiddenId);
    }
  }
  const lexicalRetrievalRelationships = new Set<string>();
  for (const edge of value.graphs.lexicalRetrievalGraph) {
    const relationship = [
      edge.lexicalSenseId,
      edge.fromPacketId,
      edge.toPacketId,
    ].join("|");
    if (lexicalRetrievalRelationships.has(relationship)) {
      fail("duplicate_lexical_retrieval_relationship", relationship);
    }
    lexicalRetrievalRelationships.add(relationship);
    if (!lexicalIds.has(edge.lexicalSenseId)) {
      fail("undeclared_lexical_sense_id", edge.lexicalSenseId);
    }
    if (!packetIds.has(edge.fromPacketId)) fail("undeclared_session_packet_id", edge.fromPacketId);
    if (!packetIds.has(edge.toPacketId)) fail("undeclared_session_packet_id", edge.toPacketId);
    const sourcePacket = packetsById.get(edge.fromPacketId) as GermanExactSessionPacketDeV1;
    const targetPacket = packetsById.get(edge.toPacketId) as GermanExactSessionPacketDeV1;
    const sourceOrder = (sourcePacket.lessonOrdinal - 1) * 56 + sourcePacket.sessionOrdinal;
    const targetOrder = (targetPacket.lessonOrdinal - 1) * 56 + targetPacket.sessionOrdinal;
    if (sourceOrder >= targetOrder) fail("graph_edge_chronology_invalid", edge.id);
    if (!sourcePacket.newLexicalSenseIds.includes(edge.lexicalSenseId)) {
      fail("lexical_retrieval_source_not_introduction", edge.id);
    }
    if (!targetPacket.retrievalLexicalSenseIds.includes(edge.lexicalSenseId)) {
      fail("lexical_retrieval_target_missing_sense", edge.id);
    }
    const expectedRetrievalKind = deriveRetrievalScope(sourcePacket, targetPacket);
    if (edge.retrievalKind !== expectedRetrievalKind) {
      fail("lexical_retrieval_scope_mismatch", edge.id);
    }
  }
  const reviewRelationships = new Set<string>();
  for (const edge of value.graphs.reviewEdges) {
    const relationship = [
      edge.fromPacketId,
      edge.toPacketId,
      [...edge.grammarConstructIds].sort().join(","),
      [...edge.lexicalSenseIds].sort().join(","),
      edge.learningDelta,
    ].join("|");
    if (reviewRelationships.has(relationship)) {
      fail("duplicate_review_relationship", relationship);
    }
    reviewRelationships.add(relationship);
    if (!packetIds.has(edge.fromPacketId)) fail("undeclared_session_packet_id", edge.fromPacketId);
    if (!packetIds.has(edge.toPacketId)) fail("undeclared_session_packet_id", edge.toPacketId);
    const sourcePacket = packetsById.get(edge.fromPacketId) as GermanExactSessionPacketDeV1;
    const targetPacket = packetsById.get(edge.toPacketId) as GermanExactSessionPacketDeV1;
    const sourceOrder = (sourcePacket.lessonOrdinal - 1) * 56 + sourcePacket.sessionOrdinal;
    const targetOrder = (targetPacket.lessonOrdinal - 1) * 56 + targetPacket.sessionOrdinal;
    if (sourceOrder >= targetOrder) fail("graph_edge_chronology_invalid", edge.id);
    for (const constructId of edge.grammarConstructIds) {
      if (!grammarIds.has(constructId)) fail("undeclared_grammar_construct_id", constructId);
      if (sourcePacket.grammarConstructId !== constructId) {
        fail("review_edge_source_not_construct_introduction", `${edge.id}:${constructId}`);
      }
      if (!targetPacket.reviewConstructIds.includes(constructId)) {
        fail("review_edge_target_missing_construct", `${edge.id}:${constructId}`);
      }
    }
    for (const lexicalSenseId of edge.lexicalSenseIds) {
      if (!lexicalIds.has(lexicalSenseId)) fail("undeclared_lexical_sense_id", lexicalSenseId);
      if (!sourcePacket.newLexicalSenseIds.includes(lexicalSenseId)) {
        fail("review_edge_source_not_lexical_introduction", `${edge.id}:${lexicalSenseId}`);
      }
      if (!targetPacket.retrievalLexicalSenseIds.includes(lexicalSenseId)) {
        fail("review_edge_target_missing_lexical_sense", `${edge.id}:${lexicalSenseId}`);
      }
    }
    if (edge.learningDelta !== targetPacket.learningDelta.kind) {
      fail("review_edge_learning_delta_mismatch", edge.id);
    }
    if (!targetPacket.reviewEdgeIds.includes(edge.id)) {
      fail("missing_packet_review_edge_reference", edge.id);
    }
  }
  for (const packet of value.sessionPackets) {
    for (const edgeId of packet.reviewEdgeIds) {
      const edge = reviewEdgesById.get(edgeId);
      if (edge !== undefined && edge.toPacketId !== packet.id) {
        fail("review_edge_target_mismatch", `${edgeId}->${packet.id}`);
      }
    }
  }

  const assertPacketRefs = (ids: readonly GermanSessionPacketIdDeV1[]): void => {
    for (const id of ids) if (!packetIds.has(id)) fail("undeclared_session_packet_id", id);
  };
  for (const row of value.matrices.grammarCoverage) {
    if (!grammarIds.has(row.grammarConstructId)) {
      fail("undeclared_grammar_construct_id", row.grammarConstructId);
    }
    assertPacketRefs(row.explainPacketIds);
    assertPacketRefs(row.discriminatePacketIds);
    assertPacketRefs(row.guidedRetrievePacketIds);
    assertPacketRefs(row.independentProducePacketIds);
    assertPacketRefs(row.changedContextTransferPacketIds);
    assertPacketRefs(row.delayedRetrievePacketIds);
  }
  for (const row of value.matrices.lexicalCoverage) {
    if (!lexicalIds.has(row.lexicalSenseId)) fail("undeclared_lexical_sense_id", row.lexicalSenseId);
    assertPacketRefs([row.firstEncounterPacketId]);
    assertPacketRefs(row.meaningRetrievalPacketIds);
    assertPacketRefs(row.formRetrievalPacketIds);
    assertPacketRefs(row.phraseUsePacketIds);
    assertPacketRefs(row.spokenUsePacketIds);
    assertPacketRefs(row.crossSessionPacketIds);
    assertPacketRefs(row.crossLessonPacketIds);
    assertPacketRefs(row.delayedRetrievePacketIds);
  }
  for (const row of value.matrices.canDoCoverage) {
    if (!outcomeIds.has(row.communicativeOutcomeId)) {
      fail("undeclared_communicative_outcome_id", row.communicativeOutcomeId);
    }
    assertPacketRefs(row.receptionPacketIds);
    assertPacketRefs(row.productionOrInteractionPacketIds);
    assertPacketRefs(row.transferPacketIds);
  }
  for (const row of value.matrices.pronunciationCoverage) {
    if (!pronunciationIds.has(row.pronunciationTargetId)) {
      fail("undeclared_pronunciation_target_id", row.pronunciationTargetId);
    }
    assertPacketRefs(row.perceptionPacketIds);
    assertPacketRefs(row.productionPacketIds);
  }
  for (const row of value.matrices.ruUkInterference) {
    if (!pronunciationIds.has(row.pronunciationTargetId)) {
      fail("undeclared_pronunciation_target_id", row.pronunciationTargetId);
    }
    assertPacketRefs(row.ruPacketIds);
    assertPacketRefs(row.ukPacketIds);
  }
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nestedValue);
    }
    Object.freeze(value);
  }
  return value;
}

export function parseGermanCourseBlueprintDeV1(input: unknown): GermanCourseBlueprintDeV1 {
  let normalized: unknown;
  try {
    normalized = JSON.parse(canonicalJsonV1(input)) as unknown;
  } catch (error: unknown) {
    if (error instanceof GermanCourseBlueprintSchemaErrorDeV1) throw error;
    const code = error instanceof Error ? error.message : "canonical_json_invalid";
    fail(code, "$");
  }

  assertRecord(normalized, "$");
  assertClosedKeys(normalized, ROOT_KEYS, "$");
  if (normalized.schemaVersion !== "learning-v2-german-course-blueprint.v1") {
    fail("schema_version_invalid", "$.schemaVersion");
  }
  if (normalized.targetLanguage !== "de") fail("target_language_invalid", "$.targetLanguage");

  assertArray(normalized.localePolicy, "$.localePolicy");
  if (
    normalized.localePolicy.length !== 2 ||
    normalized.localePolicy[0] !== "ru" ||
    normalized.localePolicy[1] !== "uk"
  ) fail("locale_policy_invalid", "$.localePolicy");

  assertRecord(normalized.declaredCounts, "$.declaredCounts");
  assertClosedKeys(normalized.declaredCounts, DECLARED_COUNT_KEYS, "$.declaredCounts");
  const expectedCounts = { lessons: 32, chapters: 224, sessionPackets: 1792 } as const;
  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (normalized.declaredCounts[key] !== expected) {
      fail("declared_count_invalid", `$.declaredCounts.${key}`);
    }
  }

  assertRecord(normalized.artifactPaths, "$.artifactPaths");
  assertClosedKeys(normalized.artifactPaths, Object.keys(ARTIFACT_PATHS), "$.artifactPaths");
  for (const [key, expectedPath] of Object.entries(ARTIFACT_PATHS)) {
    if (normalized.artifactPaths[key] !== expectedPath) {
      fail("artifact_path_invalid", `$.artifactPaths.${key}`);
    }
  }

  validateDigestRecord(normalized.sourceDigests, SOURCE_DIGEST_KEYS, "$.sourceDigests");
  validateDigestRecord(normalized.registryDigests, REGISTRY_DIGEST_KEYS, "$.registryDigests");
  validateDigestRecord(normalized.graphDigests, GRAPH_DIGEST_KEYS, "$.graphDigests");
  validateDigestRecord(normalized.matrixDigests, MATRIX_DIGEST_KEYS, "$.matrixDigests");
  if (
    normalized.candidateFingerprint !== null &&
    (typeof normalized.candidateFingerprint !== "string" ||
      !SHA256_PATTERN.test(normalized.candidateFingerprint))
  ) fail("sha256_or_null_required", "$.candidateFingerprint");

  assertArray(normalized.grammarConstructs, "$.grammarConstructs");
  normalized.grammarConstructs.forEach((value, index) => {
    validateGrammarConstruct(value, `$.grammarConstructs[${index}]`);
  });
  assertArray(normalized.lexicalSenses, "$.lexicalSenses");
  normalized.lexicalSenses.forEach((value, index) => {
    validateLexicalSense(value, `$.lexicalSenses[${index}]`);
  });
  assertArray(normalized.communicativeOutcomes, "$.communicativeOutcomes");
  normalized.communicativeOutcomes.forEach((value, index) => {
    validateCommunicativeOutcome(value, `$.communicativeOutcomes[${index}]`);
  });
  assertArray(normalized.pronunciationTargets, "$.pronunciationTargets");
  normalized.pronunciationTargets.forEach((value, index) => {
    validatePronunciationTarget(value, `$.pronunciationTargets[${index}]`);
  });
  assertArray(normalized.phraseFrames, "$.phraseFrames");
  normalized.phraseFrames.forEach((value, index) => {
    validatePhraseFrame(value, `$.phraseFrames[${index}]`);
  });
  assertArray(normalized.forbiddenSurfaceForms, "$.forbiddenSurfaceForms");
  normalized.forbiddenSurfaceForms.forEach((value, index) => {
    validateForbiddenSurfaceForm(value, `$.forbiddenSurfaceForms[${index}]`);
  });
  assertArray(normalized.sessionPackets, "$.sessionPackets");
  normalized.sessionPackets.forEach((value, index) => {
    validateSessionPacketShape(value, `$.sessionPackets[${index}]`);
  });
  validateGraphs(normalized.graphs, "$.graphs");
  validateMatrices(normalized.matrices, "$.matrices");

  const parsed = normalized as unknown as GermanCourseBlueprintDeV1;
  const seenIds = new Set<string>();
  assertNoDuplicateIds(parsed.grammarConstructs, seenIds);
  assertNoDuplicateIds(parsed.lexicalSenses, seenIds);
  assertNoDuplicateIds(parsed.communicativeOutcomes, seenIds);
  assertNoDuplicateIds(parsed.pronunciationTargets, seenIds);
  assertNoDuplicateIds(parsed.phraseFrames, seenIds);
  assertNoDuplicateIds(parsed.forbiddenSurfaceForms, seenIds);
  assertNoDuplicateIds(parsed.sessionPackets, seenIds);
  assertNoDuplicateIds(parsed.graphs.prerequisiteDag, seenIds);
  assertNoDuplicateIds(parsed.graphs.lexicalRetrievalGraph, seenIds);
  assertNoDuplicateIds(parsed.graphs.reviewEdges, seenIds);
  validateReferences(parsed);
  return deepFreeze(parsed);
}

export function canonicalGermanCourseBlueprintJsonDeV1(input: unknown): string {
  return canonicalJsonV1(parseGermanCourseBlueprintDeV1(input));
}

export const GERMAN_COURSE_BLUEPRINT_EMPTY_SKELETON_DE_V1 = parseGermanCourseBlueprintDeV1({
  schemaVersion: "learning-v2-german-course-blueprint.v1",
  targetLanguage: "de",
  localePolicy: ["ru", "uk"],
  declaredCounts: {
    lessons: 32,
    chapters: 224,
    sessionPackets: 1792,
  },
  artifactPaths: ARTIFACT_PATHS,
  sourceDigests: {
    researchDossier: null,
    sourceEvidenceLedger: null,
    ownerDecisions: null,
    taskPacketStage0: null,
    requirementManifest: null,
    designSpec: null,
    implementationPlan: null,
  },
  registryDigests: {
    lessons: null,
    chapters: null,
    grammarConstructs: null,
    lexicalSenses: null,
    communicativeOutcomes: null,
    pronunciationTargets: null,
    phraseFrames: null,
    forbiddenSurfaceForms: null,
    sessionPackets: null,
  },
  graphDigests: {
    prerequisiteDag: null,
    lexicalRetrievalGraph: null,
    reviewEdges: null,
  },
  matrixDigests: {
    grammarCoverage: null,
    lexicalCoverage: null,
    canDoCoverage: null,
    pronunciationCoverage: null,
    ruUkInterference: null,
  },
  candidateFingerprint: null,
  grammarConstructs: [],
  lexicalSenses: [],
  communicativeOutcomes: [],
  pronunciationTargets: [],
  phraseFrames: [],
  forbiddenSurfaceForms: [],
  sessionPackets: [],
  graphs: {
    prerequisiteDag: [],
    lexicalRetrievalGraph: [],
    reviewEdges: [],
  },
  matrices: {
    grammarCoverage: [],
    lexicalCoverage: [],
    canDoCoverage: [],
    pronunciationCoverage: [],
    ruUkInterference: [],
  },
});
