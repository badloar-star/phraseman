import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validateSessionAcceptanceReceipt } from "./session_acceptance_receipt.mjs";

export const APPROVED_ENGLISH_BLUEPRINT_FINGERPRINT =
  "d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da";
export const APPROVED_ENGLISH_PLAN_SHA256 =
  "3fb075a8ff5fcf5e6847c87a44241bfc01a1951399ba6fdd41c19a52930ac499";

const SOURCE_NAMES = Object.freeze(["final.ru.md", "final.uk.md", "practice.atomic.json"]);
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

export const MANDATORY_AUTHORING_SOURCE_KEYS = Object.freeze([
  "DesktopCodex/00_ПРОЧТИ_ПЕРВЫМ.txt",
  "DesktopCodex/00_ГЛАВНОЕ_ТРЕБОВАНИЕ.md",
  "DesktopCodex/НАЧНИ_ОТСЮДА.md",
  "repo/AGENTS.md",
  "repo/docs/v2/СТАРТ В2.md",
  "repo/docs/v2/MODE_NATIVE_AUTHORING_CONTRACT.ru.md",
  "repo/docs/v2/curriculum/AFTER_EVERY_SESSION_RECENTER.ru.md",
  "repo/docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md",
  "repo/docs/v2/LEARNING_V2_COURSE_BLUEPRINT_32X56_DESIGN.ru.md",
  "repo/docs/v2/curriculum/en/RESEARCH_DOSSIER.ru.md",
  "repo/docs/v2/curriculum/en/SOURCE_EVIDENCE_LEDGER.md",
  "repo/docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md",
  "repo/docs/v2/БИБЛИЯ_ТЕКСТОВ_LEARNING_V2.ru.md",
  "repo/docs/v2/LESSON_DESIGN_RULES.ru.md",
  "repo/docs/v2/КАК_ВЫПУСКАТЬ_СЕССИЮ_ЧЕКЛИСТ.ru.md",
  "factory/ГЛАВНОЕ_ТРЕБОВАНИЕ.md",
  "factory/КОНСТИТУЦИЯ.md",
  "factory/МЕТОД_РАБОТЫ.md",
  "factory/СВОД_ГРАММАТИКИ_КЕМБРИДЖ.md",
  "factory/КАРТОЧКА_СЛОВА_В_ПРИЛОЖЕНИИ.md",
  "factory/IMPROVEMENT_LOG.md",
  "factory/exemplars/en/l01_s01.ru.md",
  "factory/exemplars/en/l01_s02.ru.md",
  "factory/exemplars/en/l01_s03.ru.md",
  "factory/curriculum/en/ПЛАН_КУРСА.md",
  "factory/curriculum/en/ОСОБЕННОСТИ_ЯЗЫКА.md",
  "factory/pipeline/КОНСТИТУЦИЯ_ДЛЯ_СУДЕЙ.md",
  "factory/judgements/owner/2026-09-03_en_l01_s01.md",
  "factory/judgements/owner/2026-09-03_en_l01_s02.md",
  "factory/judgements/owner/2026-09-03_en_l01_s03.md",
  "factory/judgements/owner/2026-09-03_en_l01_s04.md",
  "factory/judgements/owner/2026-09-03_короткие_тексты_и_подсветка.md",
  "factory/judgements/owner/2026-09-08_listening_options.md",
  "factory/judgements/owner/2026-09-08_short_answer_construction_and_humor.md",
  "factory/judgements/owner/2026-09-19_clear_lesson_opening_and_vibe.md",
  "factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md",
  "factory/judgements/owner/2026-10-03_single_phrase_per_interaction.md",
  "factory/judgements/owner/2026-10-14_english_blueprint_d956_approval.md",
  ...[
    "author.md", "check_single_answer.md", "editor.md", "judge_learner.md",
    "judge_locale_batch.md", "judge_locale.md", "judge_nonsense.md",
    "judge_pedagogy.md", "judge_preauthoring.md", "judge_progression.md",
    "judge_reader.md", "judge_recenter_post.md", "judge_recenter_pre.md",
    "judge_recenter_release.md", "judge_taste.md", "localize_batch.md",
    "localize.md",
  ].map((name) => `factory/pipeline/prompts/${name}`),
]);

const sourcePathForKey = ({ repoRoot, factoryRoot, desktopCodexRoot }, key) => {
  if (key.startsWith("DesktopCodex/")) return path.join(desktopCodexRoot, key.slice("DesktopCodex/".length));
  if (key.startsWith("factory/")) return path.join(factoryRoot, key.slice("factory/".length));
  return path.join(repoRoot, key.slice("repo/".length));
};

