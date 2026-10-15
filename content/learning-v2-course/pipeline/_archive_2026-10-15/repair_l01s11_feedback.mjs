#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-11";
const sourcePath = path.join(root, "sessions/en/l01/s11/practice.atomic.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const choices = {
  "i02:r1": { ru: "Верно: `crazy` звучит как «крейзи» и значит «сумасшедшая».", uk: "Правильно: `crazy` звучить як «крейзі» й означає «божевільна»." },
  "i04:r1": { ru: "Верно: `lazy` — «ленивая»; в начале слышно «л», не «кр».", uk: "Правильно: `lazy` — «лінива»; на початку чути «л», а не «кр»." },
  "i07:r1": { ru: "Верно: `wrong` значит «неправильный»; в начале слышно «ронг».", uk: "Правильно: `wrong` означає «неправильний»; на початку чути «ронг»." },
  "i08:r1": { ru: "Верно: ответ Мира дала правильный, поэтому вы говорите `You are not wrong`.", uk: "Правильно: відповідь Міра дала правильну, тому ви кажете `You are not wrong`." },
  "i10:r1": { ru: "Верно: `kind` — «добрая». В слове слышно «кайнд».", uk: "Правильно: `kind` — «добра». У слові чути «кайнд»." },
  "i11:r1": { ru: "Верно: после проверки календаря Мира уверена: `You are sure`.", uk: "Правильно: після перевірки календаря Міра впевнена: `You are sure`." },
  "i13:r1": { ru: "Верно: после `You` ставят `are`: `You are not crazy`.", uk: "Правильно: після `You` ставлять `are`: `You are not crazy`." },
};
const tiles = {
  i14: [{ ru: "Вы подтверждаете уверенность Миры, поэтому отрицание `not` не нужно.", uk: "Ви підтверджуєте впевненість Міри, тому заперечення `not` не потрібне." }],
  i15: [{ ru: "Нужно сказать «не одна» — `not alone`; плитка `no` в эту фразу не входит.", uk: "Треба сказати «не сама» — `not alone`; плитка `no` у цю фразу не входить." }],
  i16: [{ ru: "Вы благодарите Миру за добрый поступок: `You are kind`, без отрицания.", uk: "Ви дякуєте Мірі за добрий вчинок: `You are kind`, без заперечення." }],
  i17: [{ ru: "С `You` используют `are`; здесь нужно `You are not busy`, не `is`.", uk: "З `You` використовують `are`; тут потрібно `You are not busy`, а не `is`." }],
};

for (const locale of ["ru", "uk"]) {
  const interactions = source.interactionsByLocale?.[locale];
  if (!Array.isArray(interactions) || interactions.length !== 18) throw new Error(`unexpected L01/S11 source for ${locale}`);
  const byId = new Map(interactions.map((item) => [item.interactionId, item]));
  for (const [suffix, feedbackByLocale] of Object.entries(choices)) {
    const [task, response] = suffix.split(":");
    const item = byId.get(`${session}:${task}`);
    if (!item?.modePayload?.choiceFeedback) throw new Error(`missing choice payload ${locale}:${task}`);
    const responseId = `${session}:${task}:${response}`;
    item.modePayload.choiceFeedback = [
      ...item.modePayload.choiceFeedback.filter((entry) => entry.responseId !== responseId),
      { responseId, correct: true, testedDimension: item.prompt, feedbackByLocale },
    ];
  }
  for (const [task, rows] of Object.entries(tiles)) {
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
