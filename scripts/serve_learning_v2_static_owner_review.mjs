import crypto from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { buildSessionCandidateReceipt } from "../content/learning-v2-course/pipeline/build_session_candidate_receipt.mjs";
import { validateSessionReviewEvidenceManifest } from "../content/learning-v2-course/pipeline/session_review_evidence_manifest.mjs";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 59690;
const COURSE_RELATIVE_PREFIX = "content/learning-v2-course/";
const S01_MANIFEST_RELATIVE = "sessions/en/l01/s01/review-evidence-manifest.json";
const S02_MANIFEST_RELATIVE = "outputs/s02-review-fixed-20261013/review-evidence-manifest.json";
const CANDIDATE_SESSION_FILES = Object.freeze([
  "intro.json",
  "auxiliary.json",
  "learner.json",
  "learner.uk.json",
  "answers.json",
]);
const CANDIDATE_GENERATED_FILES = Object.freeze([
  "app.js",
  "data.js",
  "external.html",
  "index.html",
  ...CANDIDATE_SESSION_FILES.map((name) => `en/l01/s01/${name}`),
]);
const TEXT_REVIEW_ROLES = Object.freeze([
  "learner",
  "reader",
  "pedagogy",
  "nonsense",
  "taste",
  "progression",
  "locale",
]);
const FULL_COURSE_ASSETS = Object.freeze(new Map([
  ["/app.js", "app.js"],
  ["/data.js", "data.js"],
  ["/external.html", "external.html"],
]));
const HTML_HEADERS = Object.freeze({
  "cache-control": "no-store",
  "expires": "0",
  "pragma": "no-cache",
  "content-type": "text/html; charset=utf-8",
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "media-src 'self' blob: data:",
    "connect-src 'self' blob:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join("; "),
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
});

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function resolveInside(root, relativePath, label) {
  if (typeof relativePath !== "string" || !relativePath || relativePath.includes("\\")) {
    throw new Error(`${label}_path_invalid`);
  }
  const absolute = resolve(root, ...relativePath.split("/"));
  const fromRoot = relative(root, absolute);
  if (!fromRoot || fromRoot === ".." || fromRoot.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(fromRoot)) {
    throw new Error(`${label}_path_outside_root`);
  }
  return absolute;
}

function courseRelativeReceiptPath(courseRoot, receiptPath, label) {
  if (typeof receiptPath !== "string" || !receiptPath.startsWith(COURSE_RELATIVE_PREFIX)) {
    throw new Error(`${label}_outside_course`);
  }
  return resolveInside(courseRoot, receiptPath.slice(COURSE_RELATIVE_PREFIX.length), label);
}

function candidateBundle(files) {
  const stable = JSON.stringify(files.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })));
  return sha256(stable);
}

export async function validateLearningV2CurrentCandidate({ courseRoot, manifestPath } = {}) {
  const effectiveCourseRoot = resolve(courseRoot ?? process.cwd(), courseRoot ? "." : "content/learning-v2-course");
  const effectiveManifestPath = manifestPath ?? resolve(effectiveCourseRoot, "sessions/en/l01/s01/review-evidence-manifest.json");
  const manifestFromRoot = relative(effectiveCourseRoot, resolve(effectiveManifestPath));
  if (!manifestFromRoot || manifestFromRoot === ".." || manifestFromRoot.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(manifestFromRoot)) {
    throw new Error("candidate_manifest_outside_course");
  }
  const manifest = JSON.parse(await readFile(effectiveManifestPath, "utf8"));
  if (manifest.releaseAuthority !== false) throw new Error("candidate_manifest_release_authority_not_false");
  const candidateRoot = resolveInside(effectiveCourseRoot, manifest.candidateRoot, "candidate_root");
  if (dirname(candidateRoot) !== resolve(effectiveCourseRoot, "outputs")) throw new Error("candidate_root_not_direct_output");

  const receiptPath = resolveInside(effectiveCourseRoot, manifest.candidateReceiptPath, "candidate_receipt");
  if (receiptPath !== resolve(candidateRoot, "content-receipt.json")) throw new Error("candidate_receipt_not_in_candidate_root");
  const receiptBytes = await readFile(receiptPath);
  const receiptSha256 = sha256(receiptBytes);
  const receipt = JSON.parse(receiptBytes.toString("utf8"));
  if (receipt.releaseAuthority !== false) throw new Error("candidate_content_receipt_release_authority_not_false");
  if (receipt.candidateRoot !== `${COURSE_RELATIVE_PREFIX}${manifest.candidateRoot}`) throw new Error("candidate_receipt_root_mismatch");
  if (receipt.inventorySha256 !== manifest.candidateReceiptInventorySha256) throw new Error("candidate_receipt_inventory_manifest_mismatch");
  if (!Array.isArray(receipt.files) || receipt.fileCount !== receipt.files.length) throw new Error("candidate_receipt_file_count_mismatch");

  const verifiedReceiptFiles = [];
  const generatedCandidateFiles = [];
  for (const entry of receipt.files) {
    if (entry?.category !== "content") throw new Error(`candidate_receipt_category_invalid:${entry?.path ?? "missing"}`);
    const absolute = courseRelativeReceiptPath(effectiveCourseRoot, entry.path, "candidate_receipt_file");
    const bytes = await readFile(absolute);
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) throw new Error(`candidate_receipt_file_stale:${entry.path}`);
    verifiedReceiptFiles.push({ path: entry.path, bytes: entry.bytes, sha256: entry.sha256 });
    const candidateRelative = relative(candidateRoot, absolute).split(process.platform === "win32" ? "\\" : "/").join("/");
    if (candidateRelative && candidateRelative !== ".." && !candidateRelative.startsWith("../") && !isAbsolute(candidateRelative)) {
      generatedCandidateFiles.push(candidateRelative);
    }
  }
  if (sha256(JSON.stringify(verifiedReceiptFiles)) !== receipt.inventorySha256) throw new Error("candidate_receipt_inventory_stale");
  if (JSON.stringify([...generatedCandidateFiles].sort()) !== JSON.stringify([...CANDIDATE_GENERATED_FILES].sort())) {
    throw new Error("candidate_generated_file_set_invalid");
  }

  const manifestFiles = [];
  for (const name of CANDIDATE_SESSION_FILES) {
    const expectedPath = `en/l01/s01/${name}`;
    const entry = manifest.candidateFiles?.find((item) => item.path === expectedPath);
    if (!entry) throw new Error(`candidate_manifest_file_missing:${expectedPath}`);
    const bytes = await readFile(resolveInside(candidateRoot, expectedPath, "candidate_manifest_file"));
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) throw new Error(`candidate_manifest_file_stale:${expectedPath}`);
    manifestFiles.push({ path: expectedPath, bytes: entry.bytes, sha256: entry.sha256 });
  }
  if (manifest.candidateFiles.length !== CANDIDATE_SESSION_FILES.length) throw new Error("candidate_manifest_file_set_invalid");
  const candidateBundleSha256 = candidateBundle(manifestFiles);
  if (candidateBundleSha256 !== manifest.candidateBundleSha256) throw new Error("candidate_bundle_stale");

  const headPath = resolveInside(effectiveCourseRoot, manifest.receiptChain?.head?.path, "candidate_receipt_head");
  const headBytes = await readFile(headPath);
  if (sha256(headBytes) !== manifest.receiptChain.head.sha256) throw new Error("candidate_receipt_head_stale");
  const head = JSON.parse(headBytes.toString("utf8"));
  if (head.releaseAuthority !== false) throw new Error("candidate_receipt_head_release_authority_not_false");
  if (manifest.receiptChain.head.contentReceiptSha256 !== receiptSha256) throw new Error("candidate_content_receipt_manifest_hash_mismatch");
  if (head.contentReceipt?.sha256 !== receiptSha256) throw new Error("candidate_content_receipt_head_hash_mismatch");
  if (head.candidateBundle?.sha256 !== candidateBundleSha256) throw new Error("candidate_receipt_head_bundle_mismatch");
  if (head.contentReceipt?.inventorySha256 !== receipt.inventorySha256) throw new Error("candidate_receipt_head_inventory_mismatch");

  return Object.freeze({
    courseRoot: effectiveCourseRoot,
    candidateRoot,
    candidateKey: "en/l01/s01",
    candidateIndexPath: resolve(candidateRoot, "index.html"),
    candidateDataPath: resolve(candidateRoot, "data.js"),
    candidateBundleSha256,
    contentReceiptInventorySha256: receipt.inventorySha256,
    contentReceiptSha256: receiptSha256,
  });
}

