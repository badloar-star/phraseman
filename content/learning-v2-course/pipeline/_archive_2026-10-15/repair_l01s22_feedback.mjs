import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "sessions/en/l01/s22/practice.atomic.json");
const session = "en:lesson-01:session-22";
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i02: ["В записи `asleep` есть начало `a-`, а дальше слышно `sleep`: это не `sleep` и не `sheep`.", "У записі `asleep` є початок `a-`, а далі чути `sleep`: це не `sleep` і не `sheep`."],
  i04: ["В записи `awake` сначала слышно короткое `a-`, потом `wake`: это не `wake` и не `away`.", "У записі `awake` спочатку чути коротке `a-`, потім `wake`: це не `wake` і не `away`."],
  i05: ["У мальчика закрыты глаза, значит он `asleep`; `awake` означает «не спит».", "У хлопчика заплющені очі, отже він `asleep`; `awake` означає «не спить»."],
  i08: ["В записи короткий звук в `ill`: это не долгое `eel` и не `all`.", "У записі короткий звук у `ill`: це не довге `eel` і не `all`."],
  i10: ["Температура и второй день дома — признак `ill`; она не уехала и не просто молчит.", "Температура й другий день удома — ознака `ill`; вона не поїхала й не просто мовчить."],
  i13: ["Девочка рядом с книгой, но её не слышно, поэтому она `quiet`, не `away` и не `ill`.", "Дівчинка поруч із книжкою, але її не чути, тому вона `quiet`, а не `away` чи `ill`."],
};
const tiles = {
  i09: ["`am` лишнее: с `She` ставят `is` — `She is away.`", "`am` зайве: з `She` ставлять `is` — `She is away`."],
  i11: ["`asleep` лишнее: в записи он не спит, поэтому `He is awake.`", "`asleep` зайве: у записі він не спить, тому `He is awake`."],
  i14: ["`are` лишнее: с `She` ставят `is` — `She is home.`", "`are` зайве: з `She` ставлять `is` — `She is home`."],
  i16: ["`not` лишнее: Нина зевает, поэтому `She is tired.`, без отрицания.", "`not` зайве: Ніна позіхає, тому `She is tired`, без заперечення."],
  "i17:s02": ["`are` лишнее: с `She` ставят `is` — `She is awake.`", "`are` зайве: з `She` ставлять `is` — `She is awake`."],
  "i17:s03": ["`are` лишнее: с `He` ставят `is` — `He is away.`", "`are` зайве: з `He` ставлять `is` — `He is away`."],
  "i17:s04": ["`are` лишнее: с `He` ставят `is` — `He is tired.`", "`are` зайве: з `He` ставлять `is` — `He is tired`."],
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
