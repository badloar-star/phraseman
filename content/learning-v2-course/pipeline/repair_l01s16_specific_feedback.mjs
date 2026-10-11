#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-16";
const file = path.join(root, "sessions/en/l01/s16/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  "i01:r1": ["`kind` — «добрый». В записи слышно окончание /nd/: `kind`.", "`kind` — «добрий». У записі чути закінчення /nd/: `kind`."],
  "i02:r1": ["Артём помог без просьбы, поэтому подходит `kind`: `You are kind.` — «Ты добрый».", "Артем допоміг без прохання, тому підходить `kind`: `You are kind` — «Ти добрий»."],
  "i03:r1": ["`honest` — «честный». Начальная `h` не произносится: в записи звучит `honest`.", "`honest` — «чесний». Початкова `h` не вимовляється: у записі звучить `honest`."],
  "i05:r1": ["После `you` ставят `are`: `You are calm.` — «Ты спокойный».", "Після `you` ставлять `are`: `You are calm` — «Ти спокійний»."],
  "i08:r1": ["`not wrong` означает «не ошибаешься»: `You are not wrong.`", "`not wrong` означає «не помиляєшся»: `You are not wrong`."],
  "i10:r1": ["`brave` — «смелый». В записи слышно начало /br/ и конец /eɪv/: `brave`.", "`brave` — «сміливий». У записі чути початок /br/ і кінець /eɪv/: `brave`."],
  "i11:r1": ["`sad` — «грустный»; конечный /d/ отличает его от `sat` с /t/.", "`sad` — «сумний»; кінцевий /d/ відрізняє його від `sat` із /t/."],
  "i14:r1": ["`tired` — «уставший»: это слово описывает зевающего Артёма.", "`tired` — «втомлений»: це слово описує Артема, який позіхає."]
};
const tiles = {
  i04: ["`is` здесь лишнее: с `you` употребляют `are`: `You are honest.`", "`is` тут зайве: з `you` вживають `are`: `You are honest`."],
  i09: ["`am` здесь лишнее: `am` употребляют с `I`, а после `you` нужно `are`: `You are not wrong.`", "`am` тут зайве: `am` вживають з `I`, а після `you` потрібне `are`: `You are not wrong`."],
  i12: ["`is` здесь лишнее: с `you` употребляют `are`: `You are brave.`", "`is` тут зайве: з `you` вживають `are`: `You are brave`."],
  i13: ["`not` здесь лишнее: билет достался Артёму, поэтому нужна положительная фраза `You are lucky.`", "`not` тут зайве: квиток дістався Артемові, тому потрібна стверджувальна фраза `You are lucky`."],
  i16: ["`is` здесь лишнее: после `you` уже стоит `are`: `You are not sad.`", "`is` тут зайве: після `you` уже стоїть `are`: `You are not sad`."
  ]
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
