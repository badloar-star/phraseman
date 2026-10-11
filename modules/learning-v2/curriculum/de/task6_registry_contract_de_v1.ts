import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../policies/decision_registry";
import {
  parseGermanLexicalSenseRegistryDeV1,
  parseGermanPhraseFrameRegistryDeV1,
  parseGermanPronunciationTargetRegistryDeV1,
  type GermanLexicalSenseDeV1,
  type GermanPhraseFrameDeV1,
  type GermanPronunciationTargetDeV1,
} from "./course_blueprint_contract_de_v1";
import {
  parseGermanLexicalItemEvidenceRegistryDeV1,
  type GermanLexicalItemEvidenceRegistryDeV1,
} from "./lexical_item_evidence_de_v1";
import { GERMAN_RESEARCH_AUTHORITY_V1 } from "./research_authority_de_v1";

type JsonRecord = Record<string, unknown>;

type LexicalMapping = Readonly<{
  sourcePlanId: string;
  canonicalId: string;
  plannedWordFirstPacketId: string;
  plannedFirstScoredUsePacketId: string;
}>;

type PhraseFrameMapping = Readonly<{
  sourceChapterId: string;
  canonicalId: string;
  plannedFirstUsePacketId: string;
}>;

type PronunciationMapping = Readonly<{
  sourcePlanId: string;
  sourceLessonId: string;
  canonicalId: string;
}>;

type CommunicativeOutcomeMapping = Readonly<{
  sourceOutcomeId: string;
  canonicalId: string;
}>;

type ForbiddenSurfaceFact = Readonly<{
  id: string;
  surface: string;
  unlockConstructId: string;
  infinitiveTokens: readonly string[];
}>;

type PronunciationPresentationPolicy = Readonly<{
  pronunciationTargetId: string;
  canonicalRegion: "DE_STANDARD" | "AT" | "CH";
  productionPolicy: "productive" | "regional_receptive";
  learnerLabel: string | null;
}>;

type GrammarFact = Readonly<{
  id: string;
  firstIntroductionPacketId: string;
}>;

type LessonFact = Readonly<{
  id: string;
  outcomeIds: readonly string[];
  pronunciationPlanIds: readonly string[];
}>;

type LexicalPlanFact = Readonly<{
  sourcePlanId: string;
  chapterId: string;
  lessonId: string;
  lemmaOrExpression: string;
  senseGloss: string;
  partOfSpeech: string;
  nounPackage: JsonRecord | null;
  verbPackage: JsonRecord | null;
  integratedConstructIds: readonly string[];
  plannedUsePacketIds: readonly string[];
}>;

type ChapterFact = Readonly<{
  id: string;
  lessonId: string;
  lessonOutcomeId: string;
  packetIds: readonly string[];
  allowedConstructIds: readonly string[];
}>;

export type GermanTask6RegistryAuthorityContextDeV1 = Readonly<{
  schemaVersion: "learning-v2-german-task6-registry-authority.v1";
  sourceIdentities: Readonly<
    Record<
      "grammarConstructs" | "lessonBlueprints" | "chapterBlueprints",
      Readonly<{ path: string; canonicalSha256: string }>
    >
  >;
  grammarFacts: readonly GrammarFact[];
  lessonFacts: readonly LessonFact[];
  chapterFacts: readonly ChapterFact[];
  lexicalPlanFacts: readonly LexicalPlanFact[];
  lexicalMappings: readonly LexicalMapping[];
  phraseFrameMappings: readonly PhraseFrameMapping[];
  pronunciationMappings: readonly PronunciationMapping[];
  communicativeOutcomeMappings: readonly CommunicativeOutcomeMapping[];
  forbiddenSurfaceForms: readonly ForbiddenSurfaceFact[];
  pronunciationPresentationPolicies: readonly PronunciationPresentationPolicy[];
}>;

export type GermanTask6RegistryContractResultDeV1 = Readonly<{
  status: "TASK6_CONTRACT_KERNEL_PARTIAL";
  sourceAuthorityStatus: "CONTENT_ADDRESSED_TASK3_TASK4_TASK5";
  packetMaterializationStatus: "UNVERIFIED_UNTIL_TASK7";
  pronunciationPacketContactsStatus: "UNVERIFIED_UNTIL_TASK7";
  phraseFrameQuantityStatus: "UNVERIFIED_UNTIL_TASK7";
  nativePhraseJudgementStatus: "REQUIRED";
  patternMatcherScope: "BOUNDED_MANDATORY_AND_DECLARED_PATTERNS_ONLY";
  rowsPromoted: 0;
  verifiedLexicalItemEvidenceRows: number;
  registryCounts: Readonly<{
    lexicalSenses: number;
    phraseFrames: number;
    pronunciationTargets: number;
  }>;
}>;

export class GermanTask6RegistryContractErrorDeV1 extends Error {
  constructor(
    readonly code: string,
    readonly detail?: string,
  ) {
    super(detail === undefined ? code : `${code}:${detail}`);
    this.name = "GermanTask6RegistryContractErrorDeV1";
  }
}

const SOURCE_IDENTITIES = Object.freeze({
  grammarConstructs: Object.freeze({
    path: "modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json",
    canonicalSha256:
      "eecaa24781b2054c89c347df9c7312d0db41aa8a53a2694b228530b2624d1f24",
  }),
  lessonBlueprints: Object.freeze({
    path: "modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json",
    canonicalSha256:
      "cdfcd27adbe7694fd2e53b86fbb8a91b676d81d5526b487cd7e56b622f88bc9a",
  }),
  chapterBlueprints: Object.freeze({
    path: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
    canonicalSha256:
      "e70ef798e06dfa752e9faace47282300a4fd43f8acaf158b2f608a8225f8cf90",
  }),
});

