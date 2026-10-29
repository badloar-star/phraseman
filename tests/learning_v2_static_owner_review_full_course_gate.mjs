import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { validateSessionAcceptanceReceipt } from "../content/learning-v2-course/pipeline/session_acceptance_receipt.mjs";
import { startLearningV2StaticOwnerReviewServer } from "../scripts/serve_learning_v2_static_owner_review.mjs";

const REPO = process.cwd();
const COURSE = path.resolve(REPO, "content/learning-v2-course");
const CANDIDATE_KEYS = Array.from({ length: 15 }, (_, index) => `en/l01/s${String(index + 1).padStart(2, "0")}`);
const GENERATED_PREVIEW_KEYS = CANDIDATE_KEYS.slice(0, 7);
function embeddedJson(html, id) {
  const marker = `<script id="${id}" type="application/json">`;
  const start = html.indexOf(marker); const end = html.indexOf("</script>", start + marker.length);
  assert.equal(start >= 0 && end > start, true, `${id} block must remain present`);
  return JSON.parse(html.slice(start + marker.length, end));
}
function dataJsSessions(source) {
  const prefix = "window.__DATA__ = "; const trimmed = source.trimEnd();
  assert.equal(trimmed.startsWith(prefix) && trimmed.endsWith(";"), true);
  return JSON.parse(trimmed.slice(prefix.length, -1));
}

const canonicalHtml = fs.readFileSync(path.join(COURSE, "mockup/index.html"), "utf8");
const canonicalSessions = embeddedJson(canonicalHtml, "data");
assert.equal(canonicalSessions.length, 186);
assert.equal(new Set(canonicalSessions.map((entry) => entry.key.split("/")[1])).size, 4);
const manifests = CANDIDATE_KEYS.map((key) => {
  const manifest = JSON.parse(fs.readFileSync(path.join(COURSE, "sessions", ...key.split("/"), "owner-review-preview-manifest.json"), "utf8"));
  assert.equal(manifest.reviewStatus, "TEXT_CANONICAL"); assert.equal(manifest.textVerified, true); assert.equal(manifest.releaseAuthority, false);
  return { key, manifest };
});
const candidateSessions = new Map(manifests.filter(({ key }) => GENERATED_PREVIEW_KEYS.includes(key)).map(({ key, manifest }) => {
  const [session] = embeddedJson(fs.readFileSync(path.join(REPO, manifest.candidateRoot, "index.html"), "utf8"), "data");
  assert.equal(session.key, key); return [key, session];
}));
for (const { manifest } of manifests) {
  const accepted = await validateSessionAcceptanceReceipt({ repoRoot: REPO, acceptanceReceiptPath: manifest.acceptanceReceiptPath });
  assert.equal(accepted.state, "TEXT_CANONICAL"); assert.equal(accepted.releaseAuthority, false); assert.equal(accepted.semanticAudioVerified, false);
  assert.equal(accepted.acceptanceReceiptSha256, manifest.acceptanceReceiptSha256);
}

