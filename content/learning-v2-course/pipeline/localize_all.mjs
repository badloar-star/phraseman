// зачем: 22 сессии без украинского — владелец решил догнать сейчас. Гоняем
// перевод подряд, переживая лимиты; уже переведённые с актуальным файлом
// пропускаем, чтобы не платить дважды.
import fs from "fs";
import path from "path";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ROOT = path.resolve(HERE, "..");
const dir = path.join(ROOT, "sessions", "en", "l01");
const only = process.argv.slice(2).filter((a) => /^s\d\d$/.test(a));

const todo = fs.readdirSync(dir).filter((d) => /^s\d\d$/.test(d)).sort().filter((d) => {
  if (only.length && !only.includes(d)) return false;
  const ru = path.join(dir, d, "final.ru.md");
  const uk = path.join(dir, d, "final.uk.md");
  if (!fs.existsSync(ru)) return false;
  if (!fs.existsSync(uk)) return true;
  if (fs.statSync(uk).mtimeMs < fs.statSync(ru).mtimeMs) return true;
  // зачем: дата врёт — прошлый прогон переписал украинский файл, взяв текст из
  // устаревшего кэша, и файл стал «свежее» русского, оставаясь переводом старой
  // версии. Сверяем по содержанию: в русском страница интро начинается с
  // английского слова в обратных кавычках, значит и в переводе должна.
  const firstLines = (f) => fs.readFileSync(f, "utf8").split(/^## Практика/m)[0]
    .split(new RegExp("## (?:Интро|Інтро) \\d+")).slice(1)
    .map((x) => x.replace(new RegExp("^\\s*###[^\\n]*$", "m"), "").trim().split(String.fromCharCode(10)).filter((l) => l.trim())[0] || "");
  const r = firstLines(ru), u = firstLines(uk);
  // зачем: перевод терял практику целиком (0 заданий из 19), а проверка по
  // интро этого не видела — она смотрит только начала страниц
  const countTasks = (f) => (fs.readFileSync(f, "utf8").match(new RegExp("^\*\*\d+ ", "gm")) || []).length;
  const nRu = countTasks(ru), nUk = countTasks(uk);
  if (nUk < nRu) { console.log(`[LOC] ${d}: в переводе ${nUk} заданий против ${nRu} — переведу заново`); return true; }
  const drifted = r.filter((x, i) => /^`[a-z]/i.test(x) && u[i] && !/^`[a-z]/i.test(u[i])).length;
  if (drifted) { console.log(`[LOC] ${d}: перевод сделан со старой версии (${drifted} стр. расходятся) — переведу заново`); return true; }
  return false;
});

console.log(`[LOC] к переводу: ${todo.length} — ${todo.join(", ") || "нечего"}`);
let ok = 0, fail = 0;
for (const d of todo) {
  const t0 = Date.now();
  console.log(`\n[LOC] === ${d} (${ok + fail + 1} из ${todo.length}) ===`);
  const r = spawnSync(process.execPath, [path.join(HERE, "run.mjs"), "localize", "--session", `en/l01/${d}`, "--backend", "claude"], { encoding: "utf8" });
  const out = String(r.stdout || "") + String(r.stderr || "");
  const lines = out.split("\n").filter((l) => /локаль uk|итог локалей|круг правки|✗|лимит/.test(l));
  lines.slice(-4).forEach((l) => console.log("   " + l.replace(/^\[FACTORY\]\s*/, "").slice(0, 150)));
  const uk = path.join(dir, d, "final.uk.md");
  const good = fs.existsSync(uk) && fs.statSync(uk).mtimeMs >= fs.statSync(path.join(dir, d, "final.ru.md")).mtimeMs;
  if (good) { ok++; console.log(`[LOC] ${d}: готово за ${Math.round((Date.now() - t0) / 1000)} с`); }
  else { fail++; console.log(`[LOC] ${d}: НЕ ПОЛУЧИЛОСЬ`); }
}
console.log(`\n[LOC] итог: переведено ${ok}, не вышло ${fail}`);
