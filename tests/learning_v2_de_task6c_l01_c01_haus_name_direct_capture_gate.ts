import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  germanTask6cL01C01HausNameDirectCaptureTestHarnessDeV1,
  loadGermanTask6cL01C01HausNameDirectCaptureDeV1,
} from "../modules/learning-v2/curriculum/de/task6c_l01_c01_haus_name_direct_capture_de_v1";
const root = path.join(
  process.cwd(),
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_c01_haus_name_direct_capture_v1",
);
const read = (p: string) => JSON.parse(fs.readFileSync(p, "utf8"));
loadGermanTask6cL01C01HausNameDirectCaptureDeV1();
const generatorSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "scripts/capture_learning_v2_de_task6c_l01_c01_haus_name_sources.mjs",
  ),
  "utf8",
);
assert.match(generatorSource, /headwordArticleSpan/u);
assert.match(generatorSource, /sha256: sha\(headwordArticle\)/u);
assert.match(
  generatorSource,
  /utf8Bytes: Buffer\.byteLength\(headwordArticle, "utf8"\)/u,
);
const savedManifest: any = read(path.join(root, "manifest.json"));
assert.deepEqual(
  savedManifest.captures.map((capture: any) => Object.keys(capture).sort()),
  Array.from({ length: 2 }, () =>
    [
      "canonicalSenseId",
      "canonicalUrl",
      "contentType",
      "exactSenseSpan",
      "finalUrl",
      "headword",
      "headwordArticleSpan",
      "headers",
      "httpStatus",
      "lemma",
      "morphologySpan",
      "rawBody",
      "sourcePlanId",
      "title",
    ].sort(),
  ),
);
for (const capture of savedManifest.captures) {
  assert.deepEqual(Object.keys(capture.headwordArticleSpan).sort(), [
    "sha256",
    "utf8Bytes",
  ]);
  assert.deepEqual(Object.keys(capture.exactSenseSpan).sort(), [
    "sha256",
    "sourceAnchor",
    "utf8Bytes",
  ]);
  assert.deepEqual(Object.keys(capture.morphologySpan).sort(), [
    "sha256",
    "utf8Bytes",
  ]);
}
process.stdout.write(
  "TASK6C_C01_GENERATOR_SAVED_RAW_MANIFEST_PARITY PASS rows=2\n",
);
const copiedRootDoesNotSelectProductionAuthority = fixture;
function fixture() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "task6c-c01-capture-"));
  fs.cpSync(root, d, { recursive: true });
  return d;
}
function reject(m: (d: string) => void, re: RegExp) {
  const d = fixture();
  try {
    m(d);
    assert.throws(
      () =>
        germanTask6cL01C01HausNameDirectCaptureTestHarnessDeV1.validateFixture(
          d,
        ),
      re,
    );
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
}
const arbitraryCopiedRoot = copiedRootDoesNotSelectProductionAuthority();
try {
  assert.deepEqual(
    (loadGermanTask6cL01C01HausNameDirectCaptureDeV1 as any)(
      arbitraryCopiedRoot,
    ),
    loadGermanTask6cL01C01HausNameDirectCaptureDeV1(),
  );
} finally {
  fs.rmSync(arbitraryCopiedRoot, { recursive: true, force: true });
}
reject(
  (d) =>
    fs.appendFileSync(
      path.join(d, "raw/de_lex_plan_task6c_l01_c01_haus_v1.html"),
      "x",
    ),
  /capture_(?:bytes|immutable_tuple)/u,
);
reject((d) => {
  const p = path.join(d, "manifest.json"),
    v: any = read(p);
  v.captures[0].rawBody.sha256 = v.captures[1].rawBody.sha256;
  fs.writeFileSync(p, JSON.stringify(v));
}, /capture_(?:bytes|immutable_tuple)/u);
reject((d) => {
  const raw = path.join(d, "raw/de_lex_plan_task6c_l01_c01_haus_v1.html");
  fs.appendFileSync(raw, "x");
  const p = path.join(d, "manifest.json"),
    v: any = read(p);
  v.captures[0].rawBody.sha256 = createHash("sha256")
    .update(fs.readFileSync(raw))
    .digest("hex");
  v.captures[0].rawBody.bytes = fs.statSync(raw).size;
  fs.writeFileSync(p, JSON.stringify(v));
}, /capture_immutable_tuple/u);
reject((d) => {
  const p = path.join(d, "manifest.json"),
    v: any = read(p);
  v.captures[0].lemma = "Name";
  fs.writeFileSync(p, JSON.stringify(v));
}, /capture_identity/u);
reject((d) => {
  const p = path.join(d, "manifest.json"),
    v: any = read(p);
  v.captures[0].exactSenseSpan.sourceAnchor = "d-1-1";
  fs.writeFileSync(p, JSON.stringify(v));
}, /capture_span/u);
reject((d) => {
  const p = path.join(d, "manifest.json"),
    v: any = read(p);
  v.captures[1].rawBody.path = "../escape.html";
  fs.writeFileSync(p, JSON.stringify(v));
}, /capture_path_escape/u);
const symlinkFixture = fixture();
try {
  const raw = path.join(
    symlinkFixture,
    "raw/de_lex_plan_task6c_l01_c01_haus_v1.html",
  );
  fs.rmSync(raw);
  try {
    fs.symlinkSync(
      path.join(root, "raw/de_lex_plan_task6c_l01_c01_haus_v1.html"),
      raw,
      "file",
    );
    assert.throws(
      () =>
        germanTask6cL01C01HausNameDirectCaptureTestHarnessDeV1.validateFixture(
          symlinkFixture,
        ),
      /capture_path_escape/u,
    );
  } catch (error: any) {
    if (error?.code !== "EPERM") throw error;
    process.stdout.write("TASK6C_C01_CAPTURE_SYMLINK raw-leaf=SKIP_EPERM\n");
  }
} finally {
  fs.rmSync(symlinkFixture, { recursive: true, force: true });
}
const manifestSymlinkFixture = fixture();
try {
  const manifest = path.join(manifestSymlinkFixture, "manifest.json");
  fs.rmSync(manifest);
  try {
    fs.symlinkSync(path.join(root, "manifest.json"), manifest, "file");
    assert.throws(
      () =>
        germanTask6cL01C01HausNameDirectCaptureTestHarnessDeV1.validateFixture(
          manifestSymlinkFixture,
        ),
      /capture_path_escape/u,
    );
  } catch (error: any) {
    if (error?.code !== "EPERM") throw error;
    process.stdout.write("TASK6C_C01_CAPTURE_SYMLINK manifest=SKIP_EPERM\n");
  }
} finally {
  fs.rmSync(manifestSymlinkFixture, { recursive: true, force: true });
}
reject((d) => {
  const p = path.join(d, "manifest.json"),
    v: any = read(p);
  v.captures.pop();
  fs.writeFileSync(p, JSON.stringify(v));
}, /capture_roster/u);
reject((d) => {
  const p = path.join(d, "manifest.json"),
    v: any = read(p);
  v.task7Unlock = true;
  fs.writeFileSync(p, JSON.stringify(v));
}, /capture_authority/u);
reject((d) => {
  const p = path.join(d, "manifest.json"),
    v: any = read(p);
  v.english = "translation";
  fs.writeFileSync(p, JSON.stringify(v));
}, /capture_schema/u);
reject((d) => {
  const p = path.join(d, "manifest.json"),
    v: any = read(p);
  v.upstream.additiveContractSha256 = "0";
  fs.writeFileSync(p, JSON.stringify(v));
}, /capture_upstream/u);
process.stdout.write(
  "TASK6C_C01_HAUS_NAME_DIRECT_CAPTURE_GATE PASS status=HOLD rows=2 task7Unlock=false\n",
);
