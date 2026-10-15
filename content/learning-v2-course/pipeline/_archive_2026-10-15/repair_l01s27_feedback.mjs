import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-27";
const atomicFile = path.join(root, "sessions/en/l01/s27/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(atomicFile, "utf8"));

const choices = {
  i02: ["В записи слышно `cheap`: гласная тянется, а слово начинается со звука «ч». Поэтому не `chip` и не `sheep`.", "У записі чути `cheap`: голосна тягнеться, а слово починається зі звуку «ч». Тому не `chip` і не `sheep`."],
  i04: ["В записи слышно `far`: рот открыт широко. Поэтому не `four` и не `fur`.", "У записі чути `far`: рот відкритий широко. Тому не `four` і не `fur`."],
  i07: ["До остановки пять минут, поэтому `far` — «далеко» — не подходит: нужна фраза `It is not far.`", "До зупинки п'ять хвилин, тому `far` — «далеко» — не підходить: потрібна фраза `It is not far`."],
  i10: ["В записи слышно `hard`: звук тянется дольше, чем в `hat`; это не `heart` — «сердце».", "У записі чути `hard`: звук тягнеться довше, ніж у `hat`; це не `heart` — «серце»."],
  i12: ["Ключ проворачивается с трудом, поэтому `hard` — «трудно». `easy` означает наоборот, а `warm` — про температуру.", "Ключ провертається важко, тому `hard` — «важко». `easy` означає навпаки, а `warm` — про температуру."],
  i15: ["После `It` нужна форма `is`: `It is not small.` `am` ставят с `I`, а `are` — с you/we/they.", "Після `It` потрібна форма `is`: `It is not small.` `am` ставлять з `I`, а `are` — з you/we/they."],
};
const tiles = {
  i16: ["`no` лишнее: внутри фразы после `is` нужно `not` — `It is not far.`", "`no` зайве: усередині фрази після `is` потрібне `not` — `It is not far`."],
  "i21:s02": ["`are` лишнее: с `It` ставят `is` — `It is not far.`", "`are` зайве: з `It` ставлять `is` — `It is not far`."],
  "i21:s03": ["`are` лишнее: с `It` ставят `is` — `It is not easy.`", "`are` зайве: з `It` ставлять `is` — `It is not easy`."],
};
function upsert(rows, item) {
  const index = rows.findIndex((row) => row.responseId === item.responseId);
  return (index < 0 ? [...rows, item] : rows.map((row, rowIndex) => rowIndex === index ? item : row))
    .filter((row, rowIndex, all) => row.responseId !== item.responseId || rowIndex === all.findIndex((candidate) => candidate.responseId === row.responseId));
}
for (const locale of ["ru", "uk"]) {
  const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item]));
  byId.get("i15").prompt = locale === "ru"
    ? "Вставьте слово — риелтор называет комнату тесной, а вам в ней просторно"
    : "Вставте слово — рієлтор називає кімнату тісною, а вам у ній просторо";
  for (const [id, [ru, uk]] of Object.entries(choices)) {
    const item = byId.get(id);
    item.modePayload.choiceFeedback = upsert(item.modePayload.choiceFeedback ?? [], { responseId: `${session}:${id}:r1`, correct: true, testedDimension: item.prompt, feedbackByLocale: { ru, uk } });
  }
  for (const [id, [ru, uk]] of Object.entries(tiles)) {
    const item = byId.get(id);
    item.responseOptions = [];
    item.modePayload.slotFeedback = upsert((item.modePayload.slotFeedback ?? []).filter((row) => row.responseId === `${session}:${id}:tile:d1`), { responseId: `${session}:${id}:tile:d1`, correct: false, testedDimension: item.prompt, feedbackByLocale: { ru, uk } });
  }
}
fs.writeFileSync(atomicFile, `${JSON.stringify(data, null, 2)}\n`);

