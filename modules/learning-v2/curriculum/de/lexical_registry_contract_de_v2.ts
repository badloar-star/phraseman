import { canonicalJsonV1 } from "../../policies/decision_registry";
import {
  type GermanLexicalItemEvidenceDeV2,
  parseGermanLexicalItemEvidenceRegistryDeV2,
} from "./lexical_item_evidence_de_v2";

type JsonRecord = Record<string, unknown>;

export type GermanLexicalRegistryMigrationPlanDeV2 = Readonly<{
  schemaVersion: "learning-v2-german-lexical-registry-migration-plan.v2";
  targetLanguage: "de";
  task5: Readonly<{
    schemaVersion: "learning-v2-german-chapter-blueprints.v2";
    path: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json";
    canonicalBodySha256: string;
  }>;
  candidateManifestSha256: string;
  captureManifestSha256: string;
  legacyV1CanonicalSenseIds: readonly [
    "de_lex_l01_c01_nachbarin_v1",
    "de_lex_l01_c02_aufzug_v1",
  ];
  legacyV1Policy: "PRESERVE_UNCHANGED_DO_NOT_IMPORT_AS_V2_EVIDENCE";
  candidateRows: readonly Readonly<{
    sourcePlanId: string;
    candidateCanonicalSenseId: string;
    evidenceId: string;
    admissionRole: "CANDIDATE_ONLY_NOT_CANONICAL";
  }>[];
  phraseClaims: readonly [];
  authority: Readonly<{
    status: "HOLD_MIGRATION_PHASE_A";
    canonicalAdmission: "FORBIDDEN";
    rowsPromoted: 0;
    task7Unlock: false;
    learnerFacing: false;
    releaseAuthorized: false;
  }>;
}>;

const TASK5_CANONICAL_SHA =
  "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3";
const CANDIDATE_MANIFEST_SHA =
  "d3430ade94b3901bca987f91d9a8ead5ec2efee530470835585e4447d6c3746c";
const CAPTURE_MANIFEST_SHA =
  "e79b6c6016638ecc943ef633b814761ed5c95595a4e61171fb057da84273a535";

const EXPECTED_PLAN = {
  schemaVersion: "learning-v2-german-lexical-registry-migration-plan.v2",
  targetLanguage: "de",
  task5: {
    schemaVersion: "learning-v2-german-chapter-blueprints.v2",
    path: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
    canonicalBodySha256: TASK5_CANONICAL_SHA,
  },
  candidateManifestSha256: CANDIDATE_MANIFEST_SHA,
  captureManifestSha256: CAPTURE_MANIFEST_SHA,
  legacyV1CanonicalSenseIds: [
    "de_lex_l01_c01_nachbarin_v1",
    "de_lex_l01_c02_aufzug_v1",
  ],
  legacyV1Policy: "PRESERVE_UNCHANGED_DO_NOT_IMPORT_AS_V2_EVIDENCE",
  candidateRows: [
    {
      sourcePlanId: "de_lex_plan_l02_c01_wohnen_v1",
      candidateCanonicalSenseId: "de_lex_l02_c01_wohnen_v1",
      evidenceId: "DE-LEX-ITEM-L02-C01-WOHNEN-SENSE-FORM-001",
      admissionRole: "CANDIDATE_ONLY_NOT_CANONICAL",
    },
    {
      sourcePlanId: "de_lex_plan_l02_c01_kueche_v1",
      candidateCanonicalSenseId: "de_lex_l02_c01_kueche_v1",
      evidenceId: "DE-LEX-ITEM-L02-C01-KUECHE-SENSE-FORM-001",
      admissionRole: "CANDIDATE_ONLY_NOT_CANONICAL",
    },
    {
      sourcePlanId: "de_lex_plan_l02_c02_tasse_v1",
      candidateCanonicalSenseId: "de_lex_l02_c02_tasse_v1",
      evidenceId: "DE-LEX-ITEM-L02-C02-TASSE-SENSE-FORM-001",
      admissionRole: "CANDIDATE_ONLY_NOT_CANONICAL",
    },
    {
      sourcePlanId: "de_lex_plan_l02_c02_teller_v1",
      candidateCanonicalSenseId: "de_lex_l02_c02_teller_v1",
      evidenceId: "DE-LEX-ITEM-L02-C02-TELLER-SENSE-FORM-001",
      admissionRole: "CANDIDATE_ONLY_NOT_CANONICAL",
    },
  ],
  phraseClaims: [],
  authority: {
    status: "HOLD_MIGRATION_PHASE_A",
    canonicalAdmission: "FORBIDDEN",
    rowsPromoted: 0,
    task7Unlock: false,
    learnerFacing: false,
    releaseAuthorized: false,
  },
} as const satisfies GermanLexicalRegistryMigrationPlanDeV2;

