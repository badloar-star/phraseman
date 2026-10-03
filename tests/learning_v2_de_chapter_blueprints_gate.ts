import assert from "node:assert/strict";
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
        throw new Error(`packet_count_invalid:${cv.id}`);
      cv.packetIds.forEach((id, pi) => {
        pp(id, "packetId");
        if (id !== pid(ln, cn, (cn - 1) * 8 + pi + 1) || packetIds.has(id))
          throw new Error(`packet_identity_invalid:${cv.id}:${id}`);
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
          sv.semanticIdentity !==
            `${normalized(sv.lemmaOrExpression as string)}|${normalized(sv.senseGloss as string)}` ||
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
function fixtures(): void {
  const first = (raw: R) => ((raw.lessons as R[])[0].chapters as R[])[0];
  expect((raw) => {
    (first(raw).packetIds as unknown[]).pop();
  }, /packet_count_invalid/u);
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
      `full_registry_incomplete_or_not_complete:${result.buildStatus};${result.lessons}/32 lessons; ${result.chapters}/224 chapters`,
    );
  process.stdout.write(
    "LEARNING V2 GERMAN CHAPTER BLUEPRINTS GATE: PASS (32 lessons; 224 chapters; 1792 packet IDs)\n",
  );
}
