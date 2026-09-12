import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "run.mjs"), "utf8");
const factsSource = source.slice(source.indexOf("const INTRO_LEN_MIN"), source.indexOf("\nfunction courseContext("));
const modesSource = source.slice(source.indexOf("const ALLOWED_MODES"), source.indexOf("\nconst extractJson"));
const ladderSource = source.slice(source.indexOf("function difficultyLadder("), source.indexOf("\n// Текст лестницы"));
const context = {
  read: (file) => fs.readFileSync(file, "utf8"),
  path,
  LOG: () => {},
  WARN: () => {},
};
vm.runInNewContext(
  `${modesSource}\n${ladderSource}\n${factsSource}\nthis.machineFacts = machineFacts; this.HARD_FACT_RE = HARD_FACT_RE;`,
  context,
);

const realS37 = fs.readFileSync(path.join(here, "../sessions/en/l02/s37/final.ru.md"), "utf8");
const authorPrompt = fs.readFileSync(path.join(here, "prompts/author.md"), "utf8");
const badS37 = realS37.replace("🎙 **Where is the host?**", "🎙 **Whose is it?**");
assert.notEqual(badS37, realS37, "the regression fixture must change only task 16's spoken target");

function hardFacts(text, session = "en/l02/s37") {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, "learning-v2-final-probe-"));
  const file = path.join(root, "sessions", ...session.split("/"), "final.ru.md");
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    return context.machineFacts(file).split("\n").filter((line) => context.HARD_FACT_RE.test(line));
  } finally {
    assert.equal(path.dirname(root), parent);
    assert.ok(path.basename(root).startsWith("learning-v2-final-probe-"));
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const finalProbeFacts = (text, session) => hardFacts(text, session).filter((line) => line.includes("ФИНАЛ ПОДСКАЗАН"));

test("current S37 keeps an independent final phrase builder", () => {
  assert.deepEqual(finalProbeFacts(realS37), []);
});

test("the author prompt requires an independent final phrase builder", () => {
  assert.match(authorPrompt, /ФИНАЛЬНАЯ СБОРКА[^\n]+scripted_repeat_compare/i);
});

test("S37 blocks when task 16 voices the exact answer built in final task 17", () => {
  const facts = finalProbeFacts(badS37);
  assert.equal(facts.length, 1);
  assert.match(facts[0], /Whose is it/i);
});

test("the same phrase remains allowed when retrieval is not immediately before the final builder", () => {
  const nonAdjacent = realS37.replace("🎙 **Who is she?**", "🎙 **Whose is it?**");
  assert.deepEqual(finalProbeFacts(nonAdjacent), []);
});

test("an immediately preceding task in another family is not treated as a voice copy", () => {
  const listenBeforeBuild = badS37.replace(
    "16=scripted_repeat_compare, 17=phrase_builder",
    "16=listen_choose, 17=phrase_builder",
  );
  assert.deepEqual(finalProbeFacts(listenBeforeBuild), []);
});

test("the guard starts at English lesson 2 session 37 and applies to later lessons", () => {
  assert.deepEqual(finalProbeFacts(badS37, "en/l02/s36"), []);
  assert.equal(finalProbeFacts(badS37, "en/l02/s37").length, 1);
  assert.equal(finalProbeFacts(badS37, "en/l03/s01").length, 1);
  assert.deepEqual(finalProbeFacts(badS37, "fr/l03/s01"), []);
});