const CONTEXT_KEYS = Object.freeze([
  "schemaVersion",
  "authoritySources",
  "lexicalMappings",
  "phraseFrameMappings",
  "pronunciationMappings",
  "communicativeOutcomeMappings",
  "forbiddenSurfaceForms",
  "pronunciationPresentationPolicies",
] as const);
const INPUT_KEYS = Object.freeze([
  "lexicalSenses",
  "phraseFrames",
  "pronunciationTargets",
] as const);
const SOURCE_KEYS = Object.freeze([
  "grammarConstructs",
  "lessonBlueprints",
  "chapterBlueprints",
] as const);
const GERMAN_ID_PATTERN = /^de_[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u;
const PACKET_ID_PATTERN = /^de_l(\d{2})_c(\d{2})_s(\d{2})$/u;
const WORD_TOKEN_PATTERN = /[\p{L}\p{M}]+(?:[-'][\p{L}\p{M}]+)*/gu;
const FINITE_WERDEN_FORMS = new Set([
  "werde",
  "wirst",
  "wird",
  "werden",
  "werdet",
]);
const MANDATORY_FORBIDDEN_SURFACE_FACTS: readonly ForbiddenSurfaceFact[] =
  Object.freeze([
    Object.freeze({
      id: "de_forbid_werden_infinitive_v1",
      surface: "werden + Infinitiv",
      unlockConstructId: "de_gc_werden_infinitive_meanings_v1",
      infinitiveTokens: Object.freeze(["kommen"]),
    }),
  ]);
const VERB_VALENCY_ADJUDICATIONS = Object.freeze({
  de_lex_plan_l16_c01_ankommen_v1: Object.freeze({
    sourceVerbPackageSha256:
      "4be6502b25f9088763d9d6ec26748fa019e50c901770a4b4253cb1cbb5f4ffe7",
    slots: Object.freeze(["subject", "destination-location complement"]),
  }),
});
const TRUSTED_CONTEXTS = new WeakSet<object>();

const PRONUNCIATION_RELEVANCE = Object.freeze({
  de_pron_plan_long_short_vowel_diagnostic_v1: Object.freeze({
    target: "German vowel duration and length-quality diagnostic",
    canonicalRegion: "DE_STANDARD",
    productionPolicy: "productive",
    learnerLabel: null,
    perceptionEvidenceIds: Object.freeze(["DE-PHON-RU-001", "DE-PHON-RU-004"]),
    productionEvidenceIds: Object.freeze(["DE-PHON-RU-001"]),
    ruApplicabilityEvidenceIds: Object.freeze([
      "DE-PHON-RU-001",
      "DE-PHON-RU-004",
    ]),
    ukApplicabilityEvidenceIds: Object.freeze(["DE-PHON-UK-002"]),
  }),
});

const PRONUNCIATION_CLAIM_IDENTITIES = Object.freeze({
  "DE-PHON-RU-001":
    "9f0da3e7977b717f36841a186f8a0ace566b7c28f53c952e6d2f92352117241a",
  "DE-PHON-RU-004":
    "ca8dbe76211f87612b88aaf1cced434c33e8d8aa945f7826c82fa7b6a122a735",
  "DE-PHON-UK-002":
    "0f872c04a4b0bc5ca79d0686b672e2ab5cf89d425f981d2d1ea6f60360788f48",
});

function fail(code: string, detail?: string): never {
  throw new GermanTask6RegistryContractErrorDeV1(code, detail);
}

function assertRecord(
  value: unknown,
  path: string,
): asserts value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("plain_record_required", path);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("plain_record_required", path);
  }
}

function assertArray(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) fail("array_required", path);
}

function assertString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail("non_empty_string_required", path);
  }
}

function assertClosedKeys(
  value: JsonRecord,
  keys: readonly string[],
  path: string,
): void {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) fail("missing_field", `${path}.${key}`);
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) fail("unknown_field", `${path}.${key}`);
  }
}

function assertGermanId(
  value: unknown,
  prefix: string,
  path: string,
): asserts value is string {
  assertString(value, path);
  if (!GERMAN_ID_PATTERN.test(value) || !value.startsWith(prefix)) {
    fail("german_id_invalid", path);
  }
}

function assertPacketId(value: unknown, path: string): asserts value is string {
  assertString(value, path);
  const match = PACKET_ID_PATTERN.exec(value);
  if (match === null) fail("packet_id_invalid", path);
  const lesson = Number(match[1]);
  const chapter = Number(match[2]);
  const session = Number(match[3]);
  if (
    lesson < 1 ||
    lesson > 32 ||
    chapter < 1 ||
    chapter > 7 ||
    session < 1 ||
    session > 56 ||
    Math.ceil(session / 8) !== chapter
  )
    fail("packet_id_topology_invalid", value);
}

function packetOrder(packetId: string): number {
  const match = PACKET_ID_PATTERN.exec(packetId);
  if (match === null) fail("packet_id_invalid", packetId);
  return (Number(match[1]) - 1) * 56 + Number(match[3]);
}

function canonicalizeSmall(value: unknown): JsonRecord {
  let normalized: unknown;
  try {
    normalized = JSON.parse(canonicalJsonV1(value)) as unknown;
  } catch (error: unknown) {
    fail(
      "canonical_json_invalid",
      error instanceof Error ? error.message : "authority_context",
    );
  }
  assertRecord(normalized, "$");
  return normalized;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as JsonRecord)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function requireUnique(value: string, seen: Set<string>, code: string): void {
  if (seen.has(value)) fail(code, value);
  seen.add(value);
}

function stringArray(value: unknown, path: string): readonly string[] {
  assertArray(value, path);
  const result: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    assertString(value[index], `${path}[${index}]`);
    const item = value[index] as string;
    requireUnique(item, seen, "duplicate_array_value");
    result.push(item);
  }
  return result;
}

function cloneJsonRecord(value: unknown, path: string): JsonRecord {
  assertRecord(value, path);
  return JSON.parse(canonicalJsonV1(value)) as JsonRecord;
}

function snapshotAuthoritySource(value: unknown): unknown {
  return deepFreeze(JSON.parse(canonicalJsonV1(value)) as unknown);
}

