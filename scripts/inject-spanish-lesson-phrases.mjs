/**
 * Adds `spanish: '…'` after each Ukrainian line in LESSON_*_PHRASES blocks.
 * Sources: phrases-en-order.json → phrases-es.tsv (id<TAB>Spanish, UTF-8, no TAB in text).
 */
import fs from 'fs';

const ROOT = new URL('../', import.meta.url);
const phrasesPath = new URL('../app/lesson_data_1_8.ts', import.meta.url);
const tsvPath = new URL('./phrases-es.tsv', import.meta.url);

function escapeSQ(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const tsv = fs.readFileSync(tsvPath, 'utf8');
const map = new Map();
for (const line of tsv.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const tab = t.indexOf('\t');
  if (tab === -1) throw new Error('TSV sin tabulador: ' + t.slice(0, 80));
  const id = t.slice(0, tab).trim();
  const es = t.slice(tab + 1).trimEnd();
  if (!id || !es) throw new Error('Fila incompleta: ' + line);
  map.set(id, es);
}

const lines = fs.readFileSync(phrasesPath, 'utf8').split('\n');

let currentId = null;
let inserted = 0;

for (let i = 0; i < lines.length; i++) {
  const idM = lines[i].match(/^    id: '(lesson[1-8]_phrase_\d+)'/);
  if (idM) currentId = idM[1];

  if (/^    ukrainian:/.test(lines[i]) && /^    words:/.test(lines[i + 1] || '')) {
    if (!currentId || !map.has(currentId)) {
      throw new Error(`Sin traducción para ${currentId} (línea ${i + 1})`);
    }
    const es = escapeSQ(map.get(currentId));
    lines.splice(i + 1, 0, `    spanish: '${es}',`);
    inserted++;
    i++; // línea nueva insertada
    currentId = null;
  }
}

if (inserted !== map.size) {
  throw new Error(`Insertadas ${inserted} filas pero el map tiene ${map.size} claves`);
}

fs.writeFileSync(phrasesPath, lines.join('\n'), 'utf8');
console.log('OK:', inserted, 'frases españoles insertadas');
