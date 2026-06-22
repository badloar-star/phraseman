// Exports every live phrase as {id, lesson, builtEn, russian, ukrainian, spanish}
// where builtEn = the answer the engine actually validates (join of wordsEn slots).
// Output: PHRASES_FOR_SEMANTIC.json — fed to the semantic (LLM) audit workflow.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = resolve(__dirname, '..', '..', 'app');
const FILES = [
  resolve(APP, 'lesson_data_1_8_phrases_es.gen.ts'),
  resolve(APP, 'lesson_data_9_16_phrases_es.gen.ts'),
  resolve(APP, 'lesson_data_17_24.ts'),
  resolve(APP, 'lesson_data_25_32.ts'),
];

function extractArrays(src) {
  const out = {};
  const re = /export const (LESSON_\d+_PHRASES)\s*:\s*LessonPhrase\[\]\s*=\s*\[/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    const start = re.lastIndex - 1;
    let depth = 0, i = start, inStr = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
      if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
      if (c === '[') depth++;
      else if (c === ']') { depth--; if (depth === 0) { i++; break; } }
    }
    out[name] = eval('(' + src.slice(start, i) + ')');
  }
  return out;
}
function stripMarkers(w) {
  const s = String(w).replace(/^\/|\/$/g, '').replace(/«-»/g, '').replace(/[«»]/g, '').replace(/[.!?,;]+$/, '').trim();
  return s === '-' ? '' : s;
}
function buildEn(p) {
  const rows = (p.wordsEn && p.wordsEn.length) ? p.wordsEn : p.words;
  if (!rows || !rows.length) return p.english;
  let s = rows.map(r => stripMarkers(r.correct ?? r.text)).filter(x => x.length).join(' ');
  const ref = String(p.english).trim();
  if (ref.endsWith('?') && !/[.?!]$/.test(s)) s += '?';
  else if (ref.endsWith('!') && !/[.?!]$/.test(s)) s += '!';
  else if (ref.endsWith('.') && !/[.?!]$/.test(s)) s += '.';
  return s;
}

const all = [];
for (const file of FILES) {
  const src = readFileSync(file, 'utf8');
  const arrays = extractArrays(src);
  for (const [name, arr] of Object.entries(arrays)) {
    const lesson = Number(name.match(/LESSON_(\d+)_PHRASES/)[1]);
    arr.forEach((p, idx) => {
      all.push({
        id: p.id || `lesson${lesson}_phrase_${idx}`,
        lesson,
        builtEn: buildEn(p),
        english: p.english,
        russian: p.russian,
        ukrainian: p.ukrainian,
      });
    });
  }
}
all.sort((a, b) => a.lesson - b.lesson);
writeFileSync(resolve(__dirname, 'PHRASES_FOR_SEMANTIC.json'), JSON.stringify(all), 'utf8');
// group counts
const byLesson = {};
for (const p of all) byLesson[p.lesson] = (byLesson[p.lesson] || 0) + 1;
console.log('exported', all.length, 'phrases');
console.log('per lesson:', JSON.stringify(byLesson));
