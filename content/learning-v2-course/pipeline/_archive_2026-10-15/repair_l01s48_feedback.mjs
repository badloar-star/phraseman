import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-48";
const file = path.join(root, "sessions/en/l01/s48/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i01: ["Выбрано `tired`: именно это слово звучит в аудио и значит «усталый».", "Обрано `tired`: саме це слово звучить в аудіо й означає «втомлений"],
  i02: ["После недели вы `tired` — «устали».", "Після тижня ви `tired` — «втомилися"],
  i03: ["Выбрано `gone`: именно это слово звучит в аудио и значит «ушёл».", "Обрано `gone`: саме це слово звучить в аудіо й означає «пішов"],
  i05: ["После `He` ставят `is`: `He is gone.`", "Після `He` ставлять `is`: `He is gone`."],
  i06: ["Выбрано `loud`: это слово значит «шумный».", "Обрано `loud`: це слово означає «гучний"],
  i07: ["Здесь тихо, поэтому `It isn't loud.`", "Тут тихо, тому `It isn't loud`."],
  i10: ["Вопрос о впечатлении от вечера: `great` — «отличный».", "Питання про враження від вечора: `great` — «чудовий"],
  i12: ["На вопрос «куда?» отвечают `home`: `I'm going home.`", "На питання «куди?» відповідають `home`: `I'm going home`."],
  i14: ["Друг весь вечер смеялся, значит он `happy` — «рад».", "Друг увесь вечір сміявся, отже він `happy` — «радий" ]
};
const tiles = {
  i04: { d1: ["`is` лишнее: оно уже спрятано в `She's gone.`", "`is` зайве: воно вже заховане в `She's gone`."], d2: ["`home` лишнее: нужно сказать, что она ушла — `She's gone.`", "`home` зайве: треба сказати, що вона пішла — `She's gone`." ] },
  i08: { d1: ["`They're` не подходит: нужна отрицательная форма `They aren't loud.`", "`They're` не підходить: потрібна заперечна форма `They aren't loud`." ] },
  i09: { d1: ["`I` лишнее: оно уже спрятано в `I'm tired.`", "`I` зайве: воно вже заховане в `I'm tired`."], d2: ["`happy` лишнее: в аудио `I'm tired.`", "`happy` зайве: в аудіо `I'm tired`." ] },
  i13: { d1: ["`isn't` не подходит к `We`: нужно `We aren't home.`", "`isn't` не підходить до `We`: потрібно `We aren't home`." ] },
  "i16:s01": { d1: ["`are` лишнее: оно уже спрятано в `I'm tired.`", "`are` зайве: воно вже заховане в `I'm tired`." ] }
};
function replaceFeedback(items, next) { const index = items.findIndex((item) => item.responseId === next.responseId); return index < 0 ? [...items, next] : items.map((item, itemIndex) => itemIndex === index ? next : item); }
for (const locale of ["ru", "uk"]) { const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item])); for (const [id, [ru, uk]] of Object.entries(choices)) { const item = byId.get(id); item.modePayload.choiceFeedback = replaceFeedback(item.modePayload.choiceFeedback ?? [], { responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); } for (const [id, slots] of Object.entries(tiles)) { const item = byId.get(id); item.modePayload.slotFeedback ??= []; for (const [slot, [ru, uk]] of Object.entries(slots)) item.modePayload.slotFeedback = replaceFeedback(item.modePayload.slotFeedback, { responseId: `${session}:${id}:tile:${slot}`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); } }
for (const locale of ["ru", "uk"]) {
  const item = data.interactionsByLocale[locale].find((entry) => entry.interactionId === `${session}:i02`);
  for (const option of item.responseOptions ?? []) if (option.responseId === `${session}:i02:r2`) option.text = "are";
  for (const option of item.modePayload.gapOptions ?? []) if (option.responseId === `${session}:i02:r2`) option.text = "are";
  item.modePayload.choiceFeedback = replaceFeedback(item.modePayload.choiceFeedback ?? [], {
    responseId: `${session}:i02:r2`, correct: false, testedDimension: item.prompt,
    feedbackByLocale: {
      ru: "После `I'm` нельзя поставить `are`: форма `am` уже есть в `I'm`.",
      uk: "Після `I'm` не можна поставити `are`: форма `am` уже є в `I'm`."
    }
  });
}
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
