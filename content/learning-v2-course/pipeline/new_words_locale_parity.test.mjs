import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseSessionHeader } from "./session_header.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SESSIONS = path.join(ROOT, "sessions", "en");

test("Russian and Ukrainian cards declare the same new English words", () => {
  const mismatches = [];
  for (const lesson of fs.readdirSync(SESSIONS).sort()) {
    const lessonRoot = path.join(SESSIONS, lesson);
    if (!fs.statSync(lessonRoot).isDirectory()) continue;
    for (const session of fs.readdirSync(lessonRoot).sort()) {
      const sessionRoot = path.join(lessonRoot, session);
      const ruPath = path.join(sessionRoot, "final.ru.md");
      const ukPath = path.join(sessionRoot, "final.uk.md");
      if (!fs.existsSync(ruPath) || !fs.existsSync(ukPath)) continue;
      const ru = parseSessionHeader(fs.readFileSync(ruPath, "utf8")).newWords;
      const uk = parseSessionHeader(fs.readFileSync(ukPath, "utf8")).newWords;
      if (JSON.stringify(ru) !== JSON.stringify(uk)) mismatches.push(`en/${lesson}/${session}: ru=${JSON.stringify(ru)} uk=${JSON.stringify(uk)}`);
    }
  }
  assert.deepEqual(mismatches, []);
});
