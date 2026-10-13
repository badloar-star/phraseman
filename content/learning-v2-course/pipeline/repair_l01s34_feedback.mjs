import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-34";
const file = path.join(root, "sessions/en/l01/s34/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i02: ["`busy` — «занятые»: соседний отдел сейчас работает.", "`busy` — «зайняті»: сусідній відділ зараз працює."],
  i04: ["`nice` — «приятные, добрые»: именно так говорят о людях, которые помогают.", "`nice` — «приємні, добрі»: так кажуть про людей, які допомагають."],
  i05: ["Про нескольких людей говорят `They are busy.`", "Про кількох людей кажуть `They are busy.`"],
  i08: ["`loud` — «шумные»: этот звук слышно на весь зал.", "`loud` — «гучні»: цей звук чути на всю залу."],
  i09: ["Они помогли вам: `nice` — «добрые, приятные».", "Вони вам допомогли: `nice` — «добрі, приємні»."],
  i13: ["Они уже оделись и могут идти: `ready` — «готовы».", "Вони вже вдяглися й можуть іти: `ready` — «готові»."],
};
const tiles = {
  i10: ["`nice` лишнее: в фразе `They are funny.` оно не нужно.", "`nice` зайве: у фразі `They are funny.` воно не потрібне."],
  i12: ["`is` лишнее: после `They` ставят `are` — `They are loud.`", "`is` зайве: після `They` ставлять `are` — `They are loud.`"],
  i14: ["`is` лишнее: правильно `They are together.`", "`is` зайве: правильно `They are together.`"],
  i15: ["`is` лишнее: правильно `They are here.`", "`is` зайве: правильно `They are here.`"],
  "i17:s01": ["`is` лишнее: правильно `They are nice.`", "`is` зайве: правильно `They are nice.`"],
};
function replace(items, item) {
  const index = items.findIndex((value) => value.responseId === item.responseId);
  return index < 0 ? [...items, item] : items.map((value, current) => current === index ? item : value);
}
for (const locale of ["ru", "uk"]) {
  const rows = new Map(data.interactionsByLocale[locale].map((row) => [row.interactionId.slice(`${session}:`.length), row]));
  for (const [id, [ru, uk]] of Object.entries(choices)) {
    const row = rows.get(id);
    row.modePayload.choiceFeedback = replace(row.modePayload.choiceFeedback ?? [], {
      responseId: `${session}:${id}:r1`, correct: true, testedDimension: row.prompt, feedbackByLocale: { ru, uk },
    });
  }
  for (const [id, [ru, uk]] of Object.entries(tiles)) {
    const row = rows.get(id);
    row.responseOptions = [];
    row.modePayload.slotFeedback = replace(row.modePayload.slotFeedback ?? [], {
      responseId: `${session}:${id}:tile:d1`, correct: false, testedDimension: row.prompt, feedbackByLocale: { ru, uk },
    });
  }
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