function bindSources(authoritySources: unknown): Readonly<{
  grammarFacts: readonly GrammarFact[];
  lessonFacts: readonly LessonFact[];
  chapterFacts: readonly ChapterFact[];
  lexicalPlanFacts: readonly LexicalPlanFact[];
}> {
  assertRecord(authoritySources, "$.authoritySources");
  assertClosedKeys(authoritySources, SOURCE_KEYS, "$.authoritySources");
  const sourceSnapshots: Record<string, unknown> = {};
  for (const key of SOURCE_KEYS) {
    const snapshot = snapshotAuthoritySource(authoritySources[key]);
    const actual = hashCanonicalBody(snapshot);
    if (actual !== SOURCE_IDENTITIES[key].canonicalSha256) {
      fail("authority_source_hash_mismatch", key);
    }
    sourceSnapshots[key] = snapshot;
  }

  const grammarSource = sourceSnapshots.grammarConstructs;
  assertArray(grammarSource, "$.authoritySources.grammarConstructs");
  const grammarFacts = grammarSource.map((candidate, index) => {
    assertRecord(candidate, `grammarConstructs[${index}]`);
    assertGermanId(candidate.id, "de_gc_", `grammarConstructs[${index}].id`);
    assertPacketId(
      candidate.firstIntroductionPacketId,
      `grammarConstructs[${index}].firstIntroductionPacketId`,
    );
    return {
      id: candidate.id,
      firstIntroductionPacketId: candidate.firstIntroductionPacketId,
    };
  });

  const lessonSource = sourceSnapshots.lessonBlueprints;
  assertRecord(lessonSource, "$.authoritySources.lessonBlueprints");
  const lessonRows = lessonSource.lessons;
  assertArray(lessonRows, "$.authoritySources.lessonBlueprints.lessons");
  const lessonFacts = lessonRows.map((candidate, index) => {
    assertRecord(candidate, `lessonBlueprints.lessons[${index}]`);
    assertGermanId(
      candidate.id,
      "de_l",
      `lessonBlueprints.lessons[${index}].id`,
    );
    assertArray(
      candidate.chapterOutcomes,
      `lessonBlueprints.lessons[${index}].chapterOutcomes`,
    );
    const outcomeIds = candidate.chapterOutcomes.map(
      (outcome, outcomeIndex) => {
        assertRecord(
          outcome,
          `lessonBlueprints.lessons[${index}].chapterOutcomes[${outcomeIndex}]`,
        );
        assertString(outcome.id, "chapterOutcome.id");
        return outcome.id;
      },
    );
    return {
      id: candidate.id,
      outcomeIds,
      pronunciationPlanIds: stringArray(
        candidate.plannedPronunciationTargetIds,
        `lessonBlueprints.lessons[${index}].plannedPronunciationTargetIds`,
      ),
    };
  });

  const chapterSource = sourceSnapshots.chapterBlueprints;
  assertRecord(chapterSource, "$.authoritySources.chapterBlueprints");
  const chapterLessonRows = chapterSource.lessons;
  assertArray(
    chapterLessonRows,
    "$.authoritySources.chapterBlueprints.lessons",
  );
  const chapterFacts: ChapterFact[] = [];
  const lexicalPlanFacts: LexicalPlanFact[] = [];
  for (
    let lessonIndex = 0;
    lessonIndex < chapterLessonRows.length;
    lessonIndex += 1
  ) {
    const lesson = chapterLessonRows[lessonIndex];
    assertRecord(lesson, `chapterBlueprints.lessons[${lessonIndex}]`);
    assertString(lesson.lessonId, "chapterBlueprint.lessonId");
    assertArray(
      lesson.chapters,
      `chapterBlueprints.lessons[${lessonIndex}].chapters`,
    );
    for (
      let chapterIndex = 0;
      chapterIndex < lesson.chapters.length;
      chapterIndex += 1
    ) {
      const chapter = lesson.chapters[chapterIndex];
      assertRecord(chapter, `chapterBlueprint.chapters[${chapterIndex}]`);
      assertString(chapter.id, "chapter.id");
      assertString(chapter.lessonOutcomeId, "chapter.lessonOutcomeId");
      const packetIds = stringArray(
        chapter.packetIds,
        `chapter:${chapter.id}.packetIds`,
      );
      for (const packetId of packetIds)
        assertPacketId(packetId, `chapter:${chapter.id}.packetId`);
      const allowedConstructIds = stringArray(
        chapter.allowedConstructIds,
        `chapter:${chapter.id}.allowedConstructIds`,
      );
      chapterFacts.push({
        id: chapter.id,
        lessonId: lesson.lessonId,
        lessonOutcomeId: chapter.lessonOutcomeId,
        packetIds,
        allowedConstructIds,
      });
      assertRecord(chapter.checkpoint, `chapter:${chapter.id}.checkpoint`);
      const integratedConstructIds = stringArray(
        chapter.checkpoint.integratedConstructIds,
        `chapter:${chapter.id}.checkpoint.integratedConstructIds`,
      );
      assertArray(
        chapter.checkpoint.plannedNewLexicalSenses,
        `chapter:${chapter.id}.checkpoint.plannedNewLexicalSenses`,
      );
      for (const planned of chapter.checkpoint.plannedNewLexicalSenses) {
        assertRecord(planned, `chapter:${chapter.id}.lexicalPlan`);
        assertString(planned.id, "lexicalPlan.id");
        assertString(
          planned.lemmaOrExpression,
          "lexicalPlan.lemmaOrExpression",
        );
        assertString(planned.senseGloss, "lexicalPlan.senseGloss");
        assertString(planned.partOfSpeech, "lexicalPlan.partOfSpeech");
        assertRecord(
          planned.utilityProof,
          `lexicalPlan:${planned.id}.utilityProof`,
        );
        lexicalPlanFacts.push({
          sourcePlanId: planned.id,
          chapterId: chapter.id,
          lessonId: lesson.lessonId,
          lemmaOrExpression: planned.lemmaOrExpression,
          senseGloss: planned.senseGloss,
          partOfSpeech: planned.partOfSpeech,
          nounPackage:
            planned.nounPackage === null
              ? null
              : cloneJsonRecord(
                  planned.nounPackage,
                  `lexicalPlan:${planned.id}.nounPackage`,
                ),
          verbPackage:
            planned.verbPackage === null
              ? null
              : cloneJsonRecord(
                  planned.verbPackage,
                  `lexicalPlan:${planned.id}.verbPackage`,
                ),
          integratedConstructIds,
          plannedUsePacketIds: stringArray(
            planned.utilityProof.plannedUsePacketIds,
            `lexicalPlan:${planned.id}.plannedUsePacketIds`,
          ),
        });
      }
    }
  }
  return { grammarFacts, lessonFacts, chapterFacts, lexicalPlanFacts };
}

