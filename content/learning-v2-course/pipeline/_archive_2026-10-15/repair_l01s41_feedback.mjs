import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-41";
const file = path.join(root, "sessions/en/l01/s41/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i01: ["В аудио сокращение `I'm`, а не два отдельных слова `I am`.", "В аудіо скорочення `I'm`, а не два окремі слова `I am`."],
  i02: ["Про себя говорят `I'm late.`", "Про себе кажуть `I'm late`."],
  i04: ["В аудио `you're`: это `you are` в одном коротком слове.", "В аудіо `you're`: це `you are` в одному короткому слові."],
  i05: ["Другу говорят `You're fine.`", "Другові кажуть `You're fine`."],
  i07: ["Вы знаете ответ, поэтому `I'm sure.`", "Ви знаєте відповідь, тому `I'm sure`."],
  i09: ["Вы говорите другу `You're sure.`", "Ви кажете другові `You're sure`."],
  i13: ["Вам хорошо: `I'm fine.`", "Вам добре: `I'm fine`."],
  i14: ["Вы успокаиваете другого человека: `You're fine.`", "Ви заспокоюєте іншу людину: `You're fine`."]
};
const tiles = {
  i03: ["`am` лишнее: оно уже спрятано в `I'm fine.`", "`am` зайве: воно вже заховане в `I'm fine`."],
  i06: ["`are` лишнее: оно уже спрятано в `You're late.`", "`are` зайве: воно вже заховане в `You're late`."],
  i10: ["`sorry` лишнее: человеку отвечают `You're fine.`", "`sorry` зайве: людині відповідають `You're fine`."],
  i12: ["`am` лишнее: оно уже спрятано в `I'm sure.`", "`am` зайве: воно вже заховане в `I'm sure`."]
};
function replaceFeedback(items, next) { const index = items.findIndex((item) => item.responseId === next.responseId); return index < 0 ? [...items, next] : items.map((item, itemIndex) => itemIndex === index ? next : item); }
for (const locale of ["ru", "uk"]) { const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item])); for (const [id, [ru, uk]] of Object.entries(choices)) { const item = byId.get(id); item.modePayload.choiceFeedback = replaceFeedback(item.modePayload.choiceFeedback ?? [], { responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); } for (const [id, [ru, uk]] of Object.entries(tiles)) { const item = byId.get(id); item.responseOptions = []; item.modePayload.slotFeedback = replaceFeedback(item.modePayload.slotFeedback ?? [], { responseId: `${session}:${id}:tile:d1`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); } }
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
