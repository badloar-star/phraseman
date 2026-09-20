/* ============================================================
   Проверка геометрии карты БЕЗ браузера.

   Смысл: требование владельца «ничего не должно лагать» проверяется числами,
   а не впечатлением от скролла. Если при любом положении скролла в окно
   попадает больше горсти узлов — карта будет лагать, и это видно здесь,
   до того как что-то отрисовано.

   Запуск:  node docs/design/learning-v2-map/check.mjs
   ============================================================ */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// mapkit.js написан как UMD — подключаем его как обычный скрипт.
const src = readFileSync(join(here, "mapkit.js"), "utf8");
const sandbox = { window: undefined, module: { exports: {} } };
const globalObj = {};
new Function("globalThis", "module", src)(globalObj, sandbox.module);
const G = globalObj.MapKitGeom;

const data = JSON.parse(readFileSync(join(here, "course-data.json"), "utf8"));

const VIEWPORT = 844 - 54 - 96; // экран минус статус-бар и шапка
const OVERSCAN = 260;
let failures = 0;
const ok = (cond, label, detail) => {
  if (cond) {
    console.log(`  PASS  ${label}${detail ? " — " + detail : ""}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? " — " + detail : ""}`);
  }
};

console.log("\nГеометрия карты");
console.log(`  уроков ${G.LESSONS} · занятий в уроке ${G.SESSIONS_PER_LESSON} · всего ${G.LESSONS * G.SESSIONS_PER_LESSON}`);
console.log(`  высота урока ${G.LESSON_H}px · высота главы ${G.CH_H}px · полотно ${G.TOTAL_H}px\n`);

// 1. Полная высота известна заранее и совпадает с суммой уроков.
ok(
  G.TOTAL_H === G.LESSONS * G.LESSON_H,
  "полотно = сумма уроков",
  `${G.TOTAL_H}px`
);

// 2. У каждого узла ровно одна позиция, и позиции строго растут.
let mono = true;
let prevY = -1;
const seen = new Set();
for (let gi = 0; gi < G.LESSONS * G.SESSIONS_PER_LESSON; gi++) {
  const n = G.nodeAt(gi);
  if (n.y <= prevY) mono = false;
  prevY = n.y;
  const key = `${n.lesson}:${n.session}`;
  if (seen.has(key)) mono = false;
  seen.add(key);
}
ok(mono, "позиции узлов строго возрастают и не повторяются");
ok(seen.size === 1792, "адресуются все 1792 занятия", `${seen.size}`);

// 3. Нумерация занятий внутри урока идёт 1..56, глава — каждые 8.
let numbering = true;
for (let L = 0; L < G.LESSONS; L++) {
  for (let s = 0; s < G.SESSIONS_PER_LESSON; s++) {
    const n = G.nodeAt(L * G.SESSIONS_PER_LESSON + s);
    if (n.lesson !== L || n.session !== s) numbering = false;
    if (n.chapter !== Math.floor(s / G.SESSIONS_PER_CHAPTER)) numbering = false;
  }
}
ok(numbering, "в каждом уроке занятия 1..56, глава каждые 8");

// 4. ГЛАВНОЕ: сколько узлов живёт в окне при любом положении скролла.
let worst = 0;
let worstAt = 0;
for (let top = 0; top <= G.TOTAL_H - VIEWPORT; top += 37) {
  const from = top - OVERSCAN;
  const to = top + VIEWPORT + OVERSCAN;
  let count = 0;
  const l0 = Math.max(0, Math.floor(from / G.LESSON_H));
  const l1 = Math.min(G.LESSONS - 1, Math.floor(to / G.LESSON_H));
  for (let L = l0; L <= l1; L++) {
    for (let s = 0; s < G.SESSIONS_PER_LESSON; s++) {
      const n = G.nodeAt(L * G.SESSIONS_PER_LESSON + s);
      if (n.y >= from && n.y <= to) count++;
    }
  }
  if (count > worst) { worst = count; worstAt = top; }
}
ok(worst <= 40, "в окне не больше 40 узлов при любом скролле", `максимум ${worst} (на ${worstAt}px)`);
console.log(`        → в DOM живёт ${worst} узлов вместо 1792: в ${Math.round(1792 / worst)} раз меньше работы на кадр`);

