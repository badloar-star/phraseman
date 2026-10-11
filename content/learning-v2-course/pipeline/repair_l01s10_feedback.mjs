#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-10";
const sourcePath = path.join(root, "sessions/en/l01/s10/practice.atomic.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const choiceFeedback = {
  "i02:r1": { ru: "Верно: `early` — «рано». В слове слышны два слога: «ёр-ли».", uk: "Правильно: `early` — «рано». У слові чути два склади: «йор-лі»." },
  "i04:r1": { ru: "Верно: `fast` — «быстро». В конце слышно твёрдое «-ст».", uk: "Правильно: `fast` — «швидко». Наприкінці чути тверде «-ст»." },
  "i06:r1": { ru: "Верно: вы говорите о том, как быстро Мира съела сэндвич: `You are fast`.", uk: "Правильно: ви говорите про те, як швидко Міра з'їла сендвіч: `You are fast`." },
  "i08:r1": { ru: "Верно: `quiet` звучит в два слога — «квайет» — и значит «тихий».", uk: "Правильно: `quiet` звучить у два склади — «кваєт» — і означає «тихий»." },
  "i09:r1": { ru: "Верно: после `You` всегда ставят `are`: `You are quiet`.", uk: "Правильно: після `You` завжди ставлять `are`: `You are quiet`." },
  "i14:r1": { ru: "Верно: если Мира просит прощения, она говорит `I am sorry`.", uk: "Правильно: якщо Міра просить пробачення, вона каже `I am sorry`." },
};
const slotFeedback = {
  i05: [{ ru: "После `You` используют `are`, а `am` бывает только после `I`.", uk: "Після `You` використовують `are`, а `am` буває лише після `I`." }],
  i10: [{ ru: "Запись просит назвать скорость — `fast`, а не время прихода.", uk: "Запис просить назвати швидкість — `fast`, а не час приходу." }],
  i13: [{ ru: "С `You` используют `are`, а не `is`.", uk: "З `You` використовують `are`, а не `is`." }],
  i15: [{ ru: "У двери Мира готова идти — `ready`, а не «занята».", uk: "Біля дверей Міра готова йти — `ready`, а не «зайнята»." }],
  i19: [
    { ru: "После `I` используют `am`, а не `is`.", uk: "Після `I` використовують `am`, а не `is`." },
    { ru: "Вы говорите, что устали, поэтому отрицание не нужно.", uk: "Ви кажете, що втомилися, тому заперечення не потрібне." },
  ],
};

for (const locale of ["ru", "uk"]) {
  const interactions = source.interactionsByLocale?.[locale];
  if (!Array.isArray(interactions) || interactions.length !== 20) throw new Error(`unexpected L01/S10 source for ${locale}`);
  const byId = new Map(interactions.map((item) => [item.interactionId, item]));
  for (const [suffix, feedbackByLocale] of Object.entries(choiceFeedback)) {
    const [task, response] = suffix.split(":");
    const item = byId.get(`${session}:${task}`);
    if (!item?.modePayload?.choiceFeedback) throw new Error(`missing choice payload ${locale}:${task}`);
    const responseId = `${session}:${task}:${response}`;
    item.modePayload.choiceFeedback = [
      ...item.modePayload.choiceFeedback.filter((entry) => entry.responseId !== responseId),
      { responseId, correct: true, testedDimension: item.prompt, feedbackByLocale },
    ];
  }
  for (const [task, rows] of Object.entries(slotFeedback)) {
    const item = byId.get(`${session}:${task}`);
    if (!item?.modePayload) throw new Error(`missing tile payload ${locale}:${task}`);
    item.modePayload.slotFeedback = rows.map((feedbackByLocale, index) => ({
      responseId: `${session}:${task}:tile:d${index + 1}`,
      correct: false,
      testedDimension: item.prompt,
      feedbackByLocale,
    }));
  }
}

fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 2)}\n`);
