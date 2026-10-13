import fs from "node:fs";
import path from "node:path";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../policies/decision_registry";
import {
  GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V1,
  resolveGermanLexicalItemEvidenceDeV1,
} from "./lexical_item_evidence_de_v1";
import {
  parseGermanTask6RegistryAuthorityContextDeV1,
  parseGermanTask6RegistryContractDeV1,
} from "./task6_registry_contract_de_v1";
import {
  isGermanTask6cAdditiveAllocationAdmissionDeV1,
  loadGermanTask6cAdditiveAllocationAdmissionDeV1,
} from "./task6c_additive_allocation_admission_de_v1";

type RecordValue = Record<string, unknown>;
export type GermanTask6cFullAllocationRowDeV1 = Readonly<{
  canonicalSenseId: string;
  firstIntroductionPacketId: string;
  sourceKind: "TASK5_CHECKPOINT" | "TASK6C_ADDITIVE";
  sourcePlanId: string;
}>;
export type GermanTask6cFullAllocationProposalDeV1 = Readonly<{
  authorityVersion: "learning-v2-german-task6c-packet-lexical-allocation.v1";
  allocationStatus: "PROPOSED_NOT_CANONICAL";
  canonicalRegistryStatus: "NOT_CANONICAL";
  task7Unlock: false;
  sourceIdentities: Readonly<{
    task5ChapterBlueprints: Readonly<{ path: string; canonicalSha256: string }>;
  }>;
  coverageRequirement: Readonly<{
    packetCount: 1792;
    minimumNewSensesPerPacket: 1;
    maximumNewSensesPerPacket: 5;
  }>;
  allocations: readonly GermanTask6cFullAllocationRowDeV1[];
}>;

const validatedForTask7DryRunOnly: unique symbol = Symbol(
  "validatedForTask7DryRunOnly",
);
export type GermanTask6cValidatedFullAllocationForTask7DryRunDeV1 = Readonly<{
  readonly validationStatus: "VALIDATED_FOR_TASK7_DRY_RUN_ONLY";
  readonly task7Unlock: false;
  readonly releaseAuthority: false;
  readonly learnerFacingAuthority: false;
  readonly packetCount: 1792;
  readonly allocationCount: number;
  readonly allocation: GermanTask6cFullAllocationProposalDeV1;
  readonly [validatedForTask7DryRunOnly]: true;
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const PATHS = Object.freeze({
  proposal:
    "modules/learning-v2/curriculum/de/registries/task6c_packet_lexical_allocation_de_v1.json",
  chapterBlueprints:
    "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
  canonicalRegistry:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json",
  grammarConstructs:
    "modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json",
  lessonBlueprints:
    "modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json",
  l01Partial:
    "docs/v2/curriculum/de/task6c-full-registry-l01-v1/target-allocation.json",
});
const PROPOSAL_KEYS = [
  "authorityVersion",
  "allocationStatus",
  "canonicalRegistryStatus",
  "task7Unlock",
  "sourceIdentities",
  "coverageRequirement",
  "allocations",
] as const;
const ROW_KEYS = [
  "canonicalSenseId",
  "firstIntroductionPacketId",
  "sourceKind",
  "sourcePlanId",
] as const;
const VALIDATED = new WeakSet<object>();

export function isGermanTask6cValidatedFullAllocationForTask7DryRunDeV1(
  value: unknown,
): value is GermanTask6cValidatedFullAllocationForTask7DryRunDeV1 {
  return value !== null && typeof value === "object" && VALIDATED.has(value);
}

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
function nonempty(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) fail(code);
}
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as RecordValue))
      deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}
function normalized(input: unknown): unknown {
  try {
    return JSON.parse(canonicalJsonV1(input)) as unknown;
  } catch {
    fail("task6c_full_allocation_canonical_json_invalid");
  }
}

