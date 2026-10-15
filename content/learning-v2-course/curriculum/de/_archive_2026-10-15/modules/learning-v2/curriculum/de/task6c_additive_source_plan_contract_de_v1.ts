import * as fs from "node:fs";
import * as path from "node:path";

import {
  type GermanTask6cBatch001TransportClaimDeV1,
  loadGermanTask6cBatch001TransportClaimsDeV1,
} from "./task6c_batch001_transport_claim_loader_de_v1";

type RecordValue = Record<string, unknown>;

export type GermanTask6cAdditiveAllocationContactDeV1 = Readonly<{
  id: string;
  sourcePlanId: string;
  canonicalSenseId: string;
  sourceChapterId: string;
  situationContextSignature: string;
  firstIntroductionPacketId: string;
  scoredContactId: string;
  scoredPacketId: string;
  contactStatus: "PLANNED_ADDITIVE_SCORED_CONTACT_ONLY";
}>;

export type GermanTask6cAdditiveAllocationContactRegistryDeV1 = Readonly<{
  schemaVersion: "learning-v2-german-task6c-additive-allocation-contacts.v1";
  status: "ADMITTED_FOR_TASK6C_ALLOCATION_ONLY";
  task7Unlock: false;
  canonicalPromotion: false;
  learnerFacingAuthority: false;
  targetBinding: Readonly<{
    lessonId: "de_l01";
    sourceChapterId: "de_l01_c01";
    bindingStatus: "PLANNED_MAPPING_ONLY";
  }>;
  contacts: readonly GermanTask6cAdditiveAllocationContactDeV1[];
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const TASK5_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
);
const CONTACT_KEYS = [
  "id",
  "sourcePlanId",
  "canonicalSenseId",
  "sourceChapterId",
  "situationContextSignature",
  "firstIntroductionPacketId",
  "scoredContactId",
  "scoredPacketId",
  "contactStatus",
] as const;
const REGISTRY_KEYS = [
  "schemaVersion",
  "status",
  "task7Unlock",
  "canonicalPromotion",
  "learnerFacingAuthority",
  "targetBinding",
  "contacts",
] as const;
const TARGET_BINDING = Object.freeze({
  lessonId: "de_l01" as const,
  sourceChapterId: "de_l01_c01" as const,
  bindingStatus: "PLANNED_MAPPING_ONLY" as const,
});

/**
 * These are proposed allocation identities, not lexical rows or evidence.
 * The status below only admits their planning transport to Task 6C allocation.
 */
export const TASK6C_L01_C01_ADDITIVE_ALLOCATION_CONTACTS_DE_V1 = Object.freeze([
  Object.freeze({
    id: "de_task6c_contact_l01_c01_haus_s05_v1",
    sourcePlanId: "de_lex_plan_task6c_l01_c01_haus_v1",
    canonicalSenseId: "de_lex_task6c_l01_c01_haus_v1",
    sourceChapterId: "de_l01_c01",
    situationContextSignature: "arrival-greeting-neighbour-door",
    firstIntroductionPacketId: "de_l01_c01_s03",
    scoredContactId: "de_task6c_contact_l01_c01_haus_s05_v1",
    scoredPacketId: "de_l01_c01_s05",
    contactStatus: "PLANNED_ADDITIVE_SCORED_CONTACT_ONLY" as const,
  }),
  Object.freeze({
    id: "de_task6c_contact_l01_c01_name_s06_v1",
    sourcePlanId: "de_lex_plan_task6c_l01_c01_name_v1",
    canonicalSenseId: "de_lex_task6c_l01_c01_name_v1",
    sourceChapterId: "de_l01_c01",
    situationContextSignature: "arrival-greeting-neighbour-door",
    firstIntroductionPacketId: "de_l01_c01_s04",
    scoredContactId: "de_task6c_contact_l01_c01_name_s06_v1",
    scoredPacketId: "de_l01_c01_s06",
    contactStatus: "PLANNED_ADDITIVE_SCORED_CONTACT_ONLY" as const,
  }),
] as const satisfies readonly GermanTask6cAdditiveAllocationContactDeV1[]);

const contactsBySourcePlanId: ReadonlyMap<
  string,
  GermanTask6cAdditiveAllocationContactDeV1
> = new Map(
  TASK6C_L01_C01_ADDITIVE_ALLOCATION_CONTACTS_DE_V1.map((contact) => [
    contact.sourcePlanId,
    contact,
  ]),
);

