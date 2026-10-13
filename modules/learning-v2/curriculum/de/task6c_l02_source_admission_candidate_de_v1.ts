import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { hashCanonicalBody } from "../../policies/decision_registry";
import {
  GERMAN_TASK6C_L02_IDENTITY_CAPTURE_PATHS_DE_V4,
  validateGermanTask6cL02IdentityCaptureEvidenceFilesDeV4,
} from "./task6c_l02_identity_capture_transport_de_v4";

type JsonRecord = Record<string, unknown>;

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const CANDIDATE_PATH =
  "modules/learning-v2/curriculum/de/evidence/task6c_l02_source_admission_candidate_v1/manifest.json";
const CAPTURE_ROOT =
  "modules/learning-v2/curriculum/de/evidence/learning-v2-de-task6c-l02-identity-capture-v4-live-20261012T085552906Z";
const TASK5_PATH =
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json";
const TASK5_BYTE_SHA256 =
  "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23";
const TASK5_CANONICAL_BODY_SHA256 =
  "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3";
const CAPTURE_MANIFEST_SHA256 =
  "e79b6c6016638ecc943ef633b814761ed5c95595a4e61171fb057da84273a535";
const CAPTURE_INPUT_DIGEST_SHA256 =
  "46b37ef51279390e64dfe29f10ce256a0525684718df1a04d93ac4af43a768b2";

const ANCHOR_BINDINGS = Object.freeze({
  lexicalEvidence: Object.freeze({
    path: "modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts",
    byteSha256:
      "10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c",
  }),
  lexicalRegistry: Object.freeze({
    path: "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json",
    byteSha256:
      "3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29",
  }),
  task6Kernel: Object.freeze({
    path: "modules/learning-v2/curriculum/de/task6_registry_contract_de_v1.ts",
    byteSha256:
      "4e0a1dc41a62ae81eb516333f19339658590c5cbef39edaf20a1d6219ecfca4d",
  }),
  canonicalBundle: Object.freeze({
    path: "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json",
    byteSha256:
      "95181fb58d7563fc1ae37f220ad13b2543ccde898dfe1e93922cecc4a082fd31",
  }),
});

