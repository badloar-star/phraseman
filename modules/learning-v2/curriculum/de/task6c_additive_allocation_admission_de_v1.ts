import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { loadGermanTask6cBatch001TransportClaimsDeV1 } from "./task6c_batch001_transport_claim_loader_de_v1";
import { loadGermanTask6cL01C01HausNameDirectCaptureDeV1 } from "./task6c_l01_c01_haus_name_direct_capture_de_v1";
import { loadGermanTask6cL01C01HausNameFactsDeV1 } from "./task6c_l01_c01_haus_name_facts_de_v1";
import {
  parseGermanTask6cAdditiveAllocationContactRegistryDeV1,
  TASK6C_L01_C01_ADDITIVE_ALLOCATION_CONTACTS_DE_V1,
} from "./task6c_additive_source_plan_contract_de_v1";

type RecordValue = Record<string, unknown>;

export type GermanTask6cAdditiveAllocationAdmissionRowDeV1 = Readonly<{
  sourcePlanId: string;
  canonicalSenseId: string;
  targetPlaceholderPlanId: string;
  sourceChapterId: "de_l01_c01";
  situationContextSignature: "arrival-greeting-neighbour-door";
  firstIntroductionPacketId: string;
  scoredContactId: string;
  scoredPacketId: string;
  sourceAnchor: "d-1-1-1";
  lemma: "Haus" | "Name";
  article: "das" | "der";
  plural: "Häuser" | "Namen";
  sourceGenderLabel: "Neutrum" | "Maskulinum";
  definitionGerman: string;
}>;

