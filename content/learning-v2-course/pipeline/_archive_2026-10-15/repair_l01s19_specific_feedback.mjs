#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-19";
const file = path.join(root, "sessions/en/l01/s19/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  "i02:r1": ["В записи слышно `angry`: начало «энг-», не `hungry` и не `early`.", "У записі чути `angry`: початок «енг-», не `hungry` і не `early`."],
  "i04:r1": ["В записи односложное `rude` с гласной «у». Это не `ready` и не `red`.", "У записі односкладове `rude` з голосною «у». Це не `ready` і не `red`."],
  "i07:r1": ["В образце A слышно `slow`: перед `low` есть звук `s`.", "У зразку A чути `slow`: перед `low` є звук `s`."],
  "i08:r1": ["В записи `slow`: первый звук `s` отличает его от `low`.", "У записі `slow`: перший звук `s` відрізняє його від `low`."],
  "i10:r1": ["Анна никого не обижает, поэтому она не `mean` — не вредная.", "Анна нікого не ображає, тому вона не `mean` — не шкідлива."],
  "i13:r1": ["В записи три слога `serious`; это не односложное `sure` и не `sorry`.", "У записі три склади `serious`; це не односкладове `sure` і не `sorry`."],
  "i15:r1": ["С `He` ставят `is`: `He is kind.`", "З `He` ставлять `is`: `He is kind`."],
  "i18:r1": ["Анна не сердится и молчит, поэтому она `quiet` — тихая.", "Анна не сердиться й мовчить, тому вона `quiet` — тиха."]
};
const tiles = {
  i17: ["`are` лишнее: с `She` ставят `is`: `She is not rude.`", "`are` зайве: з `She` ставлять `is`: `She is not rude`."],
  i19: ["`not` лишнее: Олег занят, поэтому `He is busy.`", "`not` зайве: Олег зайнятий, тому `He is busy`." ]
};
const semantic = {
  ru: {
    i02r3: "«Рано». В `angry` после первого гласного слышится «нг», а в `early` этого нет.",
    i07: "Прослушайте образцы A и B. Какое слово звучит в образце A?",
    i07r2: "В образце A звучит `slow`: перед `low` есть звук `s`; образец B — `low`.",
    i10: "Вставьте слово — Лина говорит: «Анна никого не обижает; она просто тихая». Скажите, что Анна не злая",
    i10r1: "Анна никого не обижает, поэтому она не `mean` — не злая и не недобрая.",
    i15r3: "С `he` ставят `is`, не `are`: `He is kind.`",
    i18r3: "В подсказке сказано, что Анна молчит и не сердится. Это прямо описывает `quiet`; грубого поступка здесь не названо."
  },
  uk: {
    i02r3: "«Рано». У `angry` після першого голосного чути «нг», а в `early` цього немає.",
    i07: "Прослухайте зразки A і B. Яке слово звучить у зразку A?",
    i07r2: "У зразку A звучить `slow`: перед `low` є звук `s`; зразок B — `low`.",
    i10: "Вставте слово — Ліна каже: «Анна нікого не ображає; вона просто тиха». Скажіть, що Анна не недобра",
    i10r1: "Анна нікого не ображає, тому вона не `mean` — не недобра.",
    i15r3: "З `he` ставлять `is`, а не `are`: `He is kind.`",
    i18r3: "У підказці сказано, що Анна мовчить і не сердиться. Це прямо описує `quiet`; грубого вчинку тут не названо."
  }
};
function upsert(rows, item) {
  const first = rows.findIndex((row) => row.responseId === item.responseId);
  const next = first < 0 ? [...rows, item] : rows.map((row, index) => index === first ? item : row);
  return next.filter((row, index, all) => row.responseId !== item.responseId || index === all.findIndex((candidate) => candidate.responseId === item.responseId));
}
for (const locale of ["ru", "uk"]) {
  const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId, item]));
  for (const [suffix, [ru, uk]] of Object.entries(choices)) {
    const [i, r] = suffix.split(":"); const interaction = byId.get(`${session}:${i}`);
    interaction.modePayload.choiceFeedback = upsert(interaction.modePayload.choiceFeedback ?? [], { responseId: `${session}:${i}:${r}`, correct: true, testedDimension: interaction.prompt, feedbackByLocale: { ru, uk } });
  }
  for (const [i, [ru, uk]] of Object.entries(tiles)) {
    const interaction = byId.get(`${session}:${i}`);
    interaction.modePayload.slotFeedback = upsert(interaction.modePayload.slotFeedback ?? [], { responseId: `${session}:${i}:tile:d1`, correct: false, testedDimension: interaction.prompt, feedbackByLocale: { ru, uk } });
  }
  const byInteraction = (id) => byId.get(`${session}:${id}`);
  const setChoiceFeedback = (id, response, text) => {
    const row = byInteraction(id).modePayload.choiceFeedback.find((item) => item.responseId === `${session}:${id}:${response}`);
    row.feedbackByLocale[locale] = text;
  };
  const fixes = semantic[locale];
  const i07 = byInteraction("i07");
  i07.prompt = fixes.i07;
  i07.accessibilityLabel = fixes.i07;
  i07.modePayload.testedPhoneticContrast = fixes.i07;
  setChoiceFeedback("i02", "r3", fixes.i02r3);
  setChoiceFeedback("i07", "r2", fixes.i07r2);
  const i10 = byInteraction("i10");
  i10.prompt = fixes.i10;
  i10.accessibilityLabel = fixes.i10;
  i10.modePayload.localizedScene[locale] = fixes.i10;
  setChoiceFeedback("i10", "r1", fixes.i10r1);
  setChoiceFeedback("i15", "r3", fixes.i15r3);
  setChoiceFeedback("i18", "r3", fixes.i18r3);
}
const exactReplacements = new Map([
  ["«Рано». Совсем другой звук в начале, длинное «ё».", semantic.ru.i02r3],
  ["«Рано». Зовсім інший звук на початку, довге «йо».", semantic.uk.i02r3],
  ["`low` — «низкий». Здесь звучит `slow` — «медленный».", semantic.ru.i07r2],
  ["`low` — «низький». Тут звучить `slow` — «повільний».", semantic.uk.i07r2],
  ["`are` — про собеседника, `you are`. Про него — `is`.", semantic.ru.i15r3],
  ["`are` — про співрозмовника, `you are`. Про нього — `is`.", semantic.uk.i15r3],
  ["Молчать — не грубость. Тихий человек — `quiet`.", semantic.ru.i18r3],
  ["Мовчати — не грубість. Тиха людина — `quiet`.", semantic.uk.i18r3],
  ["Вставьте слово — Лина говорит: «Анна никого не обижает; она просто тихая». Скажите, что Анна не вредная", semantic.ru.i10],
  ["Вставте слово — Ліна каже: «Анна нікого не ображає; вона просто тиха». Скажіть, що Анна не шкідлива", semantic.uk.i10],
  ["Анна никого не обижает, поэтому она не `mean` — не вредная.", semantic.ru.i10r1],
  ["Анна нікого не ображає, тому вона не `mean` — не шкідлива.", semantic.uk.i10r1],
  ["«вредный». Говорит гадость и смотрит, как вы отреагируете.", "«недобрый». Говорит гадость, чтобы обидеть."],
  ["«шкідливий». Скаже гидоту і дивиться, як ви відреагуєте.", "«недобрий». Каже гидоту, щоб скривдити."],
  ["вредный", "недобрый"],
  ["шкідливий", "недобрий"]
]);
const mirroredFeedback = {
  i02: { r3: { ru: semantic.ru.i02r3, uk: semantic.uk.i02r3 } },
  i07: { r2: { ru: semantic.ru.i07r2, uk: semantic.uk.i07r2 } },
  i10: { r1: { ru: semantic.ru.i10r1, uk: semantic.uk.i10r1 } },
  i15: { r3: { ru: semantic.ru.i15r3, uk: semantic.uk.i15r3 } },
  i18: { r3: { ru: semantic.ru.i18r3, uk: semantic.uk.i18r3 } }
};
for (const locale of ["ru", "uk"]) {
  for (const [interactionSuffix, responses] of Object.entries(mirroredFeedback)) {
    const interaction = data.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:${interactionSuffix}`);
    for (const [responseSuffix, feedbackByLocale] of Object.entries(responses)) {
      interaction.modePayload.choiceFeedback.find((item) => item.responseId === `${session}:${interactionSuffix}:${responseSuffix}`).feedbackByLocale = feedbackByLocale;
    }
  }
}
function rewriteAll(value) {
  if (typeof value === "string") return exactReplacements.get(value) ?? value;
  if (Array.isArray(value)) return value.map(rewriteAll);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteAll(item)]));
  return value;
}
const repaired = rewriteAll(data);
fs.writeFileSync(file, `${JSON.stringify(repaired, null, 2)}\n`);