const markdownChanges = {
  "final.ru.md": [
    ["**Агент называет цену и говорит: «`Cheap!`» Цена вас не радует. Возразите.**", "**Риелтор называет цену «`Cheap!`», но вы считаете её высокой. Возразите.**"],
    ["Спросят «`Far?`» — можно буркнуть `no` и закрыть тему. А можно сказать `It is not far`, и это уже разговор, а не отмашка.", "На вопрос «`Far?`» можно ответить только `no`. Но полная фраза `It is not far` ясно говорит: далеко не ехать."],
    ["**Агент уверяет, что до центра целый час. Вы шли пятнадцать минут. Возразите.**", "**Риелтор говорит, что до центра целый час. Вы уже дошли за пятнадцать минут. Возразите.**"],
    ["**Агент показывает окно, которое открывается с третьей попытки, и говорит: «`Easy!`» Возразите.**", "**Риелтор показывает окно, которое открывается только с третьей попытки, и говорит: «`Easy!`» Возразите.**"],
    ["🔊 *cheap* → **cheap** · chip · sheep\n- chip", "🔊 *cheap* → **cheap** · chip · sheep\nВерный ответ — `cheap`: в нём тянется гласная и слышится начальный звук «ч».\n- chip"],
    ["🔊 *far* → **far** · four · fur\n- four", "🔊 *far* → **far** · four · fur\nВерный ответ — `far`: рот открыт широко.\n- four"],
    ["It is not ___ . → **far** · cheap · dark\n- cheap", "It is not ___ . → **far** · cheap · dark\nВерный ответ — `far`: до остановки пять минут, поэтому это не далеко.\n- cheap"],
    ["🔊 *hard* → **hard** · heart · hat\n- heart", "🔊 *hard* → **hard** · heart · hat\nВерный ответ — `hard`: это «трудно», а звук тянется дольше, чем в `hat`.\n- heart"],
    ["It is ___ . → **hard** · easy · warm\n- easy", "It is ___ . → **hard** · easy · warm\nВерный ответ — `hard`: ключ проворачивается с трудом.\n- easy"],
    ["**15 · Вставьте слово — агент называет комнату тесной, а вам в ней просторно**", "**15 · Вставьте слово — риелтор называет комнату тесной, а вам в ней просторно**"],
    ["It ___ not small. → **is** · am · are\n- am", "It ___ not small. → **is** · am · are\nВерный ответ — `is`: после `It` нужна форма `is`.\n- am"],
    ["🔊 *It is not far.* Плитки: `far` `is` `It` `not` `no` → **It is not far.**", "🔊 *It is not far.* Плитки: `far` `is` `It` `not` `no` → **It is not far.**\nЛишняя плитка `no`: внутри фразы после `is` нужно `not`."],
    ["Плитки: `far` `not` `It` `is` `are` → **It is not far.**", "Плитки: `far` `not` `It` `is` `are` → **It is not far.**\nЛишняя плитка `are`: с `It` ставят `is`."],
    ["🔊 *It is not easy.* Плитки: `easy` `It` `not` `is` `are` → **It is not easy.**", "🔊 *It is not easy.* Плитки: `easy` `It` `not` `is` `are` → **It is not easy.**\nЛишняя плитка `are`: с `It` ставят `is`."],
  ],
  "final.uk.md": [
    ["**Агент називає ціну й каже: «`Cheap!`» Ціна вас не тішить. Заперечте.**", "**Рієлтор називає ціну «`Cheap!`», але ви вважаєте її високою. Заперечте.**"],
    ["Спитають «`Far?`» — можна буркнути `no` і закрити тему. А можна сказати `It is not far`, і це вже розмова, а не відмашка.", "На запитання «`Far?`» можна відповісти лише `no`. Але повна фраза `It is not far` ясно каже: їхати недалеко."],
    ["**Агент запевняє, що до центру ціла година. Ви йшли п'ятнадцять хвилин. Заперечте.**", "**Рієлтор каже, що до центру ціла година. Ви вже дійшли за п'ятнадцять хвилин. Заперечте.**"],
    ["**Агент показує вікно, яке відчиняється з третьої спроби, і каже: «`Easy!`» Заперечте.**", "**Рієлтор показує вікно, яке відчиняється лише з третьої спроби, і каже: «`Easy!`» Заперечте.**"],
    ["🔊 *cheap* → **cheap** · chip · sheep\n- chip", "🔊 *cheap* → **cheap** · chip · sheep\nПравильна відповідь — `cheap`: у ньому тягнеться голосна й чути початковий звук «ч».\n- chip"],
    ["🔊 *far* → **far** · four · fur\n- four", "🔊 *far* → **far** · four · fur\nПравильна відповідь — `far`: рот відкритий широко.\n- four"],
    ["It is not ___ . → **far** · cheap · dark\n- cheap", "It is not ___ . → **far** · cheap · dark\nПравильна відповідь — `far`: до зупинки п'ять хвилин, тому це недалеко.\n- cheap"],
    ["🔊 *hard* → **hard** · heart · hat\n- heart", "🔊 *hard* → **hard** · heart · hat\nПравильна відповідь — `hard`: це «важко», а звук тягнеться довше, ніж у `hat`.\n- heart"],
    ["It is ___ . → **hard** · easy · warm\n- easy", "It is ___ . → **hard** · easy · warm\nПравильна відповідь — `hard`: ключ провертається важко.\n- easy"],
    ["**15 · Вставте слово — агент називає кімнату тісною, а вам у ній просторо**", "**15 · Вставте слово — рієлтор називає кімнату тісною, а вам у ній просторо**"],
    ["It ___ not small. → **is** · am · are\n- am", "It ___ not small. → **is** · am · are\nПравильна відповідь — `is`: після `It` потрібна форма `is`.\n- am"],
    ["🔊 *It is not far.* Плитки: `far` `is` `It` `not` `no` → **It is not far.**", "🔊 *It is not far.* Плитки: `far` `is` `It` `not` `no` → **It is not far.**\nЗайва плитка `no`: усередині фрази після `is` потрібне `not`."],
    ["Плитки: `far` `not` `It` `is` `are` → **It is not far.**", "Плитки: `far` `not` `It` `is` `are` → **It is not far.**\nЗайва плитка `are`: з `It` ставлять `is`."],
    ["🔊 *It is not easy.* Плитки: `easy` `It` `not` `is` `are` → **It is not easy.**", "🔊 *It is not easy.* Плитки: `easy` `It` `not` `is` `are` → **It is not easy.**\nЗайва плитка `are`: з `It` ставлять `is`."],
  ],
};
for (const [file, replacements] of Object.entries(markdownChanges)) {
  const target = path.join(root, "sessions/en/l01/s27", file);
  let text = fs.readFileSync(target, "utf8").replaceAll("\r\n", "\n");
  for (const [from, to] of replacements) {
    if (text.includes(from)) text = text.replace(from, to);
    else if (!text.includes(to)) throw new Error(`Expected text not found in ${file}: ${from}`);
  }
  fs.writeFileSync(target, text);
}
