#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-18";
const file = path.join(root, "sessions/en/l01/s18/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  "i02:r1": ["`shy` — правильный ответ: в аудио слышно звук `sh`, затем «ай». Это `shy`.", "`shy` — правильна відповідь: в аудіо чути звук `sh`, потім «ай». Це `shy`."],
  "i04:r1": ["`loud` — «громкий». В записи после /l/ слышно /aʊ/: `loud`.", "`loud` — «гучний». У записі після /l/ чути /aʊ/: `loud`."],
  "i06:r1": ["Макс молчит, поэтому он `quiet` — тихий: `He is quiet.`", "Макс мовчить, тому він `quiet` — тихий: `He is quiet`."],
  "i08:r1": ["В образце A слышно `loud`: в середине «ау». В образце B — `load` с «оу».", "У зразку A чути `loud`: усередині «ау». У зразку B — `load` з «оу»."],
  "i10:r1": ["`clever` — правильный ответ: в аудио слышно два слога «кле-вер».", "`clever` — правильна відповідь: в аудіо чути два склади «кле-вер»."],
  "i15:r1": ["В подсказке Саша названа «смешной»: `funny` и значит «смешная».", "У підказці Сашу названо «смішною»: `funny` і означає «смішна»." ]
};
const tiles = {
  i12: ["`She` лишнее: речь о Максе, поэтому нужна фраза `He is clever.`", "`She` зайве: йдеться про Макса, тому потрібна фраза `He is clever`."],
  i17: ["`am` лишнее: с `He` ставят `is`: `He is kind.`", "`am` зайве: з `He` ставлять `is`: `He is kind`." ]
};
function upsertFeedback(entries, feedback) {
  const first = entries.findIndex((item) => item.responseId === feedback.responseId);
  const next = first === -1 ? [...entries, feedback] : entries.map((item, index) => index === first ? feedback : item);
  return next.filter((item, index, all) => item.responseId !== feedback.responseId || index === all.findIndex((candidate) => candidate.responseId === feedback.responseId));
}
for (const locale of ["ru", "uk"]) {
  const byId = new Map(data.interactionsByLocale[locale].map((interaction) => [interaction.interactionId, interaction]));
  const i06 = byId.get(`${session}:i06`);
  for (const option of i06.responseOptions) if (option.responseId === `${session}:i06:r3`) option.text = "shy";
  for (const option of i06.modePayload.gapOptions) if (option.responseId === `${session}:i06:r3`) option.text = "shy";
  i06.modePayload.choiceFeedback = upsertFeedback(i06.modePayload.choiceFeedback ?? [], { responseId: `${session}:i06:r3`, correct: false, testedDimension: i06.prompt, feedbackByLocale: { ru: "`shy` — «стеснительный», но в подсказке прямо сказано, что Макс не смущался; здесь нужен `quiet`.", uk: "`shy` — «сором’язливий», але в підказці прямо сказано, що Макс не ніяковів; тут потрібне `quiet`." } });
  const i08 = byId.get(`${session}:i08`);
  i08.prompt = locale === "ru" ? "Прослушайте A и B. Какое слово звучит в образце A?" : "Прослухайте A і B. Яке слово звучить у зразку A?";
  i08.modePayload.testedPhoneticContrast = i08.prompt;
  i08.modePayload.choiceFeedback = upsertFeedback(i08.modePayload.choiceFeedback ?? [], { responseId: `${session}:i08:r2`, correct: false, testedDimension: i08.prompt, feedbackByLocale: { ru: "В образце A слышно `loud` с «ау». В образце B — `load` с «оу».", uk: "У зразку A чути `loud` з «ау». У зразку B — `load` з «оу»." } });
  const i15 = byId.get(`${session}:i15`);
  i15.modePayload.choiceFeedback.find((item) => item.responseId === `${session}:i15:r2`).feedbackByLocale = { ru: "`bossy` — «командует всеми», а в подсказке сказано «смешная».", uk: "`bossy` — «командує всіма», а в підказці сказано «смішна»." };
  i15.modePayload.choiceFeedback.find((item) => item.responseId === `${session}:i15:r3`).feedbackByLocale = { ru: "`shy` — «стеснительная», а в подсказке сказано «смешная».", uk: "`shy` — «сором'язлива», а в підказці сказано «смішна»." };
  for (const [suffix, [ru, uk]] of Object.entries(choices)) {
    const [interactionSuffix, responseSuffix] = suffix.split(":");
    const interaction = byId.get(`${session}:${interactionSuffix}`);
    const responseId = `${session}:${interactionSuffix}:${responseSuffix}`;
    const feedback = {
      responseId, correct: true, testedDimension: interaction.prompt, feedbackByLocale: { ru, uk }
    };
    interaction.modePayload.choiceFeedback = upsertFeedback(interaction.modePayload.choiceFeedback ?? [], feedback);
  }
  for (const [interactionSuffix, [ru, uk]] of Object.entries(tiles)) {
    const interaction = byId.get(`${session}:${interactionSuffix}`);
    interaction.modePayload.slotFeedback = upsertFeedback(interaction.modePayload.slotFeedback ?? [], {
      responseId: `${session}:${interactionSuffix}:tile:d1`, correct: false, testedDimension: interaction.prompt, feedbackByLocale: { ru, uk }
    });
  }
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
