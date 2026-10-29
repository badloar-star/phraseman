import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildLearningV2OwnerReviewFullCourseHtml,
  candidateRuntimePatch,
  loadLearningV2LocalActivationStatus,
  OWNER_REVIEW_MANIFEST_PATHS,
  startLearningV2StaticOwnerReviewServer,
  validateLearningV2SessionCandidate,
} from "./serve_learning_v2_static_owner_review.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COURSE = path.join(ROOT, "content", "learning-v2-course");

test("local activation status requires matching validated receipts and availability prefix", async () => {
  const status = await loadLearningV2LocalActivationStatus({ courseRoot: COURSE });
  assert.equal(status.contiguousCeiling, 15);
  assert.deepEqual(status.activeSessionKeys, [
    "en/l01/s01",
    "en/l01/s02",
    "en/l01/s03",
    "en/l01/s04",
    "en/l01/s05",
    "en/l01/s06",
    "en/l01/s07",
    "en/l01/s08",
    "en/l01/s09",
    "en/l01/s10",
    "en/l01/s11",
    "en/l01/s12",
    "en/l01/s13",
    "en/l01/s14",
    "en/l01/s15",
  ]);
});

test("owner-review defaults include the exact active S01-S15 prefix", async (t) => {
  assert.deepEqual(OWNER_REVIEW_MANIFEST_PATHS, [
    "sessions/en/l01/s01/owner-review-preview-manifest.json",
    "sessions/en/l01/s02/owner-review-preview-manifest.json",
    "sessions/en/l01/s03/owner-review-preview-manifest.json",
    "sessions/en/l01/s04/owner-review-preview-manifest.json",
    "sessions/en/l01/s05/owner-review-preview-manifest.json",
    "sessions/en/l01/s06/owner-review-preview-manifest.json",
    "sessions/en/l01/s07/owner-review-preview-manifest.json",
    "sessions/en/l01/s08/owner-review-preview-manifest.json",
    "sessions/en/l01/s09/owner-review-preview-manifest.json",
    "sessions/en/l01/s10/owner-review-preview-manifest.json",
    "sessions/en/l01/s11/owner-review-preview-manifest.json",
    "sessions/en/l01/s12/owner-review-preview-manifest.json",
    "sessions/en/l01/s13/owner-review-preview-manifest.json",
    "sessions/en/l01/s14/owner-review-preview-manifest.json",
    "sessions/en/l01/s15/owner-review-preview-manifest.json",
  ]);
  const candidateApp = fs.readFileSync(path.join(COURSE, "mockup", "app.js"), "utf8");
  assert.match(candidateRuntimePatch(candidateApp, "en/l01/s06"), /__ownerReviewS06RuntimePatched/u);
  assert.match(candidateRuntimePatch(candidateApp, "en/l01/s07"), /__ownerReviewS07RuntimePatched/u);
  assert.match(candidateRuntimePatch(candidateApp, "en/l01/s08"), /__ownerReviewS08RuntimePatched/u);
  assert.match(candidateRuntimePatch(candidateApp, "en/l01/s09"), /__ownerReviewS09RuntimePatched/u);
  assert.match(candidateRuntimePatch(candidateApp, "en/l01/s10"), /__ownerReviewS10RuntimePatched/u);
  assert.match(candidateRuntimePatch(candidateApp, "en/l01/s11"), /__ownerReviewS11RuntimePatched/u);
  assert.match(candidateRuntimePatch(candidateApp, "en/l01/s12"), /__ownerReviewS12RuntimePatched/u);
  assert.match(candidateRuntimePatch(candidateApp, "en/l01/s13"), /__ownerReviewS13RuntimePatched/u);
  assert.match(candidateRuntimePatch(candidateApp, "en/l01/s14"), /__ownerReviewS14RuntimePatched/u);
  assert.match(candidateRuntimePatch(candidateApp, "en/l01/s15"), /__ownerReviewS15RuntimePatched/u);
  const manifestPath = path.join(COURSE, "sessions", "en", "l01", "s01", "owner-review-preview-manifest.json");
  const server = await startLearningV2StaticOwnerReviewServer({
    fullCourse: true,
    manifestPaths: Array.from({ length: 15 }, () => manifestPath),
    port: 0,
    quiet: true,
  });
  t.after(() => server.close());
  await assert.rejects(startLearningV2StaticOwnerReviewServer({
    fullCourse: true,
    manifestPaths: Array.from({ length: 16 }, () => manifestPath),
    port: 0,
    quiet: true,
  }), /candidate_manifest_set_invalid/u);
});

