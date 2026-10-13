import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-45";
const tiles = { i09: "not", i11: "not", i13: "Its", i15: "its", "i17:s03": "isn't" };
test("L01/S45 explains actual distractors and removes orphan feedback", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s45/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) { const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item])); for (const [id, word] of Object.entries(tiles)) { const feedback = byId.get(id).modePayload.slotFeedback ?? []; assert.equal(feedback.some((item) => item.responseId === `${session}:${id}:r1`), false, `${locale}:${id}:orphan response`); const fixed = feedback.find((item) => item.responseId === `${session}:${id}:tile:d1`); assert.equal(fixed?.correct, false, `${locale}:${id}:wrong tile`); assert.ok((fixed?.feedbackByLocale?.[locale] ?? "").includes(word), `${locale}:${id}:explanation`); } }
});
