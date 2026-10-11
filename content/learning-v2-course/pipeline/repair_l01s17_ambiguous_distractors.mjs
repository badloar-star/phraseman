#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "sessions/en/l01/s17/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const session = "en:lesson-01:session-17";

for (const locale of ["ru", "uk"]) {
  const byId = new Map(data.interactionsByLocale[locale].map((interaction) => [interaction.interactionId, interaction]));
  const i10 = byId.get(`${session}:i10`);
  for (const option of i10.responseOptions) {
    if (option.responseId === `${session}:i10:r2`) option.text = "tall";
  }
  for (const option of i10.modePayload.gapOptions) {
    if (option.responseId === `${session}:i10:r2`) option.text = "tall";
  }
  const i10Feedback = i10.modePayload.choiceFeedback.find((item) => item.responseId === `${session}:i10:r2`);
  i10Feedback.feedbackByLocale = {
    ru: "`tall` — «высокий»: это про рост, а здесь нужна характеристика `nice` — «приятный».",
    uk: "`tall` — «високий»: це про зріст, а тут потрібна характеристика `nice` — «приємний»."
  };

  const i15 = byId.get(`${session}:i15`);
  i15.modePayload.authoredDistractorTokens = ["tall"];
  i15.modePayload.slotFeedback = [{
    responseId: `${session}:i15:tile:d1`, correct: false, testedDimension: i15.prompt,
    feedbackByLocale: {
      ru: "`tall` — «высокий», это характеристика роста. Макс молчит, поэтому нужна фраза `He is quiet.`",
      uk: "`tall` — «високий», це характеристика зросту. Макс мовчить, тому потрібна фраза `He is quiet`."
    }
  }];
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
