#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sourceReleaseScopeIssues } from "../content/learning-v2-course/pipeline/build_release.mjs";

const REQUIRED_VOICES = Object.freeze(["ash", "onyx", "nova", "coral"]);
const RECEIPT_SCHEMA = "learning-v2-session-audio-evidence.v1";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hold(condition, detail = "") {
  throw new Error(`AUDIO EVIDENCE HOLD: ${condition}${detail ? `:${detail}` : ""}`);
}

function requireFile(filePath, condition) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) hold(condition, filePath);
}

function hashFile(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function collectAudioReferences(value, rows = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectAudioReferences(entry, rows));
    return rows;
  }
  if (!value || typeof value !== "object") return rows;
  if (typeof value.audioTargetId === "string" && typeof value.transcript === "string") {
    const transcript = value.transcript.normalize("NFKC").trim();
    const audioTargetId = value.audioTargetId.trim();
    if (transcript && audioTargetId) rows.push({ transcript, audioTargetId });
  }
  Object.values(value).forEach((entry) => collectAudioReferences(entry, rows));
  return rows;
}

function defaultRunMediaTool(tool, args) {
  return spawnSync(tool, args, { encoding: "utf8", windowsHide: true });
}

function inspectMedia(assetFile, runMediaTool) {
  const probe = runMediaTool("ffprobe", [
    "-v", "error",
    "-select_streams", "a:0",
    "-show_entries", "stream=codec_name,sample_rate,channels,duration:format=duration",
    "-of", "json",
    assetFile,
  ]);
  if (probe.error || probe.status !== 0)
    hold("ffprobe_failed", `${assetFile}:${probe.error?.message ?? String(probe.stderr ?? "").trim()}`);
  let parsed;
  try { parsed = JSON.parse(String(probe.stdout ?? "")); }
  catch { hold("ffprobe_invalid_json", assetFile); }
  const stream = parsed?.streams?.[0];
  const durationSeconds = Number(stream?.duration ?? parsed?.format?.duration);
  if (
    stream?.codec_name !== "mp3" ||
    Number(stream?.sample_rate) !== 24_000 ||
    Number(stream?.channels) !== 1 ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) hold("audio_format_invalid", assetFile);
  const decode = runMediaTool("ffmpeg", [
    "-v", "error",
    "-i", assetFile,
    "-map", "0:a:0",
    "-f", "null",
    "-",
  ]);
  if (decode.error || decode.status !== 0 || String(decode.stderr ?? "").trim())
    hold("ffmpeg_full_decode_failed", `${assetFile}:${decode.error?.message ?? String(decode.stderr ?? "").trim()}`);
  return Object.freeze({
    probe: Object.freeze({
      codecName: "mp3",
      sampleRate: 24_000,
      channels: 1,
      durationSeconds,
    }),
    fullDecodeVerified: true,
  });
}

function writeJsonAtomically(targetPath, value) {
  const absolute = path.resolve(targetPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.renameSync(temporary, absolute);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  }
}