function fail(code: string): never {
  throw new Error(code);
}
function record(value: unknown, code: string): asserts value is RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail(code);
}
function text(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) fail(code);
}
function requiredText(value: RecordValue, key: string, code: string): string {
  const result = value[key];
  text(result, code);
  return result;
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
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as RecordValue)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function task5ChapterAuthority(): Readonly<{
  lessonId: string;
  chapterId: string;
  packetIds: readonly string[];
  checkpointPacketId: string;
  contextSignature: string;
  task5PlanIds: ReadonlySet<string>;
}> {
  const source = JSON.parse(fs.readFileSync(TASK5_PATH, "utf8")) as RecordValue;
  if (!Array.isArray(source.lessons))
    fail("task6c_additive_task5_lessons_invalid");
  for (const lesson of source.lessons) {
    record(lesson, "task6c_additive_task5_lesson_invalid");
    if (!Array.isArray(lesson.chapters)) continue;
    for (const chapter of lesson.chapters) {
      record(chapter, "task6c_additive_task5_chapter_invalid");
      if (chapter.id !== TARGET_BINDING.sourceChapterId) continue;
      text(lesson.lessonId, "task6c_additive_task5_lesson_invalid");
      if (lesson.lessonId !== TARGET_BINDING.lessonId)
        fail("task6c_additive_target_lesson_mismatch");
      if (
        !Array.isArray(chapter.packetIds) ||
        !chapter.packetIds.every((id) => typeof id === "string")
      )
        fail("task6c_additive_task5_packets_invalid");
      record(chapter.situation, "task6c_additive_task5_situation_invalid");
      text(
        chapter.situation.contextSignature,
        "task6c_additive_task5_situation_invalid",
      );
      record(chapter.checkpoint, "task6c_additive_task5_checkpoint_invalid");
      text(
        chapter.checkpoint.packetId,
        "task6c_additive_task5_checkpoint_invalid",
      );
      if (!Array.isArray(chapter.checkpoint.plannedNewLexicalSenses))
        fail("task6c_additive_task5_plans_invalid");
      const task5PlanIds = new Set<string>();
      for (const plan of chapter.checkpoint.plannedNewLexicalSenses) {
        record(plan, "task6c_additive_task5_plan_invalid");
        text(plan.id, "task6c_additive_task5_plan_invalid");
        task5PlanIds.add(plan.id);
      }
      return {
        lessonId: lesson.lessonId,
        chapterId: chapter.id as string,
        packetIds: chapter.packetIds as string[],
        checkpointPacketId: chapter.checkpoint.packetId,
        contextSignature: chapter.situation.contextSignature,
        task5PlanIds,
      };
    }
  }
  fail("task6c_additive_target_chapter_missing");
}

function validateContact(
  value: unknown,
  authority: ReturnType<typeof task5ChapterAuthority>,
  sourcePlanIds: Set<string>,
  canonicalSenseIds: Set<string>,
  contactIds: Set<string>,
): GermanTask6cAdditiveAllocationContactDeV1 {
  record(value, "task6c_additive_contact_record_required");
  closed(value, CONTACT_KEYS, "task6c_additive_closed_schema_invalid");
  const id = requiredText(
    value,
    "id",
    "task6c_additive_contact_field_required",
  );
  const sourcePlanId = requiredText(
    value,
    "sourcePlanId",
    "task6c_additive_contact_field_required",
  );
  const canonicalSenseId = requiredText(
    value,
    "canonicalSenseId",
    "task6c_additive_contact_field_required",
  );
  const sourceChapterId = requiredText(
    value,
    "sourceChapterId",
    "task6c_additive_contact_field_required",
  );
  const situationContextSignature = requiredText(
    value,
    "situationContextSignature",
    "task6c_additive_contact_field_required",
  );
  const firstIntroductionPacketId = requiredText(
    value,
    "firstIntroductionPacketId",
    "task6c_additive_contact_field_required",
  );
  const scoredContactId = requiredText(
    value,
    "scoredContactId",
    "task6c_additive_contact_field_required",
  );
  const scoredPacketId = requiredText(
    value,
    "scoredPacketId",
    "task6c_additive_contact_field_required",
  );
  const contactStatus = requiredText(
    value,
    "contactStatus",
    "task6c_additive_contact_field_required",
  );
  if (sourceChapterId !== authority.chapterId)
    fail("task6c_additive_contact_chapter_mismatch");
  if (situationContextSignature !== authority.contextSignature)
    fail("task6c_additive_contact_situation_mismatch");
  if (authority.task5PlanIds.has(sourcePlanId))
    fail("task6c_additive_contact_task5_collision");
  if (sourcePlanIds.has(sourcePlanId))
    fail("task6c_additive_contact_duplicate_source_plan");
  if (canonicalSenseIds.has(canonicalSenseId))
    fail("task6c_additive_contact_duplicate_canonical_sense");
  if (contactIds.has(id)) fail("task6c_additive_contact_duplicate_id");
  const expected = contactsBySourcePlanId.get(sourcePlanId);
  if (expected === undefined) fail("task6c_additive_contact_identity_mismatch");
  if (scoredContactId !== id || authority.task5PlanIds.has(scoredContactId))
    fail("task6c_additive_contact_must_be_additive_owned");
  const introIndex = authority.packetIds.indexOf(firstIntroductionPacketId);
  const scoredIndex = authority.packetIds.indexOf(scoredPacketId);
  if (introIndex < 0 || scoredIndex < 0)
    fail("task6c_additive_contact_packet_not_owned_by_chapter");
  if (scoredPacketId === authority.checkpointPacketId)
    fail("task6c_additive_contact_checkpoint_packet_forbidden");
  if (introIndex === scoredIndex)
    fail("task6c_additive_contact_same_packet_forbidden");
  if (introIndex > scoredIndex)
    fail("task6c_additive_contact_not_before_scored");
  if (contactStatus !== "PLANNED_ADDITIVE_SCORED_CONTACT_ONLY")
    fail("task6c_additive_contact_status_invalid");
  if (!equalJson(value, expected))
    fail("task6c_additive_contact_identity_mismatch");
  sourcePlanIds.add(sourcePlanId);
  canonicalSenseIds.add(canonicalSenseId);
  contactIds.add(id);
  return {
    id,
    sourcePlanId,
    canonicalSenseId,
    sourceChapterId,
    situationContextSignature,
    firstIntroductionPacketId,
    scoredContactId,
    scoredPacketId,
    contactStatus: "PLANNED_ADDITIVE_SCORED_CONTACT_ONLY",
  };
}