// 4b. Кружки не должны наезжать друг на друга.
// Подпись теперь сбоку, поэтому вертикаль держит только сам кружок.
const BIG_NODE = 72; // текущий узел — самый крупный
ok(
  G.M.step >= BIG_NODE + 16,
  "кружки не наезжают друг на друга",
  `шаг ${G.M.step}px при самом крупном кружке ${BIG_NODE}px`
);

// 4c. Подпись СБОКУ обязана помещаться целиком, не упираясь в край экрана.
// Владелец: текст слева или справа — смотря к какому краю кружок ближе.
const LABEL_W = 150; // .node .nm width
const LABEL_GAP = 12; // отступ от кружка
const maxX = G.M.railW / 2 + G.M.amp; // самый правый кружок
const minX = G.M.railW / 2 - G.M.amp; // самый левый
// Для правого кружка подпись уходит ВЛЕВО: нужно место от его левого края до 0.
const roomLeft = maxX - BIG_NODE / 2 - LABEL_GAP;
// Для левого кружка подпись уходит ВПРАВО: место от правого края до railW.
const roomRight = G.M.railW - (minX + BIG_NODE / 2 + LABEL_GAP);
ok(
  roomLeft >= LABEL_W && roomRight >= LABEL_W,
  "подпись сбоку помещается целиком с любой стороны",
  `слева ${Math.round(roomLeft)}px, справа ${Math.round(roomRight)}px при подписи ${LABEL_W}px`
);

// 5. Плашка урока действительно «на пол-экрана».
const halfScreen = 844 / 2;
ok(
  G.M.plate >= halfScreen * 0.85 && G.M.plate <= halfScreen * 1.0,
  "плашка урока около половины экрана",
  `${G.M.plate}px при экране 844`
);

// 6. Имена занятий: только написанные уроки, ничего не выдумано.
const named = new Set(data.sessions.map((s) => `${s.l}:${s.s}`));
const writtenLessons = Object.keys(data.written).map(Number).sort((a, b) => a - b);
let strayName = null;
for (const key of named) {
  const L = Number(key.split(":")[0]);
  if (!writtenLessons.includes(L)) { strayName = key; break; }
}
ok(strayName === null, "имена есть только у написанных уроков", `уроки ${writtenLessons.join(", ")}`);
ok(named.size === 168, "имён занятий ровно столько, сколько в плане", `${named.size}`);

// 6b. Разметка плана не должна доезжать до экрана: в ПЛАНЕ_КУРСА слова
// выделены `обратными кавычками` и **звёздочками» — человек это видеть не должен.
const markdownLeak = data.sessions.find((s) => /[`*_]/.test(s.moment))
  || data.chapters.find((c) => /[`*_]/.test(c.scene));
ok(
  !markdownLeak,
  "разметка плана не попала в подписи",
  markdownLeak ? `нашлось: ${markdownLeak.moment || markdownLeak.scene}` : "чисто"
);

// 7. Арки есть у всех 32 уроков — плашка никогда не пустая.
const arcCount = Object.keys(data.arcs).length;
ok(arcCount === 32, "у каждого урока есть название и арка", `${arcCount} из 32`);
let emptyArc = null;
for (let L = 1; L <= 32; L++) {
  const a = data.arcs[String(L)];
  if (!a || !a.sys || !a.arc) { emptyArc = L; break; }
}
ok(emptyArc === null, "ни одна плашка не остаётся без текста");