/** Untrusted shape parser. It creates no admission, release, or Task 7 brand. */
export function parseGermanTask6cFullAllocationProposalDeV1(
  input: unknown,
): GermanTask6cFullAllocationProposalDeV1 {
  const value = normalized(input);
  record(value, "task6c_full_allocation_record_required");
  closed(value, PROPOSAL_KEYS, "task6c_full_allocation_unknown_field");
  if (
    value.authorityVersion !==
    "learning-v2-german-task6c-packet-lexical-allocation.v1"
  )
    fail("task6c_full_allocation_authority_version_invalid");
  if (value.allocationStatus !== "PROPOSED_NOT_CANONICAL")
    fail("task6c_full_allocation_status_invalid");
  if (value.canonicalRegistryStatus !== "NOT_CANONICAL")
    fail("task6c_full_allocation_canonical_status_invalid");
  if (value.task7Unlock !== false)
    fail("task6c_full_allocation_task7_unlock_forbidden");
  record(
    value.sourceIdentities,
    "task6c_full_allocation_source_identities_invalid",
  );
  closed(
    value.sourceIdentities,
    ["task5ChapterBlueprints"],
    "task6c_full_allocation_source_identities_invalid",
  );
  record(
    value.sourceIdentities.task5ChapterBlueprints,
    "task6c_full_allocation_task5_identity_invalid",
  );
  closed(
    value.sourceIdentities.task5ChapterBlueprints,
    ["path", "canonicalSha256"],
    "task6c_full_allocation_task5_identity_invalid",
  );
  nonempty(
    value.sourceIdentities.task5ChapterBlueprints.path,
    "task6c_full_allocation_task5_path_invalid",
  );
  if (
    typeof value.sourceIdentities.task5ChapterBlueprints.canonicalSha256 !==
      "string" ||
    !/^[a-f0-9]{64}$/u.test(
      value.sourceIdentities.task5ChapterBlueprints.canonicalSha256,
    )
  )
    fail("task6c_full_allocation_task5_digest_invalid");
  record(value.coverageRequirement, "task6c_full_allocation_coverage_invalid");
  closed(
    value.coverageRequirement,
    ["packetCount", "minimumNewSensesPerPacket", "maximumNewSensesPerPacket"],
    "task6c_full_allocation_coverage_invalid",
  );
  if (
    value.coverageRequirement.packetCount !== 1792 ||
    value.coverageRequirement.minimumNewSensesPerPacket !== 1 ||
    value.coverageRequirement.maximumNewSensesPerPacket !== 5
  )
    fail("task6c_full_allocation_coverage_invalid");
  if (!Array.isArray(value.allocations))
    fail("task6c_full_allocation_allocations_array_required");
  for (const row of value.allocations) {
    record(row, "task6c_full_allocation_row_record_required");
    closed(row, ROW_KEYS, "task6c_full_allocation_row_unknown_field");
    nonempty(
      row.canonicalSenseId,
      "task6c_full_allocation_canonical_id_invalid",
    );
    nonempty(
      row.firstIntroductionPacketId,
      "task6c_full_allocation_packet_id_invalid",
    );
    nonempty(row.sourcePlanId, "task6c_full_allocation_source_plan_id_invalid");
    if (
      row.sourceKind !== "TASK5_CHECKPOINT" &&
      row.sourceKind !== "TASK6C_ADDITIVE"
    )
      fail("task6c_full_allocation_source_kind_invalid");
  }
  return deepFreeze(value as unknown as GermanTask6cFullAllocationProposalDeV1);
}

function readJson(fixedPath: string): unknown {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, fixedPath), "utf8"),
  ) as unknown;
}
function exists(fixedPath: string): boolean {
  return fs.existsSync(path.join(ROOT, fixedPath));
}
function packetOrder(id: string): number {
  const match = /^de_l(\d{2})_c(\d{2})_s(\d{2})$/u.exec(id);
  if (match === null) fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
  return (Number(match[1]) - 1) * 56 + Number(match[3]);
}

