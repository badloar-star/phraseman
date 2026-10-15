import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  germanTask6cL01C01HausNameFactsTestHarnessDeV1,
  loadGermanTask6cL01C01HausNameFactsDeV1,
} from "../modules/learning-v2/curriculum/de/task6c_l01_c01_haus_name_facts_de_v1";
const repo = process.cwd(),
  root = path.join(
    repo,
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_c01_haus_name_facts_v1",
  ),
  capture = path.join(
    repo,
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_c01_haus_name_direct_capture_v1",
  );
const read = (p: string) => JSON.parse(fs.readFileSync(p, "utf8"));
loadGermanTask6cL01C01HausNameFactsDeV1();
function fixture() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "task6c-c01-facts-")),
    c = path.join(d, "capture");
  fs.cpSync(root, d, { recursive: true });
  fs.cpSync(capture, c, { recursive: true });
  return { d, c };
}
function reject(m: (x: { d: string; c: string }) => void, re: RegExp) {
  const x = fixture();
  try {
    m(x);
    assert.throws(
      () =>
        germanTask6cL01C01HausNameFactsTestHarnessDeV1.validateFixture(
          x.d,
          x.c,
        ),
      re,
    );
  } finally {
    fs.rmSync(x.d, { recursive: true, force: true });
  }
}
const factsSymlinkFixture = fixture();
try {
  const facts = path.join(factsSymlinkFixture.d, "facts.json");
  fs.rmSync(facts);
  try {
    fs.symlinkSync(path.join(root, "facts.json"), facts, "file");
    assert.throws(
      () =>
        germanTask6cL01C01HausNameFactsTestHarnessDeV1.validateFixture(
          factsSymlinkFixture.d,
          factsSymlinkFixture.c,
        ),
      /facts_path_escape/u,
    );
  } catch (error: any) {
    if (error?.code !== "EPERM") throw error;
    process.stdout.write("TASK6C_C01_FACTS_SYMLINK facts-entry=SKIP_EPERM\n");
  }
} finally {
  fs.rmSync(factsSymlinkFixture.d, { recursive: true, force: true });
}
function captureSymlinkCase(
  label: string,
  mutate: (captureRoot: string) => void,
): void {
  const x = fixture();
  try {
    try {
      mutate(x.c);
      assert.throws(
        () =>
          germanTask6cL01C01HausNameFactsTestHarnessDeV1.validateFixture(
            x.d,
            x.c,
          ),
        /facts_capture_path_escape/u,
      );
      process.stdout.write(`TASK6C_C01_FACTS_SYMLINK ${label}=PASS\n`);
    } catch (error: any) {
      if (error?.code !== "EPERM") throw error;
      process.stdout.write(`TASK6C_C01_FACTS_SYMLINK ${label}=SKIP_EPERM\n`);
    }
  } finally {
    fs.rmSync(x.d, { recursive: true, force: true });
  }
}
captureSymlinkCase("capture-manifest", (c) => {
  const target = path.join(c, "manifest.json");
  fs.rmSync(target);
  fs.symlinkSync(
    path.join(c, "raw/de_lex_plan_task6c_l01_c01_haus_v1.html"),
    target,
    "file",
  );
});
captureSymlinkCase("raw-leaf", (c) => {
  const target = path.join(c, "raw/de_lex_plan_task6c_l01_c01_haus_v1.html");
  fs.rmSync(target);
  fs.symlinkSync(path.join(c, "../facts.json"), target, "file");
});
reject(({ d }) => {
  const p = path.join(d, "facts.json"),
    v: any = read(p);
  v.facts[0].morphology.plural = "Haus";
  fs.writeFileSync(p, JSON.stringify(v));
}, /facts_source_mismatch/u);
reject(({ d }) => {
  const p = path.join(d, "facts.json"),
    v: any = read(p);
  v.facts.reverse();
  fs.writeFileSync(p, JSON.stringify(v));
}, /facts_crosswire/u);
reject(
  ({ c }) =>
    fs.appendFileSync(
      path.join(c, "raw/de_lex_plan_task6c_l01_c01_name_v1.html"),
      "x",
    ),
  /capture_bytes/u,
);
reject(({ d }) => {
  const p = path.join(d, "facts.json"),
    v: any = read(p);
  v.translationRu = "имя";
  fs.writeFileSync(p, JSON.stringify(v));
}, /facts_schema/u);
reject(({ d }) => {
  const p = path.join(d, "facts.json"),
    v: any = read(p);
  v.task7Unlock = true;
  fs.writeFileSync(p, JSON.stringify(v));
}, /facts_authority/u);
reject(({ d }) => {
  const p = path.join(d, "facts.json"),
    v: any = read(p);
  v.facts[0].sourceSense.sourceAnchor = "d-1-1";
  fs.writeFileSync(p, JSON.stringify(v));
}, /facts_source_mismatch/u);
reject(({ d }) => {
  const p = path.join(d, "facts.json"),
    v: any = read(p);
  v.factReceipt.noTranslationClaim = false;
  fs.writeFileSync(p, JSON.stringify(v));
}, /facts_receipt/u);
process.stdout.write(
  "TASK6C_C01_HAUS_NAME_FACTS_GATE PASS status=HOLD_FACTS_ONLY task7Unlock=false\n",
);