export function captureMandatoryAuthoringSources({ repoRoot, factoryRoot, desktopCodexRoot, language }) {
  const issues = [];
  if (language !== "en") issues.push("mandatory_manifest_currently_requires_english");
  const digests = {};
  const snapshots = new Map();
  const files = {};
  const inventorySpecs = [
    { directory: path.join(factoryRoot, "judgements", "owner"), key: "factory/judgements/owner", prefix: "factory/judgements/owner/", suffix: ".md" },
    { directory: path.join(factoryRoot, "pipeline", "prompts"), key: "factory/pipeline/prompts", prefix: "factory/pipeline/prompts/", suffix: ".md" },
    { directory: path.join(factoryRoot, "exemplars", language), key: `factory/exemplars/${language}`, prefix: `factory/exemplars/${language}/`, suffix: ".ru.md" },
  ];
  const inventories = {};
  for (const spec of inventorySpecs) {
    const names = fs.existsSync(spec.directory)
      ? fs.readdirSync(spec.directory).filter((name) => name.endsWith(spec.suffix)).sort()
      : [];
    inventories[spec.key] = { directory: spec.directory, suffix: spec.suffix, names };
  }
  const discoveredKeys = inventorySpecs.flatMap(({ key, prefix }) => (
    inventories[key].names.map((name) => `${prefix}${name}`)
  ));
  const keys = [...new Set([...MANDATORY_AUTHORING_SOURCE_KEYS, ...discoveredKeys])].sort();
  for (const key of keys) {
    const file = sourcePathForKey({ repoRoot, factoryRoot, desktopCodexRoot }, key);
    files[key] = file;
    if (!fs.existsSync(file)) {
      issues.push(`mandatory_source_missing:${key}`);
      continue;
    }
    const stats = fs.lstatSync(file);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      issues.push(`mandatory_source_not_regular_file:${key}`);
      continue;
    }
    const bytes = fs.readFileSync(file);
    digests[key] = sha256(bytes);
    snapshots.set(path.resolve(file), bytes.toString("utf8"));
  }
  return { issues, digests, snapshots, files, keys, inventories };
}

function mandatorySourceSnapshotIssues(mandatorySources) {
  const issues = [...(mandatorySources?.issues || [])];
  for (const [key, inventory] of Object.entries(mandatorySources?.inventories || {})) {
    const current = fs.existsSync(inventory.directory)
      ? fs.readdirSync(inventory.directory).filter((name) => name.endsWith(inventory.suffix)).sort()
      : [];
    if (JSON.stringify(current) !== JSON.stringify(inventory.names)) {
      issues.push(`mandatory_source_inventory_changed:${key}`);
    }
  }
  const keys = [...new Set([...MANDATORY_AUTHORING_SOURCE_KEYS, ...(mandatorySources?.keys || [])])];
  for (const key of keys) {
    const file = mandatorySources?.files?.[key];
    const expected = mandatorySources?.digests?.[key];
    if (!file || !expected || !mandatorySources?.snapshots?.has(path.resolve(file))) {
      if (!issues.includes(`mandatory_source_missing:${key}`)) issues.push(`mandatory_source_missing:${key}`);
      continue;
    }
    if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
      issues.push(`mandatory_source_changed:${key}`);
      continue;
    }
    if (sha256(fs.readFileSync(file)) !== expected) issues.push(`mandatory_source_changed:${key}`);
  }
  return issues;
}

function parseSession(session) {
  const match = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/u.exec(String(session || ""));
  return match
    ? { language: match[1], lesson: Number(match[2]), sessionOrdinal: Number(match[3]) }
    : null;
}

const HEX_64 = /^[a-f0-9]{64}$/u;
const BLUEPRINT_AUTHORING_CONTRACT_SCHEMA = "learning_v2_blueprint_authoring_contract_v2";
const ACCEPTED_PREFIX_COVERAGE_SCHEMA = "learning_v2_accepted_prefix_prerequisite_coverage_v1";

