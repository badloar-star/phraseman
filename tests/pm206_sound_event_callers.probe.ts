import fs from 'node:fs';
import path from 'node:path';

// зачем: PM-206-A2 — «ненужные sound event IDs больше не вызываются». Два направления:
//  (1) каждый литерал id звука в рабочем коде обязан быть в каталоге (нет вызовов удалённых id);
//  (2) каждый id каталога имеет хотя бы одного вызывающего вне самого каталога (нет осиротевших id).
// Динамически собираемые id (шаблонные строки) видны только по префиксу — такие id перечислены явно.
const CATALOG = 'modules/audio/sound_events.ts';
// зачем: эти файлы — таблицы данных с теми же id, а не вызовы; их вхождения не доказывают, что звук проигрывается.
const DATA_CATALOGS = new Set(['modules/audio/sound_motion.ts']);
const roots = ['app', 'components', 'modules', 'hooks', 'constants', 'lib', 'shared'];
const catalogSrc = fs.readFileSync(CATALOG, 'utf8');
const catalogIds = new Set([...catalogSrc.matchAll(/^\s*'?(pm\.[a-z0-9_.]+)'?\s*:/gm)].map((m) => m[1]));
if (catalogIds.size < 50) throw new Error(`pm206_catalog_parse_suspicious:${catalogIds.size}`);

const files: string[] = [];
function walk(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) files.push(full.replace(/\\/g, '/'));
  }
}
roots.forEach(walk);

const used = new Map<string, string>();
const unknown: string[] = [];
const templatePrefixes = new Set<string>();
for (const file of files) {
  if (file === CATALOG || DATA_CATALOGS.has(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/['"`](pm\.[a-z0-9_]+(?:\.[a-z0-9_]+)+)['"`]/g)) {
    if (!used.has(m[1])) used.set(m[1], file);
  }
  for (const m of text.matchAll(/`(pm\.[a-z0-9_.]*)\$\{/g)) templatePrefixes.add(m[1]);
}
for (const [id, file] of used) if (!catalogIds.has(id)) unknown.push(`${id} (${file})`);

const orphaned = [...catalogIds].filter((id) => !used.has(id) && ![...templatePrefixes].some((p) => id.startsWith(p)));

console.log(`catalog=${catalogIds.size} usedLiterals=${used.size} templatePrefixes=${[...templatePrefixes].join(',') || '-'}`);
console.log(`unknownCalls=${unknown.length}`);
unknown.forEach((u) => console.log(`  ? ${u}`));
console.log(`orphanedCatalogIds=${orphaned.length}`);
orphaned.forEach((o) => console.log(`  - ${o}`));
if (process.argv.includes('--strict') && (unknown.length > 0 || orphaned.length > 0)) process.exit(1);
