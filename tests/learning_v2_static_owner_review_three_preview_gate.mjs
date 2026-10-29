import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { startLearningV2StaticOwnerReviewServer } from "../scripts/serve_learning_v2_static_owner_review.mjs";

test("full-course owner review accepts three bounded private preview manifests", async () => {
  const courseRoot = path.resolve("content/learning-v2-course");
  const s01 = path.join(courseRoot, "sessions/en/l01/s01/owner-review-preview-manifest.json");
  const s02 = path.join(courseRoot, "sessions/en/l01/s02/owner-review-preview-manifest.json");
  const s03 = path.join(courseRoot, "sessions/en/l01/s03/owner-review-preview-manifest.json");
  const server = await startLearningV2StaticOwnerReviewServer({
    host: "127.0.0.1",
    port: 0,
    fullCourse: true,
    courseRoot,
    manifestPaths: [s01, s02, s03],
    quiet: true,
  });
  try {
    assert.match(server.url, /^http:\/\/127\.0\.0\.1:\d+\/$/u);
    const response = await fetch(server.url);
    assert.equal(response.status, 200);
    const html = await response.text();
    const marker = '<script id="data" type="application/json">';
    const start = html.indexOf(marker);
    const end = html.indexOf("</script>", start + marker.length);
    const sessions = JSON.parse(html.slice(start + marker.length, end));
    assert.equal(sessions.length, 186);
    assert.equal(new Set(sessions.map((entry) => entry.key.split("/").slice(0, 2).join("/"))).size, 4);
    assert.equal((html.match(/Текст принят/gu) ?? []).length >= 1, true);
    assert.match(html, /Аудио: прослушивание не заявлено/u);
    assert.match(html, /В приложении: не активировано/u);
    for (const manifestPath of [s01, s02, s03]) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      assert.equal(manifest.reviewStatus, "TEXT_CANONICAL");
      assert.equal(manifest.releaseAuthority, false);
    }
  } finally {
    await server.close();
  }
});