export function parseBlueprintAuthoringContract(blueprintGate, expectedSession) {
  const gateOutput = `${blueprintGate?.stdout || ""}\n${blueprintGate?.stderr || ""}`;
  const encoded = /^authoring_contract_base64=([A-Za-z0-9+/=]+)$/mu.exec(gateOutput)?.[1];
  if (!encoded) throw new Error("blueprint_authoring_contract_missing");
  let contract;
  try {
    contract = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  } catch {
    throw new Error("blueprint_authoring_contract_invalid");
  }
  if (contract?.schemaVersion !== BLUEPRINT_AUTHORING_CONTRACT_SCHEMA) {
    throw new Error("blueprint_authoring_contract_schema_invalid");
  }
  if (contract.session !== expectedSession) throw new Error("blueprint_authoring_contract_session_mismatch");
  if (contract.blueprintFingerprint !== APPROVED_ENGLISH_BLUEPRINT_FINGERPRINT) {
    throw new Error("blueprint_authoring_contract_fingerprint_mismatch");
  }
  if (!HEX_64.test(String(contract.sessionPacketSha256 || "")) || !contract.semantic) {
    throw new Error("blueprint_authoring_contract_invalid");
  }
  if (!Array.isArray(contract.acceptedPrefixPackets)) {
    throw new Error("blueprint_authoring_contract_acceptedPrefixPackets_invalid");
  }
  for (const field of [
    "grammarOperationIds",
    "reviewOperationIds",
    "prerequisiteSessionIds",
    "grammarOperations",
    "reviewOperations",
    "newLexicalSenses",
    "retrievalLexicalSenses",
    "phraseFrames",
    "modeFamilies",
  ]) {
    if (!Array.isArray(contract.semantic[field])) throw new Error(`blueprint_authoring_contract_${field}_invalid`);
  }
  const scope = parseSession(expectedSession);
  const expectedSessionId = scope
    ? `lesson-${String(scope.lesson).padStart(2, "0")}:session:${String(scope.sessionOrdinal).padStart(2, "0")}`
    : null;
  const exactIds = (values) => JSON.stringify(values.map((value) => value.id));
  const operationContractInvalid = (operation) =>
    !operation?.id ||
    !Array.isArray(operation.planEvidenceAlternatives) ||
    operation.planEvidenceAlternatives.length === 0 ||
    !Array.isArray(operation.evidenceExamples) ||
    operation.evidenceExamples.length === 0;
  const lexicalContractInvalid = (sense) =>
    !sense?.id ||
    !sense?.english ||
    !sense?.partOfSpeech ||
    !Array.isArray(sense.evidenceExamples) ||
    sense.evidenceExamples.length === 0;
  const prefixPacketInvalid = (packet) => {
    const packetScope = parseSession(packet?.session);
    const packetSessionId = packetScope
      ? `lesson-${String(packetScope.lesson).padStart(2, "0")}:session:${String(packetScope.sessionOrdinal).padStart(2, "0")}`
      : null;
    return !packetScope ||
      packetScope.language !== "en" ||
      packet.sessionId !== packetSessionId ||
      !HEX_64.test(String(packet.sessionPacketSha256 || "")) ||
      !Array.isArray(packet.grammarOperations) ||
      !Array.isArray(packet.reviewOperations) ||
      !Array.isArray(packet.newLexicalSenses) ||
      [...(packet.grammarOperations || []), ...(packet.reviewOperations || [])].some(operationContractInvalid) ||
      (packet.newLexicalSenses || []).some(lexicalContractInvalid);
  };
  if (
    contract.sessionId !== expectedSessionId ||
    JSON.stringify(contract.semantic.grammarOperationIds) !== exactIds(contract.semantic.grammarOperations) ||
    JSON.stringify(contract.semantic.reviewOperationIds) !== exactIds(contract.semantic.reviewOperations) ||
    [...contract.semantic.grammarOperations, ...contract.semantic.reviewOperations].some(operationContractInvalid) ||
    contract.semantic.newLexicalSenses.some(lexicalContractInvalid) ||
    contract.semantic.retrievalLexicalSenses.some(lexicalContractInvalid) ||
    contract.acceptedPrefixPackets.some(prefixPacketInvalid) ||
    new Set(contract.acceptedPrefixPackets.map((packet) => packet.session)).size !== contract.acceptedPrefixPackets.length
  ) {
    throw new Error("blueprint_authoring_contract_semantic_binding_invalid");
  }
  return Object.freeze(contract);
}

const escapedRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
const targetContains = (targets, value) => {
  const parts = String(value || "").trim().split(/\s+/u).filter(Boolean).map(escapedRegex);
  if (parts.length === 0) return false;
  const pattern = new RegExp(`(?:^|[^a-z])${parts.join("\\s+")}(?:$|[^a-z])`, "iu");
  return targets.some((target) => pattern.test(String(target)));
};

const normalizedExactEvidence = (value) => String(value || "")
  .toLocaleLowerCase("en")
  .replace(/[^a-z0-9]+/gu, " ")
  .trim();

