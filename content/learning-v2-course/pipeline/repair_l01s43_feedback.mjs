import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-43";
const file = path.join(root, "sessions/en/l01/s43/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i02: ["Выбрано слово `bad`: оно звучит в аудио и значит «плохой».", "Обрано слово `bad`: воно звучить в аудіо й означає «поганий»."],
  i05: ["Выбрано слово `real`: в аудио слышно `real`, «настоящий».", "Обрано слово `real`: в аудіо чути `real`, «справжній»."],
  i07: ["История не выдумана, значит она `true` — «правда».", "Історія не вигадана, отже вона `true` — «правда»."],
  i10: ["С `it` говорят `is`: `It is real.`", "З `it` кажуть `is`: `It is real`."],
  i14: ["Верный ответ: `You aren't wrong.` — «ты не ошибаешься».", "Правильна відповідь: `You aren't wrong` — «ти не помиляєшся»."],
  i15: ["Выбрано `ok`: в аудио два звука — `o-k`.", "Обрано `ok`: в аудіо два звуки — `o-k`." ]
};
const tiles = {
  i03: { d1: ["`are` лишнее: оно уже спрятано в `We're ready.`", "`are` зайве: воно вже заховане в `We're ready`." ] },
  i08: { d1: ["`is` не подходит к `They`: нужно `They are funny.`", "`is` не підходить до `They`: потрібно `They are funny`." ] },
  i09: { d1: ["`isn't` не подходит к `They`: в аудио `They aren't late.`", "`isn't` не підходить до `They`: в аудіо `They aren't late`." ] }
};
function replaceFeedback(items, next) { const index = items.findIndex((item) => item.responseId === next.responseId); return index < 0 ? [...items, next] : items.map((item, itemIndex) => itemIndex === index ? next : item); }
for (const locale of ["ru", "uk"]) { const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item])); for (const [id, [ru, uk]] of Object.entries(choices)) { const item = byId.get(id); item.modePayload.choiceFeedback = replaceFeedback(item.modePayload.choiceFeedback ?? [], { responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); } for (const [id, slots] of Object.entries(tiles)) { const item = byId.get(id); item.modePayload.slotFeedback ??= []; for (const [slot, [ru, uk]] of Object.entries(slots)) item.modePayload.slotFeedback = replaceFeedback(item.modePayload.slotFeedback, { responseId: `${session}:${id}:tile:${slot}`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); } }
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
