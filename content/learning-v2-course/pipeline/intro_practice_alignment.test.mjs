import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const expectedIntroRetrieval = {
  s01: { i05: "It is a chair." },
  s03: { i05: "It is a stool." },
  s04: { i08: "It is not a window." },
  s05: { i08: "It is a ceiling." },
  s07: { i05: "It is a drawer." },
  s09: { i08: "It is an armchair.", i12: "It is not an umbrella." },
  s10: { i05: "It is a kettle." },
  s11: { i13: "Is it a uniform?" },
  s12: { i05: "It is a vase.", i16: "Is it a clock?" },
};

function assessedText(interaction) {
  const payload = interaction.modePayload ?? {};
  return payload.targetPhrase
    ?? payload.hiddenTargetPhrase
    ?? payload.gappedTargetPhrase
    ?? payload.referenceAudio?.transcript
    ?? "";
}

test("early L3 intro answers are exact assessed practice targets in both locales", () => {
  for (const [session, expectations] of Object.entries(expectedIntroRetrieval)) {
    const atomic = JSON.parse(fs.readFileSync(path.join(ROOT, "sessions", "en", "l03", session, "practice.atomic.json"), "utf8"));
    for (const locale of ["ru", "uk"]) {
      const interactions = atomic.interactionsByLocale?.[locale] ?? [];
      for (const [shortId, target] of Object.entries(expectations)) {
        const id = `en:lesson-03:session-${session.slice(1)}:${shortId}`;
        const interaction = interactions.find((item) => item.interactionId === id);
        assert.ok(interaction, `${session}:${locale}:${shortId} exists`);
        assert.equal(assessedText(interaction), target, `${session}:${locale}:${shortId}`);
      }
    }
  }
});
