import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { verifyLearningV2SessionAudioEvidence } from "./verify_learning_v2_session_audio_evidence.mjs";

const voices = ["ash", "onyx", "nova", "coral"];
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-session-audio-evidence-"));
  const courseRoot = path.join(root, "content/learning-v2-course");
  const sourceDir = path.join(courseRoot, "sessions/en/l01/s01");
  const releaseDir = path.join(courseRoot, "release/en/l01/s01");
  const productionDir = path.join(root, "assets/audio/learning-v2/factory-production-v1");
  const bootstrapDir = path.join(root, "assets/audio/learning-v2-bootstrap-v1");
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.mkdirSync(productionDir, { recursive: true });
  fs.mkdirSync(bootstrapDir, { recursive: true });
  for (const name of ["final.ru.md", "final.uk.md", "practice.atomic.json"])
    fs.writeFileSync(path.join(sourceDir, name), `${name}:current`);
  fs.writeFileSync(path.join(releaseDir, "learner.json"), JSON.stringify({
    interactions: [{
      interactionId: "en:lesson-01:session-01:i01",
      modePayload: { referenceAudio: { audioTargetId: "target:here", transcript: "here" } },
    }],
  }));
  const seedPath = path.join(root, "seed.mp3");
  const generated = spawnSync("ffmpeg", [
    "-v", "error", "-y",
    "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
    "-t", "0.2", "-codec:a", "libmp3lame", "-ar", "24000", "-ac", "1",
    seedPath,
  ], { encoding: "utf8" });
  assert.equal(generated.status, 0, generated.stderr);
  const seedBytes = fs.readFileSync(seedPath);
  const entries = voices.map((voiceId) => {
    const bytes = seedBytes;
    const contentHash = sha256(bytes);
    const assetPath = `assets/audio/learning-v2/factory-production-v1/here-${voiceId}.mp3`;
    fs.writeFileSync(path.join(root, assetPath), bytes);
    fs.writeFileSync(path.join(bootstrapDir, `${contentHash}.mp3`), bytes);
    return { transcript: "here", voiceId, assetPath, byteSize: bytes.length, contentHash };
  });
  const manifestPath = path.join(productionDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ voices, entries }));
  const bootstrapModulePath = path.join(root, "app/learning_v2_bootstrap_audio_assets_v1.generated.ts");
  fs.mkdirSync(path.dirname(bootstrapModulePath), { recursive: true });
  fs.writeFileSync(bootstrapModulePath, entries.map((entry) =>
    `Object.freeze({ transcript: ${JSON.stringify(entry.transcript)}, voiceId: ${JSON.stringify(entry.voiceId)} as const, contentHash: ${JSON.stringify(entry.contentHash)}, byteSize: ${entry.byteSize}, assetModule: require("../assets/audio/learning-v2-bootstrap-v1/${entry.contentHash}.mp3") }),`,
  ).join("\n"));
  return { root, courseRoot, entries };
}

test("writes hash-bound structural and full-decode evidence for every transcript x voice coordinate", (t) => {
  const value = fixture();
  t.after(() => fs.rmSync(value.root, { recursive: true, force: true }));
  const calls = [];
  const receiptPath = path.join(value.root, "evidence/receipt.json");
  const receipt = verifyLearningV2SessionAudioEvidence({
    root: value.root,
    courseRoot: value.courseRoot,
    session: "en/l01/s01",
    writeReceipt: receiptPath,
    parityIssues: () => [],
    now: () => "2026-10-12T00:00:00.000Z",
    runMediaTool: (tool, args) => {
      calls.push({ tool, args });
      return tool === "ffprobe"
        ? { status: 0, stdout: JSON.stringify({ streams: [{ codec_name: "mp3", sample_rate: "24000", channels: 1, duration: "0.8" }], format: { duration: "0.8" } }), stderr: "" }
        : { status: 0, stdout: "", stderr: "" };
    },
  });
  assert.equal(receipt.status, "PASS");
  assert.equal(receipt.semanticAudioVerified, false);
  assert.equal(receipt.coordinates.length, 4);
  assert.deepEqual(receipt.coordinates.map((row) => row.voiceId), voices);
  assert.ok(receipt.coordinates.every((row) => row.fullDecodeVerified === true));
  assert.ok(receipt.coordinates.every((row) => row.probe.sampleRate === 24000 && row.probe.channels === 1));
  assert.equal(calls.filter((call) => call.tool === "ffprobe").length, 4);
  assert.equal(calls.filter((call) => call.tool === "ffmpeg").length, 4);
  assert.equal(JSON.parse(fs.readFileSync(receiptPath, "utf8")).evidenceSha256, receipt.evidenceSha256);
});

test("holds before media inspection and never writes a receipt when source and release are stale", (t) => {
  const value = fixture();
  t.after(() => fs.rmSync(value.root, { recursive: true, force: true }));
  const receiptPath = path.join(value.root, "evidence/receipt.json");
  let calls = 0;
  assert.throws(() => verifyLearningV2SessionAudioEvidence({
    root: value.root,
    courseRoot: value.courseRoot,
    session: "en/l01/s01",
    writeReceipt: receiptPath,
    parityIssues: () => ["source_release_parity:practice.atomic.json"],
    runMediaTool: () => { calls += 1; return { status: 0, stdout: "", stderr: "" }; },
  }), /AUDIO EVIDENCE HOLD: source_release_stale:en\/l01\/s01:issueCount=1:issuesSha256=[a-f0-9]{64}/u);
  assert.equal(calls, 0);
  assert.equal(fs.existsSync(receiptPath), false);
});

test("genuine pass path probes and fully decodes fixture MP3 files with installed ffmpeg", (t) => {
  const value = fixture();
  t.after(() => fs.rmSync(value.root, { recursive: true, force: true }));
  const receipt = verifyLearningV2SessionAudioEvidence({
    root: value.root,
    courseRoot: value.courseRoot,
    session: "en/l01/s01",
    parityIssues: () => [],
  });
  assert.equal(receipt.coordinates.length, 4);
  assert.ok(receipt.coordinates.every((row) => row.probe.codecName === "mp3"));
  assert.ok(receipt.coordinates.every((row) => row.fullDecodeVerified));
});
