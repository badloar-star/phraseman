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
const hash = (value) => createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
const configs = [
  ["app/learning_v2_session1_production_audio_v1.ts", "learning-v2-session1-production-audio-coordinate.v1", 1, "assets/audio/learning-v2/session1-production-v1"],
  ["app/learning_v2_es_session1_production_audio_v1.ts", "learning-v2-es-session1-production-audio-coordinate.v1", 1, "assets/audio/learning-v2/es-session1-production-v1"],
  ["app/learning_v2_es_session2_production_audio_v1.ts", "learning-v2-es-session2-production-audio-coordinate.v1", 2, "assets/audio/learning-v2/es-session2-production-v1"],
];
const objects = [];
for (const [sourcePath, schemaVersion, sessionOrdinal, assetDirectory] of configs) {
  const source = fs.readFileSync(path.join(root, sourcePath), "utf8");
  const coordinate = hash({ schemaVersion, lessonOrdinal: 1, sessionOrdinal });
  const localByHash = new Map(fs.readdirSync(path.join(root, assetDirectory)).filter((name) => name.endsWith(".mp3")).map((name) => {
    const absolutePath = path.join(root, assetDirectory, name);
    return [createHash("sha256").update(fs.readFileSync(absolutePath)).digest("hex"), absolutePath];
  }));
  const regex = /\{ transcript: ("(?:[^"\\]|\\.)*"), voiceId: "([^"]+)", contentHash: "([a-f0-9]{64})", byteSize: (\d+) \}/gu;
  for (const match of source.matchAll(regex)) {
    const transcript = JSON.parse(match[1]);
    const voiceId = match[2];
    const contentHash = match[3];
    const byteSize = Number(match[4]);
    const absolutePath = localByHash.get(contentHash);
    if (!absolutePath) throw new Error(`learning_v2_legacy_audio_source_missing:${contentHash}`);
    const bytes = fs.readFileSync(absolutePath);
    if (bytes.byteLength !== byteSize || createHash("sha256").update(bytes).digest("hex") !== contentHash)
      throw new Error(`learning_v2_legacy_audio_source_invalid:${absolutePath}`);
    objects.push({
      absolutePath,
      byteSize,
      contentHash,
      objectPath: [
        "learning-v2/voice-audio",
        coordinate,
        hash({ transcript }),
        hash({ voiceId }),
        `${contentHash}.mp3`,
      ].join("/"),
    });
  }
}
for (const entry of [
  ["assets/audio/learning-v2/legacy-lesson1-remote-v1/i-am-here.mp3", 9056, "ec377ca04f86ac520a375f4253eba796a5003eb7851d656a60e1f0a31ce83931", "learning-v2/voice-audio/72a9cc37126ee713f066dd12511e35e65e3738dc5dfb641588f3631bfa089d35/119b4edd38cf2755de55ff283fd45b3d9cb6bc7a8c219ce8aefd44c80a6a8ade/26ce52efe54cd25e0fced23603f47f7d6fb2949faeeab76ae97775cba1051d22/ec377ca04f86ac520a375f4253eba796a5003eb7851d656a60e1f0a31ce83931.mp3"],
  ["assets/audio/learning-v2/legacy-lesson1-remote-v1/we-are-safe.mp3", 11250, "0747bc515e4d4eeb7a7d9a51ba3ec0a86e0fbf6a5d9a775c664b2af089997e31", "learning-v2/voice-audio/72a9cc37126ee713f066dd12511e35e65e3738dc5dfb641588f3631bfa089d35/6a1e7117c661515d98fbf610decb9e448fefe5907f4431910047061a615b2eb6/26ce52efe54cd25e0fced23603f47f7d6fb2949faeeab76ae97775cba1051d22/0747bc515e4d4eeb7a7d9a51ba3ec0a86e0fbf6a5d9a775c664b2af089997e31.mp3"],
  ["assets/audio/learning-v2/legacy-lesson1-remote-v1/he-is-sick.mp3", 9056, "a716ca57dac8626275a1444c4d8c267b74ae12f8e5596a97668ff12dde701504", "learning-v2/voice-audio/72a9cc37126ee713f066dd12511e35e65e3738dc5dfb641588f3631bfa089d35/776b3588a441d3b81d60bd3ca8127f9825e4bf5f100a544014ad39a837eff608/26ce52efe54cd25e0fced23603f47f7d6fb2949faeeab76ae97775cba1051d22/a716ca57dac8626275a1444c4d8c267b74ae12f8e5596a97668ff12dde701504.mp3"],
  ["assets/audio/learning-v2/legacy-lesson1-remote-v1/it-is-cheap.mp3", 10310, "e635b61775ddffce5cc068aff052983b3930f39538a3d41158f477a259343bff", "learning-v2/voice-audio/72a9cc37126ee713f066dd12511e35e65e3738dc5dfb641588f3631bfa089d35/68c0612bdada55099417ff511281b704572657288fb091faa62392651ba0b0ed/26ce52efe54cd25e0fced23603f47f7d6fb2949faeeab76ae97775cba1051d22/e635b61775ddffce5cc068aff052983b3930f39538a3d41158f477a259343bff.mp3"],
]) {
  const [relativePath, byteSize, contentHash, objectPath] = entry;
  const absolutePath = path.resolve(root, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  if (bytes.byteLength !== byteSize || createHash("sha256").update(bytes).digest("hex") !== contentHash)
    throw new Error(`learning_v2_legacy_audio_source_invalid:${relativePath}`);
  objects.push({ absolutePath, byteSize, contentHash, objectPath });
}
if (!apply && !verifyOnly) {
  console.log(`DRY RUN: ${objects.length} immutable objects`);
  process.exit(0);
}
const app = getApps()[0] ?? initializeApp({
  credential: applicationDefault(), projectId: "phraseman-ea0b3",
  storageBucket: "phraseman-ea0b3.firebasestorage.app",
});
const bucket = getStorage(app).bucket();
let uploaded = 0;
for (const object of objects) {
  const remote = bucket.file(object.objectPath);
  const [exists] = await remote.exists();
  if (!exists && verifyOnly)
    throw new Error(`learning_v2_legacy_audio_remote_missing:${object.objectPath}`);
  if (!exists) {
    await remote.save(fs.readFileSync(object.absolutePath), {
      resumable: false,
      validation: "crc32c",
      preconditionOpts: { ifGenerationMatch: 0 },
      metadata: {
        contentType: "audio/mpeg",
        cacheControl: "private,max-age=31536000,immutable",
        metadata: { sha256: object.contentHash, source: "learning-v2-legacy-production-audio" },
      },
    });
    uploaded += 1;
  }
  const [metadata] = await remote.getMetadata();
  if (Number(metadata.size) !== object.byteSize || metadata.metadata?.sha256 !== object.contentHash)
    throw new Error(`learning_v2_legacy_audio_remote_invalid:${object.objectPath}`);
}
console.log(`${verifyOnly ? "VERIFY" : "PASS"}: uploaded=${uploaded}, verified=${objects.length}`);
