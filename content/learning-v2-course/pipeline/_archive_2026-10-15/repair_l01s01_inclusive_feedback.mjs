#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { parsePractice } from "./build_release.mjs";

const apply = process.argv.includes("--apply");
const sessionDir = path.resolve(import.meta.dirname, "../sessions/en/l01/s01");
const atomicPath = path.join(sessionDir, "practice.atomic.json");
const locales = ["ru", "uk"];
const choiceFamilies = new Set(["listen_choose", "context_gap_grammar", "sound_contrast"]);

const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
const tasksByLocale = Object.fromEntries(locales.map((locale) => [
  locale,
  parsePractice(fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8")),
]));

let changed = 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const replace = (container, field, value) => {
  if (same(container[field], value)) return;
  container[field] = value;
  changed += 1;
};

for (const projectionLocale of locales) {
  const interactions = atomic.interactionsByLocale?.[projectionLocale];
  const projectionTasks = tasksByLocale[projectionLocale];
  if (!Array.isArray(interactions) || interactions.length !== projectionTasks.length) {
    throw new Error(`l01s01_inclusive_feedback_shape:${projectionLocale}`);
  }

  for (const [index, task] of projectionTasks.entries()) {
    const interaction = interactions[index];
    if (interaction?.interactionId !== task.interactionId) {
      throw new Error(`l01s01_inclusive_feedback_id:${projectionLocale}:${index}`);
    }
    const payload = interaction.modePayload;
    if (!payload) throw new Error(`l01s01_inclusive_feedback_payload:${projectionLocale}:${task.interactionId}`);

    if (choiceFamilies.has(task.family) && !task.card) {
      const expectedFeedback = task.options.map((option, optionIndex) => {
        const feedbackByLocale = Object.fromEntries(locales.map((locale) => {
          const localizedTask = tasksByLocale[locale][index];
          if (localizedTask?.interactionId !== task.interactionId || localizedTask.options.length !== task.options.length) {
            throw new Error(`l01s01_inclusive_feedback_locale_option_shape:${locale}:${task.interactionId}`);
          }
          return [locale, localizedTask.options[optionIndex]?.feedback ?? ""];
        }));
        return {
          responseId: `${task.interactionId}:r${optionIndex + 1}`,
          correct: Boolean(option.correct),
          testedDimension: task.title,
          feedbackByLocale,
        };
      });
      replace(payload, "choiceFeedback", expectedFeedback);
      if (task.family === "context_gap_grammar") replace(payload, "testedDimension", task.title);
      if (task.family === "sound_contrast") replace(payload, "testedPhoneticContrast", task.title);
    }

    if (task.family === "speed_match") {
      const expectedPairs = task.pairs.map((pair, pairIndex) => ({
        pairId: `${task.interactionId}:p${pairIndex + 1}`,
        target: pair.target,
        meaningByLocale: Object.fromEntries(locales.map((locale) => {
          const localizedPair = tasksByLocale[locale][index]?.pairs?.[pairIndex];
          if (!localizedPair || localizedPair.target !== pair.target) {
            throw new Error(`l01s01_inclusive_feedback_pair_shape:${locale}:${task.interactionId}:${pairIndex}`);
          }
          return [locale, localizedPair.meaning];
        })),
      }));
      replace(payload, "pairGrid", expectedPairs);
      replace(payload, "leftColumn", expectedPairs.map((pair) => pair.target));
      replace(payload, "rightColumn", expectedPairs.map((pair) => pair.meaningByLocale[projectionLocale]));
    }
  }
}

if (changed && apply) fs.writeFileSync(atomicPath, `${JSON.stringify(atomic, null, 2)}\n`);
console.log(JSON.stringify({ verdict: changed ? (apply ? "APPLIED" : "CHANGES_REQUIRED") : "PASS", changed, apply }));
process.exitCode = changed && !apply ? 1 : 0;
