export type GermanOwnerDecisionsContractDeV1 = Readonly<{
  blueprintApproval: "PENDING";
  confirmed: Readonly<{
    production: Readonly<{
      standard: "Standarddeutsch";
      baseline: "Germany Standard";
    }>;
    interfaceLocales: readonly ["ru", "uk"];
    regionalVariants: Readonly<{
      austria: "RECEPTIVE_LABELLED";
      switzerland: "RECEPTIVE_LABELLED";
      dialects: "EXCLUDED_FROM_PRODUCTION";
    }>;
    curriculum: Readonly<{
      blueprint: "NATIVE_GERMAN_GRAMMAR_FIRST";
      englishProgression: "NOT_CLONED";
    }>;
    progression: Readonly<{
      entry: "PRE_A1 / zero beginner";
      exit: "functional B1";
      certification: "NOT_PROMISED";
    }>;
    judgeRecenter: Readonly<{
      freshness: "EACH_SESSION";
      phases: readonly ["PRE_AUTHOR", "POST_AUTHOR", "RELEASE_PROJECTION"];
    }>;
  }>;
  pending: readonly [
    Readonly<{
      id: "DE-OWNER-PENDING-001";
      status: "PENDING";
      subject: "DACH receptive inventory";
    }>,
    Readonly<{
      id: "DE-OWNER-PENDING-002";
      status: "PENDING";
      subject: "Goethe B1 cross-check";
    }>,
  ];
}>;

export const GERMAN_OWNER_DECISIONS_CONTRACT_DE_V1 = Object.freeze({
  blueprintApproval: "PENDING",
  confirmed: Object.freeze({
    production: Object.freeze({
      standard: "Standarddeutsch",
      baseline: "Germany Standard",
    }),
    interfaceLocales: Object.freeze(["ru", "uk"] as const),
    regionalVariants: Object.freeze({
      austria: "RECEPTIVE_LABELLED",
      switzerland: "RECEPTIVE_LABELLED",
      dialects: "EXCLUDED_FROM_PRODUCTION",
    }),
    curriculum: Object.freeze({
      blueprint: "NATIVE_GERMAN_GRAMMAR_FIRST",
      englishProgression: "NOT_CLONED",
    }),
    progression: Object.freeze({
      entry: "PRE_A1 / zero beginner",
      exit: "functional B1",
      certification: "NOT_PROMISED",
    }),
    judgeRecenter: Object.freeze({
      freshness: "EACH_SESSION",
      phases: Object.freeze(["PRE_AUTHOR", "POST_AUTHOR", "RELEASE_PROJECTION"] as const),
    }),
  }),
  pending: Object.freeze([
    Object.freeze({
      id: "DE-OWNER-PENDING-001",
      status: "PENDING",
      subject: "DACH receptive inventory",
    }),
    Object.freeze({
      id: "DE-OWNER-PENDING-002",
      status: "PENDING",
      subject: "Goethe B1 cross-check",
    }),
  ]),
} as const satisfies GermanOwnerDecisionsContractDeV1);

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`plain_record_required:${label}`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`plain_record_required:${label}`);
  }
}

function assertClosedKeys(record: Record<string, unknown>, keys: readonly string[]): void {
  for (const key of Object.keys(record)) {
    if (!keys.includes(key)) throw new Error(`unknown_key:${key}`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(record, key)) throw new Error(`missing_key:${key}`);
  }
}

function assertExactArray(value: unknown, length: number, label: string): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length !== length) throw new Error(`array_shape_invalid:${label}`);
  const expectedKeys = new Set(Array.from({ length }, (_, index) => String(index)));
  for (const key of Object.keys(value)) {
    if (!expectedKeys.has(key)) throw new Error(`array_unknown_key:${label}:${key}`);
  }
}

