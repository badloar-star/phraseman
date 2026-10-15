import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "sessions/en/l01/s25/practice.atomic.json");
const session = "en:lesson-01:session-25";
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i02: ["В записи `small` начинается со «см» и заканчивается звуком «ол», не как `smell` и не как `tall`.", "У записі `small` починається зі «см» і закінчується звуком «ол», не як `smell` і не як `tall`."],
  i06: ["В записи `expensive` после `ex-` слышно «пен», не короткое `expense` и не `extensive` с «тен».", "У записі `expensive` після `ex-` чути «пен», а не коротке `expense` чи `extensive` з «тен»."],
  i07: ["Комната три на четыре метра, поэтому `small` — «маленькая»; не речь о свете или цене.", "Кімната три на чотири метри, тому `small` — «маленька»; не йдеться ні про світло, ні про ціну."],
  i09: ["Про воду говорят `It`, поэтому в `It is cold.` нужна форма `is`.", "Про воду кажуть `It`, тому у `It is cold.` потрібна форма `is`."],
  i12: ["Квартиру только что сняли, поэтому `new` — «новая», не про свет и не про размер.", "Квартиру щойно зняли, тому `new` — «нова», не про світло й не про розмір."],
  i14: ["После обогревателя в комнате `warm` — «тепло», не холодно и не темно.", "Після обігрівача в кімнаті `warm` — «тепло», не холодно і не темно."],
};
const tiles = {
  i10: ["`he` лишнее: счёт — вещь, поэтому `It is expensive.`", "`he` зайве: рахунок — річ, тому `It is expensive`."],
  i15: ["`am` лишнее: с `It` ставят `is` — `It is nice.`", "`am` зайве: з `It` ставлять `is` — `It is nice`."],
  "i17:s03": ["`are` лишнее: с `It` ставят `is` — `It is quiet.`", "`are` зайве: з `It` ставлять `is` — `It is quiet`."],
};
function upsert(rows, item) {
  const index = rows.findIndex((row) => row.responseId === item.responseId);
  return (index < 0 ? [...rows, item] : rows.map((row, rowIndex) => rowIndex === index ? item : row))
    .filter((row, rowIndex, all) => row.responseId !== item.responseId || rowIndex === all.findIndex((candidate) => candidate.responseId === row.responseId));
}
for (const locale of ["ru", "uk"]) {
  const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item]));
  for (const [id, [ru, uk]] of Object.entries(choices)) {
    const item = byId.get(id);
    item.modePayload.choiceFeedback = upsert(item.modePayload.choiceFeedback ?? [], { responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk } });
  }
  for (const [id, [ru, uk]] of Object.entries(tiles)) {
    const item = byId.get(id);
    item.modePayload.slotFeedback = upsert(item.modePayload.slotFeedback ?? [], { responseId: `${session}:${id}:tile:d1`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } });
  }
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
