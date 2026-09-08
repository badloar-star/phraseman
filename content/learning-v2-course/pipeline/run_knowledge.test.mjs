import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "run.mjs"), "utf8");
const fn = source.slice(source.indexOf("function knownBefore("), source.indexOf("function neighborsSummary("));
const context = {};
vm.runInNewContext(fn, context);
const plan = (rows) => ({ rows: new Map(rows) });
const row = (type, grammar, words) => ({ type, grammar, words });

test("knowledge includes earlier lessons but excludes current and future sessions", () => {
  const previous = plan([[1, row("новая", "I am", "ready, cold")], [56, row("проверка", "review", "happy")]]);
  const current = plan([[1, row("новая", "Are you", "cold, tired")], [2, row("тонкость", "short answer", "busy")], [3, row("новая", "Who is", "host")], [4, row("новая", "Who are", "guests")]]);
  const actual = context.knownBefore(current, 3, [previous]);
  assert.deepEqual(Array.from(actual.ops), ["I am", "Are you", "short answer"]);
  assert.deepEqual(Array.from(actual.words), ["ready", "cold", "happy", "tired", "busy"]);
});

test("first session of first lesson has no inherited knowledge", () => {
  const current = plan([[1, row("новая", "I am", "ready")]]);
  const actual = context.knownBefore(current, 1);
  assert.deepEqual(Array.from(actual.ops), []);
  assert.deepEqual(Array.from(actual.words), []);
});
