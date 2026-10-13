import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-44";
const file = path.join(root, "sessions/en/l01/s44/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i01: ["В аудио `I'm tired.`: `am` уже спрятано в `I'm`.", "В аудіо `I'm tired`: `am` уже заховане в `I'm`."],
  i02: ["Вы зеваете, значит вы `tired` — «устали».", "Ви позіхаєте, отже ви `tired` — «втомилися»."],
  i03: ["В аудио `He's cold.`: речь об одном мужчине.", "В аудіо `He's cold`: ідеться про одного чоловіка."],
  i06: ["Он путает факты, значит он `wrong` — «неправ».", "Він плутає факти, отже він `wrong` — «не має рації"],
  i07: ["Выбрано `cold`: это слово значит «холодно».", "Обрано `cold`: це слово означає «холодно»."],
  i08: ["Дел нет, значит вы `free` — «свободны».", "Справ немає, отже ви `free` — «вільні»."],
  i10: ["В аудио `It's cold.`: речь о вещи или погоде, не о мужчине.", "В аудіо `It's cold`: ідеться про річ або погоду, не про чоловіка."],
  i12: ["После `They` ставят `are`: `They are wrong.`", "Після `They` ставлять `are`: `They are wrong`."],
  "i16:s01": ["Краткая форма — `it's`, поэтому нужен знак `'s`.", "Коротка форма — `it's`, тому потрібен знак `'s`." ]
};
const tiles = {
  i04: { d1: ["`is` лишнее: оно уже спрятано в `It's cold.`", "`is` зайве: воно вже заховане в `It's cold`." ] },
  i05: { d1: ["`are` лишнее: оно уже спрятано в `They're wrong.`", "`are` зайве: воно вже заховане в `They're wrong`."], d2: ["`cold` лишнее: в аудио `They're wrong.`", "`cold` зайве: в аудіо `They're wrong`." ] },
  i09: { d1: ["`am` лишнее: оно уже спрятано в `I'm free.`", "`am` зайве: воно вже заховане в `I'm free`." ] },
  i13: { d1: ["`It's` не подходит: речь о мужчине, поэтому `He's cold.`", "`It's` не підходить: ідеться про чоловіка, тому `He's cold`." ] },
  i15: { d1: ["Нужно `They're wrong.`: `They` без `are` не образует фразу.", "Потрібно `They're wrong`: `They` без `are` не утворює фразу." ] },
  "i16:s02": { d1: ["`are` лишнее: оно уже спрятано в `I'm tired.`", "`are` зайве: воно вже заховане в `I'm tired`." ] }
};
function replaceFeedback(items, next) { const index = items.findIndex((item) => item.responseId === next.responseId); return index < 0 ? [...items, next] : items.map((item, itemIndex) => itemIndex === index ? next : item); }
for (const locale of ["ru", "uk"]) { const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item])); for (const [id, [ru, uk]] of Object.entries(choices)) { const item = byId.get(id); item.modePayload.choiceFeedback = replaceFeedback(item.modePayload.choiceFeedback ?? [], { responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); } for (const [id, slots] of Object.entries(tiles)) { const item = byId.get(id); item.modePayload.slotFeedback ??= []; for (const [slot, [ru, uk]] of Object.entries(slots)) item.modePayload.slotFeedback = replaceFeedback(item.modePayload.slotFeedback, { responseId: `${session}:${id}:tile:${slot}`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); } }
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
