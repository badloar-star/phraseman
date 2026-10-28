import { createHash } from "node:crypto";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = (reason) => {
  throw new Error(`learning_v2_audio_r2_publish_${reason}`);
};

const matchingMetadata = (metadata, object) =>
  metadata !== null &&
  metadata.byteSize === object.byteSize &&
  metadata.sha256 === object.sha256;

async function verifyRemote(object, get) {
  const remote = await get(object.objectPath);
  if (
    !remote ||
    !(remote.bytes instanceof Uint8Array) ||
    remote.bytes.byteLength !== object.byteSize ||
    digest(remote.bytes) !== object.sha256
  )
    fail("remote_integrity");
}

export async function publishValidatedPlanToR2(input) {
  if (
    !/^[a-f0-9]{64}$/u.test(input.releaseId) ||
    !Array.isArray(input.objects) ||
    !(
      input.expectedPriorCurrentSha === null ||
      /^[a-f0-9]{64}$/u.test(input.expectedPriorCurrentSha)
    )
  )
    fail("plan_invalid");
  const currentPath = input.objects.find((object) => !object.immutable)?.objectPath;
  if (
    typeof currentPath !== "string" ||
    input.objects.at(-1)?.objectPath !== currentPath ||
    !currentPath.endsWith("/current.json") ||
    input.objects.filter((object) => !object.immutable).length !== 1
  )
    fail("current_must_be_last");
  let created = 0;
  let skipped = 0;
  let currentUpdated = false;
  for (const object of input.objects) {
    if (
      !(object.bytes instanceof Uint8Array) ||
      object.bytes.byteLength !== object.byteSize ||
      digest(object.bytes) !== object.sha256
    )
      fail("local_integrity");
    const prior = await input.head(object.objectPath);
    if (prior && !matchingMetadata(prior, object) && object.immutable)
      fail("immutable_conflict");
    if (matchingMetadata(prior, object)) {
      await verifyRemote(object, input.get);
      skipped += 1;
      continue;
    }
    if (
      !object.immutable &&
      ((input.expectedPriorCurrentSha === null && prior !== null) ||
        (input.expectedPriorCurrentSha !== null &&
          prior?.sha256 !== input.expectedPriorCurrentSha))
    )
      fail("stale_current");
    await input.put(object, object.immutable ? "create" : "replace", prior);
    await verifyRemote(object, input.get);
    if (object.immutable) created += 1;
    else currentUpdated = true;
  }
  return Object.freeze({ created, skipped, currentUpdated });
}
