import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parsePractice } from "./build_release.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SESSIONS = path.join(ROOT, "sessions", "en");

test("sound-contrast options remain identical in Russian and Ukrainian source cards", () => {
  const mismatches = [];
  for (const lesson of fs.readdirSync(SESSIONS).sort()) {
    const lessonRoot = path.join(SESSIONS, lesson);
    if (!fs.statSync(lessonRoot).isDirectory()) continue;
    for (const session of fs.readdirSync(lessonRoot).sort()) {
      const sessionRoot = path.join(lessonRoot, session);
      const ruPath = path.join(sessionRoot, "final.ru.md");
      const ukPath = path.join(sessionRoot, "final.uk.md");
      if (!fs.existsSync(ruPath) || !fs.existsSync(ukPath)) continue;
      const ru = new Map(parsePractice(fs.readFileSync(ruPath, "utf8"))
        .filter((task) => task.family === "sound_contrast")
        .map((task) => [task.interactionId, task.options.map(({ text, correct }) => ({ text, correct }))]));
      const uk = new Map(parsePractice(fs.readFileSync(ukPath, "utf8"))
        .filter((task) => task.family === "sound_contrast")
        .map((task) => [task.interactionId, task.options.map(({ text, correct }) => ({ text, correct }))]));
      for (const [id, options] of ru) {
        if (JSON.stringify(options) !== JSON.stringify(uk.get(id))) mismatches.push(`en/${lesson}/${session}:${id}`);
      }
    }
  }
  assert.deepEqual(mismatches, []);
});
