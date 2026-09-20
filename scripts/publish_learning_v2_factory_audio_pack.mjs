#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const apply = process.argv.includes("--apply");
const verifyOnly = process.argv.includes("--verify");
if (apply && verifyOnly) throw new Error("choose_exactly_one_of_apply_or_verify");
const root = process.cwd();
const manifestPath = path.join(root, "assets/audio/learning-v2/factory-production-v1/manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const hash = (value) => createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
const packCoordinate = hash({ schemaVersion: "learning-v2-factory-production-audio-pack.v1" });
const bucketName = "phraseman-ea0b3.firebasestorage.app";

const objects = manifest.entries.map((entry) => ({
  ...entry,
  absolutePath: path.resolve(root, entry.assetPath),
  objectPath: [
    "learning-v2/voice-audio",
    packCoordinate,
    hash({ transcript: entry.transcript }),
    hash({ voiceId: entry.voiceId }),
    `${entry.contentHash}.mp3`,
  ].join("/"),
}));

for (const object of objects) {
  const bytes = fs.readFileSync(object.absolutePath);
  if (bytes.byteLength !== object.byteSize || createHash("sha256").update(bytes).digest("hex") !== object.contentHash)
    throw new Error(`learning_v2_factory_audio_source_invalid:${object.assetPath}`);
}

if (!apply && !verifyOnly) {
  const totalBytes = objects.reduce((sum, object) => sum + object.byteSize, 0);
  console.log(`DRY RUN: ${objects.length} immutable objects, ${totalBytes} bytes`);
  process.exit(0);
}

const app = getApps()[0] ?? initializeApp({
  credential: applicationDefault(),
  projectId: "phraseman-ea0b3",
  storageBucket: bucketName,
});
const bucket = getStorage(app).bucket(bucketName);
let next = 0;
let uploaded = 0;
let verified = 0;
const workers = Array.from({ length: 16 }, async () => {
  for (;;) {
    const index = next++;
    if (index >= objects.length) return;
    const object = objects[index];
    const remote = bucket.file(object.objectPath);
    const [exists] = await remote.exists();
    if (!exists && verifyOnly)
      throw new Error(`learning_v2_factory_audio_remote_missing:${object.objectPath}`);
    if (!exists) {
      await remote.save(fs.readFileSync(object.absolutePath), {
        resumable: false,
        validation: "crc32c",
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: {
          contentType: "audio/mpeg",
          cacheControl: "private,max-age=31536000,immutable",
          metadata: { sha256: object.contentHash, source: "learning-v2-factory-production-v1" },
        },
      });
      uploaded += 1;
    }
    const [metadata] = await remote.getMetadata();
    if (Number(metadata.size) !== object.byteSize || metadata.metadata?.sha256 !== object.contentHash)
      throw new Error(`learning_v2_factory_audio_remote_invalid:${object.objectPath}`);
    verified += 1;
    if (verified % 200 === 0) console.log(`verified ${verified}/${objects.length}`);
  }
});
await Promise.all(workers);
console.log(`${verifyOnly ? "VERIFY" : "PASS"}: uploaded=${uploaded}, verified=${verified}, total=${objects.length}`);