export function validateAcceptedSessionAgainstBlueprintPacket({ session, packetContract, acceptedTargets }) {
  const packet = packetContract;
  const acceptedSession = session || packet?.session || "unknown";
  const issues = [];
  if (!packet || packet.session !== acceptedSession) issues.push(`accepted_packet_session_mismatch:${acceptedSession}`);
  const targetSet = new Set((acceptedTargets || []).map(normalizedExactEvidence).filter(Boolean));
  const evidenceIsPresent = (examples) => (examples || []).some((example) => targetSet.has(normalizedExactEvidence(example)));
  const operations = [...(packet?.grammarOperations || []), ...(packet?.reviewOperations || [])];
  const missingOperationIds = operations
    .filter((operation) => !evidenceIsPresent(operation.evidenceExamples))
    .map((operation) => operation.id);
  const missingLexicalSenseIds = (packet?.newLexicalSenses || [])
    .filter((sense) => !evidenceIsPresent(sense.evidenceExamples))
    .map((sense) => sense.id);
  issues.push(
    ...missingOperationIds.map((id) => `accepted_packet_operation_missing:${id}`),
    ...missingLexicalSenseIds.map((id) => `accepted_packet_lexical_sense_missing:${id}`),
  );
  const verdict = issues.length === 0 ? "PASS" : "HOLD";
  return Object.freeze({
    session: acceptedSession,
    sessionPacketSha256: packet?.sessionPacketSha256 ?? null,
    verdict,
    missingOperationIds,
    missingLexicalSenseIds,
    issues,
    provenOperationIds: verdict === "PASS" ? operations.map((operation) => operation.id) : [],
    provenLexicalSenseIds: verdict === "PASS" ? (packet?.newLexicalSenses || []).map((sense) => sense.id) : [],
  });
}

export function evaluateAcceptedPrefixPrerequisites({ session, blueprintContract, acceptedSessions, chainIssues = [] }) {
  const semantic = blueprintContract?.semantic || {};
  const provenLexicalSenseIds = new Set((acceptedSessions || []).flatMap((entry) => entry.provenLexicalSenseIds || []));
  const provenOperationIds = new Set((acceptedSessions || []).flatMap((entry) => entry.provenOperationIds || []));
  const retrievalSenses = semantic.retrievalLexicalSenses || [];
  const reviewOperations = semantic.reviewOperations || [];
  const missingRetrievalSenseIds = retrievalSenses
    .filter((sense) => !provenLexicalSenseIds.has(sense.id))
    .map((sense) => sense.id);
  const missingReviewOperationIds = reviewOperations
    .filter((operation) => !provenOperationIds.has(operation.id))
    .map((operation) => operation.id);
  const issues = [
    ...chainIssues,
    ...missingRetrievalSenseIds.map((id) => `accepted_prefix_retrieval_sense_missing:${id}`),
    ...missingReviewOperationIds.map((id) => `accepted_prefix_review_operation_missing:${id}`),
  ];
  return Object.freeze({
    schemaVersion: ACCEPTED_PREFIX_COVERAGE_SCHEMA,
    session,
    blueprintFingerprint: blueprintContract?.blueprintFingerprint ?? null,
    verdict: issues.length === 0 ? "PASS" : "HOLD",
    acceptedPrefixCount: (acceptedSessions || []).length,
    missingRetrievalSenseIds,
    missingReviewOperationIds,
    issues,
    acceptedSessions: (acceptedSessions || []).map(({ session: acceptedSession, acceptanceReceiptPath, acceptanceReceiptSha256, sessionPacketSha256, packetVerdict, packetIssues, provenOperationIds: acceptedOperationIds, provenLexicalSenseIds: acceptedSenseIds }) => ({
      session: acceptedSession,
      acceptanceReceiptPath,
      acceptanceReceiptSha256,
      sessionPacketSha256,
      packetVerdict,
      packetIssues,
      provenOperationIds: acceptedOperationIds || [],
      provenLexicalSenseIds: acceptedSenseIds || [],
    })),
  });
}

