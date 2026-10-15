import {
  GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3,
  canonicalizeGermanTask6cL02CaptureJsonLineDeV3,
  getGermanTask6cL02CaptureProducerContractDeV3,
  sha256GermanTask6cL02CaptureBytesDeV3,
} from "./task6c_l02_capture_producer_contract_de_v3";
import { buildGermanTask6cL02CaptureArchiveDeV3 } from "./task6c_l02_capture_archive_de_v3";
import { validateGermanTask6cL02CaptureEvidenceFilesDeV3 } from "./task6c_l02_capture_producer_de_v3";

type JsonRecord = Record<string, unknown>;

const PREDICATE_TYPE =
  "https://phraseman.app/attestations/learning-v2-de-task6c-l02-capture/v3" as const;
const ARCHIVE_MEDIA_TYPE = "application/x-tar" as const;

export type GermanTask6cL02CaptureDescriptorDeV3 = Readonly<{
  path: string;
  sha256: string;
  bytes: number;
}>;

export type GermanTask6cL02CaptureArchiveSubjectDeV3 = Readonly<{
  name: string;
  mediaType: typeof ARCHIVE_MEDIA_TYPE;
  sha256: string;
  bytes: number;
}>;

export type GermanTask6cL02CapturePredicateInputDeV3 = Readonly<{
  sourceSha: string;
  files: ReadonlyMap<string, Buffer>;
  archive: Buffer;
}>;

type GermanTask6cL02CaptureNormalizedPredicateInputDeV3 = Readonly<{
  sourceSha: string;
  manifest: GermanTask6cL02CaptureDescriptorDeV3;
  evidence: readonly GermanTask6cL02CaptureDescriptorDeV3[];
  archive: GermanTask6cL02CaptureArchiveSubjectDeV3;
}>;

export type GermanTask6cL02CapturePredicateDeV3 = Readonly<{
  schemaVersion: "learning-v2-de-task6c-l02-capture-predicate.v3";
  predicateType: typeof PREDICATE_TYPE;
  status: "HOLD_CAPTURE_ONLY";
  targetLanguage: "de";
  captureContract: Readonly<{
    schemaVersion: "learning-v2-de-task6c-l02-capture-producer-contract.v3";
    inputDigestSha256: string;
    implementationFiles: ReturnType<
      typeof getGermanTask6cL02CaptureProducerContractDeV3
    >["implementationFiles"];
  }>;
  predecessor: ReturnType<
    typeof getGermanTask6cL02CaptureProducerContractDeV3
  >["predecessor"];
  task5: ReturnType<
    typeof getGermanTask6cL02CaptureProducerContractDeV3
  >["task5"];
  workflow: Readonly<
    ReturnType<
      typeof getGermanTask6cL02CaptureProducerContractDeV3
    >["workflow"] & {
      repository: "badloar-star/phraseman";
      ref: "refs/heads/master";
      sourceSha: string;
    }
  >;
  networkPolicy: ReturnType<
    typeof getGermanTask6cL02CaptureProducerContractDeV3
  >["networkPolicy"];
  manifest: GermanTask6cL02CaptureDescriptorDeV3;
  evidence: readonly GermanTask6cL02CaptureDescriptorDeV3[];
  subject: GermanTask6cL02CaptureArchiveSubjectDeV3;
  authority: Readonly<{
    canonicalAdmission: "FORBIDDEN";
    learnerFacing: false;
    releaseAuthorized: false;
    rowsPromoted: 0;
    task7Unlock: false;
    translationsPresent: false;
  }>;
}>;

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function evidencePaths(): readonly string[] {
  return GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceFileAllowlist.filter(
    (filePath) => filePath !== "manifest.json",
  );
}

function descriptor(
  path: string,
  bytes: Buffer,
): GermanTask6cL02CaptureDescriptorDeV3 {
  return Object.freeze({
    path,
    sha256: sha256GermanTask6cL02CaptureBytesDeV3(bytes),
    bytes: bytes.length,
  });
}

function normalizeInput(
  input: GermanTask6cL02CapturePredicateInputDeV3,
): GermanTask6cL02CaptureNormalizedPredicateInputDeV3 {
  if (!isRecord(input) || !/^[0-9a-f]{40}$/u.test(input.sourceSha)) {
    fail("CAPTURE_PREDICATE_SOURCE_SHA_INVALID");
  }
  if (!(input.files instanceof Map)) {
    fail("CAPTURE_PREDICATE_EVIDENCE_INVALID");
  }
  const files = new Map<string, Buffer>();
  for (const [path, bytes] of input.files) {
    if (typeof path !== "string" || !Buffer.isBuffer(bytes)) {
      fail("CAPTURE_PREDICATE_EVIDENCE_INVALID");
    }
    files.set(path, Buffer.from(bytes));
  }
  validateGermanTask6cL02CaptureEvidenceFilesDeV3(files);
  if (!Buffer.isBuffer(input.archive)) {
    fail("CAPTURE_PREDICATE_SUBJECT_INVALID");
  }
  const deterministicArchive = buildGermanTask6cL02CaptureArchiveDeV3(files);
  if (!deterministicArchive.equals(input.archive)) {
    fail("CAPTURE_PREDICATE_SUBJECT_NOT_DETERMINISTIC");
  }
  const manifestBytes = files.get("manifest.json");
  if (!manifestBytes) {
    fail("CAPTURE_PREDICATE_MANIFEST_INVALID");
  }
  const evidence = evidencePaths().map((path) => {
    const bytes = files.get(path);
    if (!bytes) fail("CAPTURE_PREDICATE_EVIDENCE_INVALID");
    return descriptor(path, bytes);
  });
  if (evidence.length !== evidencePaths().length) {
    fail("CAPTURE_PREDICATE_EVIDENCE_INVALID");
  }
  return Object.freeze({
    sourceSha: input.sourceSha,
    manifest: descriptor("manifest.json", manifestBytes),
    evidence: Object.freeze(evidence),
    archive: Object.freeze({
      name: GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.archiveName,
      mediaType: ARCHIVE_MEDIA_TYPE,
      sha256: sha256GermanTask6cL02CaptureBytesDeV3(deterministicArchive),
      bytes: deterministicArchive.length,
    }),
  });
}

