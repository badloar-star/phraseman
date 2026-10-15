import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-35";
const file = path.join(root, "sessions/en/l01/s35/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i02: ["`sure` — «уверены»: вы не знаете, открыто ли кафе, поэтому `not sure`.", "`sure` — «впевнені»: ви не знаєте, чи відкрита кав'ярня, тому `not sure`."],
  i04: ["`wrong` — «неправы, ошибаемся»: так говорят о неверном выводе.", "`wrong` — «неправі, помиляємося»: так кажуть про хибний висновок."],
  i07: ["`free` — «свободны»: дел нет, можно остаться или уйти.", "`free` — «вільні»: справ немає, можна залишитися або піти."],
  i09: ["Вы не знаете ответа: `We are not sure.`", "Ви не знаєте відповіді: `We are not sure.`"],
  i11: ["С `We` ставят `are`: `We are not hungry.`", "З `We` ставлять `are`: `We are not hungry.`"],
  i13: ["После обеда у вас нет времени: `not free` — «не свободны».", "Після обіду у вас немає часу: `not free` — «не вільні»."],
};
const tiles = {
  i10: ["`no` лишнее: отрицание здесь — `not`: `We are not alone.`", "`no` зайве: заперечення тут — `not`: `We are not alone.`"],
  i14: ["`not` лишнее: вы уже готовы, поэтому `We are ready.`", "`not` зайве: ви вже готові, тому `We are ready.`"],
  i15: ["`is` лишнее: после `We` ставят `are` — `We are not busy.`", "`is` зайве: після `We` ставлять `are` — `We are not busy.`"],
};
function replace(items, item) {
  const index = items.findIndex((value) => value.responseId === item.responseId);
  return index < 0 ? [...items, item] : items.map((value, current) => current === index ? item : value);
}
for (const locale of ["ru", "uk"]) {
  const rows = new Map(data.interactionsByLocale[locale].map((row) => [row.interactionId.slice(`${session}:`.length), row]));
  rows.get("i14").modePayload.authoredDistractorTokens = ["not"];
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
