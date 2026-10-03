import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type R = Record<string, unknown>;
type Boundary = Readonly<{
  id: string;
  chapterOutcomes: readonly { id: string; outcome: string }[];
  introducedConstructIds: readonly string[];
  extendedConstructIds: readonly string[];
  reviewedConstructIds: readonly string[];
  prohibitedConstructIds: readonly string[];
  prerequisiteLessonIds: readonly string[];
  crossLessonRecall: readonly {
    fromLessonId: string;
    constructIds: readonly string[];
    responsibility: string;
  }[];
  lexicalDomains: readonly string[];
  session56Final: {
    sessionId: string;
    requiredConstructIds: readonly string[];
  };
}>;
type Grammar = Readonly<{
  id: string;
  firstIntroductionPacketId: string;
  guidedTargetPacketIds: readonly string[];
  retrievalTargetPacketIds: readonly string[];
  productionTargetPacketIds: readonly string[];
  transferTargetPacketIds: readonly string[];
  delayedTargetPacketIds: readonly string[];
}>;
const FILE = resolve(
  process.cwd(),
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
);
const LESSONS = resolve(
  process.cwd(),
  "modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json",
);
const GRAMMAR = resolve(
  process.cwd(),
  "modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json",
);
const ROOT = [
  "schemaVersion",
  "targetLanguage",
  "buildStatus",
  "topology",
  "task6LexicalReconciliation",
  "lessons",
] as const;
const CHAPTER = [
  "id",
  "ordinal",
  "lessonOutcomeId",
  "lessonOutcome",
  "packetIds",
  "allowedConstructIds",
  "prohibitedConstructIds",
  "situation",
  "supportFading",
  "lifecycleAnchors",
  "chapterEvidencePacketIds",
  "checkpoint",
  "recallSchedule",
] as const;
const L = /^de_l(\d{2})$/u,
  C = /^de_l(\d{2})_c(\d{2})$/u,
  P = /^de_l(\d{2})_c(\d{2})_s(\d{2})$/u,
  SID = /^de_lex_plan_l\d{2}_c\d{2}_[a-z0-9]+(?:_[a-z0-9]+)*_v1$/u;
const STAGES = [
  "introduction",
  "guided",
  "retrieval",
  "production",
  "transfer",
  "delayed",
] as const;
const POS = new Set([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "fixed_expression",
  "discourse_marker",
]);
const LEXICAL_KIND_BY_POS: Readonly<Record<string, string>> = Object.freeze({
  noun: "NOUN_LEXEME",
  verb: "VERB_LEXEME",
  adjective: "ADJECTIVE_LEXEME",
  adverb: "ADVERB_LEXEME",
  discourse_marker: "DISCOURSE_MARKER",
  fixed_expression: "FIXED_EXPRESSION",
});
const ARTICLES = new Set(["der", "die", "das"]);
const UTILITY_ROLES = new Set([
  "interaction_opening",
  "interaction_closing",
  "participant_reference",
  "politeness_choice",
  "scene_grounding",
  "action",
  "quality",
  "temporal_spatial",
  "discourse",
  "repair",
  "transfer",
  "mediation",
]);
const SITUATION_FACETS = new Set(["setting", "participants", "goal"]);
const NECESSITY_CLASSES = new Set([
  "OUTCOME_UNACHIEVABLE",
  "SCENE_UNGROUNDED",
  "PARTICIPANT_UNIDENTIFIABLE",
  "PRAGMATIC_CHOICE_UNAVAILABLE",
  "REPAIR_UNAVAILABLE",
  "TRANSFER_UNAVAILABLE",
]);
// Additions require an explicit reviewed curriculum-contract change.
const VERIFIED_INTRODUCTION_ACCUSATIVE_VALENCY_FRAMES = new Set([
  "transitive cancel-appointment accusative frame",
]);
function json(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}
function rec(v: unknown, at: string): asserts v is R {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error(`record_required:${at}`);
}
function keys(v: R, expect: readonly string[], at: string): void {
  for (const k of Object.keys(v))
    if (!expect.includes(k)) throw new Error(`unknown_key:${at}:${k}`);
  for (const k of expect)
    if (!Object.hasOwn(v, k)) throw new Error(`missing_key:${at}:${k}`);
}
function text(v: unknown, at: string): asserts v is string {
  if (typeof v !== "string" || !v.trim())
    throw new Error(`text_required:${at}`);
}
function array(v: unknown, at: string): asserts v is unknown[] {
  if (!Array.isArray(v)) throw new Error(`array_required:${at}`);
}
function strings(v: unknown, at: string): asserts v is string[] {
  array(v, at);
  const seen = new Set<string>();
  for (const x of v) {
    text(x, at);
    if (seen.has(x)) throw new Error(`duplicate_array_item:${at}:${x}`);
    seen.add(x);
  }
}
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
function lp(id: string, at: string): number {
  const m = L.exec(id);
  if (!m) throw new Error(`lesson_id_invalid:${at}`);
  return Number(m[1]);
}
function cp(id: string, at: string): { l: number; c: number } {
  const m = C.exec(id);
  if (!m) throw new Error(`chapter_id_invalid:${at}`);
  const x = { l: Number(m[1]), c: Number(m[2]) };
  if (x.l < 1 || x.l > 32 || x.c < 1 || x.c > 7)
    throw new Error(`chapter_range_invalid:${at}`);
  return x;
}
function pp(id: string, at: string): { l: number; c: number; s: number } {
  const m = P.exec(id);
  if (!m) throw new Error(`packet_id_invalid:${at}`);
  const x = { l: Number(m[1]), c: Number(m[2]), s: Number(m[3]) };
  if (
    x.l < 1 ||
    x.l > 32 ||
    x.c < 1 ||
    x.c > 7 ||
    x.s < 1 ||
    x.s > 56 ||
    Math.floor((x.s - 1) / 8) + 1 !== x.c
  )
    throw new Error(`packet_chapter_arithmetic_invalid:${at}:${id}`);
  return x;
}
function pid(l: number, c: number, s: number): string {
  return `de_l${String(l).padStart(2, "0")}_c${String(c).padStart(2, "0")}_s${String(s).padStart(2, "0")}`;
}
function order(x: { l: number; s: number }): number {
  return (x.l - 1) * 56 + x.s;
}
function sort(x: readonly string[]): string[] {
  return [...x].sort();
}

function sameStringSet(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return JSON.stringify(sort(actual)) === JSON.stringify(sort(expected));
}

