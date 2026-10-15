import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "sessions/en/l01/s14");
const atomic = JSON.parse(fs.readFileSync(path.join(dir, "practice.atomic.json"), "utf8"));

test("L01/S14 wrong-only feedback, locale parity, and source mirror", () => {
  for (const locale of ["ru", "uk"]) {
    const interactions = atomic.interactionsByLocale[locale];
    for (const item of interactions) {
      assert.ok((item.modePayload?.choiceFeedback ?? []).every((entry) => entry.correct === false), `${locale}:${item.interactionId} has correct-choice feedback`);
      assert.ok((item.modePayload?.slotFeedback ?? []).every((entry) => entry.correct === false), `${locale}:${item.interactionId} has correct-tile feedback`);
    }
  }

  const ru = atomic.interactionsByLocale.ru;
  const uk = atomic.interactionsByLocale.uk;
  assert.deepEqual(ru.map((item) => [item.interactionId, item.ordinal, item.family]), uk.map((item) => [item.interactionId, item.ordinal, item.family]));
  for (const locale of ["ru", "uk"]) {
    const file = path.join(dir, `final.${locale}.md`);
    const text = fs.readFileSync(file, "utf8");
    const batch = fs.readFileSync(path.join(dir, "locales_batch.md"), "utf8");
    if (locale === "uk") assert.equal(batch.replace(/^===LOCALE: uk===\r?\n/u, "").trim(), text.trim());
    assert.match(text, /Алекс/u);
    const headings = new Map(text.split(/\r?\n/u)
      .filter((line) => line.startsWith("**"))
      .map((line) => {
        const [ordinal, ...label] = line.replace(/\*+$/u, "").slice(2).split(" · ");
        return [Number(ordinal), label.join(" · ")];
      }));
    for (const item of atomic.interactionsByLocale[locale]) {
      assert.equal(item.prompt, headings.get(item.ordinal - 3), `${locale}:${item.interactionId}: prompt/source heading mismatch`);
    }
  }
});
