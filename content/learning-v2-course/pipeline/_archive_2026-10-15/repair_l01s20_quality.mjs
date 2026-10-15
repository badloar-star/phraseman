#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "sessions/en/l01/s20/practice.atomic.json");
const session = "en:lesson-01:session-20";
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i02: ["В записи два слога `married` и в конце слышно `д`: «мэ-рид».", "У записі два склади `married` і наприкінці чути `д`: «ме-рід"],
  i04: ["В записи `single`: в середине слышно «нг», а в конце — `l`.", "У записі `single`: у середині чути «нг», а наприкінці — `l`."],
  i06: ["В анкете прямо указано, что он состоит в браке: `He is married.`", "В анкеті прямо вказано, що він перебуває у шлюбі: `He is married`."],
  i09: ["В записи `famous` начинается со звука «фэй», не как `family` и не как `farmer`.", "У записі `famous` починається зі звуку «фей», не як `family` і не як `farmer`."],
  i11: ["В записи короткое `rich`: не длинное `reach` и не `ridge` с «дж» в конце.", "У записі коротке `rich`: не довге `reach` і не `ridge` із «дж» наприкінці."],
  i13: ["Гостью узнают после рекламы, в которой она снялась: это `famous`, а не `rich` или `quiet`.", "Гостю впізнають після реклами, у якій вона знялася: це `famous`, а не `rich` чи `quiet`."],
  i15: ["Антон весь вечер молчит за столом, поэтому он `quiet`.", "Антон увесь вечір мовчить за столом, тому він `quiet`."],
};
const tiles = {
  i07: ["`are` лишнее: после `She` здесь нужно `is` — `She is single.`", "`are` зайве: після `She` тут потрібне `is` — `She is single`."],
  i12: ["`famous` лишнее: в записи и фразе сказано `He is rich.`", "`famous` зайве: у записі й фразі сказано `He is rich`."],
  i16: ["`young` лишнее: в записи и фразе сказано `She is kind.`", "`young` зайве: у записі й фразі сказано `She is kind`."],
  i17: ["`young` лишнее: Антон смешит всех, поэтому `He is funny.`", "`young` зайве: Антон смішить усіх, тому `He is funny`."],
};
function upsert(rows, item) {
  const existing = rows.findIndex((row) => row.responseId === item.responseId);
  if (existing < 0) return [...rows, item];
  return rows.map((row, index) => index === existing ? item : row).filter((row, index, all) => row.responseId !== item.responseId || index === all.findIndex((candidate) => candidate.responseId === item.responseId));
}
for (const locale of ["ru", "uk"]) {
  const interactions = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.split(":").at(-1), item]));
  for (const [id, [ru, uk]] of Object.entries(choices)) {
    const item = interactions.get(id);
    item.modePayload.choiceFeedback = upsert(item.modePayload.choiceFeedback ?? [], { responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk } });
  }
  for (const [id, [ru, uk]] of Object.entries(tiles)) {
    const item = interactions.get(id);
    item.modePayload.slotFeedback = upsert(item.modePayload.slotFeedback ?? [], { responseId: `${session}:${id}:tile:d1`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } });
  }
  const i13 = interactions.get("i13");
  const prompt = locale === "ru" ? "Вставьте слово — Лина говорит: гостью узнают на улице после рекламы, в которой она снялась" : "Вставте слово — Ліна каже: гостю впізнають на вулиці після реклами, у якій вона знялася";
  i13.prompt = prompt; i13.accessibilityLabel = prompt; i13.modePayload.localizedScene[locale] = prompt;
  const i15 = interactions.get("i15");
  const evening = locale === "ru" ? "Вставьте слово — Антон весь вечер молчит за столом" : "Вставте слово — Антон увесь вечір мовчить за столом";
  i15.prompt = evening; i15.accessibilityLabel = evening; i15.modePayload.localizedScene[locale] = evening;
}
const replacements = new Map([
  ["«не женат», «не замужем». Пары нет — и это просто факт.", "«не женат», «не замужем». В этой анкете это значит: человек не состоит в браке."],
  ["«неодружений», «незаміжня». Пари немає — і це просто факт.", "«неодружений», «незаміжня». У цій анкеті це означає: людина не перебуває у шлюбі."],
  ["Усередині «м»: «сімпл». У `single` — «н»: «сінгл».", "Усередині «м»: «сімпл». У `single` — «нг»: «сінгл»."],
  ["Початок однаковий, далі розходиться: у `famous` другий склад «мас».", "Перший склад інший: `family` починається з «фе», а `famous` — з «фей»."],
  ["Начало одинаковое, дальше расходится: у `famous` второй слог «мэс».", "Первый слог не такой: `family` начинается с «фэ», а `famous` — с «фэй»."],
  ["Вставьте слово — Лина говорит: прохожие узнают гостью на улице", "Вставьте слово — Лина говорит: гостью узнают на улице после рекламы, в которой она снялась"],
  ["Вставте слово — Ліна каже: перехожі впізнають гостю на вулиці", "Вставте слово — Ліна каже: гостю впізнають на вулиці після реклами, у якій вона знялася"],
  ["Вставьте слово — Антон весь день молчит за столом", "Вставьте слово — Антон весь вечер молчит за столом"],
  ["Вставте слово — Антон весь день мовчить за столом", "Вставте слово — Антон увесь вечір мовчить за столом"]
]);
function rewrite(value) {
  if (typeof value === "string") return replacements.get(value) ?? value;
  if (Array.isArray(value)) return value.map(rewrite);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewrite(item)]));
  return value;
}
const repaired = rewrite(data);
fs.writeFileSync(file, `${JSON.stringify(repaired, null, 2)}\n`);