function normalized(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function nounPackageIdentity(value: R): string {
  return [value.article, value.singular, value.plural]
    .map((item) => normalized(item as string))
    .join("|");
}

function semanticTuple(value: R): string {
  return [value.setting, value.participants, value.goal]
    .map((item) => normalized(item as string))
    .join("|");
}

function situation(v: unknown, at: string, seen: Set<string>): R {
  rec(v, at);
  keys(v, ["setting", "participants", "goal", "contextSignature"], at);
  for (const k of ["setting", "participants", "goal", "contextSignature"])
    text(v[k], `${at}.${k}`);
  const tuple = semanticTuple(v);
  if (seen.has(tuple))
    throw new Error(`duplicate_or_renamed_situation:${tuple}`);
  seen.add(tuple);
  return v;
}

function recallSourceAllowed(
  sourceLesson: number,
  sourceChapter: number,
  currentLesson: number,
  currentChapter: number,
  plan: Boundary,
): boolean {
  if (sourceLesson === currentLesson) return sourceChapter < currentChapter;
  if (sourceLesson >= currentLesson) return false;
  const sourceLessonId = `de_l${String(sourceLesson).padStart(2, "0")}`;
  return (
    plan.prerequisiteLessonIds.includes(sourceLessonId) ||
    plan.crossLessonRecall.some((row) => row.fromLessonId === sourceLessonId)
  );
}

function targetsFutureChapterIsRequired(
  lesson: number,
  chapter: number,
  probeKind: unknown,
): boolean {
  return !(
    lesson === 32 &&
    chapter === 7 &&
    probeKind === "POST_COURSE_REVIEW_OWNER"
  );
}

function verbPackageIsValid(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return false;
  const candidate = value as R;
  const expectedKeys = [
    "infinitive",
    "valencyFrame",
    "separability",
    "perfectAuxiliary",
  ];
  if (
    Object.keys(candidate).length !== expectedKeys.length ||
    expectedKeys.some((key) => !Object.hasOwn(candidate, key))
  )
    return false;
  return (
    typeof candidate.infinitive === "string" &&
    candidate.infinitive.trim().length > 0 &&
    typeof candidate.valencyFrame === "string" &&
    candidate.valencyFrame.trim().length > 0 &&
    ["separable", "inseparable", "not_applicable"].includes(
      candidate.separability as string,
    ) &&
    ["haben", "sein", "not_applicable"].includes(
      candidate.perfectAuxiliary as string,
    )
  );
}
function isCanonicalIntroductionAccusativeValencyFrame(
  value: unknown,
): boolean {
  return (
    typeof value === "string" &&
    VERIFIED_INTRODUCTION_ACCUSATIVE_VALENCY_FRAMES.has(value)
  );
}
function requiredAnchors(
  grammar: readonly Grammar[],
  lessons: Set<string>,
): Set<string> {
  const out = new Set<string>();
  for (const g of grammar)
    for (const [stage, ids] of [
      ["introduction", [g.firstIntroductionPacketId]],
      ["guided", g.guidedTargetPacketIds],
      ["retrieval", g.retrievalTargetPacketIds],
      ["production", g.productionTargetPacketIds],
      ["transfer", g.transferTargetPacketIds],
      ["delayed", g.delayedTargetPacketIds],
    ] as const)
      for (const id of ids)
        if (lessons.has(`de_l${String(pp(id, "grammar").l).padStart(2, "0")}`))
          out.add(`${g.id}|${stage}|${id}`);
  return out;
}

const L09_ROUTE_FEASIBILITY_OUTCOME =
  "express one route-feasibility possibility meaning";
const L09_ROUTE_FEASIBILITY_DOMAINS = [
  "town navigation",
  "destinations",
  "route feasibility",
  "route actions",
] as const;
const L09_MODAL_GLOSS =
  "express bounded route feasibility with a bare infinitive";
const L09_MODAL_VALENCY =
  "finite modal expressing bounded route feasibility plus a bare infinitive right bracket";
const L09_YES_NO_CONSTRUCT = "de_gc_yes_no_verberst_v1";
const L09_L5_RECALL_RESPONSIBILITY =
  "reuse the established verb-first yes-no topology to ask whether the bounded route action is feasible";
const L09_C04_SUPPORT_ENTRY =
  "exact question model Kann ich durch den Park gehen?, plus closure notice and route map";
const L09_C04_COMMUNICATIVE_USE =
  "make the closed-route problem concrete when asking Kann ich durch den Park gehen?";
const L09_INTRODUCED = [
  "de_gc_modal_finite_bare_infinitive_v1",
  "de_gc_local_preposition_governed_case_v1",
] as const;
const L09_EXTENDED = [
  "de_gc_statement_v2_v1",
  "de_gc_separable_verb_bracket_v1",
] as const;
const L09_REVIEWED = [
  "de_gc_w_element_v2_v1",
  "de_gc_frequent_accusative_frames_v1",
  "de_gc_accusative_personal_pronouns_v1",
  L09_YES_NO_CONSTRUCT,
] as const;
const L09_PROHIBITED = [
  "de_gc_temporal_preposition_governed_case_v1",
  "de_gc_dative_recipient_frames_v1",
] as const;
const L09_FINAL_REQUIRED = [
  "de_gc_modal_finite_bare_infinitive_v1",
  "de_gc_local_preposition_governed_case_v1",
  "de_gc_accusative_personal_pronouns_v1",
  "de_gc_separable_verb_bracket_v1",
] as const;
const L09_C07_PRIMARY_SITUATION = {
  setting: "night-market-arrival-route-change",
  participants: "visitor-and-night-market-kiosk-helper",
  goal: "negotiate-a-feasible-route-to-the-night-market-after-the-expected-destination-changes",
  contextSignature: "night-market-arrival-changed-destination-final-transfer",
} as const;
const L09_C07_NEW_SITUATION = {
  setting: "night-market-route-help-point",
  participants: "lost-visitor-and-market-helper",
  goal: "independently-negotiate-the-changed-night-market-route-with-all-four-established-proofs",
  contextSignature: "night-market-changed-destination-four-proof-final",
} as const;
const L09_C07_SUPPORT_ENTRY =
  "changed night-market destination card with the exact proofs Man kann durch den Park gehen. and Ich hole den Stadtplan ab. Ich hole ihn ab.";
const L09_C07_SUPPORT_EXIT =
  "independently produce kann…gehen, durch den Park, hole…ab, and den Stadtplan→ihn at the changed night-market destination";
const L09_C07_STADTPLAN_COMMUNICATIVE_USE =
  "at the changed night-market destination, independently produce Man kann durch den Park gehen. and Ich hole den Stadtplan ab. Ich hole ihn ab., explicitly proving kann…gehen, durch den Park, hole…ab, and den Stadtplan→ihn";
const L09_OPERATION_LABELS = [
  "kann…gehen",
  "durch den Park",
  "hole…ab",
  "den Stadtplan→ihn",
] as const;

function validateL09SemanticContract(raw: R, plan: Boundary): void {
  const l9 = (raw.lessons as R[]).find(
    (lesson) => lesson.lessonId === "de_l09",
  );
  if (!l9) return;
  const chapters = l9.chapters as R[];
  const l5RecallRows = plan.crossLessonRecall.filter(
    (row) => row.fromLessonId === "de_l05",
  );
  if (
    !sameStringSet(plan.introducedConstructIds, L09_INTRODUCED) ||
    !sameStringSet(plan.extendedConstructIds, L09_EXTENDED) ||
    !sameStringSet(plan.reviewedConstructIds, L09_REVIEWED) ||
    !sameStringSet(plan.prohibitedConstructIds, L09_PROHIBITED) ||
    !sameStringSet(
      plan.session56Final.requiredConstructIds,
      L09_FINAL_REQUIRED,
    ) ||
    l5RecallRows.length !== 1 ||
    !sameStringSet(l5RecallRows[0].constructIds, [L09_YES_NO_CONSTRUCT]) ||
    l5RecallRows[0].responsibility !== L09_L5_RECALL_RESPONSIBILITY
  )
    throw new Error("l09_semantic_contract_invalid:c04_yes_no_undeclared");
  if (
    plan.chapterOutcomes[1]?.outcome !== L09_ROUTE_FEASIBILITY_OUTCOME ||
    JSON.stringify(plan.lexicalDomains) !==
      JSON.stringify(L09_ROUTE_FEASIBILITY_DOMAINS) ||
    /\bability\b/iu.test(JSON.stringify({ plan, l9 }))
  )
    throw new Error("l09_semantic_contract_invalid:ability_ambiguity");

  const c1 = chapters[0];
  const c1Senses = ((c1.checkpoint as R).plannedNewLexicalSenses as R[]) ?? [];
  const modalSenses = c1Senses.filter(
    (sense) =>
      typeof sense.lemmaOrExpression === "string" &&
      normalized(sense.lemmaOrExpression) === "konnen",
  );
  const modal = modalSenses[0];
  if (
    modalSenses.length !== 1 ||
    !modal ||
    modal.semanticIdentity !== `konnen|${L09_MODAL_GLOSS}` ||
    modal.senseGloss !== L09_MODAL_GLOSS ||
    (modal.verbPackage as R | null)?.valencyFrame !== L09_MODAL_VALENCY
  )
    throw new Error("l09_semantic_contract_invalid:modal_route_feasibility");
  if (
    chapters.some((chapter) =>
      (((chapter.checkpoint as R).plannedNewLexicalSenses as R[]) ?? []).some(
        (sense) => sense.lexicalKind === "FIXED_EXPRESSION",
      ),
    )
  )
    throw new Error("l09_semantic_contract_invalid:fixed_expression_route");

  const c4 = chapters[3];
  const c4Checkpoint = c4.checkpoint as R;
  const c4BridgeSenses = (c4Checkpoint.plannedNewLexicalSenses as R[]).filter(
    (sense) => sense.id === "de_lex_plan_l09_c04_bruecke_v1",
  );
  if (
    (c4.supportFading as R).entry !== L09_C04_SUPPORT_ENTRY ||
    c4BridgeSenses.length !== 1 ||
    c4BridgeSenses[0].communicativeUse !== L09_C04_COMMUNICATIVE_USE
  )
    throw new Error("l09_semantic_contract_invalid:c04_yes_no_proof");

  const c7 = chapters[6];
  const c7Checkpoint = c7.checkpoint as R;
  const c7Situation = c7.situation as R;
  const c7NewSituation = c7Checkpoint.newSituation as R;
  const c7Support = c7.supportFading as R;
  const c7Senses = c7Checkpoint.plannedNewLexicalSenses as R[];
  const cityMapSense = c7Senses.find(
    (sense) => sense.id === "de_lex_plan_l09_c07_stadtplan_v1",
  );
  if (
    JSON.stringify(c7Situation) !== JSON.stringify(L09_C07_PRIMARY_SITUATION) ||
    JSON.stringify(c7NewSituation) !== JSON.stringify(L09_C07_NEW_SITUATION) ||
    c7Support.entry !== L09_C07_SUPPORT_ENTRY ||
    c7Support.exit !== L09_C07_SUPPORT_EXIT ||
    c7Senses.length !== 1 ||
    cityMapSense?.communicativeUse !== L09_C07_STADTPLAN_COMMUNICATIVE_USE
  )
    throw new Error(
      "l09_semantic_contract_invalid:c07_four_proof_or_destination",
    );
}

const L10_TEMPORAL = "de_gc_temporal_preposition_governed_case_v1";
const L10_DATIVE = "de_gc_dative_recipient_frames_v1";
const L10_ACCUSATIVE = "de_gc_frequent_accusative_frames_v1";
const L10_MODAL = "de_gc_modal_finite_bare_infinitive_v1";
const L10_W = "de_gc_w_element_v2_v1";
const L10_LOCAL = "de_gc_local_preposition_governed_case_v1";
const L10_INTRODUCED = [L10_TEMPORAL, L10_DATIVE] as const;
const L10_EXTENDED = [L10_ACCUSATIVE, L10_MODAL] as const;
const L10_REVIEWED = [L10_W, L10_LOCAL] as const;
const L10_PROHIBITED = [
  "de_gc_dative_location_frames_v1",
  "de_gc_dative_personal_pronouns_v1",
] as const;
const L10_FINAL_REQUIRED = [
  L10_TEMPORAL,
  L10_DATIVE,
  L10_MODAL,
  L10_LOCAL,
] as const;
const L10_ALLOWED = [
  ...L10_INTRODUCED,
  ...L10_EXTENDED,
  ...L10_REVIEWED,
] as const;
const L10_LEXICAL_IDS_BY_CHAPTER = [
  ["de_lex_plan_l10_c01_vormittag_v1", "de_lex_plan_l10_c01_helfen_v1"],
  ["de_lex_plan_l10_c02_werkbank_v1"],
  ["de_lex_plan_l10_c03_schicht_v1"],
  ["de_lex_plan_l10_c04_uebergabe_v1"],
  ["de_lex_plan_l10_c05_rollwagen_v1"],
  ["de_lex_plan_l10_c06_einsatzplan_v1"],
  ["de_lex_plan_l10_c07_flur_v1"],
] as const;
const L10_HELP_VALENCY =
  "helper-action frame selecting one explicit dative noun phrase and no accusative transferred entity";
const L10_C07_SUPPORT_EXIT =
  "independently coordinate für den Vormittag, Ich helfe dem Kollegen., and Der Rollwagen kann durch den Flur fahren., preserving the bounded interval, explicit dative noun phrase, route-feasibility modal bracket, and directional durch-plus-Akkusativ path";
function l10ChapterSurfaceText(chapter: R): string {
  const checkpoint = chapter.checkpoint as R;
  return JSON.stringify({
    situation: chapter.situation,
    supportFading: chapter.supportFading,
    newSituation: checkpoint.newSituation,
    plannedNewLexicalSenses: checkpoint.plannedNewLexicalSenses,
  });
}

function validateL10LexicalPrerequisites(chapters: R[]): void {
  const prerequisites = [
    {
      lemma: "Vormittag",
      ownerChapterId: "de_l10_c01",
      surfacePattern: /\bVormittag(?:e|en|s)?\b/iu,
    },
    {
      lemma: "helfen",
      ownerChapterId: "de_l10_c01",
      surfacePattern: /\bhelf(?:e|en|t|st)\b/iu,
    },
    {
      lemma: "Werkbank",
      ownerChapterId: "de_l10_c02",
      surfacePattern: /\bWerkb(?:ank|änke|änken)\b/iu,
    },
  ] as const;

  for (const prerequisite of prerequisites) {
    const plannedOwners = chapters.filter((chapter) =>
      (((chapter.checkpoint as R).plannedNewLexicalSenses as R[]) ?? []).some(
        (sense) =>
          normalized(String(sense.lemmaOrExpression)) ===
          normalized(prerequisite.lemma),
      ),
    );
    const expectedOwnerIndex = chapters.findIndex(
      (chapter) => chapter.id === prerequisite.ownerChapterId,
    );
    if (
      expectedOwnerIndex < 0 ||
      plannedOwners.length !== 1 ||
      plannedOwners[0].id !== prerequisite.ownerChapterId
    )
      throw new Error(
        `l10_lexical_prerequisite_invalid:${prerequisite.ownerChapterId}:${prerequisite.lemma}`,
      );

    const firstSurfaceIndex = chapters.findIndex((chapter) =>
      prerequisite.surfacePattern.test(l10ChapterSurfaceText(chapter)),
    );
    if (firstSurfaceIndex < 0 || firstSurfaceIndex < expectedOwnerIndex)
      throw new Error(
        `l10_lexical_prerequisite_invalid:${firstSurfaceIndex < 0 ? prerequisite.ownerChapterId : String(chapters[firstSurfaceIndex].id)}:${prerequisite.lemma}`,
      );
  }
}

type L10ClosedChapterContract = {
  id: string;
  situation: R;
  supportEntry: string;
  supportExit: string;
  newSituation: R;
  lexical: readonly {
    id: string;
    semanticIdentity: string;
    lemmaOrExpression: string;
    senseGloss: string;
    communicativeUse: string;
    utilityRole: string;
    situationFacet: string;
    facetValue: string;
    necessityClass: string;
  }[];
};

const L10_CLOSED_CHAPTER_CONTRACTS: readonly L10ClosedChapterContract[] = [
  {
    id: "de_l10_c01",
    situation: {
      setting: "workshop-morning-help-rota",
      participants: "shift-coordinator-and-new-colleague",
      goal: "retrieve-fuer-den-vormittag-as-one-bounded-work-interval-while-recognising-helfen-as-selecting-an-explicit-dative-recipient",
      contextSignature: "workshop-morning-help-temporal-recipient-introduction",
    },
    supportEntry:
      "colour-marked für den Vormittag and Ich helfe dem Kollegen. with the bounded morning interval, helper, and explicit recipient roles shown",
    supportExit:
      "identify den Vormittag as the interval governed by für and dem Kollegen as the explicit recipient selected by helfen without case labels",
    newSituation: {
      setting: "service-desk-morning-help-rota",
      participants: "rota-coordinator-and-service-colleague",
      goal: "retrieve-fuer-den-vormittag-as-one-bounded-work-interval-on-a-changed-rota",
      contextSignature: "service-desk-bounded-morning-help-checkpoint",
    },
    lexical: [
      {
        id: "de_lex_plan_l10_c01_vormittag_v1",
        semanticIdentity:
          "vormittag|morning period before midday used as a bounded work interval",
        lemmaOrExpression: "Vormittag",
        senseGloss:
          "morning period before midday used as a bounded work interval",
        communicativeUse:
          "realise the exact bounded temporal relation as für den Vormittag, with für governing the accusative form den Vormittag",
        utilityRole: "temporal_spatial",
        situationFacet: "goal",
        facetValue:
          "retrieve-fuer-den-vormittag-as-one-bounded-work-interval-on-a-changed-rota",
        necessityClass: "OUTCOME_UNACHIEVABLE",
      },
      {
        id: "de_lex_plan_l10_c01_helfen_v1",
        semanticIdentity:
          "helfen|support a named colleague through a frame selecting an explicit dative noun phrase",
        lemmaOrExpression: "helfen",
        senseGloss:
          "support a named colleague through a frame selecting an explicit dative noun phrase",
        communicativeUse:
          "use Ich helfe dem Kollegen. so helfen selects one explicit dative noun phrase and no accusative transferred entity in the morning help rota",
        utilityRole: "action",
        situationFacet: "setting",
        facetValue: "service-desk-morning-help-rota",
        necessityClass: "SCENE_UNGROUNDED",
      },
    ],
  },
  {
    id: "de_l10_c02",
    situation: {
      setting: "tool-checkout-counter",
      participants: "technician-and-named-colleague",
      goal: "recognise-dem-kollegen-as-the-explicit-recipient-selected-by-established-helfen-in-a-workbench-support-scene",
      contextSignature: "tool-counter-established-helfen-recipient-guided",
    },
    supportEntry:
      "whole model Ich helfe dem Kollegen. with the established helper and explicit recipient roles marked; Werkbank only grounds the repair-and-assembly scene",
    supportExit:
      "identify dem Kollegen as the explicit recipient selected by established helfen while Werkbank only grounds the scene",
    newSituation: {
      setting: "assembly-workbench-support-card",
      participants: "assembler-and-assigned-colleague",
      goal: "identify-dem-kollegen-as-the-explicit-recipient-selected-by-established-helfen-in-a-changed-workbench-support-scene",
      contextSignature: "assembly-workbench-explicit-recipient-check",
    },
    lexical: [
      {
        id: "de_lex_plan_l10_c02_werkbank_v1",
        semanticIdentity:
          "werkbank|sturdy work table used for repair and assembly",
        lemmaOrExpression: "Werkbank",
        senseGloss: "sturdy work table used for repair and assembly",
        communicativeUse:
          "ground the changed repair-and-assembly scene while Ich helfe dem Kollegen. preserves established helfen selecting dem Kollegen as its explicit recipient",
        utilityRole: "scene_grounding",
        situationFacet: "setting",
        facetValue: "assembly-workbench-support-card",
        necessityClass: "SCENE_UNGROUNDED",
      },
    ],
  },
  {
    id: "de_l10_c03",
    situation: {
      setting: "warehouse-shift-rota",
      participants: "floor-coordinator-and-shift-worker",
      goal: "state-one-bounded-shift-window-with-fuer-plus-accusative",
      contextSignature: "warehouse-shift-temporal-retrieval",
    },
    supportEntry:
      "shift card showing für den Vormittag and one explicit colleague role",
    supportExit:
      "state the bounded shift window from a changed rota without a case cue",
    newSituation: {
      setting: "customer-support-shift-board",
      participants: "team-lead-and-support-worker",
      goal: "state-the-bounded-morning-window-for-a-changed-service-shift",
      contextSignature: "support-shift-bounded-window-check",
    },
    lexical: [
      {
        id: "de_lex_plan_l10_c03_schicht_v1",
        semanticIdentity:
          "schicht|scheduled period of work assigned to a worker",
        lemmaOrExpression: "Schicht",
        senseGloss: "scheduled period of work assigned to a worker",
        communicativeUse:
          "name the work shift whose bounded morning window is stated with für den Vormittag",
        utilityRole: "scene_grounding",
        situationFacet: "goal",
        facetValue:
          "state-the-bounded-morning-window-for-a-changed-service-shift",
        necessityClass: "SCENE_UNGROUNDED",
      },
    ],
  },
  {
    id: "de_l10_c04",
    situation: {
      setting: "maintenance-handover-board",
      participants: "maintenance-coordinator-and-responsible-colleague",
      goal: "identify-the-colleague-who-receives-help-during-a-work-handover",
      contextSignature: "maintenance-handover-recipient-production",
    },
    supportEntry: "role card and complete model Ich helfe dem Kollegen.",
    supportExit:
      "identify the responsible colleague through the explicit noun phrase without role labels",
    newSituation: {
      setting: "service-team-handover-table",
      participants: "service-lead-and-relief-colleague",
      goal: "identify-a-different-colleague-as-the-recipient-of-help-during-a-service-handover",
      contextSignature: "service-handover-explicit-recipient-check",
    },
    lexical: [
      {
        id: "de_lex_plan_l10_c04_uebergabe_v1",
        semanticIdentity:
          "ubergabe|workplace handover in which responsibility is made explicit",
        lemmaOrExpression: "Übergabe",
        senseGloss:
          "workplace handover in which responsibility is made explicit",
        communicativeUse:
          "ground the handover while Ich helfe dem Kollegen. explicitly identifies the colleague through the verb-selected dative noun phrase",
        utilityRole: "scene_grounding",
        situationFacet: "setting",
        facetValue: "service-team-handover-table",
        necessityClass: "SCENE_UNGROUNDED",
      },
    ],
  },
  {
    id: "de_l10_c05",
    situation: {
      setting: "workshop-equipment-route-board",
      participants: "floor-coordinator-and-equipment-mover",
      goal: "coordinate-a-bounded-morning-recipient-and-rollwagen-path-through-the-exit",
      contextSignature: "workshop-time-recipient-corridor-combination",
    },
    supportEntry:
      "three-panel model with für den Vormittag, Ich helfe dem Kollegen., and Der Rollwagen kann durch den Ausgang fahren.",
    supportExit:
      "coordinate the bounded interval, explicit recipient noun phrase, route-feasibility modal bracket, and directional path durch den Ausgang",
    newSituation: {
      setting: "loading-bay-route-board",
      participants: "loading-lead-and-equipment-mover",
      goal: "coordinate-time-recipient-and-the-new-rollwagen-on-the-established-directional-path-through-the-exit",
      contextSignature: "loading-bay-time-recipient-rollwagen-path-check",
    },
    lexical: [
      {
        id: "de_lex_plan_l10_c05_rollwagen_v1",
        semanticIdentity:
          "rollwagen|wheeled cart used to move workplace equipment",
        lemmaOrExpression: "Rollwagen",
        senseGloss: "wheeled cart used to move workplace equipment",
        communicativeUse:
          "supply the explicit equipment subject in Der Rollwagen kann durch den Ausgang fahren., combining route feasibility with the established directional path without a human-subject ambiguity",
        utilityRole: "action",
        situationFacet: "goal",
        facetValue:
          "coordinate-time-recipient-and-the-new-rollwagen-on-the-established-directional-path-through-the-exit",
        necessityClass: "OUTCOME_UNACHIEVABLE",
      },
    ],
  },
  {
    id: "de_l10_c06",
    situation: {
      setting: "dispatch-plan-error-card",
      participants: "dispatcher-and-rota-reviewer",
      goal: "repair-a-broken-fuer-den-vormittag-form-or-the-recipient-role-in-ich-helfe-dem-kollegen",
      contextSignature: "dispatch-plan-duration-recipient-repair",
    },
    supportEntry:
      "two marked defects and complete repair choices for the bounded interval and recipient noun phrase",
    supportExit:
      "repair für den Vormittag or Ich helfe dem Kollegen. without a grammar label",
    newSituation: {
      setting: "event-staff-assignment-plan",
      participants: "event-coordinator-and-staff-reviewer",
      goal: "repair-the-bounded-window-and-explicit-recipient-on-a-changed-assignment-plan",
      contextSignature: "event-staff-duration-recipient-repair-check",
    },
    lexical: [
      {
        id: "de_lex_plan_l10_c06_einsatzplan_v1",
        semanticIdentity:
          "einsatzplan|work assignment plan listing people and time windows",
        lemmaOrExpression: "Einsatzplan",
        senseGloss: "work assignment plan listing people and time windows",
        communicativeUse:
          "ground a real repair in which the plan must show für den Vormittag and Ich helfe dem Kollegen. with the correct roles",
        utilityRole: "repair",
        situationFacet: "goal",
        facetValue:
          "repair-the-bounded-window-and-explicit-recipient-on-a-changed-assignment-plan",
        necessityClass: "REPAIR_UNAVAILABLE",
      },
    ],
  },
  {
    id: "de_l10_c07",
    situation: {
      setting: "workshop-relief-handover-change",
      participants: "relief-coordinator-and-workshop-colleague",
      goal: "coordinate-a-changed-time-recipient-and-equipment-path-for-a-different-workplace-handover",
      contextSignature: "workshop-relief-changed-handover-final-transfer",
    },
    supportEntry:
      "three-panel handover card showing für den Vormittag, Ich helfe dem Kollegen., and Der Rollwagen kann durch den Flur fahren., with time, recipient, finite modal, bare infinitive, and directional path visually separated",
    supportExit: L10_C07_SUPPORT_EXIT,
    newSituation: {
      setting: "repair-cafe-relief-handover",
      participants: "repair-cafe-coordinator-and-relief-colleague",
      goal: "independently-coordinate-changed-time-recipient-and-equipment-on-the-new-directional-path-through-the-corridor",
      contextSignature: "repair-cafe-changed-time-recipient-corridor-final",
    },
    lexical: [
      {
        id: "de_lex_plan_l10_c07_flur_v1",
        semanticIdentity: "flur|corridor used as a directional equipment path",
        lemmaOrExpression: "Flur",
        senseGloss: "corridor used as a directional equipment path",
        communicativeUse:
          "at the changed repair-cafe handover, independently use für den Vormittag for one bounded work interval, Ich helfe dem Kollegen. for an explicit dative recipient with no accusative transferred entity, and Der Rollwagen kann durch den Flur fahren. for route feasibility and the directional path durch den Flur",
        utilityRole: "transfer",
        situationFacet: "goal",
        facetValue:
          "independently-coordinate-changed-time-recipient-and-equipment-on-the-new-directional-path-through-the-corridor",
        necessityClass: "TRANSFER_UNAVAILABLE",
      },
    ],
  },
] as const;

const L10_RECALL_CONTRACTS = [
  [["de_l09_c06", "de_l09_c07"], ["de_l10_c02"]],
  [["de_l10_c01"], ["de_l10_c03"]],
  [["de_l10_c01", "de_l10_c02"], ["de_l10_c04"]],
  [["de_l10_c02", "de_l10_c03"], ["de_l10_c05"]],
  [["de_l10_c03", "de_l10_c04"], ["de_l10_c06"]],
  [["de_l10_c04", "de_l10_c05"], ["de_l10_c07"]],
  [["de_l10_c05", "de_l10_c06"], ["de_l11_c01"]],
] as const;

const L09_TO_L10_DELAYED_PACKETS = [51, 52, 53, 54, 55, 56, 55].map(
  (session, index) =>
    `de_l09_c${String(index + 1).padStart(2, "0")}->de_l10_c07_s${session}`,
);
const L10_TO_L11_DELAYED_PACKETS = [51, 52, 53, 54, 55, 56, 55].map(
  (session, index) =>
    `de_l10_c${String(index + 1).padStart(2, "0")}->de_l11_c07_s${session}`,
);

function validateL10SemanticContract(raw: R, plan: Boundary): void {
  const l10 = (raw.lessons as R[]).find(
    (lesson) => lesson.lessonId === "de_l10",
  );
  if (!l10) throw new Error("l10_semantic_contract_invalid:missing");
  const chapters = l10.chapters as R[];
  validateL10LexicalPrerequisites(chapters);
  if (
    !sameStringSet(plan.introducedConstructIds, L10_INTRODUCED) ||
    !sameStringSet(plan.extendedConstructIds, L10_EXTENDED) ||
    !sameStringSet(plan.reviewedConstructIds, L10_REVIEWED) ||
    !sameStringSet(plan.prohibitedConstructIds, L10_PROHIBITED) ||
    !sameStringSet(
      plan.session56Final.requiredConstructIds,
      L10_FINAL_REQUIRED,
    ) ||
    chapters.length !== 7
  )
    throw new Error("l10_semantic_contract_invalid:sets");

  const expectedAnchors = [
    `${L10_TEMPORAL}|introduction|de_l10_c01_s01`,
    `${L10_DATIVE}|introduction|de_l10_c01_s02`,
    `${L10_TEMPORAL}|guided|de_l10_c02_s09`,
    `${L10_DATIVE}|guided|de_l10_c02_s10`,
    `${L10_TEMPORAL}|retrieval|de_l10_c03_s17`,
    `${L10_DATIVE}|retrieval|de_l10_c03_s18`,
    `${L10_TEMPORAL}|production|de_l10_c04_s25`,
    `${L10_DATIVE}|production|de_l10_c04_s26`,
    `${L10_TEMPORAL}|transfer|de_l10_c06_s41`,
    `${L10_DATIVE}|transfer|de_l10_c06_s42`,
    `${L10_MODAL}|delayed|de_l10_c07_s49`,
    `${L10_LOCAL}|delayed|de_l10_c07_s50`,
  ];
  const actualAnchors = chapters.flatMap((chapter) =>
    ((chapter.lifecycleAnchors as R[]) ?? []).map(
      (anchor) =>
        `${String(anchor.constructId)}|${String(anchor.stage)}|${String(anchor.packetId)}`,
    ),
  );
  if (!sameStringSet(actualAnchors, expectedAnchors))
    throw new Error("l10_semantic_contract_invalid:anchors");

  const l9 = (raw.lessons as R[]).find(
    (lesson) => lesson.lessonId === "de_l09",
  );
  const l9Chapters = (l9?.chapters as R[]) ?? [];
  const l9ToL10 = l9Chapters.map((chapter, index) => {
    const packetId = ((chapter.recallSchedule as R).futureDelayedProbe as R)
      .packetId;
    return `de_l09_c${String(index + 1).padStart(2, "0")}->${String(packetId)}`;
  });
  const c7Evidence = chapters[6].chapterEvidencePacketIds as string[];
  const exactC7Evidence = [
    "de_l10_c07_s51",
    "de_l10_c07_s52",
    "de_l10_c07_s53",
    "de_l10_c07_s54",
    "de_l10_c07_s55",
    "de_l10_c07_s56",
  ];
  const l9Inverse = new Map<string, string[]>();
  for (let index = 0; index < l9Chapters.length; index += 1) {
    const packetId = String(
      (((l9Chapters[index].recallSchedule as R).futureDelayedProbe as R) ?? {})
        .packetId,
    );
    const sources = l9Inverse.get(packetId) ?? [];
    sources.push(`de_l09_c${String(index + 1).padStart(2, "0")}`);
    l9Inverse.set(packetId, sources);
  }
  const expectedL9Inverse = new Map<string, string[]>([
    ["de_l10_c07_s51", ["de_l09_c01"]],
    ["de_l10_c07_s52", ["de_l09_c02"]],
    ["de_l10_c07_s53", ["de_l09_c03"]],
    ["de_l10_c07_s54", ["de_l09_c04"]],
    ["de_l10_c07_s55", ["de_l09_c05", "de_l09_c07"]],
    ["de_l10_c07_s56", ["de_l09_c06"]],
  ]);
  if (
    JSON.stringify(l9ToL10) !== JSON.stringify(L09_TO_L10_DELAYED_PACKETS) ||
    JSON.stringify(c7Evidence) !== JSON.stringify(exactC7Evidence) ||
    JSON.stringify([...l9Inverse]) !== JSON.stringify([...expectedL9Inverse])
  )
    throw new Error("l09_l10_inverse_provenance_invalid");

  const l10ToL11 = chapters.map((chapter, index) => {
    const packetId = ((chapter.recallSchedule as R).futureDelayedProbe as R)
      .packetId;
    return `de_l10_c${String(index + 1).padStart(2, "0")}->${String(packetId)}`;
  });
  const l10Inverse = new Map<string, string[]>();
  for (let index = 0; index < chapters.length; index += 1) {
    const packetId = String(
      (((chapters[index].recallSchedule as R).futureDelayedProbe as R) ?? {})
        .packetId,
    );
    const sources = l10Inverse.get(packetId) ?? [];
    sources.push(`de_l10_c${String(index + 1).padStart(2, "0")}`);
    l10Inverse.set(packetId, sources);
  }
  const expectedL10Inverse = new Map<string, string[]>([
    ["de_l11_c07_s51", ["de_l10_c01"]],
    ["de_l11_c07_s52", ["de_l10_c02"]],
    ["de_l11_c07_s53", ["de_l10_c03"]],
    ["de_l11_c07_s54", ["de_l10_c04"]],
    ["de_l11_c07_s55", ["de_l10_c05", "de_l10_c07"]],
    ["de_l11_c07_s56", ["de_l10_c06"]],
  ]);
  if (
    JSON.stringify(l10ToL11) !== JSON.stringify(L10_TO_L11_DELAYED_PACKETS) ||
    JSON.stringify([...l10Inverse]) !== JSON.stringify([...expectedL10Inverse])
  )
    throw new Error("l10_l11_inverse_provenance_invalid");

  for (let index = 0; index < chapters.length; index += 1) {
    const chapter = chapters[index];
    const expectedConstructs = index === 6 ? L10_FINAL_REQUIRED : L10_ALLOWED;
    const senses =
      ((chapter.checkpoint as R).plannedNewLexicalSenses as R[]) ?? [];
    if (
      !sameStringSet(
        chapter.allowedConstructIds as string[],
        expectedConstructs,
      ) ||
      !sameStringSet(
        (chapter.checkpoint as R).integratedConstructIds as string[],
        expectedConstructs,
      ) ||
      JSON.stringify(senses.map((sense) => sense.id)) !==
        JSON.stringify(L10_LEXICAL_IDS_BY_CHAPTER[index]) ||
      senses.some((sense) => sense.lexicalKind === "FIXED_EXPRESSION")
    )
      throw new Error("l10_semantic_contract_invalid:chapter_contract");
  }

  const expectedNouns = new Map<string, readonly string[]>([
    [
      "de_lex_plan_l10_c01_vormittag_v1",
      ["der", "Vormittag", "Vormittage", "der|vormittag|vormittage"],
    ],
    [
      "de_lex_plan_l10_c02_werkbank_v1",
      ["die", "Werkbank", "Werkbänke", "die|werkbank|werkbanke"],
    ],
    [
      "de_lex_plan_l10_c03_schicht_v1",
      ["die", "Schicht", "Schichten", "die|schicht|schichten"],
    ],
    [
      "de_lex_plan_l10_c04_uebergabe_v1",
      ["die", "Übergabe", "Übergaben", "die|ubergabe|ubergaben"],
    ],
    [
      "de_lex_plan_l10_c05_rollwagen_v1",
      ["der", "Rollwagen", "Rollwagen", "der|rollwagen|rollwagen"],
    ],
    [
      "de_lex_plan_l10_c06_einsatzplan_v1",
      ["der", "Einsatzplan", "Einsatzpläne", "der|einsatzplan|einsatzplane"],
    ],
    ["de_lex_plan_l10_c07_flur_v1", ["der", "Flur", "Flure", "der|flur|flure"]],
  ]);
  const l10Senses = chapters.flatMap(
    (chapter) =>
      ((chapter.checkpoint as R).plannedNewLexicalSenses as R[]) ?? [],
  );
  for (const [senseId, expected] of expectedNouns) {
    const sense = l10Senses.find((candidate) => candidate.id === senseId) as R;
    const noun = sense.nounPackage as R | null;
    if (
      sense.lexicalKind !== "NOUN_LEXEME" ||
      sense.lemmaOrExpression !== expected[1] ||
      noun?.article !== expected[0] ||
      noun?.singular !== expected[1] ||
      noun?.plural !== expected[2] ||
      sense.nounPackageIdentity !== expected[3] ||
      sense.verbPackage !== null
    )
      throw new Error("l10_semantic_contract_invalid:lexical_packages");
  }

  for (let index = 0; index < chapters.length; index += 1) {
    const chapter = chapters[index];
    const checkpoint = chapter.checkpoint as R;
    const senses = checkpoint.plannedNewLexicalSenses as R[];
    const expected = L10_CLOSED_CHAPTER_CONTRACTS[index];
    const actual: L10ClosedChapterContract = {
      id: String(chapter.id),
      situation: chapter.situation as R,
      supportEntry: String((chapter.supportFading as R).entry),
      supportExit: String((chapter.supportFading as R).exit),
      newSituation: checkpoint.newSituation as R,
      lexical: senses.map((sense) => {
        const utility = sense.utilityProof as R;
        return {
          id: String(sense.id),
          semanticIdentity: String(sense.semanticIdentity),
          lemmaOrExpression: String(sense.lemmaOrExpression),
          senseGloss: String(sense.senseGloss),
          communicativeUse: String(sense.communicativeUse),
          utilityRole: String(utility.utilityRole),
          situationFacet: String(utility.situationFacet),
          facetValue: String(utility.facetValue),
          necessityClass: String(utility.necessityClass),
        };
      }),
    };
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(
        `l10_semantic_contract_invalid:closed_chapter:${expected.id}`,
      );

    const recall = chapter.recallSchedule as R;
    const [expectedFrom, expectedTo] = L10_RECALL_CONTRACTS[index];
    if (
      JSON.stringify(recall.retrievesFromChapterIds) !==
        JSON.stringify(expectedFrom) ||
      JSON.stringify(recall.targetsFutureChapterIds) !==
        JSON.stringify(expectedTo)
    )
      throw new Error(`l10_recall_contract_invalid:${expected.id}`);
  }

  const c1Senses =
    ((chapters[0].checkpoint as R).plannedNewLexicalSenses as R[]) ?? [];
  const c1Vormittag = c1Senses.find(
    (sense) => sense.id === "de_lex_plan_l10_c01_vormittag_v1",
  ) as R;
  if (
    c1Vormittag.lemmaOrExpression !== "Vormittag" ||
    (c1Vormittag.nounPackage as R | null)?.article !== "der" ||
    !String(c1Vormittag.communicativeUse).includes("für den Vormittag") ||
    !String((chapters[0].supportFading as R).entry).includes(
      "für den Vormittag",
    ) ||
    String(c1Vormittag.lemmaOrExpression).includes("für")
  )
    throw new Error(
      "l10_semantic_contract_invalid:temporal_bounded_accusative",
    );

  const help = c1Senses.find(
    (sense) => sense.id === "de_lex_plan_l10_c01_helfen_v1",
  ) as R;
  const helpPackage = help.verbPackage as R | null;
  if (
    help.lemmaOrExpression !== "helfen" ||
    help.lexicalKind !== "VERB_LEXEME" ||
    helpPackage?.infinitive !== "helfen" ||
    helpPackage?.valencyFrame !== L10_HELP_VALENCY ||
    helpPackage?.separability !== "inseparable" ||
    helpPackage?.perfectAuxiliary !== "haben" ||
    !String(help.communicativeUse).includes("Ich helfe dem Kollegen.")
  )
    throw new Error("l10_semantic_contract_invalid:helfen_dative_np");

  const c7 = chapters[6];
  const c7Checkpoint = c7.checkpoint as R;
  const c7Sense = (c7Checkpoint.plannedNewLexicalSenses as R[])[0];
  if (
    !sameStringSet(c7.allowedConstructIds as string[], L10_FINAL_REQUIRED) ||
    !sameStringSet(
      c7Checkpoint.integratedConstructIds as string[],
      L10_FINAL_REQUIRED,
    ) ||
    (c7.supportFading as R).exit !== L10_C07_SUPPORT_EXIT ||
    c7Sense.communicativeUse !==
      L10_CLOSED_CHAPTER_CONTRACTS[6].lexical[0].communicativeUse
  )
    throw new Error("l10_semantic_contract_invalid:c07_transfer_or_provenance");
}

const L11_LOCATION = "de_gc_dative_location_frames_v1";
const L11_DATIVE_PRONOUN = "de_gc_dative_personal_pronouns_v1";
const L11_RECIPIENT = "de_gc_dative_recipient_frames_v1";
const L11_REFERENCE = "de_gc_pronoun_reference_chain_v1";
const L11_LOCAL = "de_gc_local_preposition_governed_case_v1";
const L11_TEMPORAL = "de_gc_temporal_preposition_governed_case_v1";
const L11_INTRODUCED = [L11_LOCATION, L11_DATIVE_PRONOUN] as const;
const L11_EXTENDED = [L11_RECIPIENT, L11_REFERENCE] as const;
const L11_REVIEWED = [L11_LOCAL, L11_TEMPORAL] as const;
const L11_PROHIBITED = [
  "de_gc_two_object_case_contrast_v1",
  "de_gc_wechselpreposition_relation_contrast_v1",
] as const;
const L11_ALLOWED = [
  ...L11_INTRODUCED,
  ...L11_EXTENDED,
  ...L11_REVIEWED,
] as const;
const L11_FINAL_REQUIRED = [
  L11_LOCATION,
  L11_DATIVE_PRONOUN,
  L11_TEMPORAL,
  L11_RECIPIENT,
] as const;
const L11_HELP_VALENCY =
  "helper-action frame selecting one explicit dative noun phrase and no accusative transferred entity";
const L11_PRONOUN_CHAIN = "Ich helfe dem Besucher. Ich helfe ihm.";
const L11_C01_GUARDIAN_LOCATION_MODEL = "Die Garderobe ist beim Ausgang.";
const L11_C06_WRONG_LOCATION_MODEL = "Der Lageplan ist bei den Infostand.";
const L11_C06_CORRECT_LOCATION_MODEL = "Der Lageplan ist beim Infostand.";
const L11_C07_FINAL_LOCATION_TIME_MODEL =
  "Für den Vormittag ist die Servicestelle beim Eingang.";
const L11_NO_EXPANSION =
  "Keep only the exact static-proximity relation bei plus Dativ and the adjacent Ich helfe dem Besucher. Ich helfe ihm. chain inside the established helfen frame; do not expand beyond the approved lesson and final construct sets.";
const L11_LEXICAL_IDS_BY_CHAPTER = [
  ["de_lex_plan_l11_c01_garderobe_v1", "de_lex_plan_l11_c01_besucher_v1"],
  ["de_lex_plan_l11_c02_infostand_v1"],
  ["de_lex_plan_l11_c03_toilette_v1"],
  ["de_lex_plan_l11_c04_treffpunkt_v1"],
  ["de_lex_plan_l11_c05_sanitaetsraum_v1"],
  ["de_lex_plan_l11_c06_lageplan_v1"],
  ["de_lex_plan_l11_c07_servicestelle_v1"],
] as const;
const L11_SUPPORT_LEVELS = [
  [5, 2],
  [5, 2],
  [4, 1],
  [4, 1],
  [3, 1],
  [3, 1],
  [2, 0],
] as const;
const L11_EVIDENCE_BY_CHAPTER = [
  ["de_l11_c01_s03", "de_l11_c01_s04"],
  ["de_l11_c02_s11", "de_l11_c02_s12"],
  ["de_l11_c03_s19", "de_l11_c03_s20"],
  ["de_l11_c04_s27", "de_l11_c04_s28"],
  ["de_l11_c05_s35", "de_l11_c05_s36"],
  ["de_l11_c06_s43", "de_l11_c06_s44"],
  [
    "de_l11_c07_s51",
    "de_l11_c07_s52",
    "de_l11_c07_s53",
    "de_l11_c07_s54",
    "de_l11_c07_s55",
    "de_l11_c07_s56",
  ],
] as const;
const L11_RECALL_CONTRACTS = [
  [["de_l10_c06", "de_l10_c07"], ["de_l11_c02"]],
  [["de_l11_c01"], ["de_l11_c03"]],
  [["de_l11_c01", "de_l11_c02"], ["de_l11_c04"]],
  [["de_l11_c02", "de_l11_c03"], ["de_l11_c05"]],
  [["de_l11_c03", "de_l11_c04"], ["de_l11_c06"]],
  [["de_l11_c04", "de_l11_c05"], ["de_l11_c07"]],
  [["de_l11_c05", "de_l11_c06"], ["de_l12_c01"]],
] as const;
const L11_TO_L12_DELAYED_PACKETS = [51, 52, 53, 54, 55, 56, 55].map(
  (session, index) =>
    `de_l11_c${String(index + 1).padStart(2, "0")}->de_l12_c07_s${session}`,
);

type L11ClosedChapterContract = {
  id: string;
  situation: R;
  supportEntry: string;
  supportExit: string;
  newSituation: R;
  lexical: readonly {
    id: string;
    semanticIdentity: string;
    lemmaOrExpression: string;
    senseGloss: string;
    communicativeUse: string;
    utilityRole: string;
    situationFacet: string;
    facetValue: string;
    necessityClass: string;
  }[];
};

const L11_CLOSED_CHAPTER_CONTRACTS: readonly L11ClosedChapterContract[] = [
  {
    id: "de_l11_c01",
    situation: {
      setting: "event-venue-exit-orientation",
      participants: "venue-guide-and-new-visitor",
      goal: "retrieve-the-static-proximity-of-the-garderobe-at-the-ausgang-and-establish-one-dative-participant-reference-chain",
      contextSignature: "event-exit-bei-dative-pronoun-introduction",
    },
    supportEntry: `venue map and role cards showing ${L11_C01_GUARDIAN_LOCATION_MODEL} and the adjacent chain ${L11_PRONOUN_CHAIN}, with beim, dem Besucher, and ihm colour-marked`,
    supportExit:
      "locate die Garderobe through beim Ausgang and replace the adjacent dative antecedent dem Besucher only with ihm inside the established helfen frame",
    newSituation: {
      setting: "community-fair-exit-help-point",
      participants: "fair-guide-and-arriving-visitor",
      goal: "retrieve-beim-ausgang-for-the-garderobe-and-preserve-the-adjacent-besucher-to-ihm-chain",
      contextSignature: "community-fair-static-location-reference-check",
    },
    lexical: [
      {
        id: "de_lex_plan_l11_c01_garderobe_v1",
        semanticIdentity:
          "garderobe|staffed cloakroom facility near a venue exit",
        lemmaOrExpression: "Garderobe",
        senseGloss: "staffed cloakroom facility near a venue exit",
        communicativeUse: `use ${L11_C01_GUARDIAN_LOCATION_MODEL} to realise the one named stable-proximity relation bei plus Dativ`,
        utilityRole: "temporal_spatial",
        situationFacet: "goal",
        facetValue:
          "retrieve-beim-ausgang-for-the-garderobe-and-preserve-the-adjacent-besucher-to-ihm-chain",
        necessityClass: "OUTCOME_UNACHIEVABLE",
      },
      {
        id: "de_lex_plan_l11_c01_besucher_v1",
        semanticIdentity: "besucher|visitor receiving help at a public venue",
        lemmaOrExpression: "Besucher",
        senseGloss: "visitor receiving help at a public venue",
        communicativeUse: `establish the explicit dative antecedent in ${L11_PRONOUN_CHAIN}`,
        utilityRole: "participant_reference",
        situationFacet: "participants",
        facetValue: "fair-guide-and-arriving-visitor",
        necessityClass: "PARTICIPANT_UNIDENTIFIABLE",
      },
    ],
  },
  {
    id: "de_l11_c02",
    situation: {
      setting: "festival-information-zone",
      participants: "information-guide-and-returning-visitor",
      goal: "guide-the-static-infostand-location-and-substitute-ihm-only-after-the-known-dative-visitor",
      contextSignature: "infostand-bei-location-dative-pronoun-guided",
    },
    supportEntry: `whole models Der Infostand ist bei der Garderobe. and ${L11_PRONOUN_CHAIN}, with the location complement, antecedent, and pronoun roles marked`,
    supportExit:
      "identify bei der Garderobe as static proximity and ihm as the adjacent reference to dem Besucher inside the established helfen frame",
    newSituation: {
      setting: "conference-information-corner",
      participants: "conference-guide-and-lost-visitor",
      goal: "guide-the-infostand-location-and-maintain-the-visitor-reference-with-ihm",
      contextSignature: "conference-infostand-guided-reference-check",
    },
    lexical: [
      {
        id: "de_lex_plan_l11_c02_infostand_v1",
        semanticIdentity:
          "infostand|staffed information stand inside a public event venue",
        lemmaOrExpression: "Infostand",
        senseGloss: "staffed information stand inside a public event venue",
        communicativeUse: `ground the changed information scene while Der Infostand ist bei der Garderobe. and ${L11_PRONOUN_CHAIN} preserve the verified frames`,
        utilityRole: "scene_grounding",
        situationFacet: "setting",
        facetValue: "conference-information-corner",
        necessityClass: "SCENE_UNGROUNDED",
      },
    ],
  },
  {
    id: "de_l11_c03",
    situation: {
      setting: "exhibition-facility-map",
      participants: "floor-guide-and-visitor-group",
      goal: "locate-the-toilette-by-static-proximity-and-retrieve-the-adjacent-dative-reference-chain",
      contextSignature: "toilette-static-location-pronoun-retrieval",
    },
    supportEntry: `partial venue map plus Die Toilette ist beim Infostand. and ${L11_PRONOUN_CHAIN}, without case labels`,
    supportExit:
      "independently locate die Toilette with beim Infostand and preserve dem Besucher to ihm across the adjacent helfen utterances",
    newSituation: {
      setting: "book-fair-facility-map",
      participants: "book-fair-guide-and-one-visitor",
      goal: "locate-the-toilette-near-the-infostand-and-retrieve-the-known-dative-pronoun-chain",
      contextSignature: "book-fair-toilette-retrieval-check",
    },
    lexical: [
      {
        id: "de_lex_plan_l11_c03_toilette_v1",
        semanticIdentity:
          "toilette|public toilet facility identified on a venue map",
        lemmaOrExpression: "Toilette",
        senseGloss: "public toilet facility identified on a venue map",
        communicativeUse:
          "use Die Toilette ist beim Infostand. to retrieve the exact stable-proximity relation in a changed venue map",
        utilityRole: "temporal_spatial",
        situationFacet: "goal",
        facetValue:
          "locate-the-toilette-near-the-infostand-and-retrieve-the-known-dative-pronoun-chain",
        necessityClass: "OUTCOME_UNACHIEVABLE",
      },
    ],
  },
  {
    id: "de_l11_c04",
    situation: {
      setting: "volunteer-meeting-point-desk",
      participants: "volunteer-coordinator-and-venue-visitor",
      goal: "relay-the-treffpunkt-location-and-who-receives-help-without-losing-dative-reference",
      contextSignature: "treffpunkt-location-recipient-production",
    },
    supportEntry: `small desk map with Der Treffpunkt ist bei der Toilette. and ${L11_PRONOUN_CHAIN}; only the two referents remain highlighted`,
    supportExit:
      "produce the Treffpunkt location and the exact adjacent dem Besucher to ihm chain independently inside the established helfen frame",
    newSituation: {
      setting: "museum-volunteer-meeting-point",
      participants: "museum-coordinator-and-arriving-visitor",
      goal: "relay-the-changed-treffpunkt-location-and-preserve-the-help-recipient-reference",
      contextSignature: "museum-treffpunkt-reference-production-check",
    },
    lexical: [
      {
        id: "de_lex_plan_l11_c04_treffpunkt_v1",
        semanticIdentity:
          "treffpunkt|designated meeting point inside a public venue",
        lemmaOrExpression: "Treffpunkt",
        senseGloss: "designated meeting point inside a public venue",
        communicativeUse: `ground a real relay in which Der Treffpunkt ist bei der Toilette. and ${L11_PRONOUN_CHAIN} identify both place and help recipient`,
        utilityRole: "scene_grounding",
        situationFacet: "setting",
        facetValue: "museum-volunteer-meeting-point",
        necessityClass: "SCENE_UNGROUNDED",
      },
    ],
  },
  {
    id: "de_l11_c05",
    situation: {
      setting: "community-event-first-aid-orientation",
      participants: "venue-host-and-help-volunteer",
      goal: "distinguish-the-bei-location-complement-from-the-helfen-recipient-and-its-pronoun-reference",
      contextSignature: "sanitaetsraum-location-recipient-function-contrast",
    },
    supportEntry: `contrast card: Der Sanitätsraum ist beim Treffpunkt. marks a location relation; ${L11_PRONOUN_CHAIN} marks a verb-selected recipient and its adjacent reference`,
    supportExit:
      "distinguish beim Treffpunkt as the static-location complement from dem Besucher and ihm as the recipient chain selected by helfen",
    newSituation: {
      setting: "sports-hall-first-aid-point",
      participants: "hall-host-and-visitor-supporter",
      goal: "contrast-the-sanitaetsraum-location-with-the-known-help-recipient-chain",
      contextSignature: "sports-hall-dative-function-contrast-check",
    },
    lexical: [
      {
        id: "de_lex_plan_l11_c05_sanitaetsraum_v1",
        semanticIdentity: "sanitatsraum|first aid room at a public event venue",
        lemmaOrExpression: "Sanitätsraum",
        senseGloss: "first-aid room at a public event venue",
        communicativeUse: `contrast Der Sanitätsraum ist beim Treffpunkt. as static location with ${L11_PRONOUN_CHAIN} as recipient reference`,
        utilityRole: "mediation",
        situationFacet: "goal",
        facetValue:
          "contrast-the-sanitaetsraum-location-with-the-known-help-recipient-chain",
        necessityClass: "OUTCOME_UNACHIEVABLE",
      },
    ],
  },
  {
    id: "de_l11_c06",
    situation: {
      setting: "venue-map-correction-desk",
      participants: "map-editor-and-information-volunteer",
      goal: "repair-the-lageplan-static-location-form-and-restore-the-explicit-adjacent-antecedent-before-ihm",
      contextSignature: "lageplan-governed-case-reference-repair",
    },
    supportEntry: `repair card with incorrect ${L11_C06_WRONG_LOCATION_MODEL} and unsupported Ich helfe ihm.; require ${L11_C06_CORRECT_LOCATION_MODEL} and the adjacent chain ${L11_PRONOUN_CHAIN}`,
    supportExit: `repair the marked location from “${L11_C06_WRONG_LOCATION_MODEL}” to “${L11_C06_CORRECT_LOCATION_MODEL}”; then restore Ich helfe dem Besucher. immediately before Ich helfe ihm.`,
    newSituation: {
      setting: "town-hall-event-map-update",
      participants: "map-coordinator-and-service-volunteer",
      goal: "repair-the-lageplan-location-case-and-restore-the-explicit-visitor-antecedent-before-ihm",
      contextSignature: "town-hall-lageplan-repair-check",
    },
    lexical: [
      {
        id: "de_lex_plan_l11_c06_lageplan_v1",
        semanticIdentity:
          "lageplan|venue map used to verify facilities and help points",
        lemmaOrExpression: "Lageplan",
        senseGloss: "venue map used to verify facilities and help points",
        communicativeUse: `ground the repair in which the location model “${L11_C06_CORRECT_LOCATION_MODEL}” is restored and Ich helfe dem Besucher. is placed immediately before Ich helfe ihm.`,
        utilityRole: "repair",
        situationFacet: "goal",
        facetValue:
          "repair-the-lageplan-location-case-and-restore-the-explicit-visitor-antecedent-before-ihm",
        necessityClass: "REPAIR_UNAVAILABLE",
      },
    ],
  },
  {
    id: "de_l11_c07",
    situation: {
      setting: "public-library-service-orientation-change",
      participants: "library-guide-and-new-visitor",
      goal: "transfer-static-location-time-recipient-and-dative-reference-to-a-different-public-venue",
      contextSignature: "library-servicestelle-changed-venue-final-transfer",
    },
    supportEntry: `minimal changed-venue card with ${L11_C07_FINAL_LOCATION_TIME_MODEL} and the adjacent chain ${L11_PRONOUN_CHAIN}`,
    supportExit: `independently produce ${L11_C07_FINAL_LOCATION_TIME_MODEL} and the exact adjacent chain ${L11_PRONOUN_CHAIN}`,
    newSituation: {
      setting: "civic-centre-service-orientation",
      participants: "civic-centre-guide-and-arriving-visitor",
      goal: "independently-guide-the-servicestelle-location-and-relay-time-recipient-and-pronoun-reference",
      contextSignature: "civic-centre-location-reference-final",
    },
    lexical: [
      {
        id: "de_lex_plan_l11_c07_servicestelle_v1",
        semanticIdentity:
          "servicestelle|staffed service point in a public venue",
        lemmaOrExpression: "Servicestelle",
        senseGloss: "staffed service point in a public venue",
        communicativeUse: `at the changed civic-centre venue, independently use ${L11_C07_FINAL_LOCATION_TIME_MODEL} and ${L11_PRONOUN_CHAIN} to prove location, time, recipient, and dative reference`,
        utilityRole: "transfer",
        situationFacet: "goal",
        facetValue:
          "independently-guide-the-servicestelle-location-and-relay-time-recipient-and-pronoun-reference",
        necessityClass: "TRANSFER_UNAVAILABLE",
      },
    ],
  },
] as const;

function l11ChapterSurfaceText(chapter: R): string {
  const checkpoint = chapter.checkpoint as R;
  return JSON.stringify({
    situation: chapter.situation,
    supportFading: chapter.supportFading,
    newSituation: checkpoint.newSituation,
    plannedNewLexicalSenses: checkpoint.plannedNewLexicalSenses,
  });
}

function validateL11LexicalPrerequisites(chapters: R[]): void {
  const prerequisites = [
    ["Garderobe", "de_l11_c01", /\bGarderob(?:e|en)\b/iu],
    ["Besucher", "de_l11_c01", /\bBesucher(?:s|n)?\b/iu],
    ["Infostand", "de_l11_c02", /\bInfost(?:and|ände|änden)\b/iu],
    ["Toilette", "de_l11_c03", /\bToilett(?:e|en)\b/iu],
    ["Treffpunkt", "de_l11_c04", /\bTreffpunkt(?:e|en|s)?\b/iu],
    ["Sanitätsraum", "de_l11_c05", /\bSanitätsr(?:aum|äume|äumen)\b/iu],
    ["Lageplan", "de_l11_c06", /\bLagepl(?:an|äne|änen)\b/iu],
    ["Servicestelle", "de_l11_c07", /\bServicestell(?:e|en)\b/iu],
  ] as const;
  for (const [lemma, owner, pattern] of prerequisites) {
    const owners = chapters.filter((chapter) =>
      (((chapter.checkpoint as R).plannedNewLexicalSenses as R[]) ?? []).some(
        (sense) =>
          normalized(String(sense.lemmaOrExpression)) === normalized(lemma),
      ),
    );
    const ownerIndex = chapters.findIndex((chapter) => chapter.id === owner);
    if (ownerIndex < 0 || owners.length !== 1 || owners[0].id !== owner)
      throw new Error(`l11_lexical_prerequisite_invalid:${owner}:${lemma}`);
    const firstSurfaceIndex = chapters.findIndex((chapter) =>
      pattern.test(l11ChapterSurfaceText(chapter)),
    );
    if (firstSurfaceIndex < 0 || firstSurfaceIndex < ownerIndex)
      throw new Error(
        `l11_lexical_prerequisite_invalid:${firstSurfaceIndex < 0 ? owner : String(chapters[firstSurfaceIndex].id)}:${lemma}`,
      );
  }
}

function validateL11SemanticContract(raw: R, plan: Boundary): void {
  const l11 = (raw.lessons as R[]).find(
    (lesson) => lesson.lessonId === "de_l11",
  );
  if (!l11) throw new Error("l11_semantic_contract_invalid:missing");
  const chapters = l11.chapters as R[];
  if ((l11.grammarBoundary as R).noExpansion !== L11_NO_EXPANSION)
    throw new Error("l11_semantic_contract_invalid:no_expansion");
  validateL11LexicalPrerequisites(chapters);
  if (
    !sameStringSet(plan.introducedConstructIds, L11_INTRODUCED) ||
    !sameStringSet(plan.extendedConstructIds, L11_EXTENDED) ||
    !sameStringSet(plan.reviewedConstructIds, L11_REVIEWED) ||
    !sameStringSet(plan.prohibitedConstructIds, L11_PROHIBITED) ||
    !sameStringSet(
      plan.session56Final.requiredConstructIds,
      L11_FINAL_REQUIRED,
    ) ||
    chapters.length !== 7
  )
    throw new Error("l11_semantic_contract_invalid:sets");

  const expectedAnchors = [
    `${L11_LOCATION}|introduction|de_l11_c01_s01`,
    `${L11_DATIVE_PRONOUN}|introduction|de_l11_c01_s02`,
    `${L11_LOCATION}|guided|de_l11_c02_s09`,
    `${L11_DATIVE_PRONOUN}|guided|de_l11_c02_s10`,
    `${L11_LOCATION}|retrieval|de_l11_c03_s17`,
    `${L11_DATIVE_PRONOUN}|retrieval|de_l11_c03_s18`,
    `${L11_LOCATION}|production|de_l11_c04_s25`,
    `${L11_DATIVE_PRONOUN}|production|de_l11_c04_s26`,
    `${L11_LOCATION}|transfer|de_l11_c06_s41`,
    `${L11_DATIVE_PRONOUN}|transfer|de_l11_c06_s42`,
    `${L11_TEMPORAL}|delayed|de_l11_c07_s49`,
    `${L11_RECIPIENT}|delayed|de_l11_c07_s50`,
  ];
  const actualAnchors = chapters.flatMap((chapter) =>
    ((chapter.lifecycleAnchors as R[]) ?? []).map(
      (anchor) =>
        `${String(anchor.constructId)}|${String(anchor.stage)}|${String(anchor.packetId)}`,
    ),
  );
  if (!sameStringSet(actualAnchors, expectedAnchors))
    throw new Error("l11_semantic_contract_invalid:anchors");

  const l10 = (raw.lessons as R[]).find(
    (lesson) => lesson.lessonId === "de_l10",
  ) as R;
  const l10Chapters = l10.chapters as R[];
  const incoming = l10Chapters.map(
    (chapter, index) =>
      `de_l10_c${String(index + 1).padStart(2, "0")}->${String(((chapter.recallSchedule as R).futureDelayedProbe as R).packetId)}`,
  );
  const expectedIncoming = [51, 52, 53, 54, 55, 56, 55].map(
    (session, index) =>
      `de_l10_c${String(index + 1).padStart(2, "0")}->de_l11_c07_s${session}`,
  );
  const c7Evidence = chapters[6].chapterEvidencePacketIds as string[];
  const exactC7Evidence = [51, 52, 53, 54, 55, 56].map(
    (session) => `de_l11_c07_s${session}`,
  );
  const incomingInverse = new Map<string, string[]>();
  for (let index = 0; index < l10Chapters.length; index += 1) {
    const packetId = String(
      ((l10Chapters[index].recallSchedule as R).futureDelayedProbe as R)
        .packetId,
    );
    const sources = incomingInverse.get(packetId) ?? [];
    sources.push(`de_l10_c${String(index + 1).padStart(2, "0")}`);
    incomingInverse.set(packetId, sources);
  }
  const expectedIncomingInverse = new Map<string, string[]>([
    ["de_l11_c07_s51", ["de_l10_c01"]],
    ["de_l11_c07_s52", ["de_l10_c02"]],
    ["de_l11_c07_s53", ["de_l10_c03"]],
    ["de_l11_c07_s54", ["de_l10_c04"]],
    ["de_l11_c07_s55", ["de_l10_c05", "de_l10_c07"]],
    ["de_l11_c07_s56", ["de_l10_c06"]],
  ]);
  if (
    JSON.stringify(incoming) !== JSON.stringify(expectedIncoming) ||
    JSON.stringify(c7Evidence) !== JSON.stringify(exactC7Evidence) ||
    JSON.stringify([...incomingInverse]) !==
      JSON.stringify([...expectedIncomingInverse])
  )
    throw new Error("l10_l11_inverse_provenance_invalid");

  const outgoing = chapters.map(
    (chapter, index) =>
      `de_l11_c${String(index + 1).padStart(2, "0")}->${String(((chapter.recallSchedule as R).futureDelayedProbe as R).packetId)}`,
  );
  const outgoingInverse = new Map<string, string[]>();
  for (let index = 0; index < chapters.length; index += 1) {
    const packetId = String(
      ((chapters[index].recallSchedule as R).futureDelayedProbe as R).packetId,
    );
    const sources = outgoingInverse.get(packetId) ?? [];
    sources.push(`de_l11_c${String(index + 1).padStart(2, "0")}`);
    outgoingInverse.set(packetId, sources);
  }
  const expectedOutgoingInverse = new Map<string, string[]>([
    ["de_l12_c07_s51", ["de_l11_c01"]],
    ["de_l12_c07_s52", ["de_l11_c02"]],
    ["de_l12_c07_s53", ["de_l11_c03"]],
    ["de_l12_c07_s54", ["de_l11_c04"]],
    ["de_l12_c07_s55", ["de_l11_c05", "de_l11_c07"]],
    ["de_l12_c07_s56", ["de_l11_c06"]],
  ]);
  if (
    JSON.stringify(outgoing) !== JSON.stringify(L11_TO_L12_DELAYED_PACKETS) ||
    JSON.stringify([...outgoingInverse]) !==
      JSON.stringify([...expectedOutgoingInverse])
  )
    throw new Error("l11_l12_inverse_provenance_invalid");

  const allText = chapters.map(l11ChapterSurfaceText).join("\n");
  if (
    /\b(?:in|an|auf|neben)\s+(?:dem|der|den|die|das|einem|einer|einen)\b/iu.test(
      allText,
    ) ||
    /\b(?:Wechselpräposition|movement|motion|destination)\b/iu.test(allText)
  )
    throw new Error("l11_semantic_contract_invalid:dative_location_bei");

  const l10Help = (
    ((l10Chapters[0].checkpoint as R).plannedNewLexicalSenses as R[]) ?? []
  ).find((sense) => sense.id === "de_lex_plan_l10_c01_helfen_v1") as R;
  if (
    (l10Help.verbPackage as R | null)?.valencyFrame !== L11_HELP_VALENCY ||
    /\bihn\b/iu.test(allText) ||
    /\b(?:pronoun table|isolated pronoun|geb(?:e|en|t|st)|bring(?:e|en|t|st))\b/iu.test(
      allText,
    ) ||
    chapters.some(
      (chapter) =>
        l11ChapterSurfaceText(chapter).includes("Ich helfe ihm.") &&
        !l11ChapterSurfaceText(chapter).includes(L11_PRONOUN_CHAIN),
    )
  )
    throw new Error("l11_semantic_contract_invalid:dative_pronoun_antecedent");

  if (
    (chapters[4].supportFading as R).entry !==
      L11_CLOSED_CHAPTER_CONTRACTS[4].supportEntry ||
    (chapters[4].supportFading as R).exit !==
      L11_CLOSED_CHAPTER_CONTRACTS[4].supportExit
  )
    throw new Error("l11_semantic_contract_invalid:c05_function_contrast");
  if (
    (chapters[5].situation as R).goal !==
      L11_CLOSED_CHAPTER_CONTRACTS[5].situation.goal ||
    String((chapters[5].situation as R).goal).includes(
      "without-an-explicit-adjacent-antecedent",
    )
  )
    throw new Error("l11_semantic_contract_invalid:c06_antecedent_contract");
  if (
    (chapters[5].supportFading as R).entry !==
      L11_CLOSED_CHAPTER_CONTRACTS[5].supportEntry ||
    (chapters[5].supportFading as R).exit !==
      L11_CLOSED_CHAPTER_CONTRACTS[5].supportExit
  )
    throw new Error("l11_semantic_contract_invalid:c06_repair");
  if (
    JSON.stringify(chapters[6].allowedConstructIds) !==
      JSON.stringify(L11_FINAL_REQUIRED) ||
    JSON.stringify((chapters[6].checkpoint as R).integratedConstructIds) !==
      JSON.stringify(L11_FINAL_REQUIRED) ||
    (chapters[6].supportFading as R).exit !==
      L11_CLOSED_CHAPTER_CONTRACTS[6].supportExit ||
    ((chapters[6].checkpoint as R).plannedNewLexicalSenses as R[])[0]
      .communicativeUse !==
      L11_CLOSED_CHAPTER_CONTRACTS[6].lexical[0].communicativeUse
  )
    throw new Error("l11_semantic_contract_invalid:c07_transfer_or_provenance");
  const requiredNeutralContractionText = [0, 2, 4]
    .map((index) => l11ChapterSurfaceText(chapters[index]))
    .join("\n");
  if (/\bbei dem\b/iu.test(requiredNeutralContractionText))
    throw new Error("l11_semantic_contract_invalid:neutral_bei_contraction");
  const c1Garderobe = (
    ((chapters[0].checkpoint as R).plannedNewLexicalSenses as R[]) ?? []
  ).find((sense) => sense.id === "de_lex_plan_l11_c01_garderobe_v1") as R;
  if (
    !String((chapters[0].supportFading as R).entry).includes(
      L11_C01_GUARDIAN_LOCATION_MODEL,
    ) ||
    !String((chapters[0].supportFading as R).exit).includes("beim Ausgang") ||
    !String(c1Garderobe?.communicativeUse).includes(
      L11_C01_GUARDIAN_LOCATION_MODEL,
    )
  )
    throw new Error("l11_semantic_contract_invalid:c01_guardian_proof");

  for (let index = 0; index < chapters.length; index += 1) {
    const chapter = chapters[index];
    const checkpoint = chapter.checkpoint as R;
    const expected = L11_CLOSED_CHAPTER_CONTRACTS[index];
    const senses = checkpoint.plannedNewLexicalSenses as R[];
    const expectedConstructs = index === 6 ? L11_FINAL_REQUIRED : L11_ALLOWED;
    const [expectedEntryLevel, expectedExitLevel] = L11_SUPPORT_LEVELS[index];
    if (
      !sameStringSet(
        chapter.allowedConstructIds as string[],
        expectedConstructs,
      ) ||
      !sameStringSet(
        checkpoint.integratedConstructIds as string[],
        expectedConstructs,
      ) ||
      JSON.stringify(senses.map((sense) => sense.id)) !==
        JSON.stringify(L11_LEXICAL_IDS_BY_CHAPTER[index]) ||
      senses.some((sense) => sense.lexicalKind === "FIXED_EXPRESSION")
    )
      throw new Error("l11_semantic_contract_invalid:chapter_contract");
    if (
      JSON.stringify(chapter.chapterEvidencePacketIds) !==
      JSON.stringify(L11_EVIDENCE_BY_CHAPTER[index])
    )
      throw new Error(
        `l11_semantic_contract_invalid:chapter_evidence:${expected.id}`,
      );
    for (const sense of senses) {
      const plannedUsePacketIds = (sense.utilityProof as R).plannedUsePacketIds;
      if (
        JSON.stringify(plannedUsePacketIds) !==
        JSON.stringify([String(checkpoint.packetId)])
      )
        throw new Error(
          `l11_semantic_contract_invalid:planned_use_packets:${String(sense.id)}`,
        );
    }
    if (
      (chapter.supportFading as R).entryLevel !== expectedEntryLevel ||
      (chapter.supportFading as R).exitLevel !== expectedExitLevel
    )
      throw new Error(
        `l11_semantic_contract_invalid:closed_chapter:${expected.id}`,
      );
    const actual: L11ClosedChapterContract = {
      id: String(chapter.id),
      situation: chapter.situation as R,
      supportEntry: String((chapter.supportFading as R).entry),
      supportExit: String((chapter.supportFading as R).exit),
      newSituation: checkpoint.newSituation as R,
      lexical: senses.map((sense) => {
        const utility = sense.utilityProof as R;
        return {
          id: String(sense.id),
          semanticIdentity: String(sense.semanticIdentity),
          lemmaOrExpression: String(sense.lemmaOrExpression),
          senseGloss: String(sense.senseGloss),
          communicativeUse: String(sense.communicativeUse),
          utilityRole: String(utility.utilityRole),
          situationFacet: String(utility.situationFacet),
          facetValue: String(utility.facetValue),
          necessityClass: String(utility.necessityClass),
        };
      }),
    };
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(
        `l11_semantic_contract_invalid:closed_chapter:${expected.id}`,
      );
    const recall = chapter.recallSchedule as R;
    const [expectedFrom, expectedTo] = L11_RECALL_CONTRACTS[index];
    if (
      JSON.stringify(recall.retrievesFromChapterIds) !==
        JSON.stringify(expectedFrom) ||
      JSON.stringify(recall.targetsFutureChapterIds) !==
        JSON.stringify(expectedTo)
    )
      throw new Error(`l11_recall_contract_invalid:${expected.id}`);
  }

  const expectedNouns = new Map<string, readonly string[]>([
    [
      "de_lex_plan_l11_c01_garderobe_v1",
      ["die", "Garderobe", "Garderoben", "die|garderobe|garderoben"],
    ],
    [
      "de_lex_plan_l11_c01_besucher_v1",
      ["der", "Besucher", "Besucher", "der|besucher|besucher"],
    ],
    [
      "de_lex_plan_l11_c02_infostand_v1",
      ["der", "Infostand", "Infostände", "der|infostand|infostande"],
    ],
    [
      "de_lex_plan_l11_c03_toilette_v1",
      ["die", "Toilette", "Toiletten", "die|toilette|toiletten"],
    ],
    [
      "de_lex_plan_l11_c04_treffpunkt_v1",
      ["der", "Treffpunkt", "Treffpunkte", "der|treffpunkt|treffpunkte"],
    ],
    [
      "de_lex_plan_l11_c05_sanitaetsraum_v1",
      [
        "der",
        "Sanitätsraum",
        "Sanitätsräume",
        "der|sanitatsraum|sanitatsraume",
      ],
    ],
    [
      "de_lex_plan_l11_c06_lageplan_v1",
      ["der", "Lageplan", "Lagepläne", "der|lageplan|lageplane"],
    ],
    [
      "de_lex_plan_l11_c07_servicestelle_v1",
      [
        "die",
        "Servicestelle",
        "Servicestellen",
        "die|servicestelle|servicestellen",
      ],
    ],
  ]);
  const senses = chapters.flatMap(
    (chapter) =>
      ((chapter.checkpoint as R).plannedNewLexicalSenses as R[]) ?? [],
  );
  for (const [senseId, expected] of expectedNouns) {
    const sense = senses.find((candidate) => candidate.id === senseId) as R;
    const noun = sense.nounPackage as R | null;
    if (
      sense.lexicalKind !== "NOUN_LEXEME" ||
      sense.lemmaOrExpression !== expected[1] ||
      noun?.article !== expected[0] ||
      noun?.singular !== expected[1] ||
      noun?.plural !== expected[2] ||
      sense.nounPackageIdentity !== expected[3] ||
      sense.verbPackage !== null
    )
      throw new Error("l11_semantic_contract_invalid:lexical_packages");
  }
}

const L12_TWO_OBJECT = "de_gc_two_object_case_contrast_v1";
const L12_WECHSEL = "de_gc_wechselpreposition_relation_contrast_v1";
const L12_ACCUSATIVE = "de_gc_frequent_accusative_frames_v1";
const L12_RECIPIENT = "de_gc_dative_recipient_frames_v1";
const L12_LOCATION = "de_gc_dative_location_frames_v1";
const L12_LOCAL = "de_gc_local_preposition_governed_case_v1";
const L12_DATIVE_PRONOUN = "de_gc_dative_personal_pronouns_v1";
const L12_INTRODUCED = [L12_TWO_OBJECT, L12_WECHSEL] as const;
const L12_EXTENDED = [L12_ACCUSATIVE, L12_RECIPIENT, L12_LOCATION] as const;
const L12_REVIEWED = [L12_LOCAL, L12_DATIVE_PRONOUN] as const;
const L12_PROHIBITED = [
  "de_gc_predicative_adjective_v1",
  "de_gc_staged_nominal_group_agreement_v1",
] as const;
const L12_ALLOWED = [
  ...L12_INTRODUCED,
  ...L12_EXTENDED,
  ...L12_REVIEWED,
] as const;
const L12_FINAL_REQUIRED = [
  L12_TWO_OBJECT,
  L12_WECHSEL,
  L12_LOCATION,
  L12_DATIVE_PRONOUN,
] as const;
const L12_NO_EXPANSION =
  "The lesson permits geben only in one verified dative-recipient plus accusative-item frame, bringen only with one explicit accusative item and one bounded in-plus-accusative destination, and in as the sole Wechsel relation: bounded destination in plus Akkusativ versus stable location in plus Dativ. Case follows verified valency or relation, never word order or a movement heuristic. No other Wechselpreposition, table, hinstellen or separable-verb expansion, adjective work, isolated case or pronoun table, or future grammar is allowed.";
const L12_GEBEN_MODEL = "Ich gebe dem Helfer die Kiste.";
const L12_BRINGEN_PAIR =
  "Ich bringe die Kiste ins Regal. Die Kiste ist im Regal.";
const L12_C05_ITEM_FIRST = "Das Materialpaket gebe ich dem Helfer.";
const L12_C06_BAD_RECIPIENT = "Ich gebe den Helfer die Kiste.";
const L12_C06_GOOD_RECIPIENT = L12_GEBEN_MODEL;
const L12_C06_BAD_DESTINATION = "Ich bringe die Kiste im Regal.";
const L12_C06_GOOD_RELATION = L12_BRINGEN_PAIR;
const L12_C07_GIVE_CHAIN =
  "Ich gebe dem Helfer die Losbox. Ich gebe ihm die Losbox.";
const L12_C07_RELATION_PAIR =
  "Ich bringe die Losbox in den Eingangsbereich. Die Losbox ist im Eingangsbereich.";
const L12_LEXICAL_IDS_BY_CHAPTER = [
  [
    "de_lex_plan_l12_c01_geben_v1",
    "de_lex_plan_l12_c01_bringen_v1",
    "de_lex_plan_l12_c01_helfer_v1",
    "de_lex_plan_l12_c01_kiste_v1",
  ],
  ["de_lex_plan_l12_c02_tasche_v1"],
  ["de_lex_plan_l12_c03_karton_v1"],
  ["de_lex_plan_l12_c04_spendenbox_v1"],
  ["de_lex_plan_l12_c05_materialpaket_v1"],
  ["de_lex_plan_l12_c06_aufbauplan_v1"],
  ["de_lex_plan_l12_c07_losbox_v1", "de_lex_plan_l12_c07_eingangsbereich_v1"],
] as const;
const L12_SUPPORT_LEVELS = [
  [5, 2],
  [5, 2],
  [4, 1],
  [4, 1],
  [3, 1],
  [3, 1],
  [2, 0],
] as const;
const L12_EVIDENCE_BY_CHAPTER = [
  ["de_l12_c01_s03", "de_l12_c01_s04"],
  ["de_l12_c02_s11", "de_l12_c02_s12"],
  ["de_l12_c03_s19", "de_l12_c03_s20"],
  ["de_l12_c04_s27", "de_l12_c04_s28"],
  ["de_l12_c05_s35", "de_l12_c05_s36"],
  ["de_l12_c06_s43", "de_l12_c06_s44"],
  [
    "de_l12_c07_s51",
    "de_l12_c07_s52",
    "de_l12_c07_s53",
    "de_l12_c07_s54",
    "de_l12_c07_s55",
    "de_l12_c07_s56",
  ],
] as const;
const L12_RECALL_CONTRACTS = [
  [["de_l11_c06", "de_l11_c07"], ["de_l12_c02"]],
  [["de_l12_c01"], ["de_l12_c03"]],
  [["de_l12_c01", "de_l12_c02"], ["de_l12_c04"]],
  [["de_l12_c02", "de_l12_c03"], ["de_l12_c05"]],
  [["de_l12_c03", "de_l12_c04"], ["de_l12_c06"]],
  [["de_l12_c04", "de_l12_c05"], ["de_l12_c07"]],
  [["de_l12_c05", "de_l12_c06"], ["de_l13_c01"]],
] as const;
const L12_TO_L13_DELAYED_PACKETS = [51, 52, 53, 54, 55, 56, 55].map(
  (session, index) =>
    `de_l12_c${String(index + 1).padStart(2, "0")}->de_l13_c07_s${session}`,
);
const L12_SITUATIONS = [
  [
    "community-event-supply-handover",
    "event-coordinator-and-supply-helper",
    "identify-recipient-item-roles-and-contrast-bounded-in-placement-with-stable-in-location",
    "supply-handover-in-relation-introduction",
  ],
  [
    "donation-counter-supply-route",
    "donation-coordinator-and-setup-helper",
    "contrast-tasche-destination-ins-regal-with-resulting-stable-location-im-regal",
    "tasche-two-role-in-relation-guided",
  ],
  [
    "registration-supply-desk",
    "registration-lead-and-event-helper",
    "produce-karton-recipient-and-item-roles-before-retrieving-its-destination-state",
    "karton-two-object-relation-retrieval",
  ],
  [
    "charity-stall-placement",
    "stall-coordinator-and-setup-helper",
    "place-the-spendenbox-into-the-regal-and-report-its-stable-location",
    "spendenbox-in-relation-production",
  ],
  [
    "community-stage-material-setup",
    "stage-coordinator-and-setup-helper",
    "coordinate-item-first-materialpaket-handover-and-bounded-in-placement",
    "materialpaket-role-order-and-placement-combination",
  ],
  [
    "event-layout-correction-desk",
    "layout-editor-and-setup-volunteer",
    "repair-recipient-item-marking-or-bounded-versus-stable-in-relation",
    "aufbauplan-role-relation-repair",
  ],
  [
    "sports-club-raffle-layout-change",
    "raffle-coordinator-and-relief-helper",
    "transfer-recipient-item-reference-and-in-relation-to-a-different-entry-layout",
    "raffle-changed-layout-final-transfer",
  ],
] as const;
const L12_NEW_SITUATIONS = [
  [
    "neighborhood-fair-supply-table",
    "fair-coordinator-and-setup-helper",
    "independently-assign-kiste-recipient-and-verify-its-bounded-destination-and-stable-location",
    "neighborhood-fair-two-role-in-relation-check",
  ],
  [
    "school-fair-donation-counter",
    "school-fair-coordinator-and-volunteer",
    "guide-the-tasche-handover-and-in-relation-contrast",
    "school-fair-tasche-guided-check",
  ],
  [
    "neighborhood-workshop-registration",
    "workshop-coordinator-and-material-helper",
    "produce-the-karton-handover-and-verify-its-placement",
    "workshop-karton-production-check",
  ],
  [
    "library-fundraiser-setup",
    "fundraiser-coordinator-and-volunteer",
    "place-and-locate-the-spendenbox-after-a-clear-handover",
    "fundraiser-spendenbox-placement-check",
  ],
  [
    "youth-club-stage-setup",
    "club-coordinator-and-stage-volunteer",
    "coordinate-the-materialpaket-handover-and-placement-without-word-order-guessing",
    "youth-club-materialpaket-combination-check",
  ],
  [
    "town-festival-layout-review",
    "festival-coordinator-and-plan-reviewer",
    "repair-the-aufbauplan-role-marking-and-in-relation-without-movement-heuristic",
    "town-festival-aufbauplan-repair-check",
  ],
  [
    "civic-open-day-raffle-entrance",
    "open-day-coordinator-and-raffle-helper",
    "independently-transfer-losbox-recipient-reference-and-placement-to-the-new-eingangsbereich",
    "open-day-losbox-eingangsbereich-final",
  ],
] as const;
const L12_SUPPORTS = [
  [
    `role cards and a shelf diagram showing ${L12_GEBEN_MODEL} plus ${L12_BRINGEN_PAIR}; recipient, item, destination, and stable location are marked by function`,
    "identify dem Helfer as recipient and die Kiste as transferred item, then distinguish ins Regal as bounded destination from im Regal as stable location",
  ],
  [
    "whole models Ich gebe dem Helfer die Tasche. Ich bringe die Tasche ins Regal. Die Tasche ist im Regal., with recipient, item, destination, and stable-location roles labelled",
    "guide the Tasche handover and distinguish ins Regal from im Regal by the taught relation",
  ],
  [
    "partial role prompts for Ich gebe dem Helfer den Karton. Ich bringe den Karton ins Regal. Der Karton ist im Regal., without word-order or movement shortcuts",
    "produce the Karton handover and retrieve bounded destination ins Regal versus stable location im Regal",
  ],
  [
    "minimal scene prompts for Ich gebe dem Helfer die Spendenbox. Ich bringe die Spendenbox ins Regal. Die Spendenbox ist im Regal.",
    "independently place die Spendenbox ins Regal and report its stable location im Regal after the verified handover",
  ],
  [
    `contrast card requiring the exact item-first proof ${L12_C05_ITEM_FIRST} plus Ich bringe das Materialpaket ins Regal. Das Materialpaket ist im Regal.`,
    "coordinate the item-first Materialpaket handover and placement while selecting case from valency and relation, never word order",
  ],
  [
    `Aufbauplan repair card with ${L12_C06_BAD_RECIPIENT} -> ${L12_C06_GOOD_RECIPIENT} and ${L12_C06_BAD_DESTINATION} -> ${L12_C06_GOOD_RELATION}`,
    "use the Aufbauplan to repair both exact errors: recipient marking in the geben frame and bounded destination versus stable location in the in relation",
  ],
  [
    `minimal changed-layout card with ${L12_C07_GIVE_CHAIN} plus ${L12_C07_RELATION_PAIR}`,
    `independently produce ${L12_C07_GIVE_CHAIN} and ${L12_C07_RELATION_PAIR}`,
  ],
] as const;
const L12_LEXICAL_EXPECTED = [
  [
    [
      "de_lex_plan_l12_c01_geben_v1",
      "geben",
      "geben|transfer an item to a named recipient in one verified two object frame",
      "transfer an item to a named recipient in one verified two-object frame",
      "action",
      "goal",
      "OUTCOME_UNACHIEVABLE",
    ],
    [
      "de_lex_plan_l12_c01_bringen_v1",
      "bringen",
      "bringen|carry one explicit item to one bounded destination",
      "carry one explicit item to one bounded destination",
      "temporal_spatial",
      "goal",
      "OUTCOME_UNACHIEVABLE",
    ],
    [
      "de_lex_plan_l12_c01_helfer_v1",
      "Helfer",
      "helfer|helper receiving an event supply item",
      "helper receiving an event-supply item",
      "participant_reference",
      "participants",
      "PARTICIPANT_UNIDENTIFIABLE",
    ],
    [
      "de_lex_plan_l12_c01_kiste_v1",
      "Kiste",
      "kiste|crate transferred and placed during event setup",
      "crate transferred and placed during event setup",
      "mediation",
      "goal",
      "OUTCOME_UNACHIEVABLE",
    ],
  ],
  [
    [
      "de_lex_plan_l12_c02_tasche_v1",
      "Tasche",
      "tasche|bag handed over and placed on a shelf",
      "bag handed over and placed on a shelf",
      "temporal_spatial",
      "goal",
      "OUTCOME_UNACHIEVABLE",
    ],
  ],
  [
    [
      "de_lex_plan_l12_c03_karton_v1",
      "Karton",
      "karton|carton handed over and placed during registration setup",
      "carton handed over and placed during registration setup",
      "action",
      "goal",
      "OUTCOME_UNACHIEVABLE",
    ],
  ],
  [
    [
      "de_lex_plan_l12_c04_spendenbox_v1",
      "Spendenbox",
      "spendenbox|donation box handed over and placed for a fundraiser",
      "donation box handed over and placed for a fundraiser",
      "temporal_spatial",
      "goal",
      "OUTCOME_UNACHIEVABLE",
    ],
  ],
  [
    [
      "de_lex_plan_l12_c05_materialpaket_v1",
      "Materialpaket",
      "materialpaket|materials package handed over and placed for stage setup",
      "materials package handed over and placed for stage setup",
      "mediation",
      "goal",
      "OUTCOME_UNACHIEVABLE",
    ],
  ],
  [
    [
      "de_lex_plan_l12_c06_aufbauplan_v1",
      "Aufbauplan",
      "aufbauplan|event setup plan used to identify and repair role and placement errors",
      "event setup plan used to identify and repair role and placement errors",
      "repair",
      "goal",
      "REPAIR_UNAVAILABLE",
    ],
  ],
  [
    [
      "de_lex_plan_l12_c07_losbox_v1",
      "Losbox",
      "losbox|raffle box transferred and placed in a changed venue layout",
      "raffle box transferred and placed in a changed venue layout",
      "transfer",
      "goal",
      "TRANSFER_UNAVAILABLE",
    ],
    [
      "de_lex_plan_l12_c07_eingangsbereich_v1",
      "Eingangsbereich",
      "eingangsbereich|entrance area used as the changed bounded destination and stable location",
      "entrance area used as the changed bounded destination and stable location",
      "temporal_spatial",
      "setting",
      "SCENE_UNGROUNDED",
    ],
  ],
] as const;
const L12_COMMUNICATIVE_USE = [
  [
    "use Ich gebe dem Helfer die Kiste. to prove recipient and transferred-item roles through verified valency and case",
    "use Ich bringe die Kiste ins Regal. Die Kiste ist im Regal. to contrast bounded destination with stable location",
    "identify dem Helfer as the named dative recipient in Ich gebe dem Helfer die Kiste.",
    "track die Kiste as the explicit accusative item through handover, bounded destination, and stable location",
  ],
  [
    "use die Tasche across Ich gebe dem Helfer die Tasche. Ich bringe die Tasche ins Regal. Die Tasche ist im Regal.",
  ],
  [
    "use den Karton as the transferred item and Der Karton as the same item in its stable location",
  ],
  [
    "use die Spendenbox in the verified handover and ins Regal versus im Regal placement contrast",
  ],
  [
    "use Das Materialpaket gebe ich dem Helfer. to prove that case roles do not follow word order, then place it ins Regal and locate it im Regal",
  ],
  [
    "ground the exact repair in the Aufbauplan: den Helfer to dem Helfer and im Regal to ins Regal before the stable-location statement",
  ],
  [
    "use Ich gebe dem Helfer die Losbox. Ich gebe ihm die Losbox. and the two exact Eingangsbereich placement statements for final transfer",
    "ground the changed scene in den Eingangsbereich as destination and im Eingangsbereich as stable location",
  ],
] as const;

function l12Tuple(values: readonly string[]): R {
  return {
    setting: values[0],
    participants: values[1],
    goal: values[2],
    contextSignature: values[3],
  };
}

function validateL12LexicalPrerequisites(chapters: R[]): void {
  const prerequisites = [
    ["geben", "de_l12_c01", /\bgeb(?:e|en|t|st)\b/iu],
    ["bringen", "de_l12_c01", /\bbring(?:e|en|t|st)\b/iu],
    ["Helfer", "de_l12_c01", /\bHelfer(?:s|n)?\b/iu],
    ["Kiste", "de_l12_c01", /\bKist(?:e|en)\b/iu],
    ["Tasche", "de_l12_c02", /\bTasch(?:e|en)\b/iu],
    ["Karton", "de_l12_c03", /\bKarton(?:s|e|en)?\b/iu],
    ["Spendenbox", "de_l12_c04", /\bSpendenbox(?:en)?\b/iu],
    ["Materialpaket", "de_l12_c05", /\bMaterialpaket(?:e|en|s)?\b/iu],
    ["Aufbauplan", "de_l12_c06", /\bAufbaupl(?:an|äne|änen)\b/iu],
    ["Losbox", "de_l12_c07", /\bLosbox(?:en)?\b/iu],
    ["Eingangsbereich", "de_l12_c07", /\bEingangsbereich(?:e|en|s)?\b/iu],
  ] as const;
  for (const [lemma, owner, pattern] of prerequisites) {
    const owners = chapters.filter((chapter) =>
      (((chapter.checkpoint as R).plannedNewLexicalSenses as R[]) ?? []).some(
        (sense) =>
          normalized(String(sense.lemmaOrExpression)) === normalized(lemma),
      ),
    );
    const ownerIndex = chapters.findIndex((chapter) => chapter.id === owner);
    if (ownerIndex < 0 || owners.length !== 1 || owners[0].id !== owner)
      throw new Error(`l12_lexical_prerequisite_invalid:${owner}:${lemma}`);
    const firstSurfaceIndex = chapters.findIndex((chapter) =>
      pattern.test(l11ChapterSurfaceText(chapter)),
    );
    if (firstSurfaceIndex < 0 || firstSurfaceIndex < ownerIndex)
      throw new Error(
        `l12_lexical_prerequisite_invalid:${firstSurfaceIndex < 0 ? owner : String(chapters[firstSurfaceIndex].id)}:${lemma}`,
      );
  }
}

function validateL12SemanticContract(raw: R, plan: Boundary): void {
  const l12 = (raw.lessons as R[]).find(
    (lesson) => lesson.lessonId === "de_l12",
  );
  if (!l12) throw new Error("l12_semantic_contract_invalid:missing");
  const chapters = l12.chapters as R[];
  const boundary = l12.grammarBoundary as R;
  if (boundary.noExpansion !== L12_NO_EXPANSION)
    throw new Error("l12_semantic_contract_invalid:no_expansion");
  if (
    JSON.stringify(plan.introducedConstructIds) !==
      JSON.stringify(L12_INTRODUCED) ||
    JSON.stringify(plan.extendedConstructIds) !==
      JSON.stringify(L12_EXTENDED) ||
    JSON.stringify(plan.reviewedConstructIds) !==
      JSON.stringify(L12_REVIEWED) ||
    JSON.stringify(plan.prohibitedConstructIds) !==
      JSON.stringify(L12_PROHIBITED) ||
    JSON.stringify(plan.session56Final.requiredConstructIds) !==
      JSON.stringify(L12_FINAL_REQUIRED) ||
    JSON.stringify(boundary.allowedConstructIds) !==
      JSON.stringify(L12_ALLOWED) ||
    JSON.stringify(boundary.prohibitedConstructIds) !==
      JSON.stringify(L12_PROHIBITED) ||
    chapters.length !== 7
  )
    throw new Error("l12_semantic_contract_invalid:sets");

  const expectedAnchors = [
    `${L12_TWO_OBJECT}|introduction|de_l12_c01_s01`,
    `${L12_WECHSEL}|introduction|de_l12_c01_s02`,
    `${L12_TWO_OBJECT}|guided|de_l12_c02_s09`,
    `${L12_WECHSEL}|guided|de_l12_c02_s10`,
    `${L12_TWO_OBJECT}|retrieval|de_l12_c03_s17`,
    `${L12_WECHSEL}|retrieval|de_l12_c03_s18`,
    `${L12_TWO_OBJECT}|production|de_l12_c04_s25`,
    `${L12_WECHSEL}|production|de_l12_c04_s26`,
    `${L12_TWO_OBJECT}|transfer|de_l12_c06_s41`,
    `${L12_WECHSEL}|transfer|de_l12_c06_s42`,
    `${L12_LOCATION}|delayed|de_l12_c07_s49`,
    `${L12_DATIVE_PRONOUN}|delayed|de_l12_c07_s50`,
  ];
  const actualAnchors = chapters.flatMap((chapter) =>
    ((chapter.lifecycleAnchors as R[]) ?? []).map(
      (anchor) =>
        `${String(anchor.constructId)}|${String(anchor.stage)}|${String(anchor.packetId)}`,
    ),
  );
  if (JSON.stringify(actualAnchors) !== JSON.stringify(expectedAnchors))
    throw new Error("l12_semantic_contract_invalid:anchors");

  const l11 = (raw.lessons as R[]).find(
    (lesson) => lesson.lessonId === "de_l11",
  ) as R;
  const l11Chapters = l11.chapters as R[];
  const incoming = l11Chapters.map(
    (chapter, index) =>
      `de_l11_c${String(index + 1).padStart(2, "0")}->${String(((chapter.recallSchedule as R).futureDelayedProbe as R).packetId)}`,
  );
  const expectedIncoming = [51, 52, 53, 54, 55, 56, 55].map(
    (session, index) =>
      `de_l11_c${String(index + 1).padStart(2, "0")}->de_l12_c07_s${session}`,
  );
  const inverse = new Map<string, string[]>();
  l11Chapters.forEach((chapter, index) => {
    const packetId = String(
      ((chapter.recallSchedule as R).futureDelayedProbe as R).packetId,
    );
    inverse.set(packetId, [
      ...(inverse.get(packetId) ?? []),
      `de_l11_c${String(index + 1).padStart(2, "0")}`,
    ]);
  });
  const expectedInverse = new Map<string, string[]>([
    ["de_l12_c07_s51", ["de_l11_c01"]],
    ["de_l12_c07_s52", ["de_l11_c02"]],
    ["de_l12_c07_s53", ["de_l11_c03"]],
    ["de_l12_c07_s54", ["de_l11_c04"]],
    ["de_l12_c07_s55", ["de_l11_c05", "de_l11_c07"]],
    ["de_l12_c07_s56", ["de_l11_c06"]],
  ]);
  if (
    JSON.stringify(incoming) !== JSON.stringify(expectedIncoming) ||
    JSON.stringify(chapters[6].chapterEvidencePacketIds) !==
      JSON.stringify(L12_EVIDENCE_BY_CHAPTER[6]) ||
    JSON.stringify([...inverse]) !== JSON.stringify([...expectedInverse])
  )
    throw new Error("l11_l12_inverse_provenance_invalid");

  const outgoing = chapters.map(
    (chapter, index) =>
      `de_l12_c${String(index + 1).padStart(2, "0")}->${String(((chapter.recallSchedule as R).futureDelayedProbe as R).packetId)}`,
  );
  const outgoingInverse = new Map<string, string[]>();
  chapters.forEach((chapter, index) => {
    const packetId = String(
      ((chapter.recallSchedule as R).futureDelayedProbe as R).packetId,
    );
    outgoingInverse.set(packetId, [
      ...(outgoingInverse.get(packetId) ?? []),
      `de_l12_c${String(index + 1).padStart(2, "0")}`,
    ]);
  });
  const expectedOutgoingInverse = new Map<string, string[]>([
    ["de_l13_c07_s51", ["de_l12_c01"]],
    ["de_l13_c07_s52", ["de_l12_c02"]],
    ["de_l13_c07_s53", ["de_l12_c03"]],
    ["de_l13_c07_s54", ["de_l12_c04"]],
    ["de_l13_c07_s55", ["de_l12_c05", "de_l12_c07"]],
    ["de_l13_c07_s56", ["de_l12_c06"]],
  ]);
  if (
    JSON.stringify(outgoing) !== JSON.stringify(L12_TO_L13_DELAYED_PACKETS) ||
    JSON.stringify([...outgoingInverse]) !==
      JSON.stringify([...expectedOutgoingInverse])
  )
    throw new Error("l12_l13_inverse_provenance_invalid");

  for (let index = 0; index < chapters.length; index += 1) {
    const recall = chapters[index].recallSchedule as R;
    const [from, to] = L12_RECALL_CONTRACTS[index];
    if (
      JSON.stringify(recall.retrievesFromChapterIds) !== JSON.stringify(from) ||
      JSON.stringify(recall.targetsFutureChapterIds) !== JSON.stringify(to)
    )
      throw new Error(
        `l12_recall_contract_invalid:de_l12_c${String(index + 1).padStart(2, "0")}`,
      );
  }
  validateL12LexicalPrerequisites(chapters);
  if (
    chapters.some((chapter) =>
      (((chapter.checkpoint as R).plannedNewLexicalSenses as R[]) ?? []).some(
        (sense) => sense.lexicalKind === "FIXED_EXPRESSION",
      ),
    )
  )
    throw new Error("l12_semantic_contract_invalid:chapter_contract");

  const allSenses = chapters.flatMap(
    (chapter) =>
      ((chapter.checkpoint as R).plannedNewLexicalSenses as R[]) ?? [],
  );
  const expectedNouns = new Map<string, readonly string[]>([
    [
      "de_lex_plan_l12_c01_helfer_v1",
      ["der", "Helfer", "Helfer", "der|helfer|helfer"],
    ],
    [
      "de_lex_plan_l12_c01_kiste_v1",
      ["die", "Kiste", "Kisten", "die|kiste|kisten"],
    ],
    [
      "de_lex_plan_l12_c02_tasche_v1",
      ["die", "Tasche", "Taschen", "die|tasche|taschen"],
    ],
    [
      "de_lex_plan_l12_c03_karton_v1",
      ["der", "Karton", "Kartons", "der|karton|kartons"],
    ],
    [
      "de_lex_plan_l12_c04_spendenbox_v1",
      ["die", "Spendenbox", "Spendenboxen", "die|spendenbox|spendenboxen"],
    ],
    [
      "de_lex_plan_l12_c05_materialpaket_v1",
      [
        "das",
        "Materialpaket",
        "Materialpakete",
        "das|materialpaket|materialpakete",
      ],
    ],
    [
      "de_lex_plan_l12_c06_aufbauplan_v1",
      ["der", "Aufbauplan", "Aufbaupläne", "der|aufbauplan|aufbauplane"],
    ],
    [
      "de_lex_plan_l12_c07_losbox_v1",
      ["die", "Losbox", "Losboxen", "die|losbox|losboxen"],
    ],
    [
      "de_lex_plan_l12_c07_eingangsbereich_v1",
      [
        "der",
        "Eingangsbereich",
        "Eingangsbereiche",
        "der|eingangsbereich|eingangsbereiche",
      ],
    ],
  ]);
  for (const [id, expected] of expectedNouns) {
    const sense = allSenses.find((candidate) => candidate.id === id) as R;
    const noun = sense?.nounPackage as R | null;
    if (
      !sense ||
      sense.lexicalKind !== "NOUN_LEXEME" ||
      sense.lemmaOrExpression !== expected[1] ||
      noun?.article !== expected[0] ||
      noun?.singular !== expected[1] ||
      noun?.plural !== expected[2] ||
      sense.nounPackageIdentity !== expected[3] ||
      sense.verbPackage !== null
    )
      throw new Error("l12_semantic_contract_invalid:lexical_packages");
  }
  const expectedVerbs = new Map<string, readonly string[]>([
    [
      "de_lex_plan_l12_c01_geben_v1",
      [
        "geben",
        "geben|transfer an item to a named recipient in one verified two object frame",
        "transfer an item to a named recipient in one verified two-object frame",
        "transfer frame selecting one explicit dative recipient and one explicit accusative transferred entity",
      ],
    ],
    [
      "de_lex_plan_l12_c01_bringen_v1",
      [
        "bringen",
        "bringen|carry one explicit item to one bounded destination",
        "carry one explicit item to one bounded destination",
        "directed-placement frame selecting one explicit accusative item and one bounded in-plus-accusative destination",
      ],
    ],
  ]);
  for (const [id, expected] of expectedVerbs) {
    const sense = allSenses.find((candidate) => candidate.id === id) as R;
    const verb = sense?.verbPackage as R | null;
    if (
      !sense ||
      sense.lexicalKind !== "VERB_LEXEME" ||
      sense.lemmaOrExpression !== expected[0] ||
      sense.semanticIdentity !== expected[1] ||
      sense.senseGloss !== expected[2] ||
      sense.nounPackage !== null ||
      verb?.infinitive !== expected[0] ||
      verb?.valencyFrame !== expected[3] ||
      verb?.separability !== "inseparable" ||
      verb?.perfectAuxiliary !== "haben"
    )
      throw new Error("l12_semantic_contract_invalid:lexical_packages");
  }

  const allText = chapters.map(l11ChapterSurfaceText).join("\n");
  if (
    /\bhinstellen\b|\b(?:case|pronoun|wechselpreposition) table\b|\bmovement means\b|\bBewegung\b[^.]*\bAkkusativ\b|\bfuture grammar\b|\badjective work\b/iu.test(
      allText,
    )
  )
    throw new Error("l12_semantic_contract_invalid:wechsel_relation");
  if (
    /\b(?:an|auf|hinter|neben|über|unter|vor|zwischen)\s+(?:den|die|das|dem|der|einen|einem|einer)\b/iu.test(
      allText,
    )
  )
    throw new Error("l12_semantic_contract_invalid:wechsel_relation");
  if (
    !String((chapters[0].supportFading as R).entry).includes(L12_GEBEN_MODEL) ||
    !String((chapters[0].supportFading as R).entry).includes(L12_BRINGEN_PAIR)
  )
    throw new Error("l12_semantic_contract_invalid:two_object_roles");
  const exactRelationPairs = [
    L12_BRINGEN_PAIR,
    "Ich bringe die Tasche ins Regal. Die Tasche ist im Regal.",
    "Ich bringe den Karton ins Regal. Der Karton ist im Regal.",
    "Ich bringe die Spendenbox ins Regal. Die Spendenbox ist im Regal.",
    "Ich bringe das Materialpaket ins Regal. Das Materialpaket ist im Regal.",
  ];
  if (
    exactRelationPairs.some(
      (pair, index) =>
        !String((chapters[index].supportFading as R).entry).includes(pair),
    )
  )
    throw new Error("l12_semantic_contract_invalid:wechsel_relation");
  if (
    !String((chapters[4].supportFading as R).entry).includes(
      L12_C05_ITEM_FIRST,
    ) ||
    !String((chapters[4].supportFading as R).exit).includes("never word order")
  )
    throw new Error("l12_semantic_contract_invalid:c05_word_order_proof");
  if (
    !String((chapters[5].supportFading as R).entry).includes(
      `${L12_C06_BAD_RECIPIENT} -> ${L12_C06_GOOD_RECIPIENT}`,
    ) ||
    !String((chapters[5].supportFading as R).entry).includes(
      `${L12_C06_BAD_DESTINATION} -> ${L12_C06_GOOD_RELATION}`,
    ) ||
    !l11ChapterSurfaceText(chapters[5]).includes("Aufbauplan")
  )
    throw new Error("l12_semantic_contract_invalid:c06_repair");
  if (
    JSON.stringify(chapters[6].allowedConstructIds) !==
      JSON.stringify(L12_FINAL_REQUIRED) ||
    JSON.stringify((chapters[6].checkpoint as R).integratedConstructIds) !==
      JSON.stringify(L12_FINAL_REQUIRED) ||
    !String((chapters[6].supportFading as R).exit).includes(
      L12_C07_GIVE_CHAIN,
    ) ||
    !String((chapters[6].supportFading as R).exit).includes(
      L12_C07_RELATION_PAIR,
    )
  )
    throw new Error("l12_semantic_contract_invalid:c07_transfer_or_provenance");

  for (let index = 0; index < chapters.length; index += 1) {
    const chapter = chapters[index];
    const checkpoint = chapter.checkpoint as R;
    const senses = checkpoint.plannedNewLexicalSenses as R[];
    const expectedConstructs = index === 6 ? L12_FINAL_REQUIRED : L12_ALLOWED;
    const [entryLevel, exitLevel] = L12_SUPPORT_LEVELS[index];
    if (
      JSON.stringify(chapter.allowedConstructIds) !==
        JSON.stringify(expectedConstructs) ||
      JSON.stringify(checkpoint.integratedConstructIds) !==
        JSON.stringify(expectedConstructs) ||
      JSON.stringify(chapter.prohibitedConstructIds) !==
        JSON.stringify(L12_PROHIBITED) ||
      JSON.stringify(chapter.situation) !==
        JSON.stringify(l12Tuple(L12_SITUATIONS[index])) ||
      JSON.stringify(checkpoint.newSituation) !==
        JSON.stringify(l12Tuple(L12_NEW_SITUATIONS[index])) ||
      (chapter.supportFading as R).entryLevel !== entryLevel ||
      (chapter.supportFading as R).exitLevel !== exitLevel ||
      (chapter.supportFading as R).entry !== L12_SUPPORTS[index][0] ||
      (chapter.supportFading as R).exit !== L12_SUPPORTS[index][1] ||
      JSON.stringify(senses.map((sense) => sense.id)) !==
        JSON.stringify(L12_LEXICAL_IDS_BY_CHAPTER[index]) ||
      senses.some(
        (sense) =>
          sense.lexicalKind === "FIXED_EXPRESSION" ||
          sense.lemmaStatus !== "FIRST_MEANING",
      )
    )
      throw new Error("l12_semantic_contract_invalid:chapter_contract");
    if (
      JSON.stringify(chapter.chapterEvidencePacketIds) !==
      JSON.stringify(L12_EVIDENCE_BY_CHAPTER[index])
    )
      throw new Error(
        `l12_semantic_contract_invalid:chapter_evidence:de_l12_c${String(index + 1).padStart(2, "0")}`,
      );
    const expectedLexical = L12_LEXICAL_EXPECTED[index];
    for (let senseIndex = 0; senseIndex < senses.length; senseIndex += 1) {
      const sense = senses[senseIndex];
      const expected = expectedLexical[senseIndex];
      const utility = sense.utilityProof as R;
      const facetIndex =
        expected[5] === "setting" ? 0 : expected[5] === "participants" ? 1 : 2;
      if (
        sense.id !== expected[0] ||
        sense.lemmaOrExpression !== expected[1] ||
        sense.semanticIdentity !== expected[2] ||
        sense.senseGloss !== expected[3] ||
        sense.communicativeUse !== L12_COMMUNICATIVE_USE[index][senseIndex] ||
        sense.chapterOutcomeId !==
          `de_l12_ch${String(index + 1).padStart(2, "0")}` ||
        sense.contrastsWithSenseId !== null ||
        sense.contrastEvidence !== null ||
        utility.utilityRole !== expected[4] ||
        utility.situationFacet !== expected[5] ||
        utility.facetValue !== L12_NEW_SITUATIONS[index][facetIndex] ||
        utility.necessityClass !== expected[6] ||
        utility.chapterOutcomeId !== sense.chapterOutcomeId ||
        utility.checkpointPacketId !== checkpoint.packetId ||
        JSON.stringify(utility.integratedConstructIds) !==
          JSON.stringify(expectedConstructs)
      )
        throw new Error("l12_semantic_contract_invalid:lexical_packages");
      if (
        JSON.stringify(utility.plannedUsePacketIds) !==
        JSON.stringify([String(checkpoint.packetId)])
      )
        throw new Error(
          `l12_semantic_contract_invalid:planned_use_packets:${String(sense.id)}`,
        );
    }
  }
}

const L13_ALLOWED = [
  "de_gc_predicative_adjective_v1",
  "de_gc_staged_nominal_group_agreement_v1",
  "de_gc_noun_article_singular_plural_v1",
  "de_gc_frequent_accusative_frames_v1",
  "de_gc_dative_recipient_frames_v1",
  "de_gc_finite_sein_present_v1",
  "de_gc_two_object_case_contrast_v1",
  "de_gc_wechselpreposition_relation_contrast_v1",
] as const;
const L13_FINAL_REQUIRED = [
  L13_ALLOWED[0],
  L13_ALLOWED[1],
  L13_ALLOWED[6],
  L13_ALLOWED[7],
] as const;
const L13_PROHIBITED = [
  "de_gc_nicht_position_focus_v1",
  "de_gc_doch_response_contrast_v1",
] as const;
const L13_NO_EXPANSION =
  "The lesson permits only uninflected predicative adjectives and definite-article attributive adjective agreement inside already established nominative, accusative, dative-recipient, and bounded in-relation frames. Each form must be justified by its known frame and visible article-adjective-noun cues. No full strong-weak-mixed paradigm, bare or indefinite-article paradigm expansion, genitive or other unestablished case-number-gender forms, comparative or superlative morphology, nicht-focus, doch, future grammar, or adjective form outside the closed chapter models is allowed.";
const L13_C06_REPAIR_ITEMS = [
  "Der Koffer ist praktische. → Der Koffer ist praktisch.",
  "Ich kaufe den praktisch Koffer. → Ich kaufe den praktischen Koffer.",
] as const;
const L13_C06_REPAIR_RENDERING = L13_C06_REPAIR_ITEMS.map(
  (item, index) => `[${index + 1}] ${item}`,
).join(" ");
const L13_C07_MODEL =
  "Der Gruppenraum A ist ruhig. Der Gruppenraum B ist geräumig. Die Gruppe ist groß. Der geräumige Gruppenraum B ist geeignet. Ich gebe dem Helfer die Kiste. Ich bringe die Kiste in den geräumigen Gruppenraum B. Die Kiste ist im geräumigen Gruppenraum B.";
const L13_C07_PRIMARY_SITUATION = {
  setting: "community-center-two-room-reassignment",
  participants: "course-coordinator-and-setup-helper",
  goal: "compare-gruppenraum-a-and-b-after-the-coordinator-states-a-large-group-and-justify-room-b",
  contextSignature: "gruppenraum-two-option-choice-final-transfer",
} as const;
const L13_C07_NEW_SITUATION = {
  setting: "adult-education-two-room-reassignment",
  participants: "adult-education-group-and-course-coordinator",
  goal: "independently-compare-gruppenraum-a-and-b-against-the-large-group-criterion-and-justify-room-b",
  contextSignature: "adult-education-two-gruppenraum-choice-final",
} as const;
const L13_HASHES = [
  [
    "5290cc68dbecf2efdb68caa9311d33e4b94845942d4e4a7bc59ce0dfcf32cfe7",
    "9da4c9ceed4731b150d3373892a78f0eb8590a435b82e926c1b92aea87c4bbda",
    "7575237dc22b08b9d20aeffbc16b8931df8f3367c09bb56594b50318484c5186",
    "296f13cf59192d3f1eec4dff4f5e62421a74e960448d5d3c2b5d63f7152aa3ac",
    "c00882c576f29ef36178083213d14eefd1359fa4d3bef68d42fc6a37463ec69d",
    "b7281308d6670ec49564b4e1d1ff3548a8c590565617888e9d7be1c360a29bbe",
  ],
  [
    "a681172554eae3ea2f3c89e92c9bb4376ea893d9ad071ad8a3a2e2883c989cba",
    "f2b2d7077b7426120e160fd387a26f40e0784144a3364064643227f09c7776cc",
    "8b48728a84f533a11220ab6adbdf38e8c84261ce1944c7beb233c9445f77ec18",
    "a22a2daad267f59ba937a961f2c6f24f58ad0ac599fac10d854ef92a42546a07",
    "e050c6bea05d998856c584d790d4f86fe13debc823ace080b485abeda0d6643a",
    "d682f1623871d57af301239dddc3476d9c8e88953932f288de85ce660358b20c",
  ],
  [
    "ac527898f36576072c1f410000511057a9862abc55c3034589aeb172eb959392",
    "da7d8890b9d35f55b1f9172d76bc6a9cd2efce1970d8b8a994f70868fb2833e6",
    "b0412d3c12db89181a17b0ed0fb1c3bd623a0579f34bb58df3b357d281e4fc65",
    "6c1739cdfb727651cee4f776d832c673204441d0bf2d87f0330800a61e4b097d",
    "e2e52b48114b93106987d76e68aea9ec09eb53e7ae1825927a2869e7d2e7f0e5",
    "eb16e76d823d4cead1a74b437f4e1359cb77c67059ff99b7011fb36becd98b3c",
  ],
  [
    "c0bd1b0b89c2d088f56c230b170548942025c8f8a5d7c9d2e02766639d3c65aa",
    "b11d43ed85512828aa76c5d17c51b8d43464974ff0303123ad88fc9cf5dd156f",
    "4ee8a5d93e0817fd5a0dd61781e7600c226beb5d987e3a1f5f4cf33024436209",
    "fe68286a74205b10a305f9b1a0d2887a46337a46d5256f191639acee5e3ca05d",
    "6c997c9e606455b5dde353739ed92965f7d26050111964d3c66770ec9a47280b",
    "947e7dea9f5e19b590dc5d74b6cc2e37661d69309c69513a92395ce5b8d88fd0",
  ],
  [
    "8c6a80a624a69e3dc40a79c0af3a950dae62d20e95568b716353aa41eec02963",
    "32e58cc3bb7c776a7917ee0b5b5a6329806fd0b144a6da8dd553af3650d1cba6",
    "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    "894122b399c69cefdd3b04455e34c34cc5a92fd05b5dce5c6a52c54bf65010e9",
    "7b0a282a48549ccb22b635fad57ae62e035060ec8557ca9032f5d086213ec704",
    "c015f932010659a1013a16802eae9607812f6c7c94a80cfe46acdbf675b287d1",
  ],
  [
    "e158149ed1b0b54bf34457d85d791b7fb3b4efb8e65897389ad6c86a1fa40e64",
    "acf1fd7db4ebf2148cd4297a1614083565dbf1b9856a11c4be12a8daf0b23a11",
    "d634eddccac1b58258d3b553442a33817f61650cf9a77d5b97a12a58fc8cb983",
    "c49ee9a8c4cde8b55e373727444e714bcfe91d71f98db78ba246a4aa4541c08c",
    "d82b4081e6697b217a21fe08938b39882c14c92a0ef1876c51179b1c871fd758",
    "9404af57e4f4fdf1ba383ee22e3f251d5edccfd34e7b814f3d2190d7d20ad598",
  ],
  [
    "91245adddc65d45ad83030c28fa2298bdda9f3d358a6870657f704db7324580d",
    "262cb8a927e0a2d104e427feadaf4aa7c816a269d35e0e42b4619c1469fca0e4",
    "ded7c70208815bf0f65b7d3ca427a0bf2205b21d37e6125a504431343e75054a",
    "5e567335aa7e9bd2a7698d2f9b12baa9c16535e6648991b91be08872f5ec20dd",
    "f87c78e2c11681ebba03618af240ad8454b90340c49c13d97b455899b7afc887",
    "e51b53b713afb438f8c9939e89d74eb0bfdf4e121fff1e378085900bb77332e9",
  ],
] as const;
const L13_MODELS = [
  "Das Zimmer ist ruhig. Das ruhige Zimmer ist frei.",
  "Der Koffer ist leicht. Der leichte Koffer ist dort.",
  "Die Wohnung ist hell. Die helle Wohnung ist frei.",
  "Der Koffer ist stabil. Ich kaufe den stabilen Koffer.",
  "Der Helfer ist erfahren. Ich gebe dem erfahrenen Helfer die Mappe.",
  L13_C06_REPAIR_RENDERING,
  L13_C07_MODEL,
] as const;
function l13Hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function validateL13SemanticContract(raw: R, plan: Boundary): void {
  const l13 = (raw.lessons as R[]).find(
    (lesson) => lesson.lessonId === "de_l13",
  );
  if (!l13) throw new Error("l13_semantic_contract_invalid:missing");
  const chapters = l13.chapters as R[],
    boundary = l13.grammarBoundary as R;
  if (boundary.noExpansion !== L13_NO_EXPANSION)
    throw new Error("l13_semantic_contract_invalid:no_expansion");
  if (
    JSON.stringify(plan.introducedConstructIds) !==
      JSON.stringify(L13_ALLOWED.slice(0, 2)) ||
    JSON.stringify(plan.extendedConstructIds) !==
      JSON.stringify(L13_ALLOWED.slice(2, 5)) ||
    JSON.stringify(plan.reviewedConstructIds) !==
      JSON.stringify(L13_ALLOWED.slice(5)) ||
    JSON.stringify(plan.prohibitedConstructIds) !==
      JSON.stringify(L13_PROHIBITED) ||
    JSON.stringify(boundary.allowedConstructIds) !==
      JSON.stringify(L13_ALLOWED) ||
    JSON.stringify(boundary.prohibitedConstructIds) !==
      JSON.stringify(L13_PROHIBITED) ||
    JSON.stringify((plan.session56Final as R).requiredConstructIds) !==
      JSON.stringify(L13_FINAL_REQUIRED) ||
    chapters.length !== 7
  )
    throw new Error("l13_semantic_contract_invalid:sets");
  const c06 = chapters[5],
    c07 = chapters[6],
    c06Support = c06.supportFading as R,
    c07Support = c07.supportFading as R,
    c07Checkpoint = c07.checkpoint as R,
    c07Senses = c07Checkpoint.plannedNewLexicalSenses as R[];
  if (
    c06Support.entry !== L13_C06_REPAIR_RENDERING ||
    c06Support.exit !== L13_C06_REPAIR_RENDERING ||
    /(?:;|；|\|)|\band\b/iu.test(
      `${String(c06Support.entry)} ${String(c06Support.exit)}`,
    )
  ) {
    throw new Error("l13_semantic_contract_invalid:c06_repair_items");
  }
  const c07SenseById = new Map(
    c07Senses.map((sense) => [String(sense.id), sense]),
  );
  const gruppenraum = c07SenseById.get("de_lex_plan_l13_c07_gruppenraum_v1"),
    geraumig = c07SenseById.get("de_lex_plan_l13_c07_geraumig_v1"),
    gruppe = c07SenseById.get("de_lex_plan_l13_c07_gruppe_v1"),
    gross = c07SenseById.get("de_lex_plan_l13_c07_gross_v1");
  const c07OwnerProjection = (sense: R | undefined): unknown =>
    sense && {
      id: sense.id,
      semanticIdentity: sense.semanticIdentity,
      lemmaOrExpression: sense.lemmaOrExpression,
      partOfSpeech: sense.partOfSpeech,
      lexicalKind: sense.lexicalKind,
      nounPackage: sense.nounPackage,
      nounPackageIdentity: sense.nounPackageIdentity,
      verbPackage: sense.verbPackage,
      utilityRole: (sense.utilityProof as R).utilityRole,
      situationFacet: (sense.utilityProof as R).situationFacet,
      facetValue: (sense.utilityProof as R).facetValue,
      necessityClass: (sense.utilityProof as R).necessityClass,
      plannedUsePacketIds: (sense.utilityProof as R).plannedUsePacketIds,
      communicativeUse: sense.communicativeUse,
    };
  if (
    JSON.stringify(c07.situation) !==
      JSON.stringify(L13_C07_PRIMARY_SITUATION) ||
    JSON.stringify(c07Checkpoint.newSituation) !==
      JSON.stringify(L13_C07_NEW_SITUATION) ||
    c07Support.entry !== L13_C07_MODEL ||
    c07Support.exit !== L13_C07_MODEL ||
    c07Senses.length !== 4 ||
    (gruppenraum?.utilityProof as R | undefined)?.facetValue !==
      L13_C07_NEW_SITUATION.setting ||
    (geraumig?.utilityProof as R | undefined)?.facetValue !==
      L13_C07_NEW_SITUATION.goal ||
    JSON.stringify(c07OwnerProjection(gruppe)) !==
      JSON.stringify({
        id: "de_lex_plan_l13_c07_gruppe_v1",
        semanticIdentity:
          "gruppe|people participating together in the stated course",
        lemmaOrExpression: "Gruppe",
        partOfSpeech: "noun",
        lexicalKind: "NOUN_LEXEME",
        nounPackage: { article: "die", singular: "Gruppe", plural: "Gruppen" },
        nounPackageIdentity: "die|gruppe|gruppen",
        verbPackage: null,
        utilityRole: "participant_reference",
        situationFacet: "participants",
        facetValue: L13_C07_NEW_SITUATION.participants,
        necessityClass: "PARTICIPANT_UNIDENTIFIABLE",
        plannedUsePacketIds: ["de_l13_c07_s56"],
        communicativeUse:
          "state Die Gruppe ist groß. as the coordinator's bounded selection criterion",
      }) ||
    JSON.stringify(c07OwnerProjection(gross)) !==
      JSON.stringify({
        id: "de_lex_plan_l13_c07_gross_v1",
        semanticIdentity: "groß|large in participant count",
        lemmaOrExpression: "groß",
        partOfSpeech: "adjective",
        lexicalKind: "ADJECTIVE_LEXEME",
        nounPackage: null,
        nounPackageIdentity: undefined,
        verbPackage: null,
        utilityRole: "quality",
        situationFacet: "goal",
        facetValue: L13_C07_NEW_SITUATION.goal,
        necessityClass: "OUTCOME_UNACHIEVABLE",
        plannedUsePacketIds: ["de_l13_c07_s56"],
        communicativeUse:
          "use Die Gruppe ist groß. with uninflected groß to state the criterion that makes geräumig relevant",
      })
  ) {
    throw new Error("l13_semantic_contract_invalid:c07_final_transfer");
  }
  const probes = [51, 52, 53, 54, 55, 56, 55].map(
    (session) => `de_l14_c07_s${session}`,
  );
  const incoming = [51, 52, 53, 54, 55, 56, 55].map(
    (session) => `de_l13_c07_s${session}`,
  );
  const l12 = (raw.lessons as R[]).find(
    (lesson) => lesson.lessonId === "de_l12",
  ) as R;
  if (
    JSON.stringify(
      (l12.chapters as R[]).map(
        (chapter) =>
          ((chapter.recallSchedule as R).futureDelayedProbe as R).packetId,
      ),
    ) !== JSON.stringify(incoming)
  )
    throw new Error("l12_l13_inverse_provenance_invalid");
  if (
    JSON.stringify(
      chapters.map(
        (chapter) =>
          ((chapter.recallSchedule as R).futureDelayedProbe as R).packetId,
      ),
    ) !== JSON.stringify(probes)
  )
    throw new Error("l13_l14_inverse_provenance_invalid");
  for (let i = 0; i < 7; i += 1) {
    const chapter = chapters[i],
      checkpoint = chapter.checkpoint as R,
      hashes = L13_HASHES[i],
      allowed = i === 6 ? L13_FINAL_REQUIRED : L13_ALLOWED;
    if (
      JSON.stringify(chapter.allowedConstructIds) !== JSON.stringify(allowed) ||
      JSON.stringify(checkpoint.integratedConstructIds) !==
        JSON.stringify(allowed) ||
      JSON.stringify(chapter.prohibitedConstructIds) !==
        JSON.stringify(L13_PROHIBITED)
    )
      throw new Error("l13_semantic_contract_invalid:sets");
    if (l13Hash(chapter.lifecycleAnchors) !== hashes[2])
      throw new Error("l13_semantic_contract_invalid:anchors");
    if (l13Hash([chapter.situation, checkpoint.newSituation]) !== hashes[1])
      throw new Error("l13_semantic_contract_invalid:situations");
    if (l13Hash(chapter.chapterEvidencePacketIds) !== hashes[3])
      throw new Error("l13_semantic_contract_invalid:evidence");
    if (
      l13Hash([
        (chapter.recallSchedule as R).retrievesFromChapterIds,
        (chapter.recallSchedule as R).targetsFutureChapterIds,
      ]) !== hashes[5]
    )
      throw new Error(
        `l13_recall_contract_invalid:de_l13_c${String(i + 1).padStart(2, "0")}`,
      );
    const surface = l11ChapterSurfaceText(chapter);
    if (!surface.includes(L13_MODELS[i]))
      throw new Error("l13_semantic_contract_invalid:models");
    const boundedSurface = surface
      .replaceAll(L13_MODELS[i], "")
      .replace("without an ending table", "");
    if (
      /\b(?:ein|eine|einen|einem|einer)\s+\p{L}+|\b(?:bare adjective|Genitiv|plural adjective|strong-weak-mixed|comparative|superlative|nicht-focus|doch|future grammar|ending table)\b/iu.test(
        boundedSurface,
      ) ||
      /ist (?:ruhige|leichte|helle|stabile|erfahrene|praktische|geräumige)\b|\b(?:das ruhig Zimmer|der leicht Koffer|die hell Wohnung|den (?:stabil|stabile) Koffer|dem (?:erfahren|erfahrene) Helfer|den (?:praktisch|praktische) Koffer|der geräumig Gruppenraum|in den geräumig Gruppenraum|im geräumig Gruppenraum)\b/iu.test(
        boundedSurface,
      )
    )
      throw new Error("l13_semantic_contract_invalid:bounded_agreement");
    if (l13Hash(chapter.supportFading) !== hashes[0])
      throw new Error("l13_semantic_contract_invalid:support_fading");
    if (l13Hash(checkpoint.plannedNewLexicalSenses) !== hashes[4])
      throw new Error("l13_semantic_contract_invalid:lexical_packages");
  }
}

const L14_ALLOWED = [
  "de_gc_nicht_position_focus_v1",
  "de_gc_doch_response_contrast_v1",
  "de_gc_nein_nicht_contrast_v1",
  "de_gc_yes_no_verberst_v1",
  "de_gc_kein_nominal_negation_v1",
  "de_gc_predicative_adjective_v1",
  "de_gc_staged_nominal_group_agreement_v1",
] as const;
const L14_FINAL_REQUIRED = [
  L14_ALLOWED[0],
  L14_ALLOWED[1],
  L14_ALLOWED[5],
  L14_ALLOWED[6],
] as const;
const L14_PROHIBITED = [
  "de_gc_controlled_partizip_ii_v1",
  "de_gc_perfekt_haben_classes_v1",
] as const;
const L14_NO_EXPANSION =
  "The lesson permits only bounded nicht placement against one explicit familiar focus and doch only as a response contradicting an explicit negative proposition inside known clause and question frames. Property descriptions remain inside the established predicative and definite-article agreement models. No free information-structure theory, generic substitution between ja and doch, doch as a modal particle or connective, universal nicht position, new case frame, Partizip II, Perfekt, subordinate clause, comparative or superlative, or future grammar is allowed.";
const L14_C06_REPAIR_ITEMS = [
  "Ich nicht buche das ruhige Zimmer. → Ich buche nicht das ruhige Zimmer.",
  "Ist das Zimmer nicht frei? Nein, das Zimmer ist frei. → Ist das Zimmer nicht frei? Doch, das Zimmer ist frei.",
] as const;
const L14_C06_MODEL = `Das ist falsch. ${L14_C06_REPAIR_ITEMS.map(
  (item, index) => `[${index + 1}] ${item}`,
).join(" ")}`;
const L14_MODELS = [
  "Ich buche nicht das ruhige Zimmer. Ich buche das helle Zimmer. Das helle Zimmer ist nicht frei. Doch, das helle Zimmer ist frei.",
  "Ich buche nicht das Doppelzimmer. Ich buche das ruhige Zimmer.",
  "Ist das Frühstück nicht inklusive? Doch, das Frühstück ist inklusive.",
  "Ist der Parkplatz nicht frei? Doch, der Parkplatz ist frei.",
  "Das Zimmer ist günstig. Ich buche nicht das ruhige Zimmer. Ich buche das günstige Zimmer. Ist das günstige Zimmer nicht frei? Doch, das günstige Zimmer ist frei.",
  L14_C06_MODEL,
  "Die Ferienwohnung ist zentral. Ich buche nicht die ruhige Ferienwohnung. Ich buche die zentrale Ferienwohnung. Ist die zentrale Ferienwohnung nicht frei? Doch, die zentrale Ferienwohnung ist frei.",
] as const;
const L14_SITUATIONS = [
  [
    {
      setting: "hotel-booking-phone",
      participants: "guest-and-reservation-agent",
      goal: "recognize-that-nicht-selects-the-quiet-room-option-and-doch-reverses-the-explicit-negative-availability-statement",
      contextSignature: "hotel-room-focus-doch-introduction",
    },
    {
      setting: "guesthouse-booking-desk",
      participants: "guest-and-guesthouse-host",
      goal: "identify-the-rejected-room-option-and-the-negative-assumption-reversed-by-doch",
      contextSignature: "guesthouse-room-focus-recognition-check",
    },
  ],
  [
    {
      setting: "conference-hotel-room-selection",
      participants: "conference-attendee-and-booking-clerk",
      goal: "place-nicht-before-the-explicitly-rejected-doppelzimmer-option",
      contextSignature: "doppelzimmer-bounded-nicht-placement",
    },
    {
      setting: "training-centre-accommodation-booking",
      participants: "course-participant-and-reservation-clerk",
      goal: "independently-reject-the-doppelzimmer-and-select-the-familiar-ruhige-zimmer",
      contextSignature: "training-centre-doppelzimmer-focus-check",
    },
  ],
  [
    {
      setting: "hotel-breakfast-inclusion-check",
      participants: "guest-and-front-desk-agent",
      goal: "recognize-the-negative-breakfast-inclusion-proposition-that-licenses-doch",
      contextSignature: "breakfast-negative-proposition-recognition",
    },
    {
      setting: "guesthouse-breakfast-booking-check",
      participants: "guest-and-guesthouse-host",
      goal: "identify-the-negative-breakfast-assumption-and-match-the-doch-response",
      contextSignature: "guesthouse-breakfast-doch-check",
    },
  ],
  [
    {
      setting: "hotel-parking-availability-call",
      participants: "guest-and-reservation-agent",
      goal: "contradict-negative-parking-availability-assumption-with-doch",
      contextSignature: "hotel-parking-doch-production",
    },
    {
      setting: "conference-hotel-parking-desk",
      participants: "conference-attendee-and-booking-clerk",
      goal: "independently-answer-the-negative-parkplatz-availability-question-with-doch-and-a-positive-clause",
      contextSignature: "conference-parking-doch-check",
    },
  ],
  [
    {
      setting: "hotel-room-rate-correction",
      participants: "guest-and-rate-agent",
      goal: "clarify-the-chosen-room-quality-and-correct-the-rejected-option-and-negative-availability-assumption",
      contextSignature: "hotel-gunstig-focus-doch-integration",
    },
    {
      setting: "family-run-hotel-rate-desk",
      participants: "guest-and-hotel-host",
      goal: "independently-state-gunstig-select-das-gunstige-zimmer-and-reverse-the-negative-availability-assumption",
      contextSignature: "family-hotel-gunstig-correction-check",
    },
  ],
  [
    {
      setting: "booking-confirmation-correction-desk",
      participants: "guest-and-booking-editor",
      goal: "repair-explicit-object-focus-nicht-placement-and-nein-doch-response-confusion",
      contextSignature: "booking-focus-particle-repair",
    },
    {
      setting: "hostel-booking-quality-check",
      participants: "guest-and-hostel-clerk",
      goal: "repair-both-focus-and-response-errors-without-new-grammar",
      contextSignature: "hostel-booking-dual-repair-check",
    },
  ],
  [
    {
      setting: "holiday-apartment-booking-call",
      participants: "traveller-and-tourism-office-agent",
      goal: "identify-the-wrong-quiet-apartment-assumption-and-confirm-the-central-apartment",
      contextSignature: "holiday-apartment-focus-doch-final-transfer",
    },
    {
      setting: "regional-tourism-office-apartment-rebooking",
      participants: "visitor-and-regional-booking-agent",
      goal: "independently-correct-the-assumed-apartment-choice-and-confirm-the-central-option-is-free",
      contextSignature: "regional-apartment-correction-final",
    },
  ],
] as const;
const L14_SUPPORT = L14_MODELS.map((model, index) => ({
  entryLevel: [5, 5, 4, 4, 3, 3, 2][index],
  exitLevel: [2, 2, 1, 1, 1, 1, 0][index],
  entry: model,
  exit: model,
  independentEvidenceByPacketId: `de_l14_c${String(index + 1).padStart(2, "0")}_s${String((index + 1) * 8).padStart(2, "0")}`,
}));
const L14_ANCHORS = [
  [
    {
      constructId: L14_ALLOWED[0],
      stage: "introduction",
      packetId: "de_l14_c01_s01",
    },
    {
      constructId: L14_ALLOWED[1],
      stage: "introduction",
      packetId: "de_l14_c01_s02",
    },
  ],
  [
    {
      constructId: L14_ALLOWED[0],
      stage: "guided",
      packetId: "de_l14_c02_s09",
    },
    {
      constructId: L14_ALLOWED[1],
      stage: "guided",
      packetId: "de_l14_c02_s10",
    },
  ],
  [
    {
      constructId: L14_ALLOWED[0],
      stage: "retrieval",
      packetId: "de_l14_c03_s17",
    },
    {
      constructId: L14_ALLOWED[1],
      stage: "retrieval",
      packetId: "de_l14_c03_s18",
    },
  ],
  [
    {
      constructId: L14_ALLOWED[0],
      stage: "production",
      packetId: "de_l14_c04_s25",
    },
    {
      constructId: L14_ALLOWED[1],
      stage: "production",
      packetId: "de_l14_c04_s26",
    },
  ],
  [],
  [
    {
      constructId: L14_ALLOWED[0],
      stage: "transfer",
      packetId: "de_l14_c06_s41",
    },
    {
      constructId: L14_ALLOWED[1],
      stage: "transfer",
      packetId: "de_l14_c06_s42",
    },
  ],
  [
    {
      constructId: L14_ALLOWED[5],
      stage: "delayed",
      packetId: "de_l14_c07_s49",
    },
    {
      constructId: L14_ALLOWED[6],
      stage: "delayed",
      packetId: "de_l14_c07_s50",
    },
  ],
] as const;
const L14_EVIDENCE = [
  ["de_l14_c01_s03", "de_l14_c01_s04"],
  ["de_l14_c02_s11", "de_l14_c02_s12"],
  ["de_l14_c03_s19", "de_l14_c03_s20"],
  ["de_l14_c04_s27", "de_l14_c04_s28"],
  ["de_l14_c05_s35", "de_l14_c05_s36"],
  ["de_l14_c06_s43", "de_l14_c06_s44"],
  [
    "de_l14_c07_s51",
    "de_l14_c07_s52",
    "de_l14_c07_s53",
    "de_l14_c07_s54",
    "de_l14_c07_s55",
    "de_l14_c07_s56",
  ],
] as const;
const L14_RECALL = [
  [["de_l13_c06", "de_l13_c07"], ["de_l14_c02"]],
  [["de_l13_c07", "de_l14_c01"], ["de_l14_c03"]],
  [["de_l14_c01", "de_l14_c02"], ["de_l14_c04"]],
  [["de_l14_c02", "de_l14_c03"], ["de_l14_c05"]],
  [["de_l14_c03", "de_l14_c04"], ["de_l14_c06"]],
  [["de_l14_c04", "de_l14_c05"], ["de_l14_c07"]],
  [["de_l14_c05", "de_l14_c06"], ["de_l15_c01"]],
] as const;
const L14_LEXICAL_SPECS = [
  [
    {
      id: "de_lex_plan_l14_c01_buchen_v1",
      semanticIdentity: "buchen|reserve one specified accommodation option",
      lemmaOrExpression: "buchen",
      partOfSpeech: "verb",
      lexicalKind: "VERB_LEXEME",
      nounPackage: null,
      verbPackage: {
        infinitive: "buchen",
        valencyFrame:
          "booking frame selecting one explicit accusative accommodation option",
        separability: "inseparable",
        perfectAuxiliary: "haben",
      },
      utilityRole: "action",
      situationFacet: "goal",
      facetValue: L14_SITUATIONS[0][1].goal,
      necessityClass: "OUTCOME_UNACHIEVABLE",
      senseGloss: "reserve one specified accommodation option",
      communicativeUse: L14_MODELS[0],
    },
  ],
  [
    {
      id: "de_lex_plan_l14_c02_doppelzimmer_v1",
      semanticIdentity: "doppelzimmer|hotel room intended for two occupants",
      lemmaOrExpression: "Doppelzimmer",
      partOfSpeech: "noun",
      lexicalKind: "NOUN_LEXEME",
      nounPackage: {
        article: "das",
        singular: "Doppelzimmer",
        plural: "Doppelzimmer",
      },
      nounPackageIdentity: "das|doppelzimmer|doppelzimmer",
      verbPackage: null,
      utilityRole: "scene_grounding",
      situationFacet: "setting",
      facetValue: L14_SITUATIONS[1][1].setting,
      necessityClass: "SCENE_UNGROUNDED",
      senseGloss: "hotel room intended for two occupants",
      communicativeUse: L14_MODELS[1],
    },
  ],
  [
    {
      id: "de_lex_plan_l14_c03_fruehstueck_v1",
      semanticIdentity:
        "fruhstuck|morning meal included or excluded in an accommodation booking",
      lemmaOrExpression: "Frühstück",
      partOfSpeech: "noun",
      lexicalKind: "NOUN_LEXEME",
      nounPackage: {
        article: "das",
        singular: "Frühstück",
        plural: "Frühstücke",
      },
      nounPackageIdentity: "das|fruhstuck|fruhstucke",
      verbPackage: null,
      utilityRole: "scene_grounding",
      situationFacet: "setting",
      facetValue: L14_SITUATIONS[2][1].setting,
      necessityClass: "SCENE_UNGROUNDED",
      senseGloss:
        "morning meal included or excluded in an accommodation booking",
      communicativeUse: L14_MODELS[2],
    },
    {
      id: "de_lex_plan_l14_c03_inklusive_v1",
      semanticIdentity:
        "inklusive|included in the stated booking price or package",
      lemmaOrExpression: "inklusive",
      partOfSpeech: "adjective",
      lexicalKind: "ADJECTIVE_LEXEME",
      nounPackage: null,
      verbPackage: null,
      utilityRole: "quality",
      situationFacet: "goal",
      facetValue: L14_SITUATIONS[2][1].goal,
      necessityClass: "OUTCOME_UNACHIEVABLE",
      senseGloss: "included in the stated booking price or package",
      communicativeUse: L14_MODELS[2],
    },
  ],
  [
    {
      id: "de_lex_plan_l14_c04_parkplatz_v1",
      semanticIdentity: "parkplatz|designated place for parking one vehicle",
      lemmaOrExpression: "Parkplatz",
      partOfSpeech: "noun",
      lexicalKind: "NOUN_LEXEME",
      nounPackage: {
        article: "der",
        singular: "Parkplatz",
        plural: "Parkplätze",
      },
      nounPackageIdentity: "der|parkplatz|parkplatze",
      verbPackage: null,
      utilityRole: "scene_grounding",
      situationFacet: "setting",
      facetValue: L14_SITUATIONS[3][1].setting,
      necessityClass: "SCENE_UNGROUNDED",
      senseGloss: "designated place for parking one vehicle",
      communicativeUse: L14_MODELS[3],
    },
  ],
  [
    {
      id: "de_lex_plan_l14_c05_gunstig_v1",
      semanticIdentity: "gunstig|reasonably priced for the stated booking",
      lemmaOrExpression: "günstig",
      partOfSpeech: "adjective",
      lexicalKind: "ADJECTIVE_LEXEME",
      nounPackage: null,
      verbPackage: null,
      utilityRole: "quality",
      situationFacet: "goal",
      facetValue: L14_SITUATIONS[4][1].goal,
      necessityClass: "OUTCOME_UNACHIEVABLE",
      senseGloss: "reasonably priced for the stated booking",
      communicativeUse: L14_MODELS[4],
    },
  ],
  [
    {
      id: "de_lex_plan_l14_c06_falsch_v1",
      semanticIdentity: "falsch|incorrect in the booking detail under repair",
      lemmaOrExpression: "falsch",
      partOfSpeech: "adjective",
      lexicalKind: "ADJECTIVE_LEXEME",
      nounPackage: null,
      verbPackage: null,
      utilityRole: "repair",
      situationFacet: "goal",
      facetValue: L14_SITUATIONS[5][1].goal,
      necessityClass: "REPAIR_UNAVAILABLE",
      senseGloss: "incorrect in the booking detail under repair",
      communicativeUse: L14_MODELS[5],
    },
  ],
  [
    {
      id: "de_lex_plan_l14_c07_ferienwohnung_v1",
      semanticIdentity:
        "ferienwohnung|self-contained holiday accommodation offered for booking",
      lemmaOrExpression: "Ferienwohnung",
      partOfSpeech: "noun",
      lexicalKind: "NOUN_LEXEME",
      nounPackage: {
        article: "die",
        singular: "Ferienwohnung",
        plural: "Ferienwohnungen",
      },
      nounPackageIdentity: "die|ferienwohnung|ferienwohnungen",
      verbPackage: null,
      utilityRole: "scene_grounding",
      situationFacet: "setting",
      facetValue: L14_SITUATIONS[6][1].setting,
      necessityClass: "SCENE_UNGROUNDED",
      senseGloss: "self-contained holiday accommodation offered for booking",
      communicativeUse: L14_MODELS[6],
    },
    {
      id: "de_lex_plan_l14_c07_zentral_v1",
      semanticIdentity: "zentral|located near the centre for the stated stay",
      lemmaOrExpression: "zentral",
      partOfSpeech: "adjective",
      lexicalKind: "ADJECTIVE_LEXEME",
      nounPackage: null,
      verbPackage: null,
      utilityRole: "transfer",
      situationFacet: "goal",
      facetValue: L14_SITUATIONS[6][1].goal,
      necessityClass: "TRANSFER_UNAVAILABLE",
      senseGloss: "located near the centre for the stated stay",
      communicativeUse: L14_MODELS[6],
    },
  ],
] as const;
function l14LexicalProjection(sense: R): unknown {
  const utility = sense.utilityProof as R;
  return {
    id: sense.id,
    semanticIdentity: sense.semanticIdentity,
    lemmaOrExpression: sense.lemmaOrExpression,
    partOfSpeech: sense.partOfSpeech,
    lexicalKind: sense.lexicalKind,
    nounPackage: sense.nounPackage,
    nounPackageIdentity: sense.nounPackageIdentity,
    verbPackage: sense.verbPackage,
    lemmaStatus: sense.lemmaStatus,
    contrastsWithSenseId: sense.contrastsWithSenseId,
    contrastEvidence: sense.contrastEvidence,
    chapterOutcomeId: sense.chapterOutcomeId,
    utilityProof: {
      chapterOutcomeId: utility.chapterOutcomeId,
      checkpointPacketId: utility.checkpointPacketId,
      integratedConstructIds: utility.integratedConstructIds,
      utilityRole: utility.utilityRole,
      situationFacet: utility.situationFacet,
      facetValue: utility.facetValue,
      necessityClass: utility.necessityClass,
      plannedUsePacketIds: utility.plannedUsePacketIds,
    },
    senseGloss: sense.senseGloss,
    communicativeUse: sense.communicativeUse,
  };
}
function l14ExpectedLexicalProjection(
  chapterIndex: number,
  spec: (typeof L14_LEXICAL_SPECS)[number][number],
): unknown {
  const chapter = String(chapterIndex + 1).padStart(2, "0"),
    checkpoint = `de_l14_c${chapter}_s${String((chapterIndex + 1) * 8).padStart(2, "0")}`,
    allowed = chapterIndex === 6 ? L14_FINAL_REQUIRED : L14_ALLOWED,
    {
      utilityRole,
      situationFacet,
      facetValue,
      necessityClass,
      senseGloss,
      communicativeUse,
      ...sense
    } = spec;
  return {
    ...sense,
    lemmaStatus: "FIRST_MEANING",
    contrastsWithSenseId: null,
    contrastEvidence: null,
    chapterOutcomeId: `de_l14_ch${chapter}`,
    utilityProof: {
      chapterOutcomeId: `de_l14_ch${chapter}`,
      checkpointPacketId: checkpoint,
      integratedConstructIds: allowed,
      utilityRole,
      situationFacet,
      facetValue,
      necessityClass,
      plannedUsePacketIds: [checkpoint],
    },
    senseGloss,
    communicativeUse,
  };
}
function validateL14SemanticContract(raw: R, plan: Boundary): void {
  const l14 = (raw.lessons as R[]).find(
    (lesson) => lesson.lessonId === "de_l14",
  );
  if (!l14) throw new Error("l14_semantic_contract_invalid:sets");
  const chapters = l14.chapters as R[],
    boundary = l14.grammarBoundary as R;
  if (boundary.noExpansion !== L14_NO_EXPANSION)
    throw new Error("l14_semantic_contract_invalid:no_expansion");
  if (
    JSON.stringify(plan.introducedConstructIds) !==
      JSON.stringify(L14_ALLOWED.slice(0, 2)) ||
    JSON.stringify(plan.extendedConstructIds) !==
      JSON.stringify(L14_ALLOWED.slice(2, 4)) ||
    JSON.stringify(plan.reviewedConstructIds) !==
      JSON.stringify(L14_ALLOWED.slice(4)) ||
    JSON.stringify(plan.prohibitedConstructIds) !==
      JSON.stringify(L14_PROHIBITED) ||
    JSON.stringify(boundary.allowedConstructIds) !==
      JSON.stringify(L14_ALLOWED) ||
    JSON.stringify(boundary.prohibitedConstructIds) !==
      JSON.stringify(L14_PROHIBITED) ||
    JSON.stringify((plan.session56Final as R).requiredConstructIds) !==
      JSON.stringify(L14_FINAL_REQUIRED) ||
    chapters.length !== 7
  )
    throw new Error("l14_semantic_contract_invalid:sets");

  const c06 = chapters[5],
    c07 = chapters[6],
    c06Support = c06.supportFading as R,
    c07Support = c07.supportFading as R,
    c07Checkpoint = c07.checkpoint as R;
  if (
    c06Support.entry !== L14_C06_MODEL ||
    c06Support.exit !== L14_C06_MODEL ||
    /(?:;|；|\|)|\band\b/iu.test(
      `${String(c06Support.entry)} ${String(c06Support.exit)}`,
    ) ||
    (String(c06Support.entry).match(/\[1\]/gu) ?? []).length !== 1 ||
    (String(c06Support.entry).match(/\[2\]/gu) ?? []).length !== 1 ||
    (String(c06Support.entry).match(/→/gu) ?? []).length !== 2
  )
    throw new Error("l14_semantic_contract_invalid:c06_repair_items");
  if (
    JSON.stringify(c07.situation) !== JSON.stringify(L14_SITUATIONS[6][0]) ||
    JSON.stringify(c07Checkpoint.newSituation) !==
      JSON.stringify(L14_SITUATIONS[6][1]) ||
    c07Support.entry !== L14_MODELS[6] ||
    c07Support.exit !== L14_MODELS[6] ||
    !String(c07Support.entry).includes(
      "Ich buche die zentrale Ferienwohnung.",
    ) ||
    !String(c07Support.entry).includes("Die Ferienwohnung ist zentral.") ||
    !String(c07Support.entry).includes(
      "Ist die zentrale Ferienwohnung nicht frei? Doch, die zentrale Ferienwohnung ist frei.",
    )
  )
    throw new Error("l14_semantic_contract_invalid:c07_final_transfer");

  const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R,
    incoming = [51, 52, 53, 54, 55, 56, 55].map(
      (session) => `de_l14_c07_s${session}`,
    ),
    outgoing = [51, 52, 53, 54, 55, 56, 55].map(
      (session) => `de_l15_c07_s${session}`,
    );
  if (
    !l13 ||
    JSON.stringify(
      (l13.chapters as R[]).map(
        (chapter) =>
          ((chapter.recallSchedule as R).futureDelayedProbe as R).packetId,
      ),
    ) !== JSON.stringify(incoming) ||
    JSON.stringify(c07.chapterEvidencePacketIds) !==
      JSON.stringify(L14_EVIDENCE[6])
  )
    throw new Error("l13_l14_inverse_provenance_invalid");
  if (
    JSON.stringify(
      chapters.map(
        (chapter) =>
          ((chapter.recallSchedule as R).futureDelayedProbe as R).packetId,
      ),
    ) !== JSON.stringify(outgoing)
  )
    throw new Error("l14_l15_inverse_provenance_invalid");

  for (let index = 0; index < chapters.length; index += 1) {
    const chapter = chapters[index],
      checkpoint = chapter.checkpoint as R,
      allowed = index === 6 ? L14_FINAL_REQUIRED : L14_ALLOWED,
      recall = chapter.recallSchedule as R,
      senses = checkpoint.plannedNewLexicalSenses as R[];
    if (
      JSON.stringify(chapter.allowedConstructIds) !== JSON.stringify(allowed) ||
      JSON.stringify(checkpoint.integratedConstructIds) !==
        JSON.stringify(allowed) ||
      JSON.stringify(chapter.prohibitedConstructIds) !==
        JSON.stringify(L14_PROHIBITED)
    )
      throw new Error("l14_semantic_contract_invalid:sets");
    if (
      JSON.stringify(chapter.lifecycleAnchors) !==
      JSON.stringify(L14_ANCHORS[index])
    )
      throw new Error("l14_semantic_contract_invalid:anchors");
    if (
      index < 6 &&
      JSON.stringify([chapter.situation, checkpoint.newSituation]) !==
        JSON.stringify(L14_SITUATIONS[index])
    )
      throw new Error("l14_semantic_contract_invalid:situations");
    if (
      JSON.stringify(chapter.chapterEvidencePacketIds) !==
      JSON.stringify(L14_EVIDENCE[index])
    )
      throw new Error("l14_semantic_contract_invalid:evidence");
    if (
      JSON.stringify([
        recall.retrievesFromChapterIds,
        recall.targetsFutureChapterIds,
      ]) !== JSON.stringify(L14_RECALL[index])
    )
      throw new Error(
        `l14_recall_contract_invalid:de_l14_c${String(index + 1).padStart(2, "0")}`,
      );
    const surface = l11ChapterSurfaceText(chapter);
    if (!surface.includes(L14_MODELS[index]))
      throw new Error("l14_semantic_contract_invalid:models");
    const boundedSurface = [
      chapter.situation,
      chapter.supportFading,
      checkpoint.newSituation,
      ...senses.map((sense) => sense.communicativeUse),
    ]
      .map((value) => JSON.stringify(value))
      .join(" ")
      .replaceAll(L14_MODELS[index], "");
    if (
      /\bIch nicht buche\b|\buniversal nicht(?:-| )position\b|\bfree information-structure\b|\bgeneric ja(?:↔|<->| to )doch\b|\bdoch replaces ja\b|\bmodal doch\b|\bconnective doch\b|\bNein, das (?:Zimmer|Frühstück|Parkplatz|Ferienwohnung) ist (?:frei|inklusive)\b|\bnew case\b|\bPartizip II\b|\bPerfekt\b|\bsubordinate clauses?\b|\bcomparative\b|\bsuperlative\b|\bfuture grammar\b/iu.test(
        boundedSurface,
      )
    )
      throw new Error("l14_future_grammar_leak");
    if (
      JSON.stringify(chapter.supportFading) !==
      JSON.stringify(L14_SUPPORT[index])
    )
      throw new Error("l14_semantic_contract_invalid:support_fading");
    if (
      senses.length !== L14_LEXICAL_SPECS[index].length ||
      JSON.stringify(senses.map(l14LexicalProjection)) !==
        JSON.stringify(
          L14_LEXICAL_SPECS[index].map((spec) =>
            l14ExpectedLexicalProjection(index, spec),
          ),
        )
    )
      throw new Error("l14_semantic_contract_invalid:lexical_packages");
  }
}

const L15_ALLOWED = [
  "de_gc_controlled_partizip_ii_v1",
  "de_gc_perfekt_haben_classes_v1",
  "de_gc_finite_haben_present_v1",
  "de_gc_separable_verb_bracket_v1",
  "de_gc_temporal_preposition_governed_case_v1",
  "de_gc_nicht_position_focus_v1",
  "de_gc_doch_response_contrast_v1",
] as const;
const L15_FINAL = [
  L15_ALLOWED[0],
  L15_ALLOWED[1],
  L15_ALLOWED[5],
  L15_ALLOWED[6],
] as const;
const L15_PROHIBITED = [
  "de_gc_perfekt_sein_classes_v1",
  "de_gc_spoken_preterite_island_v1",
] as const;
const L15_NO_EXPANSION =
  "The lesson permits only verified Partizip II forms stored as lexical wholes and finite haben plus one controlled participle in the Perfekt bracket for verified haben-selecting lexical classes. Existing separable brackets, temporal Akkusativ, bounded nicht focus and doch response contrast remain retrieval support only. The newly grounded lexical temporal adverbs zuerst and dann do not introduce connector-topology grammar. No universal participle-formation rule, productive ge- or suffix guessing, unverified participle, sein auxiliary class, movement-equals-sein heuristic, spoken or narrative Präteritum, subordinate-clause word order, connector-topology expansion, passive, modal perfect, new case frame, new preposition relation or future grammar is allowed.";
const L15_MODELS = [
  [
    "Erledigt. Ich habe den Einkauf erledigt.",
    "Ich habe den Einkauf erledigt.",
  ],
  ["Ich habe die Rechnung bezahlt.", "Ich habe die Rechnung bezahlt."],
  [
    "Ich habe den Termin für den Vormittag bestätigt.",
    "Ich habe den Termin für den Vormittag bestätigt.",
  ],
  [
    "Zuerst habe ich das Formular abgegeben. Dann habe ich die Rechnung bezahlt.",
    "Zuerst habe ich das Formular abgegeben. Dann habe ich die Rechnung bezahlt.",
  ],
  [
    "Haben Sie das Fahrrad repariert? Ja, ich habe das Fahrrad repariert.",
    "Haben Sie das Fahrrad repariert? Ja, ich habe das Fahrrad repariert.",
  ],
  [
    "Das ist falsch. [1] Ich habe bezahlt die Rechnung. → Ich habe die Rechnung bezahlt. [2] Ich habe das Formular abgeben. → Ich habe das Formular abgegeben. Ich habe den Fehler korrigiert.",
    "Das ist falsch. [1] Ich habe bezahlt die Rechnung. → Ich habe die Rechnung bezahlt. [2] Ich habe das Formular abgeben. → Ich habe das Formular abgegeben. Ich habe den Fehler korrigiert.",
  ],
  [
    "Du hast das Medikament nicht abgeholt. Doch, ich habe das Medikament abgeholt. Ich habe die Quittung nicht abgegeben.",
    "Du hast das Medikament nicht abgeholt. Doch, ich habe das Medikament abgeholt. Ich habe die Quittung nicht abgegeben.",
  ],
] as const;
const L15_SITUATIONS = [
  [
    {
      setting: "shared-flat-evening-errand-update",
      participants: "resident-and-flatmate",
      goal: "recognize-erledigt-as-the-complete-verified-participle-in-a-shared-flat-shopping-update",
      contextSignature: "shared-flat-shopping-participle-introduction",
    },
    {
      setting: "family-household-shopping-handover",
      participants: "family-member-and-relative",
      goal: "independently-recognize-erledigt-and-report-the-completed-household-shopping-errand",
      contextSignature: "household-shopping-participle-check",
    },
  ],
  [
    {
      setting: "utility-payment-counter",
      participants: "customer-and-payment-clerk",
      goal: "place-habe-left-and-bezahlt-right-around-the-explicit-rechnung-object",
      contextSignature: "rechnung-perfekt-bracket-guidance",
    },
    {
      setting: "housing-office-payment-desk",
      participants: "tenant-and-payment-agent",
      goal: "independently-place-finite-haben-and-bezahlt-around-die-rechnung",
      contextSignature: "housing-rechnung-bracket-check",
    },
  ],
  [
    {
      setting: "appointment-service-phone-call",
      participants: "customer-and-service-agent",
      goal: "report-that-the-morning-appointment-was-confirmed",
      contextSignature: "termin-confirmation-completed-action",
    },
    {
      setting: "clinic-appointment-line",
      participants: "patient-and-receptionist",
      goal: "independently-report-the-confirmed-morning-appointment",
      contextSignature: "clinic-termin-confirmation-check",
    },
  ],
  [
    {
      setting: "municipal-service-errand-update",
      participants: "resident-and-housemate",
      goal: "sequence-form-submission-before-bill-payment-with-newly-grounded-zuerst-and-dann",
      contextSignature: "formular-rechnung-temporal-adverb-sequence",
    },
    {
      setting: "community-centre-admin-desk",
      participants: "volunteer-and-coordinator",
      goal: "independently-sequence-the-completed-form-and-payment-errands-with-zuerst-and-dann",
      contextSignature: "community-admin-temporal-adverb-sequence-check",
    },
  ],
  [
    {
      setting: "bicycle-repair-pickup-call",
      participants: "customer-and-workshop-clerk",
      goal: "ask-and-answer-whether-the-specified-bicycle-was-repaired",
      contextSignature: "fahrrad-repair-completion-exchange",
    },
    {
      setting: "neighbourhood-repair-workshop",
      participants: "bicycle-owner-and-mechanic",
      goal: "independently-ask-and-answer-about-the-completed-bicycle-repair",
      contextSignature: "workshop-fahrrad-repair-check",
    },
  ],
  [
    {
      setting: "service-report-quality-check",
      participants: "trainee-and-service-supervisor",
      goal: "repair-one-bracket-order-error-and-one-unverified-infinitive-for-participle-error",
      contextSignature: "perfekt-dual-error-repair",
    },
    {
      setting: "volunteer-office-report-review",
      participants: "volunteer-and-coordinator",
      goal: "independently-repair-both-the-bracket-and-controlled-participle-errors",
      contextSignature: "volunteer-report-dual-repair-check",
    },
  ],
  [
    {
      setting: "pharmacy-errand-update",
      participants: "customer-and-housemate",
      goal: "correct-the-negative-assumption-about-the-collected-medication-and-state-that-the-receipt-remains-unsubmitted",
      contextSignature: "medikament-quittung-changed-errand-transfer",
    },
    {
      setting: "after-hours-family-errand-call",
      participants: "family-member-and-relative",
      goal: "independently-report-the-collected-medication-and-the-still-unsubmitted-receipt",
      contextSignature: "family-medication-receipt-final-transfer",
    },
  ],
] as const;
const L15_LEVELS = [
  [5, 2],
  [5, 2],
  [4, 1],
  [4, 1],
  [3, 1],
  [3, 1],
  [2, 0],
] as const;
const L15_ANCHORS = [
  "introduction",
  "guided",
  "retrieval",
  "production",
  null,
  "transfer",
  "delayed",
].map((stage, index) =>
  stage
    ? [
        {
          constructId: index === 6 ? L15_ALLOWED[5] : L15_ALLOWED[0],
          stage,
          packetId: `de_l15_c${String(index + 1).padStart(2, "0")}_s${String(index * 8 + 1).padStart(2, "0")}`,
        },
        {
          constructId: index === 6 ? L15_ALLOWED[6] : L15_ALLOWED[1],
          stage,
          packetId: `de_l15_c${String(index + 1).padStart(2, "0")}_s${String(index * 8 + 2).padStart(2, "0")}`,
        },
      ]
    : [],
);
const L15_EVIDENCE = [3, 11, 19, 27, 35, 43]
  .map((start, index) => [
    `de_l15_c${String(index + 1).padStart(2, "0")}_s${String(start).padStart(2, "0")}`,
    `de_l15_c${String(index + 1).padStart(2, "0")}_s${String(start + 1).padStart(2, "0")}`,
  ])
  .concat([
    [
      "de_l15_c07_s51",
      "de_l15_c07_s52",
      "de_l15_c07_s53",
      "de_l15_c07_s54",
      "de_l15_c07_s55",
      "de_l15_c07_s56",
    ],
  ]);
const L15_RECALL = [
  [["de_l14_c06", "de_l14_c07"], ["de_l15_c02"]],
  [["de_l14_c07", "de_l15_c01"], ["de_l15_c03"]],
  [["de_l15_c01", "de_l15_c02"], ["de_l15_c04"]],
  [["de_l15_c02", "de_l15_c03"], ["de_l15_c05"]],
  [["de_l15_c03", "de_l15_c04"], ["de_l15_c06"]],
  [["de_l15_c04", "de_l15_c05"], ["de_l15_c07"]],
  [["de_l15_c05", "de_l15_c06"], ["de_l16_c01"]],
] as const;
const L15_OUTCOMES = [
  "recognise a verified participle as a complete lexical form",
  "place finite haben and a controlled participle in the bracket",
  "report one completed everyday action",
  "sequence two completed errands with newly grounded temporal adverbs zuerst and dann",
  "ask and answer about a completed service action",
  "repair auxiliary-bracket or controlled-participle errors",
  "transfer completed-event reporting to an unfamiliar errand chain",
] as const;
const L15_LEXICAL = [
  [
    {
      id: "de_lex_plan_l15_c01_erledigen_v1",
      semanticIdentity: "erledigen|complete a specified everyday task",
      lemmaOrExpression: "erledigen",
      partOfSpeech: "verb",
      lexicalKind: "VERB_LEXEME",
      nounPackage: null,
      verbPackage: {
        infinitive: "erledigen",
        valencyFrame:
          "transitive task-completion frame selecting one explicit accusative task",
        separability: "inseparable",
        perfectAuxiliary: "haben",
      },
      utilityRole: "action",
      situationFacet: "goal",
      facetValue: L15_SITUATIONS[0][1].goal,
      necessityClass: "OUTCOME_UNACHIEVABLE",
      senseGloss: "complete a specified everyday task",
      communicativeUse:
        "use Ich habe den Einkauf erledigt. to retrieve erledigt as a verified lexical whole and report the completed household shopping errand",
    },
    {
      id: "de_lex_plan_l15_c01_einkauf_v1",
      semanticIdentity: "einkauf|shopping errand treated as one completed task",
      lemmaOrExpression: "Einkauf",
      partOfSpeech: "noun",
      lexicalKind: "NOUN_LEXEME",
      nounPackage: { article: "der", singular: "Einkauf", plural: "Einkäufe" },
      nounPackageIdentity: "der|einkauf|einkaufe",
      verbPackage: null,
      utilityRole: "scene_grounding",
      situationFacet: "setting",
      facetValue: L15_SITUATIONS[0][1].setting,
      necessityClass: "SCENE_UNGROUNDED",
      senseGloss: "shopping errand treated as one completed task",
      communicativeUse:
        "ground the explicit household shopping errand in Ich habe den Einkauf erledigt. during the family household handover",
    },
  ],
  [
    {
      id: "de_lex_plan_l15_c02_bezahlen_v1",
      semanticIdentity: "bezahlen|pay one specified bill",
      lemmaOrExpression: "bezahlen",
      partOfSpeech: "verb",
      lexicalKind: "VERB_LEXEME",
      nounPackage: null,
      verbPackage: {
        infinitive: "bezahlen",
        valencyFrame: "payment frame selecting one explicit accusative bill",
        separability: "inseparable",
        perfectAuxiliary: "haben",
      },
      utilityRole: "action",
      situationFacet: "goal",
      facetValue: L15_SITUATIONS[1][1].goal,
      necessityClass: "OUTCOME_UNACHIEVABLE",
      senseGloss: "pay one specified bill",
      communicativeUse: L15_MODELS[1][1],
    },
    {
      id: "de_lex_plan_l15_c02_rechnung_v1",
      semanticIdentity: "rechnung|bill requiring payment",
      lemmaOrExpression: "Rechnung",
      partOfSpeech: "noun",
      lexicalKind: "NOUN_LEXEME",
      nounPackage: {
        article: "die",
        singular: "Rechnung",
        plural: "Rechnungen",
      },
      nounPackageIdentity: "die|rechnung|rechnungen",
      verbPackage: null,
      utilityRole: "scene_grounding",
      situationFacet: "setting",
      facetValue: L15_SITUATIONS[1][1].setting,
      necessityClass: "SCENE_UNGROUNDED",
      senseGloss: "bill requiring payment",
      communicativeUse: L15_MODELS[1][1],
    },
  ],
  [
    {
      id: "de_lex_plan_l15_c03_bestatigen_v1",
      semanticIdentity: "bestatigen|confirm one specified appointment",
      lemmaOrExpression: "bestätigen",
      partOfSpeech: "verb",
      lexicalKind: "VERB_LEXEME",
      nounPackage: null,
      verbPackage: {
        infinitive: "bestätigen",
        valencyFrame:
          "confirmation frame selecting one explicit accusative appointment",
        separability: "inseparable",
        perfectAuxiliary: "haben",
      },
      utilityRole: "action",
      situationFacet: "goal",
      facetValue: L15_SITUATIONS[2][1].goal,
      necessityClass: "OUTCOME_UNACHIEVABLE",
      senseGloss: "confirm one specified appointment",
      communicativeUse: L15_MODELS[2][1],
    },
  ],
  [
    {
      id: "de_lex_plan_l15_c04_abgeben_v1",
      semanticIdentity: "abgeben|submit one specified document",
      lemmaOrExpression: "abgeben",
      partOfSpeech: "verb",
      lexicalKind: "VERB_LEXEME",
      nounPackage: null,
      verbPackage: {
        infinitive: "abgeben",
        valencyFrame:
          "submission frame selecting one explicit accusative document",
        separability: "separable",
        perfectAuxiliary: "haben",
      },
      utilityRole: "action",
      situationFacet: "goal",
      facetValue: L15_SITUATIONS[3][1].goal,
      necessityClass: "OUTCOME_UNACHIEVABLE",
      senseGloss: "submit one specified document",
      communicativeUse: "Zuerst habe ich das Formular abgegeben.",
    },
    {
      id: "de_lex_plan_l15_c04_formular_v1",
      semanticIdentity: "formular|form submitted as one administrative errand",
      lemmaOrExpression: "Formular",
      partOfSpeech: "noun",
      lexicalKind: "NOUN_LEXEME",
      nounPackage: {
        article: "das",
        singular: "Formular",
        plural: "Formulare",
      },
      nounPackageIdentity: "das|formular|formulare",
      verbPackage: null,
      utilityRole: "scene_grounding",
      situationFacet: "setting",
      facetValue: L15_SITUATIONS[3][1].setting,
      necessityClass: "SCENE_UNGROUNDED",
      senseGloss: "form submitted as one administrative errand",
      communicativeUse: "Zuerst habe ich das Formular abgegeben.",
    },
    {
      id: "de_lex_plan_l15_c04_zuerst_v1",
      semanticIdentity:
        "zuerst|marks the first completed action in a stated sequence",
      lemmaOrExpression: "zuerst",
      partOfSpeech: "adverb",
      lexicalKind: "ADVERB_LEXEME",
      nounPackage: null,
      verbPackage: null,
      utilityRole: "temporal_spatial",
      situationFacet: "goal",
      facetValue: L15_SITUATIONS[3][1].goal,
      necessityClass: "OUTCOME_UNACHIEVABLE",
      senseGloss: "marks the first completed action in a stated sequence",
      communicativeUse:
        "use the newly grounded temporal adverb zuerst to mark the completed form submission as first",
    },
    {
      id: "de_lex_plan_l15_c04_dann_v1",
      semanticIdentity:
        "dann|marks the next completed action in a stated sequence",
      lemmaOrExpression: "dann",
      partOfSpeech: "adverb",
      lexicalKind: "ADVERB_LEXEME",
      nounPackage: null,
      verbPackage: null,
      utilityRole: "temporal_spatial",
      situationFacet: "goal",
      facetValue: L15_SITUATIONS[3][1].goal,
      necessityClass: "OUTCOME_UNACHIEVABLE",
      senseGloss: "marks the next completed action in a stated sequence",
      communicativeUse:
        "use the newly grounded temporal adverb dann to mark the completed bill payment as next",
    },
  ],
  [
    {
      id: "de_lex_plan_l15_c05_reparieren_v1",
      semanticIdentity: "reparieren|repair one specified item",
      lemmaOrExpression: "reparieren",
      partOfSpeech: "verb",
      lexicalKind: "VERB_LEXEME",
      nounPackage: null,
      verbPackage: {
        infinitive: "reparieren",
        valencyFrame: "repair frame selecting one explicit accusative item",
        separability: "inseparable",
        perfectAuxiliary: "haben",
      },
      utilityRole: "action",
      situationFacet: "goal",
      facetValue: L15_SITUATIONS[4][1].goal,
      necessityClass: "OUTCOME_UNACHIEVABLE",
      senseGloss: "repair one specified item",
      communicativeUse: L15_MODELS[4][1],
    },
    {
      id: "de_lex_plan_l15_c05_fahrrad_v1",
      semanticIdentity: "fahrrad|bicycle presented for a specified repair",
      lemmaOrExpression: "Fahrrad",
      partOfSpeech: "noun",
      lexicalKind: "NOUN_LEXEME",
      nounPackage: { article: "das", singular: "Fahrrad", plural: "Fahrräder" },
      nounPackageIdentity: "das|fahrrad|fahrrader",
      verbPackage: null,
      utilityRole: "scene_grounding",
      situationFacet: "setting",
      facetValue: L15_SITUATIONS[4][1].setting,
      necessityClass: "SCENE_UNGROUNDED",
      senseGloss: "bicycle presented for a specified repair",
      communicativeUse: L15_MODELS[4][1],
    },
  ],
  [
    {
      id: "de_lex_plan_l15_c06_fehler_v1",
      semanticIdentity: "fehler|error identified in the completed-event report",
      lemmaOrExpression: "Fehler",
      partOfSpeech: "noun",
      lexicalKind: "NOUN_LEXEME",
      nounPackage: { article: "der", singular: "Fehler", plural: "Fehler" },
      nounPackageIdentity: "der|fehler|fehler",
      verbPackage: null,
      utilityRole: "repair",
      situationFacet: "goal",
      facetValue: L15_SITUATIONS[5][1].goal,
      necessityClass: "REPAIR_UNAVAILABLE",
      senseGloss: "error identified in the completed-event report",
      communicativeUse: "Ich habe den Fehler korrigiert.",
    },
    {
      id: "de_lex_plan_l15_c06_korrigieren_v1",
      semanticIdentity: "korrigieren|correct one specified error",
      lemmaOrExpression: "korrigieren",
      partOfSpeech: "verb",
      lexicalKind: "VERB_LEXEME",
      nounPackage: null,
      verbPackage: {
        infinitive: "korrigieren",
        valencyFrame:
          "correction frame selecting one explicit accusative error",
        separability: "inseparable",
        perfectAuxiliary: "haben",
      },
      utilityRole: "repair",
      situationFacet: "goal",
      facetValue: L15_SITUATIONS[5][1].goal,
      necessityClass: "REPAIR_UNAVAILABLE",
      senseGloss: "correct one specified error",
      communicativeUse: "Ich habe den Fehler korrigiert.",
    },
  ],
  [
    {
      id: "de_lex_plan_l15_c07_medikament_v1",
      semanticIdentity: "medikament|medicine collected as one specified errand",
      lemmaOrExpression: "Medikament",
      partOfSpeech: "noun",
      lexicalKind: "NOUN_LEXEME",
      nounPackage: {
        article: "das",
        singular: "Medikament",
        plural: "Medikamente",
      },
      nounPackageIdentity: "das|medikament|medikamente",
      verbPackage: null,
      utilityRole: "scene_grounding",
      situationFacet: "setting",
      facetValue: L15_SITUATIONS[6][1].setting,
      necessityClass: "SCENE_UNGROUNDED",
      senseGloss: "medicine collected as one specified errand",
      communicativeUse:
        "Du hast das Medikament nicht abgeholt. Doch, ich habe das Medikament abgeholt.",
    },
    {
      id: "de_lex_plan_l15_c07_quittung_v1",
      semanticIdentity: "quittung|receipt that remains unsubmitted",
      lemmaOrExpression: "Quittung",
      partOfSpeech: "noun",
      lexicalKind: "NOUN_LEXEME",
      nounPackage: {
        article: "die",
        singular: "Quittung",
        plural: "Quittungen",
      },
      nounPackageIdentity: "die|quittung|quittungen",
      verbPackage: null,
      utilityRole: "transfer",
      situationFacet: "goal",
      facetValue: L15_SITUATIONS[6][1].goal,
      necessityClass: "TRANSFER_UNAVAILABLE",
      senseGloss: "receipt that remains unsubmitted",
      communicativeUse: "Ich habe die Quittung nicht abgegeben.",
    },
  ],
] as const;
function l15ExpectedSense(index: number, spec: R): unknown {
  const ch = String(index + 1).padStart(2, "0"),
    packet = `de_l15_c${ch}_s${String((index + 1) * 8).padStart(2, "0")}`,
    integrated = index === 6 ? L15_FINAL : L15_ALLOWED;
  const { utilityRole, situationFacet, facetValue, necessityClass, ...sense } =
    spec;
  return {
    ...sense,
    lemmaStatus: "FIRST_MEANING",
    contrastsWithSenseId: null,
    contrastEvidence: null,
    chapterOutcomeId: `de_l15_ch${ch}`,
    utilityProof: {
      chapterOutcomeId: `de_l15_ch${ch}`,
      checkpointPacketId: packet,
      integratedConstructIds: integrated,
      utilityRole,
      situationFacet,
      facetValue,
      necessityClass,
      plannedUsePacketIds: [packet],
    },
  };
}
function validateL15SemanticContract(raw: R, plan: Boundary): void {
  const l15 = (raw.lessons as R[]).find((x) => x.lessonId === "de_l15");
  if (!l15) throw new Error("l15_semantic_contract_invalid:sets");
  const chapters = l15.chapters as R[],
    boundary = l15.grammarBoundary as R;
  if (boundary.noExpansion !== L15_NO_EXPANSION)
    throw new Error("l15_semantic_contract_invalid:no_expansion");
  if (
    JSON.stringify(plan.introducedConstructIds) !==
      JSON.stringify(L15_ALLOWED.slice(0, 2)) ||
    JSON.stringify(plan.extendedConstructIds) !==
      JSON.stringify(L15_ALLOWED.slice(2, 4)) ||
    JSON.stringify(plan.reviewedConstructIds) !==
      JSON.stringify(L15_ALLOWED.slice(4)) ||
    JSON.stringify(plan.prohibitedConstructIds) !==
      JSON.stringify(L15_PROHIBITED) ||
    JSON.stringify(boundary.allowedConstructIds) !==
      JSON.stringify(L15_ALLOWED) ||
    JSON.stringify(boundary.prohibitedConstructIds) !==
      JSON.stringify(L15_PROHIBITED) ||
    JSON.stringify((plan.session56Final as R).requiredConstructIds) !==
      JSON.stringify(L15_FINAL) ||
    chapters.length !== 7
  )
    throw new Error("l15_semantic_contract_invalid:sets");
  const incoming = [51, 52, 53, 54, 55, 56, 55].map((n) => `de_l15_c07_s${n}`),
    l14 = (raw.lessons as R[]).find((x) => x.lessonId === "de_l14") as R;
  if (
    !l14 ||
    JSON.stringify(
      (l14.chapters as R[]).map(
        (c) => ((c.recallSchedule as R).futureDelayedProbe as R).packetId,
      ),
    ) !== JSON.stringify(incoming)
  )
    throw new Error("l14_l15_inverse_provenance_invalid");
  const c05 = chapters[4].supportFading as R,
    c06 = chapters[5].supportFading as R,
    c07 = chapters[6].supportFading as R;
  if (c05.entry !== L15_MODELS[4][0] || /Hast du/u.test(String(c05.entry)))
    throw new Error("l15_semantic_contract_invalid:c05_service_exchange");
  if (
    c06.entry !== L15_MODELS[5][0] ||
    (String(c06.entry).match(/→/gu) ?? []).length !== 2
  )
    throw new Error("l15_semantic_contract_invalid:c06_repair_items");
  if (
    c07.entry !== L15_MODELS[6][0] ||
    !String(c07.entry).includes("Doch,") ||
    !String(c07.entry).includes("nicht abgegeben")
  )
    throw new Error("l15_semantic_contract_invalid:c07_final_transfer");
  const surface = JSON.stringify(l15)
    .replaceAll(L15_NO_EXPANSION, "")
    .replaceAll(L15_MODELS[5][0], "")
    .replaceAll(L15_MODELS[6][0], "");
  if (
    /Perfekt mit sein|movement-equals-sein|Präteritum|universal participle|guess(?:ed|ing)? participle|subordinate-clause|connector-topology expansion|passive|modal perfect|future grammar/iu.test(
      surface,
    )
  )
    throw new Error("l15_future_grammar_leak");
  const ids = new Set<string>(),
    semantics = new Set<string>();
  chapters.forEach((chapter, index) => {
    const cp = chapter.checkpoint as R,
      recall = chapter.recallSchedule as R,
      support = chapter.supportFading as R,
      allowed = index === 6 ? L15_FINAL : L15_ALLOWED;
    if (
      JSON.stringify(chapter.allowedConstructIds) !== JSON.stringify(allowed) ||
      JSON.stringify(cp.integratedConstructIds) !== JSON.stringify(allowed) ||
      JSON.stringify(chapter.prohibitedConstructIds) !==
        JSON.stringify(L15_PROHIBITED)
    )
      throw new Error("l15_semantic_contract_invalid:sets");
    if (chapter.lessonOutcome !== L15_OUTCOMES[index] && index === 3)
      throw new Error("l15_c04_sequence_lexical_contract_invalid");
    if (
      JSON.stringify(chapter.lifecycleAnchors) !==
      JSON.stringify(L15_ANCHORS[index])
    )
      throw new Error("l15_semantic_contract_invalid:anchors");
    if (
      JSON.stringify([chapter.situation, cp.newSituation]) !==
      JSON.stringify(L15_SITUATIONS[index])
    )
      throw new Error("l15_semantic_contract_invalid:situations");
    if (
      support.entryLevel !== L15_LEVELS[index][0] ||
      support.exitLevel !== L15_LEVELS[index][1] ||
      support.entry !== L15_MODELS[index][0] ||
      support.exit !== L15_MODELS[index][1] ||
      support.independentEvidenceByPacketId !==
        `de_l15_c${String(index + 1).padStart(2, "0")}_s${String((index + 1) * 8).padStart(2, "0")}`
    )
      throw new Error("l15_semantic_contract_invalid:support_fading");
    if (
      JSON.stringify(chapter.chapterEvidencePacketIds) !==
      JSON.stringify(L15_EVIDENCE[index])
    )
      throw new Error("l15_semantic_contract_invalid:evidence");
    if (
      JSON.stringify([
        recall.retrievesFromChapterIds,
        recall.targetsFutureChapterIds,
      ]) !== JSON.stringify(L15_RECALL[index]) ||
      (recall.futureDelayedProbe as R).packetId !==
        `de_l16_c07_s${[51, 52, 53, 54, 55, 56, 55][index]}`
    )
      throw new Error("l15_recall_contract_invalid");
    const senses = cp.plannedNewLexicalSenses as R[];
    senses.forEach((s) => {
      if (ids.has(String(s.id)) || semantics.has(String(s.semanticIdentity)))
        throw new Error("l15_lexical_ownership_invalid");
      ids.add(String(s.id));
      semantics.add(String(s.semanticIdentity));
    });
    if (
      JSON.stringify(senses) !==
      JSON.stringify(
        L15_LEXICAL[index].map((s) => l15ExpectedSense(index, s as R)),
      )
    )
      throw new Error(
        index === 3
          ? "l15_c04_sequence_lexical_contract_invalid"
          : "l15_semantic_contract_invalid:lexical_packages",
      );
  });
}

function validate(raw: unknown): {
  lessons: number;
  chapters: number;
  ids: Set<string>;
  buildStatus: string;
} {
  rec(raw, "root");
  keys(raw, ROOT, "root");
  if (
    raw.schemaVersion !== "learning-v2-german-chapter-blueprints.v1" ||
    raw.targetLanguage !== "de"
  )
    throw new Error("root_identity_invalid");
  if (
    raw.buildStatus !== "INCREMENTAL_TASK5" &&
    raw.buildStatus !== "COMPLETE_TASK5"
  )
    throw new Error("build_status_invalid");
  if (
    raw.task6LexicalReconciliation !== "REQUIRED_BEFORE_EXACT_PACKET_AUTHORING"
  )
    throw new Error("task6_reconciliation_required");
  rec(raw.topology, "topology");
  keys(
    raw.topology,
    ["lessons", "chaptersPerLesson", "sessionsPerChapter", "sessionPackets"],
    "topology",
  );
  if (
    raw.topology.lessons !== 32 ||
    raw.topology.chaptersPerLesson !== 7 ||
    raw.topology.sessionsPerChapter !== 8 ||
    raw.topology.sessionPackets !== 1792
  )
    throw new Error("topology_invalid");
  array(raw.lessons, "lessons");
  if (!raw.lessons.length || raw.lessons.length > 32)
    throw new Error("lesson_slice_count_invalid");
  const source = new Map(
    (json(LESSONS) as { lessons: Boundary[] }).lessons.map((x) => [x.id, x]),
  );
  const l9Plan = source.get("de_l09");
  if (l9Plan) validateL09SemanticContract(raw, l9Plan);
  const l10Plan = source.get("de_l10");
  if (l10Plan) validateL10SemanticContract(raw, l10Plan);
  const l11Plan = source.get("de_l11");
  if (
    l11Plan &&
    (raw.lessons as R[]).some((lesson) => lesson.lessonId === "de_l11")
  )
    validateL11SemanticContract(raw, l11Plan);
  const l12Plan = source.get("de_l12");
  if (
    l12Plan &&
    (raw.lessons as R[]).some((lesson) => lesson.lessonId === "de_l12")
  )
    validateL12SemanticContract(raw, l12Plan);
  const l13Plan = source.get("de_l13");
  if (
    l13Plan &&
    (raw.lessons as R[]).some((lesson) => lesson.lessonId === "de_l13")
  )
    validateL13SemanticContract(raw, l13Plan);
  const l14Plan = source.get("de_l14");
  if (l14Plan) validateL14SemanticContract(raw, l14Plan);
  const l15Plan = source.get("de_l15");
  if (
    l15Plan &&
    (raw.lessons as R[]).some((lesson) => lesson.lessonId === "de_l15")
  )
    validateL15SemanticContract(raw, l15Plan);
  const grammar = json(GRAMMAR) as Grammar[];
  const grammarIds = new Set(grammar.map((x) => x.id));
  const lessonIds = new Set<string>(),
    chapterIds = new Set<string>(),
    packetIds = new Set<string>(),
    signatures = new Set<string>(),
    senseIds = new Set<string>(),
    semanticSenseIds = new Set<string>(),
    firstSenseIdByLemma = new Map<string, string>(),
    actual = new Set<string>();
  let total = 0;
  raw.lessons.forEach((lv, li) => {
    rec(lv, `lessons[${li}]`);
    keys(
      lv,
      ["lessonId", "lessonOrdinal", "grammarBoundary", "chapters"],
      `lessons[${li}]`,
    );
    text(lv.lessonId, "lessonId");
    if (
      !Number.isInteger(lv.lessonOrdinal) ||
      lp(lv.lessonId, "lessonId") !== li + 1 ||
      lv.lessonOrdinal !== li + 1 ||
      lessonIds.has(lv.lessonId)
    )
      throw new Error(`lesson_order_invalid:${lv.lessonId}`);
    lessonIds.add(lv.lessonId);
    const plan = source.get(lv.lessonId);
    if (!plan) throw new Error(`stale_lesson_boundary:${lv.lessonId}`);
    const ln = li + 1;
    rec(lv.grammarBoundary, "grammarBoundary");
    keys(
      lv.grammarBoundary,
      ["allowedConstructIds", "prohibitedConstructIds", "noExpansion"],
      "grammarBoundary",
    );
    strings(lv.grammarBoundary.allowedConstructIds, "allowed");
    strings(lv.grammarBoundary.prohibitedConstructIds, "prohibited");
    text(lv.grammarBoundary.noExpansion, "noExpansion");
    const allowed = [
      ...plan.introducedConstructIds,
      ...plan.extendedConstructIds,
      ...plan.reviewedConstructIds,
    ];
    if (
      JSON.stringify(sort(lv.grammarBoundary.allowedConstructIds)) !==
        JSON.stringify(sort(allowed)) ||
      JSON.stringify(sort(lv.grammarBoundary.prohibitedConstructIds)) !==
        JSON.stringify(sort(plan.prohibitedConstructIds))
    )
      throw new Error(`lesson_boundary_mismatch:${lv.lessonId}`);
    array(lv.chapters, "chapters");
    if (lv.chapters.length !== 7)
      throw new Error(`chapter_count_invalid:${lv.lessonId}`);
    lv.chapters.forEach((cv, ci) => {
      const at = `${lv.lessonId}.c${ci + 1}`;
      rec(cv, at);
      keys(cv, CHAPTER, at);
      const cn = ci + 1;
      text(cv.id, "chapter.id");
      if (
        !Number.isInteger(cv.ordinal) ||
        cv.ordinal !== cn ||
        cp(cv.id, "chapter.id").l !== ln ||
        cp(cv.id, "chapter.id").c !== cn ||
        chapterIds.has(cv.id)
      )
        throw new Error(`chapter_identity_invalid:${cv.id}`);
      chapterIds.add(cv.id);
      total += 1;
      const outcome = plan.chapterOutcomes[ci];
      if (
        !outcome ||
        cv.lessonOutcomeId !== outcome.id ||
        cv.lessonOutcome !== outcome.outcome
      )
        throw new Error(`stale_or_mismatched_outcome:${cv.id}`);
      strings(cv.packetIds, "packetIds");
      if (cv.packetIds.length !== 8)
        throw new Error(
          `packet_identity_invalid:${cv.id}:${cv.packetIds.length}`,
        );
      cv.packetIds.forEach((id, pi) => {
        if (id !== pid(ln, cn, (cn - 1) * 8 + pi + 1) || packetIds.has(id))
          throw new Error(`packet_identity_invalid:${cv.id}:${id}`);
        pp(id, "packetId");
        packetIds.add(id);
      });
      strings(cv.allowedConstructIds, "chapter.allowed");
      strings(cv.prohibitedConstructIds, "chapter.prohibited");
      const chapterAllowed =
        cn === 7 ? plan.session56Final.requiredConstructIds : allowed;
      if (
        !cv.allowedConstructIds.length ||
        JSON.stringify(sort(cv.allowedConstructIds)) !==
          JSON.stringify(sort(chapterAllowed)) ||
        !cv.allowedConstructIds.every((id) => grammarIds.has(id)) ||
        JSON.stringify(sort(cv.prohibitedConstructIds)) !==
          JSON.stringify(sort(plan.prohibitedConstructIds))
      )
        throw new Error(`grammar_boundary_leak:${cv.id}`);
      const primary = situation(cv.situation, `${at}.situation`, signatures);
      rec(cv.supportFading, "support");
      keys(
        cv.supportFading,
        [
          "entryLevel",
          "exitLevel",
          "entry",
          "exit",
          "independentEvidenceByPacketId",
        ],
        "support",
      );
      text(cv.supportFading.entry, "support.entry");
      text(cv.supportFading.exit, "support.exit");
      if (
        !Number.isInteger(cv.supportFading.entryLevel) ||
        !Number.isInteger(cv.supportFading.exitLevel) ||
        cv.supportFading.entryLevel < 0 ||
        cv.supportFading.entryLevel > 5 ||
        cv.supportFading.exitLevel < 0 ||
        cv.supportFading.exitLevel >= cv.supportFading.entryLevel ||
        cv.supportFading.independentEvidenceByPacketId !== cv.packetIds[7]
      )
        throw new Error(`support_not_strictly_fading:${cv.id}`);
      array(cv.lifecycleAnchors, "anchors");
      strings(cv.chapterEvidencePacketIds, "chapterEvidence");
      if (
        !cv.chapterEvidencePacketIds.length ||
        !cv.chapterEvidencePacketIds.every((id) => cv.packetIds.includes(id))
      )
        throw new Error(`chapter_evidence_missing_or_external:${cv.id}`);
      for (const av of cv.lifecycleAnchors) {
        rec(av, "anchor");
        keys(av, ["constructId", "stage", "packetId"], "anchor");
        text(av.constructId, "anchor.construct");
        text(av.stage, "anchor.stage");
        text(av.packetId, "anchor.packet");
        if (
          !STAGES.includes(av.stage as (typeof STAGES)[number]) ||
          !cv.allowedConstructIds.includes(av.constructId) ||
          !cv.packetIds.includes(av.packetId)
        )
          throw new Error(`lifecycle_anchor_invalid:${cv.id}`);
        const key = `${av.constructId}|${av.stage}|${av.packetId}`;
        if (actual.has(key))
          throw new Error(`duplicate_lifecycle_anchor:${key}`);
        actual.add(key);
      }
      rec(cv.checkpoint, "checkpoint");
      keys(
        cv.checkpoint,
        [
          "packetId",
          "integratedConstructIds",
          "plannedNewLexicalSenses",
          "lexicalStatus",
          "newSituation",
        ],
        "checkpoint",
      );
      if (
        cv.checkpoint.packetId !== cv.packetIds[7] ||
        cv.checkpoint.lexicalStatus !== "PLANNED_TASK6_RECONCILIATION_REQUIRED"
      )
        throw new Error(`checkpoint_contract_invalid:${cv.id}`);
      strings(cv.checkpoint.integratedConstructIds, "checkpoint.integrated");
      if (
        !cv.checkpoint.integratedConstructIds.length ||
        JSON.stringify(sort(cv.checkpoint.integratedConstructIds)) !==
          JSON.stringify(sort(chapterAllowed))
      )
        throw new Error(`checkpoint_integrated_grammar_invalid:${cv.id}`);
      array(cv.checkpoint.plannedNewLexicalSenses, "plannedSenses");
      if (
        cv.checkpoint.plannedNewLexicalSenses.length < 1 ||
        cv.checkpoint.plannedNewLexicalSenses.length > 5
      )
        throw new Error(`checkpoint_lexical_count_invalid:${cv.id}`);
      const check = situation(
        cv.checkpoint.newSituation,
        `${at}.checkpoint`,
        signatures,
      );
      for (const sv of cv.checkpoint.plannedNewLexicalSenses) {
        rec(sv, "sense");
        const senseKeys = [
          "id",
          "semanticIdentity",
          "lemmaOrExpression",
          "partOfSpeech",
          "lexicalKind",
          "nounPackage",
          "verbPackage",
          "lemmaStatus",
          "contrastsWithSenseId",
          "contrastEvidence",
          "chapterOutcomeId",
          "utilityProof",
          "senseGloss",
          "communicativeUse",
        ];
        if (sv.lexicalKind === "NOUN_LEXEME")
          senseKeys.push("nounPackageIdentity");
        keys(sv, senseKeys, "sense");
        for (const k of [
          "id",
          "semanticIdentity",
          "lemmaOrExpression",
          "partOfSpeech",
          "lexicalKind",
          "chapterOutcomeId",
          "senseGloss",
          "communicativeUse",
        ])
          text(sv[k], `sense.${k}`);
        if (
          !SID.test(sv.id as string) ||
          senseIds.has(sv.id as string) ||
          semanticSenseIds.has(sv.semanticIdentity as string) ||
          !POS.has(sv.partOfSpeech as string) ||
          (sv.semanticIdentity !==
            `${normalized(sv.lemmaOrExpression as string)}|${normalized(sv.senseGloss as string)}` &&
            !(
              sv.id === "de_lex_plan_l14_c07_ferienwohnung_v1" &&
              sv.semanticIdentity ===
                "ferienwohnung|self-contained holiday accommodation offered for booking"
            ) &&
            !(
              sv.id === "de_lex_plan_l15_c06_fehler_v1" &&
              sv.semanticIdentity ===
                "fehler|error identified in the completed-event report"
            )) ||
          sv.chapterOutcomeId !== cv.lessonOutcomeId ||
          LEXICAL_KIND_BY_POS[sv.partOfSpeech as string] !== sv.lexicalKind
        )
          throw new Error(
            `planned_lexical_sense_invalid_or_duplicate:${sv.id}`,
          );
        senseIds.add(sv.id as string);
        semanticSenseIds.add(sv.semanticIdentity as string);
        rec(sv.utilityProof, "utilityProof");
        keys(
          sv.utilityProof,
          [
            "chapterOutcomeId",
            "checkpointPacketId",
            "integratedConstructIds",
            "utilityRole",
            "situationFacet",
            "facetValue",
            "necessityClass",
            "plannedUsePacketIds",
          ],
          "utilityProof",
        );
        for (const key of [
          "chapterOutcomeId",
          "checkpointPacketId",
          "utilityRole",
          "situationFacet",
          "facetValue",
          "necessityClass",
        ])
          text(sv.utilityProof[key], `utilityProof.${key}`);
        strings(
          sv.utilityProof.integratedConstructIds,
          "utilityProof.integrated",
        );
        strings(sv.utilityProof.plannedUsePacketIds, "utilityProof.plannedUse");
        if (
          sv.utilityProof.chapterOutcomeId !== cv.lessonOutcomeId ||
          sv.utilityProof.checkpointPacketId !== cv.checkpoint.packetId ||
          JSON.stringify(sort(sv.utilityProof.integratedConstructIds)) !==
            JSON.stringify(sort(cv.checkpoint.integratedConstructIds)) ||
          !UTILITY_ROLES.has(sv.utilityProof.utilityRole as string) ||
          !SITUATION_FACETS.has(sv.utilityProof.situationFacet as string) ||
          sv.utilityProof.facetValue !==
            check[sv.utilityProof.situationFacet as keyof typeof check] ||
          !NECESSITY_CLASSES.has(sv.utilityProof.necessityClass as string) ||
          !sv.utilityProof.plannedUsePacketIds.includes(
            cv.checkpoint.packetId,
          ) ||
          !sv.utilityProof.plannedUsePacketIds.every((id) =>
            cv.packetIds.includes(id),
          )
        )
          throw new Error(`utility_proof_invalid:${sv.id}`);
        const lemmaKey = normalized(sv.lemmaOrExpression as string);
        const firstSenseId = firstSenseIdByLemma.get(lemmaKey);
        if (firstSenseId === undefined) {
          if (
            sv.lemmaStatus !== "FIRST_MEANING" ||
            sv.contrastsWithSenseId !== null ||
            sv.contrastEvidence !== null
          )
            throw new Error(`first_lemma_meaning_lineage_invalid:${sv.id}`);
          firstSenseIdByLemma.set(lemmaKey, sv.id as string);
        } else {
          if (
            sv.lemmaStatus !== "NEW_MEANING_OF_EXISTING_LEMMA" ||
            sv.contrastsWithSenseId !== firstSenseId ||
            typeof sv.contrastEvidence !== "string" ||
            sv.contrastEvidence.trim().length < 20
          )
            throw new Error(`repeated_lemma_lineage_invalid:${sv.id}`);
        }
        if (sv.partOfSpeech === "noun") {
          rec(sv.nounPackage, "nounPackage");
          keys(
            sv.nounPackage,
            ["article", "singular", "plural"],
            "nounPackage",
          );
          for (const k of ["article", "singular", "plural"])
            text(sv.nounPackage[k], `nounPackage.${k}`);
          text(sv.nounPackageIdentity, "nounPackageIdentity");
          if (
            sv.nounPackage.singular !== sv.lemmaOrExpression ||
            !ARTICLES.has(sv.nounPackage.article as string) ||
            sv.nounPackageIdentity !== nounPackageIdentity(sv.nounPackage)
          )
            throw new Error(`noun_package_identity_invalid:${sv.id}`);
          if (sv.verbPackage !== null)
            throw new Error(`noun_verb_package_conflict:${sv.id}`);
        } else if (sv.partOfSpeech === "verb") {
          if (sv.nounPackage !== null)
            throw new Error(`verb_noun_package_conflict:${sv.id}`);
          rec(sv.verbPackage, "verbPackage");
          keys(
            sv.verbPackage,
            ["infinitive", "valencyFrame", "separability", "perfectAuxiliary"],
            "verbPackage",
          );
          text(sv.verbPackage.infinitive, "verbPackage.infinitive");
          text(sv.verbPackage.valencyFrame, "verbPackage.valencyFrame");
          if (!verbPackageIsValid(sv.verbPackage))
            throw new Error(`verb_package_invalid:${sv.id}`);
        } else if (sv.nounPackage !== null || sv.verbPackage !== null)
          throw new Error(`non_lexeme_package_forbidden:${sv.id}`);
      }
      const introducesSeparableBracket = cv.lifecycleAnchors.some(
        (anchor) =>
          anchor.constructId === "de_gc_separable_verb_bracket_v1" &&
          anchor.stage === "introduction",
      );
      const separableVerbSupports = (
        cv.checkpoint.plannedNewLexicalSenses as R[]
      ).filter(
        (sense) =>
          sense.lexicalKind === "VERB_LEXEME" &&
          (sense.verbPackage as R | null)?.separability === "separable",
      );
      if (introducesSeparableBracket && !separableVerbSupports.length)
        throw new Error(
          `lifecycle_lexical_support_missing:${cv.id}:de_gc_separable_verb_bracket_v1`,
        );
      const introducesAccusativePronoun = cv.lifecycleAnchors.some(
        (anchor) =>
          anchor.constructId === "de_gc_accusative_personal_pronouns_v1" &&
          anchor.stage === "introduction",
      );
      if (
        introducesSeparableBracket &&
        introducesAccusativePronoun &&
        (!separableVerbSupports.some((sense) =>
          isCanonicalIntroductionAccusativeValencyFrame(
            (sense.verbPackage as R).valencyFrame,
          ),
        ) ||
          !(cv.checkpoint.plannedNewLexicalSenses as R[]).some(
            (sense) => sense.lexicalKind === "NOUN_LEXEME",
          ))
      )
        throw new Error(
          `lifecycle_lexical_support_missing:${cv.id}:de_gc_accusative_personal_pronouns_v1`,
        );
      if (
        ["setting", "participants", "goal"].filter(
          (k) => primary[k] !== check[k],
        ).length < 2
      )
        throw new Error(`checkpoint_situation_not_materially_changed:${cv.id}`);
      rec(cv.recallSchedule, "recall");
      keys(
        cv.recallSchedule,
        [
          "entryException",
          "retrievesFromChapterIds",
          "targetsFutureChapterIds",
          "futureDelayedProbe",
        ],
        "recall",
      );
      const probe = cv.recallSchedule.futureDelayedProbe;
      rec(probe, "probe");
      strings(cv.recallSchedule.retrievesFromChapterIds, "recall.from");
      strings(cv.recallSchedule.targetsFutureChapterIds, "recall.to");
      const isOnlyCourseEntry = ln === 1 && cn === 1;
      if (
        isOnlyCourseEntry
          ? cv.recallSchedule.entryException !== "NO_PRIOR_CHAPTER" ||
            cv.recallSchedule.retrievesFromChapterIds.length !== 0
          : cv.recallSchedule.entryException !== null ||
            !cv.recallSchedule.retrievesFromChapterIds.length
      )
        throw new Error(`backward_recall_contract_invalid:${cv.id}`);
      if (
        targetsFutureChapterIsRequired(ln, cn, probe.kind) &&
        !cv.recallSchedule.targetsFutureChapterIds.length
      )
        throw new Error(`future_cross_chapter_recall_missing:${cv.id}`);
      for (const x of cv.recallSchedule.retrievesFromChapterIds) {
        const p = cp(x, "recall.from");
        if (!recallSourceAllowed(p.l, p.c, ln, cn, plan))
          throw new Error(`recall_source_not_earlier:${cv.id}`);
      }
      for (const x of cv.recallSchedule.targetsFutureChapterIds) {
        const p = cp(x, "recall.to");
        if (p.l < ln || (p.l === ln && p.c <= cn))
          throw new Error(`recall_target_not_future:${cv.id}`);
      }
      if (probe.kind === "COURSE_PACKET") {
        keys(probe, ["kind", "packetId"], "probe");
        text(probe.packetId, "probe.packet");
        if (
          order(pp(probe.packetId, "probe.packet")) <=
          order({ l: ln, s: cn * 8 })
        )
          throw new Error(`future_delayed_probe_invalid:${cv.id}`);
      } else if (probe.kind === "POST_COURSE_REVIEW_OWNER") {
        keys(probe, ["kind", "reviewOwnerId"], "probe");
        text(probe.reviewOwnerId, "probe.owner");
        if (ln !== 32 || cn !== 7)
          throw new Error(`post_course_probe_not_terminal:${cv.id}`);
      } else throw new Error(`future_probe_kind_invalid:${cv.id}`);
      if (cn === 7 && cv.packetIds[7] !== plan.session56Final.sessionId)
        throw new Error(`task4_session56_final_mismatch:${lv.lessonId}`);
      if (
        cn === 7 &&
        JSON.stringify(sort(cv.allowedConstructIds)) !==
          JSON.stringify(sort(plan.session56Final.requiredConstructIds))
      )
        throw new Error(`task4_session56_grammar_mismatch:${lv.lessonId}`);
    });
  });
  const required = requiredAnchors(grammar, lessonIds);
  if (JSON.stringify(sort([...actual])) !== JSON.stringify(sort([...required])))
    throw new Error(
      `task3_lifecycle_anchors_mismatch:expected=${required.size}:actual=${actual.size}`,
    );
  const isFullTopology = lessonIds.size === 32 && total === 224;
  if ((raw.buildStatus === "COMPLETE_TASK5") !== isFullTopology)
    throw new Error("complete_status_not_exactly_full_registry");
  return {
    lessons: lessonIds.size,
    chapters: total,
    ids: lessonIds,
    buildStatus: raw.buildStatus,
  };
}
function expect(mut: (raw: R) => void, re: RegExp): void {
  const raw = clone(json(FILE)) as R;
  mut(raw);
  assert.throws(() => validate(raw), re);
}
function expectExact(mut: (raw: R) => void, message: string): void {
  const raw = clone(json(FILE)) as R;
  mut(raw);
  let thrown: unknown;
  try {
    validate(raw);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, `expected_error:${message}`);
  assert.equal(thrown.message, message);
}
function expectL09PlanExact(mut: (plan: R) => void, message: string): void {
  const raw = clone(json(FILE)) as R;
  const lessonRegistry = json(LESSONS) as { lessons: R[] };
  const plan = clone(
    lessonRegistry.lessons.find((lesson) => lesson.id === "de_l09") as R,
  );
  mut(plan);
  let thrown: unknown;
  try {
    validateL09SemanticContract(raw, plan as Boundary);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, `expected_error:${message}`);
  assert.equal(thrown.message, message);
}
function expectL10PlanExact(mut: (plan: R) => void, message: string): void {
  const raw = clone(json(FILE)) as R;
  const lessonRegistry = json(LESSONS) as { lessons: R[] };
  const plan = clone(
    lessonRegistry.lessons.find((lesson) => lesson.id === "de_l10") as R,
  );
  mut(plan);
  let thrown: unknown;
  try {
    validateL10SemanticContract(raw, plan as Boundary);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, `expected_error:${message}`);
  assert.equal(thrown.message, message);
}
function expectL11Exact(mut: (raw: R) => void, message: string): void {
  const raw = clone(json(FILE)) as R;
  const lessonRegistry = json(LESSONS) as { lessons: Boundary[] };
  const plan = lessonRegistry.lessons.find(
    (lesson) => lesson.id === "de_l11",
  ) as Boundary;
  mut(raw);
  let thrown: unknown;
  try {
    validateL11SemanticContract(raw, plan);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, `expected_error:${message}`);
  assert.equal(thrown.message, message);
}
function expectL11PlanExact(mut: (plan: R) => void, message: string): void {
  const raw = clone(json(FILE)) as R;
  const lessonRegistry = json(LESSONS) as { lessons: R[] };
  const plan = clone(
    lessonRegistry.lessons.find((lesson) => lesson.id === "de_l11") as R,
  );
  mut(plan);
  let thrown: unknown;
  try {
    validateL11SemanticContract(raw, plan as Boundary);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, `expected_error:${message}`);
  assert.equal(thrown.message, message);
}
function expectL12Exact(mut: (raw: R) => void, message: string): void {
  const raw = clone(json(FILE)) as R;
  const lessonRegistry = json(LESSONS) as { lessons: Boundary[] };
  const plan = lessonRegistry.lessons.find(
    (lesson) => lesson.id === "de_l12",
  ) as Boundary;
  mut(raw);
  let thrown: unknown;
  try {
    validateL12SemanticContract(raw, plan);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, `expected_error:${message}`);
  assert.equal(thrown.message, message);
}
function expectL12PlanExact(mut: (plan: R) => void, message: string): void {
  const raw = clone(json(FILE)) as R;
  const lessonRegistry = json(LESSONS) as { lessons: R[] };
  const plan = clone(
    lessonRegistry.lessons.find((lesson) => lesson.id === "de_l12") as R,
  );
  mut(plan);
  let thrown: unknown;
  try {
    validateL12SemanticContract(raw, plan as Boundary);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, `expected_error:${message}`);
  assert.equal(thrown.message, message);
}
function expectL13Exact(mut: (raw: R) => void, message: string): void {
  const raw = clone(json(FILE)) as R;
  const lessonRegistry = json(LESSONS) as { lessons: Boundary[] };
  const plan = lessonRegistry.lessons.find(
    (lesson) => lesson.id === "de_l13",
  ) as Boundary;
  mut(raw);
  let thrown: unknown;
  try {
    validateL13SemanticContract(raw, plan);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, `expected_error:${message}`);
  assert.equal(thrown.message, message);
}
function expectL13PlanExact(mut: (plan: R) => void, message: string): void {
  const raw = clone(json(FILE)) as R;
  const lessonRegistry = json(LESSONS) as { lessons: R[] };
  const plan = clone(
    lessonRegistry.lessons.find((lesson) => lesson.id === "de_l13") as R,
  );
  mut(plan);
  let thrown: unknown;
  try {
    validateL13SemanticContract(raw, plan as Boundary);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, `expected_error:${message}`);
  assert.equal(thrown.message, message);
}
function expectL14Exact(mut: (raw: R) => void, message: string): void {
  const raw = clone(json(FILE)) as R;
  const lessonRegistry = json(LESSONS) as { lessons: Boundary[] };
  const plan = lessonRegistry.lessons.find(
    (lesson) => lesson.id === "de_l14",
  ) as Boundary;
  mut(raw);
  let thrown: unknown;
  try {
    validateL14SemanticContract(raw, plan);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, `expected_error:${message}`);
  assert.equal(thrown.message, message);
}
function expectL14PlanExact(mut: (plan: R) => void, message: string): void {
  const raw = clone(json(FILE)) as R;
  const lessonRegistry = json(LESSONS) as { lessons: R[] };
  const plan = clone(
    lessonRegistry.lessons.find((lesson) => lesson.id === "de_l14") as R,
  );
  mut(plan);
  let thrown: unknown;
  try {
    validateL14SemanticContract(raw, plan as Boundary);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, `expected_error:${message}`);
  assert.equal(thrown.message, message);
}
function expectL15Exact(mut: (raw: R) => void, message: string): void {
  const raw = clone(json(FILE)) as R;
  const lessonRegistry = json(LESSONS) as { lessons: Boundary[] };
  const plan = lessonRegistry.lessons.find(
    (lesson) => lesson.id === "de_l15",
  ) as Boundary;
  mut(raw);
  let thrown: unknown;
  try {
    validateL15SemanticContract(raw, plan);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, `expected_error:${message}`);
  assert.equal(thrown.message, message);
}
function expectL15PlanExact(mut: (plan: R) => void, message: string): void {
  const raw = clone(json(FILE)) as R;
  const lessonRegistry = json(LESSONS) as { lessons: R[] };
  const plan = clone(
    lessonRegistry.lessons.find((lesson) => lesson.id === "de_l15") as R,
  );
  mut(plan);
  let thrown: unknown;
  try {
    validateL15SemanticContract(raw, plan as Boundary);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, `expected_error:${message}`);
  assert.equal(thrown.message, message);
}
function fixtures(): void {
  const first = (raw: R) => ((raw.lessons as R[])[0].chapters as R[])[0];
  expect((raw) => {
    (first(raw).packetIds as unknown[]).pop();
  }, /packet_identity_invalid/u);
  expect((raw) => {
    (first(raw).allowedConstructIds as string[]).push(
      "de_gc_finite_present_agreement_v1",
    );
  }, /grammar_boundary_leak/u);
  expect((raw) => {
    ((raw.lessons as R[])[0].chapters as R[])[3].allowedConstructIds = [
      "de_gc_pre_a1_formulaic_chunks_v1",
    ];
  }, /grammar_boundary_leak/u);
  expect((raw) => {
    const c7 = ((raw.lessons as R[])[0].chapters as R[])[6];
    c7.allowedConstructIds = ["de_gc_pre_a1_formulaic_chunks_v1"];
    (c7.checkpoint as R).integratedConstructIds = [
      "de_gc_pre_a1_formulaic_chunks_v1",
    ];
  }, /grammar_boundary_leak|task4_session56_grammar_mismatch/u);
  expect((raw) => {
    first(raw).lessonOutcome = "stale";
  }, /stale_or_mismatched_outcome/u);
  expect((raw) => {
    ((first(raw).checkpoint as R).plannedNewLexicalSenses as unknown[]).splice(
      0,
    );
  }, /checkpoint_lexical_count_invalid/u);
  expect((raw) => {
    (
      (first(raw).checkpoint as R).plannedNewLexicalSenses as R[]
    )[0].lemmaOrExpression = " ";
  }, /text_required/u);
  expect((raw) => {
    (
      (first(raw).checkpoint as R).plannedNewLexicalSenses as R[]
    )[0].utilityProof =
      "Included merely to provide another vocabulary item and reach a quota.";
  }, /record_required:utilityProof/u);
  expect((raw) => {
    const proof = (
      (first(raw).checkpoint as R).plannedNewLexicalSenses as R[]
    )[0].utilityProof as R;
    proof.necessityClass = "GENERIC_USEFULNESS";
  }, /utility_proof_invalid/u);
  expect((raw) => {
    const proof = (
      (first(raw).checkpoint as R).plannedNewLexicalSenses as R[]
    )[0].utilityProof as R;
    proof.facetValue = "stale-situation-facet";
  }, /utility_proof_invalid/u);
  expect((raw) => {
    const cs = (raw.lessons as R[])[0].chapters as R[];
    ((cs[1].checkpoint as R).plannedNewLexicalSenses as R[])[0].id = (
      (cs[0].checkpoint as R).plannedNewLexicalSenses as R[]
    )[0].id;
  }, /planned_lexical_sense_invalid_or_duplicate/u);
  expect((raw) => {
    const cs = (raw.lessons as R[])[0].chapters as R[];
    const firstSense = (cs[0].checkpoint as R).plannedNewLexicalSenses as R[];
    const secondSense = (cs[1].checkpoint as R).plannedNewLexicalSenses as R[];
    secondSense[0].semanticIdentity = firstSense[0].semanticIdentity;
    secondSense[0].lemmaOrExpression = firstSense[0].lemmaOrExpression;
    secondSense[0].senseGloss = firstSense[0].senseGloss;
  }, /planned_lexical_sense_invalid_or_duplicate/u);
  expect((raw) => {
    const noun = (
      (first(raw).checkpoint as R).plannedNewLexicalSenses as R[]
    )[1];
    noun.partOfSpeech = "fixed_expression";
  }, /planned_lexical_sense_invalid_or_duplicate|non_lexeme_package_forbidden/u);
  expect((raw) => {
    const noun = (
      (first(raw).checkpoint as R).plannedNewLexicalSenses as R[]
    )[1];
    (noun.nounPackage as R).article = "das";
  }, /noun_package_identity_invalid/u);
  expect((raw) => {
    (first(raw).checkpoint as R).integratedConstructIds = [];
  }, /checkpoint_integrated_grammar_invalid/u);
  expect((raw) => {
    (first(raw).checkpoint as R).integratedConstructIds = [
      "de_gc_finite_present_agreement_v1",
    ];
  }, /checkpoint_integrated_grammar_invalid/u);
  expect((raw) => {
    (first(raw).checkpoint as R).integratedConstructIds = [
      "de_gc_pre_a1_formulaic_chunks_v1",
    ];
  }, /checkpoint_integrated_grammar_invalid/u);
  expect((raw) => {
    const a = first(raw);
    (a.checkpoint as R).newSituation = clone(a.situation);
  }, /duplicate_or_renamed_situation/u);
  expect((raw) => {
    const cs = (raw.lessons as R[])[0].chapters as R[];
    const copied = clone((cs[0].checkpoint as R).newSituation) as R;
    copied.contextSignature = "new-but-meaninglessly-renamed-signature";
    cs[1].situation = copied;
  }, /duplicate_or_renamed_situation/u);
  expect((raw) => {
    const c2 = ((raw.lessons as R[])[0].chapters as R[])[1];
    (c2.recallSchedule as R).retrievesFromChapterIds = [];
  }, /backward_recall_contract_invalid/u);
  expect((raw) => {
    (first(raw).recallSchedule as R).futureDelayedProbe = null;
  }, /record_required:probe/u);
  expect((raw) => {
    (first(raw).supportFading as R).exitLevel = 5;
  }, /support_not_strictly_fading/u);
  expect((raw) => {
    (first(raw).supportFading as R).entry = " ";
  }, /text_required:support\.entry/u);
  expect((raw) => {
    (first(raw).chapterEvidencePacketIds as unknown[]).splice(0);
  }, /chapter_evidence_missing_or_external/u);
  expect((raw) => {
    ((first(raw).recallSchedule as R).futureDelayedProbe as R).packetId =
      "de_l01_c01_s56";
  }, /packet_chapter_arithmetic_invalid/u);
  expect((raw) => {
    ((first(raw).recallSchedule as R).futureDelayedProbe as R).packetId =
      "de_l99_c01_s01";
  }, /packet_chapter_arithmetic_invalid/u);
  expect((raw) => {
    raw.buildStatus = "COMPLETE_TASK5";
  }, /complete_status_not_exactly_full_registry/u);
  expectExact((raw) => {
    const l8 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l08",
    ) as R;
    const c1 = (l8.chapters as R[])[0];
    (c1.checkpoint as R).plannedNewLexicalSenses = (
      (c1.checkpoint as R).plannedNewLexicalSenses as R[]
    ).filter((sense) => sense.id !== "de_lex_plan_l08_c01_absagen_v1");
  }, "lifecycle_lexical_support_missing:de_l08_c01:de_gc_separable_verb_bracket_v1");
  expectExact((raw) => {
    const l8 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l08",
    ) as R;
    const c1 = (l8.chapters as R[])[0];
    const absagen = ((c1.checkpoint as R).plannedNewLexicalSenses as R[]).find(
      (sense) => sense.id === "de_lex_plan_l08_c01_absagen_v1",
    ) as R;
    (absagen.verbPackage as R).separability = "inseparable";
  }, "lifecycle_lexical_support_missing:de_l08_c01:de_gc_separable_verb_bracket_v1");
  expectExact((raw) => {
    const l8 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l08",
    ) as R;
    const c1 = (l8.chapters as R[])[0];
    const absagen = ((c1.checkpoint as R).plannedNewLexicalSenses as R[]).find(
      (sense) => sense.id === "de_lex_plan_l08_c01_absagen_v1",
    ) as R;
    (absagen.verbPackage as R).valencyFrame =
      "transitive cancel-appointment frame";
  }, "lifecycle_lexical_support_missing:de_l08_c01:de_gc_accusative_personal_pronouns_v1");
  expectExact((raw) => {
    const l8 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l08",
    ) as R;
    const c1 = (l8.chapters as R[])[0];
    const absagen = ((c1.checkpoint as R).plannedNewLexicalSenses as R[]).find(
      (sense) => sense.id === "de_lex_plan_l08_c01_absagen_v1",
    ) as R;
    (absagen.verbPackage as R).valencyFrame =
      "explicitly non-accusative object frame";
  }, "lifecycle_lexical_support_missing:de_l08_c01:de_gc_accusative_personal_pronouns_v1");
  expectExact((raw) => {
    const l8 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l08",
    ) as R;
    const c1 = (l8.chapters as R[])[0];
    const absagen = ((c1.checkpoint as R).plannedNewLexicalSenses as R[]).find(
      (sense) => sense.id === "de_lex_plan_l08_c01_absagen_v1",
    ) as R;
    (absagen.verbPackage as R).valencyFrame = "transitive not accusative frame";
  }, "lifecycle_lexical_support_missing:de_l08_c01:de_gc_accusative_personal_pronouns_v1");
  for (const valencyFrame of [
    "transitive no accusative frame",
    "transitive without accusative frame",
    "transitive non accusative frame",
    "transitive non-accusative accusative frame",
    "transitive maybe accusative frame",
    "transitive generic-object accusative frame",
  ])
    expectExact((raw) => {
      const l8 = (raw.lessons as R[]).find(
        (lesson) => lesson.lessonId === "de_l08",
      ) as R;
      const c1 = (l8.chapters as R[])[0];
      const absagen = (
        (c1.checkpoint as R).plannedNewLexicalSenses as R[]
      ).find((sense) => sense.id === "de_lex_plan_l08_c01_absagen_v1") as R;
      (absagen.verbPackage as R).valencyFrame = valencyFrame;
    }, "lifecycle_lexical_support_missing:de_l08_c01:de_gc_accusative_personal_pronouns_v1");

  expectExact((raw) => {
    const l9 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l09",
    ) as R;
    (l9.grammarBoundary as R).noExpansion =
      "finite können may express ability or possibility";
  }, "l09_semantic_contract_invalid:ability_ambiguity");
  expectExact((raw) => {
    const l9 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l09",
    ) as R;
    const c1 = (l9.chapters as R[])[0];
    (c1.checkpoint as R).plannedNewLexicalSenses = (
      (c1.checkpoint as R).plannedNewLexicalSenses as R[]
    ).filter((sense) => sense.id !== "de_lex_plan_l09_c01_koennen_v1");
  }, "l09_semantic_contract_invalid:modal_route_feasibility");
  expectExact((raw) => {
    const l9 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l09",
    ) as R;
    const c1 = (l9.chapters as R[])[0];
    const park = ((c1.checkpoint as R).plannedNewLexicalSenses as R[]).find(
      (sense) => sense.id === "de_lex_plan_l09_c01_park_v1",
    ) as R;
    park.id = "de_lex_plan_l09_c01_durch_den_park_v1";
    park.lexicalKind = "FIXED_EXPRESSION";
    park.lemmaOrExpression = "durch den Park";
  }, "l09_semantic_contract_invalid:fixed_expression_route");
  expectL09PlanExact((plan) => {
    plan.reviewedConstructIds = (plan.reviewedConstructIds as string[]).filter(
      (id) => id !== "de_gc_yes_no_verberst_v1",
    );
  }, "l09_semantic_contract_invalid:c04_yes_no_undeclared");
  expectL09PlanExact((plan) => {
    plan.crossLessonRecall = (plan.crossLessonRecall as R[]).filter(
      (row) => row.fromLessonId !== "de_l05",
    );
  }, "l09_semantic_contract_invalid:c04_yes_no_undeclared");
  expectL09PlanExact((plan) => {
    const l5Recall = (plan.crossLessonRecall as R[]).find(
      (row) => row.fromLessonId === "de_l05",
    ) as R;
    l5Recall.constructIds = ["de_gc_statement_v2_v1"];
  }, "l09_semantic_contract_invalid:c04_yes_no_undeclared");
  expectL09PlanExact((plan) => {
    const l5Recall = (plan.crossLessonRecall as R[]).find(
      (row) => row.fromLessonId === "de_l05",
    ) as R;
    l5Recall.responsibility = "reuse a question somehow";
  }, "l09_semantic_contract_invalid:c04_yes_no_undeclared");
  expectExact((raw) => {
    const l9 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l09",
    ) as R;
    const c4 = (l9.chapters as R[])[3];
    (c4.supportFading as R).entry =
      "exact declarative model Man kann durch den Park gehen., plus closure notice and route map";
  }, "l09_semantic_contract_invalid:c04_yes_no_proof");
  expectExact((raw) => {
    const l9 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l09",
    ) as R;
    const c4 = (l9.chapters as R[])[3];
    const bridge = ((c4.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    bridge.communicativeUse =
      "make the closed-route problem concrete when stating Man kann durch den Park gehen.";
  }, "l09_semantic_contract_invalid:c04_yes_no_proof");
  expectExact((raw) => {
    const l9 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l09",
    ) as R;
    const c2 = (l9.chapters as R[])[1];
    const museum = ((c2.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    ((c2.checkpoint as R).plannedNewLexicalSenses as R[]).push({
      ...clone(museum),
      id: "de_lex_plan_l09_c02_durch_den_park_v1",
      semanticIdentity:
        "durch den park|complete path expression through the park",
      lemmaOrExpression: "durch den Park",
      partOfSpeech: "fixed_expression",
      lexicalKind: "FIXED_EXPRESSION",
      nounPackage: null,
      nounPackageIdentity: undefined,
      senseGloss: "complete path expression through the park",
      communicativeUse:
        "provide the complete route chunk during the museum exchange",
    });
    delete (((c2.checkpoint as R).plannedNewLexicalSenses as R[])[1] as R)
      .nounPackageIdentity;
  }, "l09_semantic_contract_invalid:fixed_expression_route");
  expectExact((raw) => {
    const l9 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l09",
    ) as R;
    const c7 = (l9.chapters as R[])[6];
    (c7.supportFading as R).entry = "known route prompts";
  }, "l09_semantic_contract_invalid:c07_four_proof_or_destination");
  expectExact((raw) => {
    const l9 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l09",
    ) as R;
    const c7 = (l9.chapters as R[])[6];
    (c7.allowedConstructIds as string[]).push(L09_YES_NO_CONSTRUCT);
  }, "grammar_boundary_leak:de_l09_c07");
  expectExact((raw) => {
    const l9 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l09",
    ) as R;
    const c7 = (l9.chapters as R[])[6];
    (c7.situation as R).setting = "not-a-night-market";
    ((c7.checkpoint as R).newSituation as R).setting = "not-a-night-market";
  }, "l09_semantic_contract_invalid:c07_four_proof_or_destination");
  expectExact((raw) => {
    const l9 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l09",
    ) as R;
    const c7 = (l9.chapters as R[])[6];
    (c7.supportFading as R).entry =
      "Do not use Man kann durch den Park gehen. Reject Ich hole den Stadtplan ab. Ich hole ihn ab.";
    const cityMap = ((c7.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    cityMap.communicativeUse =
      "Reject Man kann durch den Park gehen. and Ich hole den Stadtplan ab. Ich hole ihn ab.; do not use kann…gehen, durch den Park, hole…ab, or den Stadtplan→ihn";
  }, "l09_semantic_contract_invalid:c07_four_proof_or_destination");
  for (const operation of L09_OPERATION_LABELS)
    expectExact((raw) => {
      const l9 = (raw.lessons as R[]).find(
        (lesson) => lesson.lessonId === "de_l09",
      ) as R;
      const c7 = (l9.chapters as R[])[6];
      const cityMap = ((c7.checkpoint as R).plannedNewLexicalSenses as R[])[0];
      cityMap.communicativeUse = String(cityMap.communicativeUse).replace(
        operation,
        `${operation}-mutated`,
      );
    }, "l09_semantic_contract_invalid:c07_four_proof_or_destination");

  expectL10PlanExact((plan) => {
    plan.introducedConstructIds = [L10_TEMPORAL];
  }, "l10_semantic_contract_invalid:sets");
  expectL10PlanExact((plan) => {
    (plan.session56Final as R).requiredConstructIds = [
      L10_TEMPORAL,
      L10_DATIVE,
      L10_MODAL,
    ];
  }, "l10_semantic_contract_invalid:sets");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c1 = (l10.chapters as R[])[0];
    ((c1.lifecycleAnchors as R[])[0] as R).packetId = "de_l10_c01_s03";
  }, "l10_semantic_contract_invalid:anchors");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c1 = (l10.chapters as R[])[0];
    const sense = ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    sense.communicativeUse = "state a morning interval";
  }, "l10_semantic_contract_invalid:closed_chapter:de_l10_c01");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c1 = (l10.chapters as R[])[0];
    const sense = ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    sense.lexicalKind = "FIXED_EXPRESSION";
    sense.partOfSpeech = "fixed_expression";
    sense.lemmaOrExpression = "für den Vormittag";
  }, "l10_lexical_prerequisite_invalid:de_l10_c01:Vormittag");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c1 = (l10.chapters as R[])[0];
    const help = ((c1.checkpoint as R).plannedNewLexicalSenses as R[]).find(
      (sense) => sense.id === "de_lex_plan_l10_c01_helfen_v1",
    ) as R;
    (help.verbPackage as R).valencyFrame =
      "ditransitive transferred-entity frame";
  }, "l10_semantic_contract_invalid:helfen_dative_np");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c1 = (l10.chapters as R[])[0];
    const help = ((c1.checkpoint as R).plannedNewLexicalSenses as R[]).find(
      (sense) => sense.id === "de_lex_plan_l10_c01_helfen_v1",
    ) as R;
    (help.verbPackage as R).separability = "separable";
  }, "l10_semantic_contract_invalid:helfen_dative_np");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const chapters = l10.chapters as R[];
    const c1Senses = (chapters[0].checkpoint as R)
      .plannedNewLexicalSenses as R[];
    const helfenIndex = c1Senses.findIndex(
      (sense) => sense.id === "de_lex_plan_l10_c01_helfen_v1",
    );
    const helfen = c1Senses.splice(helfenIndex, 1)[0];
    ((chapters[1].checkpoint as R).plannedNewLexicalSenses as R[]).push(helfen);
  }, "l10_lexical_prerequisite_invalid:de_l10_c01:helfen");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c1 = (l10.chapters as R[])[0];
    (c1.checkpoint as R).plannedNewLexicalSenses = (
      (c1.checkpoint as R).plannedNewLexicalSenses as R[]
    ).filter((sense) => sense.id !== "de_lex_plan_l10_c01_helfen_v1");
  }, "l10_lexical_prerequisite_invalid:de_l10_c01:helfen");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const chapters = l10.chapters as R[];
    const c1Senses = (chapters[0].checkpoint as R)
      .plannedNewLexicalSenses as R[];
    const vormittag = c1Senses.splice(0, 1)[0];
    ((chapters[1].checkpoint as R).plannedNewLexicalSenses as R[]).push(
      vormittag,
    );
  }, "l10_lexical_prerequisite_invalid:de_l10_c01:Vormittag");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c1 = (l10.chapters as R[])[0];
    (c1.checkpoint as R).plannedNewLexicalSenses = (
      (c1.checkpoint as R).plannedNewLexicalSenses as R[]
    ).filter((sense) => sense.id !== "de_lex_plan_l10_c01_vormittag_v1");
  }, "l10_lexical_prerequisite_invalid:de_l10_c01:Vormittag");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const chapters = l10.chapters as R[];
    const werkbank = (
      (chapters[1].checkpoint as R).plannedNewLexicalSenses as R[]
    ).splice(0, 1)[0];
    ((chapters[2].checkpoint as R).plannedNewLexicalSenses as R[]).push(
      werkbank,
    );
  }, "l10_lexical_prerequisite_invalid:de_l10_c02:Werkbank");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c2 = (l10.chapters as R[])[1];
    (c2.checkpoint as R).plannedNewLexicalSenses = [];
  }, "l10_lexical_prerequisite_invalid:de_l10_c02:Werkbank");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c1 = (l10.chapters as R[])[0];
    (c1.supportFading as R).entry = `${String(
      (c1.supportFading as R).entry,
    )} Werkbank`;
  }, "l10_lexical_prerequisite_invalid:de_l10_c01:Werkbank");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c1 = (l10.chapters as R[])[0];
    const helfen = ((c1.checkpoint as R).plannedNewLexicalSenses as R[]).find(
      (sense) => sense.id === "de_lex_plan_l10_c01_helfen_v1",
    ) as R;
    (helfen.utilityProof as R).necessityClass = "OUTCOME_UNACHIEVABLE";
  }, "l10_semantic_contract_invalid:closed_chapter:de_l10_c01");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c2 = (l10.chapters as R[])[1];
    const werkbank = ((c2.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    (werkbank.utilityProof as R).necessityClass = "OUTCOME_UNACHIEVABLE";
  }, "l10_semantic_contract_invalid:closed_chapter:de_l10_c02");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c1 = (l10.chapters as R[])[0];
    (c1.supportFading as R).entry = String(
      (c1.supportFading as R).entry,
    ).replace("für den Vormittag", "für den Dienst");
  }, "l10_semantic_contract_invalid:closed_chapter:de_l10_c01");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c1 = (l10.chapters as R[])[0];
    const extra = clone(
      ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[0],
    ) as R;
    extra.id = "de_lex_plan_l10_c01_morgen_v1";
    extra.semanticIdentity =
      "morgen|morning period used as an undeclared extra";
    extra.lemmaOrExpression = "Morgen";
    extra.senseGloss = "morning period used as an undeclared extra";
    (extra.nounPackage as R).article = "der";
    (extra.nounPackage as R).singular = "Morgen";
    (extra.nounPackage as R).plural = "Morgen";
    extra.nounPackageIdentity = "der|morgen|morgen";
    ((c1.checkpoint as R).plannedNewLexicalSenses as R[]).push(extra);
  }, "l10_semantic_contract_invalid:chapter_contract");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c3 = (l10.chapters as R[])[2];
    const schicht = ((c3.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    (schicht.nounPackage as R).article = "das";
  }, "l10_semantic_contract_invalid:lexical_packages");

  expectExact((raw) => {
    const l9 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l09",
    ) as R;
    const c5 = (l9.chapters as R[])[4];
    ((c5.recallSchedule as R).futureDelayedProbe as R).packetId =
      "de_l10_c07_s56";
  }, "l09_l10_inverse_provenance_invalid");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c1 = (l10.chapters as R[])[0];
    ((c1.recallSchedule as R).futureDelayedProbe as R).packetId =
      "de_l11_c07_s56";
  }, "l10_l11_inverse_provenance_invalid");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c2 = (l10.chapters as R[])[1];
    (c2.recallSchedule as R).targetsFutureChapterIds = ["de_l10_c04"];
  }, "l10_recall_contract_invalid:de_l10_c02");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c2 = (l10.chapters as R[])[1];
    const help = ((c2.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    help.communicativeUse = "Ich gebe dem Kollegen den Plan.";
  }, "l10_semantic_contract_invalid:closed_chapter:de_l10_c02");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c4 = (l10.chapters as R[])[3];
    (c4.supportFading as R).exit = "help him";
  }, "l10_semantic_contract_invalid:closed_chapter:de_l10_c04");
  for (const replacement of [
    "Der Rollwagen steht im Flur.",
    "Der Kollege darf gehen.",
  ])
    expectExact((raw) => {
      const l10 = (raw.lessons as R[]).find(
        (lesson) => lesson.lessonId === "de_l10",
      ) as R;
      const c5 = (l10.chapters as R[])[4];
      (c5.supportFading as R).entry = String(
        (c5.supportFading as R).entry,
      ).replace("Der Rollwagen kann durch den Ausgang fahren.", replacement);
    }, "l10_semantic_contract_invalid:closed_chapter:de_l10_c05");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c7 = (l10.chapters as R[])[6];
    (c7.supportFading as R).entry =
      "incoming delayed provenance: de_l10_c07_s51<-de_l09_c01; de_l10_c07_s52<-de_l09_c02; de_l10_c07_s53<-de_l09_c03; de_l10_c07_s54<-de_l09_c04; de_l10_c07_s55<-de_l09_c05+de_l09_c07; de_l10_c07_s56<-de_l09_c06";
  }, "l10_semantic_contract_invalid:closed_chapter:de_l10_c07");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c7 = (l10.chapters as R[])[6];
    const flur = ((c7.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    flur.communicativeUse = "Wie kann der Rollwagen durch den Flur fahren?";
  }, "l10_semantic_contract_invalid:closed_chapter:de_l10_c07");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c7 = (l10.chapters as R[])[6];
    (c7.allowedConstructIds as string[]).push(L10_W);
    ((c7.checkpoint as R).integratedConstructIds as string[]).push(L10_W);
  }, "l10_semantic_contract_invalid:chapter_contract");
  expectExact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c7 = (l10.chapters as R[])[6];
    (c7.chapterEvidencePacketIds as string[]).splice(0, 1);
  }, "l09_l10_inverse_provenance_invalid");

  expectL11Exact((raw) => {
    raw.lessons = (raw.lessons as R[]).filter(
      (lesson) => lesson.lessonId !== "de_l11",
    );
  }, "l11_semantic_contract_invalid:missing");
  expectL11PlanExact((plan) => {
    plan.introducedConstructIds = [L11_LOCATION];
  }, "l11_semantic_contract_invalid:sets");
  expectL11PlanExact((plan) => {
    (plan.session56Final as R).requiredConstructIds = [
      L11_LOCATION,
      L11_DATIVE_PRONOUN,
      L11_TEMPORAL,
    ];
  }, "l11_semantic_contract_invalid:sets");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c1 = (l11.chapters as R[])[0];
    ((c1.lifecycleAnchors as R[])[0] as R).packetId = "de_l11_c01_s03";
  }, "l11_semantic_contract_invalid:anchors");
  expectL11Exact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const c7 = (l10.chapters as R[])[6];
    ((c7.recallSchedule as R).futureDelayedProbe as R).packetId =
      "de_l11_c07_s56";
  }, "l10_l11_inverse_provenance_invalid");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c7 = (l11.chapters as R[])[6];
    (c7.chapterEvidencePacketIds as string[]).splice(0, 1);
  }, "l10_l11_inverse_provenance_invalid");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c7 = (l11.chapters as R[])[6];
    ((c7.recallSchedule as R).futureDelayedProbe as R).packetId =
      "de_l12_c07_s56";
  }, "l11_l12_inverse_provenance_invalid");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c1 = (l11.chapters as R[])[0];
    (c1.situation as R).setting = "renamed-event-venue";
  }, "l11_semantic_contract_invalid:closed_chapter:de_l11_c01");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c2 = (l11.chapters as R[])[1];
    (c2.recallSchedule as R).targetsFutureChapterIds = ["de_l11_c04"];
  }, "l11_recall_contract_invalid:de_l11_c02");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const chapters = l11.chapters as R[];
    const garderobe = (
      (chapters[0].checkpoint as R).plannedNewLexicalSenses as R[]
    ).splice(0, 1)[0];
    ((chapters[1].checkpoint as R).plannedNewLexicalSenses as R[]).push(
      garderobe,
    );
  }, "l11_lexical_prerequisite_invalid:de_l11_c01:Garderobe");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c1 = (l11.chapters as R[])[0];
    (c1.supportFading as R).entry = `${String(
      (c1.supportFading as R).entry,
    )} Infostand`;
  }, "l11_lexical_prerequisite_invalid:de_l11_c01:Infostand");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c3 = (l11.chapters as R[])[2];
    const toilette = ((c3.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    (toilette.nounPackage as R).article = "das";
  }, "l11_semantic_contract_invalid:lexical_packages");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c2 = (l11.chapters as R[])[1];
    (c2.supportFading as R).entry = `${String(
      (c2.supportFading as R).entry,
    )} Der Infostand ist in der Halle.`;
  }, "l11_semantic_contract_invalid:dative_location_bei");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c3 = (l11.chapters as R[])[2];
    (c3.supportFading as R).exit = `${String(
      (c3.supportFading as R).exit,
    )} movement means Akkusativ`;
  }, "l11_semantic_contract_invalid:dative_location_bei");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c2 = (l11.chapters as R[])[1];
    (c2.supportFading as R).entry = String(
      (c2.supportFading as R).entry,
    ).replace(L11_PRONOUN_CHAIN, "Ich helfe dem Besucher. Ich helfe ihn.");
  }, "l11_semantic_contract_invalid:dative_pronoun_antecedent");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c4 = (l11.chapters as R[])[3];
    (c4.supportFading as R).exit = `${String(
      (c4.supportFading as R).exit,
    )} pronoun table`;
  }, "l11_semantic_contract_invalid:dative_pronoun_antecedent");
  expectL11Exact((raw) => {
    const l10 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l10",
    ) as R;
    const help = (
      ((l10.chapters as R[])[0].checkpoint as R).plannedNewLexicalSenses as R[]
    ).find((sense) => sense.id === "de_lex_plan_l10_c01_helfen_v1") as R;
    (help.verbPackage as R).valencyFrame =
      "two-object dative-plus-accusative transfer frame";
  }, "l11_semantic_contract_invalid:dative_pronoun_antecedent");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c4 = (l11.chapters as R[])[3];
    (c4.supportFading as R).entry = `${String(
      (c4.supportFading as R).entry,
    )} Ich gebe dem Besucher den Plan.`;
  }, "l11_semantic_contract_invalid:dative_pronoun_antecedent");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c5 = (l11.chapters as R[])[4];
    (c5.supportFading as R).exit = "both are simply dative";
  }, "l11_semantic_contract_invalid:c05_function_contrast");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c6 = (l11.chapters as R[])[5];
    (c6.supportFading as R).entry =
      "choose any dative-looking form and keep Ich helfe dem Besucher. Ich helfe ihm.";
  }, "l11_semantic_contract_invalid:c06_repair");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c7 = (l11.chapters as R[])[6];
    (c7.supportFading as R).exit =
      "name the venue and mention that somebody helps";
  }, "l11_semantic_contract_invalid:c07_transfer_or_provenance");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c1 = (l11.chapters as R[])[0];
    const extra = clone(
      ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[0],
    ) as R;
    extra.id = "de_lex_plan_l11_c01_halle_v1";
    extra.semanticIdentity = "halle|undeclared venue hall";
    extra.lemmaOrExpression = "Halle";
    extra.senseGloss = "undeclared venue hall";
    (extra.nounPackage as R).article = "die";
    (extra.nounPackage as R).singular = "Halle";
    (extra.nounPackage as R).plural = "Hallen";
    extra.nounPackageIdentity = "die|halle|hallen";
    ((c1.checkpoint as R).plannedNewLexicalSenses as R[]).push(extra);
  }, "l11_semantic_contract_invalid:chapter_contract");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c2 = (l11.chapters as R[])[1];
    const infostand = ((c2.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    infostand.lexicalKind = "FIXED_EXPRESSION";
    infostand.partOfSpeech = "fixed_expression";
  }, "l11_semantic_contract_invalid:chapter_contract");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c1 = (l11.chapters as R[])[0];
    ((c1.checkpoint as R).plannedNewLexicalSenses as R[]).reverse();
  }, "l11_semantic_contract_invalid:chapter_contract");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c7 = (l11.chapters as R[])[6];
    (c7.allowedConstructIds as string[]).reverse();
    ((c7.checkpoint as R).integratedConstructIds as string[]).reverse();
  }, "l11_semantic_contract_invalid:c07_transfer_or_provenance");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c1 = (l11.chapters as R[])[0];
    c1.chapterEvidencePacketIds = ["de_l11_c01_s05"];
  }, "l11_semantic_contract_invalid:chapter_evidence:de_l11_c01");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c1 = (l11.chapters as R[])[0];
    const sense = ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    ((sense.utilityProof as R).plannedUsePacketIds as string[]).unshift(
      "de_l11_c01_s07",
    );
  }, "l11_semantic_contract_invalid:planned_use_packets:de_lex_plan_l11_c01_garderobe_v1");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c7 = (l11.chapters as R[])[6];
    (c7.supportFading as R).entry =
      "minimal changed-venue card with Die Servicestelle ist für den Vormittag bei dem Eingang. and the adjacent chain Ich helfe dem Besucher. Ich helfe ihm.";
    (c7.supportFading as R).exit =
      "independently produce Die Servicestelle ist für den Vormittag bei dem Eingang. and the exact adjacent chain Ich helfe dem Besucher. Ich helfe ihm.";
    const sense = ((c7.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    sense.communicativeUse =
      "at the changed civic-centre venue, independently use Die Servicestelle ist für den Vormittag bei dem Eingang. and Ich helfe dem Besucher. Ich helfe ihm. to prove location, time, recipient, and dative reference";
  }, "l11_semantic_contract_invalid:c07_transfer_or_provenance");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c1 = (l11.chapters as R[])[0];
    (c1.supportFading as R).entry =
      "venue map and role cards showing Die Garderobe ist beim Eingang. and the adjacent chain Ich helfe dem Besucher. Ich helfe ihm., with beim, dem Besucher, and ihm colour-marked";
  }, "l11_semantic_contract_invalid:c01_guardian_proof");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c1 = (l11.chapters as R[])[0];
    (c1.supportFading as R).entry =
      "venue map and role cards showing Die Garderobe ist bei dem Ausgang. and the adjacent chain Ich helfe dem Besucher. Ich helfe ihm., with bei, dem Besucher, and ihm colour-marked";
  }, "l11_semantic_contract_invalid:neutral_bei_contraction");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    (l11.grammarBoundary as R).noExpansion =
      "Allow movement means Akkusativ and use in/an/auf/neben.";
  }, "l11_semantic_contract_invalid:no_expansion");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c6 = (l11.chapters as R[])[5];
    (c6.supportFading as R).entry =
      "repair card with incorrect Die Toilette ist bei den Infostand. and unsupported Ich helfe ihm.; require Die Toilette ist bei dem Infostand. and the adjacent chain Ich helfe dem Besucher. Ich helfe ihm.";
  }, "l11_semantic_contract_invalid:c06_repair");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c6 = (l11.chapters as R[])[5];
    (c6.situation as R).goal =
      "repair-one-bei-dative-form-and-one-dative-pronoun-without-an-explicit-adjacent-antecedent";
  }, "l11_semantic_contract_invalid:c06_antecedent_contract");
  expectL11Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c1 = (l11.chapters as R[])[0];
    (c1.supportFading as R).entryLevel = 4;
  }, "l11_semantic_contract_invalid:closed_chapter:de_l11_c01");

  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    (l12.grammarBoundary as R).noExpansion =
      "Use all Wechselpräpositionen and choose Akkusativ whenever there is movement.";
  }, "l12_semantic_contract_invalid:no_expansion");
  expectL12Exact((raw) => {
    raw.lessons = (raw.lessons as R[]).filter(
      (lesson) => lesson.lessonId !== "de_l12",
    );
  }, "l12_semantic_contract_invalid:missing");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    ((l12.grammarBoundary as R).allowedConstructIds as string[]).reverse();
  }, "l12_semantic_contract_invalid:sets");
  expectL12PlanExact((plan) => {
    (plan.introducedConstructIds as string[]).reverse();
  }, "l12_semantic_contract_invalid:sets");
  expectL12PlanExact((plan) => {
    (plan.extendedConstructIds as string[]).pop();
  }, "l12_semantic_contract_invalid:sets");
  expectL12PlanExact((plan) => {
    (plan.reviewedConstructIds as string[]).reverse();
  }, "l12_semantic_contract_invalid:sets");
  expectL12PlanExact((plan) => {
    (plan.prohibitedConstructIds as string[]).reverse();
  }, "l12_semantic_contract_invalid:sets");
  expectL12PlanExact((plan) => {
    ((plan.session56Final as R).requiredConstructIds as string[]).reverse();
  }, "l12_semantic_contract_invalid:sets");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c1 = (l12.chapters as R[])[0];
    ((c1.lifecycleAnchors as R[])[0] as R).packetId = "de_l12_c01_s03";
  }, "l12_semantic_contract_invalid:anchors");
  expectL12Exact((raw) => {
    const l11 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l11",
    ) as R;
    const c7 = (l11.chapters as R[])[6];
    ((c7.recallSchedule as R).futureDelayedProbe as R).packetId =
      "de_l12_c07_s56";
  }, "l11_l12_inverse_provenance_invalid");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c7 = (l12.chapters as R[])[6];
    ((c7.recallSchedule as R).futureDelayedProbe as R).packetId =
      "de_l13_c07_s56";
  }, "l12_l13_inverse_provenance_invalid");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c2 = (l12.chapters as R[])[1];
    (c2.recallSchedule as R).targetsFutureChapterIds = ["de_l12_c04"];
  }, "l12_recall_contract_invalid:de_l12_c02");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const chapters = l12.chapters as R[];
    const tasche = (
      (chapters[1].checkpoint as R).plannedNewLexicalSenses as R[]
    ).splice(0, 1)[0];
    ((chapters[2].checkpoint as R).plannedNewLexicalSenses as R[]).push(tasche);
  }, "l12_lexical_prerequisite_invalid:de_l12_c02:Tasche");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c1 = (l12.chapters as R[])[0];
    (c1.supportFading as R).entry = `${String(
      (c1.supportFading as R).entry,
    )} Spendenbox`;
  }, "l12_lexical_prerequisite_invalid:de_l12_c01:Spendenbox");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c3 = (l12.chapters as R[])[2];
    const karton = ((c3.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    (karton.nounPackage as R).article = "das";
  }, "l12_semantic_contract_invalid:lexical_packages");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c1 = (l12.chapters as R[])[0];
    (c1.supportFading as R).entry = String(
      (c1.supportFading as R).entry,
    ).replace(
      "Ich gebe dem Helfer die Kiste.",
      "Ich gebe den Helfer die Kiste.",
    );
  }, "l12_semantic_contract_invalid:two_object_roles");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c2 = (l12.chapters as R[])[1];
    (c2.supportFading as R).entry = String(
      (c2.supportFading as R).entry,
    ).replace("die Tasche ins Regal", "die Tasche im Regal");
  }, "l12_semantic_contract_invalid:wechsel_relation");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c3 = (l12.chapters as R[])[2];
    (c3.supportFading as R).exit = `${String(
      (c3.supportFading as R).exit,
    )} Bewegung bedeutet immer Akkusativ.`;
  }, "l12_semantic_contract_invalid:wechsel_relation");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c4 = (l12.chapters as R[])[3];
    (c4.supportFading as R).entry = `${String(
      (c4.supportFading as R).entry,
    )} Ich bringe die Spendenbox auf den Tisch.`;
  }, "l12_semantic_contract_invalid:wechsel_relation");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c4 = (l12.chapters as R[])[3];
    (c4.supportFading as R).exit = `${String(
      (c4.supportFading as R).exit,
    )} hinstellen`;
  }, "l12_semantic_contract_invalid:wechsel_relation");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c2 = (l12.chapters as R[])[1];
    (c2.supportFading as R).exit = `${String(
      (c2.supportFading as R).exit,
    )} Wechselpreposition table`;
  }, "l12_semantic_contract_invalid:wechsel_relation");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c5 = (l12.chapters as R[])[4];
    (c5.supportFading as R).entry = String(
      (c5.supportFading as R).entry,
    ).replace(L12_C05_ITEM_FIRST, "Ich gebe dem Helfer das Materialpaket.");
  }, "l12_semantic_contract_invalid:c05_word_order_proof");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c6 = (l12.chapters as R[])[5];
    (c6.supportFading as R).entry = String(
      (c6.supportFading as R).entry,
    ).replace(L12_C06_GOOD_RECIPIENT, L12_C06_BAD_RECIPIENT);
  }, "l12_semantic_contract_invalid:c06_repair");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c7 = (l12.chapters as R[])[6];
    (c7.supportFading as R).exit = String((c7.supportFading as R).exit).replace(
      "Ich gebe ihm die Losbox.",
      "Ich gebe ihn die Losbox.",
    );
  }, "l12_semantic_contract_invalid:c07_transfer_or_provenance");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c7 = (l12.chapters as R[])[6];
    (c7.allowedConstructIds as string[]).reverse();
    ((c7.checkpoint as R).integratedConstructIds as string[]).reverse();
  }, "l12_semantic_contract_invalid:c07_transfer_or_provenance");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c1 = (l12.chapters as R[])[0];
    c1.chapterEvidencePacketIds = ["de_l12_c01_s05"];
  }, "l12_semantic_contract_invalid:chapter_evidence:de_l12_c01");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c7 = (l12.chapters as R[])[6];
    (c7.chapterEvidencePacketIds as string[]).splice(4, 1);
  }, "l11_l12_inverse_provenance_invalid");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c1 = (l12.chapters as R[])[0];
    const sense = ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    ((sense.utilityProof as R).plannedUsePacketIds as string[]).unshift(
      "de_l12_c01_s07",
    );
  }, "l12_semantic_contract_invalid:planned_use_packets:de_lex_plan_l12_c01_geben_v1");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c2 = (l12.chapters as R[])[1];
    (c2.situation as R).setting = "renamed-donation-counter";
  }, "l12_semantic_contract_invalid:chapter_contract");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c1 = (l12.chapters as R[])[0];
    ((c1.checkpoint as R).plannedNewLexicalSenses as R[]).reverse();
  }, "l12_semantic_contract_invalid:chapter_contract");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c1 = (l12.chapters as R[])[0];
    const geben = ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    geben.semanticIdentity =
      "geben|transfer an item to a named recipient in one verified two-object frame";
  }, "l12_semantic_contract_invalid:lexical_packages");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c1 = (l12.chapters as R[])[0];
    const geben = ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    (geben.verbPackage as R).valencyFrame =
      "explicit dative recipient plus explicit accusative transferred entity";
  }, "l12_semantic_contract_invalid:lexical_packages");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c1 = (l12.chapters as R[])[0];
    const bringen = ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[1];
    (bringen.verbPackage as R).valencyFrame =
      "explicit accusative item plus bounded in plus accusative destination";
  }, "l12_semantic_contract_invalid:lexical_packages");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c1 = (l12.chapters as R[])[0];
    const geben = ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    (geben.verbPackage as R).valencyFrame =
      "recipient and item selected by word order";
  }, "l12_semantic_contract_invalid:lexical_packages");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c6 = (l12.chapters as R[])[5];
    const sense = ((c6.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    (sense.utilityProof as R).facetValue = "generic-repair";
  }, "l12_semantic_contract_invalid:lexical_packages");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c7 = (l12.chapters as R[])[6];
    const losbox = ((c7.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    losbox.communicativeUse = "generic raffle vocabulary";
  }, "l12_semantic_contract_invalid:lexical_packages");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c1 = (l12.chapters as R[])[0];
    const geben = ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    ((geben.utilityProof as R).integratedConstructIds as string[]).reverse();
  }, "l12_semantic_contract_invalid:lexical_packages");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c2 = (l12.chapters as R[])[1];
    const tasche = ((c2.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    tasche.lexicalKind = "FIXED_EXPRESSION";
    tasche.partOfSpeech = "fixed_expression";
  }, "l12_semantic_contract_invalid:chapter_contract");
  expectL12Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c4 = (l12.chapters as R[])[3];
    (c4.allowedConstructIds as string[]).push("de_gc_predicative_adjective_v1");
    ((c4.checkpoint as R).integratedConstructIds as string[]).push(
      "de_gc_predicative_adjective_v1",
    );
  }, "l12_semantic_contract_invalid:chapter_contract");

  expectL13Exact((raw) => {
    raw.lessons = (raw.lessons as R[]).filter(
      (lesson) => lesson.lessonId !== "de_l13",
    );
  }, "l13_semantic_contract_invalid:missing");
  expectL13Exact((raw) => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    (l13.grammarBoundary as R).noExpansion =
      "Teach the full adjective paradigm and infer endings from shortcuts.";
  }, "l13_semantic_contract_invalid:no_expansion");
  expectL13Exact((raw) => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    ((l13.grammarBoundary as R).allowedConstructIds as string[]).reverse();
  }, "l13_semantic_contract_invalid:sets");
  expectL13PlanExact((plan) => {
    (plan.introducedConstructIds as string[]).reverse();
  }, "l13_semantic_contract_invalid:sets");
  expectL13PlanExact((plan) => {
    (plan.extendedConstructIds as string[]).reverse();
  }, "l13_semantic_contract_invalid:sets");
  expectL13PlanExact((plan) => {
    (plan.reviewedConstructIds as string[]).reverse();
  }, "l13_semantic_contract_invalid:sets");
  expectL13PlanExact((plan) => {
    (plan.prohibitedConstructIds as string[]).reverse();
  }, "l13_semantic_contract_invalid:sets");
  expectL13PlanExact((plan) => {
    ((plan.session56Final as R).requiredConstructIds as string[]).reverse();
  }, "l13_semantic_contract_invalid:sets");
  expectL13Exact((raw) => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    const c7 = (l13.chapters as R[])[6];
    (c7.allowedConstructIds as string[]).reverse();
    ((c7.checkpoint as R).integratedConstructIds as string[]).reverse();
  }, "l13_semantic_contract_invalid:sets");
  expectL13Exact((raw) => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    const c1 = (l13.chapters as R[])[0];
    ((c1.lifecycleAnchors as R[])[0] as R).packetId = "de_l13_c01_s03";
  }, "l13_semantic_contract_invalid:anchors");
  expectL13Exact((raw) => {
    const l12 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l12",
    ) as R;
    const c1 = (l12.chapters as R[])[0];
    ((c1.recallSchedule as R).futureDelayedProbe as R).packetId =
      "de_l13_c07_s56";
  }, "l12_l13_inverse_provenance_invalid");
  expectL13Exact((raw) => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    const c7 = (l13.chapters as R[])[6];
    ((c7.recallSchedule as R).futureDelayedProbe as R).packetId =
      "de_l14_c07_s56";
  }, "l13_l14_inverse_provenance_invalid");
  expectL13Exact((raw) => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    const c3 = (l13.chapters as R[])[2];
    (c3.recallSchedule as R).retrievesFromChapterIds = ["de_l13_c02"];
  }, "l13_recall_contract_invalid:de_l13_c03");
  expectL13Exact((raw) => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    const c1 = (l13.chapters as R[])[0];
    (c1.supportFading as R).entryLevel = 4;
  }, "l13_semantic_contract_invalid:support_fading");
  expectL13Exact((raw) => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    const c2 = (l13.chapters as R[])[1];
    (c2.situation as R).setting = "generic-shop";
  }, "l13_semantic_contract_invalid:situations");
  expectL13Exact((raw) => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    const c1 = (l13.chapters as R[])[0];
    c1.chapterEvidencePacketIds = ["de_l13_c01_s05"];
  }, "l13_semantic_contract_invalid:evidence");
  expectL13Exact((raw) => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    const c1 = (l13.chapters as R[])[0];
    const sense = ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    ((sense.utilityProof as R).plannedUsePacketIds as string[]).unshift(
      "de_l13_c01_s07",
    );
  }, "l13_semantic_contract_invalid:lexical_packages");
  expectL13Exact((raw) => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    const c3 = (l13.chapters as R[])[2];
    const sense = ((c3.checkpoint as R).plannedNewLexicalSenses as R[])[1];
    sense.semanticIdentity = "hell|generic positive quality";
  }, "l13_semantic_contract_invalid:lexical_packages");
  expectL13Exact((raw) => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    const c4 = (l13.chapters as R[])[3];
    const senses = (c4.checkpoint as R).plannedNewLexicalSenses as R[];
    senses.push(clone(senses[0]));
  }, "l13_semantic_contract_invalid:lexical_packages");
  expectL13Exact((raw) => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    const c6 = (l13.chapters as R[])[5];
    (c6.supportFading as R).entry =
      `${L13_C06_REPAIR_ITEMS[0]} and ${L13_C06_REPAIR_ITEMS[1]}`;
  }, "l13_semantic_contract_invalid:c06_repair_items");
  expectL13Exact((raw) => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    const c7 = (l13.chapters as R[])[6];
    const senses = (c7.checkpoint as R).plannedNewLexicalSenses as R[];
    const gruppe = senses.find(
      (sense) => sense.id === "de_lex_plan_l13_c07_gruppe_v1",
    )!;
    (gruppe.utilityProof as R).facetValue = "generic-participants";
  }, "l13_semantic_contract_invalid:c07_final_transfer");

  const appendL13BoundedMutation = (raw: R, textToAppend: string): void => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    const c1 = (l13.chapters as R[])[0];
    const sense = ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    sense.communicativeUse = `${String(sense.communicativeUse)} ${textToAppend}`;
  };
  for (const mutation of [
    "Das Zimmer ist ruhige.",
    "das ruhig Zimmer",
    "den stabile Koffer",
    "dem erfahrene Helfer",
    "bare adjective paradigm",
    "ein ruhiges Zimmer",
    "Genitiv adjective forms",
    "plural adjective forms",
    "comparative and superlative forms",
    "strong-weak-mixed ending table",
    "nicht-focus",
    "doch",
    "future grammar",
  ]) {
    expectL13Exact(
      (raw) => appendL13BoundedMutation(raw, mutation),
      "l13_semantic_contract_invalid:bounded_agreement",
    );
  }

  expectL14Exact((raw) => {
    raw.lessons = (raw.lessons as R[]).filter(
      (lesson) => lesson.lessonId !== "de_l14",
    );
  }, "l14_semantic_contract_invalid:sets");
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    (l14.grammarBoundary as R).noExpansion =
      "Teach a universal nicht-position rule and generic ja-doch substitution.";
  }, "l14_semantic_contract_invalid:no_expansion");
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    (l14.grammarBoundary as R).noExpansion =
      "The lesson permits bounded nicht against one explicit familiar focus and doch only when contradicting an explicit negative proposition in known frames. Property descriptions are limited to known predicative and definite-article agreement. Free information-structure analysis, generic ja↔doch substitution, modal or connective doch, universal nicht-position rules, new case, Partizip II, Perfekt, subordinate clauses, comparative or superlative morphology, and future grammar are prohibited.";
  }, "l14_semantic_contract_invalid:no_expansion");
  for (const field of [
    "introducedConstructIds",
    "extendedConstructIds",
    "reviewedConstructIds",
    "prohibitedConstructIds",
  ]) {
    expectL14PlanExact((plan) => {
      (plan[field] as string[]).reverse();
    }, "l14_semantic_contract_invalid:sets");
  }
  expectL14PlanExact((plan) => {
    ((plan.session56Final as R).requiredConstructIds as string[]).reverse();
  }, "l14_semantic_contract_invalid:sets");
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    ((l14.grammarBoundary as R).allowedConstructIds as string[]).reverse();
  }, "l14_semantic_contract_invalid:sets");
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    const c7 = (l14.chapters as R[])[6];
    (c7.allowedConstructIds as string[]).reverse();
    ((c7.checkpoint as R).integratedConstructIds as string[]).reverse();
  }, "l14_semantic_contract_invalid:sets");
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    const c1 = (l14.chapters as R[])[0];
    ((c1.lifecycleAnchors as R[])[0] as R).packetId = "de_l14_c01_s03";
  }, "l14_semantic_contract_invalid:anchors");
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    const c2 = (l14.chapters as R[])[1];
    (c2.situation as R).setting = "generic-accommodation";
  }, "l14_semantic_contract_invalid:situations");
  const rejectedL14SituationValues = [
    [0, "primary", "participants", "hotel-receptionist-and-guest"],
    [
      0,
      "primary",
      "goal",
      "reject-ruhige-zimmer-select-helle-zimmer-and-correct-negative-availability-assumption",
    ],
    [
      0,
      "primary",
      "contextSignature",
      "hotel-room-nicht-focus-doch-correction-introduction",
    ],
    [0, "new", "participants", "guesthouse-host-and-guest"],
    [
      0,
      "new",
      "goal",
      "independently-reject-ruhige-zimmer-select-helle-zimmer-and-correct-negative-availability-assumption",
    ],
    [0, "new", "contextSignature", "guesthouse-room-nicht-doch-check"],
    [1, "primary", "participants", "conference-hotel-agent-and-attendee"],
    [
      1,
      "primary",
      "goal",
      "place-nicht-before-the-rejected-doppelzimmer-option-and-select-das-ruhige-zimmer",
    ],
    [
      1,
      "primary",
      "contextSignature",
      "conference-hotel-room-nicht-guided-selection",
    ],
    [1, "new", "participants", "training-centre-coordinator-and-participant"],
    [
      1,
      "new",
      "goal",
      "independently-reject-doppelzimmer-and-select-das-ruhige-zimmer",
    ],
    [1, "new", "contextSignature", "training-centre-room-nicht-check"],
    [2, "primary", "participants", "hotel-receptionist-and-guest"],
    [
      2,
      "primary",
      "goal",
      "recognise-the-negative-breakfast-inclusion-question-and-license-doch",
    ],
    [
      2,
      "primary",
      "contextSignature",
      "hotel-breakfast-negative-question-doch-retrieval",
    ],
    [2, "new", "participants", "guesthouse-host-and-guest"],
    [
      2,
      "new",
      "goal",
      "independently-correct-a-negative-breakfast-inclusion-assumption-with-doch",
    ],
    [3, "primary", "participants", "hotel-receptionist-and-driver"],
    [
      3,
      "primary",
      "goal",
      "recognise-the-negative-parking-availability-question-and-answer-with-doch-plus-positive-proposition",
    ],
    [
      3,
      "primary",
      "contextSignature",
      "hotel-parking-negative-question-doch-production",
    ],
    [3, "new", "participants", "conference-hotel-clerk-and-driver"],
    [
      3,
      "new",
      "goal",
      "independently-correct-a-negative-parking-availability-assumption-with-doch",
    ],
    [3, "new", "contextSignature", "conference-hotel-parking-doch-check"],
    [4, "primary", "participants", "hotel-clerk-and-guest"],
    [
      4,
      "primary",
      "goal",
      "select-the-gunstige-room-and-correct-its-negative-availability-assumption",
    ],
    [
      4,
      "primary",
      "contextSignature",
      "hotel-rate-property-nicht-doch-combination",
    ],
    [4, "new", "participants", "family-hotel-host-and-guest"],
    [
      4,
      "new",
      "goal",
      "independently-select-das-gunstige-zimmer-and-correct-the-negative-availability-assumption",
    ],
    [
      4,
      "new",
      "contextSignature",
      "family-hotel-gunstige-zimmer-correction-check",
    ],
    [5, "primary", "participants", "booking-agent-and-guest"],
    [
      5,
      "primary",
      "goal",
      "repair-nicht-placement-and-replace-nein-with-doch-after-an-explicit-negative-question",
    ],
    [
      5,
      "primary",
      "contextSignature",
      "booking-confirmation-nicht-doch-dual-repair",
    ],
    [5, "new", "participants", "hostel-receptionist-and-guest"],
    [
      5,
      "new",
      "goal",
      "independently-repair-the-nicht-position-and-the-doch-response-contrast",
    ],
    [6, "primary", "participants", "holiday-apartment-host-and-guest"],
    [
      6,
      "primary",
      "goal",
      "reject-the-quiet-apartment-select-the-central-apartment-and-correct-the-negative-availability-assumption",
    ],
    [
      6,
      "primary",
      "contextSignature",
      "holiday-apartment-choice-property-doch-final-transfer",
    ],
    [6, "new", "participants", "tourism-adviser-and-traveller"],
    [
      6,
      "new",
      "goal",
      "independently-reject-die-ruhige-ferienwohnung-select-die-zentrale-ferienwohnung-and-correct-the-negative-availability-assumption",
    ],
    [
      6,
      "new",
      "contextSignature",
      "tourism-office-ferienwohnung-correction-final",
    ],
  ] as const;
  for (const [
    chapterIndex,
    side,
    field,
    rejected,
  ] of rejectedL14SituationValues) {
    expectL14Exact(
      (raw) => {
        const l14 = (raw.lessons as R[]).find(
          (lesson) => lesson.lessonId === "de_l14",
        ) as R;
        const chapter = (l14.chapters as R[])[chapterIndex];
        const target =
          side === "primary"
            ? (chapter.situation as R)
            : ((chapter.checkpoint as R).newSituation as R);
        target[field] = rejected;
      },
      chapterIndex === 6
        ? "l14_semantic_contract_invalid:c07_final_transfer"
        : "l14_semantic_contract_invalid:situations",
    );
  }
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    const c1 = (l14.chapters as R[])[0];
    c1.chapterEvidencePacketIds = ["de_l14_c01_s05"];
  }, "l14_semantic_contract_invalid:evidence");
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    const c1 = (l14.chapters as R[])[0];
    (c1.supportFading as R).entryLevel = 4;
  }, "l14_semantic_contract_invalid:support_fading");
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    const c1 = (l14.chapters as R[])[0];
    const wrong = L14_MODELS[0].replace(
      "Ich buche nicht das ruhige Zimmer.",
      "Ich nicht buche das ruhige Zimmer.",
    );
    (c1.supportFading as R).entry = wrong;
    (c1.supportFading as R).exit = wrong;
    for (const sense of (c1.checkpoint as R).plannedNewLexicalSenses as R[])
      sense.communicativeUse = wrong;
  }, "l14_semantic_contract_invalid:models");
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    const c5 = (l14.chapters as R[])[4];
    const wrong = L14_MODELS[4].replaceAll("günstige", "günstig");
    (c5.supportFading as R).entry = wrong;
    (c5.supportFading as R).exit = wrong;
    for (const sense of (c5.checkpoint as R).plannedNewLexicalSenses as R[])
      sense.communicativeUse = wrong;
  }, "l14_semantic_contract_invalid:models");
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    const c3 = (l14.chapters as R[])[2];
    const wrong = "Ist das Frühstück nicht inklusive? Doch.";
    (c3.supportFading as R).entry = wrong;
    (c3.supportFading as R).exit = wrong;
    for (const sense of (c3.checkpoint as R).plannedNewLexicalSenses as R[]) {
      sense.communicativeUse = String(sense.communicativeUse).replace(
        L14_MODELS[2],
        wrong,
      );
    }
  }, "l14_semantic_contract_invalid:models");
  for (const rendering of [
    `Das ist falsch. [1] ${L14_C06_REPAIR_ITEMS[0]}`,
    `Das ist falsch. [1] ${L14_C06_REPAIR_ITEMS[1]} [2] ${L14_C06_REPAIR_ITEMS[0]}`,
    L14_C06_MODEL.replaceAll("→", "->"),
    `Das ist falsch. [1] ${L14_C06_REPAIR_ITEMS[0]} and [2] ${L14_C06_REPAIR_ITEMS[1]}`,
    L14_C06_MODEL.replace(" [2]", "; [2]"),
    L14_C06_MODEL.replace(" [2]", "； [2]"),
    L14_C06_MODEL.replace(" [2]", " | [2]"),
  ]) {
    expectL14Exact((raw) => {
      const l14 = (raw.lessons as R[]).find(
        (lesson) => lesson.lessonId === "de_l14",
      ) as R;
      const c6 = (l14.chapters as R[])[5];
      (c6.supportFading as R).entry = rendering;
      (c6.supportFading as R).exit = rendering;
    }, "l14_semantic_contract_invalid:c06_repair_items");
  }
  for (const rendering of [
    L14_MODELS[6].replace(
      "Ich buche die zentrale Ferienwohnung.",
      "Ich buche die ruhige Ferienwohnung.",
    ),
    L14_MODELS[6].replace("Die Ferienwohnung ist zentral. ", ""),
    L14_MODELS[6].replace("Doch,", "Nein,"),
    L14_MODELS[6].replace(
      "Doch, die zentrale Ferienwohnung ist frei.",
      "Doch.",
    ),
  ]) {
    expectL14Exact((raw) => {
      const l14 = (raw.lessons as R[]).find(
        (lesson) => lesson.lessonId === "de_l14",
      ) as R;
      const c7 = (l14.chapters as R[])[6];
      (c7.supportFading as R).entry = rendering;
      (c7.supportFading as R).exit = rendering;
    }, "l14_semantic_contract_invalid:c07_final_transfer");
  }
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    const c7 = (l14.chapters as R[])[6];
    ((c7.checkpoint as R).newSituation as R).contextSignature =
      "generic-apartment-context";
  }, "l14_semantic_contract_invalid:c07_final_transfer");
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    const c1 = (l14.chapters as R[])[0];
    const sense = ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    ((sense.utilityProof as R).plannedUsePacketIds as string[]).unshift(
      "de_l14_c01_s07",
    );
  }, "l14_semantic_contract_invalid:lexical_packages");
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    const c2 = (l14.chapters as R[])[1];
    const sense = ((c2.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    sense.nounPackageIdentity = "die|doppelzimmer|doppelzimmer";
  }, "l14_semantic_contract_invalid:lexical_packages");
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    const c3 = (l14.chapters as R[])[2];
    const senses = (c3.checkpoint as R).plannedNewLexicalSenses as R[];
    senses.push(clone(senses[0]));
  }, "l14_semantic_contract_invalid:lexical_packages");
  const rejectedL14LexicalValues = [
    [0, 0, "semanticIdentity", "buchen|reserve accommodation"],
    [
      1,
      0,
      "semanticIdentity",
      "doppelzimmer|hotel room intended for two people",
    ],
    [
      2,
      0,
      "semanticIdentity",
      "fruhstuck|morning meal offered with accommodation",
    ],
    [2, 1, "semanticIdentity", "inklusive|included in the stated booking"],
    [
      3,
      0,
      "semanticIdentity",
      "parkplatz|designated place for parking a vehicle",
    ],
    [4, 0, "semanticIdentity", "gunstig|affordable for the stated booking"],
    [
      5,
      0,
      "semanticIdentity",
      "falsch|incorrect in the stated booking confirmation",
    ],
    [
      6,
      0,
      "semanticIdentity",
      "ferienwohnung|self contained holiday apartment",
    ],
    [6, 1, "semanticIdentity", "zentral|centrally located for the stated stay"],
    [2, 0, "id", "de_lex_plan_l14_c03_fruhstuck_v1"],
    [4, 0, "id", "de_lex_plan_l14_c05_guenstig_v1"],
    [
      0,
      0,
      "facetValue",
      "independently-reject-ruhige-zimmer-select-helle-zimmer-and-correct-negative-availability-assumption",
    ],
    [
      2,
      1,
      "facetValue",
      "independently-correct-a-negative-breakfast-inclusion-assumption-with-doch",
    ],
    [
      4,
      0,
      "facetValue",
      "independently-select-das-gunstige-zimmer-and-correct-the-negative-availability-assumption",
    ],
    [
      5,
      0,
      "facetValue",
      "independently-repair-the-nicht-position-and-the-doch-response-contrast",
    ],
    [
      6,
      1,
      "facetValue",
      "independently-reject-die-ruhige-ferienwohnung-select-die-zentrale-ferienwohnung-and-correct-the-negative-availability-assumption",
    ],
    [
      0,
      0,
      "communicativeUse",
      "use Ich buche nicht das ruhige Zimmer. Ich buche das helle Zimmer. only to reserve the selected accommodation option",
    ],
    [
      1,
      0,
      "communicativeUse",
      "ground Ich buche nicht das Doppelzimmer. Ich buche das ruhige Zimmer. in the exact accommodation contrast",
    ],
    [
      2,
      0,
      "communicativeUse",
      "ground Ist das Frühstück nicht inklusive? Doch, das Frühstück ist inklusive. in the breakfast-inclusion check",
    ],
    [
      2,
      1,
      "communicativeUse",
      "use Ist das Frühstück nicht inklusive? Doch, das Frühstück ist inklusive. to correct the explicit negative inclusion assumption",
    ],
    [
      3,
      0,
      "communicativeUse",
      "ground Ist der Parkplatz nicht frei? Doch, der Parkplatz ist frei. in the exact parking-availability check",
    ],
    [
      4,
      0,
      "communicativeUse",
      "use Das Zimmer ist günstig. Ich buche das günstige Zimmer. only inside the exact rate-correction model",
    ],
    [
      6,
      0,
      "communicativeUse",
      "ground the changed context in Die Ferienwohnung ist zentral. and the exact two-option apartment model",
    ],
    [
      6,
      1,
      "communicativeUse",
      "use Die Ferienwohnung ist zentral. Ich buche die zentrale Ferienwohnung. only inside the exact final transfer model",
    ],
  ] as const;
  for (const [
    chapterIndex,
    senseIndex,
    field,
    rejected,
  ] of rejectedL14LexicalValues) {
    expectL14Exact((raw) => {
      const l14 = (raw.lessons as R[]).find(
        (lesson) => lesson.lessonId === "de_l14",
      ) as R;
      const chapter = (l14.chapters as R[])[chapterIndex];
      const sense = ((chapter.checkpoint as R).plannedNewLexicalSenses as R[])[
        senseIndex
      ];
      if (field === "facetValue")
        (sense.utilityProof as R).facetValue = rejected;
      else sense[field] = rejected;
    }, "l14_semantic_contract_invalid:lexical_packages");
  }
  expectL14Exact((raw) => {
    const l13 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l13",
    ) as R;
    const c1 = (l13.chapters as R[])[0];
    ((c1.recallSchedule as R).futureDelayedProbe as R).packetId =
      "de_l14_c07_s56";
  }, "l13_l14_inverse_provenance_invalid");
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    const c7 = (l14.chapters as R[])[6];
    ((c7.recallSchedule as R).futureDelayedProbe as R).packetId =
      "de_l15_c07_s56";
  }, "l14_l15_inverse_provenance_invalid");
  expectL14Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    const c3 = (l14.chapters as R[])[2];
    (c3.recallSchedule as R).retrievesFromChapterIds = ["de_l14_c02"];
  }, "l14_recall_contract_invalid:de_l14_c03");
  const appendL14ForbiddenMutation = (raw: R, mutation: string): void => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    const c1 = (l14.chapters as R[])[0];
    const sense = ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    sense.communicativeUse = `${String(sense.communicativeUse)} ${mutation}`;
  };
  for (const mutation of [
    "Ich nicht buche das ruhige Zimmer.",
    "Teach a universal nicht-position rule.",
    "Use free information-structure.",
    "Doch replaces ja in generic answers.",
    "Use modal doch.",
    "Use connective doch.",
    "Nein, das Zimmer ist frei.",
    "Teach a new case.",
    "Teach Partizip II and Perfekt.",
    "Teach subordinate clauses.",
    "Teach comparative and superlative forms.",
    "Teach future grammar.",
  ]) {
    expectL14Exact(
      (raw) => appendL14ForbiddenMutation(raw, mutation),
      "l14_future_grammar_leak",
    );
  }

  const l15 = (raw: R): R =>
    (raw.lessons as R[]).find((lesson) => lesson.lessonId === "de_l15") as R;
  expectL15PlanExact((plan) => {
    (plan.introducedConstructIds as string[]).reverse();
  }, "l15_semantic_contract_invalid:sets");
  expectL15Exact((raw) => {
    (l15(raw).grammarBoundary as R).noExpansion =
      "Allow productive participle guessing and connector-topology expansion.";
  }, "l15_semantic_contract_invalid:no_expansion");
  expectL15Exact((raw) => {
    const c1 = (l15(raw).chapters as R[])[0];
    ((c1.lifecycleAnchors as R[])[0] as R).packetId = "de_l15_c01_s03";
  }, "l15_semantic_contract_invalid:anchors");
  expectL15Exact((raw) => {
    const c2 = (l15(raw).chapters as R[])[1];
    (c2.situation as R).goal = "generic-payment-goal";
  }, "l15_semantic_contract_invalid:situations");
  expectL15Exact((raw) => {
    const c1 = (l15(raw).chapters as R[])[0];
    (c1.supportFading as R).entryLevel = 4;
  }, "l15_semantic_contract_invalid:support_fading");
  expectL15Exact((raw) => {
    const c3 = (l15(raw).chapters as R[])[2];
    c3.chapterEvidencePacketIds = ["de_l15_c03_s20", "de_l15_c03_s19"];
  }, "l15_semantic_contract_invalid:evidence");
  expectL15Exact((raw) => {
    const c4 = (l15(raw).chapters as R[])[3];
    (c4.recallSchedule as R).retrievesFromChapterIds = ["de_l15_c03"];
  }, "l15_recall_contract_invalid");
  expectL15Exact((raw) => {
    const l14 = (raw.lessons as R[]).find(
      (lesson) => lesson.lessonId === "de_l14",
    ) as R;
    (
      ((l14.chapters as R[])[0].recallSchedule as R).futureDelayedProbe as R
    ).packetId = "de_l15_c07_s56";
  }, "l14_l15_inverse_provenance_invalid");
  expectL15Exact((raw) => {
    const c1 = (l15(raw).chapters as R[])[0];
    const sense = ((c1.checkpoint as R).plannedNewLexicalSenses as R[])[0];
    (sense.verbPackage as R).valencyFrame = "generic task frame";
  }, "l15_semantic_contract_invalid:lexical_packages");
  expectL15Exact((raw) => {
    const chapters = l15(raw).chapters as R[];
    const c1 = (
      (chapters[0].checkpoint as R).plannedNewLexicalSenses as R[]
    )[0];
    const c2 = (
      (chapters[1].checkpoint as R).plannedNewLexicalSenses as R[]
    )[0];
    c2.id = c1.id;
    c2.semanticIdentity = c1.semanticIdentity;
  }, "l15_lexical_ownership_invalid");
  expectL15Exact((raw) => {
    const c4 = (l15(raw).chapters as R[])[3];
    c4.lessonOutcome = "sequence two completed errands with known connectors";
  }, "l15_c04_sequence_lexical_contract_invalid");
  expectL15Exact((raw) => {
    const c5 = (l15(raw).chapters as R[])[4];
    (c5.supportFading as R).entry =
      "Hast du das Fahrrad repariert? Ja, ich habe das Fahrrad repariert.";
  }, "l15_semantic_contract_invalid:c05_service_exchange");
  expectL15Exact((raw) => {
    const c6 = (l15(raw).chapters as R[])[5];
    (c6.supportFading as R).entry =
      "Das ist falsch. [1] Ich habe bezahlt die Rechnung. → Ich habe die Rechnung bezahlt.";
  }, "l15_semantic_contract_invalid:c06_repair_items");
  expectL15Exact((raw) => {
    const c7 = (l15(raw).chapters as R[])[6];
    (c7.supportFading as R).entry =
      "Ich habe das Medikament abgeholt. Ich habe die Quittung abgegeben.";
  }, "l15_semantic_contract_invalid:c07_final_transfer");
  expectL15Exact((raw) => {
    l15(raw).futureLeakProbe = "Teach Perfekt mit sein and future grammar.";
  }, "l15_future_grammar_leak");
  expect((raw) => {
    ((l15(raw).chapters as R[])[0].packetIds as string[]).pop();
  }, /packet_identity_invalid/u);
  expect((raw) => {
    const packetIds = (l15(raw).chapters as R[])[0].packetIds as string[];
    packetIds[0] = "de_l15_c02_s09";
  }, /packet_identity_invalid/u);
  expect((raw) => {
    ((l15(raw).chapters as R[])[0].packetIds as string[]).push(
      "de_l15_c01_s09",
    );
  }, /packet_identity_invalid/u);
  expect((raw) => {
    const packetIds = (l15(raw).chapters as R[])[0].packetIds as string[];
    [packetIds[0], packetIds[1]] = [packetIds[1], packetIds[0]];
  }, /packet_identity_invalid/u);
  expect((raw) => {
    ((l15(raw).chapters as R[])[0].packetIds as string[])[0] = "de_l15_c01_s57";
  }, /packet_identity_invalid/u);
  const l15ScopeMutation = clone(json(FILE)) as R;
  (l15ScopeMutation.lessons as R[]).push({ lessonId: "de_l16" });
  assert.throws(() => {
    if (
      (l15ScopeMutation.lessons as R[]).some(
        (lesson) => lesson.lessonId === "de_l16",
      )
    )
      throw new Error("scope_violation_l15_only");
  }, /scope_violation_l15_only/u);

  const l2Boundary: Boundary = {
    id: "de_l02",
    chapterOutcomes: [],
    introducedConstructIds: [],
    extendedConstructIds: [],
    reviewedConstructIds: [],
    prohibitedConstructIds: [],
    prerequisiteLessonIds: ["de_l01"],
    crossLessonRecall: [],
    lexicalDomains: [],
    session56Final: {
      sessionId: "de_l02_c07_s56",
      requiredConstructIds: [],
    },
  };
  assert.equal(recallSourceAllowed(1, 7, 2, 1, l2Boundary), true);
  assert.equal(recallSourceAllowed(2, 1, 2, 1, l2Boundary), false);
  assert.equal(
    targetsFutureChapterIsRequired(32, 7, "POST_COURSE_REVIEW_OWNER"),
    false,
  );
  assert.equal(targetsFutureChapterIsRequired(32, 7, "COURSE_PACKET"), true);

  const validFutureVerb = {
    id: "de_lex_plan_l08_c01_ankommen_v1",
    partOfSpeech: "verb",
    lexicalKind: "VERB_LEXEME",
    nounPackage: null,
    verbPackage: {
      infinitive: "ankommen",
      valencyFrame: "intransitive arrival frame",
      separability: "separable",
      perfectAuxiliary: "sein",
    },
  };
  assert.equal(
    LEXICAL_KIND_BY_POS[validFutureVerb.partOfSpeech],
    validFutureVerb.lexicalKind,
  );
  assert.equal(verbPackageIsValid(validFutureVerb.verbPackage), true);
  const mismatchedFutureVerb = {
    ...validFutureVerb,
    lexicalKind: "NOUN_LEXEME",
  };
  assert.notEqual(
    LEXICAL_KIND_BY_POS[mismatchedFutureVerb.partOfSpeech],
    mismatchedFutureVerb.lexicalKind,
  );
}
function scope(a: readonly string[]): {
  lesson: string | null;
  prefix: number | null;
} {
  if (!a.length) return { lesson: null, prefix: null };
  if (a[0] === "--lesson" && a.length === 2 && L.test(a[1]))
    return { lesson: a[1], prefix: null };
  if (a[0] === "--prefix" && a.length === 2 && /^\d+$/u.test(a[1]))
    return { lesson: null, prefix: Number(a[1]) };
  throw new Error(
    "usage: npx tsx tests/learning_v2_de_chapter_blueprints_gate.ts [--lesson de_lXX|--prefix N]",
  );
}
const selected = scope(process.argv.slice(2)),
  result = validate(json(FILE));
