import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "sessions/en/l01/s24/practice.atomic.json");
const session = "en:lesson-01:session-24";
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const choices = {
  i02: ["Про Дениса говорят `he`, поэтому в фразе `He is funny.` нужна форма `is`.", "Про Дениса кажуть `he`, тому у фразі `He is funny.` потрібна форма `is`."],
  i03: ["В записи слышно `quiet`: два слога «куай-ет», не короткое `quit` и не `queen`.", "У записі чути `quiet`: два склади «куай-ет», не коротке `quit` і не `queen`."],
  i04: ["Лина говорит, что Мия молчит, поэтому `quiet` — «тихая», не `funny` и не `hungry`.", "Ліна каже, що Мія мовчить, тому `quiet` — «тиха», а не `funny` чи `hungry`."],
  i06: ["Лина прямо говорит, что Анна не устала: после `not` нужно `tired`.", "Ліна прямо каже, що Анна не втомилася: після `not` потрібне `tired`."],
  i08: ["В записи конец `kind` звучит как `-nd`, не как `kid` и не как `king`.", "У записі кінець `kind` звучить як `-nd`, а не як `kid` чи `king`."],
  i09: ["Анна помогает коллегам, поэтому `kind` — «добрая»; речь не об опоздании и не об усталости.", "Анна допомагає колегам, тому `kind` — «добра»; не йдеться ні про запізнення, ні про втому."],
  i12: ["После `she` перед `not` ставят `is`: `She is not late.`", "Після `she` перед `not` ставлять `is`: `She is not late`."],
};
const tiles = {
  i05: ["`are` лишнее: с `He` ставят `is` — `He is hungry.`", "`are` зайве: з `He` ставлять `is` — `He is hungry`."],
  i13: ["`she` лишнее: в записи про Дениса говорят `He is quiet.`", "`she` зайве: у записі про Дениса кажуть `He is quiet`."],
  i15: ["`are` лишнее: с `She` ставят `is` — `She is not tired.`", "`are` зайве: з `She` ставлять `is` — `She is not tired`."],
};
function upsert(rows, item) {
  const index = rows.findIndex((row) => row.responseId === item.responseId);
  return (index < 0 ? [...rows, item] : rows.map((row, rowIndex) => rowIndex === index ? item : row))
    .filter((row, rowIndex, all) => row.responseId !== item.responseId || rowIndex === all.findIndex((candidate) => candidate.responseId === row.responseId));
}
for (const locale of ["ru", "uk"]) {
  const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item]));
  for (const [id, [ru, uk]] of Object.entries(choices)) {
    const item = byId.get(id);
    item.modePayload.choiceFeedback = upsert(item.modePayload.choiceFeedback ?? [], { responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk } });
  }
  for (const [id, [ru, uk]] of Object.entries(tiles)) {
    const item = byId.get(id);
    item.modePayload.slotFeedback = upsert(item.modePayload.slotFeedback ?? [], { responseId: `${session}:${id}:tile:d1`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } });
  }
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
