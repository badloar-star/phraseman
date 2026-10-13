import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  germanTask6cL02DirectCaptureTestHarnessDeV1,
  loadGermanTask6cL02DirectCaptureDeV1,
} from "../modules/learning-v2/curriculum/de/task6c_l02_direct_capture_de_v1";
import {
  germanTask6cL02FactsTestHarnessDeV1,
  loadGermanTask6cL02FactsDeV1,
} from "../modules/learning-v2/curriculum/de/task6c_l02_facts_de_v1";

const captureRoot = path.join(
  process.cwd(),
  "modules/learning-v2/curriculum/de/evidence/task6c_l02_direct_capture_v1",
);
const factsRoot = path.join(
  process.cwd(),
  "modules/learning-v2/curriculum/de/evidence/task6c_l02_facts_v1",
);
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const captureFixture = () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "task6c-l02-capture-"));
  fs.cpSync(captureRoot, fixture, { recursive: true });
  return fixture;
};
const factsFixture = () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "task6c-l02-facts-"));
  fs.cpSync(factsRoot, fixture, { recursive: true });
  return fixture;
};
const rejectCapture = (mutate: (root: string) => void, expected: RegExp) => {
  const root = captureFixture();
  try {
    mutate(root);
    assert.throws(
      () => germanTask6cL02DirectCaptureTestHarnessDeV1.validateFixture(root),
      expected,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
};
const rejectFacts = (
  mutate: (facts: string, capture: string) => void,
  expected: RegExp,
) => {
  const facts = factsFixture();
  const capture = captureFixture();
  try {
    mutate(facts, capture);
    assert.throws(
      () => germanTask6cL02FactsTestHarnessDeV1.validateFixture(facts, capture),
      expected,
    );
  } finally {
    fs.rmSync(facts, { recursive: true, force: true });
    fs.rmSync(capture, { recursive: true, force: true });
  }
};

loadGermanTask6cL02DirectCaptureDeV1();
loadGermanTask6cL02FactsDeV1();
const script = fs.readFileSync(
  path.join(
    process.cwd(),
    "scripts/capture_learning_v2_de_task6c_l02_direct_sources.mjs",
  ),
  "utf8",
);
assert.match(script, /TASK6C_L02_CAPTURE_SEMANTIC_ANCHOR_AMBIGUOUS/u);
assert.match(script, /TASK6C_L02_CAPTURE_IMMUTABLE_EXISTS/u);
assert.match(script, /RAW_AUTHORITATIVE_RESPONSE_BYTES/u);
assert.equal(read(path.join(captureRoot, "manifest.json")).captures.length, 4);

rejectCapture(
  (root) =>
    fs.appendFileSync(
      path.join(root, "raw/de_lex_plan_l02_c01_wohnen_v1.html"),
      "x",
    ),
  /capture_immutable_tuple/u,
);
rejectCapture((root) => {
  const file = path.join(root, "manifest.json");
  const value = read(file);
  value.captures[1].headword = "Tasse";
  fs.writeFileSync(file, JSON.stringify(value));
}, /capture_identity/u);
rejectCapture((root) => {
  const file = path.join(root, "manifest.json");
  const value = read(file);
  value.captures[2].exactSenseSpan.sourceAnchor = "d-1-2";
  fs.writeFileSync(file, JSON.stringify(value));
}, /capture_span/u);
rejectCapture((root) => {
  const file = path.join(root, "manifest.json");
  const value = read(file);
  value.captures[3].rawBody.path = "../escape";
  fs.writeFileSync(file, JSON.stringify(value));
}, /capture_path_escape/u);
rejectCapture((root) => {
  const file = path.join(root, "manifest.json");
  const value = read(file);
  value.captures.pop();
  fs.writeFileSync(file, JSON.stringify(value));
}, /capture_roster/u);
rejectCapture((root) => {
  const file = path.join(root, "manifest.json");
  const value = read(file);
  value.task7Unlock = true;
  fs.writeFileSync(file, JSON.stringify(value));
}, /capture_authority/u);
rejectCapture((root) => {
  const file = path.join(root, "manifest.json");
  const value = read(file);
  value.english = "translation";
  fs.writeFileSync(file, JSON.stringify(value));
}, /capture_schema/u);
rejectCapture((root) => {
  const file = path.join(root, "manifest.json");
  const value = read(file);
  value.upstream.task5BlueprintSha256 = "0";
  fs.writeFileSync(file, JSON.stringify(value));
}, /capture_upstream/u);

rejectFacts((facts) => {
  const file = path.join(facts, "facts.json");
  const value = read(file);
  value.facts[0].sourceSense.definitionGerman = "other";
  fs.writeFileSync(file, JSON.stringify(value));
}, /facts_source_mismatch/u);
rejectFacts((facts) => {
  const file = path.join(facts, "facts.json");
  const value = read(file);
  value.facts[2].sourceSense.senseSpanSha256 = "0";
  fs.writeFileSync(file, JSON.stringify(value));
}, /facts_source_mismatch/u);
rejectFacts((facts) => {
  const file = path.join(facts, "facts.json");
  const value = read(file);
  value.facts[3].sourcePlanId = "de_lex_plan_l02_c02_tasse_v1";
  fs.writeFileSync(file, JSON.stringify(value));
}, /facts_crosswire/u);
rejectFacts((facts) => {
  const file = path.join(facts, "facts.json");
  const value = read(file);
  value.facts[1].morphology.plural = "Tassen";
  fs.writeFileSync(file, JSON.stringify(value));
}, /facts_noun_source_mismatch/u);
rejectFacts((facts) => {
  const file = path.join(facts, "facts.json");
  const value = read(file);
  value.facts[0].sourceFormFacts.verbPackage = "haben";
  fs.writeFileSync(file, JSON.stringify(value));
}, /facts_verb_source_mismatch/u);
rejectFacts((facts) => {
  const file = path.join(facts, "facts.json");
  const value = read(file);
  value.learner = "claim";
  fs.writeFileSync(file, JSON.stringify(value));
}, /facts_schema/u);
rejectFacts((facts) => {
  const file = path.join(facts, "facts.json");
  const value = read(file);
  value.task7Unlock = true;
  fs.writeFileSync(file, JSON.stringify(value));
}, /facts_authority/u);
rejectFacts((facts, capture) => {
  const file = path.join(capture, "manifest.json");
  const value = read(file);
  value.captures[0].sourcePlanId = "de_lex_plan_l02_c02_teller_v1";
  fs.writeFileSync(file, JSON.stringify(value));
}, /capture_identity/u);
process.stdout.write(
  "TASK6C_L02_DIRECT_CAPTURE_FACTS_GATE PASS rows=4 status=HOLD_FACTS_ONLY task7Unlock=false\n",
);