function courseManifestPath(courseRoot, declaredPath, label) {
  const relativePath = typeof declaredPath === "string" && declaredPath.startsWith(COURSE_RELATIVE_PREFIX)
    ? declaredPath.slice(COURSE_RELATIVE_PREFIX.length)
    : declaredPath;
  return resolveInside(courseRoot, relativePath, label);
}

export async function validateLearningV2SessionCandidate({ courseRoot, manifestPath } = {}) {
  const effectiveCourseRoot = resolve(courseRoot ?? process.cwd(), courseRoot ? "." : "content/learning-v2-course");
  const effectiveManifestPath = manifestPath ?? resolve(effectiveCourseRoot, S02_MANIFEST_RELATIVE);
  const manifestFromRoot = relative(effectiveCourseRoot, resolve(effectiveManifestPath));
  if (!manifestFromRoot || manifestFromRoot === ".." || manifestFromRoot.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(manifestFromRoot)) {
    throw new Error("candidate_manifest_outside_course");
  }
  const manifest = JSON.parse(await readFile(effectiveManifestPath, "utf8"));
  if (manifest.schemaVersion !== "learning_v2_session_review_evidence_manifest_v1") throw new Error("candidate_manifest_schema_invalid");
  if (manifest.courseSessionId !== "en:lesson-01:session-02") throw new Error("candidate_session_unsupported");
  if (manifest.releaseAuthority !== false) throw new Error("candidate_manifest_release_authority_not_false");

  const candidateRoot = courseManifestPath(effectiveCourseRoot, manifest.candidateRoot, "candidate_root");
  if (dirname(candidateRoot) !== resolve(effectiveCourseRoot, "outputs")) throw new Error("candidate_root_not_direct_output");
  const receiptPath = courseManifestPath(effectiveCourseRoot, manifest.candidateReceiptPath, "candidate_receipt");
  if (receiptPath !== resolve(candidateRoot, "content-receipt.json")) throw new Error("candidate_receipt_not_in_candidate_root");
  const receiptBytes = await readFile(receiptPath);
  const receiptSha256 = sha256(receiptBytes);
  const receipt = JSON.parse(receiptBytes.toString("utf8"));
  if (receipt.schemaVersion !== "learning_v2_session_candidate_content_receipt_v1"
    || receipt.courseSessionId !== manifest.courseSessionId
    || receipt.releaseAuthority !== false
    || receipt.immutableContentOnly !== true) {
    throw new Error("candidate_content_receipt_invalid");
  }
  if (receipt.candidateRoot !== manifest.candidateRoot || receipt.inventorySha256 !== manifest.candidateReceiptInventorySha256
    || receipt.candidateBundleSha256 !== manifest.candidateBundleSha256) {
    throw new Error("candidate_content_receipt_manifest_mismatch");
  }
  if (receipt.preview?.generated !== true || receipt.preview?.fileCount !== 4 || receipt.fileCount !== 23
    || !Array.isArray(receipt.files) || receipt.files.length !== receipt.fileCount) {
    throw new Error("candidate_content_receipt_inventory_invalid");
  }
  const repoRoot = resolve(effectiveCourseRoot, "../..");
  const predecessorPath = resolve(repoRoot, ...String(receipt.frozenPredecessor?.receiptPath ?? "").split("/"));
  const rebuilt = buildSessionCandidateReceipt({
    repoRoot,
    candidateRoot,
    session: "en/l01/s02",
    s01ReceiptPath: predecessorPath,
  });
  if (JSON.stringify(rebuilt) !== JSON.stringify(receipt)) throw new Error("candidate_content_receipt_stale");

  return Object.freeze({
    courseRoot: effectiveCourseRoot,
    candidateRoot,
    candidateKey: "en/l01/s02",
    candidateIndexPath: resolve(candidateRoot, "index.html"),
    candidateDataPath: resolve(candidateRoot, "data.js"),
    candidateBundleSha256: receipt.candidateBundleSha256,
    contentReceiptInventorySha256: receipt.inventorySha256,
    contentReceiptSha256: receiptSha256,
  });
}

async function validateCandidateForManifest({ courseRoot, manifestPath }) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  return manifest.schemaVersion === "learning_v2_session_review_evidence_manifest_v1"
    ? validateLearningV2SessionCandidate({ courseRoot, manifestPath })
    : validateLearningV2CurrentCandidate({ courseRoot, manifestPath });
}

