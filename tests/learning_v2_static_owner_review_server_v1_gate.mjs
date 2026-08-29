import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { startLearningV2StaticOwnerReviewServer } from "../scripts/serve_learning_v2_static_owner_review.mjs";

const rootDirectory = resolve(
  process.cwd(),
  ".codex-tmp",
  "learning-v2-owner-review",
);
const running = await startLearningV2StaticOwnerReviewServer({
  host: "127.0.0.1",
  port: 0,
  rootDirectory,
  quiet: true,
});

try {
  const page = await fetch(running.url);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type") ?? "", /^text\/html/u);
  assert.equal(page.headers.get("cache-control"), "no-store");
  assert.equal(page.headers.get("pragma"), "no-cache");
  assert.match(
    page.headers.get("content-security-policy") ?? "",
    /default-src 'self'/u,
  );
  assert.match(await page.text(), /Learning V2 · Owner Review/u);

  const health = await fetch(`${running.url}health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    ok: true,
    service: "learning-v2-static-owner-review",
  });

  const hiddenFile = await fetch(`${running.url}package.json`);
  assert.equal(hiddenFile.status, 404, "server must expose only the review page");
} finally {
  await running.close();
}

const reloadDirectory = await mkdtemp(resolve(tmpdir(), "learning-v2-owner-review-"));
await writeFile(resolve(reloadDirectory, "index.html"), "first-build", "utf8");
const reloadServer = await startLearningV2StaticOwnerReviewServer({
  host: "127.0.0.1",
  port: 0,
  rootDirectory: reloadDirectory,
  quiet: true,
});

try {
  assert.equal(await (await fetch(reloadServer.url)).text(), "first-build");
  await writeFile(resolve(reloadDirectory, "index.html"), "second-build", "utf8");
  assert.equal(
    await (await fetch(`${reloadServer.url}?freshness=second-build`)).text(),
    "second-build",
    "a running owner-review server must serve the latest built HTML",
  );
} finally {
  await reloadServer.close();
  await rm(reloadDirectory, { recursive: true, force: true });
}

process.stdout.write("LEARNING V2 STATIC OWNER REVIEW SERVER: PASS\n");
