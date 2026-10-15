import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-38";
const file = path.join(root, "sessions/en/l01/s38/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i02: ["Вы слышите `lost`: после `lo` слышно `st`.", "Ви чуєте `lost`: після `lo` чути `st`."],
  i07: ["Вокруг спокойно, значит `We are safe.` — «мы в безопасности».", "Навколо спокійно, тому `We are safe.` — «ми в безпеці»."],
  i08: ["Подходит `safe` — «в безопасности». `save` значит «спасать».", "Підходить `safe` — «у безпеці». `save` означає «рятувати»."],
  i10: ["Идут той же дорогой обратно: `We are back.`", "Ідуть тією ж дорогою назад: `We are back.`"],
  i13: ["Идут одной группой: `We are together.`", "Ідуть однією групою: `We are together.`"]
};
const tiles = {
  i04: ["`is` лишнее: с `We` говорят `We are lost.`", "`is` зайве: з `We` кажуть `We are lost.`"],
  i09: ["`safe` здесь лишнее: в фразе `They are home.` говорят, что они дома.", "`safe` тут зайве: у фразі `They are home.` сказано, що вони вдома."],
  i15: ["`is` лишнее: с `We` говорят `We are far.`", "`is` зайве: з `We` кажуть `We are far.`"],
  i16: ["`home` здесь лишнее: в фразе `They are safe.` говорят, что они в безопасности.", "`home` тут зайве: у фразі `They are safe.` сказано, що вони в безпеці."]
};

function replaceFeedback(items, next) {
  const index = items.findIndex((item) => item.responseId === next.responseId);
  return index < 0 ? [...items, next] : items.map((item, itemIndex) => itemIndex === index ? next : item);
}

for (const locale of ["ru", "uk"]) {
  const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item]));
  for (const [id, [ru, uk]] of Object.entries(choices)) {
    const item = byId.get(id);
    item.modePayload.choiceFeedback = replaceFeedback(item.modePayload.choiceFeedback ?? [], {
      responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk }
    });
  }
  for (const [id, [ru, uk]] of Object.entries(tiles)) {
    const item = byId.get(id);
    item.responseOptions = [];
    item.modePayload.slotFeedback = replaceFeedback(item.modePayload.slotFeedback ?? [], {
      responseId: `${session}:${id}:tile:d1`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk }
    });
  }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
