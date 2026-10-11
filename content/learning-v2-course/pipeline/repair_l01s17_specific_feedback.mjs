#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-17";
const file = path.join(root, "sessions/en/l01/s17/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  "i02:r1": ["`tall` — «высокий». В записи слышно начало /t/ и долгий звук перед /l/: `tall`.", "`tall` — «високий». У записі чути початок /t/ і довгий звук перед /l/: `tall`."],
  "i04:r1": ["`nice` — «приятный». В записи после /n/ слышно /aɪ/ и в конце /s/: `nice`.", "`nice` — «приємний». У записі після /n/ чути /aɪ/ і в кінці /s/: `nice`."],
  "i06:r1": ["С `she` ставим `is`: `She is nice.` — «Она приятная».", "З `she` ставимо `is`: `She is nice` — «Вона приємна»."],
  "i08:r1": ["`new` — «новый». Здесь после /n/ слышно звук /juː/, не долгий /oʊ/ из `no`.", "`new` — «новий». Тут після /n/ чути звук /juː/, а не довгий /oʊ/ із `no`."],
  "i10:r1": ["`nice` — «приятный человек». Поэтому: `He is nice.`", "`nice` — «приємна людина». Тому: `He is nice`."],
  "i16:r1": ["Анна помогла, значит она `kind` — добрая: `She is kind.`", "Анна допомогла, отже вона `kind` — добра: `She is kind`." ]
};
const tiles = {
  i09: ["`He` не подходит к Анне. Нужна фраза `She is friendly.`", "`He` не підходить до Анни. Потрібна фраза `She is friendly`."],
  i15: ["`not` лишнее: Макс молчит, поэтому `He is quiet.`, а не отрицание.", "`not` зайве: Макс мовчить, тому `He is quiet`, а не заперечення."]
};

for (const locale of ["ru", "uk"]) {
  const byId = new Map(data.interactionsByLocale[locale].map((interaction) => [interaction.interactionId, interaction]));
  for (const [suffix, [ru, uk]] of Object.entries(choices)) {
    const [interactionSuffix, responseSuffix] = suffix.split(":");
    const interaction = byId.get(`${session}:${interactionSuffix}`);
    interaction.modePayload.choiceFeedback = [...(interaction.modePayload.choiceFeedback ?? []), {
      responseId: `${session}:${interactionSuffix}:${responseSuffix}`, correct: true,
      testedDimension: interaction.prompt, feedbackByLocale: { ru, uk }
    }];
  }
  for (const [interactionSuffix, [ru, uk]] of Object.entries(tiles)) {
    const interaction = byId.get(`${session}:${interactionSuffix}`);
    interaction.modePayload.slotFeedback = [{
      responseId: `${session}:${interactionSuffix}:tile:d1`, correct: false,
      testedDimension: interaction.prompt, feedbackByLocale: { ru, uk }
    }];
  }
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