function acceptedTargetsFromSource(name, bytes) {
  const text = bytes.toString("utf8");
  if (name === "practice.atomic.json") {
    const source = JSON.parse(text);
    const answers = new Map((source.answers || []).map((answer) => [answer.interactionId, answer.correctText]));
    const targets = [...answers.values()].filter((value) => typeof value === "string");
    for (const interactions of Object.values(source.interactionsByLocale || {})) {
      for (const interaction of interactions || []) {
        const payload = interaction.modePayload || {};
        for (const value of [payload.targetPhrase, payload.hiddenTargetPhrase, payload.referenceAudio?.transcript]) {
          if (typeof value === "string") targets.push(value);
        }
        if (typeof payload.gappedTargetPhrase === "string") {
          const answer = answers.get(interaction.interactionId);
          if (typeof answer === "string") targets.push(payload.gappedTargetPhrase.replace("___", answer));
        }
      }
    }
    return targets;
  }
  return [...text.matchAll(/^\s*-\s*✅\s*\*\*(.+?)\*\*/gmu)].map((match) => match[1]);
}

export async function collectAcceptedPrefixPrerequisiteCoverage({ repoRoot, sessionsRoot, session, blueprintContract }) {
  const scope = parseSession(session);
  if (!scope) {
    return evaluateAcceptedPrefixPrerequisites({
      session,
      blueprintContract,
      acceptedSessions: [],
      chainIssues: ["accepted_prefix_session_invalid"],
    });
  }
  const acceptedSessions = [];
  const chainIssues = [];
  const prefixPackets = new Map((blueprintContract?.acceptedPrefixPackets || []).map((packet) => [packet.session, packet]));
  let previousAcceptance = null;
  for (let lesson = 1; lesson <= scope.lesson; lesson += 1) {
    const lastSession = lesson < scope.lesson ? 56 : scope.sessionOrdinal - 1;
    for (let sessionOrdinal = 1; sessionOrdinal <= lastSession; sessionOrdinal += 1) {
      const id = `${scope.language}/l${String(lesson).padStart(2, "0")}/s${String(sessionOrdinal).padStart(2, "0")}`;
      const manifestPath = path.join(sessionsRoot, id, "owner-review-preview-manifest.json");
      if (!fs.existsSync(manifestPath) || !fs.statSync(manifestPath).isFile()) {
        chainIssues.push(`accepted_prefix_manifest_missing:${id}`);
        continue;
      }
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        if (manifest.reviewStatus !== "TEXT_CANONICAL" || manifest.textVerified !== true) {
          throw new Error("preview_manifest_not_text_canonical");
        }
        const acceptance = await validateSessionAcceptanceReceipt({
          repoRoot,
          acceptanceReceiptPath: manifest.acceptanceReceiptPath,
        });
        if (acceptance.session !== id || acceptance.acceptanceReceiptSha256 !== manifest.acceptanceReceiptSha256) {
          throw new Error("preview_manifest_acceptance_mismatch");
        }
        const candidateReceipt = JSON.parse(fs.readFileSync(path.join(repoRoot, ...acceptance.candidateReceiptPath.split("/")), "utf8"));
        if (previousAcceptance && candidateReceipt.acceptedPredecessor) {
          const predecessor = candidateReceipt.acceptedPredecessor;
          if (
            predecessor?.status !== "PASS" ||
            predecessor.acceptanceReceiptPath !== previousAcceptance.acceptanceReceiptPath ||
            predecessor.acceptanceReceiptSha256 !== previousAcceptance.acceptanceReceiptSha256
          ) {
            throw new Error("accepted_predecessor_chain_mismatch");
          }
        }
        const requiredSuffixes = ["final.ru.md", "final.uk.md", "practice.atomic.json"];
        const sourceEntries = candidateReceipt.files.filter((entry) =>
          entry.category === "source" && requiredSuffixes.some((name) => entry.path.endsWith(`/${name}`)),
        );
        for (const name of requiredSuffixes) {
          if (!sourceEntries.some((entry) => entry.path.endsWith(`/${name}`))) {
            throw new Error(`accepted_source_missing:${name}`);
          }
        }
        const acceptedTargets = sourceEntries.flatMap((entry) => {
          const absolute = path.join(repoRoot, ...entry.path.split("/"));
          return acceptedTargetsFromSource(path.basename(entry.path), fs.readFileSync(absolute));
        });
        const packet = prefixPackets.get(id);
        if (!packet) throw new Error("blueprint_prefix_packet_missing");
        const packetValidation = validateAcceptedSessionAgainstBlueprintPacket({
          session: id,
          packetContract: packet,
          acceptedTargets,
        });
        if (packetValidation.verdict !== "PASS") {
          chainIssues.push(...packetValidation.issues.map((issue) => `accepted_prefix_packet_hold:${id}:${issue}`));
        }
        const accepted = {
          session: id,
          acceptanceReceiptPath: acceptance.acceptanceReceiptPath,
          acceptanceReceiptSha256: acceptance.acceptanceReceiptSha256,
          acceptedTargets,
          sessionPacketSha256: packetValidation.sessionPacketSha256,
          packetVerdict: packetValidation.verdict,
          packetIssues: packetValidation.issues,
          provenOperationIds: packetValidation.provenOperationIds,
          provenLexicalSenseIds: packetValidation.provenLexicalSenseIds,
        };
        acceptedSessions.push(accepted);
        previousAcceptance = accepted;
      } catch (error) {
        chainIssues.push(`accepted_prefix_receipt_invalid:${id}:${error.message}`);
      }
    }
  }
  return evaluateAcceptedPrefixPrerequisites({ session, blueprintContract, acceptedSessions, chainIssues });
}

