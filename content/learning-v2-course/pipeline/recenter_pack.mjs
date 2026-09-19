import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  applicableRequirements,
  resolveRequirementSourcePath,
  validateRequirementManifest,
} from "./recenter_contract.mjs";

const SESSION_ID = /^de_l\d{2}_s\d{2}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const REQUIRED_CONTENT_JUDGES = Object.freeze([
  "learner",
  "taste",
  "nonsense",
  "pedagogy",
  "reader",
  "progression",
  "locale_batch",
  "locale_ru",
  "locale_uk",
]);
const sha256Hex = (bytes) => crypto
  .createHash("sha256")
  .update(bytes)
  .digest("hex");
const digest = (bytes) => `sha256:${sha256Hex(bytes)}`;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right, "en"))
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalDigest(value) {
  return digest(JSON.stringify(canonicalize(value)));
}

function readEvidence(filePath, label) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`recenter_pack_hold:${label}_missing:${absolutePath}`);
  }
  let bytes;
  try {
    bytes = fs.readFileSync(absolutePath);
  } catch (error) {
    throw new Error(
      `recenter_pack_hold:${label}_unreadable:${absolutePath}:${error?.message || error}`,
    );
  }
  return Object.freeze({
    path: absolutePath,
    bytes: bytes.byteLength,
    sha256: digest(bytes),
    content: bytes.toString("utf8"),
  });
}

function evidenceIdentity(evidence) {
  return {
    path: evidence.path,
    bytes: evidence.bytes,
    sha256: evidence.sha256,
  };
}

function readRangeEvidence(paths) {
  if (!Array.isArray(paths)) {
    throw new Error("recenter_pack_hold:previous_released_paths_invalid");
  }
  return paths
    .map((filePath) => readEvidence(filePath, "previous_release"))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
}

function sessionCoordinates(sessionId) {
  const match = /^de_l(\d{2})_s(\d{2})$/u.exec(sessionId);
  const coordinates = {
    lesson: match[1],
    session: match[2],
    lessonOrdinal: Number.parseInt(match[1], 10),
    sessionOrdinal: Number.parseInt(match[2], 10),
  };
  if (
    coordinates.lessonOrdinal < 1
    || coordinates.lessonOrdinal > 32
    || coordinates.sessionOrdinal < 1
    || coordinates.sessionOrdinal > 56
  ) {
    throw new Error(`recenter_pack_hold:session_id_invalid:${sessionId}`);
  }
  return coordinates;
}