/**
 * Validates only the isolated contact transport. It deliberately has no source
 * capture, lexical admission, canonical registry, learner or Task 7 authority.
 */
export function parseGermanTask6cAdditiveAllocationContactRegistryDeV1(
  input: unknown,
): GermanTask6cAdditiveAllocationContactRegistryDeV1 {
  const authority = task5ChapterAuthority();
  record(input, "task6c_additive_registry_record_required");
  closed(input, REGISTRY_KEYS, "task6c_additive_closed_schema_invalid");
  if (
    input.schemaVersion !==
    "learning-v2-german-task6c-additive-allocation-contacts.v1"
  )
    fail("task6c_additive_schema_version_invalid");
  if (input.status !== "ADMITTED_FOR_TASK6C_ALLOCATION_ONLY")
    fail("task6c_additive_status_invalid");
  if (input.task7Unlock !== false)
    fail("task6c_additive_task7_unlock_forbidden");
  if (input.canonicalPromotion !== false)
    fail("task6c_additive_canonical_promotion_forbidden");
  if (input.learnerFacingAuthority !== false)
    fail("task6c_additive_learner_authority_forbidden");
  record(input.targetBinding, "task6c_additive_target_binding_invalid");
  closed(
    input.targetBinding,
    ["lessonId", "sourceChapterId", "bindingStatus"],
    "task6c_additive_closed_schema_invalid",
  );
  if (!equalJson(input.targetBinding, TARGET_BINDING))
    fail("task6c_additive_target_chapter_mismatch");
  if (
    !Array.isArray(input.contacts) ||
    input.contacts.length !==
      TASK6C_L01_C01_ADDITIVE_ALLOCATION_CONTACTS_DE_V1.length
  )
    fail("task6c_additive_contact_roster_invalid");
  const sourcePlanIds = new Set<string>();
  const canonicalSenseIds = new Set<string>();
  const contactIds = new Set<string>();
  const contacts = input.contacts.map((contact) =>
    validateContact(
      contact,
      authority,
      sourcePlanIds,
      canonicalSenseIds,
      contactIds,
    ),
  );
  return deepFreeze({
    schemaVersion: "learning-v2-german-task6c-additive-allocation-contacts.v1",
    status: "ADMITTED_FOR_TASK6C_ALLOCATION_ONLY",
    task7Unlock: false,
    canonicalPromotion: false,
    learnerFacingAuthority: false,
    targetBinding: { ...TARGET_BINDING },
    contacts,
  });
}

// Batch-001 remains a Task5-only HOLD provenance path and cannot feed contacts.
const TASK5_TRANSPORT = loadGermanTask6cBatch001TransportClaimsDeV1();
export function resolveGermanTask6cTask5TransportClaimDeV1(
  sourcePlanId: string,
  sourceKind: unknown = "TASK5",
): GermanTask6cBatch001TransportClaimDeV1 {
  if (sourceKind !== "TASK5")
    fail("task6c_task5_transport_claim_source_kind_invalid");
  const claim = TASK5_TRANSPORT.claims.find(
    (item) => item.sourcePlanId === sourcePlanId,
  );
  if (claim === undefined) fail("task6c_task5_transport_claim_unknown");
  if (
    claim.status !== "HOLD" ||
    claim.directEvidenceStatus !== "NOT_DIRECT_EVIDENCE"
  )
    fail("task6c_task5_transport_claim_invalid");
  return claim;
}
export function resolveGermanTask6cDirectTransportClaimDeV1(
  sourcePlanId: string,
): never {
  if (TASK5_TRANSPORT.claims.some((item) => item.sourcePlanId === sourcePlanId))
    fail("direct_transport_claim_not_direct_evidence");
  fail("direct_transport_claim_authority_unknown");
}