export function verifyLearningV2SessionAudioEvidence({
  root = process.cwd(),
  courseRoot = path.join(root, "content/learning-v2-course"),
  session,
  writeReceipt = null,
  parityIssues = ({ root: parityRoot, scope, locales }) => sourceReleaseScopeIssues({ root: parityRoot, scope, locales }),
  runMediaTool = defaultRunMediaTool,
  now = () => new Date().toISOString(),
} = {}) {
  if (!/^[a-z]{2}\/l\d{2}\/s\d{2}$/u.test(String(session ?? "")))
    hold("session_invalid", String(session ?? ""));
  const staleIssues = parityIssues({ root: courseRoot, scope: session, locales: ["ru", "uk"] });
  if (!Array.isArray(staleIssues)) hold("source_release_parity_invalid_result");
  if (staleIssues.length) {
    const normalizedIssues = staleIssues.map(String);
    hold(
      "source_release_stale",
      `${session}:issueCount=${normalizedIssues.length}:issuesSha256=${sha256(stableJson(normalizedIssues))}`,
    );
  }

  const sourceDir = path.join(courseRoot, "sessions", session);
  const releaseDir = path.join(courseRoot, "release", session);
  const learnerPath = path.join(releaseDir, "learner.json");
  const manifestPath = path.join(root, "assets/audio/learning-v2/factory-production-v1/manifest.json");
  const bootstrapModulePath = path.join(root, "app/learning_v2_bootstrap_audio_assets_v1.generated.ts");
  const inputPaths = [
    path.join(sourceDir, "final.ru.md"),
    path.join(sourceDir, "final.uk.md"),
    path.join(sourceDir, "practice.atomic.json"),
    learnerPath,
    manifestPath,
    bootstrapModulePath,
  ];
  inputPaths.forEach((filePath) => requireFile(filePath, "input_missing"));

  const learner = JSON.parse(fs.readFileSync(learnerPath, "utf8"));
  const references = collectAudioReferences(learner.interactions);
  const transcriptTargets = new Map();
  for (const reference of references) {
    const ids = transcriptTargets.get(reference.transcript) ?? new Set();
    ids.add(reference.audioTargetId);
    transcriptTargets.set(reference.transcript, ids);
  }
  if (transcriptTargets.size === 0) hold("release_audio_targets_missing", session);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (JSON.stringify(manifest.voices) !== JSON.stringify(REQUIRED_VOICES))
    hold("voice_manifest_contract_invalid", JSON.stringify(manifest.voices ?? null));
  if (!Array.isArray(manifest.entries)) hold("voice_manifest_entries_missing");
  const byCoordinate = new Map();
  for (const entry of manifest.entries) {
    const key = `${entry.transcript}\u0000${entry.voiceId}`;
    if (byCoordinate.has(key)) hold("voice_manifest_duplicate_coordinate", key.replace("\u0000", ":"));
    byCoordinate.set(key, entry);
  }
  const bootstrapModule = fs.readFileSync(bootstrapModulePath, "utf8");
  const coordinates = [];
  for (const transcript of [...transcriptTargets.keys()].sort()) {
    for (const voiceId of REQUIRED_VOICES) {
      const entry = byCoordinate.get(`${transcript}\u0000${voiceId}`);
      if (!entry) hold("voice_manifest_coordinate_missing", `${transcript}:${voiceId}`);
      const assetFile = path.resolve(root, String(entry.assetPath ?? ""));
      requireFile(assetFile, "factory_asset_missing");
      const bytes = fs.readFileSync(assetFile);
      if (bytes.byteLength !== entry.byteSize) hold("factory_asset_byte_size_mismatch", `${transcript}:${voiceId}`);
      if (sha256(bytes) !== entry.contentHash) hold("factory_asset_sha256_mismatch", `${transcript}:${voiceId}`);
      const bootstrapRelativePath = `assets/audio/learning-v2-bootstrap-v1/${entry.contentHash}.mp3`;
      const bootstrapFile = path.join(root, bootstrapRelativePath);
      requireFile(bootstrapFile, "bootstrap_asset_missing");
      const bootstrapBytes = fs.readFileSync(bootstrapFile);
      if (bootstrapBytes.byteLength !== entry.byteSize || sha256(bootstrapBytes) !== entry.contentHash)
        hold("bootstrap_asset_integrity_mismatch", `${transcript}:${voiceId}`);
      const bindingLine = bootstrapModule.split(/\r?\n/u).find((line) =>
        line.includes(`transcript: ${JSON.stringify(transcript)}`) &&
        line.includes(`voiceId: ${JSON.stringify(voiceId)}`));
      if (
        !bindingLine ||
        !bindingLine.includes(`contentHash: ${JSON.stringify(entry.contentHash)}`) ||
        !bindingLine.includes(`byteSize: ${entry.byteSize}`) ||
        !bindingLine.includes(`require("../assets/audio/learning-v2-bootstrap-v1/${entry.contentHash}.mp3")`)
      ) hold("bootstrap_require_binding_missing", `${transcript}:${voiceId}`);
      const media = inspectMedia(assetFile, runMediaTool);
      coordinates.push(Object.freeze({
        transcript,
        audioTargetIds: Object.freeze([...transcriptTargets.get(transcript)].sort()),
        voiceId,
        assetPath: path.relative(root, assetFile).replaceAll("\\", "/"),
        bootstrapAssetPath: bootstrapRelativePath,
        byteSize: entry.byteSize,
        sha256: entry.contentHash,
        bootstrapRequireBound: true,
        ...media,
      }));
    }
  }
  const body = {
    schemaVersion: RECEIPT_SCHEMA,
    status: "PASS",
    session,
    generatedAt: now(),
    sourceReleaseCurrent: true,
    semanticAudioVerified: false,
    inputHashes: Object.freeze(Object.fromEntries(inputPaths.map((filePath) => [
      path.relative(root, filePath).replaceAll("\\", "/"),
      hashFile(filePath),
    ]))),
    transcriptCount: transcriptTargets.size,
    requiredVoiceIds: REQUIRED_VOICES,
    coordinates: Object.freeze(coordinates),
  };
  const receipt = Object.freeze({ ...body, evidenceSha256: sha256(stableJson(body)) });
  if (writeReceipt) writeJsonAtomically(path.isAbsolute(writeReceipt) ? writeReceipt : path.join(root, writeReceipt), receipt);
  return receipt;
}

function parseCli(argv) {
  let session = null;
  let writeReceipt = null;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--session" && argv[index + 1]) session = argv[++index];
    else if (argument === "--write-receipt" && argv[index + 1]) writeReceipt = argv[++index];
    else throw new Error(`unknown_or_incomplete_argument:${argument}`);
  }
  if (!session) throw new Error("required_argument_missing:--session");
  return { session, writeReceipt };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const receipt = verifyLearningV2SessionAudioEvidence(parseCli(process.argv.slice(2)));
    console.log(JSON.stringify({
      status: receipt.status,
      session: receipt.session,
      transcriptCount: receipt.transcriptCount,
      coordinateCount: receipt.coordinates.length,
      semanticAudioVerified: receipt.semanticAudioVerified,
      evidenceSha256: receipt.evidenceSha256,
    }, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
