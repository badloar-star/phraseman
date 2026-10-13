import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-47";
const file = path.join(root, "sessions/en/l01/s47/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i02: ["Выбрано `drunk`: именно это слово звучит в аудио и значит «пьяный».", "Обрано `drunk`: саме це слово звучить в аудіо й означає «п'яний»."],
  i06: ["Выбрано `sleepy`: именно это слово звучит в аудио и значит «сонный».", "Обрано `sleepy`: саме це слово звучить в аудіо й означає «сонний»."],
  i08: ["Кофе разбудил друга, поэтому он `awake` — «не спит».", "Кава розбудила друга, тому він `awake` — «не спить»."],
  i10: ["Перед вождением нужно быть `sober` — «трезвым».", "Перед водінням треба бути `sober` — «тверезим»."],
  i12: ["После ящиков друг `tired` — «устал», хотя ещё не хочет спать.", "Після ящиків друг `tired` — «втомився», хоча ще не хоче спати."],
  i16: ["Музыку выключили и все молчат, значит здесь `quiet` — «тихо».", "Музику вимкнули й усі мовчать, отже тут `quiet` — «тихо»." ]
};
const tiles = {
  i04: { d1: ["`am` лишнее: оно уже спрятано в `I'm sober.`", "`am` зайве: воно вже заховане в `I'm sober`."], d2: ["`he's` не подходит: говорите о себе — `I'm sober.`", "`he's` не підходить: говорите про себе — `I'm sober`." ] },
  i13: { d1: ["`aren't` не подходит к `She`: в аудио `She isn't sleepy.`", "`aren't` не підходить до `She`: в аудіо `She isn't sleepy`." ] },
  i14: { d1: ["`isn't` не подходит к `They`: нужно `They aren't sleepy.`", "`isn't` не підходить до `They`: потрібно `They aren't sleepy`." ] },
  i17: { d1: ["`quiet` лишнее: на часах полночь, поэтому `I'm late.`", "`quiet` зайве: на годиннику північ, тому `I'm late`." ] }
};
function replaceFeedback(items, next) { const index = items.findIndex((item) => item.responseId === next.responseId); return index < 0 ? [...items, next] : items.map((item, itemIndex) => itemIndex === index ? next : item); }
for (const locale of ["ru", "uk"]) { const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item])); for (const [id, [ru, uk]] of Object.entries(choices)) { const item = byId.get(id); item.modePayload.choiceFeedback = replaceFeedback(item.modePayload.choiceFeedback ?? [], { responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); } for (const [id, slots] of Object.entries(tiles)) { const item = byId.get(id); item.modePayload.slotFeedback ??= []; for (const [slot, [ru, uk]] of Object.entries(slots)) item.modePayload.slotFeedback = replaceFeedback(item.modePayload.slotFeedback, { responseId: `${session}:${id}:tile:${slot}`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); } }
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