export function validateGermanOwnerDecisionsContractDeV1(
  value: unknown,
): asserts value is GermanOwnerDecisionsContractDeV1 {
  assertRecord(value, "root");
  assertClosedKeys(value, ["blueprintApproval", "confirmed", "pending"]);
  if (value.blueprintApproval !== "PENDING") {
    throw new Error("blueprint_approval_must_remain_pending");
  }

  assertRecord(value.confirmed, "confirmed");
  assertClosedKeys(value.confirmed, [
    "production",
    "interfaceLocales",
    "regionalVariants",
    "curriculum",
    "progression",
    "judgeRecenter",
  ]);

  assertRecord(value.confirmed.production, "production");
  assertClosedKeys(value.confirmed.production, ["standard", "baseline"]);
  if (
    value.confirmed.production.standard !== "Standarddeutsch" ||
    value.confirmed.production.baseline !== "Germany Standard"
  ) throw new Error("confirmed_production_invalid");

  if (
    !Array.isArray(value.confirmed.interfaceLocales) ||
    value.confirmed.interfaceLocales.length !== 2 ||
    value.confirmed.interfaceLocales[0] !== "ru" ||
    value.confirmed.interfaceLocales[1] !== "uk"
  ) throw new Error("confirmed_interface_locales_invalid");
  assertExactArray(value.confirmed.interfaceLocales, 2, "interfaceLocales");

  assertRecord(value.confirmed.regionalVariants, "regionalVariants");
  assertClosedKeys(value.confirmed.regionalVariants, ["austria", "switzerland", "dialects"]);
  if (
    value.confirmed.regionalVariants.austria !== "RECEPTIVE_LABELLED" ||
    value.confirmed.regionalVariants.switzerland !== "RECEPTIVE_LABELLED" ||
    value.confirmed.regionalVariants.dialects !== "EXCLUDED_FROM_PRODUCTION"
  ) throw new Error("confirmed_regional_variants_invalid");

  assertRecord(value.confirmed.curriculum, "curriculum");
  assertClosedKeys(value.confirmed.curriculum, ["blueprint", "englishProgression"]);
  if (
    value.confirmed.curriculum.blueprint !== "NATIVE_GERMAN_GRAMMAR_FIRST" ||
    value.confirmed.curriculum.englishProgression !== "NOT_CLONED"
  ) throw new Error("confirmed_curriculum_invalid");

  assertRecord(value.confirmed.progression, "progression");
  assertClosedKeys(value.confirmed.progression, ["entry", "exit", "certification"]);
  if (
    value.confirmed.progression.entry !== "PRE_A1 / zero beginner" ||
    value.confirmed.progression.exit !== "functional B1" ||
    value.confirmed.progression.certification !== "NOT_PROMISED"
  ) throw new Error("confirmed_progression_invalid");

  assertRecord(value.confirmed.judgeRecenter, "judgeRecenter");
  assertClosedKeys(value.confirmed.judgeRecenter, ["freshness", "phases"]);
  if (
    value.confirmed.judgeRecenter.freshness !== "EACH_SESSION" ||
    !Array.isArray(value.confirmed.judgeRecenter.phases) ||
    value.confirmed.judgeRecenter.phases.length !== 3 ||
    value.confirmed.judgeRecenter.phases[0] !== "PRE_AUTHOR" ||
    value.confirmed.judgeRecenter.phases[1] !== "POST_AUTHOR" ||
    value.confirmed.judgeRecenter.phases[2] !== "RELEASE_PROJECTION"
  ) throw new Error("confirmed_judge_recenter_invalid");
  assertExactArray(value.confirmed.judgeRecenter.phases, 3, "judgeRecenter.phases");

  assertExactArray(value.pending, 2, "pending");
  const expected = [
    ["DE-OWNER-PENDING-001", "DACH receptive inventory"],
    ["DE-OWNER-PENDING-002", "Goethe B1 cross-check"],
  ] as const;
  for (const [index, [id, subject]] of expected.entries()) {
    const decision = value.pending[index];
    assertRecord(decision, `pending:${index}`);
    assertClosedKeys(decision, ["id", "status", "subject"]);
    if (decision.id !== id) throw new Error(`pending_id_invalid:${index}`);
    if (decision.status !== "PENDING") throw new Error(`pending_status_invalid:${id}`);
    if (decision.subject !== subject) throw new Error(`pending_subject_invalid:${id}`);
  }
}

validateGermanOwnerDecisionsContractDeV1(GERMAN_OWNER_DECISIONS_CONTRACT_DE_V1);
