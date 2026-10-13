import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { loadGermanTask6cL01SixNounAdmissionCandidateDeV1 } from "./task6c_l01_six_noun_admission_candidate_de_v1";

type RecordValue = Record<string, unknown>;

export type GermanTask6cTask5AllocationAdmissionRowDeV1 = Readonly<{
  sourcePlanId: string;
  canonicalSenseId: string;
  plannedSenseId: string;
  sourceChapterId: string;
  task5SituationContext: string;
  firstIntroductionPacketId: string;
  firstScoredPacketId: string;
  sourceAnchor: string;
  lemma: string;
  article: string;
  plural: string;
  sourceGenderLabel: string;
}>;

export type GermanTask6cTask5AllocationAdmissionDeV1 = Readonly<{
  schemaVersion: "learning-v2-german-task6c-task5-allocation-admission.v1";
  status: "TASK5_ADMITTED_FOR_TASK6C_ALLOCATION_ONLY";
  rowsAdmitted: 4;
  rowsPromoted: 0;
  canonicalRegistryStatus: "NOT_CANONICAL";
  canonicalPromotion: false;
  task7Unlock: false;
  packetMaterializationAuthority: false;
  learnerFacingAuthority: false;
  releaseAuthority: false;
  sourceBindings: Readonly<Record<string, string>>;
  rows: readonly GermanTask6cTask5AllocationAdmissionRowDeV1[];
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const REGISTRY_PATH =
  "modules/learning-v2/curriculum/de/registries/task6c_task5_allocation_admission_de_v1.json";
const SOURCE_BINDINGS = Object.freeze({
  sixNounCandidatePath:
    "modules/learning-v2/curriculum/de/task6c_l01_six_noun_admission_candidate_de_v1.ts",
  sixNounCandidateSha256:
    "b823d05d511eceaa3c80991216414d75e28485f8f76b57a00fb526ceb56fa078",
  sixNounManifestPath:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_six_noun_admission_v1/manifest.json",
  sixNounManifestSha256:
    "a3a44ab4d1bc79ccc0af6741070eeb36267382fab2f44bb3dfb912adcdb42b55",
  sixNounClosurePath:
    "docs/v2/curriculum/de/task6c-l01-six-noun-closure-v1/F.json",
  sixNounClosureSha256:
    "6bc849c3369468cfb59be92bfcbd249473f65a29c8e9170385ddcfbcfe619c44",
  sixNounNativeReviewPath:
    "docs/v2/curriculum/de/task6c-l01-six-noun-closure-v1/review.native.record.json",
  sixNounNativeReviewSha256:
    "58f5ce80d09ab91fbca3770bb7d91f365857045c6bb14d70070181a652183134",
  sixNounAdversarialReviewPath:
    "docs/v2/curriculum/de/task6c-l01-six-noun-closure-v1/review.adversarial.record.json",
  sixNounAdversarialReviewSha256:
    "d7659bf4db1ffe0f2ec32afb6fdb3e89070881e2eaebc164f2d0dd91b7046105",
  targetAllocationPath:
    "docs/v2/curriculum/de/task6c-full-registry-l01-v1/target-allocation.json",
  targetAllocationSha256:
    "b6ddd2e2fb665fe6c295a624c7009791539473ee23e9141b89b30cbfd507e0f0",
  canonicalRegistryPath:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json",
  canonicalRegistrySha256:
    "95181fb58d7563fc1ae37f220ad13b2543ccde898dfe1e93922cecc4a082fd31",
});
const ROOT_KEYS = [
  "schemaVersion",
  "status",
  "rowsAdmitted",
  "rowsPromoted",
  "canonicalRegistryStatus",
  "canonicalPromotion",
  "task7Unlock",
  "packetMaterializationAuthority",
  "learnerFacingAuthority",
  "releaseAuthority",
  "sourceBindings",
  "rows",
] as const;
const ROW_KEYS = [
  "sourcePlanId",
  "canonicalSenseId",
  "plannedSenseId",
  "sourceChapterId",
  "task5SituationContext",
  "firstIntroductionPacketId",
  "firstScoredPacketId",
  "sourceAnchor",
  "lemma",
  "article",
  "plural",
  "sourceGenderLabel",
] as const;
const EXPECTED_ROWS = Object.freeze([
  {
    sourcePlanId: "de_lex_plan_l01_c03_briefkasten_v1",
    canonicalSenseId: "de_lex_l01_c03_briefkasten_v1",
    plannedSenseId: "de_plan_l01_c03_checkpoint_02_v1",
    sourceChapterId: "de_l01_c03",
    task5SituationContext: "ground an introduction at a mailbox area",
    firstIntroductionPacketId: "de_l01_c03_s18",
    firstScoredPacketId: "de_l01_c03_s24",
    sourceAnchor: "d-1-2",
    lemma: "Briefkasten",
    article: "der",
    plural: "Briefkästen",
    sourceGenderLabel: "Maskulinum",
  },
  {
    sourcePlanId: "de_lex_plan_l01_c04_buero_v1",
    canonicalSenseId: "de_lex_l01_c04_buero_v1",
    plannedSenseId: "de_plan_l01_c04_checkpoint_02_v1",
    sourceChapterId: "de_l01_c04",
    task5SituationContext:
      "identify the caretaker office for a formal first contact",
    firstIntroductionPacketId: "de_l01_c04_s26",
    firstScoredPacketId: "de_l01_c04_s32",
    sourceAnchor: "d-1-1",
    lemma: "Büro",
    article: "das",
    plural: "Büros",
    sourceGenderLabel: "Neutrum",
  },
  {
    sourcePlanId: "de_lex_plan_l01_c05_garten_v1",
    canonicalSenseId: "de_lex_l01_c05_garten_v1",
    plannedSenseId: "de_plan_l01_c05_checkpoint_02_v1",
    sourceChapterId: "de_l01_c05",
    task5SituationContext: "ground a communal welcome scene",
    firstIntroductionPacketId: "de_l01_c05_s34",
    firstScoredPacketId: "de_l01_c05_s40",
    sourceAnchor: "d-1-1",
    lemma: "Garten",
    article: "der",
    plural: "Gärten",
    sourceGenderLabel: "Maskulinum",
  },
  {
    sourcePlanId: "de_lex_plan_l01_c06_hausmeister_v1",
    canonicalSenseId: "de_lex_l01_c06_hausmeister_v1",
    plannedSenseId: "de_plan_l01_c06_checkpoint_02_v1",
    sourceChapterId: "de_l01_c06",
    task5SituationContext: "identify a participant in a shared-building scene",
    firstIntroductionPacketId: "de_l01_c06_s42",
    firstScoredPacketId: "de_l01_c06_s48",
    sourceAnchor: "d-1-1",
    lemma: "Hausmeister",
    article: "der",
    plural: "Hausmeister",
    sourceGenderLabel: "Maskulinum",
  },
] as const);
const VALIDATED = new WeakSet<object>();
const admissionBrand: unique symbol = Symbol("task6cTask5AllocationAdmission");

function fail(code: string): never {
  throw new Error(code);
}
function record(value: unknown, code: string): asserts value is RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
}
function closed(
  value: RecordValue,
  keys: readonly string[],
  code: string,
): void {
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    fail(code);
}
function equalJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
function sha256(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
function fixedPath(relative: string): string {
  if (path.isAbsolute(relative) || relative.includes(".."))
    fail("task6c_task5_admission_fixed_path_invalid");
  const candidate = path.resolve(ROOT, relative);
  if (!candidate.startsWith(`${ROOT}${path.sep}`))
    fail("task6c_task5_admission_fixed_path_invalid");
  return candidate;
}
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as RecordValue)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
function packetOrdinal(value: string): number {
  const match = /^de_l01_c(0[3-6])_s(\d{2})$/u.exec(value);
  if (match === null) fail("task6c_task5_admission_packet_invalid");
  return Number(match[2]);
}
function fixedSourceBindings(): void {
  for (const [key, expected] of Object.entries(SOURCE_BINDINGS)) {
    if (!key.endsWith("Sha256")) continue;
    const pathKey =
      `${key.slice(0, -"Sha256".length)}Path` as keyof typeof SOURCE_BINDINGS;
    if (sha256(fixedPath(SOURCE_BINDINGS[pathKey])) !== expected)
      fail("task6c_task5_admission_source_binding_invalid");
  }
}
function noForbiddenLearnerOrEnglish(value: unknown): void {
  if (typeof value === "string") {
    if (
      /(?:^|[_/])(?:en|ru|uk)(?:[_/]|$)|english|learner|translation|productive|register/iu.test(
        value,
      )
    )
      fail("task6c_task5_admission_forbidden_content");
  } else if (Array.isArray(value)) value.forEach(noForbiddenLearnerOrEnglish);
  else if (value !== null && typeof value === "object")
    Object.values(value as RecordValue).forEach(noForbiddenLearnerOrEnglish);
}
function readFixedRegistry(): unknown {
  return JSON.parse(
    fs.readFileSync(fixedPath(REGISTRY_PATH), "utf8"),
  ) as unknown;
}
function readFixedJson(relative: string, code: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(fixedPath(relative), "utf8")) as unknown;
  } catch {
    return fail(code);
  }
}
const CLOSURE_STATUS_KEYS = [
  "candidateAcceptance",
  "status",
  "canonicalAdmission",
  "rowsPromoted",
  "task7Unlock",
  "learnerFacing",
  "phraseClaim",
  "learnerAuthoring",
  "mockup",
  "audio",
  "runtime",
  "release",
] as const;
const REVIEW_KEYS = [
  "schemaVersion",
  "recordKind",
  "source",
  "reviewTaskIdentity",
  "reviewerRole",
  "reviewedManifest",
  "verdict",
  "scope",
  "limitations",
  "status",
] as const;
function verifyReview(
  input: unknown,
  role: "NATIVE_GERMAN_REVIEW" | "ADVERSARIAL_REVIEW",
  task: "/root/six_noun_native_review" | "/root/six_noun_adversarial_review",
): void {
  record(input, "task6c_task5_admission_review_schema_invalid");
  closed(input, REVIEW_KEYS, "task6c_task5_admission_review_schema_invalid");
  if (
    input.schemaVersion !==
      "learning-v2-de-task6c-l01-independent-review-record.v1" ||
    input.recordKind !== "ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY" ||
    input.source !== "root message transcript" ||
    input.reviewTaskIdentity !== task ||
    input.reviewerRole !== role ||
    input.verdict !== "PASS" ||
    input.status !== "HOLD_ONLY" ||
    !Array.isArray(input.scope) ||
    !Array.isArray(input.limitations)
  )
    fail("task6c_task5_admission_review_verdict_invalid");
  record(
    input.reviewedManifest,
    "task6c_task5_admission_review_manifest_invalid",
  );
  closed(
    input.reviewedManifest,
    ["path", "sha256"],
    "task6c_task5_admission_review_manifest_invalid",
  );
  if (
    input.reviewedManifest.path !== SOURCE_BINDINGS.sixNounManifestPath ||
    input.reviewedManifest.sha256 !== SOURCE_BINDINGS.sixNounManifestSha256
  )
    fail("task6c_task5_admission_review_manifest_invalid");
}
function verifyClosureRecords(
  closureInput: unknown = readFixedJson(
    SOURCE_BINDINGS.sixNounClosurePath,
    "task6c_task5_admission_closure_missing",
  ),
  nativeInput: unknown = readFixedJson(
    SOURCE_BINDINGS.sixNounNativeReviewPath,
    "task6c_task5_admission_review_missing",
  ),
  adversarialInput: unknown = readFixedJson(
    SOURCE_BINDINGS.sixNounAdversarialReviewPath,
    "task6c_task5_admission_review_missing",
  ),
): void {
  record(closureInput, "task6c_task5_admission_closure_schema_invalid");
  closed(
    closureInput,
    [
      "schemaVersion",
      "stage",
      "preManifest",
      "reviews",
      "status",
      "limitations",
    ],
    "task6c_task5_admission_closure_schema_invalid",
  );
  if (
    closureInput.schemaVersion !==
      "learning-v2-de-task6c-l01-receipt-closure.v1" ||
    closureInput.stage !== "F" ||
    !Array.isArray(closureInput.limitations)
  )
    fail("task6c_task5_admission_closure_status_invalid");
  record(
    closureInput.preManifest,
    "task6c_task5_admission_closure_manifest_invalid",
  );
  closed(
    closureInput.preManifest,
    ["path", "sha256"],
    "task6c_task5_admission_closure_manifest_invalid",
  );
  if (
    closureInput.preManifest.path !== SOURCE_BINDINGS.sixNounManifestPath ||
    closureInput.preManifest.sha256 !== SOURCE_BINDINGS.sixNounManifestSha256
  )
    fail("task6c_task5_admission_closure_manifest_invalid");
  record(closureInput.reviews, "task6c_task5_admission_closure_review_invalid");
  closed(
    closureInput.reviews,
    ["native", "adversarial"],
    "task6c_task5_admission_closure_review_invalid",
  );
  const expectedReviews = [
    [
      "native",
      SOURCE_BINDINGS.sixNounNativeReviewPath,
      SOURCE_BINDINGS.sixNounNativeReviewSha256,
    ],
    [
      "adversarial",
      SOURCE_BINDINGS.sixNounAdversarialReviewPath,
      SOURCE_BINDINGS.sixNounAdversarialReviewSha256,
    ],
  ] as const;
  for (const [name, reviewPath, reviewSha] of expectedReviews) {
    const review = closureInput.reviews[name];
    record(review, "task6c_task5_admission_closure_review_invalid");
    closed(
      review,
      ["path", "sha256"],
      "task6c_task5_admission_closure_review_invalid",
    );
    if (review.path !== reviewPath || review.sha256 !== reviewSha)
      fail("task6c_task5_admission_closure_review_invalid");
  }
  record(closureInput.status, "task6c_task5_admission_closure_status_invalid");
  closed(
    closureInput.status,
    CLOSURE_STATUS_KEYS,
    "task6c_task5_admission_closure_status_invalid",
  );
  if (
    closureInput.status.candidateAcceptance !==
      "ACCEPTED_UNDER_TASK6C_CURRENT_STATE" ||
    closureInput.status.status !== "HOLD" ||
    closureInput.status.canonicalAdmission !== "FORBIDDEN" ||
    closureInput.status.rowsPromoted !== 0 ||
    closureInput.status.task7Unlock !== false ||
    closureInput.status.learnerFacing !== false ||
    closureInput.status.phraseClaim !== false ||
    closureInput.status.learnerAuthoring !== "HOLD" ||
    closureInput.status.mockup !== "HOLD" ||
    closureInput.status.audio !== "HOLD" ||
    closureInput.status.runtime !== "HOLD" ||
    closureInput.status.release !== "HOLD"
  )
    fail("task6c_task5_admission_closure_status_invalid");
  verifyReview(
    nativeInput,
    "NATIVE_GERMAN_REVIEW",
    "/root/six_noun_native_review",
  );
  verifyReview(
    adversarialInput,
    "ADVERSARIAL_REVIEW",
    "/root/six_noun_adversarial_review",
  );
}

