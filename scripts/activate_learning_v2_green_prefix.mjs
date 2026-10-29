#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateSessionAcceptanceReceipt } from "../content/learning-v2-course/pipeline/session_acceptance_receipt.mjs";
import { writeMockupFile } from "../content/learning-v2-course/pipeline/write_mockup_file.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, "..");
const VOICES = Object.freeze(["ash", "onyx", "nova", "coral"]);
const SESSION_RE = /^en\/l01\/s(\d{2})$/u;
const HEX_64_RE = /^[a-f0-9]{64}$/u;
const AUDIO_OMISSION_POLICY = "content/learning-v2-course/activation/en/runtime-audio-omissions.v1.json";

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function absoluteInside(repoRoot, relativePath, label) {
  const root = path.resolve(repoRoot);
  const absolute = path.resolve(root, relativePath);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label}_escaped_repo:${relativePath}`);
  }
  return absolute;
}

function audioTable(repoRoot) {
  const manifestPath = path.join(
    repoRoot,
    "assets/audio/learning-v2/factory-production-v1/manifest.json",
  );
  const manifest = readJson(manifestPath);
  if (!Array.isArray(manifest.entries)) throw new Error("audio_manifest_invalid");
  const table = new Map();
  for (const entry of manifest.entries) {
    if (!entry || typeof entry.transcript !== "string" || typeof entry.voiceId !== "string") continue;
    const assetPath = absoluteInside(repoRoot, entry.assetPath, "audio_asset");
    let valid = false;
    if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
      const bytes = fs.readFileSync(assetPath);
      valid = bytes.length === entry.byteSize && sha256(bytes) === entry.contentHash;
    }
    table.set(`${entry.transcript}\u0000${entry.voiceId}`, valid);
  }
  return table;
}

function runtimeAudioRequirements(learner) {
  const requirements = [];
  for (const interaction of learner.interactions ?? []) {
    const payload = interaction?.modePayload ?? {};
    const references = [payload.referenceAudio, payload.slowReferenceAudio, payload.audioA, payload.audioB]
      .filter((reference) => reference && typeof reference.transcript === "string");
    for (const reference of references) {
      for (const voiceId of VOICES) {
        requirements.push({
          interactionId: interaction.interactionId,
          transcript: reference.transcript,
          voiceId,
          use: "interaction",
        });
      }
    }
  }
  return requirements.filter((requirement, index, all) =>
    all.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(requirement)) === index);
}

function runtimeAudioOmissionPolicies(repoRoot) {
  const manifest = readJson(absoluteInside(repoRoot, AUDIO_OMISSION_POLICY, "audio_omission_policy"));
  if (manifest.schemaVersion !== "learning_v2_runtime_audio_omissions_v1" || !Array.isArray(manifest.sessions)) {
    throw new Error("runtime_audio_omission_policy_invalid");
  }
  const policies = new Map();
  for (const policy of manifest.sessions) {
    if (
      !policy || typeof policy !== "object" ||
      !SESSION_RE.test(String(policy.session ?? "")) ||
      typeof policy.courseSessionId !== "string" ||
      typeof policy.runtimeCourseSessionId !== "string" ||
      !HEX_64_RE.test(String(policy.candidateBundleSha256 ?? "")) ||
      !HEX_64_RE.test(String(policy.factorySourceFingerprint ?? "")) ||
      !Array.isArray(policy.disabledInteractionIds) || policy.disabledInteractionIds.length === 0 ||
      policy.disabledInteractionIds.some((id) => typeof id !== "string") ||
      new Set(policy.disabledInteractionIds).size !== policy.disabledInteractionIds.length ||
      !Array.isArray(policy.runtimeDisabledInteractionIds) ||
      policy.runtimeDisabledInteractionIds.length !== policy.disabledInteractionIds.length ||
      policy.runtimeDisabledInteractionIds.some((id) => typeof id !== "string") ||
      new Set(policy.runtimeDisabledInteractionIds).size !== policy.runtimeDisabledInteractionIds.length ||
      policies.has(policy.session)
    ) throw new Error("runtime_audio_omission_policy_invalid");
    policies.set(policy.session, policy);
  }
  return policies;
}

function candidateProjectionFiles(manifest, session) {
  const expectedPrefix = `${session}/`;
  const files = (manifest.candidateFiles ?? []).filter((entry) =>
    typeof entry?.path === "string" && entry.path.startsWith(expectedPrefix));
  const expectedNames = ["answers.json", "auxiliary.json", "intro.json", "learner.json", "learner.uk.json"];
  const actualNames = files.map((entry) => path.posix.basename(entry.path)).sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error(`candidate_projection_incomplete:${session}`);
  }
  return files;
}

function projectedFactorySourceFingerprint(repoRoot, manifest, candidateFiles, session) {
  const names = ["intro.json", "learner.json", "answers.json", "learner.uk.json", "auxiliary.json"];
  const byName = new Map(candidateFiles.map((entry) => [path.posix.basename(entry.path), entry]));
  const releaseBytes = names.map((name) => {
    const entry = byName.get(name);
    if (!entry) throw new Error(`candidate_projection_incomplete:${session}`);
    return fs.readFileSync(
      absoluteInside(repoRoot, `${manifest.candidateRoot}/${entry.path}`, "candidate_file"),
      "utf8",
    );
  }).join("\u0000");
  const short = session.slice(-3);
  const sourceRoot = `content/learning-v2-course/sessions/en/l01/${short}`;
  const sourceRu = fs.readFileSync(absoluteInside(repoRoot, `${sourceRoot}/final.ru.md`, "source_file"), "utf8");
  const sourceUk = fs.readFileSync(absoluteInside(repoRoot, `${sourceRoot}/final.uk.md`, "source_file"), "utf8");
  return sha256(`${sourceRu}\u0000${sourceUk}\u0000${releaseBytes}`);
}

export function assertSessionCanonicalForActivation({ acceptance, manifest, session }) {
  if (
    acceptance?.session !== session
    || acceptance?.candidateBundleSha256 !== manifest?.candidateBundleSha256
    || acceptance?.state !== "TEXT_CANONICAL"
  ) throw new Error(`acceptance_manifest_mismatch:${session}`);
}

export async function planAcceptedGreenPrefix({ repoRoot = DEFAULT_ROOT, requestedThrough } = {}) {
  const match = SESSION_RE.exec(String(requestedThrough ?? ""));
  if (!match) throw new Error(`requested_through_invalid:${requestedThrough}`);
  const requestedOrdinal = Number(match[1]);
  const audio = audioTable(repoRoot);
  const omissionPolicies = runtimeAudioOmissionPolicies(repoRoot);
  const sessions = [];
  let blockedAt = null;

  for (let ordinal = 1; ordinal <= requestedOrdinal; ordinal += 1) {
    const short = `s${String(ordinal).padStart(2, "0")}`;
    const session = `en/l01/${short}`;
    const manifestPath = path.join(
      repoRoot,
      "content/learning-v2-course/sessions/en/l01",
      short,
      "owner-review-preview-manifest.json",
    );
    if (!fs.existsSync(manifestPath)) throw new Error(`green_manifest_missing_or_not_canonical:${session}`);
    const manifest = readJson(manifestPath);
    if (manifest.reviewStatus !== "TEXT_CANONICAL" || manifest.textVerified !== true) {
      throw new Error(`green_manifest_missing_or_not_canonical:${session}`);
    }
  }

  for (let ordinal = 1; ordinal <= requestedOrdinal; ordinal += 1) {
    const short = `s${String(ordinal).padStart(2, "0")}`;
    const session = `en/l01/${short}`;
    const manifestPath = path.join(
      repoRoot,
      "content/learning-v2-course/sessions/en/l01",
      short,
      "owner-review-preview-manifest.json",
    );
    if (!fs.existsSync(manifestPath)) throw new Error(`green_manifest_missing_or_not_canonical:${session}`);
    const manifest = readJson(manifestPath);
    if (manifest.reviewStatus !== "TEXT_CANONICAL" || manifest.textVerified !== true) {
      throw new Error(`green_manifest_missing_or_not_canonical:${session}`);
    }
    const acceptance = await validateSessionAcceptanceReceipt({
      repoRoot,
      acceptanceReceiptPath: manifest.acceptanceReceiptPath,
    });
    assertSessionCanonicalForActivation({ acceptance, manifest, session });

    const candidateFiles = candidateProjectionFiles(manifest, session);
    for (const entry of candidateFiles) {
      const absolute = absoluteInside(repoRoot, `${manifest.candidateRoot}/${entry.path}`, "candidate_file");
      const bytes = fs.readFileSync(absolute);
      if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) {
        throw new Error(`candidate_file_stale:${entry.path}`);
      }
    }
    const learnerEntry = candidateFiles.find((entry) => entry.path.endsWith("/learner.json"));
    const learner = readJson(absoluteInside(repoRoot, `${manifest.candidateRoot}/${learnerEntry.path}`, "candidate_learner"));
    const missingRuntimeAudio = runtimeAudioRequirements(learner)
      .filter((requirement) => audio.get(`${requirement.transcript}\u0000${requirement.voiceId}`) !== true);
    let disabledSourceInteractionIds = Object.freeze([]);
    if (missingRuntimeAudio.length > 0) {
      const policy = omissionPolicies.get(session);
      const actualMissingIds = [...new Set(missingRuntimeAudio.map((requirement) => requirement.interactionId))].sort();
      const declaredDisabledIds = policy ? [...policy.disabledInteractionIds].sort() : [];
      const projectedSourceFingerprint = projectedFactorySourceFingerprint(
        repoRoot,
        manifest,
        candidateFiles,
        session,
      );
      if (
        !policy ||
        policy.courseSessionId !== manifest.courseSessionId ||
        policy.candidateBundleSha256 !== manifest.candidateBundleSha256 ||
        policy.factorySourceFingerprint !== projectedSourceFingerprint ||
        JSON.stringify(declaredDisabledIds) !== JSON.stringify(actualMissingIds)
      ) {
        blockedAt = Object.freeze({ session, missingRuntimeAudio: Object.freeze(missingRuntimeAudio) });
        break;
      }
      disabledSourceInteractionIds = Object.freeze([...policy.disabledInteractionIds]);
    }
    sessions.push(Object.freeze({
      session,
      manifestPath: path.relative(repoRoot, manifestPath).split(path.sep).join("/"),
      candidateRoot: manifest.candidateRoot,
      candidateFiles: Object.freeze(candidateFiles),
      acceptanceReceiptPath: manifest.acceptanceReceiptPath,
      acceptanceReceiptSha256: manifest.acceptanceReceiptSha256,
      candidateBundleSha256: manifest.candidateBundleSha256,
      disabledSourceInteractionIds,
    }));
  }

  return Object.freeze({
    requestedThrough,
    sessions: Object.freeze(sessions),
    blockedAt,
  });
}

export async function writeAcceptedGreenPrefix({ repoRoot = DEFAULT_ROOT, requestedThrough } = {}) {
  const plan = await planAcceptedGreenPrefix({ repoRoot, requestedThrough });
  for (const session of plan.sessions) {
    for (const entry of session.candidateFiles) {
      const source = absoluteInside(repoRoot, `${session.candidateRoot}/${entry.path}`, "candidate_file");
      const relativeProjection = entry.path;
      for (const base of [
        "content/learning-v2-course/release",
        "modules/learning-v2/content/factory_native/generated_release",
      ]) {
        const destination = absoluteInside(repoRoot, `${base}/${relativeProjection}`, "release_projection");
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        await writeMockupFile(destination, fs.readFileSync(source, "utf8"));
      }
    }
  }
  const activation = {
    schemaVersion: "learning_v2_active_sessions_v1",
    courseReleaseState: "HOLD",
    activeSessions: plan.sessions.map((session) => ({
      session: session.session,
      acceptanceReceiptPath: session.acceptanceReceiptPath,
      acceptanceReceiptSha256: session.acceptanceReceiptSha256,
    })),
  };
  await writeMockupFile(
    path.join(repoRoot, "content/learning-v2-course/activation/en/active-sessions.v1.json"),
    `${JSON.stringify(activation, null, 2)}\n`,
  );
  return plan;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const throughIndex = process.argv.indexOf("--through");
  const requestedThrough = throughIndex >= 0 ? process.argv[throughIndex + 1] : null;
  const write = process.argv.includes("--write");
  const plan = write
    ? await writeAcceptedGreenPrefix({ requestedThrough })
    : await planAcceptedGreenPrefix({ requestedThrough });
  console.log(`[V2-ACTIVATE] ${JSON.stringify({
    mode: write ? "write" : "check",
    requestedThrough: plan.requestedThrough,
    activatedPrefix: plan.sessions.map((entry) => entry.session),
    blockedAt: plan.blockedAt,
  })}`);
}
