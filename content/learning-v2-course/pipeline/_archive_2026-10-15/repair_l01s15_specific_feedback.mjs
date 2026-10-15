#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-15";
const file = path.join(root, "sessions/en/l01/s15/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const choices = {
  "i02:r1": ["`polite` — «вежливый». В записи ударение падает на второй слог: po-LITE.", "`polite` — «ввічливий». У записі наголос падає на другий склад: po-LITE."],
  "i04:r1": ["`serious` — «серьёзный». В этом слове три слога: SI-ri-es.", "`serious` — «серйозний». У цьому слові три склади: SI-ri-es."],
  "i05:r1": ["Вика благодарит людей, значит она вежливая: `You are polite.`", "Віка дякує людям, отже вона ввічлива: `You are polite`."],
  "i08:r1": ["`lucky` — «удачливый». В конце слышно `-y`, которого нет в `luck`.", "`lucky` — «щасливий». Наприкінці чути `-y`, якого немає в `luck`."],
  "i10:r1": ["`sad` — «грустный». В нём нет звука `n`, как в `sand`.", "`sad` — «сумний». У ньому немає звука `n`, як у `sand`."],
  "i12:r1": ["После `you` нужно `are`: `You are lucky.` — «тебе повезло».", "Після `you` потрібне `are`: `You are lucky` — «тобі пощастило»."],
  "i15:r1": ["`calm` — «спокойная». По ситуации Вика спокойно читает, поэтому подходит `calm`.", "`calm` — «спокійна». За ситуацією Віка спокійно читає, тому підходить `calm`."
  ]
};

const tiles = {
  i13: ["`am` здесь лишнее: к Вике обращаются `You are not sad.`", "`am` тут зайве: до Віки звертаються `You are not sad`."],
  "i17:s01": ["`is` здесь лишнее: после `you` ставят `are`, поэтому `You are honest.`", "`is` тут зайве: після `you` ставлять `are`, тому `You are honest`."],
  "i17:s02": ["`is` здесь лишнее: о себе говорят `I am not sad.`", "`is` тут зайве: про себе кажуть `I am not sad`."],
  "i19:s02": ["`is` здесь лишнее: о себе говорят `I am tired.`", "`is` тут зайве: про себе кажуть `I am tired`."
  ]
};

for (const locale of ["ru", "uk"]) {
  const byId = new Map(data.interactionsByLocale[locale].map((interaction) => [interaction.interactionId, interaction]));
  for (const [suffix, [ru, uk]] of Object.entries(choices)) {
    const split = suffix.split(":");
    const responseSuffix = split.pop();
    const interactionSuffix = split.join(":");
    const interaction = byId.get(`${session}:${interactionSuffix}`);
    const responseId = `${session}:${suffix}`;
    interaction.modePayload.choiceFeedback = [
      ...(interaction.modePayload.choiceFeedback ?? []),
      { responseId, correct: true, testedDimension: interaction.prompt, feedbackByLocale: { ru, uk } }
    ];
  }
  for (const [interactionSuffix, [ru, uk]] of Object.entries(tiles)) {
    const interaction = byId.get(`${session}:${interactionSuffix}`);
    interaction.modePayload.slotFeedback = [{
      responseId: `${session}:${interactionSuffix}:tile:d1`,
      correct: false,
      testedDimension: interaction.prompt,
      feedbackByLocale: { ru, uk }
    }];
  }
}

fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
