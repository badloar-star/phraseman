import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { startLearningV2StaticOwnerReviewServer } from "../scripts/serve_learning_v2_static_owner_review.mjs";

const reviewUrl = process.env.LEARNING_V2_OWNER_REVIEW_URL
  ?? "http://127.0.0.1:59690/";
const outputPath = resolve(
  process.cwd(),
  ".codex-tmp",
  "learning-v2-owner-review",
  "index.html",
);
const expectedHtml = await readFile(outputPath, "utf8");
let effectiveUrl = reviewUrl;
let temporaryServer;
let response;
try {
  const separator = effectiveUrl.includes("?") ? "&" : "?";
  response = await fetch(
    `${effectiveUrl}${separator}freshness=${Date.now()}`,
    { cache: "no-store" },
  );
} catch (error) {
  if (process.env.LEARNING_V2_OWNER_REVIEW_URL) throw error;
  temporaryServer = await startLearningV2StaticOwnerReviewServer({
    host: "127.0.0.1",
    port: 0,
    rootDirectory: resolve(outputPath, ".."),
    quiet: true,
  });
  effectiveUrl = temporaryServer.url;
  response = await fetch(`${effectiveUrl}?freshness=${Date.now()}`, {
    cache: "no-store",
  });
}

try {
  assert.equal(response.status, 200, "owner-review server must be reachable");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(
    await response.text(),
    expectedHtml,
    "served owner-review HTML is stale; rebuild/restart must not be hidden",
  );
} finally {
  await temporaryServer?.close();
}

process.stdout.write("LEARNING V2 OWNER REVIEW LIVE FRESHNESS: PASS\n");