function canonicalCurriculumRow(scope, row) {
  return `Урок ${scope.lesson}, сессия ${row.n} · тип: ${row.type} · грамматика: ${row.grammar} · новые слова: ${row.words} · момент сцены: ${row.moment}`;
}

function collectPriorSourceDigests(sessionsRoot, scope) {
  const digests = {};
  for (let lesson = 1; lesson <= scope.lesson; lesson += 1) {
    const lastSession = lesson < scope.lesson ? 56 : scope.sessionOrdinal - 1;
    for (let session = 1; session <= lastSession; session += 1) {
      const relativeDir = `${scope.language}/l${String(lesson).padStart(2, "0")}/s${String(session).padStart(2, "0")}`;
      for (const name of SOURCE_NAMES) {
        const file = path.join(sessionsRoot, relativeDir, name);
        if (fs.existsSync(file) && fs.statSync(file).isFile()) {
          digests[`${relativeDir}/${name}`] = sha256(fs.readFileSync(file));
        }
      }
    }
  }
  return digests;
}

const RELEASE_ONLY_BLOCKERS = new Set([
  "audio",
  "audio_evidence",
  "canonical_sync",
  "parity",
  "release_parity",
  "source_release_parity",
]);

function collectPriorQualityEvidence(sessionsRoot, scope) {
  const evidence = {};
  const issues = [];
  for (let lesson = 1; lesson <= scope.lesson; lesson += 1) {
    const lastSession = lesson < scope.lesson ? 56 : scope.sessionOrdinal - 1;
    for (let session = 1; session <= lastSession; session += 1) {
      const id = `${scope.language}/l${String(lesson).padStart(2, "0")}/s${String(session).padStart(2, "0")}`;
      const statusPath = path.join(sessionsRoot, id, "status.json");
      if (!fs.existsSync(statusPath) || !fs.statSync(statusPath).isFile()) {
        issues.push(`prior_quality_status_missing:${id}`);
        continue;
      }
      let status;
      const statusBytes = fs.readFileSync(statusPath);
      try {
        status = JSON.parse(statusBytes.toString("utf8"));
      } catch {
        issues.push(`prior_quality_status_invalid:${id}`);
        continue;
      }
      const rawBlockedBy = Array.isArray(status.blockedBy)
        ? status.blockedBy
        : status.blockedBy ? [status.blockedBy] : [];
      const releaseOnlyBlockers = rawBlockedBy.filter((item) => RELEASE_ONLY_BLOCKERS.has(String(item)));
      const qualityBlockers = rawBlockedBy
        .map(String)
        .filter((item) => !RELEASE_ONLY_BLOCKERS.has(item));
      if (status.judges && typeof status.judges === "object" && !Array.isArray(status.judges)) {
        for (const [role, verdict] of Object.entries(status.judges)) {
          const value = typeof verdict === "string" ? verdict : verdict?.verdict;
          if (value !== "PASS") qualityBlockers.push(`judges:${role}:${String(value || "MISSING")}`);
        }
      }
      for (const [field, values] of [
        ["blocked", status.blocked],
        ["brokenTasks", status.brokenTasks],
        ["facts", status.facts],
        ["buildProblems", status.buildProblems],
        ["missingIndependentRoles", status.missingIndependentRoles],
      ]) {
        if (Array.isArray(values)) qualityBlockers.push(...values.map((value) => `${field}:${String(value)}`));
      }
      if (
        qualityBlockers.length === 0
        && releaseOnlyBlockers.length === 0
        && (status.converged !== true || status.needsHumanReview !== false)
      ) {
        qualityBlockers.push("unresolved_quality_state");
      }
      evidence[id] = {
        statusSha256: sha256(statusBytes),
        releaseOnlyBlockers,
        qualityBlockers,
      };
      for (const blocker of qualityBlockers) issues.push(`prior_quality_hold:${id}:${blocker}`);
    }
  }
  return { evidence, issues };
}