const EXPECTED_ROWS = Object.freeze([
  Object.freeze({
    sourcePlanId: "de_lex_plan_l02_c01_wohnen_v1",
    candidateCanonicalSenseId: "de_lex_l02_c01_wohnen_v1",
    semanticAlignment:
      "SOURCE_D1_1_SUPPORTS_RESIDENCE_CORE_TASK5_CONTEXT_NARROWED",
    lemma: "wohnen",
    semanticIdentity: "wohnen|live or reside at a home",
    senseGloss: "live or reside at a home",
    communicativeUse:
      "notice the person-number choice in a bounded residence action",
    partOfSpeech: "verb",
    noun: null,
    verb: Object.freeze({
      infinitive: "wohnen",
      valencyFrame: "intransitive residence frame",
      separability: "inseparable",
      perfectAuxiliary: "haben",
      sourceAttestation: Object.freeze({
        partOfSpeechLabel: "Verb",
        attestedPresent3sg: "wohnt",
        attestedPreterite3sg: "wohnte",
        attestedPerfect3sg: "hat gewohnt",
        kernelValencyAdjudication: "REQUIRED_IN_SEPARATE_V2_MIGRATION",
      }),
    }),
    sourceUrl: "https://www.dwds.de/wb/wohnen",
    bodyPath: "decoded-representation/wohnen.html",
    bodyBytes: 105840,
    bodySha256:
      "1b2f4f0d0758994c9318e2dfd43feae66a3eaff35747ea439ccc7ad6440c85ce",
    headerPath: "headers/wohnen.normalized.json",
    headerBytes: 930,
    headerSha256:
      "f6da2cb323390bb29f294757bad80c4e71a2a4e76605ca7af82673d6d84861b3",
    senseBytes: 9050,
    senseSha256:
      "cfe8f854857d65223619ea5c223c076592ff6424dbeb7a93f0b3526d0bebafb0",
    morphologyBytes: 792,
    morphologySha256:
      "71208e25cfa546245f0970b02ad201564630f5fff576acfc38d851daa520be72",
    definitionGerman:
      "seinen ständigen Aufenthalt an einem bestimmten Ort, seine Wohnung in einem bestimmten Haus haben",
  }),
  Object.freeze({
    sourcePlanId: "de_lex_plan_l02_c01_kueche_v1",
    candidateCanonicalSenseId: "de_lex_l02_c01_kueche_v1",
    semanticAlignment:
      "SOURCE_D1_1_SUPPORTS_ROOM_CORE_TASK5_SHARED_CONTEXT_NARROWED",
    lemma: "Küche",
    semanticIdentity: "kuche|room for preparing food",
    senseGloss: "room for preparing food",
    communicativeUse:
      "identify the shared room without a gender prediction rule",
    partOfSpeech: "noun",
    noun: Object.freeze({
      article: "die",
      singular: "Küche",
      plural: "Küchen",
      sourceGenderLabel: "Femininum",
    }),
    verb: null,
    sourceUrl: "https://www.dwds.de/wb/K%C3%BCche",
    bodyPath: "decoded-representation/kueche.html",
    bodyBytes: 103719,
    bodySha256:
      "6b416970816020195cb24b458209c78327f404e8d0e71b5c9f6b43692509af3e",
    headerPath: "headers/kueche.normalized.json",
    headerBytes: 928,
    headerSha256:
      "57ab4f72c9f4d6183f63926d4ef47bc174b2594058cb65df654110653e10d545",
    senseBytes: 4397,
    senseSha256:
      "1394d2752dd905044eeb49b03b75062e2bd42e7c9beca7f3ddf106ab6c29f97b",
    morphologyBytes: 358,
    morphologySha256:
      "da8cfb368db1428770a22217e70127760325dd3c278f98a1b901b52d954879ed",
    definitionGerman: "Raum, in dem die Speisen zubereitet und gekocht werden",
  }),
  Object.freeze({
    sourcePlanId: "de_lex_plan_l02_c02_tasse_v1",
    candidateCanonicalSenseId: "de_lex_l02_c02_tasse_v1",
    semanticAlignment: "SOURCE_D1_1_SUPPORTS_HANDLED_HOT_DRINK_VESSEL_CORE",
    lemma: "Tasse",
    semanticIdentity: "tasse|handled cup for a hot drink",
    senseGloss: "handled cup for a hot drink",
    communicativeUse:
      "retrieve a complete noun package for an everyday shared object",
    partOfSpeech: "noun",
    noun: Object.freeze({
      article: "die",
      singular: "Tasse",
      plural: "Tassen",
      sourceGenderLabel: "Femininum",
    }),
    verb: null,
    sourceUrl: "https://www.dwds.de/wb/Tasse",
    bodyPath: "decoded-representation/tasse.html",
    bodyBytes: 87110,
    bodySha256:
      "b2c6778db4fdc35540b354128ec30370027e41ec035769cc013140a852d269bb",
    headerPath: "headers/tasse.normalized.json",
    headerBytes: 926,
    headerSha256:
      "8d7df3bd958f07a8ef774cea7d0d44bad03076a723f43fb9241202f4749d850d",
    senseBytes: 7879,
    senseSha256:
      "15c9ae0e32b41c0594e402146f55d59977b01110ffbce5fe49389efa85ef1849",
    morphologyBytes: 350,
    morphologySha256:
      "8ae608d82a86b4a06da26eb41d19fc0f72dcb0f76ef367d699ed097b355037bc",
    definitionGerman: "Trinkgefäß (mit Henkel), besonders für heiße Getränke",
  }),
  Object.freeze({
    sourcePlanId: "de_lex_plan_l02_c02_teller_v1",
    candidateCanonicalSenseId: "de_lex_l02_c02_teller_v1",
    semanticAlignment:
      "SOURCE_D1_1_SUPPORTS_PLATE_OBJECT_CORE_TASK5_USE_CONTEXT_NARROWED",
    lemma: "Teller",
    semanticIdentity: "teller|flat dish used for serving food",
    senseGloss: "flat dish used for serving food",
    communicativeUse:
      "contrast a complete masculine singular-plural package with a visible object",
    partOfSpeech: "noun",
    noun: Object.freeze({
      article: "der",
      singular: "Teller",
      plural: "Teller",
      sourceGenderLabel: "Maskulinum",
    }),
    verb: null,
    sourceUrl: "https://www.dwds.de/wb/Teller",
    bodyPath: "decoded-representation/teller.html",
    bodyBytes: 74185,
    bodySha256:
      "7be76f44dd449c750844755fbb553bdc5e66f9edcc3a197fdb9afcb0a5d01b9b",
    headerPath: "headers/teller.normalized.json",
    headerBytes: 926,
    headerSha256:
      "d7dc3d71737f746f3ea73f1c55e67f89b0310f056c4715d923f587f3e254cddd",
    senseBytes: 4390,
    senseSha256:
      "b7792d5c8dde13ea5d7796c223da7619e219d4f53b12bc0231fe357dbca443e6",
    morphologyBytes: 355,
    morphologySha256:
      "9d4c48146b1462b661d790dcb0b8fc042fb6b51ab498155eeed0073714007a0b",
    definitionGerman:
      "rundes Essgeschirr mit erhöhtem Rand, meist aus Porzellan oder Steingut",
  }),
]);

