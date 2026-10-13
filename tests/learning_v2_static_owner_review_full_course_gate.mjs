import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

import {
  startLearningV2StaticOwnerReviewServer,
  validateLearningV2TextEligibility,
} from "../scripts/serve_learning_v2_static_owner_review.mjs";

const REPO = process.cwd();
const COURSE = resolve(REPO, "content/learning-v2-course");
const MANIFEST = resolve(COURSE, "sessions/en/l01/s01/review-evidence-manifest.json");
const COURSE_PREFIX = "content/learning-v2-course/";

function embeddedSessions(html) {
  const marker = '<script id="data" type="application/json">';
  const start = html.indexOf(marker);
  const end = html.indexOf("</script>", start + marker.length);
  assert.equal(start >= 0 && end > start, true, "full catalogue data block must remain present");
  return JSON.parse(html.slice(start + marker.length, end));
}

function embeddedJson(html, id) {
  const marker = `<script id="${id}" type="application/json">`;
  const start = html.indexOf(marker);
  const end = html.indexOf("</script>", start + marker.length);
  assert.equal(start >= 0 && end > start, true, `${id} data block must remain present`);
  return JSON.parse(html.slice(start + marker.length, end));
}

function dataJsSessions(source) {
  const prefix = "window.__DATA__ = ";
  const trimmed = source.trimEnd();
  assert.equal(trimmed.startsWith(prefix) && trimmed.endsWith(";"), true, "data.js must retain its window.__DATA__ assignment");
  return JSON.parse(trimmed.slice(prefix.length, -1));
}

