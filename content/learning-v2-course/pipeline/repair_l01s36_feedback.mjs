import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildInteraction, parsePractice } from "./build_release.mjs";
import { writeMockupFile } from "./write_mockup_file.mjs";

const root = path.resolve(process.env.LEARNING_V2_COURSE_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const sessionId = "en:lesson-01:session-36";
const sessionDir = path.join(root, "sessions/en/l01/s36");
const atomicFile = path.join(sessionDir, "practice.atomic.json");
const locales = ["ru", "uk"];
const tasksByLocale = Object.fromEntries(locales.map((locale) => [
  locale,
  parsePractice(fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8")),
]));
const originalBytes = fs.readFileSync(atomicFile);
const originalSha256 = crypto.createHash("sha256").update(originalBytes).digest("hex");
const atomic = JSON.parse(originalBytes);

for (const locale of locales) {
  const byId = new Map(tasksByLocale[locale].map((task) => [task.interactionId, task]));
  for (const [index, interaction] of (atomic.interactionsByLocale?.[locale] ?? []).entries()) {
    const task = byId.get(interaction.interactionId);
    if (!task) continue;
    const perLocale = Object.fromEntries(locales.map((peerLocale) => [
      peerLocale,
      tasksByLocale[peerLocale].find((candidate) => candidate.interactionId === interaction.interactionId),
    ]));
    const rebuilt = buildInteraction(task, perLocale, sessionId, index, atomic.interactionsByLocale[locale].length);
    if (Array.isArray(rebuilt.modePayload?.choiceFeedback)) interaction.modePayload.choiceFeedback = rebuilt.modePayload.choiceFeedback;
    if (Array.isArray(rebuilt.modePayload?.slotFeedback)) interaction.modePayload.slotFeedback = rebuilt.modePayload.slotFeedback;
    if (typeof rebuilt.modePayload?.testedDimension === "string") interaction.modePayload.testedDimension = rebuilt.modePayload.testedDimension;
  }
}

const output = `${JSON.stringify(atomic, null, 2)}\n`;
JSON.parse(output);
const liveSha256 = crypto.createHash("sha256").update(fs.readFileSync(atomicFile)).digest("hex");
if (liveSha256 !== originalSha256) throw new Error("S36 atomic source changed during feedback repair; refusing to replace it");
await writeMockupFile(atomicFile, output);
const expectedSha256 = crypto.createHash("sha256").update(output).digest("hex");
const writtenSha256 = crypto.createHash("sha256").update(fs.readFileSync(atomicFile)).digest("hex");
if (writtenSha256 !== expectedSha256) throw new Error("S36 atomic feedback repair verification failed");
