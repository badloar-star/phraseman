import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const scope = process.argv.includes("--scope") ? process.argv[process.argv.indexOf("--scope") + 1] : null;
const headings = (text) => [...text.matchAll(/^\*\*(\d+)\s*·/gmu)].map((match) => Number(match[1]));
const issues = [];

for (const lesson of fs.readdirSync(path.join(ROOT, "sessions/en")).filter((x) => /^l\d\d$/u.test(x)).sort()) {
  for (const session of fs.readdirSync(path.join(ROOT, "sessions/en", lesson)).filter((x) => /^s\d\d$/u.test(x)).sort()) {
    const key = `en/${lesson}/${session}`;
    if (scope && key !== scope) continue;
    const dir = path.join(ROOT, "sessions/en", lesson, session);
    const batchPath = path.join(dir, "locales_batch.md");
    const localePath = path.join(dir, "final.uk.md");
    if (!fs.existsSync(batchPath) || !fs.existsSync(localePath)) continue;
    const batchText = fs.readFileSync(batchPath, "utf8");
    const localeText = fs.readFileSync(localePath, "utf8");
    const batch = headings(batchText);
    const locale = headings(localeText);
    if (!batch.length || !locale.length || batch.length !== locale.length || batch.at(-1) !== locale.at(-1)) {
      issues.push({ scope: key, kind: "structure", batch: batch.length ? `${batch.length}/${batch.at(-1)}` : "none", locale: locale.length ? `${locale.length}/${locale.at(-1)}` : "none" });
      continue;
    }
    const canonical = `===LOCALE: uk===\n${localeText.trim()}\n`;
    if (batchText !== canonical) {
      issues.push({ scope: key, kind: "content", batch: `${batch.length}/${batch.at(-1)}`, locale: `${locale.length}/${locale.at(-1)}` });
    }
  }
}

if (issues.length) {
  console.log(`[LOCALE-BATCH-PARITY][HOLD] ${issues.length} устаревших или структурно расходящихся вспомогательных файлов`);
for (const issue of issues) console.log(`${issue.scope}: kind=${issue.kind}; batch=${issue.batch}, final.uk=${issue.locale}`);
  process.exitCode = 1;
} else {
  console.log("[LOCALE-BATCH-PARITY][PASS] вспомогательные файлы точно совпадают с украинскими источниками по структуре и содержанию");
}
