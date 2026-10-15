// зачем: одно и то же правило (длина интро, число заданий, касания слов) записано
// в трёх файлах сразу — Конституции, судейской версии и промпте автора. Дважды
// уже ловил: правку внесли в один файл, остальные молча разошлись, и автор с
// судьями работали по разным правилам. Сторож сверяет числа и падает при расхождении.
import fs from "fs";
import path from "path";

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ROOT = path.resolve(HERE, "..");
const FILES = {
  "Конституция": path.join(ROOT, "КОНСТИТУЦИЯ.md"),
  "судьям": path.join(HERE, "КОНСТИТУЦИЯ_ДЛЯ_СУДЕЙ.md"),
  "автору": path.join(HERE, "prompts", "author.md"),
};

// каждое правило: как его найти и что считать значением
const RULES = [
  { name: "длина интро", re: /(\d{3})\s*[–-]\s*(\d{3})\s*знак/, pick: (m) => `${m[1]}-${m[2]}` },
  { name: "ориентир заданий", re: /ориентир\s+(\d+)/i, pick: (m) => m[1] },
  { name: "минимум заданий", re: /не\s+мен(?:ьше|ее)\s+(\d+)|(\d+)\s*[–-]\s*20/i, pick: (m) => m[1] || m[2] },
  { name: "пар в доске", re: /(\d+)\s+пар[ыи]?\b/, pick: (m) => m[1] },
];

let bad = 0;
for (const rule of RULES) {
  const seen = {};
  for (const [who, f] of Object.entries(FILES)) {
    if (!fs.existsSync(f)) continue;
    const m = rule.re.exec(fs.readFileSync(f, "utf8"));
    if (m) seen[who] = rule.pick(m);
  }
  const values = [...new Set(Object.values(seen))];
  const where = Object.entries(seen).map(([k, v]) => `${k}=${v}`).join(", ");
  if (values.length > 1) {
    console.log(`РАСХОЖДЕНИЕ · ${rule.name}: ${where}`);
    bad++;
  } else if (values.length === 1) {
    console.log(`ок · ${rule.name}: ${values[0]} (${Object.keys(seen).join(", ")})`);
  } else {
    console.log(`не найдено · ${rule.name} — проверь вручную`);
  }
}
if (bad) {
  console.log(`\nправил разошлось: ${bad}. Автор и судьи будут работать по разным правилам — почини, прежде чем писать сессии.`);
  process.exit(1);
}
console.log("\nправила согласованы во всех файлах");
