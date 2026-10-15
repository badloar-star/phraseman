import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function run(script, args = []) {
  return spawnSync(process.execPath, [path.join(HERE, script), ...args], {
    cwd: path.resolve(HERE, ".."),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

test("a dedicated source/release scope cannot bypass a HOLD elsewhere in the 186-session corpus", () => {
  const result = run("build_release.mjs", ["--session", "en/l01/s01", "--check-source-release"]);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.equal(result.status, 1, output);
  assert.match(output, /factory_intro_practice_course_hold:/u);
  assert.match(output, /"auditedSessionCount":186/u);
  assert.match(output, /en\/l04\/s\d{2}/u);
});

test("the all-source verifier runs the complete factory intro gate before narrower migration checks", () => {
  const result = run("verify_all_single_phrase_sources.mjs");
  const output = `${result.stdout}\n${result.stderr}`;
  assert.equal(result.status, 1, output);
  assert.match(output, /factory_intro_practice_all_source_hold:/u);
  assert.match(output, /"auditedSessionCount": 186/u);
});

test("canonical mockup audit serializes a visible HOLD and exits non-zero", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "factory-intro-mockup-hold-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const out = path.join(root, "index.html");
  const result = run("build_mockup.mjs", ["--out", out]);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.equal(result.status, 1, output);
  assert.match(output, /factory_intro_practice_mockup_hold/u);
  const html = fs.readFileSync(out, "utf8");
  assert.match(html, /data-factory-intro-practice-verdict="HOLD"/u);
  assert.match(html, /Выпуск остановлен: вводные ответы ещё не закреплены практикой/u);
});
