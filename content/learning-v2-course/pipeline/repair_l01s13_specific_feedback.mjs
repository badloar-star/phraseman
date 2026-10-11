#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-13";
const file = path.join(root, "sessions/en/l01/s13/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const choiceFeedback = {
  "i02:r1": [
    "Верно: в записи слышно `young` — один слог и конец «нг».",
    "Правильно: у записі чути `young` — один склад і кінець «нг»."
  ],
  "i05:r1": [
    "Верно: с `I` ставят `am`, поэтому получается `I am old` — «я старый/старая».",
    "Правильно: з `I` ставлять `am`, тому виходить `I am old` — «я старий/стара»."
  ],
  "i07:r1": [
    "Верно: в записи `strong`: в начале слышно «стр», а гласная — как в «стронг».",
    "Правильно: у записі `strong`: на початку чути «стр», а голосна — як у «стронг»."
  ],
  "i09:r1": [
    "Верно: в записи `tall`; в нём тянется звук «о», не «э» как в `tell`.",
    "Правильно: у записі `tall`; у ньому тягнеться звук «о», а не «е» як у `tell`."
  ],
  "i10:r1": [
    "Верно: `strong` — «сильная». Легко поднять тяжёлую коробку — признак силы, поэтому: `You are strong`.",
    "Правильно: `strong` — «сильна». Легко підняти важку коробку — ознака сили, тому: `You are strong`."
  ],
  "i13:r1": [
    "Верно: после `you` нужна форма `are`, поэтому: `You are tall` — «ты высокий/высокая».",
    "Правильно: після `you` потрібна форма `are`, тому: `You are tall` — «ти високий/висока»."
  ],
  "i15:r1": [
    "Верно: в записи `brave` — начало «бр», не «гр» как в `grave`, и в конце нет `d` как в `bread`.",
    "Правильно: у записі `brave` — початок «бр», не «гр» як у `grave`, і в кінці немає `d` як у `bread`."
  ]
};

const tileFeedback = {
  i12: [
    "`are` здесь лишнее: о себе говорят `I am strong`, потому что после `I` ставят `am`.",
    "`are` тут зайве: про себе кажуть `I am strong`, бо після `I` ставлять `am`."
  ],
  i17: [
    "`I` здесь лишнее: вы обращаетесь к Мире, поэтому фраза начинается с `You`: `You are brave`.",
    "`I` тут зайве: ви звертаєтеся до Міри, тому фраза починається з `You`: `You are brave`."
  ]
};

for (const locale of ["ru", "uk"]) {
  const byId = new Map(data.interactionsByLocale[locale].map((interaction) => [interaction.interactionId, interaction]));
  for (const [suffix, [ru, uk]] of Object.entries(choiceFeedback)) {
    const [interactionSuffix, responseSuffix] = suffix.split(":");
    const interaction = byId.get(`${session}:${interactionSuffix}`);
    const responseId = `${session}:${interactionSuffix}:${responseSuffix}`;
    interaction.modePayload.choiceFeedback = interaction.modePayload.choiceFeedback.map((entry) => entry.responseId === responseId
      ? { ...entry, correct: true, testedDimension: interaction.prompt, feedbackByLocale: { ru, uk } }
      : entry);
  }
  for (const [interactionSuffix, [ru, uk]] of Object.entries(tileFeedback)) {
    const interaction = byId.get(`${session}:${interactionSuffix}`);
    const responseId = `${session}:${interactionSuffix}:tile:d1`;
    interaction.modePayload.slotFeedback = interaction.modePayload.slotFeedback.map((entry) => entry.responseId === responseId
      ? { ...entry, correct: false, testedDimension: interaction.prompt, feedbackByLocale: { ru, uk } }
      : entry);
  }
}

fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