function trustedTask6(): {
  readonly context: ReturnType<
    typeof parseGermanTask6RegistryAuthorityContextDeV1
  >;
  readonly canonical: RecordValue;
} {
  const canonical = readJson(PATHS.canonicalRegistry);
  record(canonical, "TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
  if (
    canonical.schemaVersion !== "learning-v2-german-task6-canonical-registry.v1"
  )
    fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
  record(canonical.authorityContext, "TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
  const context = parseGermanTask6RegistryAuthorityContextDeV1({
    ...canonical.authorityContext,
    authoritySources: {
      grammarConstructs: readJson(PATHS.grammarConstructs),
      lessonBlueprints: readJson(PATHS.lessonBlueprints),
      chapterBlueprints: readJson(PATHS.chapterBlueprints),
    },
  });
  parseGermanTask6RegistryContractDeV1(
    canonical.registry,
    context,
    GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V1,
  );
  return { context, canonical };
}

type AllocationAuthority = Readonly<{
  packetIds: ReadonlySet<string>;
  task5: ReadonlyMap<
    string,
    Readonly<{
      canonicalSenseId: string;
      firstIntroductionPacketId: string;
      hasLaterScoredUse: boolean;
      evidenceBound: boolean;
    }>
  >;
  admittedAdditives: ReadonlyMap<
    string,
    Readonly<{
      sourcePlanId: string;
      canonicalSenseId: string;
      firstIntroductionPacketId: string;
      scoredPacketId: string;
    }>
  >;
}>;

function frozenReadonlyMap<K, V>(
  entries: readonly (readonly [K, V])[],
): ReadonlyMap<K, V> {
  const values = new Map(entries);
  let view: ReadonlyMap<K, V>;
  view = Object.freeze({
    get size(): number {
      return values.size;
    },
    get(key: K): V | undefined {
      return values.get(key);
    },
    has(key: K): boolean {
      return values.has(key);
    },
    entries(): MapIterator<[K, V]> {
      return values.entries();
    },
    keys(): MapIterator<K> {
      return values.keys();
    },
    values(): MapIterator<V> {
      return values.values();
    },
    forEach(
      callback: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
      thisArg?: unknown,
    ): void {
      values.forEach((value, key) => callback.call(thisArg, value, key, view));
    },
    [Symbol.iterator](): MapIterator<[K, V]> {
      return values[Symbol.iterator]();
    },
    [Symbol.toStringTag]: "ReadonlyMap",
  });
  return view;
}

function loadAdmittedAdditivesForProduction(
  packetIds: ReadonlySet<string>,
  task5: AllocationAuthority["task5"],
): AllocationAuthority["admittedAdditives"] {
  const admission = loadGermanTask6cAdditiveAllocationAdmissionDeV1();
  if (
    !isGermanTask6cAdditiveAllocationAdmissionDeV1(admission) ||
    admission.status !== "ADMITTED_FOR_TASK6C_ALLOCATION_ONLY" ||
    admission.rowsAdmitted !== 2 ||
    admission.rowsPromoted !== 0 ||
    admission.canonicalRegistryStatus !== "NOT_CANONICAL" ||
    admission.canonicalPromotion !== false ||
    admission.task7Unlock !== false ||
    admission.packetMaterializationAuthority !== false ||
    admission.learnerFacingAuthority !== false ||
    admission.releaseAuthority !== false ||
    admission.rows.length !== 2
  ) {
    fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
  }
  const task5CanonicalSenseIds = new Set(
    [...task5.values()].map((row) => row.canonicalSenseId),
  );
  const sourcePlanIds = new Set<string>();
  const canonicalSenseIds = new Set<string>();
  const entries: (readonly [
    string,
    Readonly<{
      sourcePlanId: string;
      canonicalSenseId: string;
      firstIntroductionPacketId: string;
      scoredPacketId: string;
    }>,
  ])[] = [];
  for (const row of admission.rows) {
    if (
      !packetIds.has(row.firstIntroductionPacketId) ||
      !packetIds.has(row.scoredPacketId) ||
      packetOrder(row.scoredPacketId) <=
        packetOrder(row.firstIntroductionPacketId) ||
      task5.has(row.sourcePlanId) ||
      task5CanonicalSenseIds.has(row.canonicalSenseId) ||
      sourcePlanIds.has(row.sourcePlanId) ||
      canonicalSenseIds.has(row.canonicalSenseId)
    ) {
      fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
    }
    sourcePlanIds.add(row.sourcePlanId);
    canonicalSenseIds.add(row.canonicalSenseId);
    entries.push([
      row.sourcePlanId,
      deepFreeze({
        sourcePlanId: row.sourcePlanId,
        canonicalSenseId: row.canonicalSenseId,
        firstIntroductionPacketId: row.firstIntroductionPacketId,
        scoredPacketId: row.scoredPacketId,
      }),
    ]);
  }
  return frozenReadonlyMap(entries);
}

function validateAgainstAuthority(
  proposal: GermanTask6cFullAllocationProposalDeV1,
  authority: AllocationAuthority,
): void {
  if (authority.packetIds.size !== 1792 || authority.task5.size !== 288) {
    fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
  }
  const canonicalIds = new Set<string>();
  const task5SourcePlanIds = new Set<string>();
  const additiveSourcePlanIds = new Set<string>();
  const perPacket = new Map<string, number>();
  for (const row of proposal.allocations) {
    if (
      !authority.packetIds.has(row.firstIntroductionPacketId) ||
      canonicalIds.has(row.canonicalSenseId)
    ) {
      fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
    }
    canonicalIds.add(row.canonicalSenseId);
    perPacket.set(
      row.firstIntroductionPacketId,
      (perPacket.get(row.firstIntroductionPacketId) ?? 0) + 1,
    );
    if (row.sourceKind === "TASK5_CHECKPOINT") {
      const expected = authority.task5.get(row.sourcePlanId);
      if (
        expected === undefined ||
        task5SourcePlanIds.has(row.sourcePlanId) ||
        additiveSourcePlanIds.has(row.sourcePlanId)
      ) {
        fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
      }
      if (!expected.evidenceBound)
        fail("TASK7_FULL_ALLOCATION_AUTHORITY_UNAVAILABLE");
      if (
        expected.canonicalSenseId !== row.canonicalSenseId ||
        expected.firstIntroductionPacketId !== row.firstIntroductionPacketId ||
        !expected.hasLaterScoredUse
      ) {
        fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
      }
      task5SourcePlanIds.add(row.sourcePlanId);
    } else {
      const expected = authority.admittedAdditives.get(row.sourcePlanId);
      if (
        additiveSourcePlanIds.has(row.sourcePlanId) ||
        task5SourcePlanIds.has(row.sourcePlanId) ||
        authority.task5.has(row.sourcePlanId)
      ) {
        fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
      }
      if (expected === undefined)
        fail("TASK7_FULL_ALLOCATION_AUTHORITY_UNAVAILABLE");
      if (
        expected.sourcePlanId !== row.sourcePlanId ||
        expected.canonicalSenseId !== row.canonicalSenseId ||
        expected.firstIntroductionPacketId !== row.firstIntroductionPacketId
      ) {
        fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
      }
      additiveSourcePlanIds.add(row.sourcePlanId);
    }
  }
  for (const packetId of authority.packetIds) {
    const count = perPacket.get(packetId) ?? 0;
    if (count < 1 || count > 5) fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
  }
  if (
    task5SourcePlanIds.size !== authority.task5.size ||
    [...authority.task5.keys()].some((id) => !task5SourcePlanIds.has(id))
  ) {
    fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
  }
}

function productionAuthority(): AllocationAuthority {
  const { context } = trustedTask6();
  const mappings = new Map(
    context.lexicalMappings.map((mapping) => [mapping.sourcePlanId, mapping]),
  );
  const packets = new Set(
    context.chapterFacts.flatMap((chapter) => chapter.packetIds),
  );
  const evidenceByPlan = new Map(
    GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V1.map((evidence) => [
      evidence.sourcePlanId,
      resolveGermanLexicalItemEvidenceDeV1(
        GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V1,
        evidence.id,
      ),
    ]),
  );
  const task5 = new Map(
    context.lexicalPlanFacts.map((plan) => {
      const mapping = mappings.get(plan.sourcePlanId);
      const evidence = evidenceByPlan.get(plan.sourcePlanId);
      return [
        plan.sourcePlanId,
        {
          canonicalSenseId: mapping?.canonicalId ?? "",
          firstIntroductionPacketId: mapping?.plannedWordFirstPacketId ?? "",
          hasLaterScoredUse:
            mapping !== undefined &&
            plan.plannedUsePacketIds.some(
              (id) =>
                packetOrder(id) > packetOrder(mapping.plannedWordFirstPacketId),
            ),
          evidenceBound:
            evidence !== undefined &&
            mapping !== undefined &&
            evidence.sourcePlanId === plan.sourcePlanId &&
            evidence.canonicalLexicalSenseId === mapping.canonicalId,
        },
      ] as const;
    }),
  );
  return {
    packetIds: packets,
    task5,
    admittedAdditives: loadAdmittedAdditivesForProduction(packets, task5),
  };
}

/** Test-only summary of the fixed production authority; no carrier, map, or brand escapes. */
export function __testOnlyReadGermanTask6cProductionAuthoritySummaryDeV1(): Readonly<{
  packetCount: number;
  task5Count: number;
  admittedAdditiveCount: number;
  admittedAdditiveInputs: readonly Readonly<{
    sourcePlanId: string;
    canonicalSenseId: string;
    firstIntroductionPacketId: string;
    scoredPacketId: string;
  }>[];
  canonicalPromotion: false;
  task7Unlock: false;
  learnerFacingAuthority: false;
  releaseAuthority: false;
}> {
  const authority = productionAuthority();
  return deepFreeze({
    packetCount: authority.packetIds.size,
    task5Count: authority.task5.size,
    admittedAdditiveCount: authority.admittedAdditives.size,
    admittedAdditiveInputs: [...authority.admittedAdditives.values()].map(
      (row) => ({
        sourcePlanId: row.sourcePlanId,
        canonicalSenseId: row.canonicalSenseId,
        firstIntroductionPacketId: row.firstIntroductionPacketId,
        scoredPacketId: row.scoredPacketId,
      }),
    ),
    canonicalPromotion: false as const,
    task7Unlock: false as const,
    learnerFacingAuthority: false as const,
    releaseAuthority: false as const,
  });
}

function validateFullProposal(
  proposal: GermanTask6cFullAllocationProposalDeV1,
): void {
  const chapters = readJson(PATHS.chapterBlueprints);
  if (
    proposal.sourceIdentities.task5ChapterBlueprints.path !==
      PATHS.chapterBlueprints ||
    proposal.sourceIdentities.task5ChapterBlueprints.canonicalSha256 !==
      hashCanonicalBody(chapters)
  ) {
    fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
  }
  validateAgainstAuthority(proposal, productionAuthority());
}

type TestOnlyAuthority = AllocationAuthority;
const TEST_ONLY_AUTHORITIES = new WeakSet<object>();

/** Test seam: its carrier is rejected by the production loader and never brands output. */
export function __testOnlyCreateGermanTask6cFullAllocationAuthorityDeV1(): Readonly<{
  proposal: GermanTask6cFullAllocationProposalDeV1;
  authority: TestOnlyAuthority;
}> {
  const packetIds: string[] = [];
  for (let lesson = 1; lesson <= 32; lesson += 1) {
    for (let session = 1; session <= 56; session += 1) {
      packetIds.push(
        `de_l${String(lesson).padStart(2, "0")}_c${String(Math.ceil(session / 8)).padStart(2, "0")}_s${String(session).padStart(2, "0")}`,
      );
    }
  }
  const task5 = new Map<
    string,
    {
      canonicalSenseId: string;
      firstIntroductionPacketId: string;
      hasLaterScoredUse: boolean;
      evidenceBound: boolean;
    }
  >();
  const additives = new Map<
    string,
    {
      sourcePlanId: string;
      canonicalSenseId: string;
      firstIntroductionPacketId: string;
      scoredPacketId: string;
    }
  >();
  const allocations: GermanTask6cFullAllocationRowDeV1[] = [];
  for (let index = 0; index < packetIds.length; index += 1) {
    const sourcePlanId =
      index < 288 ? `test_task5_${index}` : `test_additive_${index}`;
    const canonicalSenseId = `test_sense_${index}`;
    const row = {
      canonicalSenseId,
      firstIntroductionPacketId: packetIds[index],
      sourceKind:
        index < 288
          ? ("TASK5_CHECKPOINT" as const)
          : ("TASK6C_ADDITIVE" as const),
      sourcePlanId,
    };
    allocations.push(row);
    if (row.sourceKind === "TASK5_CHECKPOINT")
      task5.set(sourcePlanId, {
        canonicalSenseId,
        firstIntroductionPacketId: row.firstIntroductionPacketId,
        hasLaterScoredUse: true,
        evidenceBound: true,
      });
    else
      additives.set(sourcePlanId, {
        sourcePlanId,
        canonicalSenseId,
        firstIntroductionPacketId: row.firstIntroductionPacketId,
        scoredPacketId: row.firstIntroductionPacketId,
      });
  }
  const proposal = parseGermanTask6cFullAllocationProposalDeV1({
    authorityVersion: "learning-v2-german-task6c-packet-lexical-allocation.v1",
    allocationStatus: "PROPOSED_NOT_CANONICAL",
    canonicalRegistryStatus: "NOT_CANONICAL",
    task7Unlock: false,
    sourceIdentities: {
      task5ChapterBlueprints: {
        path: PATHS.chapterBlueprints,
        canonicalSha256: "0".repeat(64),
      },
    },
    coverageRequirement: {
      packetCount: 1792,
      minimumNewSensesPerPacket: 1,
      maximumNewSensesPerPacket: 5,
    },
    allocations,
  });
  const authority: TestOnlyAuthority = deepFreeze({
    packetIds: new Set(packetIds),
    task5,
    admittedAdditives: additives,
  });
  TEST_ONLY_AUTHORITIES.add(authority);
  return deepFreeze({ proposal, authority });
}

export function __testOnlyValidateGermanTask6cFullAllocationDeV1(
  proposal: unknown,
  authority: unknown,
): Readonly<{
  validationStatus: "TEST_ONLY_VALIDATION";
  packetCount: 1792;
  allocationCount: number;
}> {
  if (
    authority === null ||
    typeof authority !== "object" ||
    !TEST_ONLY_AUTHORITIES.has(authority)
  )
    fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
  const parsed = parseGermanTask6cFullAllocationProposalDeV1(proposal);
  validateAgainstAuthority(parsed, authority as TestOnlyAuthority);
  return deepFreeze({
    validationStatus: "TEST_ONLY_VALIDATION" as const,
    packetCount: 1792 as const,
    allocationCount: parsed.allocations.length,
  });
}

/** The sole production entrypoint. It has no caller-controlled paths or evidence. */
export function loadGermanTask6cValidatedFullAllocationForTask7DryRunDeV1(): GermanTask6cValidatedFullAllocationForTask7DryRunDeV1 {
  if (!exists(PATHS.proposal)) {
    if (exists(PATHS.l01Partial))
      fail("TASK7_FULL_ALLOCATION_AUTHORITY_PARTIAL");
    fail("TASK7_FULL_ALLOCATION_AUTHORITY_UNAVAILABLE");
  }
  let proposal: GermanTask6cFullAllocationProposalDeV1;
  try {
    proposal = parseGermanTask6cFullAllocationProposalDeV1(
      readJson(PATHS.proposal),
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("TASK7_"))
      throw error;
    fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
  }
  try {
    validateFullProposal(proposal);
  } catch (error) {
    if (error instanceof Error) throw error;
    fail("TASK7_FULL_ALLOCATION_AUTHORITY_INVALID");
  }
  const result = deepFreeze({
    validationStatus: "VALIDATED_FOR_TASK7_DRY_RUN_ONLY" as const,
    task7Unlock: false as const,
    releaseAuthority: false as const,
    learnerFacingAuthority: false as const,
    packetCount: 1792 as const,
    allocationCount: proposal.allocations.length,
    allocation: proposal,
    [validatedForTask7DryRunOnly]: true as const,
  }) as GermanTask6cValidatedFullAllocationForTask7DryRunDeV1;
  VALIDATED.add(result);
  return result;
}
