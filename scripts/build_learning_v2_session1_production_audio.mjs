#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { requireOpenAiDevSpendGuard } from "./openai-dev-guard.mjs";
import { requireOpenAiTtsKey } from "./openai-tts-key.mjs";

const root = process.cwd();
const apply = process.argv.includes("--apply");
const outputDir = path.resolve(root, "assets/audio/learning-v2/session1-production-v1");
const manifestPath = path.join(outputDir, "manifest.json");
const model = "gpt-4o-mini-tts";
const voices = Object.freeze(["ash", "onyx", "nova", "coral"]);
const transcripts = Object.freeze([
  { id: "i", text: "I" },
  { id: "am", text: "am" },
  { id: "here", text: "here" },
  { id: "ready", text: "ready" },
  { id: "i-am-here", text: "I am here" },
  { id: "i-am-ready", text: "I am ready" },
]);
const targets = transcripts.flatMap((entry) =>
  voices.map((voice) => Object.freeze({ ...entry, voice })),
);
const estimatedCharacters = targets.reduce((sum, entry) => sum + entry.text.length, 0);

console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  model,
  fileCount: targets.length,
  estimatedCharacters,
  voices,
  transcripts: transcripts.map((entry) => entry.text),
  outputDir: path.relative(root, outputDir).replaceAll("\\", "/"),
}, null, 2));

if (!apply) process.exit(0);

requireOpenAiDevSpendGuard({
  action: "Learning V2 English lesson 1 session 1 production voice pack",
  estimatedCostUsd: 0.01,
  units: targets.length,
});
const apiKey = requireOpenAiTtsKey(root);
fs.mkdirSync(outputDir, { recursive: true });

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const results = [];
for (const [index, target] of targets.entries()) {
  const filename = `${target.id}-${target.voice}.mp3`;
  const outputPath = path.join(outputDir, filename);
  if (fs.existsSync(outputPath)) {
    const existing = fs.readFileSync(outputPath);
    if (existing.length >= 500 && existing.length <= 64 * 1024) {
      results.push(Object.freeze({
        transcriptId: target.id,
        transcript: target.text,
        voiceId: target.voice,
        model,
        filename,
        byteSize: existing.length,
        contentHash: sha256(existing),
      }));
      console.log(`reused ${index + 1}/${targets.length} ${filename} ${existing.length}B`);
      continue;
    }
  }
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice: target.voice,
      input: target.text,
      response_format: "mp3",
      instructions:
        "Natural, warm American English learning voice. Say the exact supplied text once, clearly and confidently, with no introduction, no repetition, and no added words.",
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`tts_failed:${response.status}:${target.id}:${target.voice}:${detail}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 500 || bytes.length > 64 * 1024) {
    throw new Error(`tts_invalid_size:${target.id}:${target.voice}:${bytes.length}`);
  }
  fs.writeFileSync(outputPath, bytes);
  results.push(Object.freeze({
    transcriptId: target.id,
    transcript: target.text,
    voiceId: target.voice,
    model,
    filename,
    byteSize: bytes.length,
    contentHash: sha256(bytes),
  }));
  console.log(`generated ${index + 1}/${targets.length} ${filename} ${bytes.length}B`);
}

fs.writeFileSync(manifestPath, `${JSON.stringify({
  schemaVersion: "learning-v2-session1-production-audio-manifest.v1",
  generatedAt: new Date().toISOString(),
  model,
  entries: results,
}, null, 2)}\n`, "utf8");
console.log(`manifest ${path.relative(root, manifestPath).replaceAll("\\", "/")}`);