function comparablePath(filePath) {
  const resolved = path.resolve(filePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function assertExactPath(actual, expected, label) {
  if (comparablePath(actual) !== comparablePath(expected)) {
    throw new Error(`recenter_pack_hold:${label}_path_invalid:${path.resolve(actual)}`);
  }
}

function parseProjectionManifest(evidence, expectedFields, label) {
  let value;
  try {
    value = JSON.parse(evidence.content);
  } catch {
    throw new Error(`recenter_pack_hold:${label}_json_invalid`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`recenter_pack_hold:${label}_not_object`);
  }
  const actualFields = Object.keys(value).sort((left, right) => left.localeCompare(right, "en"));
  const exactFields = [...expectedFields].sort((left, right) => left.localeCompare(right, "en"));
  if (JSON.stringify(actualFields) !== JSON.stringify(exactFields)) {
    throw new Error(`recenter_pack_hold:${label}_fields_invalid`);
  }
  return value;
}

function assertManifestIdentity(manifest, expected, label) {
  for (const [field, value] of Object.entries(expected)) {
    const matches = value && typeof value === "object"
      ? JSON.stringify(canonicalize(manifest[field])) === JSON.stringify(canonicalize(value))
      : manifest[field] === value;
    if (!matches) {
      throw new Error(`recenter_pack_hold:${label}_${field.replace(/[A-Z]/gu, (letter) => `_${letter.toLowerCase()}`)}_mismatch`);
    }
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`recenter_pack_hold:${label}_invalid`);
  }
}

function readContentJudgeReceipts({ roots, coordinates, identity }) {
  const sessionRoot = path.join(
    roots.repoRoot,
    `content/learning-v2-course/sessions/de/l${coordinates.lesson}/s${coordinates.session}`,
  );
  return REQUIRED_CONTENT_JUDGES.map((judge) => {
    const evidence = readEvidence(
      path.join(sessionRoot, `final.judge_${judge}.json`),
      "content_judge_receipt",
    );
    const value = parseProjectionManifest(evidence, [
      "schemaVersion", "judge", "status", "targetLanguage", "sessionId",
      "authoredRuDigest", "authoredUkDigest", "blueprintFingerprint",
      "packetFingerprint", "instructionSetDigest",
    ], "content_judge_receipt");
    assertManifestIdentity(value, {
      schemaVersion: "learning-v2-de-content-judge.v1",
      judge,
      status: "PASS",
      targetLanguage: "de",
      ...identity,
    }, "content_judge_receipt");
    return Object.freeze({ judge, ...evidence });
  });
}

function readReleaseAttemptHistory({ roots, coordinates, releaseAttemptId }) {
  const historyRoot = path.join(
    roots.repoRoot,
    `content/learning-v2-course/sessions/de/l${coordinates.lesson}/s${coordinates.session}/release-attempts`,
  );
  if (!fs.existsSync(historyRoot)) return [];
  const files = fs.readdirSync(historyRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".receipt.json"))
    .map((entry) => path.join(historyRoot, entry.name))
    .sort((left, right) => left.localeCompare(right, "en"));
  return files.map((filePath) => {
    const evidence = readEvidence(filePath, "release_attempt_history");
    let value;
    try {
      value = JSON.parse(evidence.content);
    } catch {
      throw new Error("recenter_pack_hold:release_attempt_history_json_invalid");
    }
    if (value?.releaseAttemptId === releaseAttemptId) {
      throw new Error("recenter_pack_hold:release_attempt_id_reused");
    }
    if (!UUID.test(String(value?.releaseAttemptId || ""))) {
      throw new Error("recenter_pack_hold:release_attempt_history_id_invalid");
    }
    return evidence;
  });
}

function parseMockupProjection(mockup) {
  const match = /<script\s+id=["']learning-v2-de-projection["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/u.exec(mockup.content);
  if (!match) throw new Error("recenter_pack_hold:mockup_projection_missing");
  try {
    return JSON.parse(match[1]);
  } catch {
    throw new Error("recenter_pack_hold:mockup_projection_json_invalid");
  }
}

function parseMockupRenderedPayload(mockup) {
  const match = /<script\s+id=["']learning-v2-de-rendered-payload["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/u.exec(mockup.content);
  if (!match) throw new Error("recenter_pack_hold:mockup_rendered_payload_missing");
  try {
    return JSON.parse(match[1]);
  } catch {
    throw new Error("recenter_pack_hold:mockup_rendered_payload_json_invalid");
  }
}

function assertLocalePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("recenter_pack_hold:release_package_payload_invalid");
  }
  const locales = Object.keys(payload).sort((left, right) => left.localeCompare(right, "en"));
  if (JSON.stringify(locales) !== JSON.stringify(["ru", "uk"])) {
    throw new Error("recenter_pack_hold:release_package_payload_locales_invalid");
  }
  for (const locale of locales) {
    const value = payload[locale];
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) {
      throw new Error(`recenter_pack_hold:release_package_payload_${locale}_empty`);
    }
  }
}