function rawDeclaration(rawText, label) {
  const prefix = `${label}:`;
  const line = rawText
    .split(/\r?\n/u)
    .map((value) => value.replace(/^\s*-\s*/u, "").trim())
    .find((value) => value.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : null;
}

export async function validateLearningV2TextEligibility({ courseRoot, manifestPath, candidate } = {}) {
  const verifiedCandidate = candidate ?? await validateCandidateForManifest({ courseRoot, manifestPath });
  const effectiveCourseRoot = verifiedCandidate.courseRoot;
  const effectiveManifestPath = manifestPath ?? resolve(effectiveCourseRoot, "sessions/en/l01/s01/review-evidence-manifest.json");
  const manifest = JSON.parse(await readFile(effectiveManifestPath, "utf8"));
  if (manifest.schemaVersion === "learning_v2_session_review_evidence_manifest_v1") {
    return validateSessionReviewEvidenceManifest({ courseRoot: effectiveCourseRoot, manifest, candidate: verifiedCandidate });
  }
  if (!Array.isArray(manifest.roles) || manifest.roles.length !== TEXT_REVIEW_ROLES.length) {
    throw new Error("text_review_role_set_invalid");
  }
  const byRole = new Map(manifest.roles.map((role) => [role?.role, role]));
  if (byRole.size !== TEXT_REVIEW_ROLES.length || TEXT_REVIEW_ROLES.some((role) => !byRole.has(role))) {
    throw new Error("text_review_role_set_invalid");
  }

  const reviewerRuns = new Set();
  const rawPaths = new Set();
  const rawHashes = new Set();
  for (const roleName of TEXT_REVIEW_ROLES) {
    const role = byRole.get(roleName);
    if (role.eligible !== true || role.verdict !== "PASS") throw new Error(`text_review_role_not_eligible:${roleName}`);
    if (!Array.isArray(role.findings) || role.findings.length !== 0) throw new Error(`text_review_role_findings_present:${roleName}`);
    if (role.reviewedCandidateSha256 !== verifiedCandidate.candidateBundleSha256
      || role.reviewedCandidateReceiptInventorySha256 !== verifiedCandidate.contentReceiptInventorySha256
      || role.reviewedContentReceiptSha256 !== verifiedCandidate.contentReceiptSha256) {
      throw new Error(`text_review_role_candidate_mismatch:${roleName}`);
    }
    if (typeof role.reviewerRunId !== "string" || !role.reviewerRunId || reviewerRuns.has(role.reviewerRunId)) {
      throw new Error(`text_review_reviewer_run_reused:${roleName}`);
    }
    reviewerRuns.add(role.reviewerRunId);
    if (typeof role.rawArtifactPath !== "string" || rawPaths.has(role.rawArtifactPath)) {
      throw new Error(`text_review_raw_path_reused:${roleName}`);
    }
    rawPaths.add(role.rawArtifactPath);
    if (typeof role.rawArtifactSha256 !== "string" || rawHashes.has(role.rawArtifactSha256)) {
      throw new Error(`text_review_raw_hash_reused:${roleName}`);
    }
    rawHashes.add(role.rawArtifactSha256);

    const rawBytes = await readFile(resolveInside(effectiveCourseRoot, role.rawArtifactPath, `text_review_raw_${roleName}`));
    if (rawBytes.length !== role.rawArtifactBytes || sha256(rawBytes) !== role.rawArtifactSha256) {
      throw new Error(`text_review_raw_stale:${roleName}`);
    }
    const rawText = rawBytes.toString("utf8");
    if (rawDeclaration(rawText, "Role") !== roleName) throw new Error(`text_review_raw_role_mismatch:${roleName}`);
    if (rawDeclaration(rawText, "Reviewer run") !== role.reviewerRunId) throw new Error(`text_review_raw_run_mismatch:${roleName}`);
    if (rawDeclaration(rawText, "Verdict") !== "PASS") throw new Error(`text_review_raw_verdict_mismatch:${roleName}`);
    if (rawDeclaration(rawText, "Candidate bundle SHA-256") !== verifiedCandidate.candidateBundleSha256
      || rawDeclaration(rawText, "Content inventory SHA-256") !== verifiedCandidate.contentReceiptInventorySha256
      || rawDeclaration(rawText, "Content receipt SHA-256") !== verifiedCandidate.contentReceiptSha256) {
      throw new Error(`text_review_raw_candidate_mismatch:${roleName}`);
    }

    const matchingHistory = Array.isArray(manifest.reviewHistory)
      ? manifest.reviewHistory.filter((entry) => entry?.role === roleName && entry?.reviewerRunId === role.reviewerRunId)
      : [];
    if (matchingHistory.length !== 1) throw new Error(`text_review_history_binding_invalid:${roleName}`);
    const history = matchingHistory[0];
    if (history.currentEligibility !== true || history.verdict !== "PASS"
      || history.rawArtifactPath !== role.rawArtifactPath
      || history.rawArtifactBytes !== role.rawArtifactBytes
      || history.rawArtifactSha256 !== role.rawArtifactSha256
      || history.reviewedCandidateSha256 !== verifiedCandidate.candidateBundleSha256
      || history.reviewedCandidateReceiptInventorySha256 !== verifiedCandidate.contentReceiptInventorySha256
      || history.reviewedContentReceiptSha256 !== verifiedCandidate.contentReceiptSha256) {
      throw new Error(`text_review_history_binding_invalid:${roleName}`);
    }
  }

  return Object.freeze({ textVerified: true, candidateKey: verifiedCandidate.candidateKey, roleCount: TEXT_REVIEW_ROLES.length });
}

function jsonScript(html, id) {
  const marker = `<script id="${id}" type="application/json">`;
  const start = html.indexOf(marker);
  const end = html.indexOf("</script>", start + marker.length);
  if (start < 0 || end < 0) throw new Error(`full_course_${id}_missing`);
  return { marker, start, end, value: JSON.parse(html.slice(start + marker.length, end)) };
}

function replaceJsonScript(html, id, transform) {
  const block = jsonScript(html, id);
  return `${html.slice(0, block.start + block.marker.length)}${JSON.stringify(transform(block.value))}${html.slice(block.end)}`;
}

function candidateEntryFromHtml(candidateHtml, candidateKey) {
  const entries = jsonScript(candidateHtml, "data").value;
  if (!Array.isArray(entries) || entries.length !== 1 || entries[0]?.key !== candidateKey) throw new Error("candidate_catalogue_entry_invalid");
  return entries[0];
}

function catalogueEntryFromHtml(catalogueHtml, candidateKey) {
  const entries = jsonScript(catalogueHtml, "data").value;
  if (!Array.isArray(entries)) throw new Error("full_course_catalogue_invalid");
  const matches = entries.filter((entry) => entry?.key === candidateKey);
  if (matches.length !== 1) throw new Error("full_course_candidate_key_invalid");
  return matches[0];
}

function overlayEntry(entries, candidateEntry, candidateKey) {
  if (!Array.isArray(entries)) throw new Error("full_course_catalogue_invalid");
  const matches = entries.reduce((count, entry) => count + (entry?.key === candidateKey ? 1 : 0), 0);
  if (matches !== 1) throw new Error("full_course_candidate_key_invalid");
  return entries.map((entry) => entry?.key === candidateKey ? candidateEntry : entry);
}

function removeCandidateFinding(findings, candidateKey) {
  if (!findings || typeof findings !== "object" || Array.isArray(findings)) throw new Error("full_course_findings_invalid");
  const next = { ...findings };
  delete next[candidateKey];
  return next;
}

function parseDataJs(source) {
  const prefix = "window.__DATA__ = ";
  const trimmed = source.trimEnd();
  if (!trimmed.startsWith(prefix) || !trimmed.endsWith(";")) throw new Error("full_course_data_js_invalid");
  return JSON.parse(trimmed.slice(prefix.length, -1));
}

const TECHNICAL_DIFF_KEYS = new Set([
  "schemaVersion", "courseSessionId", "interactionId", "responseId", "pageId", "audioTargetId",
  "pairId", "sourceRefs", "introFingerprint", "learnerFingerprint", "auxiliaryFingerprint",
  "runtimeAuthority", "releaseAuthority", "evaluatorPayload", "acceptedAnswerPayload", "start", "end",
  "transcriptRevealPolicy",
]);

function diffFieldLabel(path, locale) {
  const keys = path.filter((part) => typeof part === "string");
  const last = keys.at(-1) ?? "";
  const labels = locale === "uk" ? {
    title: "Назва", scene: "Ситуація", body: "Пояснення", prompt: "Завдання",
    accessibilityLabel: "Доступний опис", testedDimension: "Що перевіряється", text: "Варіант відповіді",
    feedback: "Розбір відповіді", explanation: "Пояснення", meaning: "Значення",
    tempting: "Чому варіант приваблює", wrong: "Чому тут неправильно", contrast: "Порівняння",
    boundary: "Коли варіант доречний", function: "Роль слова", target: "Цільова фраза",
    transcript: "Текст аудіо", tokens: "Слова для складання", outcome: "Результат заняття",
  } : {
    title: "Название", scene: "Ситуация", body: "Объяснение", prompt: "Задание",
    accessibilityLabel: "Доступное описание", testedDimension: "Что проверяется", text: "Вариант ответа",
    feedback: "Разбор ответа", explanation: "Объяснение", meaning: "Значение",
    tempting: "Почему вариант привлекает", wrong: "Почему здесь неверно", contrast: "Сравнение",
    boundary: "Когда вариант уместен", function: "Роль слова", target: "Целевая фраза",
    transcript: "Текст аудио", tokens: "Слова для сборки", outcome: "Результат занятия",
  };
  if (/title/iu.test(last)) return labels.title;
  if (/scene/iu.test(last)) return labels.scene;
  if (/body/iu.test(last)) return labels.body;
  if (/learningOutcome/iu.test(last)) return labels.outcome;
  if (/accessibilityLabel/iu.test(last)) return labels.accessibilityLabel;
  if (/testedDimension/iu.test(last)) return labels.testedDimension;
  if (/prompt/iu.test(last)) return labels.prompt;
  if (/whyTempting/iu.test(last)) return labels.tempting;
  if (/whyWrong/iu.test(last)) return labels.wrong;
  if (/minimalContrast/iu.test(last)) return labels.contrast;
  if (/acceptabilityBoundary/iu.test(last)) return labels.boundary;
  if (/feedback/iu.test(last)) return labels.feedback;
  if (/explanation/iu.test(last)) return labels.explanation;
  if (/meaning/iu.test(last)) return labels.meaning;
  if (/function/iu.test(last)) return labels.function;
  if (/transcript/iu.test(last)) return labels.transcript;
  if (/targetPhrase|hiddenTargetPhrase|correctText/iu.test(last)) return labels.target;
  if (/orderedTokens|authoredDistractorTokens/iu.test(last)) return labels.tokens;
  if (last === "text" || last === "targetText") return labels.text;
  return null;
}

function shortInteractionId(interactionId) {
  return typeof interactionId === "string" ? interactionId.split(":").at(-1) : "session";
}

function groupForInteraction(interaction, locale, practiceStartOrdinal) {
  const id = shortInteractionId(interaction?.interactionId);
  const ordinal = interaction?.ordinal;
  const taskNumber = Number.isInteger(ordinal) && Number.isInteger(practiceStartOrdinal)
    ? ordinal - practiceStartOrdinal + 1
    : null;
  return {
    groupId: id,
    groupLabel: Number.isInteger(taskNumber) && taskNumber > 0
      ? `${locale === "uk" ? "Завдання" : "Задание"} ${taskNumber}`
      : locale === "uk" ? "Завдання" : "Задание",
  };
}

function collectNodeChanges(before, after, path, group, locale, out) {
  if (before === after) return;
  if (before && typeof before === "object" && !Array.isArray(before)
    && after && typeof after === "object" && !Array.isArray(after)
    && ((Object.hasOwn(before, "ru") || Object.hasOwn(before, "uk"))
      || (Object.hasOwn(after, "ru") || Object.hasOwn(after, "uk")))) {
    collectNodeChanges(before[locale], after[locale], path, group, locale, out);
    return;
  }
  if (Array.isArray(before) || Array.isArray(after)) {
    const oldArray = Array.isArray(before) ? before : [];
    const newArray = Array.isArray(after) ? after : [];
    if (oldArray.every((value) => typeof value === "string") && newArray.every((value) => typeof value === "string")) {
      collectNodeChanges(oldArray.join(" · "), newArray.join(" · "), path, group, locale, out);
      return;
    }
    const identity = (value, index) => value?.responseId ?? value?.pairId ?? value?.interactionId ?? value?.pageId ?? index;
    const oldMap = new Map(oldArray.map((value, index) => [identity(value, index), value]));
    const newMap = new Map(newArray.map((value, index) => [identity(value, index), value]));
    for (const key of new Set([...oldMap.keys(), ...newMap.keys()])) {
      collectNodeChanges(oldMap.get(key), newMap.get(key), [...path, String(key)], group, locale, out);
    }
    return;
  }
  if ((before && typeof before === "object") || (after && typeof after === "object")) {
    const oldObject = before && typeof before === "object" ? before : {};
    const newObject = after && typeof after === "object" ? after : {};
    for (const key of new Set([...Object.keys(oldObject), ...Object.keys(newObject)])) {
      if (TECHNICAL_DIFF_KEYS.has(key) || /(?:Fingerprint|Sha256|hash|bytes)$/u.test(key)) continue;
      collectNodeChanges(oldObject[key], newObject[key], [...path, key], group, locale, out);
    }
    return;
  }
  if ((typeof before !== "string" && typeof after !== "string") || before === after) return;
  const fieldLabel = diffFieldLabel(path, locale);
  if (!fieldLabel) return;
  out.push({
    pathKey: path.join("."),
    groupId: group.groupId,
    groupLabel: group.groupLabel,
    fieldLabel,
    before: typeof before === "string" ? before : locale === "uk" ? "Не було" : "Не было",
    after: typeof after === "string" ? after : locale === "uk" ? "Видалено" : "Удалено",
  });
}

function localeChanges(beforeEntry, afterEntry, locale) {
  const out = [];
  const sessionGroup = { groupId: "session", groupLabel: locale === "uk" ? "Картка заняття" : "Карточка занятия" };
  for (const key of ["title", "titleByLocale", "scene", "sceneByLocale", "lessonTitle", "lessonTitleByLocale"]) {
    collectNodeChanges(beforeEntry[key], afterEntry[key], [key], sessionGroup, locale, out);
  }
  collectNodeChanges(beforeEntry.intro?.learningOutcomeByLocale, afterEntry.intro?.learningOutcomeByLocale, ["learningOutcomeByLocale"], sessionGroup, locale, out);

  const oldPages = new Map((beforeEntry.intro?.pages ?? []).map((page) => [page.pageId, page]));
  const newPages = new Map((afterEntry.intro?.pages ?? []).map((page) => [page.pageId, page]));
  for (const pageId of new Set([...oldPages.keys(), ...newPages.keys()])) {
    const page = newPages.get(pageId) ?? oldPages.get(pageId);
    const number = page?.pageOrdinal ?? 0;
    const id = shortInteractionId(pageId);
    collectNodeChanges(oldPages.get(pageId), newPages.get(pageId), ["intro", id], {
      groupId: id,
      groupLabel: `${locale === "uk" ? "Вступна частина" : "Вводная часть"} ${number}`,
    }, locale, out);
  }

  const practiceStartOrdinal = afterEntry.intro?.practiceStartOrdinal
    ?? beforeEntry.intro?.practiceStartOrdinal
    ?? Math.max(beforeEntry.intro?.pages?.length ?? 0, afterEntry.intro?.pages?.length ?? 0) + 1;
  const oldLearner = beforeEntry.learnerByLocale?.[locale] ?? beforeEntry.learner;
  const newLearner = afterEntry.learnerByLocale?.[locale] ?? afterEntry.learner;
  const oldInteractions = new Map((oldLearner?.interactions ?? []).map((item) => [item.interactionId, item]));
  const newInteractions = new Map((newLearner?.interactions ?? []).map((item) => [item.interactionId, item]));
  for (const interactionId of new Set([...oldInteractions.keys(), ...newInteractions.keys()])) {
    const item = newInteractions.get(interactionId) ?? oldInteractions.get(interactionId);
    collectNodeChanges(oldInteractions.get(interactionId), newInteractions.get(interactionId), ["learner", shortInteractionId(interactionId)], groupForInteraction(item, locale, practiceStartOrdinal), locale, out);
  }

  const interactions = new Map([...oldInteractions, ...newInteractions]);
  const oldAux = new Map((beforeEntry.auxiliary?.entries ?? []).map((item) => [item.interactionId, item]));
  const newAux = new Map((afterEntry.auxiliary?.entries ?? []).map((item) => [item.interactionId, item]));
  for (const interactionId of new Set([...oldAux.keys(), ...newAux.keys()])) {
    const item = interactions.get(interactionId) ?? { interactionId };
    collectNodeChanges(oldAux.get(interactionId), newAux.get(interactionId), ["auxiliary", shortInteractionId(interactionId)], groupForInteraction(item, locale, practiceStartOrdinal), locale, out);
  }
  return out;
}

function buildComparisonChanges(beforeEntry, afterEntry) {
  const merged = new Map();
  for (const locale of ["ru", "uk"]) {
    for (const change of localeChanges(beforeEntry, afterEntry, locale)) {
      const mergeKey = `${change.groupId}\u0000${change.pathKey}`;
      const current = merged.get(mergeKey) ?? {
        groupId: change.groupId,
        groupLabelByLocale: {}, fieldLabelByLocale: {}, beforeByLocale: {}, afterByLocale: {},
      };
      current.groupLabelByLocale[locale] = change.groupLabel;
      current.fieldLabelByLocale[locale] = change.fieldLabel;
      current.beforeByLocale[locale] = change.before;
      current.afterByLocale[locale] = change.after;
      merged.set(mergeKey, current);
    }
  }
  const deduplicated = new Map();
  for (const change of merged.values()) {
    const key = JSON.stringify([change.groupId, change.fieldLabelByLocale, change.beforeByLocale, change.afterByLocale]);
    if (!deduplicated.has(key)) deduplicated.set(key, change);
  }
  return [...deduplicated.values()];
}

function uniqueSourceSlice(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const nextStart = source.indexOf(startMarker, start + startMarker.length);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || nextStart >= 0 || end <= start) throw new Error(`candidate_runtime_${label}_invalid`);
  return source.slice(start, end);
}

