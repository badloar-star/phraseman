#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-14";
const file = path.join(root, "sessions/en/l01/s14/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const choices = {
  "i02:r1": ["`safe` — «в безопасности». Слышно `f` в конце: это `safe`.", "`safe` — «у безпеці». Наприкінці чути `f`: це `safe`."],
  "i04:r1": ["`warm` — «тепло». Слышно конечное `m`: это `warm`.", "`warm` — «тепло». Наприкінці чути `m`: це `warm`."],
  "i06:r1": ["Турист не понимает, куда идти: подходит `You are lost.`", "Турист не розуміє, куди йти: підходить `You are lost.`"],
  "i08:r1": ["`dry` — «сухой». Слышно начало `dr`: это `dry`.", "`dry` — «сухий». Чути початок `dr`: це `dry`."],
  "i10:r1": ["`dry` значит «сухой»; в этом слове после `r` нет звука `v`.", "`dry` означає «сухий»; у цьому слові після `r` немає звука `v`."],
  "i11:r1": ["После `you` нужно `are`: `You are safe.`", "Після `you` потрібне `are`: `You are safe`."],
  "i15:r1": ["`cold` — «холодно»: это слово описывает туриста с синими губами.", "`cold` — «холодно»: це слово описує туриста із синіми губами."]
};

const tiles = {
  i05: ["С `you` нельзя `am`: правильная фраза — `You are safe.`", "З `you` не можна `am`: правильна фраза — `You are safe`."],
  i12: ["`dry` значит «сухой», но запись говорит `You are warm.`", "`dry` означає «сухий», але в записі звучить `You are warm`."],
  i13: ["`not` изменит смысл на «ты не готов». Нужна фраза `You are ready.`", "`not` змінить зміст на «ти не готовий». Потрібна фраза `You are ready`."],
  i16: ["После `you` нужно `are`, не `is`: `You are scared.`", "Після `you` потрібне `are`, не `is`: `You are scared`."],
  i17: ["`scared` значит «испуган», но запись говорит `You are cold.`", "`scared` означає «наляканий», але в записі звучить `You are cold`."]
};

for (const locale of ["ru", "uk"]) {
  const byId = new Map(data.interactionsByLocale[locale].map((interaction) => [interaction.interactionId, interaction]));
  for (const [suffix, [ru, uk]] of Object.entries(choices)) {
    const [interactionSuffix, responseSuffix] = suffix.split(":");
    const interaction = byId.get(`${session}:${interactionSuffix}`);
    const responseId = `${session}:${interactionSuffix}:${responseSuffix}`;
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