const server = await startLearningV2StaticOwnerReviewServer({ host: "127.0.0.1", port: 0, fullCourse: true, courseRoot: COURSE, quiet: true });
try {
  const response = await fetch(server.url, { cache: "no-store" }); assert.equal(response.status, 200);
  const servedHtml = await response.text(); const servedSessions = embeddedJson(servedHtml, "data");
  assert.deepEqual(servedSessions.map((entry) => entry.key), canonicalSessions.map((entry) => entry.key));
  for (let index = 0; index < servedSessions.length; index += 1) {
    const key = servedSessions[index].key;
    if (GENERATED_PREVIEW_KEYS.includes(key)) assert.deepEqual(servedSessions[index], candidateSessions.get(key), `${key} must expose its exact accepted candidate`);
    else if (!CANDIDATE_KEYS.includes(key)) assert.deepEqual(servedSessions[index], canonicalSessions[index]);
  }
  const quality = embeddedJson(servedHtml, "source-quality-findings"); const release = embeddedJson(servedHtml, "source-release-findings");
  for (const key of CANDIDATE_KEYS) { assert.equal(quality[key], undefined); assert.equal(release[key], undefined); }
  assert.match(servedHtml, /Текст принят/u); assert.match(servedHtml, /Аудио: прослушивание не заявлено/u); assert.match(servedHtml, /В приложении: локально активно/u); assert.match(servedHtml, /В приложении: не активно — runtime-гейт/u);
  const comparisons = embeddedJson(servedHtml, "owner-review-diff-data"); assert.deepEqual(Object.keys(comparisons).sort(), CANDIDATE_KEYS);
  assert.ok(comparisons["en/l01/s01"].changes.some((change) => change.groupId === "i13"));
  assert.equal(JSON.stringify(comparisons).includes("Fingerprint"), false); assert.equal(JSON.stringify(comparisons).includes("SHA-256"), false);
  const dataResponse = await fetch(`${server.url}data.js`, { cache: "no-store" }); assert.equal(dataResponse.status, 200);
  assert.deepEqual(dataJsSessions(await dataResponse.text()), servedSessions);
  const externalResponse = await fetch(`${server.url}external.html`, { cache: "no-store" }); assert.equal(externalResponse.status, 200);
  assert.match(await externalResponse.text(), /Аудио: прослушивание не заявлено/u); assert.equal((await fetch(`${server.url}package.json`)).status, 404);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(server.url, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelectorAll("button.card").length === 186 && document.querySelectorAll(".text-verified-label").length === 15);
    for (const ordinal of Array.from({ length: 15 }, (_, index) => index + 1)) {
      const card = page.getByRole("button", { name: new RegExp(`^Урок 1 · Занятие ${ordinal} (?:—|$)`, "u") });
      assert.match(await card.getAttribute("class") ?? "", /\bsource-fixed\b/u);
      const chips = await card.locator(".chip").allTextContents();
      assert.ok(chips.includes("Текст принят")); assert.ok(chips.includes("Аудио: прослушивание не заявлено"));
      assert.ok(chips.includes("В приложении: локально активно"));
      assert.ok(chips.includes("ТЕКСТ ПРИНЯТ · АКТИВНО В ПРИЛОЖЕНИИ"));
      assert.equal(chips.some((text) => text.includes("НЕ ПРОВЕРЕНО")), false);
      assert.equal((await card.innerText()).includes("его нельзя считать проверенным"), false);
    }
    const session16 = page.getByRole("button", { name: /^Урок 1 · Занятие 16 (?:—|$)/u });
    const session16Chips = await session16.locator(".chip").allTextContents();
    assert.equal(session16Chips.includes("В приложении: локально активно"), false);
    await page.getByRole("button", { name: /^Урок 1 · Занятие 1 — «I am»/u }).click();
    await page.getByRole("button", { name: "Показать изменения", exact: true }).click(); await page.getByText("Было в макете", { exact: true }).first().waitFor();
    await page.getByRole("button", { name: "Закрыть сравнение", exact: true }).click(); await page.getByRole("button", { name: "I am here.", exact: true }).click();
    assert.equal(await page.locator('.fb[role="status"]').count(), 0); assert.equal(await page.locator(".explanation-units").count(), 0);
    const next = page.getByRole("button", { name: "Дальше", exact: true }); assert.equal(await next.isEnabled(), true); await next.click();
    await page.getByRole("button", { name: "I ready am.", exact: true }).click(); assert.match(await page.locator('.fb.no[role="status"]').textContent(), /Порядок такой/u);
    assert.equal(await page.locator(".explanation-units").count(), 0); assert.deepEqual(errors, []);
  } finally { await browser.close(); }
} finally { await server.close(); }
process.stdout.write("LEARNING V2 STATIC OWNER REVIEW FULL COURSE: PASS\n");
