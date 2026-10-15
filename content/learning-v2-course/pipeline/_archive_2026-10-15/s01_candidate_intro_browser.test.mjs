import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

const PIPELINE = path.dirname(fileURLToPath(import.meta.url));
const COURSE = path.resolve(PIPELINE, "..");
const CANDIDATE = path.join(COURSE, "outputs/s01-learner3-fixed-20261013/index.html");

async function openCandidate(locale) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(pathToFileURL(CANDIDATE).href);
  await page.locator("#locale").selectOption(locale);
  return { browser, page, errors };
}

async function answerIntro(page, answerText) {
  await page.getByRole("button", { name: answerText, exact: true }).click();
  const feedback = page.locator('[role="status"]');
  await feedback.waitFor();
  const next = page.locator("button.btn.primary");
  assert.equal(await next.isEnabled(), true, `Next stayed blocked after ${answerText}: ${await feedback.textContent()}`);
  assert.doesNotMatch(await feedback.textContent(), /разбор.*отсутств|розбір.*відсут/iu);
  return { feedback, next };
}

test("S01 RU wrong intro answer shows its analysis and unlocks the next intro", async (t) => {
  const { browser, page, errors } = await openCandidate("ru");
  t.after(() => browser.close());

  await page.locator("button.card").click();
  const { next } = await answerIntro(page, "Am here.");
  assert.match(await page.locator(".explanation-units").textContent(), /Am|here|I/u);
  await next.click();
  assert.match(await page.locator("h2").textContent(), /Четыре фразы/u);
  assert.deepEqual(errors, []);
});

test("S01 UK correct intro answer shows its analysis and all three intros are traversable", async (t) => {
  const { browser, page, errors } = await openCandidate("uk");
  t.after(() => browser.close());

  assert.doesNotMatch(await page.locator(".lesson-title").textContent(), /утверждение/u);
  assert.equal((await page.locator("#buildStamp").textContent()).startsWith("1 заняття ·"), true);
  await page.locator("button.card").click();

  for (const answer of ["I am here.", "I am ready.", "I am happy."]) {
    const { next } = await answerIntro(page, answer);
    assert.match(await page.locator(".explanation-units").textContent(), /I|am/u);
    await next.click();
  }

  assert.match(await page.locator(".kind").textContent(), /^Завдання 1\b/u);
  assert.deepEqual(errors, []);
});
