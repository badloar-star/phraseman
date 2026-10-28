import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const sha256 = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");
const fail = (reason) => {
  throw new Error(`learning_v2_audio_publish_${reason}`);
};
const args = (values) => {
  const result = { apply: false };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--apply") result.apply = true;
    else if (value.startsWith("--")) result[value.slice(2)] = values[++index];
    else fail("argument_invalid");
  }
  return result;
};

async function main() {
  const options = args(process.argv.slice(2));
  if (!options.root) fail("usage_--root_required");
  const root = path.resolve(options.root);
  const plan = JSON.parse(
    fs.readFileSync(path.join(root, "publish-manifest.json"), "utf8"),
  );
  if (
    plan.schemaVersion !== "learning-v2-audio-publish-plan.v1" ||
    (plan.studyTarget !== "en" && plan.studyTarget !== "es") ||
    !/^[a-f0-9]{64}$/u.test(plan.releaseId) ||
    !Array.isArray(plan.objects)
  )
    fail("plan_invalid");
  const seen = new Set();
  const localObjects = new Map();
  let totalBytes = 0;
  for (const object of plan.objects) {
    const prefix = `learning-v2/voice-audio/v1/${plan.studyTarget}`;
    const immutablePath = new RegExp(
      `^${prefix}/(?:packs/(?:base|delta)-[a-z0-9-]{1,96}-[a-f0-9]{64}\\.bin|releases/${plan.releaseId}/lessons/l\\d{3}-[a-f0-9]{64}\\.json)$`,
      "u",
    );
    const currentObjectPath = `${prefix}/current.json`;
    if (
      typeof object.objectPath !== "string" ||
      (object.immutable
        ? !immutablePath.test(object.objectPath)
        : object.objectPath !== currentObjectPath) ||
      object.objectPath
        .split("/")
        .some((segment) => segment === "." || segment === "..") ||
      seen.has(object.objectPath) ||
      typeof object.localPath !== "string"
    )
      fail("object_invalid");
    const localPath = path.resolve(root, object.localPath);
    if (!localPath.startsWith(`${root}${path.sep}`)) fail("local_path_escape");
    const bytes = fs.readFileSync(localPath);
    if (bytes.length !== object.byteSize || sha256(bytes) !== object.sha256)
      fail("object_integrity");
    seen.add(object.objectPath);
    localObjects.set(object.objectPath, { object, bytes });
    totalBytes += bytes.length;
  }
  const currentPath = `learning-v2/voice-audio/v1/${plan.studyTarget}/current.json`;
  if (!seen.has(currentPath) || plan.objects.at(-1)?.objectPath !== currentPath)
    fail("current_must_be_last");
  const currentEntry = localObjects.get(currentPath);
  const current = JSON.parse(currentEntry.bytes.toString("utf8"));
  if (
    current.schemaVersion !== "learning-v2-audio-release-manifest.v1" ||
    current.studyTarget !== plan.studyTarget ||
    current.releaseId !== plan.releaseId ||
    current.availability !== "generated_ready" ||
    !Array.isArray(current.lessons)
  )
    fail("current_binding_invalid");
  const expectedPaths = new Set([currentPath]);
  let expectedStart = 1;
  for (const descriptor of current.lessons) {
    const lessonEntry = localObjects.get(descriptor.objectPath);
    if (
      !lessonEntry ||
      !lessonEntry.object.immutable ||
      lessonEntry.object.sha256 !== descriptor.sha256 ||
      lessonEntry.object.byteSize !== descriptor.byteSize ||
      descriptor.startOrdinal !== expectedStart
    )
      fail("lesson_descriptor_invalid");
    expectedPaths.add(descriptor.objectPath);
    const catalog = JSON.parse(lessonEntry.bytes.toString("utf8"));
    if (
      catalog.schemaVersion !== "learning-v2-audio-lesson-catalog.v1" ||
      catalog.studyTarget !== plan.studyTarget ||
      catalog.releaseId !== plan.releaseId ||
      catalog.lessonOrdinal !== descriptor.lessonOrdinal ||
      catalog.startOrdinal !== descriptor.startOrdinal ||
      catalog.endOrdinal !== descriptor.endOrdinal ||
      !Array.isArray(catalog.packs) ||
      !Array.isArray(catalog.sessions)
    )
      fail("lesson_binding_invalid");
    const clipShas = new Set();
    for (const pack of catalog.packs) {
      const packEntry = localObjects.get(pack.objectPath);
      if (
        !packEntry ||
        !packEntry.object.immutable ||
        packEntry.object.sha256 !== pack.sha256 ||
        packEntry.object.byteSize !== pack.byteSize ||
        !Array.isArray(pack.clips)
      )
        fail("pack_binding_invalid");
      expectedPaths.add(pack.objectPath);
      for (const clip of pack.clips) clipShas.add(clip.sha256);
    }
    for (const session of catalog.sessions) {
      if (!Array.isArray(session.phrases)) fail("session_binding_invalid");
      for (const phrase of session.phrases)
        if (!clipShas.has(phrase.clipSha256)) fail("phrase_binding_invalid");
    }
    expectedStart = descriptor.endOrdinal + 1;
  }
  if (
    expectedStart - 1 !== current.totalSessionCount ||
    expectedPaths.size !== seen.size ||
    [...seen].some((objectPath) => !expectedPaths.has(objectPath))
  )
    fail("tree_incomplete");
  if (!options.apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          releaseId: plan.releaseId,
          objectCount: seen.size,
          totalBytes,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (process.env.PHRASEMAN_ALLOW_LEARNING_V2_AUDIO_PUBLISH !== "1")
    fail("apply_not_authorized");
  if (!options.bucket) fail("apply_--bucket_required");
  const { getApps, initializeApp, applicationDefault } =
    await import("firebase-admin/app");
  const { getStorage } = await import("firebase-admin/storage");
  const app =
    getApps()[0] ??
    initializeApp({
      credential: applicationDefault(),
      storageBucket: options.bucket,
    });
  const bucket = getStorage(app).bucket(options.bucket);
  let created = 0;
  let skipped = 0;
  let currentUpdated = false;
  for (const object of plan.objects) {
    const bytes = fs.readFileSync(path.resolve(root, object.localPath));
    const file = bucket.file(object.objectPath);
    let remote = null;
    try {
      [remote] = await file.getMetadata();
    } catch (error) {
      if (Number(error?.code) !== 404) throw error;
    }
    if (object.immutable && remote) {
      if (
        Number(remote.size) !== object.byteSize ||
        remote.metadata?.sha256 !== object.sha256
      )
        fail("immutable_conflict");
      skipped += 1;
      continue;
    }
    if (
      !object.immutable &&
      remote &&
      Number(remote.size) === object.byteSize &&
      remote.metadata?.sha256 === object.sha256
    ) {
      skipped += 1;
      continue;
    }
    await file.save(bytes, {
      resumable: false,
      preconditionOpts: {
        ifGenerationMatch: remote ? Number(remote.generation) : 0,
      },
      metadata: {
        cacheControl: object.immutable
          ? "private,max-age=31536000,immutable"
          : "private,no-cache",
        metadata: { sha256: object.sha256, releaseId: plan.releaseId },
      },
    });
    if (object.immutable) created += 1;
    else currentUpdated = true;
  }
  console.log(
    JSON.stringify(
      {
        mode: "applied",
        releaseId: plan.releaseId,
        objectCount: seen.size,
        totalBytes,
        created,
        skipped,
        currentUpdated,
      },
      null,
      2,
    ),
  );
}

await main();