// 7b. Служебные заметки автора плана не должны доезжать до ученика.
// Урок 22 назывался «…+ фразовые глаголы (новый слот, решение владельца 03.09)» —
// это внутренняя пометка, из-за неё же название не влезало в плашку.
const editorialNote = Object.entries(data.arcs).find(([, a]) =>
  /\((?:новый слот|решение|утверждено)/i.test(a.sys)
);
ok(
  !editorialNote,
  "в названиях уроков нет служебных пометок автора",
  editorialNote ? `урок ${editorialNote[0]}` : "чисто"
);

// 8. Высота плашки урока в списке = как в Learning V1.
const css = readFileSync(join(here, "map.css"), "utf8");
const rowBlock = css.slice(css.indexOf("\n.row {"), css.indexOf("\n.row:active"));
const minH = /min-height:\s*(\d+)px/.exec(rowBlock);
ok(minH && Number(minH[1]) === 72, "плашка урока 72px, как BOOK_H в V1", minH ? minH[1] + "px" : "не найдено");
// Заголовок урока переносится целиком (многоточие и обрезка запрещены).
// Проверяем арифметикой, что самое длинное название влезает в 72px.
const titleBlock = css.slice(css.indexOf(".row .r-title"), css.indexOf(".row.locked"));
const fsMatch = /font-size:\s*([\d.]+)px/.exec(titleBlock);
const lhMatch = /line-height:\s*([\d.]+)/.exec(titleBlock);
const rowFs = fsMatch ? Number(fsMatch[1]) : 0;
const rowLh = lhMatch ? Number(lhMatch[1]) : 0;
const ROW_W = 286;      // ширина колонки текста: экран минус поля, кольцо и зазор
const ROW_PAD = 7 * 2;  // padding сверху и снизу
const META_H = 14 + 2;  // метка «УРОК N» плюс отступ
const longest = Math.max(...Object.values(data.arcs).map((a) => a.sys.length));
const perLine = Math.floor(ROW_W / (rowFs * 0.52));
const linesNeeded = Math.ceil(longest / perLine);
const titleH = linesNeeded * rowFs * rowLh;
ok(
  ROW_PAD + META_H + titleH <= 72,
  "самое длинное название урока влезает целиком в 72px",
  `${longest} знаков → ${linesNeeded} строки, итого ${Math.round(ROW_PAD + META_H + titleH)}px`
);
ok(/\.ring\s*\{[^}]*width:\s*34px/.test(css), "круговой индикатор на месте, цифра процента видна (34px)");

// 8b. Прыжок по списку уроков обязан доезжать.
// Замер в браузере: scrollTo({behavior:"smooth"}) на 29 000px НЕ доезжает
// вообще — scrollTop остаётся прежним, и тап выглядит как мёртвая кнопка.
const kit = readFileSync(join(here, "mapkit.js"), "utf8");
ok(
  /SMOOTH_LIMIT/.test(kit) && /smooth && !far/.test(kit),
  "далёкий прыжок делается мгновенно, а не «плавно в никуда»"
);
const goToBody = kit.slice(kit.indexOf("_goTo = function"), kit.indexOf("scrollToLesson = function"));
ok(
  /this\.render\(\)/.test(goToBody),
  "после мгновенного прыжка карта перерисовывается сама"
);

// 8c. МНОГОТОЧИЕ ЗАПРЕЩЕНО. Владелец 20.09: «ни один текст не идёт в три
// точки, это нельзя». Правило было в CLAUDE.md, но проверки не было — и я
// поставил ellipsis в четырёх местах сразу. Теперь ловится машиной.
const ellipsis = [...css.matchAll(/text-overflow:\s*ellipsis/g)];
ok(
  ellipsis.length === 0,
  "нигде нет обрезки текста многоточием",
  ellipsis.length ? `найдено ${ellipsis.length}` : "чисто"
);
// Витрина «как было» намеренно показывает старый вариант — она вне запрета,
// но и там многоточия быть не должно, только разная высота.
const clamp = [...css.matchAll(/-webkit-line-clamp/g)];
ok(clamp.length === 0, "нет обрезки текста по числу строк", clamp.length ? `найдено ${clamp.length}` : "чисто");

// 8d. Сторона подписи выбирается из положения кружка.
ok(
  /side-right/.test(kit) && /side-left/.test(kit) && /n\.x < M\.railW \/ 2/.test(kit),
  "сторона подписи зависит от того, к какому краю кружок ближе"
);

// 9. На карте нет массовых бесконечных анимаций.
const infinite = (css.match(/animation:[^;]*infinite/g) || []);
ok(infinite.length <= 1, "бесконечная анимация только одна (дыхание текущего узла)", `${infinite.length}`);

console.log(
  failures === 0
    ? `\nВсё сошлось: ${9} проверок пройдено.\n`
    : `\nНе сошлось: ${failures} проверок упало.\n`
);
process.exit(failures === 0 ? 0 : 1);
