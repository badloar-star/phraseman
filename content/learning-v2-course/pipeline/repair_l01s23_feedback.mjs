import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "sessions/en/l01/s23/practice.atomic.json");
const session = "en:lesson-01:session-23";
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i02: ["В записи `patient` три части `pa-tient`; в середине слышно шипящее `sh`, не чистое `t` и не `payment`.", "У записі `patient` три частини `pa-tient`; посередині чути шипляче `sh`, а не чисте `t` і не `payment`."],
  i04: ["В записи `grumpy` после `gr` слышно короткое «а», а не «ай» в `grimy` и не другой конец `gripy`.", "У записі `grumpy` після `gr` чути коротке «а», а не «ай» у `grimy` і не інший кінець `gripy`."],
  i06: ["Лина прямо называет Олега ворчливым: это `grumpy`, не `quiet` и не `kind`.", "Ліна прямо називає Олега буркотливим: це `grumpy`, а не `quiet` чи `kind`."],
  i08: ["В записи `proud` слышно «ау»: это не `pride` с «ай» и не короткое `prod`.", "У записі `proud` чути «ау»: це не `pride` з «ай» і не коротке `prod`."],
  i10: ["В записи два слога `gen-tle`: после «джен» слышно `t`, не продолжение `general` или `gentleman`.", "У записі два склади `gen-tle`: після «джен» чути `t`, а не продовження `general` чи `gentleman`."],
  i12: ["Анна мягко ведёт себя с детьми, поэтому `gentle`; это не гордость и не ворчание.", "Анна лагідно поводиться з дітьми, тому `gentle`; це не гордість і не бурчання."],
  i15: ["Анна всем помогает — это `kind`; `angry` и `proud` не называют такую помощь.", "Анна всім допомагає — це `kind`; `angry` і `proud` не називають таку допомогу."],
  i17: ["Лина прямо говорит, что Анна тихая: это `quiet`, а не злость и не ворчание.", "Ліна прямо каже, що Анна тиха: це `quiet`, а не злість чи бурчання."],
};
const tiles = {
  i05: ["`am` лишнее: с `He` ставят `is` — `He is patient.`", "`am` зайве: з `He` ставлять `is` — `He is patient`."],
  i13: ["`are` лишнее: с `She` ставят `is` — `She is not proud.`", "`are` зайве: з `She` ставлять `is` — `She is not proud`."],
  i14: ["`not` лишнее: Денис спокойный, поэтому `He is calm.`, без отрицания.", "`not` зайве: Денис спокійний, тому `He is calm`, без заперечення."],
  i16: ["`are` лишнее: с `He` ставят `is` — `He is angry.`", "`are` зайве: з `He` ставлять `is` — `He is angry`."],
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
