import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { sessionReadiness } from "./session_readiness.mjs";
import { syncMockupReadiness } from "./sync_mockup_readiness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COURSE_ROOT = path.resolve(HERE, "..");

function embeddedJson(html, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = html.match(new RegExp(`<script id="${escapedId}" type="application/json">([\\s\\S]*?)<\\/script>`));
  assert.ok(match, `missing ${id}`);
  return JSON.parse(match[1]);
}

test("refresh writes current per-card readiness instead of a saved count", async () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-mockup-"));
  const mockupPath = path.join(temporaryRoot, "index.html");
  try {
    fs.writeFileSync(mockupPath, [
      '<script id="data" type="application/json">[{"key":"en/l01/s01"}]</script>',
      '<script id="session-readiness" type="application/json">{"en/l01/s01":{"ready":true,"unresolvedQualityItems":0,"firstUnresolvedItem":null}}</script>',
    ].join("\n"));

    const result = await syncMockupReadiness({
      mockupPath,
      sessionsRoot: path.join(COURSE_ROOT, "sessions"),
      locales: ["uk"],
    });

    const expected = sessionReadiness(path.join(COURSE_ROOT, "sessions", "en", "l01", "s01"), ["uk"]);
    assert.deepEqual(result, { updated: true, cards: 1 });
    assert.deepEqual(embeddedJson(fs.readFileSync(mockupPath, "utf8"), "session-readiness"), {
      "en/l01/s01": {
        ready: expected.ready,
        unresolvedQualityItems: expected.issues.length,
        firstUnresolvedItem: expected.issues[0] ?? null,
      },
    });
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
