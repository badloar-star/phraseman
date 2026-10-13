import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-46";
const file = path.join(root, "sessions/en/l01/s46/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i02: ["Выбрано слово `fun`: именно оно звучит в аудио и значит «весело».", "Обрано слово `fun`: саме воно звучить в аудіо й означає «весело»."],
  i04: ["Выбрано слово `boring`: именно оно звучит в аудио и значит «скучный».", "Обрано слово `boring`: саме воно звучить в аудіо й означає «нудний"],
  i06: ["Вы всё время смотрите на часы, значит лекция `boring` — «скучная».", "Ви весь час дивитеся на годинник, отже лекція `boring` — «нудна"],
  i09: ["Выбрано слово `weird`: именно оно звучит в аудио и значит «странный».", "Обрано слово `weird`: саме воно звучить в аудіо й означає «дивний"],
  i11: ["Краткая форма — `I'm`: это `I am` в одном слове.", "Коротка форма — `I'm`: це `I am` в одному слові."],
  i14: ["Новенький молчит, значит он `quiet` — «тихий».", "Новенький мовчить, отже він `quiet` — «тихий»."],
  i16: ["Вы впервые в этом кафе, значит оно `new` — «новое» для вас.", "Ви вперше в цій кав'ярні, отже вона `new` — «нова» для вас." ]
};
const tiles = {
  i05: { d1: ["`is` лишнее: оно уже спрятано в `It's fun.`", "`is` зайве: воно вже заховане в `It's fun`." ] },
  i10: { d1: ["`are` лишнее: оно уже спрятано в `They're weird.`", "`are` зайве: воно вже заховане в `They're weird`."], d2: ["`He's` не подходит: речь о соседях, поэтому `They're weird.`", "`He's` не підходить: ідеться про сусідів, тому `They're weird`." ] },
  i12: { d1: ["`They're` не подходит: в аудио один мужчина — `He's cool.`", "`They're` не підходить: в аудіо один чоловік — `He's cool`."], d2: ["`weird` лишнее: в аудио `He's cool.`", "`weird` зайве: в аудіо `He's cool`." ] },
  i15: { d1: ["`not` лишнее: отрицание уже спрятано в `isn't boring.`", "`not` зайве: заперечення вже заховане в `isn't boring`." ] }
};
function replaceFeedback(items, next) { const index = items.findIndex((item) => item.responseId === next.responseId); return index < 0 ? [...items, next] : items.map((item, itemIndex) => itemIndex === index ? next : item); }
for (const locale of ["ru", "uk"]) { const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item])); for (const [id, [ru, uk]] of Object.entries(choices)) { const item = byId.get(id); item.modePayload.choiceFeedback = replaceFeedback(item.modePayload.choiceFeedback ?? [], { responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); } for (const [id, slots] of Object.entries(tiles)) { const item = byId.get(id); item.modePayload.slotFeedback = (item.modePayload.slotFeedback ?? []).filter((entry) => !/:r[12]$/.test(entry.responseId)); for (const [slot, [ru, uk]] of Object.entries(slots)) item.modePayload.slotFeedback = replaceFeedback(item.modePayload.slotFeedback, { responseId: `${session}:${id}:tile:${slot}`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); } }
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
