// Собирает автономные копии макетов:
//   dist/          — полные HTML с вклеенными shared/*.css и shared/*.js (открывать с диска, пересылать);
//   dist-artifact/ — фрагменты без <html>/<head>/<body> для публикации артефактом
//                    (площадка сама оборачивает документ). Если рядом лежит
//                    dist-artifact/links.json ({ "03-map.html": "https://…" }),
//                    ссылки между макетами переписываются на опубликованные адреса.
// Запуск: node docs/design/learning-v2/build.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "dist");
const outArt = join(here, "dist-artifact");
mkdirSync(out, { recursive: true });
mkdirSync(outArt, { recursive: true });
const linksPath = join(outArt, "links.json");
const links = existsSync(linksPath) ? JSON.parse(readFileSync(linksPath, "utf8")) : {};

const inline = (html) => html
  .replace(/<link rel="stylesheet" href="shared\/([^"]+)">/g, (_, f) => `<style>\n${readFileSync(join(here, "shared", f), "utf8")}\n</style>`)
  .replace(/<script src="shared\/([^"]+)"><\/script>/g, (_, f) => `<script>\n${readFileSync(join(here, "shared", f), "utf8")}\n</script>`);

const pages = readdirSync(here).filter((f) => f.endsWith(".html"));
for (const page of pages) {
  const full = inline(readFileSync(join(here, page), "utf8"));
  writeFileSync(join(out, page), full);

  // Фрагмент для артефакта: <title> + шрифты + стили из head, затем содержимое body.
  const head = full.match(/<head>([\s\S]*?)<\/head>/)[1];
  const body = full.match(/<body>([\s\S]*?)<\/body>/)[1];
  const keep = [];
  const title = head.match(/<title>[\s\S]*?<\/title>/); if (title) keep.push(title[0]);
  for (const m of head.matchAll(/<link[^>]+fonts\.googleapis[^>]*>/g)) keep.push(m[0]);
  for (const m of head.matchAll(/<style>[\s\S]*?<\/style>/g)) keep.push(m[0]);
  let fragment = keep.join("\n") + "\n" + body;
  // Любой строковый литерал "03-map.html" или "03-map.html#state" (в HTML-атрибуте,
  // в объекте панели или в location.href) → адрес артефакта с тем же якорем.
  for (const [file, url] of Object.entries(links)) {
    const re = new RegExp(`"${file.replace(/\./g, "\\.")}(#[a-z-]+)?"`, "g");
    fragment = fragment.replace(re, (m, hash) => `"${url}${hash || ""}"`);
  }
  writeFileSync(join(outArt, page), fragment);
  console.log(`dist/${page} · ${(full.length / 1024).toFixed(0)} КБ · фрагмент ${(fragment.length / 1024).toFixed(0)} КБ`);
}