function verifyUpstream(
  rows: readonly GermanTask6cTask5AllocationAdmissionRowDeV1[],
): void {
  verifyClosureRecords();
  const candidate = loadGermanTask6cL01SixNounAdmissionCandidateDeV1();
  if (
    candidate.status !== "HOLD" ||
    candidate.admissionStatus !== "PARTIAL_CANDIDATE" ||
    candidate.rowsPromoted !== 0 ||
    candidate.task7Unlock !== false ||
    candidate.learnerFacing !== false ||
    candidate.phraseClaim !== false
  )
    fail("task6c_task5_admission_upstream_invalid");
  const candidateRows = new Map(
    candidate.rows.map((row) => [String(row.sourcePlanId), row]),
  );
  for (const row of rows) {
    const source = candidateRows.get(row.sourcePlanId);
    record(source, "task6c_task5_admission_upstream_row_missing");
    record(source.noun, "task6c_task5_admission_upstream_row_invalid");
    if (
      source.candidateCanonicalSenseId !== row.canonicalSenseId ||
      source.task5SituationContext !== row.task5SituationContext ||
      source.senseAnchor !== row.sourceAnchor ||
      source.lemma !== row.lemma ||
      source.noun.article !== row.article ||
      source.noun.plural !== row.plural ||
      source.noun.sourceGenderLabel !== row.sourceGenderLabel ||
      source.partOfSpeech !== "noun"
    )
      fail("task6c_task5_admission_upstream_row_invalid");
    if (
      row.sourcePlanId.endsWith("hausmeister_v1") &&
      (row.sourceAnchor !== "d-1-1" ||
        !Array.isArray(source.excludedSenseAnchors) ||
        !source.excludedSenseAnchors.includes("d-1-2"))
    )
      fail("task6c_task5_admission_swiss_sense_invalid");
  }
}
function verifyTarget(
  rows: readonly GermanTask6cTask5AllocationAdmissionRowDeV1[],
): void {
  const target = JSON.parse(
    fs.readFileSync(fixedPath(SOURCE_BINDINGS.targetAllocationPath), "utf8"),
  ) as RecordValue;
  record(target, "task6c_task5_admission_target_invalid");
  record(target.allocation, "task6c_task5_admission_target_invalid");
  const checkpoints = target.allocation.task5CheckpointSenses;
  if (!Array.isArray(checkpoints))
    fail("task6c_task5_admission_target_invalid");
  for (const row of rows) {
    if (
      !checkpoints.some((value) => {
        record(value, "task6c_task5_admission_target_invalid");
        return (
          value.plannedSenseId === row.plannedSenseId &&
          value.sourcePlanId === row.sourcePlanId &&
          value.firstIntroductionPacketId === row.firstIntroductionPacketId
        );
      })
    )
      fail("task6c_task5_admission_target_invalid");
    if (
      packetOrdinal(row.firstScoredPacketId) <=
      packetOrdinal(row.firstIntroductionPacketId)
    )
      fail("task6c_task5_admission_chronology_invalid");
  }
}
function verifyCollisions(
  rows: readonly GermanTask6cTask5AllocationAdmissionRowDeV1[],
): void {
  const canonical = JSON.parse(
    fs.readFileSync(fixedPath(SOURCE_BINDINGS.canonicalRegistryPath), "utf8"),
  ) as RecordValue;
  record(canonical, "task6c_task5_admission_canonical_collision_invalid");
  record(
    canonical.registry,
    "task6c_task5_admission_canonical_collision_invalid",
  );
  const existing = canonical.registry.lexicalSenses;
  if (!Array.isArray(existing) || existing.length !== 2)
    fail("task6c_task5_admission_canonical_collision_invalid");
  const ids = new Set(
    existing.map((value) => {
      record(value, "task6c_task5_admission_canonical_collision_invalid");
      return value.id;
    }),
  );
  if (rows.some((row) => ids.has(row.canonicalSenseId)))
    fail("task6c_task5_admission_canonical_collision_invalid");
}
function parse(input: unknown): GermanTask6cTask5AllocationAdmissionDeV1 {
  fixedSourceBindings();
  noForbiddenLearnerOrEnglish(input);
  record(input, "task6c_task5_admission_schema_invalid");
  closed(input, ROOT_KEYS, "task6c_task5_admission_schema_invalid");
  if (
    input.schemaVersion !==
      "learning-v2-german-task6c-task5-allocation-admission.v1" ||
    input.status !== "TASK5_ADMITTED_FOR_TASK6C_ALLOCATION_ONLY"
  )
    fail("task6c_task5_admission_status_invalid");
  if (
    input.rowsAdmitted !== 4 ||
    input.rowsPromoted !== 0 ||
    input.canonicalRegistryStatus !== "NOT_CANONICAL" ||
    input.canonicalPromotion !== false ||
    input.task7Unlock !== false ||
    input.packetMaterializationAuthority !== false ||
    input.learnerFacingAuthority !== false ||
    input.releaseAuthority !== false
  )
    fail("task6c_task5_admission_ceiling_invalid");
  record(input.sourceBindings, "task6c_task5_admission_source_binding_invalid");
  if (!equalJson(input.sourceBindings, SOURCE_BINDINGS))
    fail("task6c_task5_admission_source_binding_invalid");
  if (!Array.isArray(input.rows) || input.rows.length !== EXPECTED_ROWS.length)
    fail("task6c_task5_admission_roster_invalid");
  const plans = new Set<string>();
  const senses = new Set<string>();
  const rows: GermanTask6cTask5AllocationAdmissionRowDeV1[] = [];
  input.rows.forEach((value, index) => {
    record(value, "task6c_task5_admission_schema_invalid");
    closed(value, ROW_KEYS, "task6c_task5_admission_schema_invalid");
    if (!equalJson(value, EXPECTED_ROWS[index]))
      fail("task6c_task5_admission_row_identity_invalid");
    const row = value as GermanTask6cTask5AllocationAdmissionRowDeV1;
    if (plans.has(row.sourcePlanId) || senses.has(row.canonicalSenseId))
      fail("task6c_task5_admission_duplicate_invalid");
    plans.add(row.sourcePlanId);
    senses.add(row.canonicalSenseId);
    rows.push(row);
  });
  verifyUpstream(rows);
  verifyTarget(rows);
  verifyCollisions(rows);
  return deepFreeze({
    schemaVersion: "learning-v2-german-task6c-task5-allocation-admission.v1",
    status: "TASK5_ADMITTED_FOR_TASK6C_ALLOCATION_ONLY",
    rowsAdmitted: 4,
    rowsPromoted: 0,
    canonicalRegistryStatus: "NOT_CANONICAL",
    canonicalPromotion: false,
    task7Unlock: false,
    packetMaterializationAuthority: false,
    learnerFacingAuthority: false,
    releaseAuthority: false,
    sourceBindings: { ...SOURCE_BINDINGS },
    rows,
    [admissionBrand]: true,
  } as GermanTask6cTask5AllocationAdmissionDeV1 & Record<symbol, boolean>);
}

/** Fixed German-only production entrypoint; it has no caller-controlled roots or evidence. */
export function loadGermanTask6cTask5AllocationAdmissionDeV1(): GermanTask6cTask5AllocationAdmissionDeV1 {
  const result = parse(readFixedRegistry());
  VALIDATED.add(result);
  return result;
}
export function isGermanTask6cTask5AllocationAdmissionDeV1(
  value: unknown,
): value is GermanTask6cTask5AllocationAdmissionDeV1 {
  return value !== null && typeof value === "object" && VALIDATED.has(value);
}
/** Test-only parser: validates hostile input but does not issue the private production brand. */
export const germanTask6cTask5AllocationAdmissionTestHarnessDeV1 =
  Object.freeze({
    validateUntrustedRegistryForTest(input: unknown): void {
      parse(input);
    },
    readFixedRegistryForTest(): unknown {
      return readFixedRegistry();
    },
    validateUntrustedClosureRecordsForTest(
      closure: unknown,
      native: unknown,
      adversarial: unknown,
    ): void {
      verifyClosureRecords(closure, native, adversarial);
    },
  });
