import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-53";
const file = path.join(root, "sessions/en/l01/s53/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const choices = {
  i02: ["Верно: с `He` ставят `is`: `He is busy.`", "Правильно: з `He` ставлять `is`: `He is busy`."],
  i03: ["Верно: в аудио звучит `busy` — «занят». ", "Правильно: в аудіо звучить `busy` — «зайнятий»."],
  i05: ["Верно: `we` — это «мы», поэтому `We are home.`", "Правильно: `we` — це «ми», тому `We are home`."],
  i07: ["Верно: `not` делает `She is not sick.` — «она не болеет». ", "Правильно: `not` утворює `She is not sick` — «вона не хворіє»."],
  i09: ["Верно: в записи было `sick` — «болен». ", "Правильно: у записі було `sick` — «хворий»."],
  i10: ["Верно: `together` значит «вместе»: `They are not together.`", "Правильно: `together` означає «разом»: `They are not together`."],
  i14: ["Верно: `tired` — «уставшие», поэтому `We are not tired.`", "Правильно: `tired` — «втомлені», тому `We are not tired`."],
};

const tiles = {
  i08: { d1: ["`is` лишнее: для `I` уже есть `am` — `I am not busy.`", "`is` зайве: для `I` уже є `am` — `I am not busy`."] },
  i13: { d1: ["`not` лишнее: брат занят, поэтому `He is busy.`", "`not` зайве: брат зайнятий, тому `He is busy`."] },
  "i16:s04": { d1: ["`is` лишнее: с `We` нужна форма `are` — `We are together.`", "`is` зайве: з `We` потрібна форма `are` — `We are together`."] },
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
      responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk },
    });
  }
  for (const [id, slots] of Object.entries(tiles)) {
    const item = byId.get(id);
    item.modePayload.slotFeedback ??= [];
    for (const [slot, [ru, uk]] of Object.entries(slots)) {
      item.modePayload.slotFeedback = replaceFeedback(item.modePayload.slotFeedback, {
        responseId: `${session}:${id}:tile:${slot}`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk },
      });
    }
  }
  byId.get("i13").modePayload.authoredDistractorTokens = ["not"];
}

fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
