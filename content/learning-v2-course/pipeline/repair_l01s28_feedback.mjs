import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-28";
const atomicFile = path.join(root, "sessions/en/l01/s28/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(atomicFile, "utf8"));
const choices = {
  i02: ["В записи `broken`: в конце слышно `-ken`. Это «сломано», не `brown` и не `broke`.", "У записі `broken`: наприкінці чути `-ken`. Це «зламано», не `brown` і не `broke`."],
  i04: ["В записи `open`: после `o` слышно `-pen`. Это «открыто», не `oven` и не `often`.", "У записі `open`: після `o` чути `-pen`. Це «відкрито», не `oven` і не `often`."],
  i07: ["В записи `closed`: в конце слышно `-zd`. Это «закрыто», не `cold` и не `clothes`.", "У записі `closed`: наприкінці чути `-zd`. Це «зачинено», не `cold` і не `clothes`."],
  i08: ["В девять вечера магазин не работает и свет выключен, поэтому `closed` — «закрыто».", "О дев'ятій вечора магазин не працює і світло вимкнене, тому `closed` — «зачинено»."],
  i10: ["В записи `empty`: это «пусто». Не `enter` и не `any`.", "У записі `empty`: це «порожньо». Не `enter` і не `any`."],
  i13: ["Чай остыл, поэтому `cold` — «холодный». `hot` — наоборот, а `empty` — «пустой».", "Чай охолов, тому `cold` — «холодний». `hot` — навпаки, а `empty` — «порожній»."],
  i15: ["Верный вариант `closed`: в конце звучит `-zd`; `cold` значит «холодно».", "Правильний варіант `closed`: наприкінці звучить `-zd`; `cold` означає «холодно»."],
  i16: ["Батарея горячая, поэтому `hot`. `cold` — холодная, а `broken` — сломана.", "Батарея гаряча, тому `hot`. `cold` — холодна, а `broken` — зламана."],
  i18: ["Обои пахнут свежей краской после недавнего заселения, поэтому `new` — «новый».", "Шпалери пахнуть свіжою фарбою після недавнього заселення, тому `new` — «новий»."],
};
const tiles = {
  i05: ["`open` лишнее: лампочка не горит, значит `It is broken.`", "`open` зайве: лампочка не світиться, отже `It is broken`."],
  i11: ["`closed` лишнее: фраза о пустом предмете — `It is empty.`", "`closed` зайве: фраза про порожній предмет — `It is empty`."],
  i14: ["`not` лишнее: форточка отошла, поэтому `It is open.`", "`not` зайве: кватирка відчинена, тому `It is open`."],
  i17: ["`are` лишнее: с `It` ставят `is` — `It is small.`", "`are` зайве: з `It` ставлять `is` — `It is small`."],
  "i21:s01": ["`new` лишнее: фраза о закрытом месте — `It is closed.`", "`new` зайве: фраза про зачинене місце — `It is closed`."],
};
function upsert(rows, item) { const i = rows.findIndex((row) => row.responseId === item.responseId); return (i < 0 ? [...rows, item] : rows.map((row, n) => n === i ? item : row)).filter((row, n, all) => row.responseId !== item.responseId || n === all.findIndex((candidate) => candidate.responseId === row.responseId)); }
for (const locale of ["ru", "uk"]) {
  const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item]));
  for (const [id, [ru, uk]] of Object.entries(choices)) { const item = byId.get(id); item.modePayload.choiceFeedback = upsert(item.modePayload.choiceFeedback ?? [], { responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); }
  for (const [id, [ru, uk]] of Object.entries(tiles)) { const item = byId.get(id); item.responseOptions = []; item.modePayload.slotFeedback = upsert((item.modePayload.slotFeedback ?? []).filter((row) => row.responseId === `${session}:${id}:tile:d1`), { responseId: `${session}:${id}:tile:d1`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); }
}
fs.writeFileSync(atomicFile, `${JSON.stringify(data, null, 2)}\n`);