function embeddedJson(html, id) {
  const marker = `<script id="${id}" type="application/json">`;
  const start = html.indexOf(marker);
  const end = html.indexOf("</script>", start + marker.length);
  assert.ok(start >= 0 && end > start, `missing embedded JSON #${id}`);
  return JSON.parse(html.slice(start + marker.length, end));
}

function replaceEmbeddedJson(html, id, value) {
  const marker = `<script id="${id}" type="application/json">`;
  const start = html.indexOf(marker);
  const end = html.indexOf("</script>", start + marker.length);
  assert.ok(start >= 0 && end > start, `missing embedded JSON #${id}`);
  return `${html.slice(0, start + marker.length)}${JSON.stringify(value)}${html.slice(end)}`;
}

test("current S01 TEXT_CANONICAL preview is bound to its immutable acceptance receipt", async (t) => {
  const manifestPath = path.join(COURSE, "sessions", "en", "l01", "s01", "owner-review-preview-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.reviewStatus, "TEXT_CANONICAL");
  assert.equal(manifest.textReviewEvidencePersisted, true);
  assert.equal(manifest.textVerified, true);
  assert.equal(manifest.releaseAuthority, false);
  const candidate = await validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath });
  assert.equal(candidate.privatePreview, true);
  assert.equal(candidate.textCanonical, true);
  assert.equal(candidate.candidateBundleSha256, "f537e8fe7e168549d1e1bc2299d4c26ac038d2bfc11575f5ce50ab7a1acd9207");
  assert.equal(candidate.contentReceiptInventorySha256, "a9961ffe087c1970017e58bb4e12146a49ef2aa31097ea75fe1ace4dfdd02d58");
  assert.equal(candidate.contentReceiptSha256, "a61233a87a51664b38c3d9d4e3b19d5fd3b0b3c5feca95148c21c914b85f5501");

  const tamperedManifestPath = path.join(path.dirname(manifestPath), `.owner-review-preview-manifest-${process.pid}.tampered.json`);
  t.after(() => fs.rmSync(tamperedManifestPath, { force: true }));
  fs.writeFileSync(tamperedManifestPath, `${JSON.stringify({ ...manifest, candidateBundleSha256: "0".repeat(64) }, null, 2)}\n`);
  await assert.rejects(
    () => validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath: tamperedManifestPath }),
    /candidate_content_receipt_manifest_mismatch/u,
  );
});

test("current S02 TEXT_CANONICAL preview is hash-bound and has no release authority", async (t) => {
  const manifestPath = path.join(COURSE, "sessions", "en", "l01", "s02", "owner-review-preview-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.schemaVersion, "learning_v2_session_private_preview_manifest_v1");
  assert.equal(manifest.reviewStatus, "TEXT_CANONICAL");
  assert.equal(manifest.textReviewEvidencePersisted, true);
  assert.equal(manifest.textVerified, true);
  assert.equal(manifest.releaseAuthority, false);
  const candidate = await validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath });
  assert.equal(candidate.privatePreview, true);
  assert.equal(candidate.textCanonical, true);
  assert.equal(candidate.candidateKey, "en/l01/s02");
  assert.equal(candidate.candidateBundleSha256, manifest.candidateBundleSha256);
  assert.equal(candidate.contentReceiptInventorySha256, manifest.candidateReceiptInventorySha256);
  assert.equal(candidate.contentReceiptSha256, manifest.contentReceiptSha256);

  const tamperedManifestPath = path.join(path.dirname(manifestPath), `.owner-review-preview-manifest-${process.pid}.tampered.json`);
  t.after(() => fs.rmSync(tamperedManifestPath, { force: true }));
  fs.writeFileSync(tamperedManifestPath, `${JSON.stringify({ ...manifest, candidateBundleSha256: "0".repeat(64) }, null, 2)}\n`);
  await assert.rejects(
    () => validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath: tamperedManifestPath }),
    /candidate_content_receipt_manifest_mismatch/u,
  );
});

