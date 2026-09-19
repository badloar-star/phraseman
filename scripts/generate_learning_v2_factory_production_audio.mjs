#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  requireCodexOpenAiTtsOnly,
  requireOpenAiDevSpendGuard,
} from "./openai-dev-guard.mjs";
import { requireOpenAiTtsKey } from "./openai-tts-key.mjs";

const root = process.cwd();
const apply = process.argv.includes("--apply");
const concurrencyArg = process.argv.find((value) => value.startsWith("--concurrency="));
const concurrency = Math.max(1, Math.min(8, Number(concurrencyArg?.split("=")[1] ?? 6)));
const model = "gpt-4o-mini-tts";
const voices = Object.freeze(["ash", "onyx", "nova", "coral"]);
const releaseRoot = path.resolve(root, "modules/learning-v2/content/factory_native/generated_release/en");
const outputDir = path.resolve(root, "assets/audio/learning-v2/factory-production-v1");
const manifestPath = path.join(outputDir, "manifest.json");
const legacyManifestPath = path.resolve(root, "assets/audio/learning-v2/session1-production-v1/manifest.json");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const coordinateKey = (transcript, voiceId) => `${transcript}\u0000${voiceId}`;

function normalizeMp3Size(filePath) {
  let bytes = fs.readFileSync(filePath);
  if (bytes.length <= 64 * 1024) return bytes;
  const temporary = `${filePath}.compressed.mp3`;
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", filePath,
    "-ac", "1", "-b:a", "24k", "-map_metadata", "-1", temporary,
  ], { stdio: "pipe" });
  if (result.status !== 0 || !fs.existsSync(temporary)) {
    throw new Error(`tts_compression_failed:${path.basename(filePath)}`);
  }
  fs.renameSync(temporary, filePath);
  bytes = fs.readFileSync(filePath);
  if (bytes.length < 500 || bytes.length > 64 * 1024) {
    throw new Error(`tts_compressed_size_invalid:${bytes.length}`);
  }
  return bytes;
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function transcriptsFor(interaction) {
  const payload = interaction?.modePayload;
  const references = payload?.family === "sound_contrast"
    ? [payload.audioA, payload.audioB]
    : [payload?.referenceAudio];
  return references
    .map((reference) => typeof reference?.transcript === "string"
      ? reference.transcript.normalize("NFKC").trim()
      : "")
    .filter(Boolean);
}

const transcripts = new Set();
for (const file of walk(releaseRoot).filter((entry) => path.basename(entry) === "learner.json")) {
  const learner = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const interaction of learner.interactions) {
    if (!Array.isArray(interaction.audioTargetIds) || interaction.audioTargetIds.length === 0) continue;
    const values = transcriptsFor(interaction);
    if (values.length === 0) throw new Error(`audio_transcript_missing:${interaction.interactionId}`);
    values.forEach((value) => transcripts.add(value));
  }
}

const targets = [...transcripts].sort().flatMap((transcript) =>
  voices.map((voiceId) => Object.freeze({ transcript, voiceId })),
);
const known = new Map();
if (fs.existsSync(legacyManifestPath)) {
  const legacy = JSON.parse(fs.readFileSync(legacyManifestPath, "utf8"));
  for (const entry of legacy.entries ?? []) {
    const absolute = path.resolve(path.dirname(legacyManifestPath), entry.filename);
    if (!fs.existsSync(absolute)) continue;
    known.set(coordinateKey(entry.transcript.normalize("NFKC").trim(), entry.voiceId), {
      transcript: entry.transcript.normalize("NFKC").trim(),
      voiceId: entry.voiceId,
      model: entry.model ?? model,
      assetPath: path.relative(root, absolute).replaceAll("\\", "/"),
      byteSize: entry.byteSize,
      contentHash: entry.contentHash,
      source: "reused_session1",
    });
  }
}
if (fs.existsSync(manifestPath)) {
  const previous = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const entry of previous.entries ?? []) {
    const absolute = path.resolve(root, entry.assetPath);
    if (!fs.existsSync(absolute)) continue;
    const original = fs.readFileSync(absolute);
    if (original.length !== entry.byteSize || sha256(original) !== entry.contentHash) continue;
    const bytes = normalizeMp3Size(absolute);
    known.set(coordinateKey(entry.transcript, entry.voiceId), {
      ...entry,
      byteSize: bytes.length,
      contentHash: sha256(bytes),
    });
  }
}

