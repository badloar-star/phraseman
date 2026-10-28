import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fail = (reason) => {
  throw new Error(`learning_v2_audio_r2_live_verify_${reason}`);
};
const digest = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");

function args(values) {
  const result = { apply: false };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--apply") result.apply = true;
    else if (value.startsWith("--")) {
      const next = values[++index];
      if (!next || next.startsWith("--")) fail("argument_invalid");
      result[value.slice(2)] = next;
    } else fail("argument_invalid");
  }
  return result;
}

const EXPECTED_WORKER_ORIGIN =
  "https://phraseman-learning-audio.badloar.workers.dev";

export const exactLiveWorkerOrigin = (value) => {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      return null;
    return url.origin === EXPECTED_WORKER_ORIGIN ? url.origin : null;
  } catch {
    return null;
  }
};

export function assertLiveVerificationOutcome(primaryFailure, cleanupFailed) {
  if (cleanupFailed) {
    const error = new Error(
      "learning_v2_audio_r2_live_verify_temporary_identity_cleanup_failed",
    );
    if (primaryFailure) error.cause = primaryFailure;
    throw error;
  }
  if (primaryFailure) throw primaryFailure;
}

export function assertLiveObjectSizeHeaders(headers, expectedBytes) {
  const expected = String(expectedBytes);
  const workerLength = headers.get("x-phraseman-content-length");
  const standardLength = headers.get("content-length");
  if (
    workerLength !== expected ||
    (standardLength !== null && standardLength !== workerLength)
  )
    fail("worker_size_header");
}

async function jsonPost(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) fail(`firebase_http_${response.status}`);
  return payload;
}

async function verifyObject(origin, object, idToken) {
  const response = await fetch(`${origin}/${object.objectPath}`, {
    method: "GET",
    headers: { Authorization: `Firebase ${idToken}` },
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) fail(`worker_http_${response.status}`);
  assertLiveObjectSizeHeaders(response.headers, object.byteSize);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== object.byteSize || digest(bytes) !== object.sha256)
    fail("worker_object_integrity");
}

async function main() {
  const options = args(process.argv.slice(2));
  if (
    !options.apply ||
    process.env.PHRASEMAN_ALLOW_LEARNING_V2_R2_LIVE_VERIFY !== "1"
  )
    fail("apply_not_authorized");
  const origin = exactLiveWorkerOrigin(options.origin);
  const apiKey = process.env.PHRASEMAN_FIREBASE_WEB_API_KEY;
  if (!origin || !options.root || !apiKey) fail("configuration_missing");
  const root = path.resolve(options.root);
  const plan = JSON.parse(
    fs.readFileSync(path.join(root, "publish-manifest.json"), "utf8"),
  );
  const current = plan.objects.find((object) => !object.immutable);
  const pack = plan.objects.find(
    (object) => object.immutable && object.objectPath.includes("/packs/"),
  );
  if (!current || !pack || plan.objects.at(-1)?.objectPath !== current.objectPath)
    fail("plan_invalid");
  let idToken = null;
  let cleanupFailed = false;
  let primaryFailure = null;
  try {
    const identity = await jsonPost(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
      { returnSecureToken: true },
    );
    if (typeof identity?.idToken !== "string") fail("anonymous_signup_invalid");
    idToken = identity.idToken;
    const unauthenticated = await fetch(`${origin}/${current.objectPath}`, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (unauthenticated.status !== 401) fail("unauthenticated_not_rejected");
    await verifyObject(origin, current, idToken);
    await verifyObject(origin, pack, idToken);
  } catch (error) {
    primaryFailure = error;
  } finally {
    if (idToken) {
      try {
        await jsonPost(
          `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(apiKey)}`,
          { idToken },
        );
      } catch {
        cleanupFailed = true;
      }
    }
  }
  assertLiveVerificationOutcome(primaryFailure, cleanupFailed);
  console.log(
    JSON.stringify({
      status: "verified",
      unauthenticatedStatus: 401,
      authenticatedObjects: 2,
      temporaryIdentityDeleted: true,
    }),
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
)
  await main();