function parseLexicalMappings(
  value: unknown,
  lexicalPlans: ReadonlyMap<string, LexicalPlanFact>,
  chapters: ReadonlyMap<string, ChapterFact>,
): readonly LexicalMapping[] {
  assertArray(value, "$.lexicalMappings");
  const sourceIds = new Set<string>();
  const canonicalIds = new Set<string>();
  return value.map((candidate, index) => {
    const path = `$.lexicalMappings[${index}]`;
    assertRecord(candidate, path);
    assertClosedKeys(
      candidate,
      [
        "sourcePlanId",
        "canonicalId",
        "plannedWordFirstPacketId",
        "plannedFirstScoredUsePacketId",
      ],
      path,
    );
    assertString(candidate.sourcePlanId, `${path}.sourcePlanId`);
    const plan = lexicalPlans.get(candidate.sourcePlanId);
    if (plan === undefined)
      fail("unknown_task5_lexical_plan", candidate.sourcePlanId);
    requireUnique(
      candidate.sourcePlanId,
      sourceIds,
      "duplicate_task5_lexical_plan_mapping",
    );
    assertGermanId(candidate.canonicalId, "de_lex_", `${path}.canonicalId`);
    requireUnique(
      candidate.canonicalId,
      canonicalIds,
      "duplicate_canonical_mapping",
    );
    assertPacketId(
      candidate.plannedWordFirstPacketId,
      `${path}.plannedWordFirstPacketId`,
    );
    assertPacketId(
      candidate.plannedFirstScoredUsePacketId,
      `${path}.plannedFirstScoredUsePacketId`,
    );
    const chapter = chapters.get(plan.chapterId)!;
    if (!chapter.packetIds.includes(candidate.plannedWordFirstPacketId)) {
      fail(
        "word_first_packet_not_owned_by_task5_chapter",
        candidate.canonicalId,
      );
    }
    if (
      !plan.plannedUsePacketIds.includes(
        candidate.plannedFirstScoredUsePacketId,
      )
    ) {
      fail("planned_use_packet_not_declared_by_task5", candidate.canonicalId);
    }
    if (
      packetOrder(candidate.plannedWordFirstPacketId) >=
      packetOrder(candidate.plannedFirstScoredUsePacketId)
    )
      fail("word_first_chronology_invalid", candidate.canonicalId);
    return candidate as unknown as LexicalMapping;
  });
}

function parsePhraseMappings(
  value: unknown,
  chapters: ReadonlyMap<string, ChapterFact>,
): readonly PhraseFrameMapping[] {
  assertArray(value, "$.phraseFrameMappings");
  const canonicalIds = new Set<string>();
  return value.map((candidate, index) => {
    const path = `$.phraseFrameMappings[${index}]`;
    assertRecord(candidate, path);
    assertClosedKeys(
      candidate,
      ["sourceChapterId", "canonicalId", "plannedFirstUsePacketId"],
      path,
    );
    assertString(candidate.sourceChapterId, `${path}.sourceChapterId`);
    const chapter = chapters.get(candidate.sourceChapterId);
    if (chapter === undefined)
      fail("unknown_task5_chapter", candidate.sourceChapterId);
    assertGermanId(candidate.canonicalId, "de_pf_", `${path}.canonicalId`);
    requireUnique(
      candidate.canonicalId,
      canonicalIds,
      "duplicate_canonical_mapping",
    );
    assertPacketId(
      candidate.plannedFirstUsePacketId,
      `${path}.plannedFirstUsePacketId`,
    );
    if (!chapter.packetIds.includes(candidate.plannedFirstUsePacketId)) {
      fail("phrase_packet_not_owned_by_source_chapter", candidate.canonicalId);
    }
    return candidate as unknown as PhraseFrameMapping;
  });
}

function parsePronunciationMappings(
  value: unknown,
  lessons: ReadonlyMap<string, LessonFact>,
): readonly PronunciationMapping[] {
  assertArray(value, "$.pronunciationMappings");
  const sourcePlanIds = new Set<string>();
  const canonicalIds = new Set<string>();
  return value.map((candidate, index) => {
    const path = `$.pronunciationMappings[${index}]`;
    assertRecord(candidate, path);
    assertClosedKeys(
      candidate,
      ["sourcePlanId", "sourceLessonId", "canonicalId"],
      path,
    );
    assertString(candidate.sourcePlanId, `${path}.sourcePlanId`);
    assertString(candidate.sourceLessonId, `${path}.sourceLessonId`);
    const lesson = lessons.get(candidate.sourceLessonId);
    if (
      lesson === undefined ||
      !lesson.pronunciationPlanIds.includes(candidate.sourcePlanId)
    ) {
      if (lesson === undefined) {
        fail(
          "pronunciation_plan_not_owned_by_source_lesson",
          candidate.sourceLessonId,
        );
      }
      fail("unknown_task4_pronunciation_plan", candidate.sourcePlanId);
    }
    if (!Object.hasOwn(PRONUNCIATION_RELEVANCE, candidate.sourcePlanId)) {
      fail(
        "pronunciation_plan_relevance_unadjudicated",
        candidate.sourcePlanId,
      );
    }
    requireUnique(
      candidate.sourcePlanId,
      sourcePlanIds,
      "duplicate_pronunciation_semantics",
    );
    assertGermanId(candidate.canonicalId, "de_pron_", `${path}.canonicalId`);
    requireUnique(
      candidate.canonicalId,
      canonicalIds,
      "duplicate_canonical_mapping",
    );
    return candidate as unknown as PronunciationMapping;
  });
}