const LIMITATIONS = Object.freeze([
  "NO_CANONICAL_ROW_REGISTRATION",
  "NO_TASK6_KERNEL_COMPATIBILITY",
  "NO_TASK6_COMPLETION",
  "NO_TASK7_UNLOCK_OR_CONTACT",
  "NO_LEARNER_OR_TRANSLATION_CONTENT",
  "NO_AUDIO_MOCKUP_RUNTIME_RELEASE_OR_PUBLICATION",
  "SEPARATE_VERSIONED_EVIDENCE_AND_KERNEL_MIGRATION_REQUIRED",
]);

export type GermanTask6cL02SourceAdmissionCandidateAnchorPathsDeV1 = Readonly<{
  lexicalEvidence: string;
  lexicalRegistry: string;
  task6Kernel: string;
  canonicalBundle: string;
}>;

export type GermanTask6cL02SourceAdmissionCandidateDeV1 = Readonly<{
  status: "HOLD";
  admissionStatus: "PARTIAL_CANDIDATE";
  candidateAcceptance: "HOLD";
  reviewStatus: "PENDING_INDEPENDENT_REVIEW";
  canonicalAdmission: "FORBIDDEN";
  rowsPromoted: 0;
  task7Unlock: false;
  learnerFacing: false;
  releaseAuthorized: false;
  rows: 4;
}>;

function fail(code: string): never {
  throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function record(value: unknown, code: string): asserts value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
}

