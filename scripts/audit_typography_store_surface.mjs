// зачем (координатор 11.10, D145): аудит типографики по экранам стор-сборки.
//   node scripts/audit_typography_store_surface.mjs            — печатает таблицу находок
//   node scripts/audit_typography_store_surface.mjs --update   — обновляет базу config/typography-store-surface-baseline.json
// Правила и граф импортов — tests/helpers/typography_store_surface.mjs (их же читает сторож-храповик).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditStoreSurface, collectStoreSurfaceFiles, countsByCategory, CATEGORIES } from '../tests/helpers/typography_store_surface.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'config', 'typography-store-surface-baseline.json');
const audit = auditStoreSurface(ROOT);
const files = collectStoreSurfaceFiles(ROOT);
const totals = countsByCategory(audit);

if (process.argv.includes('--update')) {
  const perFile = Object.fromEntries(Object.entries(audit).map(([f, a]) => [f, Object.fromEntries(CATEGORIES.filter((c) => a[c].length).map((c) => [c, a[c].length]))]));
  fs.writeFileSync(BASELINE, JSON.stringify({ surfaceFiles: files.length, totals, files: perFile }, null, 2) + '\n');
  console.log(`[TYPO-AUDIT] база обновлена: файлов поверхности ${files.length}, ${JSON.stringify(totals)}`);
} else {
  console.log(`[TYPO-AUDIT] файлов поверхности ${files.length}, находки ${JSON.stringify(totals)}`);
  for (const [file, found] of Object.entries(audit)) {
    for (const c of CATEGORIES) for (const x of found[c]) console.log(`${c}\t${file}:${x.line}\t${x.text}`);
  }
}
