import assert from "node:assert/strict";
import test from "node:test";

import { sourceReleaseFindings } from "./sync_mockup_source_release_findings.mjs";

test("keeps a card yellow when the native release differs even if a reviewed projection exists", () => {
  const findings = sourceReleaseFindings({
    sessionKeys: new Set(["en/l01/s45"]),
  });

  assert.ok(findings["en/l01/s45"], "the stale native release must be visible on the card");
  assert.match(findings["en/l01/s45"][0], /не совпадает|расхождений/u);
});