export function buildRecenterPack({
  manifest,
  roots,
  sessionId,
  phase,
  applicability,
  blueprintPath,
  exactPacketPath,
  previousReleasedPaths = [],
  previousReleaseReceiptPaths = [],
  authoredLocalePaths,
  releaseAttemptId = null,
  releasePackagePath,
  releaseManifestPath,
  mockupPath,
  mockupManifestPath,
  createdAt = new Date().toISOString(),
}) {
  if (!SESSION_ID.test(String(sessionId || ""))) {
    throw new Error(`recenter_pack_hold:session_id_invalid:${sessionId}`);
  }
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new Error("recenter_pack_hold:created_at_invalid");
  }

  const manifestIssues = validateRequirementManifest(manifest, roots);
  if (manifestIssues.length > 0) {
    throw new Error(`recenter_pack_hold:${manifestIssues.join("|")}`);
  }
  const requirements = applicableRequirements(manifest, { phase, applicability });

  if (phase === "RELEASE_PROJECTION" && applicability !== "release") {
    throw new Error("recenter_pack_hold:release_projection_applicability_invalid");
  }

  const coordinates = sessionCoordinates(sessionId);
  const expectedPriorLocaleFiles = (coordinates.sessionOrdinal - 1) * 2;
  if (
    !Array.isArray(previousReleasedPaths)
    || previousReleasedPaths.length !== expectedPriorLocaleFiles
  ) {
    throw new Error(
      `recenter_pack_hold:previous_release_range_incomplete:expected_${expectedPriorLocaleFiles}:actual_${Array.isArray(previousReleasedPaths) ? previousReleasedPaths.length : "invalid"}`,
    );
  }
  const expectedPriorReleaseReceipts = coordinates.sessionOrdinal - 1;
  if (
    !Array.isArray(previousReleaseReceiptPaths)
    || previousReleaseReceiptPaths.length !== expectedPriorReleaseReceipts
  ) {
    throw new Error(
      `recenter_pack_hold:previous_release_receipts_incomplete:expected_${expectedPriorReleaseReceipts}:actual_${Array.isArray(previousReleaseReceiptPaths) ? previousReleaseReceiptPaths.length : "invalid"}`,
    );
  }

  const expectedBlueprintPath = path.join(
    roots.repoRoot,
    "modules/learning-v2/curriculum/de/course_blueprint_de_v1.json",
  );
  const expectedPacketPath = path.join(
    roots.repoRoot,
    `content/learning-v2-course/curriculum/de/packets/l${coordinates.lesson}/s${coordinates.session}.json`,
  );
  assertExactPath(blueprintPath, expectedBlueprintPath, "blueprint");
  assertExactPath(exactPacketPath, expectedPacketPath, "exact_packet");

  const expectedPreviousPaths = [];
  const expectedPreviousReceiptPaths = [];
  for (let ordinal = 1; ordinal < coordinates.sessionOrdinal; ordinal += 1) {
    const prior = String(ordinal).padStart(2, "0");
    for (const locale of ["ru", "uk"]) {
      expectedPreviousPaths.push(path.join(
        roots.repoRoot,
        `content/learning-v2-course/sessions/de/l${coordinates.lesson}/s${prior}/final.${locale}.md`,
      ));
    }
    expectedPreviousReceiptPaths.push(path.join(
      roots.repoRoot,
      `content/learning-v2-course/sessions/de/l${coordinates.lesson}/s${prior}/recenter.release.json`,
    ));
  }
  const actualPreviousIdentity = previousReleasedPaths
    .map(comparablePath)
    .sort((left, right) => left.localeCompare(right, "en"));
  const expectedPreviousIdentity = expectedPreviousPaths
    .map(comparablePath)
    .sort((left, right) => left.localeCompare(right, "en"));
  if (
    new Set(actualPreviousIdentity).size !== actualPreviousIdentity.length
    || JSON.stringify(actualPreviousIdentity) !== JSON.stringify(expectedPreviousIdentity)
  ) {
    throw new Error("recenter_pack_hold:previous_release_identity_invalid");
  }
  const actualPreviousReceiptIdentity = previousReleaseReceiptPaths
    .map(comparablePath)
    .sort((left, right) => left.localeCompare(right, "en"));
  const expectedPreviousReceiptIdentity = expectedPreviousReceiptPaths
    .map(comparablePath)
    .sort((left, right) => left.localeCompare(right, "en"));
  if (
    new Set(actualPreviousReceiptIdentity).size !== actualPreviousReceiptIdentity.length
    || JSON.stringify(actualPreviousReceiptIdentity) !== JSON.stringify(expectedPreviousReceiptIdentity)
  ) {
    throw new Error("recenter_pack_hold:previous_release_receipt_identity_invalid");
  }

  const sources = manifest.sourceDocuments.map((source) => {
    const absolutePath = resolveRequirementSourcePath(source.sourcePath, roots);
    const evidence = readEvidence(absolutePath, "source");
    if (evidence.sha256 !== `sha256:${source.sha256}`) {
      throw new Error(`recenter_pack_hold:source_hash_stale:${source.sourcePath}`);
    }
    return Object.freeze({
      sourcePath: source.sourcePath,
      ...evidence,
    });
  });

  const blueprint = readEvidence(blueprintPath, "blueprint");
  const packet = readEvidence(exactPacketPath, "exact_packet");
  const previousReleased = readRangeEvidence(previousReleasedPaths);
  const previousReleaseReceipts = readRangeEvidence(previousReleaseReceiptPaths);
  for (const [index, evidence] of previousReleaseReceipts.entries()) {
    let value;
    try {
      value = JSON.parse(evidence.content);
    } catch {
      throw new Error("recenter_pack_hold:previous_release_receipt_json_invalid");
    }
    const priorSession = String(index + 1).padStart(2, "0");
    if (
      value?.targetLanguage !== "de"
      || value?.sessionId !== `de_l${coordinates.lesson}_s${priorSession}`
      || value?.phase !== "RELEASE_PROJECTION"
      || value?.status !== "PASS"
      || typeof value?.mockupFingerprint !== "string"
      || typeof value?.releaseFingerprint !== "string"
    ) {
      throw new Error("recenter_pack_hold:previous_release_receipt_invalid");
    }
  }
  const instructionSetDigest = canonicalDigest({
    sources: sources.map((source) => ({
      sourcePath: source.sourcePath,
      ...evidenceIdentity(source),
    })),
    requirements,
  });
  const previousReleasedRangeDigest = canonicalDigest(
    {
      localeSources: previousReleased.map(evidenceIdentity),
      releaseReceipts: previousReleaseReceipts.map(evidenceIdentity),
    },
  );

  let authoredRuDigest = null;
  let authoredUkDigest = null;
  let authoredRu = null;
  let authoredUk = null;
  let releaseFingerprint = null;
  let releaseManifestFingerprint = null;
  let mockupFingerprint = null;
  let mockupManifestFingerprint = null;
  let releasePackage = null;
  let releaseManifest = null;
  let mockup = null;
  let mockupManifest = null;
  let contentJudgeReceipts = [];
  let contentJudgeBundleDigest = null;
  let previousReleaseAttempts = [];
  let releaseAttemptHistoryDigest = null;
  if (["POST_AUTHOR", "RELEASE_PROJECTION"].includes(phase)) {
    if (
      !authoredLocalePaths
      || typeof authoredLocalePaths.ru !== "string"
      || typeof authoredLocalePaths.uk !== "string"
    ) {
      throw new Error("recenter_pack_hold:post_author_locales_required");
    }
    assertExactPath(
      authoredLocalePaths.ru,
      path.join(
        roots.repoRoot,
        `content/learning-v2-course/sessions/de/l${coordinates.lesson}/s${coordinates.session}/final.ru.md`,
      ),
      "authored_ru",
    );
    assertExactPath(
      authoredLocalePaths.uk,
      path.join(
        roots.repoRoot,
        `content/learning-v2-course/sessions/de/l${coordinates.lesson}/s${coordinates.session}/final.uk.md`,
      ),
      "authored_uk",
    );
    authoredRu = readEvidence(authoredLocalePaths.ru, "authored_ru");
    authoredUk = readEvidence(authoredLocalePaths.uk, "authored_uk");
    authoredRuDigest = authoredRu.sha256;
    authoredUkDigest = authoredUk.sha256;
  }

  if (phase === "RELEASE_PROJECTION") {
    if (!UUID.test(String(releaseAttemptId || ""))) {
      throw new Error("recenter_pack_hold:release_attempt_id_invalid");
    }
    if (
      typeof releasePackagePath !== "string"
      || typeof releaseManifestPath !== "string"
      || typeof mockupPath !== "string"
      || typeof mockupManifestPath !== "string"
    ) {
      throw new Error("recenter_pack_hold:release_projection_artifacts_required");
    }
    const releaseRoot = path.join(
      roots.repoRoot,
      `content/learning-v2-course/release/de/l${coordinates.lesson}/s${coordinates.session}`,
    );
    const mockupRoot = path.join(
      roots.repoRoot,
      `.codex-tmp/learning-v2-owner-review-de/l${coordinates.lesson}/s${coordinates.session}`,
    );
    assertExactPath(releasePackagePath, path.join(releaseRoot, "learner-package.json"), "release_package");
    assertExactPath(releaseManifestPath, path.join(releaseRoot, "release.manifest.json"), "release_manifest");
    assertExactPath(mockupPath, path.join(mockupRoot, "index.html"), "mockup");
    assertExactPath(mockupManifestPath, path.join(mockupRoot, "manifest.json"), "mockup_manifest");

    releasePackage = readEvidence(releasePackagePath, "release_package");
    releaseManifest = readEvidence(releaseManifestPath, "release_manifest");
    mockup = readEvidence(mockupPath, "mockup");
    mockupManifest = readEvidence(mockupManifestPath, "mockup_manifest");
    releaseFingerprint = releasePackage.sha256;
    releaseManifestFingerprint = releaseManifest.sha256;
    mockupFingerprint = mockup.sha256;
    mockupManifestFingerprint = mockupManifest.sha256;

    contentJudgeReceipts = readContentJudgeReceipts({
      roots,
      coordinates,
      identity: {
        sessionId,
        authoredRuDigest,
        authoredUkDigest,
        blueprintFingerprint: blueprint.sha256,
        packetFingerprint: packet.sha256,
        instructionSetDigest,
      },
    });
    contentJudgeBundleDigest = canonicalDigest(contentJudgeReceipts.map((item) => ({
      judge: item.judge,
      sha256: item.sha256,
    })));
    previousReleaseAttempts = readReleaseAttemptHistory({
      roots,
      coordinates,
      releaseAttemptId,
    });
    releaseAttemptHistoryDigest = canonicalDigest(previousReleaseAttempts.map(evidenceIdentity));

    const releasePackageValue = parseProjectionManifest(releasePackage, [
      "schemaVersion", "targetLanguage", "sessionId", "interfaceLocales",
      "authoredRuDigest", "authoredUkDigest", "blueprintFingerprint",
      "packetFingerprint", "contentJudgeBundleDigest", "generatorVersion",
      "payload",
    ], "release_package");
    assertManifestIdentity(releasePackageValue, {
      schemaVersion: "learning-v2-de-learner-package.v1",
      targetLanguage: "de",
      sessionId,
      authoredRuDigest,
      authoredUkDigest,
      blueprintFingerprint: blueprint.sha256,
      packetFingerprint: packet.sha256,
      contentJudgeBundleDigest,
    }, "release_package");
    if (JSON.stringify(releasePackageValue.interfaceLocales) !== JSON.stringify(["ru", "uk"])) {
      throw new Error("recenter_pack_hold:release_package_interface_locales_mismatch");
    }
    assertNonEmptyString(releasePackageValue.generatorVersion, "release_package_generator_version");
    const generatorVersion = releasePackageValue.generatorVersion;
    assertLocalePayload(releasePackageValue.payload);
    const localePayloadDigests = {
      ru: canonicalDigest(releasePackageValue.payload.ru),
      uk: canonicalDigest(releasePackageValue.payload.uk),
    };

    const releaseValue = parseProjectionManifest(releaseManifest, [
      "schemaVersion", "targetLanguage", "sessionId", "releaseAttemptId",
      "authoredRuDigest", "authoredUkDigest", "blueprintFingerprint",
      "packetFingerprint", "releaseFingerprint", "contentJudgeBundleDigest",
      "generatorVersion",
    ], "release_manifest");
    assertManifestIdentity(releaseValue, {
      schemaVersion: "learning-v2-de-release-candidate.v1",
      targetLanguage: "de",
      sessionId,
      releaseAttemptId,
      authoredRuDigest,
      authoredUkDigest,
      blueprintFingerprint: blueprint.sha256,
      packetFingerprint: packet.sha256,
      releaseFingerprint,
      contentJudgeBundleDigest,
      generatorVersion,
    }, "release_manifest");

    const mockupValue = parseProjectionManifest(mockupManifest, [
      "schemaVersion", "targetLanguage", "sessionId", "releaseAttemptId",
      "authoredRuDigest", "authoredUkDigest", "blueprintFingerprint",
      "packetFingerprint", "releaseFingerprint", "mockupFingerprint",
      "contentJudgeBundleDigest", "generatorVersion",
    ], "mockup_manifest");
    assertManifestIdentity(mockupValue, {
      schemaVersion: "learning-v2-de-owner-mockup-candidate.v1",
      targetLanguage: "de",
      sessionId,
      releaseAttemptId,
      authoredRuDigest,
      authoredUkDigest,
      blueprintFingerprint: blueprint.sha256,
      packetFingerprint: packet.sha256,
      releaseFingerprint,
      mockupFingerprint,
      contentJudgeBundleDigest,
      generatorVersion,
    }, "mockup_manifest");

    const mockupProjection = parseMockupProjection(mockup);
    const expectedProjection = {
      schemaVersion: "learning-v2-de-owner-mockup-projection.v1",
      targetLanguage: "de",
      sessionId,
      releaseAttemptId,
      authoredRuDigest,
      authoredUkDigest,
      blueprintFingerprint: blueprint.sha256,
      packetFingerprint: packet.sha256,
      contentJudgeBundleDigest,
      generatorVersion,
      releaseFingerprint,
      localePayloadDigests,
    };
    assertManifestIdentity(mockupProjection, expectedProjection, "mockup_projection");
    if (JSON.stringify(mockupProjection.interfaceLocales) !== JSON.stringify(["ru", "uk"])) {
      throw new Error("recenter_pack_hold:mockup_projection_interface_locales_mismatch");
    }
    const renderedPayload = parseMockupRenderedPayload(mockup);
    if (canonicalDigest(renderedPayload) !== canonicalDigest(releasePackageValue.payload)) {
      throw new Error("recenter_pack_hold:mockup_rendered_payload_mismatch");
    }
    assertLocalePayload(renderedPayload);
  }

  const pack = {
    schemaVersion: "learning-v2-recenter-pack.v1",
    targetLanguage: "de",
    sessionId,
    phase,
    applicability,
    createdAt,
    instructionSetDigest,
    blueprintFingerprint: blueprint.sha256,
    packetFingerprint: packet.sha256,
    previousReleasedRangeDigest,
    authoredRuDigest,
    authoredUkDigest,
    releaseAttemptId,
    releaseFingerprint,
    releaseManifestFingerprint,
    mockupFingerprint,
    mockupManifestFingerprint,
    contentJudgeBundleDigest,
    releaseAttemptHistoryDigest,
    blueprint,
    exactPacket: packet,
    previousReleased,
    previousReleaseReceipts,
    authoredRu,
    authoredUk,
    releasePackage,
    releaseManifest,
    mockup,
    mockupManifest,
    contentJudgeReceipts,
    previousReleaseAttempts,
    sources,
    requirements,
  };
  const packDigest = canonicalDigest({
    ...pack,
    createdAt: undefined,
    sources: sources.map((source) => ({
      sourcePath: source.sourcePath,
      ...evidenceIdentity(source),
    })),
    blueprint: evidenceIdentity(blueprint),
    exactPacket: evidenceIdentity(packet),
    previousReleased: previousReleased.map(evidenceIdentity),
    previousReleaseReceipts: previousReleaseReceipts.map(evidenceIdentity),
    authoredRu: authoredRu ? evidenceIdentity(authoredRu) : null,
    authoredUk: authoredUk ? evidenceIdentity(authoredUk) : null,
    releasePackage: releasePackage ? evidenceIdentity(releasePackage) : null,
    releaseManifest: releaseManifest ? evidenceIdentity(releaseManifest) : null,
    mockup: mockup ? evidenceIdentity(mockup) : null,
    mockupManifest: mockupManifest ? evidenceIdentity(mockupManifest) : null,
    contentJudgeReceipts: contentJudgeReceipts.map((item) => ({
      judge: item.judge,
      ...evidenceIdentity(item),
    })),
    previousReleaseAttempts: previousReleaseAttempts.map(evidenceIdentity),
  });
  return Object.freeze({ ...pack, packDigest });
}
