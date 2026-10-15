import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = path.join(root, "sessions/en/l01/s33");

for (const locale of ["ru", "uk"]) {
  test(`l01 s33 i15 is visibly a spoken task in ${locale}`, () => {
    const markdown = fs.readFileSync(path.join(session, `final.${locale}.md`), "utf8");
    const block = markdown.split("<!-- interaction_id: en:lesson-01:session-33:i15; family: scripted_repeat_compare -->")[1]?.split(/^\*\*17 ·/mu)[0] ?? "";
    assert.match(block, /🎙\s*\*\*We are late\.\*\*/u);
    assert.doesNotMatch(block, /Плитки|Tiles/u);
  });
}
