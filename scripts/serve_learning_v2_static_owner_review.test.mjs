import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { startLearningV2StaticOwnerReviewServer } from "./serve_learning_v2_static_owner_review.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function canonicalCourseKeys() {
  const source = fs.readFileSync(path.join(ROOT, "content/learning-v2-course/mockup/data.js"), "utf8").trim();
  const prefix = "window.__DATA__ = ";
  assert.ok(source.startsWith(prefix) && source.endsWith(";"));
  return JSON.parse(source.slice(prefix.length, -1)).map((entry) => entry.key);
}

test("full-course root renders current S01 TEXT_CANONICAL green and locally active without claiming audio listening", async (t) => {
  const server = await startLearningV2StaticOwnerReviewServer({
    courseRoot: path.join(ROOT, "content/learning-v2-course"),
    rootDirectory: path.join(ROOT, "content/learning-v2-course/mockup"),
    fullCourse: true,
    port: 0,
    quiet: true,
  });
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(server.url);
  const card = page.getByRole("button", { name: /Урок 1 · Занятие 1 — «I am»/u });
  await card.waitFor();
  await page.waitForFunction(() => document.querySelector(".text-verified-label")?.textContent === "Текст принят");
  const classes = await card.getAttribute("class");
  const chips = await card.locator(".chip").allTextContents();
  assert.match(classes ?? "", /\bsource-fixed\b/u);
  assert.match(classes ?? "", /\btext-verified\b/u);
  assert.doesNotMatch(classes ?? "", /\bneeds-repair\b|\btext-review-pending\b/u);
  assert.ok(chips.includes("Текст принят"));
  assert.ok(chips.includes("Аудио: прослушивание не заявлено"));
  assert.ok(chips.includes("В приложении: локально активно"));
  assert.equal(chips.includes("Показана проверенная правка"), false);
  assert.equal(chips.includes("Выпуск надо синхронизировать"), false);
  assert.equal(await page.locator(".candidate-validation-error").count(), 0);
  assert.deepEqual(errors, []);

  // The canonical catalogue can finish a late render after the HOLD overlay
  // attaches. Reproduce that ordering and verify the final, settled DOM rather
  // than accepting an early snapshot that only happened to be clean.
  await card.locator(".meta").evaluate(async (meta) => {
    const stale = document.createElement("span");
    stale.className = "chip pending";
    stale.textContent = "Выпуск надо синхронизировать";
    meta.append(stale);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  assert.equal(
    await card.locator(".chip", { hasText: "Выпуск надо синхронизировать" }).count(),
    0,
  );
});

test("full-course root renders S01-S15 TEXT_CANONICAL cards and marks the exact active prefix", async (t) => {
  const server = await startLearningV2StaticOwnerReviewServer({
    courseRoot: path.join(ROOT, "content/learning-v2-course"),
    rootDirectory: path.join(ROOT, "content/learning-v2-course/mockup"),
    fullCourse: true,
    port: 0,
    quiet: true,
  });
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(server.url);
  await page.waitForFunction(() => document.querySelectorAll(".text-verified-label").length === 15);

  const canonicalKeys = canonicalCourseKeys();
  assert.deepEqual(await page.evaluate(() => DATA.map((entry) => entry.key)), canonicalKeys);
  assert.equal(new Set(canonicalKeys.map((key) => key.split("/")[1])).size, 4);

  assert.equal(canonicalKeys.length, 186);
  for (const ordinal of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
    const card = page.getByRole("button", { name: new RegExp(`^Урок 1 · Занятие ${ordinal} (?:—|$)`, "u") });
    const classes = await card.getAttribute("class");
    const chips = await card.locator(".chip").allTextContents();
    assert.match(classes ?? "", /\bsource-fixed\b/u);
    assert.match(classes ?? "", /\btext-verified\b/u);
    assert.doesNotMatch(classes ?? "", /\bneeds-repair\b|\btext-review-pending\b/u);
    assert.ok(chips.includes("Текст принят"));
    assert.ok(chips.includes("Аудио: прослушивание не заявлено"));
    assert.ok(chips.includes("В приложении: локально активно"));
    assert.equal(chips.includes("Показана проверенная правка"), false);
    assert.equal(chips.includes("Выпуск надо синхронизировать"), false);

    await card.locator(".meta").evaluate(async (meta) => {
      const stale = document.createElement("span");
      stale.className = "chip pending";
      stale.textContent = "Выпуск надо синхронизировать";
      meta.append(stale);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    assert.equal(await card.locator(".chip", { hasText: "Выпуск надо синхронизировать" }).count(), 0);
  }
  assert.equal(await page.locator(".candidate-validation-error").count(), 0);
  assert.deepEqual(errors, []);
});

test("full-course owner preview hides correct-answer explanations and gives concise wrong-answer feedback", async (t) => {
  const server = await startLearningV2StaticOwnerReviewServer({
    courseRoot: path.join(ROOT, "content/learning-v2-course"),
    rootDirectory: path.join(ROOT, "content/learning-v2-course/mockup"),
    fullCourse: true,
    port: 0,
    quiet: true,
  });
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(server.url);
  await page.getByRole("button", { name: /Урок 1 · Занятие 1 — «I am»/u }).click();

  await page.getByRole("button", { name: "I am here.", exact: true }).click();
  assert.equal(await page.locator('[role="status"]').count(), 0);
  assert.equal(await page.locator(".explanation-units").count(), 0);
  const next = page.getByRole("button", { name: "Дальше", exact: true });
  assert.equal(await next.isEnabled(), true);
  await next.click();

  await page.getByRole("button", { name: "I ready am.", exact: true }).click();
  const feedback = page.locator('[role="status"]');
  assert.match(await feedback.textContent(), /Порядок такой: `?I`?, затем `?am`?, затем слово о себе\./u);
  assert.equal(await page.locator(".explanation-units").count(), 0);
  assert.equal(await next.isEnabled(), true);
  assert.deepEqual(errors, []);
});

test("S01 owner preview shows only the exact correct pair after a wrong match", async (t) => {
  const server = await startLearningV2StaticOwnerReviewServer({
    courseRoot: path.join(ROOT, "content/learning-v2-course"),
    rootDirectory: path.join(ROOT, "content/learning-v2-course/mockup"),
    fullCourse: true,
    port: 0,
    quiet: true,
  });
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });
  const page = await browser.newPage();
  await page.goto(server.url);
  await page.getByRole("button", { name: /^Урок 1 · Занятие 1 — «I am»/u }).click();

  const pair = await page.evaluate(() => {
    const session = DATA.find((entry) => entry.key === "en/l01/s01");
    const interaction = session.learner.interactions.find((item) => item.interactionId.endsWith(":i08"));
    S.session = session;
    S.step = 11;
    resetStep();
    render();
    return {
      leftTarget: interaction.modePayload.pairGrid[0].target,
      leftMeaning: interaction.modePayload.pairGrid[0].meaningByLocale.ru,
      rightTarget: interaction.modePayload.pairGrid[1].target,
      rightMeaning: interaction.modePayload.pairGrid[1].meaningByLocale.ru,
    };
  });
  const leftColumn = page.locator(".pairs > div").nth(0);
  const rightColumn = page.locator(".pairs > div").nth(1);
  await leftColumn.getByRole("button", { name: pair.leftTarget, exact: true }).click();
  await rightColumn.getByRole("button", { name: pair.rightMeaning, exact: true }).click();

  const feedback = page.locator('.panel .fb.no[role="status"]');
  assert.equal(await feedback.textContent(), `Правильная пара: «${pair.leftTarget}» — «${pair.leftMeaning}».`);
  assert.doesNotMatch(await feedback.textContent(), /пара не подходит|попробуйте другой вариант/iu);
  assert.equal(await page.locator(".explanation").count(), 0);

  await leftColumn.getByRole("button", { name: pair.leftTarget, exact: true }).click();
  await rightColumn.getByRole("button", { name: pair.leftMeaning, exact: true }).click();
  assert.equal(await page.locator('.panel [role="status"]').count(), 0);
  assert.deepEqual(await page.locator(".explanation").allTextContents(), []);
});