test("current S04 TEXT_CANONICAL preview is hash-bound and has no release authority", async (t) => {
  const manifestPath = path.join(COURSE, "sessions", "en", "l01", "s04", "owner-review-preview-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.schemaVersion, "learning_v2_session_private_preview_manifest_v1");
  assert.equal(manifest.reviewStatus, "TEXT_CANONICAL");
  assert.equal(manifest.textReviewEvidencePersisted, true);
  assert.equal(manifest.textVerified, true);
  assert.equal(manifest.releaseAuthority, false);
  const candidate = await validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath });
  assert.equal(candidate.privatePreview, true);
  assert.equal(candidate.textCanonical, true);
  assert.equal(candidate.candidateKey, "en/l01/s04");
  assert.equal(candidate.candidateBundleSha256, manifest.candidateBundleSha256);
  assert.equal(candidate.contentReceiptInventorySha256, manifest.candidateReceiptInventorySha256);
  assert.equal(candidate.contentReceiptSha256, manifest.contentReceiptSha256);

  const tamperedManifestPath = path.join(path.dirname(manifestPath), `.owner-review-preview-manifest-${process.pid}.tampered.json`);
  t.after(() => fs.rmSync(tamperedManifestPath, { force: true }));
  fs.writeFileSync(tamperedManifestPath, `${JSON.stringify({ ...manifest, candidateBundleSha256: "0".repeat(64) }, null, 2)}\n`);
  await assert.rejects(
    () => validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath: tamperedManifestPath }),
    /candidate_content_receipt_manifest_mismatch/u,
  );
});

test("current S05 TEXT_CANONICAL preview rebuilds with its accepted predecessor receipt", async () => {
  const manifestPath = path.join(COURSE, "sessions", "en", "l01", "s05", "owner-review-preview-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.schemaVersion, "learning_v2_session_private_preview_manifest_v1");
  assert.equal(manifest.reviewStatus, "TEXT_CANONICAL");
  assert.equal(manifest.textReviewEvidencePersisted, true);
  assert.equal(manifest.textVerified, true);
  assert.equal(manifest.releaseAuthority, false);
  const candidate = await validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath });
  assert.equal(candidate.privatePreview, true);
  assert.equal(candidate.textCanonical, true);
  assert.equal(candidate.candidateKey, "en/l01/s05");
  assert.equal(candidate.candidateBundleSha256, manifest.candidateBundleSha256);
  assert.equal(candidate.contentReceiptInventorySha256, manifest.candidateReceiptInventorySha256);
  assert.equal(candidate.contentReceiptSha256, manifest.contentReceiptSha256);
});