function fail(code: string): never {
  throw new Error(code);
}

function normalize<T>(input: unknown): T {
  return JSON.parse(canonicalJsonV1(input)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as JsonRecord)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

export function parseGermanLexicalRegistryMigrationPlanDeV2(
  input: unknown,
  evidenceInput: unknown,
): GermanLexicalRegistryMigrationPlanDeV2 {
  const normalized = normalize<JsonRecord>(input);
  if (
    normalized.schemaVersion !==
    "learning-v2-german-lexical-registry-migration-plan.v2"
  ) {
    fail("task6_v2_schema_mix_forbidden");
  }
  const task5 = normalized.task5 as JsonRecord;
  if (
    task5?.schemaVersion !== "learning-v2-german-chapter-blueprints.v2" ||
    task5?.path !==
      "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json" ||
    task5?.canonicalBodySha256 !== TASK5_CANONICAL_SHA
  ) {
    fail("task6_v2_task5_v1_mix_forbidden");
  }
  const authority = normalized.authority as JsonRecord;
  if (
    authority?.status !== "HOLD_MIGRATION_PHASE_A" ||
    authority?.canonicalAdmission !== "FORBIDDEN" ||
    authority?.rowsPromoted !== 0 ||
    authority?.task7Unlock !== false ||
    authority?.learnerFacing !== false ||
    authority?.releaseAuthorized !== false
  ) {
    fail("lexical_registry_v2_authority");
  }
  if (
    !Array.isArray(normalized.phraseClaims) ||
    normalized.phraseClaims.length
  ) {
    fail("lexical_registry_v2_phrase_claim_forbidden");
  }
  if (normalized.candidateManifestSha256 !== CANDIDATE_MANIFEST_SHA) {
    fail("task6_v2_candidate_binding");
  }
  if (normalized.captureManifestSha256 !== CAPTURE_MANIFEST_SHA) {
    fail("task6_v2_capture_binding");
  }
  if (canonicalJsonV1(normalized) !== canonicalJsonV1(EXPECTED_PLAN)) {
    fail("lexical_registry_v2_identity");
  }
  const evidence = parseGermanLexicalItemEvidenceRegistryDeV2(evidenceInput);
  const evidenceById = new Map<string, GermanLexicalItemEvidenceDeV2>(
    evidence.map((row) => [row.id, row]),
  );
  for (const candidate of EXPECTED_PLAN.candidateRows) {
    const row = evidenceById.get(candidate.evidenceId);
    if (
      row?.sourcePlanId !== candidate.sourcePlanId ||
      row?.candidateCanonicalSenseId !== candidate.candidateCanonicalSenseId
    ) {
      fail("lexical_registry_v2_evidence_scope");
    }
  }
  return deepFreeze(normalized) as GermanLexicalRegistryMigrationPlanDeV2;
}

export const GERMAN_TASK6_V2_MIGRATION_PLAN_DE_V1 = deepFreeze(
  normalize<GermanLexicalRegistryMigrationPlanDeV2>(EXPECTED_PLAN),
);