function parseOutcomeMappings(
  value: unknown,
  lessons: ReadonlyMap<string, LessonFact>,
): readonly CommunicativeOutcomeMapping[] {
  assertArray(value, "$.communicativeOutcomeMappings");
  const sourceIds = new Set<string>();
  const canonicalIds = new Set<string>();
  const knownSourceIds = new Set(
    [...lessons.values()].flatMap((lesson) => lesson.outcomeIds),
  );
  return value.map((candidate, index) => {
    const path = `$.communicativeOutcomeMappings[${index}]`;
    assertRecord(candidate, path);
    assertClosedKeys(candidate, ["sourceOutcomeId", "canonicalId"], path);
    assertString(candidate.sourceOutcomeId, `${path}.sourceOutcomeId`);
    if (!knownSourceIds.has(candidate.sourceOutcomeId)) {
      fail("unknown_task4_outcome", candidate.sourceOutcomeId);
    }
    requireUnique(
      candidate.sourceOutcomeId,
      sourceIds,
      "duplicate_source_outcome_mapping",
    );
    assertGermanId(candidate.canonicalId, "de_out_", `${path}.canonicalId`);
    requireUnique(
      candidate.canonicalId,
      canonicalIds,
      "duplicate_canonical_mapping",
    );
    return candidate as unknown as CommunicativeOutcomeMapping;
  });
}

function parseForbiddenFacts(
  value: unknown,
  grammar: ReadonlyMap<string, GrammarFact>,
): readonly ForbiddenSurfaceFact[] {
  assertArray(value, "$.forbiddenSurfaceForms");
  const seen = new Set<string>();
  const supplied = value.map((candidate, index) => {
    const path = `$.forbiddenSurfaceForms[${index}]`;
    assertRecord(candidate, path);
    assertClosedKeys(
      candidate,
      ["id", "surface", "unlockConstructId", "infinitiveTokens"],
      path,
    );
    assertGermanId(candidate.id, "de_forbid_", `${path}.id`);
    requireUnique(candidate.id, seen, "duplicate_forbidden_surface_fact");
    assertString(candidate.surface, `${path}.surface`);
    assertGermanId(
      candidate.unlockConstructId,
      "de_gc_",
      `${path}.unlockConstructId`,
    );
    if (!grammar.has(candidate.unlockConstructId)) {
      fail("unknown_task3_grammar_ref", candidate.unlockConstructId);
    }
    const infinitiveTokens = stringArray(
      candidate.infinitiveTokens,
      `${path}.infinitiveTokens`,
    );
    if (candidate.surface.includes("+")) {
      if (
        candidate.surface !== "werden + Infinitiv" ||
        infinitiveTokens.length === 0
      ) {
        fail("forbidden_surface_pattern_unverified", candidate.surface);
      }
      for (const token of infinitiveTokens) {
        if (!/^[a-zäöüß]+$/u.test(token)) {
          fail("forbidden_surface_pattern_unverified", candidate.surface);
        }
      }
    } else {
      const tokens = candidate.surface.match(WORD_TOKEN_PATTERN) ?? [];
      if (
        tokens.length === 0 ||
        tokens.join(" ") !== candidate.surface ||
        infinitiveTokens.length !== 0
      ) {
        fail("forbidden_surface_pattern_unverified", candidate.surface);
      }
    }
    return {
      id: candidate.id,
      surface: candidate.surface,
      unlockConstructId: candidate.unlockConstructId,
      infinitiveTokens,
    };
  });
  const merged = new Map<string, ForbiddenSurfaceFact>();
  for (const fact of MANDATORY_FORBIDDEN_SURFACE_FACTS) {
    if (!grammar.has(fact.unlockConstructId)) {
      fail("unknown_task3_grammar_ref", fact.unlockConstructId);
    }
    merged.set(fact.id, fact);
  }
  for (const fact of supplied) {
    const mandatory = merged.get(fact.id);
    if (
      mandatory !== undefined &&
      canonicalJsonV1(mandatory) !== canonicalJsonV1(fact)
    ) {
      fail("mandatory_forbidden_surface_conflict", fact.id);
    }
    merged.set(fact.id, fact);
  }
  return [...merged.values()];
}

function parsePresentationPolicies(
  value: unknown,
): readonly PronunciationPresentationPolicy[] {
  assertArray(value, "$.pronunciationPresentationPolicies");
  const seen = new Set<string>();
  return value.map((candidate, index) => {
    const path = `$.pronunciationPresentationPolicies[${index}]`;
    assertRecord(candidate, path);
    assertClosedKeys(
      candidate,
      [
        "pronunciationTargetId",
        "canonicalRegion",
        "productionPolicy",
        "learnerLabel",
      ],
      path,
    );
    assertGermanId(
      candidate.pronunciationTargetId,
      "de_pron_",
      `${path}.pronunciationTargetId`,
    );
    requireUnique(
      candidate.pronunciationTargetId,
      seen,
      "duplicate_pronunciation_presentation_policy",
    );
    if (
      candidate.canonicalRegion !== "DE_STANDARD" &&
      candidate.canonicalRegion !== "AT" &&
      candidate.canonicalRegion !== "CH"
    )
      fail("canonical_region_invalid", `${path}.canonicalRegion`);
    if (
      candidate.productionPolicy !== "productive" &&
      candidate.productionPolicy !== "regional_receptive"
    )
      fail(
        "pronunciation_production_policy_invalid",
        `${path}.productionPolicy`,
      );
    if (candidate.learnerLabel !== null) {
      assertString(candidate.learnerLabel, `${path}.learnerLabel`);
    }
    return candidate as unknown as PronunciationPresentationPolicy;
  });
}

