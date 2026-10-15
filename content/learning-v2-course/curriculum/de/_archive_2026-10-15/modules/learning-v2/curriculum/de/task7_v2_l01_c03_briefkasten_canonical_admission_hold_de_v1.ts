import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type RecordValue = Record<string, unknown>;

export type GermanTask7V2L01C03BriefkastenCanonicalAdmissionHoldDeV1 =
  Readonly<{
    status: "HOLD";
    sourcePlanId: "de_lex_plan_l01_c03_briefkasten_v1";
    canonicalAdmission: false;
    inventoryResolutionApplied: false;
    task7Unlock: false;
    preauthoringAuthority: false;
    learnerFacing: false;
    releaseAuthorized: false;
    consumerCutover: "NONE";
    nextUnresolvedSourcePlanId: "de_lex_plan_l01_c03_briefkasten_v1";
  }>;

export type GermanTask7V2L01C03BriefkastenCanonicalAdmissionHoldOptionsDeV1 =
  Readonly<{
    evidenceRootForTest?: string;
    sourceEvidenceRootForTest?: string;
  }>;

const ROOT = path.resolve(__dirname, "../../../..");
const EVIDENCE_ROOT = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_briefkasten_canonical_admission_hold_v1",
);
const SOURCE_EVIDENCE_ROOT = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_briefkasten_source_hold_v1",
);
const SOURCE_PLAN_ID = "de_lex_plan_l01_c03_briefkasten_v1";
const RAW_SHA256 =
  "d6e63ca2942fb05841e2a89cd30a3c335228dc4d6ba296e4d010e9515bd18342";
const EXTRACTION_MAP_SHA256 =
  "f97ccbd4f4e95f0361f7fb607cae2f60c2cb4bdac18b89ec9fe34d3568e3cc89";

function fail(code: string): never {
  throw new Error(code);
}
function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function record(value: unknown, code: string): asserts value is RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail(code);
}
function exactKeys(value: RecordValue, expected: string[], code: string): void {
  if (Object.keys(value).sort().join("\0") !== [...expected].sort().join("\0"))
    fail(code);
}
function readJson(file: string, code: string): RecordValue {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    record(parsed, code);
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message === code) throw error;
    return fail(code);
  }
}
function forbidCallerOutputAuthority(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(forbidCallerOutputAuthority);
    return;
  }
  if (
    Object.hasOwn(value, "callerOutputPath") ||
    Object.hasOwn(value, "packetOutputPath") ||
    Object.hasOwn(value, "releasePath")
  )
    fail("briefkasten_admission_caller_output_forbidden");
  Object.values(value).forEach(forbidCallerOutputAuthority);
}

function validateSourceEvidence(root: string): void {
  const raw = fs.readFileSync(path.join(root, "raw/dwds_briefkasten.html"));
  if (sha256(raw) !== RAW_SHA256) fail("briefkasten_admission_source_drift");
  const extractionMapBytes = fs.readFileSync(
    path.join(root, "extraction_map.json"),
  );
  if (sha256(extractionMapBytes) !== EXTRACTION_MAP_SHA256)
    fail("briefkasten_admission_source_drift");
  const extractionMap = readJson(
    path.join(root, "extraction_map.json"),
    "briefkasten_admission_source_drift",
  );
  record(extractionMap.extractions, "briefkasten_admission_source_drift");
  record(extractionMap.unsupportedClaims, "briefkasten_admission_source_drift");
  if (
    extractionMap.extractions.sourceHeadword !== "Briefkasten" ||
    extractionMap.extractions.sourcePartOfSpeech !==
      "Substantiv (Maskulinum)" ||
    extractionMap.extractions.article !== "der" ||
    extractionMap.extractions.singular !== "Briefkasten" ||
    extractionMap.extractions.nominativePlural !== "Briefkästen" ||
    extractionMap.extractions.senseAnchor !== "d-1-2" ||
    extractionMap.unsupportedClaims.broaderMorphology !==
      "NOT_CLAIMED_BEYOND_CAPTURED_ARTICLE_SINGULAR_NOMINATIVE_PLURAL" ||
    extractionMap.unsupportedClaims.register !== "NOT_CLAIMED_BY_THIS_PACKET"
  )
    fail("briefkasten_admission_source_drift");
}