export function runEnglishBlueprintIntegrityGate(repoRoot, session) {
  const cli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
  const gate = path.join(repoRoot, "scripts", "learning_v2_curriculum_blueprint_gate_v2.ts");
  if (!fs.existsSync(cli) || !fs.existsSync(gate)) {
    return { status: 1, stdout: "", stderr: "blueprint_gate_runtime_missing" };
  }
  return spawnSync(process.execPath, [cli, gate, `--session=${session}`], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function buildAuthoringAdmission({
  session,
  row,
  curriculumRow,
  planPath,
  expectedPlanSha256,
  sessionsRoot,
  mandatorySources,
  blueprintGate,
  acceptedPrefixCoverage,
}) {
  const issues = mandatorySourceSnapshotIssues(mandatorySources);
  const scope = parseSession(session);
  if (!scope) issues.push("session_identity_invalid");
  if (scope?.language !== "en") issues.push("automatic_admission_currently_requires_english");

  const gateOutput = `${blueprintGate?.stdout || ""}\n${blueprintGate?.stderr || ""}`;
  if (blueprintGate?.status !== 0 || !/LEARNING V2 CURRICULUM BLUEPRINT V2 GATE: PASS/u.test(gateOutput)) {
    issues.push("blueprint_integrity_gate_failed");
  }
  const gateFingerprint = /fingerprint=([a-f0-9]{64})/u.exec(gateOutput)?.[1] ?? null;
  if (gateFingerprint !== APPROVED_ENGLISH_BLUEPRINT_FINGERPRINT) {
    issues.push(`blueprint_fingerprint_drift:${gateFingerprint || "missing"}`);
  }
  let blueprintContract = null;
  try {
    blueprintContract = parseBlueprintAuthoringContract(blueprintGate, session);
  } catch (error) {
    issues.push(error.message);
  }

  let planDigest = null;
  if (!planPath || !fs.existsSync(planPath) || !fs.statSync(planPath).isFile()) {
    issues.push("curriculum_plan_missing");
  } else {
    planDigest = sha256(fs.readFileSync(planPath));
    if (planDigest !== expectedPlanSha256) issues.push(`curriculum_plan_digest_drift:${planDigest}`);
  }

  for (const field of ["type", "grammar", "words", "moment", "scene"]) {
    if (!String(row?.[field] || "").trim()) issues.push(`curriculum_row_${field}_missing`);
  }
  if (scope && Number(row?.n) !== scope.sessionOrdinal) issues.push("curriculum_row_session_mismatch");
  const exactRow = scope && row ? canonicalCurriculumRow(scope, row) : "";
  if (curriculumRow !== exactRow) issues.push("curriculum_row_serialization_mismatch");

  const semantic = blueprintContract?.semantic;
  const legacyPlanDiagnostics = [];
  if (semantic) {
    const legacyPlanText = `${row?.grammar || ""} ${row?.scene || ""} ${row?.moment || ""}`;
    const requiredOperations = [...(semantic.grammarOperations || []), ...(semantic.reviewOperations || [])];
    for (const operation of requiredOperations) {
      if (!(operation.planEvidenceAlternatives || []).some((alternative) => targetContains([legacyPlanText], alternative))) {
        legacyPlanDiagnostics.push(`legacy_plan_operation_missing:${operation.id}`);
      }
    }
    const legacyNewWords = String(row?.words || "")
      .replace(/^новое:\s*/iu, "")
      .split(/;\s*возврат:/iu)[0]
      .split(",")
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word && word !== "—" && word !== "-")
      .sort();
    const blueprintNewWords = (semantic.newLexicalSenses || []).map((sense) => sense.english.toLowerCase()).sort();
    if (JSON.stringify(legacyNewWords) !== JSON.stringify(blueprintNewWords)) {
      legacyPlanDiagnostics.push(`legacy_plan_new_lexical_senses_mismatch:plan=${legacyNewWords.join(",") || "none"}:blueprint=${blueprintNewWords.join(",") || "none"}`);
    }
    const legacyCheckpoint = /checkpoint|чекпоинт/iu.test(String(row?.type || ""));
    if ((semantic.role === "checkpoint") !== legacyCheckpoint) {
      legacyPlanDiagnostics.push(`legacy_plan_role_mismatch:plan=${row?.type || "missing"}:blueprint=${semantic.role}`);
    }
  }

  if (
    acceptedPrefixCoverage?.schemaVersion !== ACCEPTED_PREFIX_COVERAGE_SCHEMA ||
    acceptedPrefixCoverage?.session !== session ||
    acceptedPrefixCoverage?.blueprintFingerprint !== APPROVED_ENGLISH_BLUEPRINT_FINGERPRINT
  ) {
    issues.push("accepted_prefix_prerequisite_coverage_invalid");
  } else if (acceptedPrefixCoverage.verdict !== "PASS") {
    issues.push(...(acceptedPrefixCoverage.issues || ["accepted_prefix_prerequisite_hold"]));
  }

  const contentDigests = { ...(mandatorySources?.digests || {}) };
  const priorSourceDigests = scope && sessionsRoot
    ? collectPriorSourceDigests(sessionsRoot, scope)
    : {};
  const priorQuality = scope && sessionsRoot
    ? collectPriorQualityEvidence(sessionsRoot, scope)
    : { evidence: {}, issues: [] };
  issues.push(...priorQuality.issues);
  if (scope && (scope.lesson > 1 || scope.sessionOrdinal > 1)) {
    const immediateLesson = scope.sessionOrdinal > 1 ? scope.lesson : scope.lesson - 1;
    const immediateSession = scope.sessionOrdinal > 1 ? scope.sessionOrdinal - 1 : 56;
    const prefix = `${scope.language}/l${String(immediateLesson).padStart(2, "0")}/s${String(immediateSession).padStart(2, "0")}`;
    for (const name of ["final.ru.md", "final.uk.md"]) {
      if (!priorSourceDigests[`${prefix}/${name}`]) issues.push(`prior_source_missing:${prefix}/${name}`);
    }
  }

  return {
    ready: issues.length === 0,
    issues,
    packet: {
      schemaVersion: "learning_v2_automatic_authoring_admission_v1",
      session,
      blueprintFingerprint: gateFingerprint,
      blueprintSessionPacketSha256: blueprintContract?.sessionPacketSha256 ?? null,
      curriculumPlanSha256: planDigest,
      curriculumRow: semantic ? JSON.stringify(semantic) : "",
      curriculumRowSha256: sha256(Buffer.from(semantic ? JSON.stringify(semantic) : "", "utf8")),
      legacyPlanReference: {
        authority: "HISTORICAL_REFERENCE_ONLY",
        curriculumRow: exactRow,
        curriculumRowSha256: sha256(Buffer.from(exactRow, "utf8")),
        diagnostics: legacyPlanDiagnostics,
      },
      authoritativeRow: {
        n: scope?.sessionOrdinal ?? Number(row?.n || 0),
        type: String(semantic?.role || ""),
        grammar: [...(semantic?.grammarOperationIds || []), ...(semantic?.reviewOperationIds || [])].join(", "),
        words: (semantic?.newLexicalSenses || []).map((sense) => sense.english).join(", ") || "—",
        moment: String(semantic?.learningDeltaRu || ""),
        scene: String(semantic?.transferContextRu || ""),
      },
      authoritativeKnown: {
        ops: (semantic?.reviewOperationIds || []).map(String),
        words: (semantic?.retrievalLexicalSenses || []).map((sense) => sense.english),
      },
      authoritativePlan: {
        arc: String(semantic?.chapterTitleRu || ""),
      },
      admitted: {
        grammarOperationIds: semantic?.grammarOperationIds || [],
        reviewOperationIds: semantic?.reviewOperationIds || [],
        newLexicalSenseIds: (semantic?.newLexicalSenses || []).map((sense) => sense.id),
        retrievalLexicalSenseIds: (semantic?.retrievalLexicalSenses || []).map((sense) => sense.id),
        phraseFrames: semantic?.phraseFrames || [],
        scene: String(semantic?.transferContextRu || ""),
        sceneMoment: String(semantic?.learningDeltaRu || ""),
        mode: String(semantic?.role || ""),
        modeFamilies: semantic?.modeFamilies || [],
      },
      contentDigests,
      priorSourceDigests,
      priorQualityEvidence: priorQuality.evidence,
      acceptedPrefixPrerequisiteCoverage: acceptedPrefixCoverage || null,
      semanticReview: {
        requiredAfterDraft: true,
        evidenceBinding: "EXACT_SOURCE_AND_PROJECTION_DIGESTS",
        identityAuthentication: "NOT_CRYPTOGRAPHICALLY_AUTHENTICATED",
      },
      publicationGates: "DEFERRED_TO_RELEASE_COMMAND",
    },
    sourceSnapshots: mandatorySources?.snapshots || new Map(),
  };
}
