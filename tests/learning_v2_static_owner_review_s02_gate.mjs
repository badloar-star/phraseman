import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

import { materializeSessionReviewEvidenceManifest } from "../content/learning-v2-course/pipeline/session_review_evidence_manifest.mjs";
import {
  startLearningV2StaticOwnerReviewServer,
  validateLearningV2CurrentCandidate,
  validateLearningV2SessionCandidate,
  validateLearningV2TextEligibility,
} from "../scripts/serve_learning_v2_static_owner_review.mjs";

const REPO = process.cwd();
const COURSE = path.join(REPO, "content/learning-v2-course");
const S01_MANIFEST = "content/learning-v2-course/sessions/en/l01/s01/review-evidence-manifest.json";
const S02_MANIFEST = "content/learning-v2-course/outputs/s02-review-fixed-20261013/review-evidence-manifest.json";
const ROLES = ["learner", "reader", "pedagogy", "nonsense", "taste", "progression", "locale"];

function embeddedJson(html, id) {
  const marker = `<script id="${id}" type="application/json">`;
  const start = html.indexOf(marker);
  const end = html.indexOf("</script>", start + marker.length);
  assert.ok(start >= 0 && end > start, `${id} missing`);
  return JSON.parse(html.slice(start + marker.length, end));
}

async function copyRepoFile(fixtureRepo, repoRelativePath) {
  const destination = path.join(fixtureRepo, ...repoRelativePath.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(REPO, ...repoRelativePath.split("/")), destination);
}

async function copyCandidateEvidence(fixtureRepo, manifestRelativePath) {
  const asRepoPath = (value) => value.startsWith("content/learning-v2-course/") ? value : `content/learning-v2-course/${value}`;
  const manifest = JSON.parse(await readFile(path.join(REPO, ...manifestRelativePath.split("/")), "utf8"));
  const receiptRepoPath = asRepoPath(manifest.candidateReceiptPath);
  const receipt = JSON.parse(await readFile(path.join(REPO, ...receiptRepoPath.split("/")), "utf8"));
  const paths = new Set([manifestRelativePath, receiptRepoPath, ...receipt.files.map((entry) => asRepoPath(entry.path))]);
  if (manifest.receiptChain?.head?.path) paths.add(asRepoPath(manifest.receiptChain.head.path));
  for (const role of manifest.roles ?? []) if (role.rawArtifactPath) paths.add(asRepoPath(role.rawArtifactPath));
  for (const repoRelativePath of paths) await copyRepoFile(fixtureRepo, repoRelativePath);
  return { manifest, receipt };
}