function candidateRuntimePatch(candidateAppSource, candidateKey) {
  const sessionNumber = /^en\/l01\/s(01|02)$/u.exec(candidateKey)?.[1];
  if (!sessionNumber) throw new Error("candidate_runtime_session_unsupported");
  const runtimeMarker = `__ownerReviewS${sessionNumber}RuntimePatched`;
  const uiBlock = uniqueSourceSlice(candidateAppSource, "const UI = {", "function activityCountLabel", "ui");
  const helperBlock = uniqueSourceSlice(candidateAppSource, "const activeLocaleValue =", "// ---------- экраны ----------", "helpers");
  let renderBlock = uniqueSourceSlice(candidateAppSource, "function renderSession() {", "function render() {", "render")
    .replace("function renderSession() {", "function candidateRenderSession() {");
  if (!renderBlock.includes("function candidateRenderSession() {") || renderBlock.includes("function renderSession() {")) {
    throw new Error("candidate_runtime_render_rename_invalid");
  }
  const introFeedbackText = `text:selectedFeedback && analysisComplete && diagnosticComplete
        ? selectedFeedback
        : ui("missingIntroExplanation"),`;
  const introFeedbackHtml = `html:selectedFeedback && analysisComplete && diagnosticComplete
        ? tl(selectedFeedback)
        : tl(ui("missingIntroExplanation")),`;
  if (renderBlock.split(introFeedbackText).length !== 2) throw new Error("candidate_runtime_intro_feedback_boundary_invalid");
  renderBlock = renderBlock.replace(introFeedbackText, introFeedbackHtml);
  const unverifiedFeedback = `h("div", {class:"fb no", role:"status", "aria-live":"polite", "aria-atomic":"true", text:ui("unverified")})`;
  const neutralUnverifiedFeedback = `h("div", {class:"fb neutral", "data-owner-review-status":"owner-review-unverified-neutral", role:"status", "aria-live":"polite", "aria-atomic":"true", text:ui("unverified")})`;
  if (renderBlock.split(unverifiedFeedback).length !== 2) throw new Error("candidate_runtime_unverified_feedback_boundary_invalid");
  renderBlock = renderBlock.replace(unverifiedFeedback, neutralUnverifiedFeedback);
  return `;(()=>{if(globalThis.${runtimeMarker})return;${uiBlock}\n${helperBlock}\n${renderBlock}\nconst legacyRenderSession=renderSession;renderSession=function ownerReviewRenderSession(){if(S.session?.key!==${JSON.stringify(candidateKey)})return legacyRenderSession();if(S.step===0&&!S.answered&&S.right===0&&S.wrong===0){S.audioAttempt=null;S.unverified=0;}return candidateRenderSession();};globalThis.${runtimeMarker}=true;})();`;
}

function safeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</gu, "\\u003c");
}

function fullCourseInjection(states, comparisons = {}, runtimePatch = "", primaryFailed = false) {
  const safeStates = states.map((state) => ({
    key: state.candidateKey,
    textVerified: true,
    releaseAuthority: false,
  }));
  const safeComparisons = { ...comparisons };
  if (safeStates.length === 1) safeComparisons.changes = comparisons[safeStates[0].key]?.changes ?? [];
  const comparisonScript = `<script id="owner-review-diff-data" type="application/json">${safeJsonForHtml(safeComparisons)}</script>`;
  const runtimeScript = runtimePatch ? `<script id="owner-review-runtime">${runtimePatch}</script>` : "";
  return `<style id="current-candidate-style">
.candidate-validation-error{margin:12px auto;max-width:1200px;padding:12px 16px;border:2px solid #c0413f;border-radius:12px;background:#fff0ef;color:#7b2220;font-weight:800}
.card.text-verified{border-color:#55a88d;background:#dff4e9}
.card.text-verified .meta{display:flex;flex-wrap:wrap;min-width:0}
.card.text-verified .chip{max-width:100%;white-space:normal;overflow-wrap:anywhere}
.chip.text-verified-label{background:#bce8d6;color:#075c49}.chip.release-scope{background:#edf0ea;color:#58665f}
.owner-review-tools{display:flex;justify-content:flex-end;margin:0 0 14px}.owner-review-diff-toggle{border:1px solid #166c57;border-radius:999px;background:#edf7f2;color:#123c32;padding:9px 14px;font:700 14px/1.2 system-ui,sans-serif;cursor:pointer}
.owner-review-diff{position:fixed;z-index:4000;inset:0;background:#11231dcc;display:grid;place-items:center;padding:18px}.owner-review-diff-dialog{width:min(980px,100%);max-height:92vh;overflow:auto;border-radius:20px;background:#fbfcf8;color:#14251f;padding:22px;box-shadow:0 18px 70px #0007}.owner-review-diff-head{display:flex;align-items:center;justify-content:space-between;gap:16px;position:sticky;top:-22px;background:#fbfcf8;padding:10px 0 14px;z-index:1}.owner-review-diff-head h2{margin:0}.owner-review-diff-close{border:1px solid #80928a;border-radius:999px;background:#eef2ed;padding:9px 13px;font-weight:700;cursor:pointer}.owner-review-diff-group{border-top:1px solid #d9e2dc;padding-top:14px;margin-top:14px}.owner-review-diff-group h3{margin:0 0 10px}.owner-review-diff-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin:10px 0}.owner-review-diff-cell{min-width:0;border-radius:12px;padding:12px;background:#f1f1eb;white-space:pre-wrap;overflow-wrap:anywhere}.owner-review-diff-cell.after{background:#dff4e9}.owner-review-diff-cell b{display:block;margin-bottom:7px}.owner-review-diff-field{grid-column:1/-1;font-weight:800;margin-bottom:-5px}@media(max-width:680px){.owner-review-diff-row{grid-template-columns:1fr}}
</style>${comparisonScript}${runtimeScript}<script id="current-candidate-state">(()=>{const states=${JSON.stringify(safeStates)};const comparisons=JSON.parse(document.getElementById("owner-review-diff-data")?.textContent||'{}');const verifiedKeys=new Set(states.map(state=>state.key));if(${JSON.stringify(primaryFailed)}){const box=document.createElement("div");box.className="candidate-validation-error";box.textContent="Текущая правка недоступна: проверка доказательств не пройдена.";document.body.prepend(box);}const locale=()=>S.locale==="uk"?"uk":"ru";const text=(value)=>value?.[locale()]??value?.ru??value?.uk??"";const closeDiff=()=>document.querySelector(".owner-review-diff")?.remove();const showDiff=()=>{const comparison=comparisons[S.session?.key]??{changes:[]};closeDiff();const overlay=document.createElement("div");overlay.className="owner-review-diff";const dialog=document.createElement("div");dialog.className="owner-review-diff-dialog";dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-label","Сравнение текста");const head=document.createElement("div");head.className="owner-review-diff-head";const title=document.createElement("h2");title.textContent="Что изменилось";const close=document.createElement("button");close.type="button";close.className="owner-review-diff-close";close.textContent="Закрыть сравнение";close.onclick=closeDiff;head.append(title,close);dialog.append(head);const groups=new Map();for(const change of comparison.changes||[]){const id=change.groupId||"session";if(!groups.has(id))groups.set(id,[]);groups.get(id).push(change);}for(const changes of groups.values()){const section=document.createElement("section");section.className="owner-review-diff-group";section.dataset.groupId=changes[0].groupId||"session";const heading=document.createElement("h3");heading.textContent=text(changes[0].groupLabelByLocale);section.append(heading);for(const change of changes){const row=document.createElement("div");row.className="owner-review-diff-row";row.dataset.pathKey=change.pathKey||"";const field=document.createElement("div");field.className="owner-review-diff-field";field.textContent=text(change.fieldLabelByLocale);const before=document.createElement("div");before.className="owner-review-diff-cell before";const beforeTitle=document.createElement("b");beforeTitle.textContent="Было в макете";before.append(beforeTitle,document.createTextNode(text(change.beforeByLocale)));const after=document.createElement("div");after.className="owner-review-diff-cell after";const afterTitle=document.createElement("b");afterTitle.textContent="Стало";after.append(afterTitle,document.createTextNode(text(change.afterByLocale)));row.append(field,before,after);section.append(row);}dialog.append(section);}overlay.append(dialog);overlay.addEventListener("click",event=>{if(event.target===overlay)closeDiff();});document.body.append(overlay);close.focus();};const attach=()=>{for(const state of states){const index=DATA.findIndex(item=>item.key===state.key);const card=document.querySelectorAll("button.card")[index];if(!card)continue;const existingVerified=card.querySelector(".text-verified-label");const existingScope=card.querySelector(".release-scope");const pending=card.querySelectorAll(".chip.pending");const summary=card.querySelector(".fix-summary");const needsCardUpdate=!card.classList.contains("text-verified")||existingVerified?.textContent!=="Текст проверен"||existingScope?.textContent!=="Выпуск не подтверждён"||pending.length>0||Boolean(summary);if(needsCardUpdate){card.classList.remove("needs-repair","candidate");card.classList.add("source-fixed","text-verified");pending.forEach(node=>node.remove());summary?.remove();const meta=card.querySelector(".meta");if(meta){let verified=existingVerified;if(!verified){verified=document.createElement("span");verified.className="chip fixed text-verified-label";meta.append(verified);}if(verified.textContent!=="Текст проверен")verified.textContent="Текст проверен";let scope=existingScope;if(!scope){scope=document.createElement("span");scope.className="chip release-scope";meta.append(scope);}if(scope.textContent!=="Выпуск не подтверждён")scope.textContent="Выпуск не подтверждён";}}}if(verifiedKeys.has(S.session?.key)&&!document.querySelector(".owner-review-diff-toggle")){const panel=document.querySelector("#app .panel");if(panel){const tools=document.createElement("div");tools.className="owner-review-tools";const button=document.createElement("button");button.type="button";button.className="owner-review-diff-toggle";button.textContent="Показать изменения";button.onclick=showDiff;tools.append(button);panel.prepend(tools);}}};attach();const app=document.getElementById("app");if(app)new MutationObserver(attach).observe(app,{childList:true,subtree:true});document.getElementById("locale")?.addEventListener("change",()=>{if(document.querySelector(".owner-review-diff"))showDiff();});})();</script>`;
}