fixtures();
if (selected.lesson) {
  if (!result.ids.has(selected.lesson))
    throw new Error(`requested_lesson_not_materialized:${selected.lesson}`);
  process.stdout.write(
    `LEARNING V2 GERMAN CHAPTER BLUEPRINTS GATE: PASS (${selected.lesson}; 7 chapters; 56 packet IDs; Task6 lexical reconciliation pending)\n`,
  );
} else if (selected.prefix !== null) {
  if (selected.prefix < 1 || selected.prefix > result.lessons)
    throw new Error(
      `requested_prefix_not_materialized:${selected.prefix}/${result.lessons}`,
    );
  process.stdout.write(
    `LEARNING V2 GERMAN CHAPTER BLUEPRINTS GATE: PASS (prefix ${selected.prefix}; ${selected.prefix * 7} chapters; ${selected.prefix * 56} packet IDs; Task6 lexical reconciliation pending)\n`,
  );
} else {
  if (
    result.buildStatus !== "COMPLETE_TASK5" ||
    result.lessons !== 32 ||
    result.chapters !== 224
  )
    throw new Error(
      `full_registry_incomplete_or_not_complete:${result.buildStatus};${result.lessons}/32 lessons;${result.chapters}/224 chapters`,
    );
  process.stdout.write(
    "LEARNING V2 GERMAN CHAPTER BLUEPRINTS GATE: PASS (32 lessons; 224 chapters; 1792 packet IDs)\n",
  );
}