async function copyCourseFile(targetCourse, courseRelativePath) {
  const source = resolve(COURSE, ...courseRelativePath.split("/"));
  const destination = resolve(targetCourse, ...courseRelativePath.split("/"));
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

const canonicalHtml = await readFile(resolve(COURSE, "mockup/index.html"), "utf8");
const canonicalSessions = embeddedSessions(canonicalHtml);
assert.equal(canonicalSessions.length, 186, "the owner catalogue must retain all 186 current cards");
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const candidateHtml = await readFile(resolve(COURSE, manifest.candidateRoot, "index.html"), "utf8");
const [candidateSession] = embeddedSessions(candidateHtml);

const fullCourseServer = await startLearningV2StaticOwnerReviewServer({
  host: "127.0.0.1",
  port: 0,
  fullCourse: true,
  courseRoot: COURSE,
  quiet: true,
});

try {
  const catalogueResponse = await fetch(fullCourseServer.url, { cache: "no-store" });
  assert.equal(catalogueResponse.status, 200);
  const servedHtml = await catalogueResponse.text();
  const servedSessions = embeddedSessions(servedHtml);
  assert.deepEqual(servedSessions.map((entry) => entry.key), canonicalSessions.map((entry) => entry.key));
  assert.deepEqual(servedSessions[0], candidateSession, "the ordinary first card must open the verified candidate in the catalogue app");
  assert.deepEqual(servedSessions.slice(1), canonicalSessions.slice(1), "the other 185 catalogue sessions must stay unchanged");
  assert.equal(embeddedJson(servedHtml, "source-quality-findings")["en/l01/s01"], undefined);
  assert.equal(embeddedJson(servedHtml, "source-release-findings")["en/l01/s01"], undefined);
  assert.match(servedHtml, /Текст проверен/u);
  assert.match(servedHtml, /Выпуск не подтверждён/u, "text verification must not imply release authority");
  const comparison = embeddedJson(servedHtml, "owner-review-diff-data");
  const i13Change = comparison.changes.find((change) => change.groupId === "i13"
    && change.beforeByLocale?.ru?.includes("Вставьте слово — вы заходите в комнату")
    && change.afterByLocale?.ru?.includes("Послушайте реплику и выберите её смысл"));
  assert.ok(i13Change, "before/after must compare the actual catalogue i13 text with the verified candidate");
  assert.equal(JSON.stringify(comparison).includes("Fingerprint"), false);
  assert.equal(JSON.stringify(comparison).includes("SHA-256"), false);
  assert.equal(JSON.stringify(comparison).includes("after_first_attempt"), false, "runtime policy metadata must not appear as learner-facing text");
  assert.doesNotMatch(servedHtml, /current-candidate-card-wrap/u, "the real card must be enhanced, not replaced by an adjacent link");
  assert.match(servedHtml, /new MutationObserver/u, "the verified label must survive locale and home rerenders");

  const candidateResponse = await fetch(`${fullCourseServer.url}current-candidate`, { cache: "no-store" });
  assert.equal(candidateResponse.status, 200);
  const servedCandidateHtml = await candidateResponse.text();
  const candidateBodyEnd = candidateHtml.lastIndexOf("</body>");
  assert.equal(candidateBodyEnd > 0, true);
  assert.equal(servedCandidateHtml.slice(0, candidateBodyEnd), candidateHtml.slice(0, candidateBodyEnd), "candidate source before the non-content navigation wrapper must stay byte-identical");
  assert.equal(servedCandidateHtml.endsWith(candidateHtml.slice(candidateBodyEnd)), true, "candidate source after the non-content navigation wrapper must stay byte-identical");
  assert.match(servedCandidateHtml, /id="owner-review-return"/u);
  assert.match(servedCandidateHtml, /Вернуться ко всем занятиям/u);

  const dataResponse = await fetch(`${fullCourseServer.url}data.js`, { cache: "no-store" });
  assert.equal(dataResponse.status, 200);
  const servedDataSessions = dataJsSessions(await dataResponse.text());
  assert.equal(servedDataSessions.length, 186);
  assert.deepEqual(servedDataSessions[0], candidateSession);
  assert.deepEqual(servedDataSessions.slice(1), canonicalSessions.slice(1));
  const externalResponse = await fetch(`${fullCourseServer.url}external.html`, { cache: "no-store" });
  assert.equal(externalResponse.status, 200);
  assert.match(await externalResponse.text(), /"textVerified":true/u);
  const externalRuntimeResponse = await fetch(`${fullCourseServer.url}app.js`, { cache: "no-store" });
  assert.equal(externalRuntimeResponse.status, 200);
  const externalRuntime = await externalRuntimeResponse.text();
  assert.match(externalRuntime, /__ownerReviewS01RuntimePatched/u);
  assert.match(externalRuntime, /owner-review-unverified-neutral/u, "self-confirmed speaking work must use neutral status, not false error styling");

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(fullCourseServer.url, { waitUntil: "load" });
    await page.waitForSelector("button.card");
    assert.equal(await page.locator("button.card").count(), 186);
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
    assert.equal(renderMutationCount < 30, true, `verified-card observer must settle; saw ${renderMutationCount} mutations`);
    const firstCard = page.locator("button.card").first();
    await firstCard.waitFor();
    assert.equal(await firstCard.evaluate((node) => node.classList.contains("text-verified")), true);
    await firstCard.getByText("Текст проверен", { exact: true }).waitFor();
    await firstCard.click();
    await page.getByText("Первая фраза о себе: I am here", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Показать изменения", exact: true }).click();
    await page.getByText("Было в макете", { exact: true }).first().waitFor();
    await page.getByText("Стало", { exact: true }).first().waitFor();
    await page.getByRole("heading", { name: "Вводная часть 1", exact: true }).waitFor();
    await page.getByRole("heading", { name: "Задание 11", exact: true }).waitFor();
    assert.equal(await page.locator('.owner-review-diff-group[data-group-id="intro1"]').count(), 1, "intro ID must remain machine-readable only");
    assert.equal(await page.locator('.owner-review-diff-group[data-group-id="i13"]').count(), 1, "task ID must remain machine-readable only");
    assert.doesNotMatch(await page.locator(".owner-review-diff-dialog").innerText(), /(?:intro\d+|i\d+)\s*·/u, "internal IDs must not be visible in diff headings");
    await page.getByText(/Вставьте слово — вы заходите в комнату/u).first().waitFor();
    await page.getByText(/Послушайте реплику и выберите её смысл/u).first().waitFor();
    await page.getByRole("button", { name: "Закрыть сравнение", exact: true }).click();
    assert.equal(await page.locator(".owner-review-diff").count(), 0);
    await page.getByText("Первая фраза о себе: I am here", { exact: true }).waitFor();
    await page.getByRole("button", { name: "I am here.", exact: true }).click();
    const correctIntroFeedback = page.locator('.fb[role="status"]');
    await correctIntroFeedback.waitFor();
    assert.doesNotMatch(await correctIntroFeedback.innerText(), /`/u, "authored markup delimiters must not be visible");
    assert.equal(await correctIntroFeedback.locator(".tl").count() > 0, true, "target-language text must use the existing safe highlighting helper");
    assert.equal(await page.locator(".explanation-units").count() > 0, true, "verified S01 must render the authored intro analysis");
    assert.equal(await page.getByRole("button", { name: "Дальше", exact: true }).isEnabled(), true);
    await page.getByRole("button", { name: "Дальше", exact: true }).click();
    await page.getByRole("button", { name: "I am ready.", exact: true }).click();
    await page.getByRole("button", { name: "Дальше", exact: true }).click();
    await page.getByRole("button", { name: "I am happy.", exact: true }).click();
    await page.getByRole("button", { name: "Дальше", exact: true }).click();
    await page.getByRole("button", { name: "Понятно", exact: true }).click();
    await page.getByRole("button", { name: "here", exact: true }).click();
    await page.locator('.fb[role="status"]').waitFor();
    assert.equal(await page.locator(".explanation-units").count() > 0, true, "verified S01 practice must render the authored option analysis");
    await page.locator("#home").click();
    assert.equal(await page.locator("button.card").count(), 186);
    await page.selectOption("#locale", "uk");
    await page.locator("button.card").first().click();
    await page.getByText("Перша фраза про себе: I am here", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Показать изменения", exact: true }).click();
    await page.getByText(/Вставте слово — ви заходите в кімнату/u).first().waitFor();
    await page.getByText(/Послухайте репліку та виберіть її зміст/u).first().waitFor();
    await page.getByRole("button", { name: "Закрыть сравнение", exact: true }).click();
    await page.getByRole("button", { name: "I here.", exact: true }).click();
    await page.locator('.fb[role="status"]').waitFor();
    assert.equal(await page.locator(".explanation-units").count() > 0, true, "verified S01 must render Ukrainian wrong-answer analysis");
    assert.equal(await page.getByRole("button", { name: "Далі", exact: true }).isEnabled(), true);
    await page.locator("#home").click();
    assert.equal(await page.locator("button.card").count(), 186);
    await page.selectOption("#locale", "ru");
    await page.locator("button.card").nth(1).click();
    await page.getByText(canonicalSessions[1].intro.pages[0].titleByLocale.ru, { exact: true }).waitFor();
    assert.equal(await page.locator(".owner-review-diff-toggle").count(), 0, "S02 must stay on the legacy catalogue runtime");

    const externalPage = await browser.newPage();
    await externalPage.goto(`${fullCourseServer.url}external.html`, { waitUntil: "load" });
    assert.equal(await externalPage.locator("button.card").count(), 186);
    await externalPage.locator("button.card").first().click();
    await externalPage.getByRole("button", { name: "I here.", exact: true }).click();
    await externalPage.locator('.fb[role="status"]').waitFor();
    assert.equal(await externalPage.locator(".explanation-units").count() > 0, true, "external catalogue path must use the verified S01 renderer");
    await externalPage.close();
  } finally {
    await browser.close();
  }
  assert.equal((await fetch(`${fullCourseServer.url}package.json`)).status, 404);
} finally {
  await fullCourseServer.close();
}

const fixtureCourse = await mkdtemp(resolve(tmpdir(), "learning-v2-full-course-"));
try {
  const receipt = JSON.parse(await readFile(resolve(COURSE, manifest.candidateReceiptPath), "utf8"));
  const paths = new Set([
    "mockup/index.html",
    "mockup/data.js",
    "mockup/app.js",
    "mockup/external.html",
    "sessions/en/l01/s01/review-evidence-manifest.json",
    manifest.candidateReceiptPath,
    manifest.receiptChain.head.path,
    ...manifest.roles.map((role) => role.rawArtifactPath),
    ...receipt.files.map((entry) => {
      assert.equal(entry.path.startsWith(COURSE_PREFIX), true, `fixture receipt path outside course: ${entry.path}`);
      return entry.path.slice(COURSE_PREFIX.length);
    }),
  ]);
  for (const courseRelativePath of paths) await copyCourseFile(fixtureCourse, courseRelativePath);

  const fixtureManifestPath = resolve(fixtureCourse, "sessions/en/l01/s01/review-evidence-manifest.json");
  assert.equal((await validateLearningV2TextEligibility({
    courseRoot: fixtureCourse,
    manifestPath: fixtureManifestPath,
  })).textVerified, true, "seven authentic current PASS reports must make the text eligible");

  const originalManifestBytes = await readFile(fixtureManifestPath);
  const emptyManifest = JSON.parse(originalManifestBytes.toString("utf8"));
  emptyManifest.roles = emptyManifest.roles.map((role) => ({ ...role, eligible: false, verdict: "HOLD" }));
  await writeFile(fixtureManifestPath, `${JSON.stringify(emptyManifest, null, 2)}\n`);
  await assert.rejects(
    validateLearningV2TextEligibility({ courseRoot: fixtureCourse, manifestPath: fixtureManifestPath }),
    /text_review_role_not_eligible/u,
  );

  const partialManifest = JSON.parse(originalManifestBytes.toString("utf8"));
  partialManifest.roles[1] = { ...partialManifest.roles[1], eligible: false, verdict: "HOLD" };
  await writeFile(fixtureManifestPath, `${JSON.stringify(partialManifest, null, 2)}\n`);
  await assert.rejects(
    validateLearningV2TextEligibility({ courseRoot: fixtureCourse, manifestPath: fixtureManifestPath }),
    /text_review_role_not_eligible:reader/u,
  );

  const relabelledManifest = JSON.parse(originalManifestBytes.toString("utf8"));
  const learner = relabelledManifest.roles.find((role) => role.role === "learner");
  const reader = relabelledManifest.roles.find((role) => role.role === "reader");
  Object.assign(reader, {
    rawArtifactPath: learner.rawArtifactPath,
    rawArtifactBytes: learner.rawArtifactBytes,
    rawArtifactSha256: learner.rawArtifactSha256,
  });
  await writeFile(fixtureManifestPath, `${JSON.stringify(relabelledManifest, null, 2)}\n`);
  await assert.rejects(
    validateLearningV2TextEligibility({ courseRoot: fixtureCourse, manifestPath: fixtureManifestPath }),
    /text_review_raw_(role_mismatch|path_reused|hash_reused)/u,
    "a learner report relabelled as reader must fail closed",
  );

  await writeFile(fixtureManifestPath, originalManifestBytes);
  const rawToTamper = resolve(fixtureCourse, manifest.roles[0].rawArtifactPath);
  const originalRawBytes = await readFile(rawToTamper);
  await writeFile(rawToTamper, Buffer.concat([originalRawBytes, Buffer.from("\n")]))
  await assert.rejects(
    validateLearningV2TextEligibility({ courseRoot: fixtureCourse, manifestPath: fixtureManifestPath }),
    /text_review_raw_stale:learner/u,
  );
  const staleRawServer = await startLearningV2StaticOwnerReviewServer({
    host: "127.0.0.1",
    port: 0,
    fullCourse: true,
    courseRoot: fixtureCourse,
    quiet: true,
  });
  try {
    const response = await fetch(staleRawServer.url, { cache: "no-store" });
    const html = await response.text();
    assert.equal(response.status, 200, "invalid text evidence must not hide the 186-session catalogue");
    assert.deepEqual(embeddedSessions(html), canonicalSessions, "invalid text evidence must keep the old S01 fail-closed");
    assert.doesNotMatch(html, /"textVerified":true/u);
    assert.match(html, /candidate-validation-error/u);
  } finally {
    await staleRawServer.close();
  }
  await writeFile(rawToTamper, originalRawBytes);

  const fixtureReceiptPath = resolve(fixtureCourse, manifest.candidateReceiptPath);
  const originalReceiptBytes = await readFile(fixtureReceiptPath);
  await writeFile(fixtureReceiptPath, Buffer.concat([originalReceiptBytes, Buffer.from("\n")]));
  const staleReceiptServer = await startLearningV2StaticOwnerReviewServer({
    host: "127.0.0.1",
    port: 0,
    fullCourse: true,
    courseRoot: fixtureCourse,
    quiet: true,
  });
  try {
    const catalogueResponse = await fetch(staleReceiptServer.url, { cache: "no-store" });
    assert.equal(catalogueResponse.status, 200, "a stale receipt must not hide the full catalogue");
    const staleReceiptCatalogue = await catalogueResponse.text();
    assert.equal(embeddedSessions(staleReceiptCatalogue).length, 186);
    assert.match(staleReceiptCatalogue, /candidate-validation-error/u);
    const candidateResponse = await fetch(`${staleReceiptServer.url}current-candidate`, { cache: "no-store" });
    assert.equal(candidateResponse.status, 409);
    assert.match(await candidateResponse.text(), /candidate_content_receipt_manifest_hash_mismatch/u);
  } finally {
    await staleReceiptServer.close();
  }

  await writeFile(fixtureReceiptPath, originalReceiptBytes);
  const staleIntro = resolve(fixtureCourse, manifest.candidateRoot, "en/l01/s01/intro.json");
  await writeFile(staleIntro, Buffer.concat([await readFile(staleIntro), Buffer.from(" ")]));
  const staleServer = await startLearningV2StaticOwnerReviewServer({
    host: "127.0.0.1",
    port: 0,
    fullCourse: true,
    courseRoot: fixtureCourse,
    quiet: true,
  });
  try {
    const catalogueResponse = await fetch(staleServer.url, { cache: "no-store" });
    assert.equal(catalogueResponse.status, 200, "a stale candidate must not hide the full catalogue");
    const staleCatalogue = await catalogueResponse.text();
    assert.deepEqual(embeddedSessions(staleCatalogue).map((entry) => entry.key), canonicalSessions.map((entry) => entry.key));
    assert.match(staleCatalogue, /candidate-validation-error/u);
    assert.match(staleCatalogue, /Текущая правка недоступна/u);

    const candidateResponse = await fetch(`${staleServer.url}current-candidate`, { cache: "no-store" });
    assert.equal(candidateResponse.status, 409);
    assert.match(await candidateResponse.text(), /candidate_receipt_file_stale/u);
  } finally {
    await staleServer.close();
  }
} finally {
  await rm(fixtureCourse, { recursive: true, force: true });
}

process.stdout.write("LEARNING V2 STATIC OWNER REVIEW FULL COURSE: PASS\n");
