/* ============================================================
   Сборка автономного макета: один HTML-файл, который открывается
   ДВОЙНЫМ КЛИКОМ с диска, без сервера.

   Зачем: владелец открыл index.html как файл (file://), и браузер
   заблокировал fetch("course-data.json") по политике CORS — макет
   показал голый текст и серый прямоугольник вместо карты. Файл,
   который нельзя открыть двойным кликом, для показа не годится.

   Здесь стили, движок и данные вклеиваются внутрь документа, поэтому
   сети не требуется вообще.

   Запуск:  node docs/design/learning-v2-map/build.mjs
   Результат: standalone.html рядом.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(here, f), "utf8");

let html = read("index.html");

// 1. Стили → внутрь <style>.
for (const css of ["tokens.css", "phone.css", "map.css"]) {
  const tag = `<link rel="stylesheet" href="${css}">`;
  if (!html.includes(tag)) throw new Error(`не нашёл подключение ${css}`);
  html = html.replace(tag, `<style>/* ${css} */\n${read(css)}\n</style>`);
}

// 2. Движок → внутрь <script>.
const kitTag = '<script src="mapkit.js"></script>';
if (!html.includes(kitTag)) throw new Error("не нашёл подключение mapkit.js");
html = html.replace(kitTag, `<script>/* mapkit.js */\n${read("mapkit.js")}\n</script>`);

// 3. Данные → в переменную, fetch заменяем на готовый ответ.
// JSON.stringify дважды: строка внутри скрипта, которую разбирает JSON.parse —
// так внутрь не утечёт ни </script>, ни кавычка.
const data = JSON.parse(read("course-data.json"));
const inlineData =
  `<script>window.__COURSE_DATA__ = JSON.parse(${JSON.stringify(
    JSON.stringify(data)
  ).replace(/<\//g, "<\\/")});</script>`;
html = html.replace("</head>", `${inlineData}\n</head>`);

// Сам вызов fetch подменяем на локальные данные — с диска сеть недоступна.
const fetchCall = 'fetch("course-data.json").then(function (r) { return r.json(); })';
if (!html.includes(fetchCall)) throw new Error("не нашёл вызов fetch — макет изменился");
html = html.replace(fetchCall, "Promise.resolve(window.__COURSE_DATA__)");

// Тот же fetch внутри витрины сравнения (если появится) — защищаемся заранее.
html = html.replace(
  /fetch\('course-data\.json'\)\.then\(r=>r\.json\(\)\)/g,
  "Promise.resolve(window.__COURSE_DATA__)"
);

// 4. Шрифт Google оставляем, но макет не должен от него зависеть:
// без сети подхватится системный (в tokens.css уже прописан запасной стек).

writeFileSync(join(here, "standalone.html"), html, "utf8");

const kb = (s) => Math.round(s / 1024) + " КБ";
console.log(`standalone.html собран: ${kb(Buffer.byteLength(html))}`);
console.log("Открывается двойным кликом, сервер не нужен.");

// Проверка: в автономном файле не должно остаться внешних ссылок на свои же файлы.
const leftovers = [...html.matchAll(/(?:href|src)="(?!https?:|data:|#)([^"]+)"/g)].map((m) => m[1]);
if (leftovers.length) {
  console.log("ВНИМАНИЕ: остались внешние ссылки:", leftovers.join(", "));
  process.exit(1);
}
if (html.includes('fetch("course-data.json")')) {
  console.log("ВНИМАНИЕ: остался вызов fetch — файл не откроется с диска");
  process.exit(1);
}
console.log("Внешних зависимостей нет.");
