#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE = path.join(ROOT, "release", "en");
const CHECK = process.argv.includes("--check");
let changedFiles = 0;
let changedIds = 0;

for (const lesson of fs.readdirSync(RELEASE).filter((name) => /^l\d{2}$/u.test(name)).sort()) {
  const lessonDir = path.join(RELEASE, lesson);
  for (const session of fs.readdirSync(lessonDir).filter((name) => /^s\d{2}$/u.test(name)).sort()) {
    const sessionDir = path.join(lessonDir, session);
    const answersPath = path.join(sessionDir, "answers.json");
    const answers = new Map(JSON.parse(fs.readFileSync(answersPath, "utf8")).map((answer) => [answer.interactionId, answer]));
    for (const learnerName of ["learner.json", "learner.uk.json"]) {
      const learnerPath = path.join(sessionDir, learnerName);
      if (!fs.existsSync(learnerPath)) continue;
      const learner = JSON.parse(fs.readFileSync(learnerPath, "utf8"));
      let dirty = false;
      for (const interaction of learner.interactions) {
        const feedback = interaction.modePayload?.choiceFeedback;
        if (!Array.isArray(feedback) || feedback.length === 0) continue;
        const correctId = answers.get(interaction.interactionId)?.correctResponseId;
        const wrongIds = interaction.responseOptions.map((option) => option.responseId).filter((id) => id !== correctId);
        if (feedback.length !== wrongIds.length) throw new Error(`${interaction.interactionId}: feedback/choice count mismatch`);
        feedback.forEach((entry, index) => {
          if (entry.responseId === wrongIds[index]) return;
          entry.responseId = wrongIds[index];
          dirty = true;
          changedIds += 1;
        });
      }
      if (dirty) {
        changedFiles += 1;
        if (!CHECK) fs.writeFileSync(learnerPath, `${JSON.stringify(learner, null, 2)}\n`, "utf8");
      }
    }
  }
}

if (CHECK && changedFiles > 0) process.exitCode = 1;
console.log(`[FEEDBACK-ID] ${CHECK ? "stale" : "repaired"} files=${changedFiles} ids=${changedIds}`);
