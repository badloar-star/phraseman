import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "sessions/en/l01/s26/practice.atomic.json");
const session = "en:lesson-01:session-26";
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i02: ["В записи `rainy` после `rain` слышно «и»: это прилагательное о погоде, не `rain` и не `ready`.", "У записі `rainy` після `rain` чути «і»: це прикметник про погоду, не `rain` і не `ready`."],
  i04: ["В записи `windy` после `wind` слышно «и»: это погода, не `wind` и не `window`.", "У записі `windy` після `wind` чути «і»: це погода, не `wind` і не `window`."],
  i08: ["В записи `early` после «ёр» слышно `-ly`; это не `ear` и не `earn` с концом `-n`.", "У записі `early` після «ер» чути `-ly`; це не `ear` і не `earn` із кінцем `-n`."],
  i10: ["По стеклу течёт вода и во дворе лужи, поэтому `rainy` — «дождливо», не ветрено и не рано.", "По склу тече вода й у дворі калюжі, тому `rainy` — «дощово», не вітряно і не рано."],
  i12: ["Про погоду говорят `It`, поэтому в `It is cold.` нужна форма `is`.", "Про погоду кажуть `It`, тому у `It is cold.` потрібна форма `is`."],
  i15: ["Батарея греет, поэтому `warm` — «тепло», не холодно и не дождливо.", "Батарея гріє, тому `warm` — «тепло», не холодно і не дощово."],
};
const tiles = {
  i05: ["`not` лишнее: деревья гнёт ветром, поэтому `It is windy.`", "`not` зайве: дерева гне вітром, тому `It is windy`."],
  i09: ["`early` лишнее: в записи `It is late.` — «поздно».", "`early` зайве: у записі `It is late.` — «пізно»."],
  i14: ["`not` лишнее: на улице зябко, поэтому `It is cold.`", "`not` зайве: надворі зимно, тому `It is cold`."],
  i16: ["`windy` лишнее: в записи `It is quiet.` — «тихо».", "`windy` зайве: у записі `It is quiet.` — «тихо»."],
  i17: ["`am` лишнее: с `It` ставят `is` — `It is warm.`", "`am` зайве: з `It` ставлять `is` — `It is warm`."],
  "i18:s02": ["`are` лишнее: с `It` ставят `is` — `It is dark.`", "`are` зайве: з `It` ставлять `is` — `It is dark`."],
  "i18:s03": ["`are` лишнее: с `It` ставят `is` — `It is windy.`", "`are` зайве: з `It` ставлять `is` — `It is windy`."],
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
    item.responseOptions = [];
    item.modePayload.slotFeedback = upsert((item.modePayload.slotFeedback ?? []).filter((row) => row.responseId === `${session}:${id}:tile:d1`), { responseId: `${session}:${id}:tile:d1`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } });
  }
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
