import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-45";
const file = path.join(root, "sessions/en/l01/s45/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const tiles = {
  i09: ["`not` лишнее: вы довольны, поэтому `I'm satisfied.`", "`not` зайве: ви задоволені, тому `I'm satisfied`."],
  i11: ["`not` лишнее: вы очень устали, поэтому `I'm exhausted.`", "`not` зайве: ви дуже втомилися, тому `I'm exhausted`."],
  i13: ["`Its` без апострофа не подходит: в аудио `It's settled.`", "`Its` без апострофа не підходить: в аудіо `It's settled`."],
  i15: ["`its` не подходит: для отрицания нужен `It isn't settled.`", "`its` не підходить: для заперечення потрібне `It isn't settled`."],
  "i17:s03": ["`isn't` не подходит к `They`: нужно `They aren't exhausted.`", "`isn't` не підходить до `They`: потрібно `They aren't exhausted`." ]
};
function replaceFeedback(items, next) { const index = items.findIndex((item) => item.responseId === next.responseId); return index < 0 ? [...items, next] : items.map((item, itemIndex) => itemIndex === index ? next : item); }
for (const locale of ["ru", "uk"]) { const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item])); for (const [id, [ru, uk]] of Object.entries(tiles)) { const item = byId.get(id); item.modePayload.slotFeedback = (item.modePayload.slotFeedback ?? []).filter((entry) => entry.responseId !== `${session}:${id}:r1`); item.modePayload.slotFeedback = replaceFeedback(item.modePayload.slotFeedback, { responseId: `${session}:${id}:tile:d1`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } }); } }
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
