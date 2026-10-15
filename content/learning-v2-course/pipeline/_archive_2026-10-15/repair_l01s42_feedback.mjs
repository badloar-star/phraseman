import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-42";
const file = path.join(root, "sessions/en/l01/s42/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i02: ["Выбрано слово `great`: оно звучит в аудио и значит «отличный».", "Обрано слово `great`: воно звучить в аудіо й означає «чудовий»."],
  i04: ["Выбрано слово `awful`: оно звучит в аудио и значит «ужасный».", "Обрано слово `awful`: воно звучить в аудіо й означає «жахливий"],
  i07: ["Выбрано слово `gone`: в аудио слышно `gone`, «ушёл».", "Обрано слово `gone`: в аудіо чути `gone`, «пішов"],
  i08: ["Начальник всем понравился, поэтому он `great` — «отличный».", "Начальник усім сподобався, тому він `great` — «чудовий"],
  i12: ["Стул пустой, значит друг `gone` — «ушёл».", "Стілець порожній, отже друг `gone` — «пішов"],
  i15: ["На улице ливень, поэтому погода `awful` — «ужасная».", "Надворі злива, тому погода `awful` — «жахлива" ]
};
const tiles = {
  i05: { d1: ["`is` лишнее: в `He's great.` слово `is` уже спрятано в `He's`.", "`is` зайве: у `He's great` слово `is` уже заховане в `He's`."] },
  i09: { d1: ["Нужно `She's quiet.`: `She` без `is` не образует фразу.", "Потрібно `She's quiet`: `She` без `is` не утворює фразу."] },
  i11: { d1: ["`great` лишнее: в аудио `It's awful.`", "`great` зайве: в аудіо `It's awful`."], d2: ["`is` лишнее: оно уже спрятано в `It's awful.`", "`is` зайве: воно вже заховане в `It's awful`." ] },
  i13: { d1: ["`is` лишнее: оно уже спрятано в `She's funny.`", "`is` зайве: воно вже заховане в `She's funny`."], d2: ["`quiet` лишнее: после шутки говорят `She's funny.`", "`quiet` зайве: після жарту кажуть `She's funny`." ] },
  i14: { d1: ["`gone` лишнее: в аудио `He's here.`", "`gone` зайве: в аудіо `He's here`."], d2: ["`is` лишнее: оно уже спрятано в `He's here.`", "`is` зайве: воно вже заховане в `He's here`." ] },
  i16: { d1: ["`is` лишнее: оно уже спрятано в `She's late.`", "`is` зайве: воно вже заховане в `She's late`." ] }
};
function replaceFeedback(items, next) { const index = items.findIndex((item) => item.responseId === next.responseId); return index < 0 ? [...items, next] : items.map((item, itemIndex) => itemIndex === index ? next : item); }
for (const locale of ["ru", "uk"]) { const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item])); for (const [id, [ru, uk]] of Object.entries(choices)) { const item = byId.get(id); item.modePayload.choiceFeedback = replaceFeedback(item.modePayload.choiceFeedback ?? [], { responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); } for (const [id, slots] of Object.entries(tiles)) { const item = byId.get(id); item.modePayload.slotFeedback ??= []; for (const [slot, [ru, uk]] of Object.entries(slots)) item.modePayload.slotFeedback = replaceFeedback(item.modePayload.slotFeedback, { responseId: `${session}:${id}:tile:${slot}`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); } }
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