export function parseGermanTask6RegistryAuthorityContextDeV1(
  input: unknown,
): GermanTask6RegistryAuthorityContextDeV1 {
  assertRecord(input, "$");
  assertClosedKeys(input, CONTEXT_KEYS, "$");
  const schemaVersion = input.schemaVersion;
  if (schemaVersion !== "learning-v2-german-task6-registry-authority.v1") {
    fail("authority_schema_version_invalid");
  }
  const bound = bindSources(input.authoritySources);
  const grammar = new Map(bound.grammarFacts.map((fact) => [fact.id, fact]));
  const lessons = new Map(bound.lessonFacts.map((fact) => [fact.id, fact]));
  const chapters = new Map(bound.chapterFacts.map((fact) => [fact.id, fact]));
  const lexicalPlans = new Map(
    bound.lexicalPlanFacts.map((fact) => [fact.sourcePlanId, fact]),
  );
  const small = canonicalizeSmall({
    lexicalMappings: input.lexicalMappings,
    phraseFrameMappings: input.phraseFrameMappings,
    pronunciationMappings: input.pronunciationMappings,
    communicativeOutcomeMappings: input.communicativeOutcomeMappings,
    forbiddenSurfaceForms: input.forbiddenSurfaceForms,
    pronunciationPresentationPolicies: input.pronunciationPresentationPolicies,
  });
  const parsed = deepFreeze({
    schemaVersion,
    sourceIdentities: SOURCE_IDENTITIES,
    ...bound,
    lexicalMappings: parseLexicalMappings(
      small.lexicalMappings,
      lexicalPlans,
      chapters,
    ),
    phraseFrameMappings: parsePhraseMappings(
      small.phraseFrameMappings,
      chapters,
    ),
    pronunciationMappings: parsePronunciationMappings(
      small.pronunciationMappings,
      lessons,
    ),
    communicativeOutcomeMappings: parseOutcomeMappings(
      small.communicativeOutcomeMappings,
      lessons,
    ),
    forbiddenSurfaceForms: parseForbiddenFacts(
      small.forbiddenSurfaceForms,
      grammar,
    ),
    pronunciationPresentationPolicies: parsePresentationPolicies(
      small.pronunciationPresentationPolicies,
    ),
  }) as GermanTask6RegistryAuthorityContextDeV1;
  TRUSTED_CONTEXTS.add(parsed);
  return parsed;
}

function expectedPartOfSpeech(sourcePartOfSpeech: string): string {
  return sourcePartOfSpeech === "fixed_expression"
    ? "formulaic_chunk"
    : sourcePartOfSpeech;
}

function validateLexicalSemantics(
  lexical: GermanLexicalSenseDeV1,
  plan: LexicalPlanFact,
): void {
  if (
    lexical.lemma !== plan.lemmaOrExpression ||
    lexical.senseGloss !== plan.senseGloss ||
    lexical.partOfSpeech !== expectedPartOfSpeech(plan.partOfSpeech)
  )
    fail("lexical_plan_semantics_mismatch", lexical.id);
  if (lexical.partOfSpeech === "noun") {
    if (
      plan.nounPackage === null ||
      plan.nounPackage.article !== lexical.nounGender ||
      plan.nounPackage.singular !== lexical.lemma ||
      plan.nounPackage.plural !== lexical.nounPlural
    )
      fail("lexical_plan_semantics_mismatch", lexical.id);
  }
  if (lexical.partOfSpeech === "verb") {
    if (
      plan.verbPackage === null ||
      plan.verbPackage.infinitive !== lexical.lemma ||
      plan.verbPackage.valencyFrame !== lexical.verbFrame ||
      String(plan.verbPackage.separability).toUpperCase() !==
        lexical.verbSeparability ||
      plan.verbPackage.perfectAuxiliary !== lexical.verbAuxiliary
    )
      fail("lexical_plan_semantics_mismatch", lexical.id);
    const adjudication =
      VERB_VALENCY_ADJUDICATIONS[
        plan.sourcePlanId as keyof typeof VERB_VALENCY_ADJUDICATIONS
      ];
    if (adjudication === undefined) {
      fail("lexical_verb_valency_unadjudicated", plan.sourcePlanId);
    }
    if (
      hashCanonicalBody(plan.verbPackage) !==
      adjudication.sourceVerbPackageSha256
    ) {
      fail("lexical_verb_valency_source_hash_mismatch", plan.sourcePlanId);
    }
    if (
      lexical.verbValency === null ||
      lexical.verbValency.length !== adjudication.slots.length ||
      lexical.verbValency.some(
        (slot, index) => slot !== adjudication.slots[index],
      )
    ) {
      fail("lexical_verb_valency_mismatch", lexical.id);
    }
  }
}

function validateLexicalRegistry(
  lexicalSenses: readonly GermanLexicalSenseDeV1[],
  context: GermanTask6RegistryAuthorityContextDeV1,
): ReadonlyMap<string, LexicalPlanFact> {
  const lexicalById = new Map<string, GermanLexicalSenseDeV1>(
    lexicalSenses.map((item) => [item.id, item]),
  );
  const plans = new Map(
    context.lexicalPlanFacts.map((fact) => [fact.sourcePlanId, fact]),
  );
  const planByCanonicalId = new Map<string, LexicalPlanFact>();
  for (const mapping of context.lexicalMappings) {
    const lexical = lexicalById.get(mapping.canonicalId);
    if (lexical === undefined)
      fail("task5_mapping_without_canonical_item", mapping.canonicalId);
    const plan = plans.get(mapping.sourcePlanId)!;
    validateLexicalSemantics(lexical, plan);
    planByCanonicalId.set(mapping.canonicalId, plan);
  }
  for (const lexical of lexicalSenses) {
    if (!planByCanonicalId.has(lexical.id)) {
      fail("canonical_item_without_task5_lexical_plan", lexical.id);
    }
  }
  return planByCanonicalId;
}

function validateLexicalItemEvidence(
  lexicalSenses: readonly GermanLexicalSenseDeV1[],
  plansByCanonicalId: ReadonlyMap<string, LexicalPlanFact>,
  evidenceRegistry: GermanLexicalItemEvidenceRegistryDeV1 | undefined,
): number {
  if (evidenceRegistry === undefined) return 0;
  const lexicalById = new Map<string, GermanLexicalSenseDeV1>(
    lexicalSenses.map((item) => [item.id, item]),
  );
  for (const evidence of evidenceRegistry) {
    const lexical = lexicalById.get(evidence.canonicalLexicalSenseId);
    if (lexical === undefined) {
      fail("lexical_item_evidence_without_canonical_item", evidence.id);
    }
    const plan = plansByCanonicalId.get(evidence.canonicalLexicalSenseId);
    if (plan?.sourcePlanId !== evidence.sourcePlanId) {
      fail("lexical_item_evidence_source_plan_mismatch", evidence.id);
    }
    if (!lexical.evidenceIds.includes(evidence.id)) {
      fail("lexical_item_evidence_not_referenced", evidence.id);
    }
    if (!lexical.evidenceIds.includes("DE-REG-BASELINE-001")) {
      fail("lexical_item_baseline_evidence_required", lexical.id);
    }
    if (lexical.productionPolicy !== "productive" || lexical.region !== null) {
      fail("lexical_item_baseline_policy_mismatch", lexical.id);
    }
    const claims = evidence.curriculumClaims;
    if (
      lexical.lemma !== claims.lemma ||
      lexical.senseGloss !== claims.senseGloss ||
      lexical.partOfSpeech !== claims.partOfSpeech ||
      lexical.nounGender !== claims.nounGender ||
      lexical.nounPlural !== claims.nounPlural
    ) {
      fail("lexical_item_evidence_claim_mismatch", lexical.id);
    }
  }
  return evidenceRegistry.length;
}

