import fs from "node:fs";
import path from "node:path";

const apply = process.argv.includes("--apply");
const file = path.resolve(import.meta.dirname, "../sessions/en/l01/s02/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const prefix = "en:lesson-01:session-02";

const correctFeedback = {
  i02: { ru: "Верно: в записи tired. Это слово звучит иначе, чем tide или tie.", uk: "Правильно: у записі tired. Це слово звучить інакше, ніж tide або tie." },
  i04: { ru: "Верно: в записи busy. Это не bus и не buzzy.", uk: "Правильно: у записі busy. Це не bus і не buzzy." },
  i08: { ru: "Верно: busy — «занят»: поэтому вы отказываетесь от кофе из-за дела.", uk: "Правильно: busy — «зайнятий»: тому ви відмовляєтеся від кави через справу." },
  i09: { ru: "Верно: I am sorry. — «я извиняюсь»; именно эта фраза звучит в записи.", uk: "Правильно: I am sorry. — «я перепрошую»; саме ця фраза звучить у записі." },
  "i14:s02": { ru: "Верно: sorry — здесь вы извиняетесь за опоздание.", uk: "Правильно: sorry — тут ви перепрошуєте за запізнення." },
  "i17:s03": { ru: "Верно: I am fine. — «у меня всё хорошо»; эта фраза звучит в записи.", uk: "Правильно: I am fine. — «у мене все добре»; ця фраза звучить у записі." },
};
const tileFeedback = {
  i10: { ru: "busy — «занят», но в записи tired: «устал».", uk: "busy — «зайнятий», але в записі tired: «втомлений»." },
  i11: { ru: "С I используется am, поэтому is здесь лишнее.", uk: "З I використовується am, тому is тут зайве." },
  i13: { ru: "late — «опаздываю», но в записи busy: «занят».", uk: "late — «запізнююсь», але в записі busy: «зайнятий»." },
  i15: { ru: "С I используется am, поэтому is здесь лишнее.", uk: "З I використовується am, тому is тут зайве." },
  "i17:s02": { ru: "С I используется am, поэтому is здесь лишнее.", uk: "З I використовується am, тому is тут зайве." },
  "i17:s04": { ru: "С I используется am, поэтому is здесь лишнее.", uk: "З I використовується am, тому is тут зайве." },
};

for (const locale of ["ru", "uk"]) {
  const interactions = data.interactionsByLocale[locale];
  for (const [suffix, feedbackByLocale] of Object.entries(correctFeedback)) {
    const interactionId = `${prefix}:${suffix}`;
    const interaction = interactions.find((entry) => entry.interactionId === interactionId);
    const answer = data.answers.find((entry) => entry.interactionId === interactionId);
    if (!interaction || !answer?.correctResponseId) throw new Error(`missing selectable interaction ${locale}:${suffix}`);
    const row = { responseId: answer.correctResponseId, correct: true, testedDimension: interaction.modePayload.testedDimension, feedbackByLocale };
    const existing = interaction.modePayload.choiceFeedback.find((entry) => entry.responseId === answer.correctResponseId);
    if (existing) Object.assign(existing, row); else interaction.modePayload.choiceFeedback.unshift(row);
  }
  for (const [suffix, feedbackByLocale] of Object.entries(tileFeedback)) {
    const interactionId = `${prefix}:${suffix}`;
    const interaction = interactions.find((entry) => entry.interactionId === interactionId);
    if (!interaction) throw new Error(`missing builder interaction ${locale}:${suffix}`);
    interaction.modePayload.slotFeedback = [{
      responseId: `${interactionId}:tile:d1`, correct: false, testedDimension: interaction.modePayload.testedDimension, feedbackByLocale,
    }];
  }
}

if (!apply) {
  console.log("[L01S02-FEEDBACK] dry run: add --apply to write practice.atomic.json");
  process.exit(0);
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log("[L01S02-FEEDBACK] added feedback for six selectable answers and six extra tiles");
