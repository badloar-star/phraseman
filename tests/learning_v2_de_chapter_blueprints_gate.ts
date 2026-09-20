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
  crossLessonRecall: readonly { fromLessonId: string }[];
  session56Final: { sessionId: string };
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
      if (
        !cv.allowedConstructIds.length ||
        !cv.allowedConstructIds.every(
          (id) => allowed.includes(id) && grammarIds.has(id),
        ) ||
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
          JSON.stringify(sort(cv.allowedConstructIds))
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
        targetsFutureChapterIsRequired(
          ln,
          cn,
          (cv.recallSchedule.futureDelayedProbe as R).kind,
        ) &&
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
      rec(cv.recallSchedule.futureDelayedProbe, "probe");
      const probe = cv.recallSchedule.futureDelayedProbe;
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

  const l2Boundary: Boundary = {
    id: "de_l02",
    chapterOutcomes: [],
    introducedConstructIds: [],
    extendedConstructIds: [],
    reviewedConstructIds: [],
    prohibitedConstructIds: [],
    prerequisiteLessonIds: ["de_l01"],
    crossLessonRecall: [],
    session56Final: { sessionId: "de_l02_c07_s56" },
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