type ForbiddenMatch = "MATCH" | "NO_MATCH" | "UNVERIFIED";

function literalTokenMatches(
  frameToken: string,
  surfaceToken: string,
  frameIndex: number,
  surfaceOffset: number,
): boolean {
  if (frameToken === surfaceToken) return true;
  return (
    frameIndex === 0 &&
    surfaceOffset === 0 &&
    surfaceToken === surfaceToken.toLocaleLowerCase("de-DE") &&
    frameToken.toLocaleLowerCase("de-DE") === surfaceToken
  );
}

function forbiddenMatch(
  frame: string,
  fact: ForbiddenSurfaceFact,
): ForbiddenMatch {
  const tokens = frame.match(WORD_TOKEN_PATTERN) ?? [];
  if (fact.surface === "werden + Infinitiv") {
    for (let index = 0; index < tokens.length; index += 1) {
      if (!FINITE_WERDEN_FORMS.has(tokens[index].toLocaleLowerCase("de-DE")))
        continue;
      if (
        tokens
          .slice(index + 1)
          .some((token) => fact.infinitiveTokens.includes(token))
      )
        return "MATCH";
      return "UNVERIFIED";
    }
    return "NO_MATCH";
  }
  const surfaceTokens = fact.surface.match(WORD_TOKEN_PATTERN) ?? [];
  for (
    let index = 0;
    index <= tokens.length - surfaceTokens.length;
    index += 1
  ) {
    if (
      surfaceTokens.every((token, offset) =>
        literalTokenMatches(tokens[index + offset], token, index, offset),
      )
    ) {
      return "MATCH";
    }
  }
  return "NO_MATCH";
}

function validatePhraseFrames(
  phraseFrames: readonly GermanPhraseFrameDeV1[],
  lexicalById: ReadonlyMap<string, GermanLexicalSenseDeV1>,
  lexicalPlans: ReadonlyMap<string, LexicalPlanFact>,
  context: GermanTask6RegistryAuthorityContextDeV1,
): void {
  const grammar = new Map(context.grammarFacts.map((fact) => [fact.id, fact]));
  const chapters = new Map(context.chapterFacts.map((fact) => [fact.id, fact]));
  const mappings = new Map(
    context.phraseFrameMappings.map((row) => [row.canonicalId, row]),
  );
  const outcomeMappings = new Map(
    context.communicativeOutcomeMappings.map((row) => [
      row.canonicalId,
      row.sourceOutcomeId,
    ]),
  );
  const forbidden = new Map(
    context.forbiddenSurfaceForms.map((fact) => [fact.id, fact]),
  );
  for (const frame of phraseFrames) {
    const mapping = mappings.get(frame.id);
    if (mapping === undefined)
      fail("canonical_phrase_without_task5_chapter", frame.id);
    const chapter = chapters.get(mapping.sourceChapterId)!;
    const firstUseOrder = packetOrder(mapping.plannedFirstUsePacketId);
    for (const grammarId of frame.grammarConstructIds) {
      const fact = grammar.get(grammarId);
      if (fact === undefined) fail("unknown_task3_grammar_ref", grammarId);
      if (!chapter.allowedConstructIds.includes(grammarId)) {
        fail(
          "grammar_not_allowed_by_source_chapter",
          `${frame.id}:${grammarId}`,
        );
      }
      if (firstUseOrder < packetOrder(fact.firstIntroductionPacketId)) {
        fail("future_grammar_leak", `${frame.id}:${grammarId}`);
      }
    }
    for (const outcomeId of frame.communicativeOutcomeIds) {
      const sourceOutcomeId = outcomeMappings.get(outcomeId);
      if (sourceOutcomeId === undefined)
        fail("unknown_outcome_mapping", outcomeId);
      if (sourceOutcomeId !== chapter.lessonOutcomeId) {
        fail("outcome_not_owned_by_source_chapter", `${frame.id}:${outcomeId}`);
      }
    }
    for (const lexicalId of frame.lexicalSenseIds) {
      if (!lexicalById.has(lexicalId))
        fail("unknown_lexical_sense_ref", lexicalId);
      const plan = lexicalPlans.get(lexicalId);
      if (
        plan === undefined ||
        !plan.plannedUsePacketIds.includes(mapping.plannedFirstUsePacketId)
      ) {
        fail("lexical_use_not_owned_by_task5_plan", `${frame.id}:${lexicalId}`);
      }
    }
    for (const forbiddenId of frame.forbiddenSurfaceFormIds) {
      if (!forbidden.has(forbiddenId))
        fail("unknown_forbidden_surface_ref", forbiddenId);
    }
    for (const fact of forbidden.values()) {
      const unlock = grammar.get(fact.unlockConstructId)!;
      if (firstUseOrder >= packetOrder(unlock.firstIntroductionPacketId))
        continue;
      const match = forbiddenMatch(frame.frame, fact);
      if (match === "MATCH")
        fail("forbidden_surface_leak", `${frame.id}:${fact.id}`);
      if (match === "UNVERIFIED") {
        fail(
          "forbidden_surface_realization_unverified",
          `${frame.id}:${fact.id}`,
        );
      }
    }
  }
  for (const mapping of context.phraseFrameMappings) {
    if (!phraseFrames.some((frame) => frame.id === mapping.canonicalId)) {
      fail("task5_chapter_mapping_without_phrase", mapping.canonicalId);
    }
  }
}