function validateManifest(root: string): void {
  const manifest = readJson(
    path.join(root, "manifest.json"),
    "briefkasten_admission_manifest",
  );
  forbidCallerOutputAuthority(manifest);
  exactKeys(
    manifest,
    [
      "schemaVersion",
      "status",
      "sourcePlanId",
      "sourceEvidence",
      "fieldAuthority",
      "authority",
      "nextUnresolvedSourcePlanId",
    ],
    "briefkasten_admission_manifest",
  );
  if (
    manifest.schemaVersion !==
      "learning-v2-de-task7-v2-l01-c03-briefkasten-canonical-admission-hold.v1" ||
    manifest.status !== "HOLD"
  )
    fail("briefkasten_admission_manifest");
  if (manifest.sourcePlanId !== SOURCE_PLAN_ID)
    fail("briefkasten_admission_old_id");
  if (manifest.nextUnresolvedSourcePlanId !== SOURCE_PLAN_ID)
    fail("briefkasten_admission_old_id");
  record(manifest.sourceEvidence, "briefkasten_admission_manifest");
  if (
    manifest.sourceEvidence.rawSha256 !== RAW_SHA256 ||
    manifest.sourceEvidence.extractionMapSha256 !== EXTRACTION_MAP_SHA256
  )
    fail("briefkasten_admission_source_drift");
  record(manifest.fieldAuthority, "briefkasten_admission_manifest");
  exactKeys(
    manifest.fieldAuthority,
    [
      "lemma",
      "partOfSpeech",
      "article",
      "singular",
      "nominativePlural",
      "senseAnchor",
      "broaderMorphology",
      "register",
    ],
    "briefkasten_admission_manifest",
  );
  const fields: [string, string][] = [
    ["lemma", "Briefkasten"],
    ["partOfSpeech", "Substantiv (Maskulinum)"],
    ["article", "der"],
    ["singular", "Briefkasten"],
    ["nominativePlural", "Briefkästen"],
    ["senseAnchor", "d-1-2"],
  ];
  for (const [name, value] of fields) {
    const field = manifest.fieldAuthority[name];
    record(field, "briefkasten_admission_manifest");
    if (field.status !== "SOURCE_SUPPORTED" || field.value !== value)
      fail(
        name === "lemma"
          ? "briefkasten_admission_wrong_lemma"
          : "briefkasten_admission_manifest",
      );
  }
  if (
    manifest.fieldAuthority.broaderMorphology !== "NOT_CLAIMED" ||
    manifest.fieldAuthority.register !== "NOT_CLAIMED"
  ) {
    fail(
      manifest.fieldAuthority.register !== "NOT_CLAIMED"
        ? "briefkasten_admission_unsupported_register"
        : "briefkasten_admission_unsupported_morphology",
    );
  }
  record(manifest.authority, "briefkasten_admission_manifest");
  exactKeys(
    manifest.authority,
    [
      "canonicalAdmission",
      "inventoryResolutionApplied",
      "task7Unlock",
      "preauthoringAuthority",
      "learnerFacing",
      "releaseAuthorized",
      "consumerCutover",
    ],
    "briefkasten_admission_manifest",
  );
  if (
    manifest.authority.canonicalAdmission !== false ||
    manifest.authority.inventoryResolutionApplied !== false ||
    manifest.authority.task7Unlock !== false ||
    manifest.authority.preauthoringAuthority !== false ||
    manifest.authority.learnerFacing !== false ||
    manifest.authority.releaseAuthorized !== false ||
    manifest.authority.consumerCutover !== "NONE"
  )
    fail("briefkasten_admission_caller_output_forbidden");
}

export function inspectGermanTask7V2L01C03BriefkastenCanonicalAdmissionHoldDeV1(
  options: GermanTask7V2L01C03BriefkastenCanonicalAdmissionHoldOptionsDeV1 = {},
): GermanTask7V2L01C03BriefkastenCanonicalAdmissionHoldDeV1 {
  validateSourceEvidence(
    path.resolve(options.sourceEvidenceRootForTest ?? SOURCE_EVIDENCE_ROOT),
  );
  validateManifest(path.resolve(options.evidenceRootForTest ?? EVIDENCE_ROOT));
  return Object.freeze({
    status: "HOLD",
    sourcePlanId: SOURCE_PLAN_ID,
    canonicalAdmission: false,
    inventoryResolutionApplied: false,
    task7Unlock: false,
    preauthoringAuthority: false,
    learnerFacing: false,
    releaseAuthorized: false,
    consumerCutover: "NONE",
    nextUnresolvedSourcePlanId: SOURCE_PLAN_ID,
  });
}
