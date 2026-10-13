import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./generate_learning_v2_factory_production_audio.mjs", import.meta.url));
const voices = ["ash", "onyx", "nova", "coral"];
const transcript = "The nights are quiet.";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-audio-dry-run-"));
  const releaseDir = path.join(
    root,
    "modules/learning-v2/content/factory_native/generated_release/en/l01/s52",
  );
  const outputDir = path.join(root, "assets/audio/learning-v2/factory-production-v1");
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(releaseDir, "learner.json"), JSON.stringify({
    interactions: [{
      interactionId: "en:l01:s52:i21",
      audioTargetIds: ["target"],
      modePayload: {
        family: "listen_choose",
        referenceAudio: { transcript },
      },
    }],
  }));

  const seedPath = path.join(root, "seed.mp3");
  const ffmpeg = spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
    "-t", "15", "-b:a", "128k", seedPath,
  ], { encoding: "utf8" });
  assert.equal(ffmpeg.status, 0, ffmpeg.stderr);
  const seed = fs.readFileSync(seedPath);
  assert.ok(seed.length > 64 * 1024, `fixture must exercise normalization: ${seed.length} bytes`);

  const entries = voices.map((voiceId) => {
    const filename = `${voiceId}.mp3`;
    const assetPath = `assets/audio/learning-v2/factory-production-v1/${filename}`;
    fs.writeFileSync(path.join(outputDir, filename), seed);
    return {
      transcript,
      voiceId,
      model: "gpt-4o-mini-tts",
      assetPath,
      byteSize: seed.length,
      contentHash: sha256(seed),
      source: "fixture",
    };
  });
  fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify({ entries }));
  return { root, outputDir, originalHash: sha256(seed), originalSize: seed.length };
}

function runGenerator(root, args = []) {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env },
  });
}

test("dry-run leaves every admitted MP3 byte-for-byte unchanged", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

  const output = runGenerator(fixture.root);

  assert.match(output, /"mode": "dry-run"/u);
  for (const voiceId of voices) {
    const bytes = fs.readFileSync(path.join(fixture.outputDir, `${voiceId}.mp3`));
    assert.equal(bytes.length, fixture.originalSize);
    assert.equal(sha256(bytes), fixture.originalHash);
  }
});

test("apply still normalizes admitted MP3 files that exceed the size limit", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

  const output = runGenerator(fixture.root, ["--apply"]);

  assert.match(output, /"mode": "apply"/u);
  for (const voiceId of voices) {
    const bytes = fs.readFileSync(path.join(fixture.outputDir, `${voiceId}.mp3`));
    assert.ok(bytes.length >= 500 && bytes.length <= 64 * 1024, `${voiceId}: ${bytes.length} bytes`);
    assert.notEqual(sha256(bytes), fixture.originalHash);
  }
});
