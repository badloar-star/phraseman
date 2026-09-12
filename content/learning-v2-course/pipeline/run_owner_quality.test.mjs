import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));

test("run machine facts makes the preserved short-answer defect blocking and clears the repaired master", () => {
  const runUrl = pathToFileURL(path.join(here, "run.mjs")).href;
  const before = path.join(here, "../sessions/en/l02/s49/owner-before.ru.md");
  const repaired = path.join(here, "../sessions/en/l02/s49/final.ru.md");
  const program = `import { HARD_FACT_RE, machineFacts } from ${JSON.stringify(runUrl)};
const before = machineFacts(${JSON.stringify(before)}).split('\\n').filter(line => HARD_FACT_RE.test(line));
const repaired = machineFacts(${JSON.stringify(repaired)}).split('\\n').filter(line => HARD_FACT_RE.test(line));
console.log(JSON.stringify({ before: before.filter(line => line.includes('КОРОТКИЙ ОТВЕТ')), repaired: repaired.filter(line => line.includes('КОРОТКИЙ ОТВЕТ')) }));`;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", program], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const output = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
  assert.equal(output.before.length, 1);
  assert.equal(output.repaired.length, 0);
});