test("current S08 projection-only TEXT_CANONICAL candidate remains inspectable without mutating its receipt", async () => {
  const manifestPath = path.join(COURSE, "sessions", "en", "l01", "s08", "owner-review-preview-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const candidate = await validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath });
  assert.equal(candidate.privatePreview, true);
  assert.equal(candidate.textCanonical, true);
  assert.equal(candidate.candidateKey, "en/l01/s08");
  assert.equal(candidate.projectionOnlyPreview, true);
  assert.equal(candidate.candidateBundleSha256, manifest.candidateBundleSha256);
});

test("current S09 projection-only TEXT_CANONICAL candidate is hash-bound to its acceptance", async () => {
  const manifestPath = path.join(COURSE, "sessions", "en", "l01", "s09", "owner-review-preview-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const candidate = await validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath });
  assert.equal(candidate.privatePreview, true);
  assert.equal(candidate.textCanonical, true);
  assert.equal(candidate.candidateKey, "en/l01/s09");
  assert.equal(candidate.projectionOnlyPreview, true);
  assert.equal(candidate.candidateBundleSha256, "9a53fac66007c96f4f46c8fd47cacebeb08ba3359d8bf5749e683157793044ec");
  assert.equal(candidate.contentReceiptSha256, "88c0d6b0076a8480bb190b195a10c970a32fdc726a425edee17bf5fffb14fb35");
  assert.equal(manifest.acceptanceReceiptSha256, "d7f9430e3121cf541d922a3c1c1c975bde96735538d5d75aa4ab424d4e4edaba");
});

test("current S10 projection-only TEXT_CANONICAL candidate is hash-bound to its exact accepted v3 bundle", async () => {
  const manifestPath = path.join(COURSE, "sessions", "en", "l01", "s10", "owner-review-preview-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const candidate = await validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath });
  assert.equal(candidate.privatePreview, true);
  assert.equal(candidate.textCanonical, true);
  assert.equal(candidate.candidateKey, "en/l01/s10");
  assert.equal(candidate.projectionOnlyPreview, true);
  assert.equal(candidate.candidateBundleSha256, "f77803358c13c22f2c51cb6b7b4821322b45290ddfce7185345ecaa05fcd1ba4");
  assert.equal(candidate.contentReceiptSha256, "7eca6d15985073b13f103e6fe0890a8c8c49c7faaca9227389dbf6752ebe4605");
  assert.equal(manifest.acceptanceReceiptSha256, "57a2378df4e7fff8a7613452c1f6d3a30bdee7c0b7919e461c8a097bae7b2bc4");
});

test("current S11 projection-only TEXT_CANONICAL candidate is hash-bound to its exact acceptance", async () => {
  const manifestPath = path.join(COURSE, "sessions", "en", "l01", "s11", "owner-review-preview-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const candidate = await validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath });
  assert.equal(candidate.privatePreview, true);
  assert.equal(candidate.textCanonical, true);
  assert.equal(candidate.candidateKey, "en/l01/s11");
  assert.equal(candidate.projectionOnlyPreview, true);
  assert.equal(candidate.candidateBundleSha256, "1445fa85a7dc2eb496a574ec93c379f1f616019628bbb95fd7f6cb0a5b60c35d");
  assert.equal(candidate.contentReceiptInventorySha256, "7727d5907be25e14ad9e096b567d723e50d1145c2684261d782a0f36166967ce");
  assert.equal(candidate.contentReceiptSha256, "763585397f9fc1bf44c2ded41cd62ae17405c27371ceaffa020606173a9b2492");
  assert.equal(manifest.acceptanceReceiptSha256, "b3225f3f70f310efe339e7693003dbe483596296fa3fe0d7148e8c8f75ac9214");
});

test("current S12 projection-only TEXT_CANONICAL candidate is hash-bound to its exact acceptance", async () => {
  const manifestPath = path.join(COURSE, "sessions", "en", "l01", "s12", "owner-review-preview-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const candidate = await validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath });
  assert.equal(candidate.privatePreview, true);
  assert.equal(candidate.textCanonical, true);
  assert.equal(candidate.candidateKey, "en/l01/s12");
  assert.equal(candidate.projectionOnlyPreview, true);
  assert.equal(candidate.candidateBundleSha256, "e10d6dc1a99359d29755c4ec20af69c36cf16d6391659a794e57b0d1762f4ca3");
  assert.equal(candidate.contentReceiptInventorySha256, "7ee4463c5a6b5e754e953072847c6bd0c85e32832d06cd836a03a14771202fe6");
  assert.equal(candidate.contentReceiptSha256, "315c1a6a2805920edb01eb6ae540f5a58fc3945a2a1532442b3e0e27f6c7e6b8");
  assert.equal(manifest.acceptanceReceiptSha256, "1646a700c90324ac4e17a35e6d4809f4a52c25ed4df4b2c8ea441950170e88f2");
});

test("current S13 projection-only TEXT_CANONICAL candidate is hash-bound to its exact acceptance", async () => {
  const manifestPath = path.join(COURSE, "sessions", "en", "l01", "s13", "owner-review-preview-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const candidate = await validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath });
  assert.equal(candidate.privatePreview, true);
  assert.equal(candidate.textCanonical, true);
  assert.equal(candidate.candidateKey, "en/l01/s13");
  assert.equal(candidate.projectionOnlyPreview, true);
  assert.equal(candidate.candidateBundleSha256, "538f4e2004ba4575944a49a00bd80a34d7d1c18407175b49acd7e1f6afb8670b");
  assert.equal(candidate.contentReceiptInventorySha256, "20834a1e4eb19c708c4792e54b8bf46cb143cb4aba2c260ab596c97ce662e54b");
  assert.equal(candidate.contentReceiptSha256, "e3b3cb3ae5757edcbc91e94f1764104df5a8ec614c1e4f9ece35e2435cc1872a");
  assert.equal(manifest.acceptanceReceiptSha256, "91bd34c0e421347bb5f4d09ea7c12df96aa4fe2da17f2cfa1ca7bfa69c4a8c68");
});

test("current S14 projection-only TEXT_CANONICAL candidate is hash-bound to its exact acceptance", async () => {
  const manifestPath = path.join(COURSE, "sessions", "en", "l01", "s14", "owner-review-preview-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const candidate = await validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath });
  assert.equal(candidate.privatePreview, true);
  assert.equal(candidate.textCanonical, true);
  assert.equal(candidate.candidateKey, "en/l01/s14");
  assert.equal(candidate.projectionOnlyPreview, true);
  assert.equal(candidate.candidateBundleSha256, "93af682f890f9aef485221c2a493e795f6e82c414dfe48f0d0e251527723e77b");
  assert.equal(candidate.contentReceiptInventorySha256, "b037571b16cd3efab63028a0a9daa46c60a6dab6758425d7851537e9f6eda6e3");
  assert.equal(candidate.contentReceiptSha256, "43dc2d37aeea838e86d96eded51222d89e6f47465f0b204eaa576f874fdffc1d");
  assert.equal(manifest.acceptanceReceiptSha256, "0e9d4a793d5706fc385241ba4b6a67385d6727a5abc96a63b67857df1f026e27");
});

test("current S15 projection-only TEXT_CANONICAL candidate is hash-bound to its exact acceptance", async () => {
  const manifestPath = path.join(COURSE, "sessions", "en", "l01", "s15", "owner-review-preview-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const candidate = await validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath });
  assert.equal(candidate.privatePreview, true);
  assert.equal(candidate.textCanonical, true);
  assert.equal(candidate.candidateKey, "en/l01/s15");
  assert.equal(candidate.projectionOnlyPreview, true);
  assert.equal(candidate.candidateBundleSha256, "a7dc0771ac43c4e9682b6eaf2ba91b1fb88dffa0f1d59a8d1523f8b41377266f");
  assert.equal(candidate.contentReceiptInventorySha256, "efa884665acc812d82815ad6bfb182d1a9c646272578cf82ad71295f519475fd");
  assert.equal(candidate.contentReceiptSha256, "830982882eba644a7b0290be742793ca964a1dd6725d7f5cabc323d13751bcbc");
  assert.equal(manifest.acceptanceReceiptSha256, "521336dfdeac934ed7aed9b62062ad00caae97703cfa4c466300e3a837f72796");
});

test("S06 is text-canonical and active inside the validated app prefix", async () => {
  const manifestPath = path.join(COURSE, "sessions", "en", "l01", "s06", "owner-review-preview-manifest.json");
  const candidate = await validateLearningV2SessionCandidate({ courseRoot: COURSE, manifestPath });
  assert.equal(candidate.textCanonical, true);
  const canonical = fs.readFileSync(path.join(COURSE, "mockup", "index.html"), "utf8");
  const served = await buildLearningV2OwnerReviewFullCourseHtml(canonical, [{
    ok: true,
    textVerified: true,
    candidate,
  }], {
    canonicalHtml: canonical,
    includeRuntime: false,
    activeSessionKeys: ["en/l01/s01", "en/l01/s02", "en/l01/s03", "en/l01/s04", "en/l01/s05", "en/l01/s06", "en/l01/s07"],
  });
  assert.match(served, /const states=\[\{"key":"en\/l01\/s06","textVerified":true,"appActivated":true,"releaseAuthority":false\}\]/u);
  assert.match(served, /ТЕКСТ ПРИНЯТ · АКТИВНО В ПРИЛОЖЕНИИ/u);
  assert.match(served, /В приложении: локально активно/u);
  assert.match(served, /Аудио: прослушивание не заявлено/u);
});

test("owner overlay paints only exact TEXT_CANONICAL candidates green while keeping audio and app activation explicit", async (t) => {
  const canonical = fs.readFileSync(path.join(COURSE, "mockup", "index.html"), "utf8");
  const candidateKey = "en/l01/s01";
  const canonicalEntry = embeddedJson(canonical, "data").find((entry) => entry.key === candidateKey);
  assert.ok(canonicalEntry, `missing fixture catalogue entry ${candidateKey}`);
  const candidateEntry = structuredClone(canonicalEntry);
  candidateEntry.scene = `${canonicalEntry.scene} [текст кандидата]`;
  candidateEntry.sceneByLocale.ru = candidateEntry.scene;
  assert.notDeepEqual(candidateEntry, canonicalEntry, "candidate fixture must differ from the canonical card");
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-owner-review-status-"));
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));
  const candidateIndexPath = path.join(fixtureRoot, "index.html");
  fs.writeFileSync(candidateIndexPath, replaceEmbeddedJson(canonical, "data", [candidateEntry]));
  const qualityFinding = [{ code: "fixture_quality_hold" }];
  const releaseFinding = [{ code: "fixture_release_hold" }];
  let fixture = replaceEmbeddedJson(canonical, "source-quality-findings", { [candidateKey]: qualityFinding });
  fixture = replaceEmbeddedJson(fixture, "source-release-findings", { [candidateKey]: releaseFinding });
  fixture = replaceEmbeddedJson(fixture, "reviewed-cards", {
    schemaVersion: "reviewed-card-evidence-v2",
    cards: { [candidateKey]: true },
  });

  const served = await buildLearningV2OwnerReviewFullCourseHtml(fixture, [{
    ok: true,
    textVerified: true,
    candidate: {
      candidateKey,
      candidateIndexPath,
    },
  }], { canonicalHtml: canonical, includeRuntime: false, activeSessionKeys: [candidateKey] });

  assert.deepEqual(embeddedJson(served, "data").find((entry) => entry.key === candidateKey), candidateEntry,
    "catalogue must serve the candidate text itself, not the old canonical card");
  assert.match(served, /const states=\[\{"key":"en\/l01\/s01","textVerified":true,"appActivated":true,"releaseAuthority":false\}\]/u);
  assert.ok(embeddedJson(served, "owner-review-diff-data").changes.some((change) => (
    change.beforeByLocale?.ru === canonicalEntry.scene
    && change.afterByLocale?.ru === candidateEntry.scene
  )), "before/after must show the actual changed candidate scene");
  assert.equal(embeddedJson(served, "source-quality-findings")[candidateKey], undefined);
  assert.equal(embeddedJson(served, "source-release-findings")[candidateKey], undefined);
  assert.equal(embeddedJson(served, "reviewed-cards").cards[candidateKey], undefined);
  assert.match(served, /card\.classList\.add\("source-fixed","text-verified"\)/u);
  assert.doesNotMatch(served, /card\.classList\.add\("needs-repair","text-verified"\)/u);
  assert.match(served, /Текст принят/u);
  assert.match(served, /ТЕКСТ ПРИНЯТ · АКТИВНО В ПРИЛОЖЕНИИ/u);
  assert.match(served, /Проверенный текст локально активирован в приложении\./u);
  assert.match(served, /Аудио: прослушивание не заявлено/u);
  assert.match(served, /В приложении: локально активно/u);
  const ownerInjection = served.slice(served.indexOf('<style id="current-candidate-style">'));
  assert.doesNotMatch(ownerInjection, /одобр/u);
  assert.doesNotMatch(ownerInjection, /семь|7 суд/u);

  const held = await buildLearningV2OwnerReviewFullCourseHtml(fixture, [{
    ok: true,
    textVerified: false,
    candidate: {
      candidateKey,
      candidateIndexPath,
    },
  }], { canonicalHtml: canonical, includeRuntime: false, activeSessionKeys: [] });
  assert.deepEqual(embeddedJson(held, "data").find((entry) => entry.key === candidateKey), candidateEntry,
    "a structurally valid HOLD candidate must remain inspectable without becoming text-verified");
  assert.match(held, /const states=\[\{"key":"en\/l01\/s01","textVerified":false,"appActivated":false,"releaseAuthority":false\}\]/u);
  assert.match(held, /Текст ещё проверяется/u);
  assert.doesNotMatch(held, /verified\.textContent="Текст проверен"/u);
  assert.match(held, /В приложении: не активировано/u);
});