const missing = targets.filter((target) => !known.has(coordinateKey(target.transcript, target.voiceId)));
const estimatedCharacters = missing.reduce((sum, target) => sum + target.transcript.length, 0);
const estimatedWords = missing.reduce((sum, target) => sum + target.transcript.split(/\s+/u).filter(Boolean).length, 0);
const estimatedAudioMinutes = estimatedWords / 145;
const estimatedCostUsd = Math.max(0.01, estimatedAudioMinutes * 0.03);
console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  model,
  voices,
  uniqueTranscriptCount: transcripts.size,
  expectedFileCount: targets.length,
  reusableFileCount: targets.length - missing.length,
  missingFileCount: missing.length,
  estimatedCharacters,
  estimatedAudioMinutes: Number(estimatedAudioMinutes.toFixed(2)),
  conservativeEstimatedCostUsd: Number(estimatedCostUsd.toFixed(2)),
  concurrency,
  outputDir: path.relative(root, outputDir).replaceAll("\\", "/"),
}, null, 2));
if (!apply || missing.length === 0) process.exit(0);

requireCodexOpenAiTtsOnly({
  action: "Learning V2 factory production voice pack",
  endpoint: "audio/speech",
});
requireOpenAiDevSpendGuard({
  action: "Learning V2 factory production voice pack",
  estimatedCostUsd,
  units: missing.length,
});
const apiKey = requireOpenAiTtsKey(root);
fs.mkdirSync(outputDir, { recursive: true });

let completed = 0;
function writeManifest() {
  const entries = targets
    .map((target) => known.get(coordinateKey(target.transcript, target.voiceId)))
    .filter(Boolean);
  fs.writeFileSync(manifestPath, `${JSON.stringify({
    schemaVersion: "learning-v2-factory-production-audio-manifest.v1",
    generatedAt: new Date().toISOString(),
    model,
    voices,
    expectedEntryCount: targets.length,
    entries,
  }, null, 2)}\n`, "utf8");
}

async function generate(target) {
  const transcriptHash = sha256(target.transcript).slice(0, 24);
  const filename = `${transcriptHash}-${target.voiceId}.mp3`;
  const outputPath = path.join(outputDir, filename);
  let lastError = null;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          voice: target.voiceId,
          input: target.transcript,
          response_format: "mp3",
          speed: 1.08,
          instructions: "Natural, warm American English learning voice. Say the exact supplied text once, clearly and confidently, with no introduction, no repetition, and no added words. Keep pauses brief.",
        }),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        throw new Error(`tts_failed:${response.status}:${detail}`);
      }
      const received = Buffer.from(await response.arrayBuffer());
      if (received.length < 500 || received.length > 256 * 1024) {
        throw new Error(`tts_invalid_size:${received.length}`);
      }
      fs.writeFileSync(outputPath, received);
      const bytes = normalizeMp3Size(outputPath);
      return Object.freeze({
        transcript: target.transcript,
        voiceId: target.voiceId,
        model,
        assetPath: path.relative(root, outputPath).replaceAll("\\", "/"),
        byteSize: bytes.length,
        contentHash: sha256(bytes),
        source: "generated_factory_v1",
      });
    } catch (error) {
      lastError = error;
      if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** (attempt - 1)));
    }
  }
  throw new Error(`tts_exhausted:${target.voiceId}:${target.transcript}:${String(lastError)}`);
}

let next = 0;
const workers = Array.from({ length: Math.min(concurrency, missing.length) }, async () => {
  for (;;) {
    const index = next;
    next += 1;
    if (index >= missing.length) return;
    const target = missing[index];
    const entry = await generate(target);
    known.set(coordinateKey(target.transcript, target.voiceId), entry);
    completed += 1;
    if (completed % 10 === 0 || completed === missing.length) writeManifest();
    if (completed % 50 === 0 || completed === missing.length) {
      console.log(`generated ${completed}/${missing.length}`);
    }
  }
});
await Promise.all(workers);
writeManifest();
console.log(`manifest ${path.relative(root, manifestPath).replaceAll("\\", "/")}`);