function predicateObject(
  input: GermanTask6cL02CapturePredicateInputDeV3,
): GermanTask6cL02CapturePredicateDeV3 {
  const normalized = normalizeInput(input);
  const contract = getGermanTask6cL02CaptureProducerContractDeV3();
  return Object.freeze({
    schemaVersion: "learning-v2-de-task6c-l02-capture-predicate.v3" as const,
    predicateType: PREDICATE_TYPE,
    status: "HOLD_CAPTURE_ONLY" as const,
    targetLanguage: "de" as const,
    captureContract: Object.freeze({
      schemaVersion: contract.schemaVersion,
      inputDigestSha256: contract.inputDigestSha256,
      implementationFiles: contract.implementationFiles,
    }),
    predecessor: contract.predecessor,
    task5: contract.task5,
    workflow: Object.freeze({
      ...contract.workflow,
      repository: "badloar-star/phraseman" as const,
      ref: "refs/heads/master" as const,
      sourceSha: normalized.sourceSha,
    }),
    networkPolicy: contract.networkPolicy,
    manifest: normalized.manifest,
    evidence: normalized.evidence,
    subject: normalized.archive,
    authority: Object.freeze({
      canonicalAdmission: "FORBIDDEN" as const,
      learnerFacing: false as const,
      releaseAuthorized: false as const,
      rowsPromoted: 0 as const,
      task7Unlock: false as const,
      translationsPresent: false as const,
    }),
  });
}

export function buildGermanTask6cL02CapturePredicateDeV3(
  input: GermanTask6cL02CapturePredicateInputDeV3,
): Buffer {
  return canonicalizeGermanTask6cL02CaptureJsonLineDeV3(predicateObject(input));
}

export function validateGermanTask6cL02CapturePredicateDeV3(
  bytes: Buffer,
  files: ReadonlyMap<string, Buffer>,
  archive: Buffer,
): GermanTask6cL02CapturePredicateDeV3 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    fail("CAPTURE_PREDICATE_INVALID");
  }
  if (!isRecord(parsed)) fail("CAPTURE_PREDICATE_INVALID");
  if (!canonicalizeGermanTask6cL02CaptureJsonLineDeV3(parsed).equals(bytes)) {
    fail("CAPTURE_PREDICATE_NOT_CANONICAL");
  }
  const keys = [
    "schemaVersion",
    "predicateType",
    "status",
    "targetLanguage",
    "captureContract",
    "predecessor",
    "task5",
    "workflow",
    "networkPolicy",
    "manifest",
    "evidence",
    "subject",
    "authority",
  ];
  if (Object.keys(parsed).sort().join("\0") !== keys.sort().join("\0")) {
    fail("CAPTURE_PREDICATE_SCHEMA_INVALID");
  }
  if (
    parsed.schemaVersion !== "learning-v2-de-task6c-l02-capture-predicate.v3" ||
    parsed.predicateType !== PREDICATE_TYPE ||
    parsed.status !== "HOLD_CAPTURE_ONLY" ||
    parsed.targetLanguage !== "de" ||
    !isRecord(parsed.workflow) ||
    typeof parsed.workflow.sourceSha !== "string" ||
    !Array.isArray(parsed.evidence) ||
    !isRecord(parsed.subject)
  ) {
    fail("CAPTURE_PREDICATE_SCHEMA_INVALID");
  }
  if (
    !isRecord(parsed.authority) ||
    parsed.authority.canonicalAdmission !== "FORBIDDEN" ||
    parsed.authority.learnerFacing !== false ||
    parsed.authority.releaseAuthorized !== false ||
    parsed.authority.rowsPromoted !== 0 ||
    parsed.authority.task7Unlock !== false ||
    parsed.authority.translationsPresent !== false
  ) {
    fail("CAPTURE_PREDICATE_AUTHORITY_ESCALATION");
  }
  const rebuilt = buildGermanTask6cL02CapturePredicateDeV3({
    sourceSha: parsed.workflow.sourceSha,
    files,
    archive,
  });
  if (!rebuilt.equals(bytes)) fail("CAPTURE_PREDICATE_BINDING_INVALID");
  return parsed as unknown as GermanTask6cL02CapturePredicateDeV3;
}