export type GermanTask6cAdditiveAllocationAdmissionDeV1 = Readonly<{
  schemaVersion: "learning-v2-german-task6c-additive-allocation-admission.v1";
  status: "ADMITTED_FOR_TASK6C_ALLOCATION_ONLY";
  rowsAdmitted: 2;
  rowsPromoted: 0;
  canonicalRegistryStatus: "NOT_CANONICAL";
  canonicalPromotion: false;
  task7Unlock: false;
  packetMaterializationAuthority: false;
  learnerFacingAuthority: false;
  releaseAuthority: false;
  sourceBindings: Readonly<Record<string, string>>;
  rows: readonly GermanTask6cAdditiveAllocationAdmissionRowDeV1[];
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const REGISTRY_PATH =
  "modules/learning-v2/curriculum/de/registries/task6c_additive_allocation_admission_de_v1.json";
const SOURCE_BINDINGS = Object.freeze({
  factsPath:
    "modules/learning-v2/curriculum/de/task6c_l01_c01_haus_name_facts_de_v1.ts",
  factsSha256:
    "eeb5dd9b72695e663c16fa3a9e2382e52651904156537defc83f044677a7131b",
  capturePath:
    "modules/learning-v2/curriculum/de/task6c_l01_c01_haus_name_direct_capture_de_v1.ts",
  captureSha256:
    "0292070c09f2f086493c8d654f549b2cb285d7dddb551d4df8406b2ef33866f6",
  contactContractPath:
    "modules/learning-v2/curriculum/de/task6c_additive_source_plan_contract_de_v1.ts",
  contactContractSha256:
    "33d0e3bc1fc31b2785291dfd7cc8519d582d26b5a4d9e6a1e0d86208269cb480",
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
  "targetPlaceholderPlanId",
  "sourceChapterId",
  "situationContextSignature",
  "firstIntroductionPacketId",
  "scoredContactId",
  "scoredPacketId",
  "sourceAnchor",
  "lemma",
  "article",
  "plural",
  "sourceGenderLabel",
  "definitionGerman",
] as const;
const VALIDATED = new WeakSet<object>();
const admissionBrand: unique symbol = Symbol(
  "task6cAdditiveAllocationAdmission",
);

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
function text(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) fail(code);
}
function sha256(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as RecordValue)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
function fixedPath(relative: string): string {
  if (relative.includes("..") || path.isAbsolute(relative))
    fail("task6c_additive_admission_source_binding_invalid");
  const candidate = path.resolve(ROOT, relative);
  if (!candidate.startsWith(`${ROOT}${path.sep}`))
    fail("task6c_additive_admission_source_binding_invalid");
  return candidate;
}
function equalJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
function readFixedRegistry(): unknown {
  return JSON.parse(
    fs.readFileSync(fixedPath(REGISTRY_PATH), "utf8"),
  ) as unknown;
}
function fixedSourceBindings(): void {
  for (const [key, expected] of Object.entries(SOURCE_BINDINGS)) {
    if (!key.endsWith("Sha256")) continue;
    const pathKey =
      `${key.slice(0, -"Sha256".length)}Path` as keyof typeof SOURCE_BINDINGS;
    if (sha256(fixedPath(SOURCE_BINDINGS[pathKey])) !== expected)
      fail("task6c_additive_admission_source_binding_invalid");
  }
}
function noEnglish(value: unknown): void {
  if (typeof value === "string") {
    if (/(?:^|[_/])en(?:[_/]|$)|english/iu.test(value))
      fail("task6c_additive_admission_english_invalid");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(noEnglish);
    return;
  }
  if (value !== null && typeof value === "object")
    Object.values(value as RecordValue).forEach(noEnglish);
}

const EXPECTED_ROWS = Object.freeze([
  Object.freeze({
    sourcePlanId: "de_lex_plan_task6c_l01_c01_haus_v1",
    canonicalSenseId: "de_lex_task6c_l01_c01_haus_v1",
    targetPlaceholderPlanId: "de_plan_l01_nonc01_03_v1",
    sourceChapterId: "de_l01_c01",
    situationContextSignature: "arrival-greeting-neighbour-door",
    firstIntroductionPacketId: "de_l01_c01_s03",
    scoredContactId: "de_task6c_contact_l01_c01_haus_s05_v1",
    scoredPacketId: "de_l01_c01_s05",
    sourceAnchor: "d-1-1-1",
    lemma: "Haus",
    article: "das",
    plural: "Häuser",
    sourceGenderLabel: "Neutrum",
    definitionGerman: "zum Wohnen, Wohnhaus",
  }),
  Object.freeze({
    sourcePlanId: "de_lex_plan_task6c_l01_c01_name_v1",
    canonicalSenseId: "de_lex_task6c_l01_c01_name_v1",
    targetPlaceholderPlanId: "de_plan_l01_nonc01_04_v1",
    sourceChapterId: "de_l01_c01",
    situationContextSignature: "arrival-greeting-neighbour-door",
    firstIntroductionPacketId: "de_l01_c01_s04",
    scoredContactId: "de_task6c_contact_l01_c01_name_s06_v1",
    scoredPacketId: "de_l01_c01_s06",
    sourceAnchor: "d-1-1-1",
    lemma: "Name",
    article: "der",
    plural: "Namen",
    sourceGenderLabel: "Maskulinum",
    definitionGerman: "Bezeichnung für eine Person, Familienname oder Vorname",
  }),
] as const);

function upstreamAuthority(): Readonly<{
  facts: Map<string, RecordValue>;
  captures: Map<string, RecordValue>;
  contacts: Map<string, RecordValue>;
}> {
  const capture = loadGermanTask6cL01C01HausNameDirectCaptureDeV1();
  const facts = loadGermanTask6cL01C01HausNameFactsDeV1();
  const transport = loadGermanTask6cBatch001TransportClaimsDeV1();
  if (
    transport.claims.some((claim) =>
      EXPECTED_ROWS.some((row) => row.sourcePlanId === claim.sourcePlanId),
    )
  )
    fail("task6c_additive_admission_task5_collision_invalid");
  const contacts = parseGermanTask6cAdditiveAllocationContactRegistryDeV1({
    schemaVersion: "learning-v2-german-task6c-additive-allocation-contacts.v1",
    status: "ADMITTED_FOR_TASK6C_ALLOCATION_ONLY",
    task7Unlock: false,
    canonicalPromotion: false,
    learnerFacingAuthority: false,
    targetBinding: {
      lessonId: "de_l01",
      sourceChapterId: "de_l01_c01",
      bindingStatus: "PLANNED_MAPPING_ONLY",
    },
    contacts: TASK6C_L01_C01_ADDITIVE_ALLOCATION_CONTACTS_DE_V1,
  });
  return {
    facts: new Map(
      facts.facts.map((fact) => {
        record(fact, "task6c_additive_admission_row_identity_invalid");
        return [String(fact.sourcePlanId), fact];
      }),
    ),
    captures: new Map(
      capture.captures.map((item) => {
        record(item, "task6c_additive_admission_row_identity_invalid");
        return [String(item.sourcePlanId), item];
      }),
    ),
    contacts: new Map(
      contacts.contacts.map((contact) => [
        contact.sourcePlanId,
        contact as unknown as RecordValue,
      ]),
    ),
  };
}
function verifyTargetPlaceholders(
  rows: readonly GermanTask6cAdditiveAllocationAdmissionRowDeV1[],
): void {
  const target = JSON.parse(
    fs.readFileSync(fixedPath(SOURCE_BINDINGS.targetAllocationPath), "utf8"),
  ) as RecordValue;
  record(target, "task6c_additive_admission_target_binding_invalid");
  record(target.allocation, "task6c_additive_admission_target_binding_invalid");
  const placeholders = target.allocation.nonCheckpointFirstIntroductions;
  if (!Array.isArray(placeholders))
    fail("task6c_additive_admission_target_binding_invalid");
  for (const row of rows) {
    if (
      !placeholders.some((item) => {
        record(item, "task6c_additive_admission_target_binding_invalid");
        return (
          item.plannedSenseId === row.targetPlaceholderPlanId &&
          item.firstIntroductionPacketId === row.firstIntroductionPacketId &&
          item.sourcePlanId === null
        );
      })
    )
      fail("task6c_additive_admission_target_binding_invalid");
  }
}
function verifyCanonicalCollision(
  rows: readonly GermanTask6cAdditiveAllocationAdmissionRowDeV1[],
): void {
  const canonical = JSON.parse(
    fs.readFileSync(fixedPath(SOURCE_BINDINGS.canonicalRegistryPath), "utf8"),
  ) as RecordValue;
  record(canonical, "task6c_additive_admission_canonical_collision_invalid");
  record(
    canonical.registry,
    "task6c_additive_admission_canonical_collision_invalid",
  );
  const lexical = canonical.registry.lexicalSenses;
  if (!Array.isArray(lexical) || lexical.length !== 2)
    fail("task6c_additive_admission_canonical_collision_invalid");
  const ids = new Set(
    lexical.map((item) => {
      record(item, "task6c_additive_admission_canonical_collision_invalid");
      return item.id;
    }),
  );
  if (rows.some((row) => ids.has(row.canonicalSenseId)))
    fail("task6c_additive_admission_canonical_collision_invalid");
}
function parse(input: unknown): GermanTask6cAdditiveAllocationAdmissionDeV1 {
  fixedSourceBindings();
  noEnglish(input);
  record(input, "task6c_additive_admission_schema_invalid");
  closed(input, ROOT_KEYS, "task6c_additive_admission_schema_invalid");
  if (
    input.schemaVersion !==
      "learning-v2-german-task6c-additive-allocation-admission.v1" ||
    input.status !== "ADMITTED_FOR_TASK6C_ALLOCATION_ONLY"
  )
    fail("task6c_additive_admission_status_invalid");
  if (
    input.rowsAdmitted !== 2 ||
    input.rowsPromoted !== 0 ||
    input.canonicalRegistryStatus !== "NOT_CANONICAL" ||
    input.canonicalPromotion !== false ||
    input.task7Unlock !== false ||
    input.packetMaterializationAuthority !== false ||
    input.learnerFacingAuthority !== false ||
    input.releaseAuthority !== false
  )
    fail("task6c_additive_admission_ceiling_invalid");
  record(
    input.sourceBindings,
    "task6c_additive_admission_source_binding_invalid",
  );
  if (!equalJson(input.sourceBindings, SOURCE_BINDINGS))
    fail("task6c_additive_admission_source_binding_invalid");
  if (!Array.isArray(input.rows) || input.rows.length !== EXPECTED_ROWS.length)
    fail("task6c_additive_admission_roster_invalid");
  const authority = upstreamAuthority();
  const sourcePlanIds = new Set<string>();
  const senses = new Set<string>();
  const rows: GermanTask6cAdditiveAllocationAdmissionRowDeV1[] = [];
  for (let index = 0; index < input.rows.length; index += 1) {
    const row = input.rows[index];
    record(row, "task6c_additive_admission_schema_invalid");
    closed(row, ROW_KEYS, "task6c_additive_admission_schema_invalid");
    text(row.sourcePlanId, "task6c_additive_admission_row_identity_invalid");
    text(
      row.canonicalSenseId,
      "task6c_additive_admission_row_identity_invalid",
    );
    if (sourcePlanIds.has(row.sourcePlanId) || senses.has(row.canonicalSenseId))
      fail("task6c_additive_admission_duplicate_invalid");
    const expected = EXPECTED_ROWS[index];
    if (!equalJson(row, expected))
      fail("task6c_additive_admission_row_identity_invalid");
    const typed = row as GermanTask6cAdditiveAllocationAdmissionRowDeV1;
    sourcePlanIds.add(typed.sourcePlanId);
    senses.add(typed.canonicalSenseId);
    const fact = authority.facts.get(typed.sourcePlanId);
    const capture = authority.captures.get(typed.sourcePlanId);
    const contact = authority.contacts.get(typed.sourcePlanId);
    record(fact, "task6c_additive_admission_row_identity_invalid");
    record(capture, "task6c_additive_admission_row_identity_invalid");
    record(contact, "task6c_additive_admission_contact_invalid");
    record(fact.sourceSense, "task6c_additive_admission_row_identity_invalid");
    record(fact.morphology, "task6c_additive_admission_row_identity_invalid");
    if (
      fact.sourceSense.sourceAnchor !== typed.sourceAnchor ||
      fact.sourceSense.definitionGerman !== typed.definitionGerman ||
      fact.morphology.lemma !== typed.lemma ||
      fact.morphology.article !== typed.article ||
      fact.morphology.plural !== typed.plural ||
      fact.morphology.sourceGenderLabel !== typed.sourceGenderLabel ||
      capture.canonicalSenseId !== typed.canonicalSenseId ||
      capture.lemma !== typed.lemma ||
      contact.sourceChapterId !== typed.sourceChapterId ||
      contact.situationContextSignature !== typed.situationContextSignature ||
      contact.firstIntroductionPacketId !== typed.firstIntroductionPacketId ||
      contact.scoredContactId !== typed.scoredContactId ||
      contact.scoredPacketId !== typed.scoredPacketId
    )
      fail("task6c_additive_admission_row_identity_invalid");
    rows.push(typed);
  }
  verifyTargetPlaceholders(rows);
  verifyCanonicalCollision(rows);
  return deepFreeze({
    schemaVersion: "learning-v2-german-task6c-additive-allocation-admission.v1",
    status: "ADMITTED_FOR_TASK6C_ALLOCATION_ONLY",
    rowsAdmitted: 2,
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
  } as GermanTask6cAdditiveAllocationAdmissionDeV1 & Record<symbol, boolean>);
}

/** The production entrypoint is zero-argument and reads only the fixed German registry. */
export function loadGermanTask6cAdditiveAllocationAdmissionDeV1(): GermanTask6cAdditiveAllocationAdmissionDeV1 {
  const result = parse(readFixedRegistry());
  VALIDATED.add(result);
  return result;
}
export function isGermanTask6cAdditiveAllocationAdmissionDeV1(
  value: unknown,
): value is GermanTask6cAdditiveAllocationAdmissionDeV1 {
  return value !== null && typeof value === "object" && VALIDATED.has(value);
}
/** Test-only untrusted parser; it does not brand or promote its result. */
export const germanTask6cAdditiveAllocationAdmissionTestHarnessDeV1 =
  Object.freeze({
    readFixedRegistryForTest(): unknown {
      return readFixedRegistry();
    },
    validateUntrustedRegistryForTest(input: unknown): void {
      parse(input);
    },
  });