function candidateReturnInjection() {
  return `<style id="owner-review-return-style">.owner-review-return{position:fixed;z-index:1000;top:12px;left:12px;padding:10px 14px;border:2px solid #166c57;border-radius:999px;background:#f9fcf7;color:#123c32;font:700 15px/1.2 system-ui,sans-serif;text-decoration:none;box-shadow:0 4px 18px #18382c33}</style><a id="owner-review-return" class="owner-review-return" href="/">Вернуться ко всем занятиям</a>`;
}

function injectBeforeBodyEnd(html, injection) {
  const marker = "</body>";
  const index = html.lastIndexOf(marker);
  if (index < 0) throw new Error("full_course_index_missing_body_end");
  return `${html.slice(0, index)}${injection}\n${html.slice(index)}`;
}

async function buildFullCourseHtml(rawHtml, previews, options = {}) {
  const verifiedPreviews = previews.filter((preview) => preview.ok);
  const canonicalHtml = options.canonicalHtml ?? rawHtml;
  const comparisons = {};
  const states = [];
  const runtimePatches = [];
  let html = rawHtml;
  for (const preview of verifiedPreviews) {
    const candidateHtml = await readFile(preview.candidate.candidateIndexPath, "utf8");
    const candidateEntry = candidateEntryFromHtml(candidateHtml, preview.candidate.candidateKey);
    const canonicalEntry = catalogueEntryFromHtml(canonicalHtml, preview.candidate.candidateKey);
    comparisons[preview.candidate.candidateKey] = { changes: buildComparisonChanges(canonicalEntry, candidateEntry) };
    states.push({ candidateKey: preview.candidate.candidateKey });
    if (options.includeRuntime !== false) {
      const candidateAppSource = await readFile(resolve(preview.candidate.candidateRoot, "app.js"), "utf8");
      runtimePatches.push(candidateRuntimePatch(candidateAppSource, preview.candidate.candidateKey));
    }
    if (html.includes('<script id="data" type="application/json">')) {
      html = replaceJsonScript(html, "data", (entries) => overlayEntry(entries, candidateEntry, preview.candidate.candidateKey));
    }
    html = replaceJsonScript(html, "source-quality-findings", (findings) => removeCandidateFinding(findings, preview.candidate.candidateKey));
    html = replaceJsonScript(html, "source-release-findings", (findings) => removeCandidateFinding(findings, preview.candidate.candidateKey));
  }
  return injectBeforeBodyEnd(html, fullCourseInjection(
    states,
    comparisons,
    runtimePatches.join("\n"),
    previews[0]?.ok === false,
  ));
}

