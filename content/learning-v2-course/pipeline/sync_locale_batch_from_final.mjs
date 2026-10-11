import fs from "node:fs";
import path from "node:path";

const arg = (name) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null;
const ROOT = path.resolve(arg("--root") ?? path.resolve(import.meta.dirname, ".."));
const scope = arg("--scope");
const write = process.argv.includes("--write");
const onlyMismatch = process.argv.includes("--only-mismatch");
const changed = [];
const headings = (text) => [...text.matchAll(/^\*\*(\d+)\s*·/gmu)].map((match) => Number(match[1]));

for (const lesson of fs.readdirSync(path.join(ROOT, "sessions/en")).filter((x) => /^l\d\d$/u.test(x)).sort()) {
  for (const session of fs.readdirSync(path.join(ROOT, "sessions/en", lesson)).filter((x) => /^s\d\d$/u.test(x)).sort()) {
    const key = `en/${lesson}/${session}`;
    if (scope && key !== scope) continue;
    const dir = path.join(ROOT, "sessions/en", lesson, session);
    const source = path.join(dir, "final.uk.md");
    const target = path.join(dir, "locales_batch.md");
    if (!fs.existsSync(source) || !fs.existsSync(target)) continue;
    const sourceText = fs.readFileSync(source, "utf8");
    const targetText = fs.readFileSync(target, "utf8");
    const sourceTasks = headings(sourceText);
    const targetTasks = headings(targetText);
    const structuralMismatch = !targetTasks.length || targetTasks.length !== sourceTasks.length || targetTasks.at(-1) !== sourceTasks.at(-1);
    if (onlyMismatch && !structuralMismatch) continue;
    const canonical = `===LOCALE: uk===\n${sourceText.trim()}\n`;
    if (targetText === canonical) continue;
    changed.push(key);
    if (write) fs.writeFileSync(target, canonical);
  }
}

console.log(`[LOCALE-BATCH-SYNC] ${write ? "синхронизировано" : "будет синхронизировано"}: ${changed.length}`);
for (const key of changed) console.log(key);
