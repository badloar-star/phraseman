import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-40";
const file = path.join(root, "sessions/en/l01/s40/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i02: ["После `we` говорят `We are friendly.`", "Після `we` кажуть `We are friendly`."],
  i04: ["Вы слышите `kind`: в конце звучит `nd`.", "Ви чуєте `kind`: у кінці звучить `nd`."],
  i07: ["За столом смеются, значит `We are funny.`", "За столом сміються, отже `We are funny`."],
  i08: ["`kind` значит «добрый». `kid` — «ребёнок».", "`kind` означає «добрий». `kid` — «дитина»."],
  i09: ["Вы слышите `mean` — «злой».", "Ви чуєте `mean` — «злий»."],
  i10: ["Вы отрицаете, что отдел злой: `We are not mean.`", "Ви заперечуєте, що відділ злий: `We are not mean`."],
  i12: ["После `they` говорят `They are funny.`", "Після `they` кажуть `They are funny`."]
};
const tiles = {
  i03: ["`is` лишнее: с `They` говорят `They are loud.`", "`is` зайве: з `They` кажуть `They are loud`."],
  i05: ["`is` лишнее: с `We` говорят `We are kind.`", "`is` зайве: з `We` кажуть `We are kind`."],
  i13: ["`is` лишнее: с `They` говорят `They are my colleagues.`", "`is` зайве: з `They` кажуть `They are my colleagues`."],
  i16: ["`not` лишнее: вы говорите, что вы приветливые — `We are friendly.`", "`not` зайве: ви кажете, що ви привітні — `We are friendly`."]
};
function replaceFeedback(items, next) { const index = items.findIndex((item) => item.responseId === next.responseId); return index < 0 ? [...items, next] : items.map((item, itemIndex) => itemIndex === index ? next : item); }
for (const locale of ["ru", "uk"]) {
  const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item]));
  for (const [id, [ru, uk]] of Object.entries(choices)) { const item = byId.get(id); item.modePayload.choiceFeedback = replaceFeedback(item.modePayload.choiceFeedback ?? [], { responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); }
  for (const [id, [ru, uk]] of Object.entries(tiles)) { const item = byId.get(id); item.responseOptions = []; item.modePayload.slotFeedback = replaceFeedback(item.modePayload.slotFeedback ?? [], { responseId: `${session}:${id}:tile:d1`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); }
}
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