export async function startLearningV2StaticOwnerReviewServer(options = {}) {
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;
  const fullCourse = options.fullCourse === true;
  const courseRoot = resolve(options.courseRoot ?? resolve(process.cwd(), "content/learning-v2-course"));
  const rootDirectory = options.rootDirectory ?? (fullCourse
    ? resolve(courseRoot, "mockup")
    : resolve(process.cwd(), ".codex-tmp", "learning-v2-owner-review"));
  const manifestPaths = options.manifestPaths
    ? [...options.manifestPaths]
    : options.manifestPath
      ? [options.manifestPath]
      : [resolve(courseRoot, S01_MANIFEST_RELATIVE), resolve(courseRoot, S02_MANIFEST_RELATIVE)];
  if (manifestPaths.length < 1 || manifestPaths.length > 2) throw new Error("candidate_manifest_set_invalid");
  const indexPath = resolve(rootDirectory, "index.html");
  await readFile(indexPath);

  const candidateForManifest = async (manifestPath) => {
    try {
      return { ok: true, value: await validateCandidateForManifest({ courseRoot, manifestPath }) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const currentCandidate = async () => candidateForManifest(manifestPaths[0]);

  const previewForManifest = async (manifestPath) => {
    const candidate = await candidateForManifest(manifestPath);
    if (!candidate.ok) return candidate;
    try {
      await validateLearningV2TextEligibility({ courseRoot, manifestPath, candidate: candidate.value });
      return { ok: true, candidate: candidate.value };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const currentPreviews = async () => Promise.all(manifestPaths.map((manifestPath) => previewForManifest(manifestPath)));

  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", `http://${host}`);
    if (request.method !== "GET") {
      response.writeHead(405, { allow: "GET", "cache-control": "no-store" });
      response.end("Method Not Allowed");
      return;
    }
    if (requestUrl.pathname === "/health") {
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify({
        ok: true,
        service: "learning-v2-static-owner-review",
      }));
      return;
    }
    if (fullCourse && requestUrl.pathname === "/current-candidate") {
      const candidate = await currentCandidate();
      if (!candidate.ok) {
        const message = String(candidate.error.message).replace(/[&<>]/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character]);
        response.writeHead(409, HTML_HEADERS);
        response.end(`<!doctype html><html lang="ru"><meta charset="utf-8"><title>Текущая правка недоступна</title><body><main><h1>Текущая правка недоступна</h1><p>${message}</p><p><a href="/">Вернуться ко всем занятиям</a></p></main></body></html>`);
        return;
      }
      const sourceHtml = await readFile(candidate.value.candidateIndexPath, "utf8");
      const html = injectBeforeBodyEnd(sourceHtml, candidateReturnInjection());
      response.writeHead(200, HTML_HEADERS);
      response.end(html);
      return;
    }
    if (fullCourse && FULL_COURSE_ASSETS.has(requestUrl.pathname)) {
      try {
        const assetName = FULL_COURSE_ASSETS.get(requestUrl.pathname);
        let bytes;
        if (assetName === "data.js") {
          const source = await readFile(resolve(rootDirectory, assetName), "utf8");
          const previews = await currentPreviews();
          let entries = parseDataJs(source);
          for (const preview of previews.filter((item) => item.ok)) {
            const candidateSource = await readFile(preview.candidate.candidateDataPath, "utf8");
            const [candidateEntry] = parseDataJs(candidateSource);
            if (candidateEntry?.key !== preview.candidate.candidateKey) throw new Error("candidate_data_js_entry_invalid");
            entries = overlayEntry(entries, candidateEntry, preview.candidate.candidateKey);
          }
          bytes = `window.__DATA__ = ${JSON.stringify(entries)};\n`;
        } else if (assetName === "external.html") {
          const [externalHtml, canonicalHtml] = await Promise.all([
            readFile(resolve(rootDirectory, assetName), "utf8"),
            readFile(indexPath, "utf8"),
          ]);
          bytes = await buildFullCourseHtml(externalHtml, await currentPreviews(), {
            canonicalHtml,
            includeRuntime: false,
          });
        } else if (assetName === "app.js") {
          const source = await readFile(resolve(rootDirectory, assetName), "utf8");
          const patches = [];
          for (const preview of (await currentPreviews()).filter((item) => item.ok)) {
            patches.push(candidateRuntimePatch(
              await readFile(resolve(preview.candidate.candidateRoot, "app.js"), "utf8"),
              preview.candidate.candidateKey,
            ));
          }
          bytes = patches.length ? `${source}\n${patches.join("\n")}\n` : source;
        } else {
          bytes = await readFile(resolve(rootDirectory, assetName));
        }
        const contentType = assetName.endsWith(".js")
          ? "text/javascript; charset=utf-8"
          : "text/html; charset=utf-8";
        response.writeHead(200, { "cache-control": "no-store", "content-type": contentType, "x-content-type-options": "nosniff" });
        response.end(bytes);
      } catch {
        response.writeHead(503, { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" });
        response.end("Full course asset unavailable");
      }
      return;
    }
    if (requestUrl.pathname !== "/" && requestUrl.pathname !== "/index.html") {
      response.writeHead(404, { "cache-control": "no-store" });
      response.end("Not Found");
      return;
    }
    try {
      const rawHtml = await readFile(indexPath, "utf8");
      const html = fullCourse
        ? await buildFullCourseHtml(rawHtml, await currentPreviews())
        : rawHtml;
      response.writeHead(200, HTML_HEADERS);
      response.end(html);
    } catch (error) {
      response.writeHead(503, {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
      });
      response.end("Owner review build unavailable");
      if (!options.quiet) {
        process.stderr.write(
          `LEARNING V2 OWNER REVIEW READ FAILED: ${
            error instanceof Error ? error.message : String(error)
          }\n`,
        );
      }
    }
  });

  await new Promise((resolveListen, rejectListen) => {
    const onError = (error) => rejectListen(error);
    server.once("error", onError);
    server.listen(port, host, () => {
      server.off("error", onError);
      resolveListen();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("learning_v2_owner_review_server_address_unavailable");
  }
  const url = `http://${host}:${address.port}/`;
  if (!options.quiet) {
    process.stdout.write(`LEARNING V2 OWNER REVIEW${fullCourse ? " FULL COURSE" : ""}: ${url}\n`);
  }
  return Object.freeze({
    server,
    url,
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
    }),
  });
}

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isDirectRun) {
  const args = process.argv.slice(2);
  let fullCourse = false;
  let port = DEFAULT_PORT;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--full-course") {
      fullCourse = true;
    } else if (args[index] === "--port") {
      const parsed = Number(args[++index]);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error("learning_v2_owner_review_port_invalid");
      port = parsed;
    } else if (args[index] === "--help") {
      process.stdout.write("Usage: node scripts/serve_learning_v2_static_owner_review.mjs [--full-course] [--port <1-65535>]\n");
      process.exit(0);
    } else {
      throw new Error(`learning_v2_owner_review_argument_unknown:${args[index]}`);
    }
  }
  const running = await startLearningV2StaticOwnerReviewServer({ fullCourse, port });
  const shutdown = async () => {
    await running.close();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
