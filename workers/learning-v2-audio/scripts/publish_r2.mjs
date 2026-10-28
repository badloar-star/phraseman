import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { publishValidatedPlanToR2 } from "./publisher_core.mjs";

const EXPECTED_ACCOUNT_ID = "9519c61534cc0cfca3a1b13b383b6235";
const EXPECTED_BUCKET = "phraseman-learning-audio";
const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, "../../..");
const validatorPath = path.join(
  repositoryRoot,
  "scripts/publish_learning_v2_progressive_audio_packs.mjs",
);
const fail = (reason) => {
  throw new Error(`learning_v2_audio_r2_publish_${reason}`);
};
const digest = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");

function parseArgs(values) {
  const options = { apply: false };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--apply") options.apply = true;
    else if (value.startsWith("--")) {
      const next = values[++index];
      if (!next || next.startsWith("--")) fail("argument_invalid");
      options[value.slice(2)] = next;
    } else fail("argument_invalid");
  }
  return options;
}

function loadValidatedObjects(root) {
  execFileSync(
    process.execPath,
    [validatorPath, "--root", root],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const plan = JSON.parse(
    fs.readFileSync(path.join(root, "publish-manifest.json"), "utf8"),
  );
  const objects = plan.objects.map((object) => {
    const localPath = path.resolve(root, object.localPath);
    const bytes = fs.readFileSync(localPath);
    if (bytes.byteLength !== object.byteSize || digest(bytes) !== object.sha256)
      fail("local_integrity");
    return Object.freeze({ ...object, bytes: new Uint8Array(bytes) });
  });
  return { plan, objects };
}

function credentialsFromFile(credentialsPath) {
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  const expiresAt = Date.parse(credentials.expires);
  if (
    credentials.accountId !== EXPECTED_ACCOUNT_ID ||
    credentials.bucket !== EXPECTED_BUCKET ||
    typeof credentials.accessKeyId !== "string" ||
    credentials.accessKeyId.length < 8 ||
    typeof credentials.secretAccessKey !== "string" ||
    credentials.secretAccessKey.length < 16 ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() + 5 * 60_000
  )
    fail("credentials_invalid_or_expired");
  return credentials;
}

function invocationFromFile(invocationPath, releaseId) {
  const invocation = JSON.parse(fs.readFileSync(invocationPath, "utf8"));
  if (
    invocation.schemaVersion !== "learning-v2-audio-r2-publish-invocation.v1" ||
    invocation.accountId !== EXPECTED_ACCOUNT_ID ||
    invocation.bucket !== EXPECTED_BUCKET ||
    invocation.releaseId !== releaseId ||
    !(
      invocation.expectedPriorCurrentSha === null ||
      /^[a-f0-9]{64}$/u.test(invocation.expectedPriorCurrentSha)
    )
  )
    fail("invocation_invalid");
  return invocation;
}

function notFound(error) {
  return (
    error?.name === "NotFound" ||
    error?.name === "NoSuchKey" ||
    error?.$metadata?.httpStatusCode === 404
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.root) fail("usage_--root_required");
  const root = path.resolve(options.root);
  const { plan, objects } = loadValidatedObjects(root);
  const totalBytes = objects.reduce((sum, object) => sum + object.byteSize, 0);
  if (!options.apply) {
    console.log(
      JSON.stringify({
        mode: "dry-run",
        backend: "cloudflare-r2",
        bucket: EXPECTED_BUCKET,
        releaseId: plan.releaseId,
        objectCount: objects.length,
        totalBytes,
      }),
    );
    return;
  }
  if (process.env.PHRASEMAN_ALLOW_LEARNING_V2_R2_PUBLISH !== "1")
    fail("apply_not_authorized");
  if (!options["credentials-file"])
    fail("apply_--credentials-file_required");
  if (!options["invocation-file"])
    fail("apply_--invocation-file_required");
  const invocation = invocationFromFile(
    path.resolve(options["invocation-file"]),
    plan.releaseId,
  );
  const credentials = credentialsFromFile(
    path.resolve(options["credentials-file"]),
  );
  const {
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
  } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${EXPECTED_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
  const head = async (key) => {
    try {
      const found = await client.send(
        new HeadObjectCommand({ Bucket: EXPECTED_BUCKET, Key: key }),
      );
      return {
        byteSize: found.ContentLength,
        sha256: found.Metadata?.sha256,
        etag: found.ETag,
      };
    } catch (error) {
      if (notFound(error)) return null;
      throw error;
    }
  };
  const get = async (key) => {
    try {
      const found = await client.send(
        new GetObjectCommand({ Bucket: EXPECTED_BUCKET, Key: key }),
      );
      if (!found.Body) return null;
      return { bytes: await found.Body.transformToByteArray() };
    } catch (error) {
      if (notFound(error)) return null;
      throw error;
    }
  };
  const put = async (object, condition, prior) => {
    const command = new PutObjectCommand({
      Bucket: EXPECTED_BUCKET,
      Key: object.objectPath,
      Body: object.bytes,
      ContentLength: object.byteSize,
      ContentType: object.objectPath.endsWith(".json")
        ? "application/json"
        : "application/octet-stream",
      CacheControl: object.immutable
        ? "private, max-age=31536000, immutable"
        : "private, no-cache",
      Metadata: { sha256: object.sha256, "release-id": plan.releaseId },
      StorageClass: "STANDARD",
    });
    command.middlewareStack.add(
      (next) => async (arguments_) => {
        if (!arguments_.request?.headers) fail("conditional_header_unavailable");
        if (condition === "create" || !prior)
          arguments_.request.headers["if-none-match"] = "*";
        else if (typeof prior.etag === "string")
          arguments_.request.headers["if-match"] = prior.etag;
        else fail("current_etag_missing");
        return next(arguments_);
      },
      { step: "build", name: "r2SafeConditionalWrite" },
    );
    await client.send(command);
  };
  const result = await publishValidatedPlanToR2({
    releaseId: plan.releaseId,
    expectedPriorCurrentSha: invocation.expectedPriorCurrentSha,
    objects,
    head,
    get,
    put,
  });
  console.log(
    JSON.stringify({
      mode: "applied",
      backend: "cloudflare-r2",
      bucket: EXPECTED_BUCKET,
      releaseId: plan.releaseId,
      objectCount: objects.length,
      totalBytes,
      ...result,
    }),
  );
}

await main();