function exactKeys(
  value: JsonRecord,
  keys: readonly string[],
  code: string,
): void {
  if (
    Object.keys(value).sort().join("\u0000") !== [...keys].sort().join("\u0000")
  ) {
    fail(code);
  }
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const row = value as JsonRecord;
    return `{${Object.keys(row)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(row[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function same(actual: unknown, expected: unknown, code: string): void {
  if (stable(actual) !== stable(expected)) fail(code);
}

function readBound(
  pathname: string,
  expectedSha256: string,
  code: string,
): Buffer {
  if (!fs.existsSync(pathname)) fail(`${code}_missing`);
  const bytes = fs.readFileSync(pathname);
  if (sha256(bytes) !== expectedSha256) fail(code);
  return bytes;
}

function parseRecord(bytes: Buffer, code: string): JsonRecord {
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    fail(code);
  }
  record(value, code);
  return value;
}

function resolveCaptureFile(root: string, relative: string): string {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/u).includes("..")) {
    fail("task6c_l02_admission_capture_path");
  }
  const resolvedRoot = path.resolve(root);
  const candidate = path.resolve(resolvedRoot, relative);
  if (!candidate.startsWith(`${resolvedRoot}${path.sep}`)) {
    fail("task6c_l02_admission_capture_path");
  }
  return candidate;
}

function outerDiv(html: string, marker: string): string {
  const start = html.indexOf(marker);
  if (start < 0) fail("task6c_l02_admission_source_span");
  const tags = /<\/?div\b[^>]*>/giu;
  tags.lastIndex = start;
  let depth = 0;
  for (let match = tags.exec(html); match; match = tags.exec(html)) {
    if (match.index < start) continue;
    depth += match[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, tags.lastIndex);
  }
  fail("task6c_l02_admission_source_span");
}

function task5Plan(task5: JsonRecord, id: string): JsonRecord {
  if (!Array.isArray(task5.lessons)) fail("task6c_l02_admission_task5_schema");
  for (const lesson of task5.lessons) {
    if (lesson === null || typeof lesson !== "object" || Array.isArray(lesson))
      continue;
    const chapters = (lesson as JsonRecord).chapters;
    if (!Array.isArray(chapters)) continue;
    for (const chapter of chapters) {
      if (
        chapter === null ||
        typeof chapter !== "object" ||
        Array.isArray(chapter)
      )
        continue;
      const checkpoint = (chapter as JsonRecord).checkpoint;
      if (
        checkpoint === null ||
        typeof checkpoint !== "object" ||
        Array.isArray(checkpoint)
      )
        continue;
      const plans = (checkpoint as JsonRecord).plannedNewLexicalSenses;
      if (!Array.isArray(plans)) continue;
      const found = plans.find(
        (value) =>
          value !== null &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          (value as JsonRecord).id === id,
      );
      if (found) {
        record(found, "task6c_l02_admission_task5_schema");
        return found;
      }
    }
  }
  fail("task6c_l02_admission_task5_plan_missing");
}

function validateAuthority(candidate: JsonRecord): void {
  if (
    candidate.schemaVersion !==
      "learning-v2-de-task6c-l02-source-admission-candidate.v1" ||
    candidate.status !== "HOLD" ||
    candidate.admissionStatus !== "PARTIAL_CANDIDATE" ||
    candidate.candidateAcceptance !== "HOLD" ||
    candidate.reviewStatus !== "PENDING_INDEPENDENT_REVIEW" ||
    candidate.canonicalAdmission !== "FORBIDDEN" ||
    candidate.rowsPromoted !== 0 ||
    candidate.task7Unlock !== false ||
    candidate.learnerFacing !== false ||
    candidate.phraseClaim !== false ||
    candidate.releaseAuthorized !== false
  ) {
    fail("task6c_l02_admission_authority");
  }
}

function validatePlatform(candidate: JsonRecord): void {
  record(
    candidate.platformExecution,
    "task6c_l02_admission_platform_provenance",
  );
  exactKeys(
    candidate.platformExecution,
    [
      "threadId",
      "turnId",
      "captureEventId",
      "postrunEventIds",
      "executionAuthority",
      "selfProof",
    ],
    "task6c_l02_admission_platform_provenance",
  );
  same(
    candidate.platformExecution,
    {
      threadId: "01a12f4f-9a9c-77f1-8087-1095775139d3",
      turnId: "01a12f4f-9b04-7020-9c5b-12b14b30d3e5",
      captureEventId: "exec-beb69885-7dc7-4b51-8e45-25b1b1f06a9a",
      postrunEventIds: [
        "exec-9cdf2aab-683a-4a2a-8799-4593fc4318f3",
        "exec-62db09a9-d491-4ab2-9af6-f6beba7f52aa",
      ],
      executionAuthority: "EXTERNAL_PLATFORM_HISTORY_VERIFIED_OUTSIDE_ARTIFACT",
      selfProof: false,
    },
    "task6c_l02_admission_platform_provenance",
  );
}

function validateAnchors(
  candidate: JsonRecord,
  anchorPaths: GermanTask6cL02SourceAdmissionCandidateAnchorPathsDeV1,
): void {
  record(candidate.reconciliationAnchors, "task6c_l02_admission_anchor_schema");
  exactKeys(
    candidate.reconciliationAnchors,
    [
      "role",
      "runtimeDependency",
      "existingCanonicalSenseIds",
      "lexicalEvidence",
      "lexicalRegistry",
      "task6Kernel",
      "canonicalBundle",
    ],
    "task6c_l02_admission_anchor_schema",
  );
  if (
    candidate.reconciliationAnchors.role !==
      "RECONCILIATION_ANCHOR_NOT_RUNTIME_DEPENDENCY" ||
    candidate.reconciliationAnchors.runtimeDependency !== false
  ) {
    fail("task6c_l02_admission_anchor_role");
  }
  same(
    candidate.reconciliationAnchors.existingCanonicalSenseIds,
    ["de_lex_l01_c01_nachbarin_v1", "de_lex_l01_c02_aufzug_v1"],
    "task6c_l02_admission_anchor_identity",
  );
  for (const key of Object.keys(
    ANCHOR_BINDINGS,
  ) as (keyof typeof ANCHOR_BINDINGS)[]) {
    const binding = candidate.reconciliationAnchors[key];
    record(binding, "task6c_l02_admission_anchor_schema");
    exactKeys(
      binding,
      ["path", "byteSha256"],
      "task6c_l02_admission_anchor_schema",
    );
    same(binding, ANCHOR_BINDINGS[key], "task6c_l02_admission_anchor_identity");
    readBound(
      anchorPaths[key],
      ANCHOR_BINDINGS[key].byteSha256,
      "task6c_l02_admission_anchor_bytes",
    );
  }
}

function validateCapture(
  candidate: JsonRecord,
  evidenceRoot: string,
): Map<string, Buffer> {
  record(candidate.capture, "task6c_l02_admission_capture_schema");
  exactKeys(
    candidate.capture,
    [
      "root",
      "manifestSha256",
      "inputDigestSha256",
      "runnerSha256",
      "taskRecordSha256",
    ],
    "task6c_l02_admission_capture_schema",
  );
  same(
    candidate.capture,
    {
      root: CAPTURE_ROOT,
      manifestSha256: CAPTURE_MANIFEST_SHA256,
      inputDigestSha256: CAPTURE_INPUT_DIGEST_SHA256,
      runnerSha256:
        "311781451a460a54ac9799f7bfb01d313d8a48e104ef0a684656e4b9c9432feb",
      taskRecordSha256:
        "360043bcaeb65f1a929852288ac2231f16c591cb809ea6c848e22dd2e982679e",
    },
    "task6c_l02_admission_capture_binding",
  );
  const files = new Map<string, Buffer>();
  for (const relative of GERMAN_TASK6C_L02_IDENTITY_CAPTURE_PATHS_DE_V4.evidenceFileAllowlist) {
    const pathname = resolveCaptureFile(evidenceRoot, relative);
    if (!fs.existsSync(pathname)) fail("task6c_l02_admission_capture_missing");
    files.set(relative, fs.readFileSync(pathname));
  }
  try {
    validateGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(files);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "unknown";
    fail(`task6c_l02_admission_capture_identity_capture_${detail}`);
  }
  if (
    sha256(files.get("manifest.json") ?? Buffer.alloc(0)) !==
    CAPTURE_MANIFEST_SHA256
  ) {
    fail("task6c_l02_admission_capture_manifest");
  }
  const liveManifest = parseRecord(
    files.get("manifest.json") ?? Buffer.alloc(0),
    "task6c_l02_admission_capture_manifest",
  );
  if (liveManifest.inputDigestSha256 !== CAPTURE_INPUT_DIGEST_SHA256) {
    fail("task6c_l02_admission_capture_input_digest");
  }
  return files;
}

function validateRows(
  candidate: JsonRecord,
  task5: JsonRecord,
  captureFiles: ReadonlyMap<string, Buffer>,
): void {
  if (
    !Array.isArray(candidate.rows) ||
    candidate.rows.length !== EXPECTED_ROWS.length
  ) {
    fail("task6c_l02_admission_roster");
  }
  const seen = new Set<string>();
  for (let index = 0; index < EXPECTED_ROWS.length; index += 1) {
    const row = candidate.rows[index];
    const expected = EXPECTED_ROWS[index];
    record(row, "task6c_l02_admission_row_schema");
    exactKeys(
      row,
      [
        "sourcePlanId",
        "candidateCanonicalSenseId",
        "admissionRole",
        "semanticAlignment",
        "lemma",
        "task5",
        "lexicalPackage",
        "source",
      ],
      "task6c_l02_admission_row_schema",
    );
    if (
      row.sourcePlanId !== expected.sourcePlanId ||
      row.candidateCanonicalSenseId !== expected.candidateCanonicalSenseId ||
      row.admissionRole !== "CANDIDATE_NOT_CANONICAL" ||
      row.semanticAlignment !== expected.semanticAlignment ||
      row.lemma !== expected.lemma ||
      seen.has(String(row.candidateCanonicalSenseId))
    ) {
      fail("task6c_l02_admission_row_identity");
    }
    seen.add(String(row.candidateCanonicalSenseId));

    record(row.task5, "task6c_l02_admission_task5_row_schema");
    exactKeys(
      row.task5,
      ["semanticIdentity", "senseGloss", "communicativeUse"],
      "task6c_l02_admission_task5_row_schema",
    );
    same(
      row.task5,
      {
        semanticIdentity: expected.semanticIdentity,
        senseGloss: expected.senseGloss,
        communicativeUse: expected.communicativeUse,
      },
      "task6c_l02_admission_task5_row_binding",
    );
    const plan = task5Plan(task5, expected.sourcePlanId);
    if (
      plan.semanticIdentity !== expected.semanticIdentity ||
      plan.lemmaOrExpression !== expected.lemma ||
      plan.partOfSpeech !== expected.partOfSpeech ||
      plan.senseGloss !== expected.senseGloss ||
      plan.communicativeUse !== expected.communicativeUse
    ) {
      fail("task6c_l02_admission_task5_row_binding");
    }

    record(row.lexicalPackage, "task6c_l02_admission_lexical_package");
    exactKeys(
      row.lexicalPackage,
      ["partOfSpeech", "lemma", "noun", "verb"],
      "task6c_l02_admission_lexical_package",
    );
    same(
      row.lexicalPackage,
      {
        partOfSpeech: expected.partOfSpeech,
        lemma: expected.lemma,
        noun: expected.noun,
        verb: expected.verb,
      },
      "task6c_l02_admission_lexical_package",
    );
    if (expected.partOfSpeech === "verb") {
      same(plan.nounPackage, null, "task6c_l02_admission_lexical_package");
      record(plan.verbPackage, "task6c_l02_admission_lexical_package");
      const lexicalVerb = (row.lexicalPackage as JsonRecord).verb;
      record(lexicalVerb, "task6c_l02_admission_lexical_package");
      same(
        {
          infinitive: lexicalVerb.infinitive,
          valencyFrame: lexicalVerb.valencyFrame,
          separability: lexicalVerb.separability,
          perfectAuxiliary: lexicalVerb.perfectAuxiliary,
        },
        plan.verbPackage,
        "task6c_l02_admission_lexical_package",
      );
    } else {
      same(plan.verbPackage, null, "task6c_l02_admission_lexical_package");
      const lexicalNoun = (row.lexicalPackage as JsonRecord).noun;
      record(lexicalNoun, "task6c_l02_admission_lexical_package");
      same(
        {
          article: lexicalNoun.article,
          singular: lexicalNoun.singular,
          plural: lexicalNoun.plural,
        },
        plan.nounPackage,
        "task6c_l02_admission_lexical_package",
      );
    }

    record(row.source, "task6c_l02_admission_source_schema");
    exactKeys(
      row.source,
      [
        "sourceUrl",
        "sourceAnchor",
        "body",
        "header",
        "senseSpan",
        "morphologySpan",
        "definitionGerman",
      ],
      "task6c_l02_admission_source_schema",
    );
    if (row.source.definitionGerman !== expected.definitionGerman) {
      fail("task6c_l02_admission_source_definition");
    }
    if (
      row.source.sourceUrl !== expected.sourceUrl ||
      row.source.sourceAnchor !== "d-1-1"
    ) {
      fail("task6c_l02_admission_source_binding");
    }
    record(row.source.body, "task6c_l02_admission_source_schema");
    record(row.source.header, "task6c_l02_admission_source_schema");
    record(row.source.senseSpan, "task6c_l02_admission_source_schema");
    record(row.source.morphologySpan, "task6c_l02_admission_source_schema");
    for (const binding of [
      row.source.body,
      row.source.header,
      row.source.senseSpan,
      row.source.morphologySpan,
    ]) {
      exactKeys(
        binding,
        ["bytes", "sha256"].concat("path" in binding ? ["path"] : []),
        "task6c_l02_admission_source_schema",
      );
    }
    same(
      row.source.body,
      {
        path: expected.bodyPath,
        bytes: expected.bodyBytes,
        sha256: expected.bodySha256,
      },
      "task6c_l02_admission_source_binding",
    );
    same(
      row.source.header,
      {
        path: expected.headerPath,
        bytes: expected.headerBytes,
        sha256: expected.headerSha256,
      },
      "task6c_l02_admission_source_binding",
    );
    same(
      row.source.senseSpan,
      { bytes: expected.senseBytes, sha256: expected.senseSha256 },
      "task6c_l02_admission_source_span",
    );
    same(
      row.source.morphologySpan,
      { bytes: expected.morphologyBytes, sha256: expected.morphologySha256 },
      "task6c_l02_admission_source_span",
    );
    const body = captureFiles.get(expected.bodyPath);
    const header = captureFiles.get(expected.headerPath);
    if (
      !body ||
      !header ||
      body.length !== expected.bodyBytes ||
      sha256(body) !== expected.bodySha256 ||
      header.length !== expected.headerBytes ||
      sha256(header) !== expected.headerSha256
    ) {
      fail("task6c_l02_admission_source_binding");
    }
    const html = body.toString("utf8");
    const sense = outerDiv(html, '<div class="dwdswb-lesart" id="d-1-1"');
    const morphology = outerDiv(
      html,
      '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Form / Grammatik</span>',
    );
    if (
      Buffer.byteLength(sense, "utf8") !== expected.senseBytes ||
      sha256(sense) !== expected.senseSha256 ||
      Buffer.byteLength(morphology, "utf8") !== expected.morphologyBytes ||
      sha256(morphology) !== expected.morphologySha256 ||
      !sense
        .replace(/<[^>]+>/gu, " ")
        .replace(/\s+/gu, " ")
        .includes(expected.definitionGerman)
    ) {
      fail("task6c_l02_admission_source_span");
    }
    if (expected.partOfSpeech === "verb") {
      if (
        !morphology.includes("<b>wohnt</b>") ||
        !morphology.includes("<b>wohnte</b>") ||
        !morphology.includes("<b>hat</b>") ||
        !morphology.includes("<b>gewohnt</b>")
      ) {
        fail("task6c_l02_admission_lexical_package");
      }
    } else {
      const noun = expected.noun;
      if (
        noun === null ||
        !html.includes(`<b>${expected.lemma}</b>, ${noun.article}</h1>`) ||
        !morphology.includes(`Substantiv (${noun.sourceGenderLabel})`) ||
        !morphology.includes(`Nominativ Plural: <b>${noun.plural}</b>`)
      ) {
        fail("task6c_l02_admission_lexical_package");
      }
    }
  }
}

/**
 * Validates a durable L02 source-admission candidate. This loader has no write,
 * promotion, Task 7, learner-facing, runtime, or release capability.
 */
export function loadGermanTask6cL02SourceAdmissionCandidateDeV1(
  options: Readonly<{
    manifestPathForTest?: string;
    evidenceRootForTest?: string;
    task5PathForTest?: string;
    anchorPathsForTest?: GermanTask6cL02SourceAdmissionCandidateAnchorPathsDeV1;
  }> = {},
): GermanTask6cL02SourceAdmissionCandidateDeV1 {
  const manifestPath =
    options.manifestPathForTest ?? path.join(REPO_ROOT, CANDIDATE_PATH);
  const evidenceRoot =
    options.evidenceRootForTest ?? path.join(REPO_ROOT, CAPTURE_ROOT);
  const task5Path =
    options.task5PathForTest ?? path.join(REPO_ROOT, TASK5_PATH);
  const anchorPaths =
    options.anchorPathsForTest ??
    (Object.fromEntries(
      Object.entries(ANCHOR_BINDINGS).map(([key, value]) => [
        key,
        path.join(REPO_ROOT, value.path),
      ]),
    ) as GermanTask6cL02SourceAdmissionCandidateAnchorPathsDeV1);

  const candidate = parseRecord(
    fs.readFileSync(manifestPath),
    "task6c_l02_admission_manifest",
  );
  exactKeys(
    candidate,
    [
      "schemaVersion",
      "status",
      "admissionStatus",
      "candidateAcceptance",
      "reviewStatus",
      "canonicalAdmission",
      "rowsPromoted",
      "task7Unlock",
      "learnerFacing",
      "phraseClaim",
      "releaseAuthorized",
      "task5",
      "capture",
      "platformExecution",
      "reconciliationAnchors",
      "regionalPolicy",
      "limitations",
      "rows",
    ],
    "task6c_l02_admission_manifest_schema",
  );
  validateAuthority(candidate);
  validatePlatform(candidate);

  record(candidate.task5, "task6c_l02_admission_task5_schema");
  exactKeys(
    candidate.task5,
    ["path", "byteSha256", "canonicalBodySha256"],
    "task6c_l02_admission_task5_schema",
  );
  same(
    candidate.task5,
    {
      path: TASK5_PATH,
      byteSha256: TASK5_BYTE_SHA256,
      canonicalBodySha256: TASK5_CANONICAL_BODY_SHA256,
    },
    "task6c_l02_admission_task5_binding",
  );
  const task5Bytes = readBound(
    task5Path,
    TASK5_BYTE_SHA256,
    "task6c_l02_admission_task5_bytes",
  );
  const task5 = parseRecord(task5Bytes, "task6c_l02_admission_task5_schema");
  if (hashCanonicalBody(task5) !== TASK5_CANONICAL_BODY_SHA256) {
    fail("task6c_l02_admission_task5_canonical_body");
  }

  validateAnchors(candidate, anchorPaths);
  const captureFiles = validateCapture(candidate, evidenceRoot);

  record(candidate.regionalPolicy, "task6c_l02_admission_regional_policy");
  exactKeys(
    candidate.regionalPolicy,
    [
      "authorityOnly",
      "productionPolicyClaim",
      "regionClaim",
      "productiveUseAuthorized",
      "freeArticleProduction",
      "finiteVerbProduction",
    ],
    "task6c_l02_admission_regional_policy",
  );
  same(
    candidate.regionalPolicy,
    {
      authorityOnly: "DE_REG_BASELINE_001_RECONCILIATION_ANCHOR",
      productionPolicyClaim: "UNADJUDICATED",
      regionClaim: "UNADJUDICATED",
      productiveUseAuthorized: false,
      freeArticleProduction: false,
      finiteVerbProduction: false,
    },
    "task6c_l02_admission_regional_policy",
  );
  same(candidate.limitations, LIMITATIONS, "task6c_l02_admission_limitations");
  validateRows(candidate, task5, captureFiles);

  return Object.freeze({
    status: "HOLD",
    admissionStatus: "PARTIAL_CANDIDATE",
    candidateAcceptance: "HOLD",
    reviewStatus: "PENDING_INDEPENDENT_REVIEW",
    canonicalAdmission: "FORBIDDEN",
    rowsPromoted: 0,
    task7Unlock: false,
    learnerFacing: false,
    releaseAuthorized: false,
    rows: 4,
  });
}
