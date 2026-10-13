import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-39";
const file = path.join(root, "sessions/en/l01/s39/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i02: ["Вы слышите `early`: в конце есть `-ly`.", "Ви чуєте `early`: у кінці є `-ly`."],
  i04: ["Комната ещё пуста, значит вы пришли рано: `We are early.`", "Кімната ще порожня, отже ви прийшли рано: `We are early.`"],
  i06: ["Вы слышите `right` — «правы».", "Ви чуєте `right` — «маєте рацію»."],
  i11: ["С `we` говорят `We are sorry.`", "З `we` кажуть `We are sorry.`"],
  i13: ["Они работают вместе: `They are colleagues.`", "Вони працюють разом: `They are colleagues.`"],
  i15: ["Они проводят время вместе вне работы: `They are friends.`", "Вони проводять час разом поза роботою: `They are friends.`"]
};
const tiles = {
  i08: ["`is` лишнее: с `They` говорят `They are wrong.`", "`is` зайве: з `They` кажуть `They are wrong.`"],
  i12: ["`late` здесь лишнее: в аудио `We are early.` — «мы пришли рано».", "`late` тут зайве: в аудіо `We are early.` — «ми прийшли рано»."],
  i16: ["`is` лишнее: с `We` говорят `We are not late.`", "`is` зайве: з `We` кажуть `We are not late.`"]
};
function replaceFeedback(items, next) { const index = items.findIndex((item) => item.responseId === next.responseId); return index < 0 ? [...items, next] : items.map((item, itemIndex) => itemIndex === index ? next : item); }
for (const locale of ["ru", "uk"]) {
  const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item]));
  for (const [id, [ru, uk]] of Object.entries(choices)) { const item = byId.get(id); item.modePayload.choiceFeedback = replaceFeedback(item.modePayload.choiceFeedback ?? [], { responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); }
  for (const [id, [ru, uk]] of Object.entries(tiles)) { const item = byId.get(id); item.responseOptions = []; item.modePayload.slotFeedback = replaceFeedback(item.modePayload.slotFeedback ?? [], { responseId: `${session}:${id}:tile:d1`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); }
}
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