function bindingEvidenceIds(
  target: GermanPronunciationTargetDeV1,
  locale: "ru" | "uk",
): string[] {
  const applicability =
    locale === "ru" ? target.ruApplicability : target.ukApplicability;
  const ids: string[] = [];
  for (const binding of applicability.evidenceBindings) {
    if (binding.kind === "CANONICAL_BINDING") ids.push(binding.evidenceId);
    else
      ids.push(
        ...binding.supportingEvidenceBindings.map((item) => item.evidenceId),
      );
  }
  return ids;
}

function sameSet(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    [...actual]
      .sort()
      .every((value, index) => value === [...expected].sort()[index])
  );
}

function assertPronunciationClaimsCurrent(): void {
  for (const [evidenceId, expectedHash] of Object.entries(
    PRONUNCIATION_CLAIM_IDENTITIES,
  )) {
    const claim = GERMAN_RESEARCH_AUTHORITY_V1.find(
      (candidate) => candidate.id === evidenceId,
    );
    if (claim === undefined || hashCanonicalBody(claim) !== expectedHash) {
      fail("pronunciation_relevance_claim_hash_mismatch", evidenceId);
    }
  }
}

function validatePronunciationTargets(
  targets: readonly GermanPronunciationTargetDeV1[],
  context: GermanTask6RegistryAuthorityContextDeV1,
): void {
  assertPronunciationClaimsCurrent();
  const mappings = new Map(
    context.pronunciationMappings.map((row) => [row.canonicalId, row]),
  );
  const presentations = new Map(
    context.pronunciationPresentationPolicies.map((row) => [
      row.pronunciationTargetId,
      row,
    ]),
  );
  for (const target of targets) {
    const mapping = mappings.get(target.id);
    if (mapping === undefined)
      fail("canonical_pronunciation_without_task4_plan", target.id);
    const relevance =
      PRONUNCIATION_RELEVANCE[
        mapping.sourcePlanId as keyof typeof PRONUNCIATION_RELEVANCE
      ];
    if (relevance === undefined) {
      fail("pronunciation_plan_relevance_unadjudicated", mapping.sourcePlanId);
    }
    if (target.target !== relevance.target) {
      fail("pronunciation_target_semantics_mismatch", target.id);
    }
    if (
      [...target.perceptionEvidenceIds].sort().join("\u0000") ===
      [...target.productionEvidenceIds].sort().join("\u0000")
    )
      fail(
        "pronunciation_perception_production_evidence_not_distinct",
        target.id,
      );
    if (
      !sameSet(target.perceptionEvidenceIds, relevance.perceptionEvidenceIds) ||
      !sameSet(target.productionEvidenceIds, relevance.productionEvidenceIds) ||
      !sameSet(
        bindingEvidenceIds(target, "ru"),
        relevance.ruApplicabilityEvidenceIds,
      ) ||
      !sameSet(
        bindingEvidenceIds(target, "uk"),
        relevance.ukApplicabilityEvidenceIds,
      )
    )
      fail("pronunciation_evidence_irrelevant", target.id);
    if (
      target.ruApplicability.correctiveRoute ===
        target.ukApplicability.correctiveRoute &&
      target.ruApplicability.rationale === target.ukApplicability.rationale
    )
      fail("pronunciation_locale_profiles_copied", target.id);
    const presentation = presentations.get(target.id);
    if (
      presentation === undefined ||
      presentation.canonicalRegion !== relevance.canonicalRegion ||
      presentation.productionPolicy !== relevance.productionPolicy ||
      presentation.learnerLabel !== relevance.learnerLabel
    )
      fail("pronunciation_region_policy_mismatch", target.id);
  }
  for (const mapping of context.pronunciationMappings) {
    if (!targets.some((target) => target.id === mapping.canonicalId)) {
      fail("task4_mapping_without_pronunciation_target", mapping.canonicalId);
    }
  }
}

export function parseGermanTask6RegistryContractDeV1(
  input: unknown,
  context: GermanTask6RegistryAuthorityContextDeV1,
  lexicalItemEvidenceInput?: unknown,
): GermanTask6RegistryContractResultDeV1 {
  if (
    context === null ||
    typeof context !== "object" ||
    !TRUSTED_CONTEXTS.has(context)
  ) {
    fail("untrusted_authority_context");
  }
  const normalized = canonicalizeSmall(input);
  assertClosedKeys(normalized, INPUT_KEYS, "$");
  const lexicalItemEvidence =
    lexicalItemEvidenceInput === undefined
      ? undefined
      : parseGermanLexicalItemEvidenceRegistryDeV1(lexicalItemEvidenceInput);
  const lexicalSenses = parseGermanLexicalSenseRegistryDeV1(
    normalized.lexicalSenses,
    lexicalItemEvidence,
  );
  const phraseFrames = parseGermanPhraseFrameRegistryDeV1(
    normalized.phraseFrames,
  );
  const pronunciationTargets = parseGermanPronunciationTargetRegistryDeV1(
    normalized.pronunciationTargets,
  );
  const lexicalById = new Map(lexicalSenses.map((item) => [item.id, item]));
  const lexicalPlans = validateLexicalRegistry(lexicalSenses, context);
  const verifiedLexicalItemEvidenceRows = validateLexicalItemEvidence(
    lexicalSenses,
    lexicalPlans,
    lexicalItemEvidence,
  );
  validatePhraseFrames(phraseFrames, lexicalById, lexicalPlans, context);
  validatePronunciationTargets(pronunciationTargets, context);
  return deepFreeze({
    status: "TASK6_CONTRACT_KERNEL_PARTIAL",
    sourceAuthorityStatus: "CONTENT_ADDRESSED_TASK3_TASK4_TASK5",
    packetMaterializationStatus: "UNVERIFIED_UNTIL_TASK7",
    pronunciationPacketContactsStatus: "UNVERIFIED_UNTIL_TASK7",
    phraseFrameQuantityStatus: "UNVERIFIED_UNTIL_TASK7",
    nativePhraseJudgementStatus: "REQUIRED",
    patternMatcherScope: "BOUNDED_MANDATORY_AND_DECLARED_PATTERNS_ONLY",
    rowsPromoted: 0,
    verifiedLexicalItemEvidenceRows,
    registryCounts: {
      lexicalSenses: lexicalSenses.length,
      phraseFrames: phraseFrames.length,
      pronunciationTargets: pronunciationTargets.length,
    },
  });
}