const fixtureRepo = await mkdtemp(path.join(tmpdir(), "learning-v2-s02-preview-"));
const fixtureCourse = path.join(fixtureRepo, "content/learning-v2-course");
try {
  for (const name of ["index.html", "external.html", "app.js", "data.js"]) await copyRepoFile(fixtureRepo, `content/learning-v2-course/mockup/${name}`);
  await copyCandidateEvidence(fixtureRepo, S01_MANIFEST);
  const { manifest: initialS02, receipt: s02Receipt } = await copyCandidateEvidence(fixtureRepo, S02_MANIFEST);

  const receiptBytes = await readFile(path.join(fixtureRepo, ...initialS02.candidateReceiptPath.split("/")));
  const candidate = {
    candidateKey: "en/l01/s02",
    candidateBundleSha256: s02Receipt.candidateBundleSha256,
    contentReceiptInventorySha256: s02Receipt.inventorySha256,
    contentReceiptSha256: (await import("node:crypto")).createHash("sha256").update(receiptBytes).digest("hex"),
  };
  const rawArtifactPaths = {};
  for (const role of ROLES) {
    const relative = `judgements/fixture_s02_${role}.md`;
    const absolute = path.join(fixtureCourse, ...relative.split("/"));
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, [
      `Role: ${role}`, `Reviewer run: /fixture/s02/${role}`,
      `Candidate bundle SHA-256: ${candidate.candidateBundleSha256}`,
      `Content inventory SHA-256: ${candidate.contentReceiptInventorySha256}`,
      `Content receipt SHA-256: ${candidate.contentReceiptSha256}`,
      "Verdict: PASS", "",
    ].join("\n"));
    rawArtifactPaths[role] = relative;
  }
  const fullS02 = await materializeSessionReviewEvidenceManifest({ courseRoot: fixtureCourse, initialManifest: initialS02, rawArtifactPaths, candidate });
  const fixtureS02Manifest = path.join(fixtureRepo, ...S02_MANIFEST.split("/"));
  await writeFile(fixtureS02Manifest, `${JSON.stringify(fullS02, null, 2)}\n`);

  const manifestPaths = [path.join(fixtureRepo, ...S01_MANIFEST.split("/")), fixtureS02Manifest];
  const verifiedS01 = await validateLearningV2CurrentCandidate({ courseRoot: fixtureCourse, manifestPath: manifestPaths[0] });
  await validateLearningV2TextEligibility({ courseRoot: fixtureCourse, manifestPath: manifestPaths[0], candidate: verifiedS01 });
  const verifiedS02 = await validateLearningV2SessionCandidate({ courseRoot: fixtureCourse, manifestPath: manifestPaths[1] });
  await validateLearningV2TextEligibility({ courseRoot: fixtureCourse, manifestPath: manifestPaths[1], candidate: verifiedS02 });
  const server = await startLearningV2StaticOwnerReviewServer({
    host: "127.0.0.1", port: 0, fullCourse: true, courseRoot: fixtureCourse, manifestPaths, quiet: true,
  });
  try {
    const response = await fetch(server.url, { cache: "no-store" });
    assert.equal(response.status, 200);
    const html = await response.text();
    const sessions = embeddedJson(html, "data");
    assert.equal(sessions.length, 186);
    assert.equal(sessions[0].key, "en/l01/s01");
    assert.equal(sessions[1].key, "en/l01/s02");
    assert.equal(sessions[1].learner.interactions.length, 21);
    const canonical = embeddedJson(await readFile(path.join(fixtureCourse, "mockup/index.html"), "utf8"), "data");
    assert.deepEqual(sessions.slice(2), canonical.slice(2), "the other 184 catalogue entries stay byte-for-byte equivalent as data");
    assert.match(html, /__ownerReviewS01RuntimePatched/u);
    assert.match(html, /__ownerReviewS02RuntimePatched/u);
    assert.equal((html.match(/owner-review-unverified-neutral/gu) ?? []).length >= 2, true);
    const comparisons = embeddedJson(html, "owner-review-diff-data");
    assert.ok(comparisons["en/l01/s01"]?.changes?.length > 0);
    assert.ok(comparisons["en/l01/s02"]?.changes?.length > 0);

    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(server.url, { waitUntil: "load" });
      assert.equal(await page.locator("button.card").count(), 186);
      assert.equal(await page.locator("button.card.text-verified").count(), 2);
      const renderMutationCount = await page.evaluate(async () => {
        let count = 0;
        const target = document.getElementById("app");
        const observer = new MutationObserver((records) => { count += records.length; });
        observer.observe(target, { childList: true, subtree: true });
        document.getElementById("locale").dispatchEvent(new Event("change"));
        for (let turn = 0; turn < 12; turn += 1) await Promise.resolve();
        observer.disconnect();
        return count;
      });
      assert.equal(renderMutationCount < 40, true, `two verified-card observers must settle; saw ${renderMutationCount} mutations`);
      await page.locator("button.card").nth(1).click();
      await page.getByText("I am связывает говорящего с состоянием", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Показать изменения", exact: true }).click();
      await page.getByText("Было в макете", { exact: true }).first().waitFor();
      await page.getByRole("button", { name: "Закрыть сравнение", exact: true }).click();
      await page.getByRole("button", { name: "I tired.", exact: true }).click();
      await page.locator('.fb[role="status"]').waitFor();
      assert.equal(await page.locator(".explanation-units").count() > 0, true);
      assert.equal(await page.getByRole("button", { name: "Дальше", exact: true }).isEnabled(), true);
      await page.locator("#home").click();
      assert.equal(await page.locator("button.card").count(), 186);
      assert.equal(await page.locator("button.card").nth(2).evaluate((node) => node.classList.contains("text-verified")), false);
      await page.locator("button.card").nth(1).click();
      await page.getByRole("button", { name: "I am tired.", exact: true }).click();
      await page.locator('.fb[role="status"]').waitFor();
      assert.equal(await page.locator(".explanation-units").count() > 0, true);
      assert.equal(await page.getByRole("button", { name: "Дальше", exact: true }).isEnabled(), true);
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }

  const learnerRaw = path.join(fixtureCourse, rawArtifactPaths.learner);
  const learnerRawBytes = await readFile(learnerRaw);
  await writeFile(learnerRaw, Buffer.concat([learnerRawBytes, Buffer.from("tamper")]));
  const failClosed = await startLearningV2StaticOwnerReviewServer({
    host: "127.0.0.1", port: 0, fullCourse: true, courseRoot: fixtureCourse,
    manifestPaths: [path.join(fixtureRepo, ...S01_MANIFEST.split("/")), fixtureS02Manifest], quiet: true,
  });
  try {
    const html = await (await fetch(failClosed.url, { cache: "no-store" })).text();
    const sessions = embeddedJson(html, "data");
    const canonical = embeddedJson(await readFile(path.join(fixtureCourse, "mockup/index.html"), "utf8"), "data");
    assert.equal(sessions.length, 186);
    assert.notDeepEqual(sessions[0], canonical[0], "S01 remains independently verified");
    assert.deepEqual(sessions[1], canonical[1], "tampered S02 evidence fails closed without affecting S01");
    assert.match(html, /__ownerReviewS01RuntimePatched/u);
    assert.doesNotMatch(html, /__ownerReviewS02RuntimePatched/u);
  } finally {
    await failClosed.close();
  }

  await writeFile(learnerRaw, learnerRawBytes);
  const receiptPath = path.join(fixtureRepo, ...initialS02.candidateReceiptPath.split("/"));
  await writeFile(receiptPath, Buffer.concat([await readFile(receiptPath), Buffer.from("\n")]));
  const staleReceipt = await startLearningV2StaticOwnerReviewServer({
    host: "127.0.0.1", port: 0, fullCourse: true, courseRoot: fixtureCourse,
    manifestPaths: [path.join(fixtureRepo, ...S01_MANIFEST.split("/")), fixtureS02Manifest], quiet: true,
  });
  try {
    const html = await (await fetch(staleReceipt.url, { cache: "no-store" })).text();
    const sessions = embeddedJson(html, "data");
    const canonical = embeddedJson(await readFile(path.join(fixtureCourse, "mockup/index.html"), "utf8"), "data");
    assert.notDeepEqual(sessions[0], canonical[0], "S01 remains independently verified after an S02 receipt mutation");
    assert.deepEqual(sessions[1], canonical[1], "a byte-changed S02 receipt fails closed even when its JSON meaning is unchanged");
    assert.match(html, /__ownerReviewS01RuntimePatched/u);
    assert.doesNotMatch(html, /__ownerReviewS02RuntimePatched/u);
  } finally {
    await staleReceipt.close();
  }
} finally {
  await rm(fixtureRepo, { recursive: true, force: true });
}

process.stdout.write("LEARNING V2 STATIC OWNER REVIEW S02: PASS\n");
